import Link from 'next/link'
import { getMDPosts } from '@/lib/blog'
import { getProjects } from '@/lib/projects'
import { getMCPs } from '@/lib/mcp-registry'

export default function Home() {
  const posts = getMDPosts().slice(0, 3)
  const projects = getProjects().slice(0, 3)
  const mcps = getMCPs().slice(0, 3)

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>

      {/* Hero */}
      <section>
        <p className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          00/ INDEX
        </p>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 300,
            color: 'var(--text-bright)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: '1rem',
          }}
        >
          kyumyee<br />
          <span style={{ color: 'var(--accent)' }}>playground</span>
        </h1>
        <p className="font-mono text-sm" style={{ color: 'var(--text-dim)', maxWidth: '40ch' }}>
          글, 실험, MCP 도구를 한 곳에서.
        </p>
      </section>

      {/* Blog */}
      <section>
        <div className="section-head">
          <span>01/ BLOG</span>
          <Link href="/blog" className="nav-link ml-auto" style={{ marginLeft: 'auto', flex: 'none' }}>전체 →</Link>
        </div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {posts.map(p => (
            <li key={p.slug} className="card" style={{ marginBottom: '0.5rem' }}>
              <Link
                href={`/blog/${p.slug}`}
                className="font-serif"
                style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.3, display: 'block' }}
              >
                {p.title}
              </Link>
              <span className="font-mono text-xs" style={{ color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                {p.date}
              </span>
            </li>
          ))}
          {posts.length === 0 && (
            <li className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>글이 없습니다.</li>
          )}
        </ul>
      </section>

      {/* Playground */}
      <section>
        <div className="section-head">
          <span>02/ PLAYGROUND</span>
          <Link href="/playground" className="nav-link" style={{ marginLeft: 'auto', flex: 'none' }}>전체 →</Link>
        </div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {projects.map(p => (
            <li key={p.slug} className="card" style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                <Link
                  href={`/playground/${p.slug}`}
                  className="font-serif"
                  style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 300 }}
                >
                  {p.title}
                </Link>
                <span className={`badge ${p.type === 'ai' ? 'badge-ai' : 'badge-demo'}`}>
                  {p.type === 'ai' ? 'AI' : 'DEMO'}
                </span>
              </div>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>프로젝트가 없습니다.</li>
          )}
        </ul>
      </section>

      {/* MCP */}
      <section>
        <div className="section-head">
          <span>03/ MCP</span>
          <Link href="/mcp" className="nav-link" style={{ marginLeft: 'auto', flex: 'none' }}>전체 →</Link>
        </div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {mcps.map(m => (
            <li key={m.slug} className="card" style={{ marginBottom: '0.5rem' }}>
              <Link
                href={`/mcp/${m.slug}`}
                className="font-serif"
                style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 300, display: 'block' }}
              >
                {m.title}
              </Link>
              <span className="font-mono text-xs" style={{ color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                {m.description.slice(0, 60)}
              </span>
            </li>
          ))}
          {mcps.length === 0 && (
            <li className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>MCP가 없습니다.</li>
          )}
        </ul>
      </section>

    </div>
  )
}
