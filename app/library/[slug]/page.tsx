import { notFound } from 'next/navigation'
import Link from 'next/link'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import { SUBJECTS, getSubject, fetchStageMarkdown } from '@/lib/expert-library'
import StageNav from './StageNav'

marked.use(markedKatex({ throwOnError: false, output: 'html' }))

export async function generateStaticParams() {
  return SUBJECTS.map(s => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const subject = getSubject(slug)
  if (!subject) return { title: 'Not Found' }
  return {
    title: `${subject.title} | --library | kyumyee`,
    description: `${subject.category} · ${subject.stages}단계 커리큘럼`,
  }
}

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ stage?: string }>
}) {
  const { slug: rawSlug } = await params
  const { stage: stageParam } = await searchParams
  const slug = decodeURIComponent(rawSlug)

  const subject = getSubject(slug)
  if (!subject) notFound()

  const stage = Math.max(1, Math.min(subject.stages, parseInt(stageParam ?? '1', 10) || 1))

  const markdown = await fetchStageMarkdown(subject, stage)

  const html = markdown ? (marked(markdown) as string) : null

  const prevStage = stage > 1 ? stage - 1 : null
  const nextStage = stage < subject.stages ? stage + 1 : null

  return (
    <main style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      {/* Back */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/library"
          style={{
            fontFamily: 'var(--font-jb-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}
        >
          ← --library
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.6rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}
          >
            {subject.category} · {String(subject.index).padStart(2, '0')}
          </span>
          <span
            className="pill"
            style={{ fontSize: '0.65rem' }}
          >
            {subject.category}
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-newsreader)',
            fontSize: '1.75rem',
            fontWeight: 300,
            color: 'var(--text-bright)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {subject.title}
        </h1>
        {subject.subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              marginTop: '0.4rem',
            }}
          >
            {subject.subtitle}
          </p>
        )}
      </div>

      {/* Stage tabs */}
      <StageNav slug={slug} stages={subject.stages} currentStage={stage} />

      {/* Content */}
      <div style={{ marginTop: '2rem' }}>
        {html ? (
          <div className="prose-wrap">
            <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.78rem',
              color: 'var(--text-dim)',
              padding: '2.5rem',
              border: '1px solid var(--border)',
              borderLeft: '2px solid var(--border)',
              textAlign: 'center',
            }}
          >
            콘텐츠를 불러올 수 없습니다.{' '}
            <a
              href={`https://github.com/Kyum-Yee/expert-curriculum-library`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              GitHub에서 확인
            </a>
          </div>
        )}
      </div>

      {/* Prev / Next */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '2.5rem',
          gap: '0.75rem',
        }}
      >
        {prevStage ? (
          <Link
            href={`/library/${slug}?stage=${prevStage}`}
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              textDecoration: 'none',
              padding: '0.5rem 0.875rem',
              border: '1px solid var(--border)',
            }}
          >
            ← 단계 {prevStage}
          </Link>
        ) : (
          <span />
        )}
        {nextStage ? (
          <Link
            href={`/library/${slug}?stage=${nextStage}`}
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              textDecoration: 'none',
              padding: '0.5rem 0.875rem',
              border: '1px solid var(--border)',
            }}
          >
            단계 {nextStage} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  )
}
