import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import type { BlogMeta } from './content'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export function getMDPosts(filterTag?: string, filterCategory?: string): BlogMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
  const posts: BlogMeta[] = files.map(file => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
    const { data } = matter(raw)
    return {
      slug: file.replace(/\.md$/, ''),
      title: data.title ?? file,
      date: data.date ?? '',
      categories: data.categories ?? [],
      tags: data.tags ?? [],
      summary: data.summary,
    }
  })

  return posts
    .filter(p => !filterTag || p.tags.includes(filterTag))
    .filter(p => !filterCategory || p.categories.includes(filterCategory))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): { meta: BlogMeta; html: string } | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null
  const file = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(file)) return null

  const raw = fs.readFileSync(file, 'utf-8')
  const { data, content } = matter(raw)

  const html = DOMPurify.sanitize(marked(content) as string, {
    ALLOWED_TAGS: ['h1','h2','h3','h4','p','ul','ol','li','strong','em','code','pre','blockquote','a','img'],
    ALLOWED_ATTR: ['href','src','alt','class','id'],
  })

  return {
    meta: {
      slug,
      title: data.title ?? slug,
      date: data.date ?? '',
      categories: data.categories ?? [],
      tags: data.tags ?? [],
      summary: data.summary,
    },
    html,
  }
}

export function getAllBlogTags(): string[] {
  const posts = getMDPosts()
  const tagSet = new Set<string>()
  posts.forEach(p => p.tags.forEach(t => tagSet.add(t)))
  return Array.from(tagSet).sort()
}

export function getAllBlogCategories(): string[] {
  const posts = getMDPosts()
  const catSet = new Set<string>()
  posts.forEach(p => p.categories.forEach(c => catSet.add(c)))
  return Array.from(catSet).sort()
}
