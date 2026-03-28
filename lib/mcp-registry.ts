import fs from 'fs'
import path from 'path'
import type { MCPMeta } from './content'

const MCP_DIR = path.join(process.cwd(), 'content/mcp')

export function getMCPs(filterTag?: string, filterCategory?: string): MCPMeta[] {
  if (!fs.existsSync(MCP_DIR)) return []

  const files = fs.readdirSync(MCP_DIR).filter(f => f.endsWith('.json'))
  const mcps: MCPMeta[] = files.map(file => {
    const raw = fs.readFileSync(path.join(MCP_DIR, file), 'utf-8')
    const data = JSON.parse(raw)
    return { ...data, slug: file.replace(/\.json$/, '') }
  })

  return mcps
    .filter(m => !filterTag || m.tags.includes(filterTag))
    .filter(m => !filterCategory || m.categories.includes(filterCategory))
}

export function getMCP(slug: string): MCPMeta | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null
  const file = path.join(MCP_DIR, `${slug}.json`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf-8')
  return { ...JSON.parse(raw), slug }
}

export function getAllMCPTags(): string[] {
  const mcps = getMCPs()
  const tagSet = new Set<string>()
  mcps.forEach(m => m.tags.forEach(t => tagSet.add(t)))
  return Array.from(tagSet).sort()
}

export function getAllMCPCategories(): string[] {
  const mcps = getMCPs()
  const catSet = new Set<string>()
  mcps.forEach(m => m.categories.forEach(c => catSet.add(c)))
  return Array.from(catSet).sort()
}
