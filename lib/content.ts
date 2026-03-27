// Shared types for all content (blog, projects, mcp)

export interface ContentMeta {
  title: string
  date: string
  categories: string[]
  tags: string[]
  summary?: string
}

export interface BlogMeta extends ContentMeta {
  slug: string
}

export interface ProjectMeta {
  slug: string
  title: string
  type: 'ai' | 'non-ai'
  categories: string[]
  tags: string[]
  description: string
  prompt?: string
  demo?: string
  github?: string
  summary?: string
}

export interface MCPMeta {
  slug: string
  name: string
  title: string
  description: string
  backend_url?: string
  tool_prefix?: string
  categories: string[]
  tags: string[]
  install_snippet?: string
  features?: string[]
  blog_slug?: string
}
