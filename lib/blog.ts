import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import markedFootnote from 'marked-footnote'
import sanitizeHtml from 'sanitize-html'
import type { BlogMeta } from './content'

export const ALLOWED_TAGS = ['AI', '프롬프트', '디자인'] as const
export type AllowedTag = typeof ALLOWED_TAGS[number]

// GFM footnote ([^1] 본문 참조 + [^1]: 정의) 지원. 모듈 로드 시 한 번만 등록.
let footnoteRegistered = false
function ensureFootnote() {
  if (footnoteRegistered) return
  marked.use(markedFootnote())
  footnoteRegistered = true
}

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

const EDIT_POINT_RE = /\{([\s\S]*?)\}\s*⟶\s*([\s\S]*?)\s*,,,/gu

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightDiffSpan(raw: string): string {
  const m = raw.match(/^(\{)([\s\S]*?)(\})(\s*⟶\s*)([\s\S]*?)(\s*,,,)$/)
  if (!m) return `<span class="edit-point">${escHtml(raw)}</span>`
  const [, lBrace, original, rBrace, arrow, revised, terminator] = m
  return (
    `<span class="edit-marker">${escHtml(lBrace)}</span>` +
    `<span class="edit-orig">${escHtml(original)}</span>` +
    `<span class="edit-marker">${escHtml(rBrace)}</span>` +
    `<span class="edit-arrow">${escHtml(arrow)}</span>` +
    `<span class="edit-revised">${escHtml(revised)}</span>` +
    `<span class="edit-marker">${escHtml(terminator)}</span>`
  )
}

// Render markdown body → HTML, with EDIT_POINT tokens converted to highlight spans.
function renderBodyToHtml(body: string): string {
  if (!body) return ''
  ensureFootnote()
  const tokens: string[] = []
  let cursor = 0
  let withPlaceholders = ''
  let i = 0
  for (const m of body.matchAll(EDIT_POINT_RE)) {
    const start = m.index!
    const end = start + m[0].length
    withPlaceholders += body.slice(cursor, start)
    withPlaceholders += `[[EDITPT_${i}]]`
    tokens.push(highlightDiffSpan(body.slice(start, end)))
    cursor = end
    i++
  }
  withPlaceholders += body.slice(cursor)

  const rawHtml = marked(withPlaceholders) as string
  const safeHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      'h1','h2','h3','h4','h5','p','ul','ol','li','strong','em','code','pre',
      'blockquote','a','img','hr','br','table','thead','tbody','tr','th','td',
      'span','sup','sub','section',
    ],
    allowedAttributes: {
      a: ['href','rel','target','data-footnote-ref','aria-describedby'],
      img: ['src','alt'],
      span: ['class'],
      section: ['class','data-footnotes'],
      ol: ['class'],
      li: ['id','class'],
      sup: ['class'],
      '*': ['class','id'],
    },
  })
  return safeHtml.replace(/\[\[EDITPT_(\d+)\]\]/g, (_, idx) => tokens[Number(idx)] ?? '')
}

function readMeta(file: string): BlogMeta {
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
  const { data } = matter(raw)
  const tags = (data.tags ?? []).filter((t: string) => ALLOWED_TAGS.includes(t as AllowedTag))
  return {
    slug: file.replace(/\.md$/, ''),
    title: data.title ?? file,
    date: data.date ?? '',
    categories: data.categories ?? [],
    tags,
    summary: data.summary,
  }
}

export function getMDPosts(filterTag?: string, filterCategory?: string): BlogMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.md') && !f.endsWith('.en.md'))

  return files
    .map(readMeta)
    .filter(p => !filterTag || p.tags.includes(filterTag))
    .filter(p => !filterCategory || p.categories.includes(filterCategory))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export interface BlogPost {
  meta: BlogMeta
  metaEn?: { title: string; summary?: string }
  bodyKo: string
  bodyEn: string | null
  htmlKo: string
  htmlEn: string | null
}

export function getPost(slug: string): BlogPost | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null

  const koPath = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(koPath)) return null

  const koRaw = fs.readFileSync(koPath, 'utf-8')
  const { data, content } = matter(koRaw)
  const tags = (data.tags ?? []).filter((t: string) => ALLOWED_TAGS.includes(t as AllowedTag))

  const meta: BlogMeta = {
    slug,
    title: data.title ?? slug,
    date: data.date ?? '',
    categories: data.categories ?? [],
    tags,
    summary: data.summary,
  }

  let bodyEn: string | null = null
  let htmlEn: string | null = null
  let metaEn: { title: string; summary?: string } | undefined

  const enPath = path.join(BLOG_DIR, `${slug}.en.md`)
  if (fs.existsSync(enPath)) {
    const enRaw = fs.readFileSync(enPath, 'utf-8')
    const { data: enData, content: enContent } = matter(enRaw)
    bodyEn = enContent
    htmlEn = renderBodyToHtml(enContent)
    metaEn = {
      title: enData.title ?? meta.title,
      summary: enData.summary,
    }
  }

  return {
    meta,
    metaEn,
    bodyKo: content,
    bodyEn,
    htmlKo: renderBodyToHtml(content),
    htmlEn,
  }
}

export function getAllBlogTags(): string[] {
  return [...ALLOWED_TAGS]
}

export function getAllBlogCategories(): string[] {
  const posts = getMDPosts()
  const catSet = new Set<string>()
  posts.forEach(p => p.categories.forEach(c => catSet.add(c)))
  return Array.from(catSet).sort()
}
