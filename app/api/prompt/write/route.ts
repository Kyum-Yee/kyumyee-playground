import fs from 'fs/promises'
import path from 'path'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const ALLOWED_CATEGORIES = ['design', 'reference', 'prompt', 'rolePlay'] as const
type AllowedCategory = typeof ALLOWED_CATEGORIES[number]

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/
const PROMPT_DIR = path.join(process.cwd(), 'content/prompt')
const MAX_BODY = 200_000
const MAX_TITLE = 200

interface WriteBody {
  password?: string
  slug?: string
  title?: string
  date?: string
  category?: string
  summary?: string
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
  category: AllowedCategory
  summary?: string
}): string {
  const lines: string[] = ['---']
  lines.push(`title: ${escYaml(meta.title)}`)
  lines.push(`date: ${escYaml(meta.date)}`)
  lines.push(`category: ${escYaml(meta.category)}`)
  if (meta.summary) lines.push(`summary: ${escYaml(meta.summary)}`)
  lines.push('---', '')
  return lines.join('\n')
}

export async function POST(req: Request) {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return fail(503, '이 기능은 로컬 개발 환경(npm run dev)에서만 동작합니다. 작성 후 git push + vercel --prod로 배포하세요.')
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
  const category = String(data.category ?? '').trim()
  const summary = data.summary ? String(data.summary).trim() : undefined
  const overwrite = data.overwrite === true

  if (!ALLOWED_CATEGORIES.includes(category as AllowedCategory)) {
    return fail(400, `category는 ${ALLOWED_CATEGORIES.join(' / ')} 중 하나여야 합니다.`)
  }
  if (!SLUG_RE.test(slug)) return fail(400, 'slug는 소문자/숫자/하이픈/언더스코어만 (1~80자, 첫 글자는 영숫자).')
  if (!title || title.length > MAX_TITLE) return fail(400, `title은 1~${MAX_TITLE}자.`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, 'date는 YYYY-MM-DD 형식.')
  if (!body) return fail(400, 'body가 비어있습니다.')
  if (body.length > MAX_BODY) return fail(400, `본문은 ${MAX_BODY}자 이하.`)

  await fs.mkdir(PROMPT_DIR, { recursive: true })

  const filePath = path.join(PROMPT_DIR, `${slug}.md`)
  if (!filePath.startsWith(PROMPT_DIR + path.sep)) return fail(400, '잘못된 slug.')

  const exists = await fs.access(filePath).then(() => true, () => false)
  if (exists && !overwrite) return fail(409, '같은 slug의 항목이 이미 있습니다. 덮어쓰려면 overwrite를 켜세요.')

  const content =
    buildFrontmatter({ title, date, category: category as AllowedCategory, summary }) +
    body.replace(/\r\n/g, '\n').trimEnd() +
    '\n'

  await fs.writeFile(filePath, content, 'utf-8')

  return Response.json({
    ok: true,
    slug,
    path: `content/prompt/${slug}.md`,
    url: `/prompt/${slug}`,
    overwritten: exists,
  })
}
