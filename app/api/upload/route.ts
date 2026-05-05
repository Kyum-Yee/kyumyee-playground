import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads')
const MAX_BYTES = 20 * 1024 * 1024 // 20MB

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

function fail(status: number, error: string) {
  return Response.json({ ok: false, error }, { status })
}

export async function POST(req: Request) {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return fail(503, '이 기능은 로컬 개발 환경(npm run dev)에서만 동작합니다.')
  }

  const hash = process.env.BLOG_WRITE_PASSWORD_HASH
  if (!hash) return fail(500, 'BLOG_WRITE_PASSWORD_HASH 환경변수가 설정되지 않았습니다.')

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return fail(400, '잘못된 폼 데이터입니다.')
  }

  const password = String(form.get('password') ?? '')
  if (!password) return fail(401, '비밀번호가 필요합니다.')
  const ok = await bcrypt.compare(password, hash)
  if (!ok) return fail(401, '비밀번호가 일치하지 않습니다.')

  const file = form.get('file')
  if (!(file instanceof File)) return fail(400, 'file 필드가 없습니다.')
  if (file.size === 0) return fail(400, '빈 파일입니다.')
  if (file.size > MAX_BYTES) return fail(413, `파일이 너무 큽니다. 최대 ${MAX_BYTES / 1024 / 1024}MB.`)
  if (!ALLOWED_MIME.has(file.type)) {
    return fail(415, `지원되지 않는 형식: ${file.type || '(none)'}. 허용: ${[...ALLOWED_MIME].join(', ')}`)
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12)
  const ext = EXT_BY_MIME[file.type]
  const fileName = `${sha}.${ext}`

  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const dest = path.join(UPLOAD_DIR, fileName)
  if (!dest.startsWith(UPLOAD_DIR + path.sep)) return fail(400, '잘못된 경로.')

  await fs.writeFile(dest, buf)

  const url = `/uploads/${fileName}`
  return Response.json({
    ok: true,
    url,
    markdown: `![](${url})`,
    size: file.size,
    mime: file.type,
  })
}
