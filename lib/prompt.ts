import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import hljs from 'highlight.js/lib/core'
import markdown from 'highlight.js/lib/languages/markdown'

hljs.registerLanguage('markdown', markdown)

/** raw markdown 본문을 highlight.js 의 standard markdown 토큰 클래스로 감싸 HTML 반환. */
export function highlightMarkdown(body: string): string {
  if (!body) return ''
  return hljs.highlight(body, { language: 'markdown' }).value
}

export const PROMPT_CATEGORIES = ['design', 'reference', 'prompt'] as const
export type PromptCategory = typeof PROMPT_CATEGORIES[number]

const PROMPT_DIR = path.join(process.cwd(), 'content/prompt')

export interface PromptMeta {
  slug: string
  title: string
  date: string
  category: PromptCategory
  summary?: string
}

export interface PromptItem {
  meta: PromptMeta
  body: string
  html: string
}

function isCategory(v: unknown): v is PromptCategory {
  return typeof v === 'string' && (PROMPT_CATEGORIES as readonly string[]).includes(v)
}

function readMeta(file: string): PromptMeta | null {
  const raw = fs.readFileSync(path.join(PROMPT_DIR, file), 'utf-8')
  const { data } = matter(raw)
  if (!isCategory(data.category)) return null
  return {
    slug: file.replace(/\.md$/, ''),
    title: data.title ?? file,
    date: data.date ?? '',
    category: data.category,
    summary: data.summary,
  }
}

export function getPromptList(filterCategory?: string): PromptMeta[] {
  if (!fs.existsSync(PROMPT_DIR)) return []
  const files = fs.readdirSync(PROMPT_DIR).filter(f => f.endsWith('.md'))
  return files
    .map(readMeta)
    .filter((p): p is PromptMeta => p !== null)
    .filter(p => !filterCategory || p.category === filterCategory)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function renderPromptHtml(body: string): string {
  if (!body) return ''
  const rawHtml = marked(body) as string
  return sanitizeHtml(rawHtml, {
    allowedTags: ['h1','h2','h3','h4','h5','p','ul','ol','li','strong','em','code','pre','blockquote','a','img','hr','br','table','thead','tbody','tr','th','td','span','div'],
    allowedAttributes: {
      a: ['href','title'],
      img: ['src','alt','title','width','height'],
      span: ['class'],
      div: ['class'],
      '*': ['class','id'],
    },
    allowedSchemes: ['http','https','data','mailto'],
  })
}

export function getPrompt(slug: string): PromptItem | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null
  const file = path.join(PROMPT_DIR, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf-8')
  const { data, content } = matter(raw)
  if (!isCategory(data.category)) return null
  return {
    meta: {
      slug,
      title: data.title ?? slug,
      date: data.date ?? '',
      category: data.category,
      summary: data.summary,
    },
    body: content,
    html: renderPromptHtml(content),
  }
}
