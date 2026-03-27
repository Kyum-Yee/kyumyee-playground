import { notFound } from 'next/navigation'
import { getMCP, getMCPs } from '@/lib/mcp-registry'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getMCPs().map(m => ({ slug: m.slug }))
}

export default async function MCPDetailPage({ params }: Props) {
  const { slug } = await params
  const mcp = getMCP(slug)
  if (!mcp) notFound()

  return (
    <div>
      <Link href="/mcp" className="text-sm text-blue-600 hover:underline">← MCP 갤러리</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">{mcp.title}</h1>
      <div className="flex gap-2 flex-wrap mb-4 text-sm">
        {mcp.categories.map(c => (
          <Link key={c} href={`/mcp?category=${encodeURIComponent(c)}`} className="bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200">{c}</Link>
        ))}
        {mcp.tags.map(t => (
          <Link key={t} href={`/mcp?tag=${encodeURIComponent(t)}`} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100">#{t}</Link>
        ))}
      </div>
      <p className="text-gray-700 mb-8">{mcp.description}</p>

      {mcp.features && mcp.features.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold mb-2">주요 기능</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {mcp.features.map(f => <li key={f}>{f}</li>)}
          </ul>
        </section>
      )}

      {mcp.install_snippet && (
        <section>
          <h2 className="font-semibold mb-2">설치 방법 (.mcp.json)</h2>
          <pre className="bg-gray-50 border rounded p-4 text-sm overflow-x-auto">{mcp.install_snippet}</pre>
          <p className="text-xs text-gray-500 mt-2">위 JSON을 <code>~/.claude/.mcp.json</code> 또는 프로젝트 <code>.mcp.json</code>에 추가하세요.</p>
        </section>
      )}
    </div>
  )
}
