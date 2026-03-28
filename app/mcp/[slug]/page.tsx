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
      <Link href="/mcp" className="nav-link" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        ← --mcp
      </Link>

      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
              fontWeight: 300,
              color: 'var(--text-bright)',
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
            }}
          >
            {mcp.title}
          </h1>
          <span className="badge badge-mcp">MCP</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {mcp.categories.map(c => (
            <Link key={c} href={`/mcp?category=${encodeURIComponent(c)}`} className="pill">{c}</Link>
          ))}
          {mcp.tags.map(t => (
            <Link key={t} href={`/mcp?tag=${encodeURIComponent(t)}`} className="tag">#{t}</Link>
          ))}
        </div>
      </header>

      <p style={{ color: 'var(--text)', lineHeight: 1.7, marginBottom: '2.5rem' }}>{mcp.description}</p>

      {mcp.features && mcp.features.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="section-head">FEATURES</div>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {mcp.features.map(f => (
              <li key={f} className="font-mono text-sm" style={{ color: 'var(--text)', paddingLeft: '1.25rem', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--accent)' }}>→</span>
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {mcp.notes && mcp.notes.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <div className="section-head">NOTES</div>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {mcp.notes.map(n => (
              <li key={n} className="font-mono text-sm" style={{ color: 'var(--text-dim)', paddingLeft: '1.25rem', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--text-dim)' }}>!</span>
                {n}
              </li>
            ))}
          </ul>
        </section>
      )}

      {mcp.install_snippet && (
        <section>
          <div className="section-head">INSTALL (.mcp.json)</div>
          <pre className="code-block">{mcp.install_snippet}</pre>
          <p className="font-mono text-xs" style={{ color: 'var(--text-dim)', marginTop: '0.75rem' }}>
            위 JSON을 <code style={{ color: 'var(--accent)' }}>~/.claude/.mcp.json</code> 또는 프로젝트{' '}
            <code style={{ color: 'var(--accent)' }}>.mcp.json</code>에 추가하세요.
          </p>
        </section>
      )}
    </div>
  )
}
