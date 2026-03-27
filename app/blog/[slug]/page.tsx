import { notFound } from 'next/navigation'
import { getPost, getMDPosts } from '@/lib/blog'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getMDPosts().map(p => ({ slug: p.slug }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const { meta, html } = post

  return (
    <article>
      {/* Back link */}
      <Link href="/blog" className="nav-link" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        ← --blog
      </Link>

      {/* Post header */}
      <header style={{ marginBottom: '2.5rem' }}>
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
          <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>{meta.date}</span>
          {meta.categories.map(c => (
            <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className="pill">{c}</Link>
          ))}
          {meta.tags.map(t => (
            <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="tag">#{t}</Link>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="prose-wrap">
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </article>
  )
}
