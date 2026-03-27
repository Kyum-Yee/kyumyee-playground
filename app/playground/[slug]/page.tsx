import { notFound } from 'next/navigation'
import { getProject, getProjects } from '@/lib/projects'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getProjects().map(p => ({ slug: p.slug }))
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const project = getProject(slug)
  if (!project) notFound()

  return (
    <div>
      {/* Back link */}
      <Link href="/playground" className="nav-link" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        ← --playground
      </Link>

      {/* Header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className={`badge ${project.type === 'ai' ? 'badge-ai' : 'badge-demo'}`}>
            {project.type === 'ai' ? 'ai' : 'demo'}
          </span>
          {project.categories.map(c => (
            <Link key={c} href={`/playground?category=${encodeURIComponent(c)}`} className="pill">{c}</Link>
          ))}
        </div>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 300,
            color: 'var(--text-bright)',
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            marginBottom: '1rem',
          }}
        >
          {project.title}
        </h1>
        <p style={{ color: 'var(--text)', marginBottom: '1rem', lineHeight: 1.65 }}>{project.description}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {project.tags.map(t => (
            <Link key={t} href={`/playground?tag=${encodeURIComponent(t)}`} className="tag">#{t}</Link>
          ))}
        </div>
      </header>

      {/* GitHub link */}
      {project.github && (
        <div style={{ marginBottom: '2rem' }}>
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            github →
          </a>
        </div>
      )}

      {/* AI project: prompt */}
      {project.type === 'ai' && project.prompt && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="section-head"><span>01</span> 프롬프트</div>
          <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>{project.prompt}</pre>
        </div>
      )}

      {/* Demo project: iframe */}
      {project.type === 'non-ai' && project.demo && (
        <div>
          <div className="section-head"><span>01</span> 데모</div>
          <div style={{ borderLeft: '2px solid var(--accent)' }}>
            <iframe
              src={project.demo}
              style={{ width: '100%', height: '480px', border: 'none', display: 'block' }}
              title={project.title}
            />
          </div>
        </div>
      )}
    </div>
  )
}
