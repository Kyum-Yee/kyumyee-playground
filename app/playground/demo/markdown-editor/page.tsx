'use client'

import Link from 'next/link'
import { useCallback, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import DOMPurify from 'dompurify'

marked.use(markedKatex({ throwOnError: false, output: 'html', nonStandard: true }))

type Mode = 'raw' | 'rendered'

export default function MarkdownEditorPage() {
  const [text, setText] = useState('')
  const [filename, setFilename] = useState<string>('untitled.md')
  const [mode, setMode] = useState<Mode>('raw')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const html = useMemo(() => {
    if (mode !== 'rendered') return ''
    if (!text) return ''
    const raw = marked(text) as string
    return DOMPurify.sanitize(raw)
  }, [mode, text])

  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setText(result)
        setFilename(file.name || 'untitled.md')
        setMode('raw')
      }
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }, [])

  const onDownload = useCallback(() => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'untitled.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [text, filename])

  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 1600)
    } catch {
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 1600)
    }
  }, [text])

  const baseBtnStyle: React.CSSProperties = {
    fontFamily: 'var(--font-jb-mono)',
    fontSize: '0.70rem',
    letterSpacing: '0.04em',
    padding: '0.3rem 0.7rem',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    transition: 'color 0.12s, border-color 0.12s',
  }

  const copyLabel =
    copyStatus === 'copied' ? '✓ 복사됨' : copyStatus === 'error' ? '✕ 복사 실패' : '⧉ md 복사'

  return (
    <main className="md-editor" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      {/* Back */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/playground"
          style={{
            fontFamily: 'var(--font-jb-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}
        >
          ← --playground
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
            Demo · Markdown
          </span>
          <span className="pill" style={{ fontSize: '0.65rem' }}>Demo</span>
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
          Markdown Reader & Editor
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-jb-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            marginTop: '0.4rem',
          }}
        >
          .md 파일을 업로드해 raw·rendered로 토글하며 보고 편집·저장한다.
        </p>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          onChange={onUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={baseBtnStyle}
          aria-label=".md 파일 업로드"
        >
          ↑ md 업로드
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!text}
          style={{ ...baseBtnStyle, opacity: text ? 1 : 0.4, cursor: text ? 'pointer' : 'not-allowed' }}
          aria-label="현재 내용 .md로 다운로드"
        >
          ↓ md 다운로드
        </button>
        <button
          type="button"
          onClick={onCopy}
          disabled={!text}
          style={{
            ...baseBtnStyle,
            opacity: text ? 1 : 0.4,
            cursor: text ? 'pointer' : 'not-allowed',
            color: copyStatus === 'copied' ? 'var(--accent)' : baseBtnStyle.color,
            borderColor: copyStatus === 'copied' ? 'var(--accent)' : 'var(--border)',
          }}
          aria-label="현재 내용 클립보드 복사"
        >
          {copyLabel}
        </button>

        <span style={{ flex: 1 }} />

        <span
          style={{
            fontFamily: 'var(--font-jb-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            marginRight: '0.4rem',
          }}
        >
          {filename}
        </span>

        {/* Mode toggle */}
        <div className="mode-toggle" style={{ display: 'inline-flex', gap: '0.25rem' }}>
          <button
            type="button"
            aria-pressed={mode === 'raw'}
            onClick={() => setMode('raw')}
            style={{
              ...baseBtnStyle,
              color: mode === 'raw' ? 'var(--accent)' : baseBtnStyle.color,
              borderColor: mode === 'raw' ? 'var(--accent)' : 'var(--border)',
            }}
          >
            raw
          </button>
          <button
            type="button"
            aria-pressed={mode === 'rendered'}
            onClick={() => setMode('rendered')}
            style={{
              ...baseBtnStyle,
              color: mode === 'rendered' ? 'var(--accent)' : baseBtnStyle.color,
              borderColor: mode === 'rendered' ? 'var(--accent)' : 'var(--border)',
            }}
          >
            rendered
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ marginTop: '0.5rem' }}>
        {mode === 'raw' ? (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="여기에 마크다운을 입력하거나 위 [↑ md 업로드] 버튼으로 .md 파일을 불러오세요…"
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: '70vh',
              background: 'transparent',
              color: 'var(--text-bright)',
              border: '1px solid var(--border)',
              padding: '1rem',
              fontFamily: 'var(--font-jb-mono)',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        ) : text ? (
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
            렌더할 내용이 없습니다. raw 모드에서 마크다운을 입력하세요.
          </div>
        )}
      </div>
    </main>
  )
}
