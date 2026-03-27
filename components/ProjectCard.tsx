import Link from 'next/link'
import type { ProjectMeta } from '@/lib/content'

export default function ProjectCard({ project }: { project: ProjectMeta }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.35rem' }}>
        <Link href={`/playground/${project.slug}`}>
          <h2
            className="font-serif"
            style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.3 }}
          >
            {project.title}
          </h2>
        </Link>
        <span className={`badge ${project.type === 'ai' ? 'badge-ai' : 'badge-demo'}`}>
          {project.type === 'ai' ? 'AI' : 'DEMO'}
        </span>
      </div>
      {project.description && (
        <p className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          {project.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
        {project.tags.map(t => (
          <Link key={t} href={`/playground?tag=${encodeURIComponent(t)}`} className="tag">
            #{t}
          </Link>
        ))}
      </div>
    </div>
  )
}
