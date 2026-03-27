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
      <h1 className="text-2xl font-bold mb-2">MCP 갤러리</h1>
      <p className="text-gray-600 mb-6">Claude에 연결할 수 있는 MCP 서버 목록</p>
      <TagFilter tags={tags} categories={categories} basePath="/mcp" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {mcps.map(m => <MCPCard key={m.slug} mcp={m} />)}
        {mcps.length === 0 && <p className="text-gray-500">MCP가 없습니다.</p>}
      </div>
    </div>
  )
}
