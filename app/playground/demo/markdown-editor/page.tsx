'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import DOMPurify from 'dompurify'

marked.use(markedKatex({ throwOnError: false, output: 'html', nonStandard: true }))

type Mode = 'raw' | 'rendered'

// 수정포인트 양식:
//   {원문} ⟶ 수정          (편집)
//   {원문} ⟶ ∅             (삭제)
//   ∅ ⟶ 추가               (삽입 — 브레이스 없음)
const DELETION_RE = /\{([^{}\n]+)\}\s*⟶\s*∅(?=\s|$)/gu
const EDIT_RE = /\{([^{}\n]+)\}\s*⟶\s*([^{}\n∅]+?)(?=\s*(?:\{[^{}\n]+\}\s*⟶|$|\n))/gu
const INSERT_RE = /(?<![{∅])∅\s*⟶\s*([^{}\n∅]+?)(?=\s*(?:\{[^{}\n]+\}\s*⟶|$|\n))/gu

interface EditPoint {
  start: number
  end: number
  original: string
  revised: string
}

function findEditPoints(text: string): EditPoint[] {
  const candidates: EditPoint[] = []

  for (const m of text.matchAll(DELETION_RE)) {
    candidates.push({
      start: m.index!,
      end: m.index! + m[0].length,
      original: m[1],
      revised: '',
    })
  }
  for (const m of text.matchAll(EDIT_RE)) {
    candidates.push({
      start: m.index!,
      end: m.index! + m[0].length,
      original: m[1],
      revised: m[2].trim(),
    })
  }
  for (const m of text.matchAll(INSERT_RE)) {
    candidates.push({
      start: m.index!,
      end: m.index! + m[0].length,
      original: '',
      revised: m[1].trim(),
    })
  }

  // 같은 시작 위치는 더 긴 매치 우선 (deletion vs edit 충돌 시 deletion 채택)
  candidates.sort((a, b) => a.start - b.start || b.end - a.end)
  const result: EditPoint[] = []
  for (const p of candidates) {
    const last = result[result.length - 1]
    if (last && p.start < last.end) continue // 겹침 제거
    result.push(p)
  }
  return result
}

function findEditPointAt(points: EditPoint[], pos: number): EditPoint | null {
  for (const p of points) {
    if (pos > p.start && pos < p.end) return p
  }
  return null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightDiffSpan(raw: string): string {
  // `⟶` 기준으로 좌측(원문)은 빨강, 우측(수정)은 초록 span 으로 분할
  const arrow = '⟶'
  const idx = raw.indexOf(arrow)
  if (idx === -1) {
    return `<span class="edit-point">${escapeHtml(raw)}</span>`
  }
  const left = raw.slice(0, idx).replace(/\s+$/, '')
  const leftPad = raw.slice(left.length, idx) // 화살표 직전 공백
  const right = raw.slice(idx + arrow.length)
  const rightLead = right.match(/^\s*/)?.[0] ?? ''
  const rightBody = right.slice(rightLead.length)
  return (
    `<span class="edit-orig">${escapeHtml(left)}</span>` +
    escapeHtml(leftPad) +
    `<span class="edit-arrow">${escapeHtml(arrow)}</span>` +
    escapeHtml(rightLead) +
    `<span class="edit-revised">${escapeHtml(rightBody)}</span>`
  )
}

function buildHighlightedHTML(text: string, points: EditPoint[]): string {
  if (points.length === 0) return escapeHtml(text)
  let out = ''
  let cursor = 0
  for (const p of points) {
    out += escapeHtml(text.slice(cursor, p.start))
    out += highlightDiffSpan(text.slice(p.start, p.end))
    cursor = p.end
  }
  out += escapeHtml(text.slice(cursor))
  return out
}

const RAW_FONT_FAMILY = 'var(--font-jb-mono)'
const RAW_FONT_SIZE = '0.85rem'
const RAW_LINE_HEIGHT = 1.6
const RAW_PADDING = '1rem'

export default function MarkdownEditorPage() {
  const [text, setText] = useState('')
  const [filename, setFilename] = useState<string>('untitled.md')
  const [mode, setMode] = useState<Mode>('raw')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [editorFocused, setEditorFocused] = useState(false)

  const editPoints = useMemo(() => findEditPoints(text), [text])
  const highlightedHTML = useMemo(
    () => buildHighlightedHTML(text, editPoints),
    [text, editPoints],
  )

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

  // 수정포인트 accept/reject — execCommand 로 native undo 보존
  const applyEdit = useCallback(
    (point: EditPoint, action: 'accept' | 'reject') => {
      const ta = textareaRef.current
      if (!ta) return
      const replacement = action === 'accept' ? point.revised : point.original
      ta.focus()
      ta.setSelectionRange(point.start, point.end)
      // execCommand('insertText') 는 deprecated 지만 native undo 와 통합되는 유일한 방법
      const ok = document.execCommand('insertText', false, replacement)
      if (!ok) {
        // fallback — undo 통합 안 됨
        const next = text.slice(0, point.start) + replacement + text.slice(point.end)
        setText(next)
        const cursor = point.start + replacement.length
        requestAnimationFrame(() => {
          ta.setSelectionRange(cursor, cursor)
        })
      }
    },
    [text],
  )

  const navigateEditPoint = useCallback(
    (dir: 'next' | 'prev') => {
      const ta = textareaRef.current
      if (!ta || editPoints.length === 0) return
      const cursor = ta.selectionStart
      let target: EditPoint | undefined
      if (dir === 'next') {
        target = editPoints.find(p => p.start > cursor) ?? editPoints[0]
      } else {
        const before = editPoints.filter(p => p.end < cursor)
        target = before[before.length - 1] ?? editPoints[editPoints.length - 1]
      }
      if (!target) return
      ta.focus()
      // 수정포인트 안쪽으로 커서 이동 (시작 위치)
      ta.setSelectionRange(target.start + 1, target.start + 1)
      // 스크롤 위치 보정
      requestAnimationFrame(() => {
        const lineHeightPx = parseFloat(getComputedStyle(ta).lineHeight) || 22
        const before = text.slice(0, target!.start)
        const lineIdx = (before.match(/\n/g) ?? []).length
        const targetTop = lineIdx * lineHeightPx
        const padTop = parseFloat(getComputedStyle(ta).paddingTop) || 0
        ta.scrollTop = Math.max(0, targetTop - ta.clientHeight / 3 + padTop)
      })
    },
    [editPoints, text],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget
      // Shift + ↓ / ↑ → 수정포인트 이동
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'ArrowDown') {
          if (editPoints.length === 0) return
          e.preventDefault()
          navigateEditPoint('next')
          return
        }
        if (e.key === 'ArrowUp') {
          if (editPoints.length === 0) return
          e.preventDefault()
          navigateEditPoint('prev')
          return
        }
      }
      // 커서가 수정포인트 안에 있을 때만 Tab/Backspace/Del 가로채기
      const atPoint = findEditPointAt(editPoints, ta.selectionStart)
      if (!atPoint) return
      if (e.key === 'Tab') {
        e.preventDefault()
        applyEdit(atPoint, 'accept')
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        applyEdit(atPoint, 'reject')
        return
      }
    },
    [editPoints, applyEdit, navigateEditPoint],
  )

  // textarea 스크롤 → pre 거울에 동기화 (transform 으로 이동)
  const onTextareaScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      const st = e.currentTarget.scrollTop
      if (preRef.current) {
        preRef.current.style.transform = `translateY(${-st}px)`
      }
    },
    [],
  )

  // 텍스트 변경 시 pre 거울도 transform 리셋이 필요할 수 있어 textarea scrollTop 으로 재동기화
  useEffect(() => {
    if (mode !== 'raw') return
    const ta = textareaRef.current
    if (!ta || !preRef.current) return
    preRef.current.style.transform = `translateY(${-ta.scrollTop}px)`
  }, [text, mode])

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
          .md 파일을 업로드해 raw·rendered로 토글하며 보고 편집·저장한다. raw 모드에서{' '}
          <code style={{ background: 'var(--surface)', padding: '0 0.3em', color: 'var(--text)' }}>
            {'{원문} ⟶ 수정'}
          </code>{' '}
          토막은 수정포인트로 강조된다 — 커서를 그 안에 두고{' '}
          <strong style={{ color: 'var(--accent)' }}>Tab</strong> 으로 수정안 반영,{' '}
          <strong style={{ color: 'var(--accent)' }}>Backspace/Del</strong> 로 원문 유지.{' '}
          <strong style={{ color: 'var(--accent)' }}>Shift+↓/↑</strong> 로 다음/이전 포인트 이동. 모든
          작업은 Cmd/Ctrl+Z 로 되돌릴 수 있다.
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
          {editPoints.length > 0 && mode === 'raw' && (
            <span style={{ color: 'var(--accent)', marginRight: '0.6rem' }}>
              수정포인트 {editPoints.length}
            </span>
          )}
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
          <div
            ref={wrapperRef}
            style={{
              position: 'relative',
              height: '70vh',
              border: `1px solid ${editorFocused ? 'var(--accent)' : 'var(--border)'}`,
              boxSizing: 'border-box',
              overflow: 'hidden',
              transition: 'border-color 0.12s',
            }}
          >
            <pre
              ref={preRef}
              aria-hidden="true"
              className="md-editor-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                margin: 0,
                padding: RAW_PADDING,
                fontFamily: RAW_FONT_FAMILY,
                fontSize: RAW_FONT_SIZE,
                lineHeight: RAW_LINE_HEIGHT,
                whiteSpace: 'pre-wrap',
                wordBreak: 'normal',
                overflowWrap: 'break-word',
                color: 'var(--text-bright)',
                pointerEvents: 'none',
                willChange: 'transform',
                boxSizing: 'border-box',
              }}
              dangerouslySetInnerHTML={{ __html: highlightedHTML + '​' }}
            />
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKeyDown}
              onScroll={onTextareaScroll}
              onFocus={() => setEditorFocused(true)}
              onBlur={() => setEditorFocused(false)}
              placeholder="여기에 마크다운을 입력하거나 위 [↑ md 업로드] 버튼으로 .md 파일을 불러오세요…"
              spellCheck={false}
              className="md-editor-textarea"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                background: 'transparent',
                color: 'transparent',
                caretColor: 'var(--text-bright)',
                border: 'none',
                padding: RAW_PADDING,
                fontFamily: RAW_FONT_FAMILY,
                fontSize: RAW_FONT_SIZE,
                lineHeight: RAW_LINE_HEIGHT,
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                overflowY: 'auto',
                overflowX: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'normal',
                overflowWrap: 'break-word',
              }}
            />
          </div>
        ) : text ? (
          <div
            style={{
              minHeight: '70vh',
              maxHeight: '80vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              border: '1px solid var(--border)',
              boxSizing: 'border-box',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
          >
            <div className="prose-wrap">
              <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
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
