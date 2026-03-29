'use client'

import Link from 'next/link'

interface Props {
  slug: string
  stages: number
  currentStage: number
}

export default function StageNav({ slug, stages, currentStage }: Props) {
  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
      {Array.from({ length: stages }, (_, i) => i + 1).map(n => {
        const active = n === currentStage
        return (
          <Link
            key={n}
            href={`/library/${slug}?stage=${n}`}
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.70rem',
              letterSpacing: '0.04em',
              padding: '0.3rem 0.7rem',
              border: '1px solid',
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              borderBottom: active ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: active ? 'var(--accent-dim)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
          >
            단계{n}
          </Link>
        )
      })}
    </div>
  )
}
