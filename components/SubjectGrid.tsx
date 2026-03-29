'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Subject } from '@/lib/expert-library'

type Cat = '전체' | '이과' | '문과'

interface Props {
  subjects: Subject[]
  initialQ: string
  initialCat: string
}

export default function SubjectGrid({ subjects, initialQ, initialCat }: Props) {
  const [q, setQ] = useState(initialQ)
  const [cat, setCat] = useState<Cat>(
    (['전체', '이과', '문과'].includes(initialCat) ? initialCat : '전체') as Cat,
  )

  const filtered = useMemo(() => {
    const lower = q.toLowerCase()
    return subjects.filter(s => {
      if (cat !== '전체' && s.category !== cat) return false
      if (!lower) return true
      return (
        s.title.toLowerCase().includes(lower) ||
        (s.subtitle?.toLowerCase().includes(lower) ?? false) ||
        s.category.includes(lower)
      )
    })
  }, [subjects, q, cat])

  const tabs: Cat[] = ['전체', '이과', '문과']

  return (
    <>
      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setCat(t)}
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.70rem',
              letterSpacing: '0.06em',
              padding: '0.3rem 0.75rem',
              border: '1px solid',
              borderColor: cat === t ? 'var(--accent)' : 'var(--border)',
              borderRadius: 0,
              background: cat === t ? 'var(--accent)' : 'transparent',
              color: cat === t ? 'var(--bg)' : 'var(--text-dim)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t === '전체' ? 'ALL' : t === '이과' ? 'SCIENCE' : 'HUMANITIES'}
            {t !== '전체' && (
              <span style={{ opacity: 0.7, marginLeft: '0.4rem' }}>
                ({subjects.filter(s => s.category === t).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.75rem' }}>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="검색 — 제목, 영문명, 분야..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'var(--font-jb-mono)',
            fontSize: '0.78rem',
            color: 'var(--text)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 0,
            padding: '0.55rem 0.875rem',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-jb-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            padding: '2rem 0',
          }}
        >
          검색 결과 없음
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.5rem',
          }}
        >
          {filtered.map(subject => (
            <SubjectCard key={subject.slug} subject={subject} />
          ))}
        </div>
      )}

      {/* Count */}
      <p
        style={{
          fontFamily: 'var(--font-jb-mono)',
          fontSize: '0.65rem',
          color: 'var(--text-dim)',
          marginTop: '1.5rem',
          letterSpacing: '0.04em',
        }}
      >
        {filtered.length} / {subjects.length} subjects
      </p>
    </>
  )
}

function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <Link
      href={`/library/${subject.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        className="card"
        style={{ cursor: 'pointer' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '0.5rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}
          >
            {subject.category} · {String(subject.index).padStart(2, '0')}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.62rem',
              color: 'var(--text-dim)',
              opacity: 0.6,
            }}
          >
            {subject.stages} stages
          </span>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-jb-mono)',
            fontSize: '0.85rem',
            fontWeight: 400,
            color: 'var(--text-bright)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {subject.title}
        </p>

        {subject.subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.68rem',
              color: 'var(--text-dim)',
              margin: '0.3rem 0 0',
            }}
          >
            {subject.subtitle}
          </p>
        )}
      </div>
    </Link>
  )
}
