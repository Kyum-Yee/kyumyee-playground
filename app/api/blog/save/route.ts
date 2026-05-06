import fs from 'fs/promises'
import path from 'path'
import bcrypt from 'bcryptjs'
import { execFile } from 'child_process'
import { promisify } from 'util'

export const runtime = 'nodejs'
export const maxDuration = 300

const exec = promisify(execFile)

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/
const BLOG_DIR = path.join(process.cwd(), 'content/blog')
const MAX_BODY = 200_000

interface SaveBody {
  password?: string
  slug?: string
  lang?: 'ko' | 'en'
  body?: string
  deploy?: boolean
}

interface SaveResult {
  ok: boolean
  saved?: string
  committed?: boolean
  pushed?: boolean
  vercel_url?: string
  vercel_log?: string
  steps?: string[]
  error?: string
}

function fail(status: number, error: string): Response {
  return Response.json({ ok: false, error } satisfies SaveResult, { status })
}

export async function POST(req: Request) {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return fail(503, '이 기능은 로컬 개발 환경(npm run dev)에서만 동작합니다. Vercel 환경에서는 불가능합니다.')
  }

  const hash = process.env.BLOG_WRITE_PASSWORD_HASH
  if (!hash) return fail(500, 'BLOG_WRITE_PASSWORD_HASH 환경변수 미설정.')

  let data: SaveBody
  try {
    data = (await req.json()) as SaveBody
  } catch {
    return fail(400, 'JSON 본문 오류.')
  }

  const password = String(data.password ?? '')
  if (!password) return fail(401, '비밀번호 필요.')

  const ok = await bcrypt.compare(password, hash)
  if (!ok) return fail(401, '비밀번호 불일치.')

  const slug = String(data.slug ?? '')
  const lang = data.lang === 'en' ? 'en' : 'ko'
  const newBody = String(data.body ?? '')
  const deploy = data.deploy === true

  if (!SLUG_RE.test(slug)) return fail(400, 'slug 형식 오류.')
  if (newBody.length > MAX_BODY) return fail(400, `본문이 ${MAX_BODY}자를 초과합니다.`)

  const filename = lang === 'en' ? `${slug}.en.md` : `${slug}.md`
  const filePath = path.join(BLOG_DIR, filename)

  if (!filePath.startsWith(BLOG_DIR + path.sep)) return fail(400, '잘못된 파일 경로.')

  let existing: string
  try {
    existing = await fs.readFile(filePath, 'utf-8')
  } catch {
    return fail(404, `파일 없음: ${filename}`)
  }

  // gray-matter stringify 는 frontmatter YAML 을 재포맷할 가능성이 있어 신뢰 X.
  // raw 텍스트로 frontmatter 바이트를 그대로 보존하고 본문만 교체.
  const fmRe = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)/
  const fmMatch = existing.match(fmRe)
  const frontmatter = fmMatch ? fmMatch[1] : ''

  const normalizedBody = newBody.replace(/\r\n/g, '\n').replace(/^\n+/, '').trimEnd() + '\n'
  const newContent = frontmatter + normalizedBody

  const wasIdentical = newContent === existing
  // 항상 write — mtime 갱신해서 다음 파이프라인이 변경을 감지하도록.
  await fs.writeFile(filePath, newContent, 'utf-8')

  const result: SaveResult = {
    ok: true,
    saved: filename,
    steps: [
      `saved: ${filename} (${newContent.length} bytes${wasIdentical ? ', identical to existing' : ', changed'})`,
    ],
  }

  if (!deploy) return Response.json(result)

  const cwd = process.cwd()
  const relPath = `content/blog/${filename}`

  try {
    await exec('git', ['add', '--', relPath], { cwd })
    result.steps!.push(`git add ${relPath}`)

    let hasChanges = false
    try {
      await exec('git', ['diff', '--cached', '--quiet', '--', relPath], { cwd })
    } catch (err) {
      // execFile rejects with `code` = numeric exit code on non-zero exit.
      // git diff --quiet exits 1 when there ARE differences (the case we want to detect).
      const e = err as { code?: unknown }
      if (e.code === 1) hasChanges = true
      else throw err
    }

    if (hasChanges) {
      const commitMsg = `edit: ${slug}${lang === 'en' ? '.en' : ''}`
      await exec('git', ['commit', '-m', commitMsg, '--', relPath], { cwd })
      result.committed = true
      result.steps!.push(`git commit "${commitMsg}"`)

      await exec('git', ['push'], { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })
      result.pushed = true
      result.steps!.push('git push')
    } else {
      result.steps!.push('git: no changes to commit (content identical)')
    }

    const vercelOut = await exec('vercel', ['--prod', '--yes'], {
      cwd,
      maxBuffer: 20 * 1024 * 1024,
    })
    const stdout = vercelOut.stdout.trim()
    const urlMatch = stdout.match(/https?:\/\/[^\s]+\.vercel\.app[^\s]*/)
    result.vercel_url = urlMatch?.[0]
    result.vercel_log = stdout
    result.steps!.push(`vercel --prod${result.vercel_url ? ` → ${result.vercel_url}` : ''}`)
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; cmd?: string }
    result.ok = false
    result.error = `${e.message}\n${e.stdout ?? ''}\n${e.stderr ?? ''}`.trim()
    return Response.json(result, { status: 500 })
  }

  return Response.json(result)
}
