import { getMCPs, getAllMCPTags, getAllMCPCategories } from '@/lib/mcp-registry'
import MCPCard from '@/components/MCPCard'
import TagFilter from '@/components/TagFilter'

interface Props {
  searchParams: Promise<{ tag?: string; category?: string }>
}

export default async function MCPGalleryPage({ searchParams }: Props) {
  const { tag, category } = await searchParams
  const mcps = getMCPs(tag, category)
  const tags = getAllMCPTags()
  const categories = getAllMCPCategories()

  return (
    <div>
      <div className="section-head">03/ MCP</div>
      <TagFilter tags={tags} categories={categories} basePath="/mcp" />
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {mcps.map(m => <MCPCard key={m.slug} mcp={m} />)}
        {mcps.length === 0 && (
          <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>MCP가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
