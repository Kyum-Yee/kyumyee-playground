'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { BlogMeta } from '@/lib/content'

type Lang = 'ko' | 'en'
type Mode = 'rendered' | 'raw'

interface Props {
  meta: BlogMeta
  metaEn?: { title: string; summary?: string }
  bodyKo: string
  bodyEn: string | null
  htmlKo: string
  htmlEn: string | null
}

interface EditPoint { start: number; end: number }
const EDIT_POINT_RE = /\{([\s\S]*?)\}\s*⟶\s*([\s\S]*?)\s*,,,/gu

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightDiffSpan(raw: string): string {
  const m = raw.match(/^(\{)([\s\S]*?)(\})(\s*⟶\s*)([\s\S]*?)(\s*,,,)$/)
  if (!m) return `<span class="edit-point">${escHtml(raw)}</span>`
  const [, lBrace, original, rBrace, arrow, revised, terminator] = m
  return (
    `<span class="edit-marker">${escHtml(lBrace)}</span>` +
    `<span class="edit-orig">${escHtml(original)}</span>` +
    `<span class="edit-marker">${escHtml(rBrace)}</span>` +
    `<span class="edit-arrow">${escHtml(arrow)}</span>` +
    `<span class="edit-revised">${escHtml(revised)}</span>` +
    `<span class="edit-marker">${escHtml(terminator)}</span>`
  )
}

function buildRawHighlightedHTML(text: string): string {
  if (!text) return ''
  const points: EditPoint[] = []
  for (const m of text.matchAll(EDIT_POINT_RE)) {
    points.push({ start: m.index!, end: m.index! + m[0].length })
  }
  if (points.length === 0) return escHtml(text)
  let out = ''
  let cursor = 0
  for (const p of points) {
    out += escHtml(text.slice(cursor, p.start))
    out += highlightDiffSpan(text.slice(p.start, p.end))
    cursor = p.end
  }
  out += escHtml(text.slice(cursor))
  return out
}

export default function PostView({ meta, metaEn, bodyKo, bodyEn, htmlKo, htmlEn }: Props) {
  const [lang, setLang] = useState<Lang>('ko')
  const [mode, setMode] = useState<Mode>('rendered')

  const hasEn = bodyEn !== null && htmlEn !== null
  const activeBody = lang === 'en' && hasEn ? bodyEn! : bodyKo
  const activeHtml = lang === 'en' && hasEn ? htmlEn! : htmlKo
  const activeTitle = lang === 'en' && metaEn ? metaEn.title : meta.title

  const rawHl = useMemo(() => buildRawHighlightedHTML(activeBody), [activeBody])

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.7rem',
    fontSize: '0.72rem',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--text-dim)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'var(--font-jb-mono, monospace)',
  })

  return (
    <article>
      <Link href="/blog" className="nav-link" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        ← --blog
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
          {activeTitle}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{meta.date}</span>
          {meta.categories.map(c => (
            <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className="pill">{c}</Link>
          ))}
          {meta.tags.map(t => (
            <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="tag">{t}</Link>
          ))}
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '0.8rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button onClick={() => setLang('ko')} style={toggleBtn(lang === 'ko')}>KO</button>
        <button
          onClick={() => hasEn && setLang('en')}
          disabled={!hasEn}
          style={{ ...toggleBtn(lang === 'en'), opacity: hasEn ? 1 : 0.35, cursor: hasEn ? 'pointer' : 'not-allowed' }}
          title={hasEn ? 'English' : '영어 버전 없음'}
        >
          EN
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={() => setMode('rendered')} style={toggleBtn(mode === 'rendered')}>rendered</button>
        <button onClick={() => setMode('raw')} style={toggleBtn(mode === 'raw')}>raw</button>
      </div>

      <div className="edit-host">
        {mode === 'rendered' ? (
          <div className="prose-wrap">
            <div className="prose" dangerouslySetInnerHTML={{ __html: activeHtml }} />
          </div>
        ) : (
          <pre
            style={{
              fontFamily: 'var(--font-jb-mono, monospace)',
              fontSize: '0.85rem',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '1rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-bright)',
            }}
            dangerouslySetInnerHTML={{ __html: rawHl }}
          />
        )}
      </div>
    </article>
  )
}
