import fs from 'fs/promises'
import path from 'path'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/
const BLOG_DIR = path.join(process.cwd(), 'content/blog')
const MAX_BODY = 200_000
const MAX_TITLE = 200

interface WriteBody {
  password?: string
  slug?: string
  title?: string
  date?: string
  summary?: string
  categories?: string[]
  tags?: string[]
  body?: string
  overwrite?: boolean
}

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status })
}

function escYaml(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function buildFrontmatter(meta: {
  title: string
  date: string
  summary?: string
  categories: string[]
  tags: string[]
}): string {
  const lines: string[] = ['---']
  lines.push(`title: ${escYaml(meta.title)}`)
  lines.push(`date: ${escYaml(meta.date)}`)
  if (meta.summary) lines.push(`summary: ${escYaml(meta.summary)}`)
  if (meta.categories.length) {
    lines.push('categories:')
    for (const c of meta.categories) lines.push(`  - ${escYaml(c)}`)
  }
  if (meta.tags.length) {
    lines.push('tags:')
    for (const t of meta.tags) lines.push(`  - ${escYaml(t)}`)
  }
  lines.push('---', '')
  return lines.join('\n')
}

export async function POST(req: Request) {
  // Hard-block in production: Vercel filesystem is ephemeral.
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return fail(503, '이 기능은 로컬 개발 환경(npm run dev)에서만 동작합니다. 글 작성 후 git push + vercel --prod로 배포하세요.')
  }

  const hash = process.env.BLOG_WRITE_PASSWORD_HASH
  if (!hash) return fail(500, 'BLOG_WRITE_PASSWORD_HASH 환경변수가 설정되지 않았습니다. .env.local에서 $는 \\$로 이스케이프 필요.')

  let data: WriteBody
  try {
    data = await req.json()
  } catch {
    return fail(400, '잘못된 JSON 본문입니다.')
  }

  const password = typeof data.password === 'string' ? data.password : ''
  if (!password) return fail(401, '비밀번호가 필요합니다.')

  const ok = await bcrypt.compare(password, hash)
  if (!ok) return fail(401, '비밀번호가 일치하지 않습니다.')

  const slug = String(data.slug ?? '').trim()
  const title = String(data.title ?? '').trim()
  const body = String(data.body ?? '')
  const date = String(data.date ?? '').trim()
  const summary = data.summary ? String(data.summary).trim() : undefined
  const categories = Array.isArray(data.categories)
    ? data.categories.map(String).map(s => s.trim()).filter(Boolean)
    : []
  const tags = Array.isArray(data.tags)
    ? data.tags.map(String).map(s => s.trim()).filter(Boolean)
    : []
  const overwrite = data.overwrite === true

  if (!SLUG_RE.test(slug)) return fail(400, 'slug는 소문자/숫자/하이픈/언더스코어만 (1~80자, 첫 글자는 영숫자).')
  if (!title || title.length > MAX_TITLE) return fail(400, `title은 1~${MAX_TITLE}자.`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, 'date는 YYYY-MM-DD 형식.')
  if (body.length > MAX_BODY) return fail(400, `본문은 ${MAX_BODY}자 이하.`)
  if (categories.length > 20 || tags.length > 50) return fail(400, '카테고리/태그 개수가 너무 많습니다.')

  await fs.mkdir(BLOG_DIR, { recursive: true })

  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  // Defense-in-depth against path escape via slug.
  if (!filePath.startsWith(BLOG_DIR + path.sep)) return fail(400, '잘못된 slug.')

  const exists = await fs.access(filePath).then(() => true, () => false)
  if (exists && !overwrite) return fail(409, '같은 slug의 글이 이미 있습니다. 덮어쓰려면 overwrite를 켜세요.')

  const frontmatter = buildFrontmatter({ title, date, summary, categories, tags })
  const content = frontmatter + body.replace(/\r\n/g, '\n').trimEnd() + '\n'

  await fs.writeFile(filePath, content, 'utf-8')

  return Response.json({ ok: true, slug, path: `content/blog/${slug}.md`, overwritten: exists })
}
