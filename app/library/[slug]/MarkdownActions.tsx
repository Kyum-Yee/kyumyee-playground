'use client'

import { useState } from 'react'

interface Props {
  markdown: string
  filename: string
}

type Status = 'idle' | 'copied' | 'error'

export default function MarkdownActions({ markdown, filename }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown)
      } else {
        const ta = document.createElement('textarea')
        ta.value = markdown
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 1600)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 1600)
    }
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const baseBtnStyle: React.CSSProperties = {
    fontFamily: 'var(--font-jb-mono)',
    fontSize: '0.70rem',
    letterSpacing: '0.04em',
    padding: '0.3rem 0.7rem',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    transition: 'color 0.12s, border-color 0.12s, background 0.12s',
  }

  const copyLabel =
    status === 'copied' ? '✓ 복사됨' : status === 'error' ? '✕ 복사 실패' : '⧉ md 복사'

  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="마크다운 클립보드 복사"
        style={{
          ...baseBtnStyle,
          color: status === 'copied' ? 'var(--accent)' : baseBtnStyle.color,
          borderColor: status === 'copied' ? 'var(--accent)' : 'var(--border)',
        }}
        onMouseEnter={e => {
          if (status === 'idle') {
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }
        }}
        onMouseLeave={e => {
          if (status === 'idle') {
            e.currentTarget.style.color = 'var(--text-dim)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }
        }}
      >
        {copyLabel}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        aria-label="마크다운 파일 다운로드"
        style={baseBtnStyle}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--accent)'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-dim)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        ↓ md 다운로드
      </button>
    </div>
  )
}
