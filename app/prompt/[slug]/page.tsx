import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPrompt, getPromptList } from '@/lib/prompt'
import CopyButton from '@/components/CopyButton'
import DownloadButton from '@/components/DownloadButton'

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
  const { meta, body, html } = item

  return (
    <article>
      <Link href="/prompt" className="nav-link" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        ← --prompt
      </Link>

      <header
        style={{
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '60%' }}>
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
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <CopyButton text={body} />
          <DownloadButton text={body} filename={`${meta.slug}.md`} />
        </div>
      </header>

      <div className="prose-wrap">
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <div
        style={{
          marginTop: '2.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.4rem',
          flexWrap: 'wrap',
        }}
      >
        <CopyButton text={body} label="전체 프롬프트 복사" />
        <DownloadButton text={body} filename={`${meta.slug}.md`} label={`${meta.slug}.md 다운로드`} />
      </div>
    </article>
  )
}
