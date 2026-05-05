import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPrompt, getPromptList } from '@/lib/prompt'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getPromptList().map(p => ({ slug: p.slug }))
}

export default async function PromptDetailPage({ params }: Props) {
  const { slug } = await params
  const item = getPrompt(slug)
  if (!item) notFound()
  const { meta, html } = item

  return (
    <article>
      <Link href="/prompt" className="nav-link" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        ← --prompt
      </Link>

      <header style={{ marginBottom: '2rem' }}>
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
          {meta.title}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{meta.date}</span>
          <Link href={`/prompt?category=${meta.category}`} className="pill">{meta.category}</Link>
        </div>
      </header>

      <div className="prose-wrap">
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </article>
  )
}
