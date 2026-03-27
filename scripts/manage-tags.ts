#!/usr/bin/env tsx
/**
 * manage-tags CLI
 *
 * Usage:
 *   npx tsx scripts/manage-tags.ts list                         # all tags across all content
 *   npx tsx scripts/manage-tags.ts get <file>                   # tags for a specific file
 *   npx tsx scripts/manage-tags.ts set <file> "tag1,tag2"       # set tags for a file
 *   npx tsx scripts/manage-tags.ts find <tag>                   # files with a specific tag
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIRS = {
  blog: path.join(process.cwd(), 'content/blog'),
  projects: path.join(process.cwd(), 'content/projects'),
  mcp: path.join(process.cwd(), 'content/mcp'),
}

interface FileInfo {
  file: string
  type: string
  tags: string[]
  categories: string[]
}

function readAllFiles(): FileInfo[] {
  const results: FileInfo[] = []

  for (const [type, dir] of Object.entries(CONTENT_DIRS)) {
    if (!fs.existsSync(dir)) continue
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const fullPath = path.join(dir, file)
      if (file.endsWith('.md')) {
        const raw = fs.readFileSync(fullPath, 'utf-8')
        const { data } = matter(raw)
        results.push({ file: fullPath, type, tags: data.tags ?? [], categories: data.categories ?? [] })
      } else if (file.endsWith('.json')) {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
        results.push({ file: fullPath, type, tags: data.tags ?? [], categories: data.categories ?? [] })
      }
    }
  }

  return results
}

function setTagsForFile(filePath: string, tags: string[]): void {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }

  if (abs.endsWith('.md')) {
    const raw = fs.readFileSync(abs, 'utf-8')
    const parsed = matter(raw)
    parsed.data.tags = tags
    const updated = matter.stringify(parsed.content, parsed.data)
    fs.writeFileSync(abs, updated, 'utf-8')
  } else if (abs.endsWith('.json')) {
    const data = JSON.parse(fs.readFileSync(abs, 'utf-8'))
    data.tags = tags
    fs.writeFileSync(abs, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  } else {
    console.error('Unsupported file type. Only .md and .json are supported.')
    process.exit(1)
  }
}

const [, , cmd, ...rest] = process.argv

switch (cmd) {
  case 'list': {
    const files = readAllFiles()
    const tagCount: Record<string, number> = {}
    files.forEach(f => f.tags.forEach(t => { tagCount[t] = (tagCount[t] ?? 0) + 1 }))
    const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1])
    console.log(`\n태그 목록 (${sorted.length}개):\n`)
    sorted.forEach(([tag, count]) => console.log(`  #${tag} (${count})`))
    console.log()
    break
  }

  case 'get': {
    const filePath = rest[0]
    if (!filePath) { console.error('Usage: manage-tags.ts get <file>'); process.exit(1) }
    const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
    if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); process.exit(1) }

    if (abs.endsWith('.md')) {
      const { data } = matter(fs.readFileSync(abs, 'utf-8'))
      console.log(`categories: ${(data.categories ?? []).join(', ')}`)
      console.log(`tags:       ${(data.tags ?? []).join(', ')}`)
    } else {
      const data = JSON.parse(fs.readFileSync(abs, 'utf-8'))
      console.log(`categories: ${(data.categories ?? []).join(', ')}`)
      console.log(`tags:       ${(data.tags ?? []).join(', ')}`)
    }
    break
  }

  case 'set': {
    const [filePath, tagsArg] = rest
    if (!filePath || tagsArg === undefined) {
      console.error('Usage: manage-tags.ts set <file> "tag1,tag2"')
      process.exit(1)
    }
    const tags = tagsArg ? tagsArg.split(',').map(t => t.trim()).filter(Boolean) : []
    setTagsForFile(filePath, tags)
    console.log(`Tags updated: ${tags.join(', ') || '(cleared)'}`)
    break
  }

  case 'find': {
    const tag = rest[0]
    if (!tag) { console.error('Usage: manage-tags.ts find <tag>'); process.exit(1) }
    const files = readAllFiles().filter(f => f.tags.includes(tag))
    console.log(`\n#${tag} 태그가 붙은 파일 (${files.length}개):\n`)
    files.forEach(f => console.log(`  [${f.type}] ${f.file}`))
    console.log()
    break
  }

  default:
    console.log(`
manage-tags — content 태그 관리 CLI

Usage:
  npx tsx scripts/manage-tags.ts list                    전체 태그 목록
  npx tsx scripts/manage-tags.ts get <file>              파일 태그 조회
  npx tsx scripts/manage-tags.ts set <file> "t1,t2"     태그 설정
  npx tsx scripts/manage-tags.ts find <tag>              태그로 파일 검색
`)
}
