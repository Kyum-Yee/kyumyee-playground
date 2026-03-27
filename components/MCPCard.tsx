import Link from 'next/link'
import type { MCPMeta } from '@/lib/content'

export default function MCPCard({ mcp }: { mcp: MCPMeta }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
      <Link href={`/mcp/${mcp.slug}`}>
        <h2 className="font-semibold hover:underline">{mcp.title}</h2>
      </Link>
      <p className="text-sm text-gray-600 mt-1">{mcp.description}</p>
      <div className="flex gap-2 flex-wrap mt-2 text-xs">
        {mcp.tags.map(t => (
          <Link key={t} href={`/mcp?tag=${encodeURIComponent(t)}`} className="text-blue-600">#{t}</Link>
        ))}
      </div>
    </div>
  )
}
