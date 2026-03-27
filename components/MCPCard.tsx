import Link from 'next/link'
import type { MCPMeta } from '@/lib/content'

export default function MCPCard({ mcp }: { mcp: MCPMeta }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.35rem' }}>
        <Link href={`/mcp/${mcp.slug}`}>
          <h2
            className="font-serif"
            style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.3 }}
          >
            {mcp.title}
          </h2>
        </Link>
        <span className="badge badge-mcp">MCP</span>
      </div>
      <p className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
        {mcp.description}
      </p>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
        {mcp.tags.map(t => (
          <Link key={t} href={`/mcp?tag=${encodeURIComponent(t)}`} className="tag">
            #{t}
          </Link>
        ))}
      </div>
    </div>
  )
}
