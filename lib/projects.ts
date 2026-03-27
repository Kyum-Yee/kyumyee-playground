import fs from 'fs'
import path from 'path'
import type { ProjectMeta } from './content'

const PROJECTS_DIR = path.join(process.cwd(), 'content/projects')

export function getProjects(filterTag?: string, filterCategory?: string): ProjectMeta[] {
  if (!fs.existsSync(PROJECTS_DIR)) return []

  const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'))
  const projects: ProjectMeta[] = files.map(file => {
    const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), 'utf-8')
    const data = JSON.parse(raw)
    return { ...data, slug: file.replace(/\.json$/, '') }
  })

  return projects
    .filter(p => !filterTag || p.tags.includes(filterTag))
    .filter(p => !filterCategory || p.categories.includes(filterCategory))
}

export function getProject(slug: string): ProjectMeta | null {
  const file = path.join(PROJECTS_DIR, `${slug}.json`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf-8')
  return { ...JSON.parse(raw), slug }
}

export function getAllProjectTags(): string[] {
  const projects = getProjects()
  const tagSet = new Set<string>()
  projects.forEach(p => p.tags.forEach(t => tagSet.add(t)))
  return Array.from(tagSet).sort()
}

export function getAllProjectCategories(): string[] {
  const projects = getProjects()
  const catSet = new Set<string>()
  projects.forEach(p => p.categories.forEach(c => catSet.add(c)))
  return Array.from(catSet).sort()
}
