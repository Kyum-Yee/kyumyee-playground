'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { highlightMarkdown } from '@/lib/markdown-highlight'

interface Props {
  value: string
  onChange: (next: string) => void
  password: string
  placeholder?: string
  rows?: number
  /** 헤더 우측에 추가할 추가 컨트롤(KO/EN 탭 등). */
  headerExtra?: React.ReactNode
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  color: 'var(--text-dim)',
  marginBottom: '0.35rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

// overlay/textarea 정렬을 위해 반드시 동일하게 박는 layout 상수.
const RAW_FONT_FAMILY = 'var(--font-jb-mono, monospace)'
const RAW_FONT_SIZE = '0.85rem'
const RAW_LINE_HEIGHT = 1.6
const RAW_PADDING = '0.85rem 0.95rem'
const EDITOR_HEIGHT = '22rem'

export default function BodyEditorWithUpload({
  value,
  onChange,
  password,
  placeholder = '# 제목\n\n본문...',
  rows = 20, // eslint-disable-line @typescript-eslint/no-unused-vars
  headerExtra,
}: Props) {
  const [showPreview, setShowPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const [focused, setFocused] = useState(false)

  const insertAtCursor = useCallback((snippet: string) => {
    const ta = taRef.current
    if (!ta) {
      onChange(value + '\n' + snippet + '\n')
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = value.slice(0, start) + snippet + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + snippet.length
      ta.setSelectionRange(pos, pos)
    })
  }, [value, onChange])

  const uploadFile = useCallback(async (file: File) => {
    if (!password) {
      setMsg({ kind: 'err', text: '먼저 비밀번호로 들어와야 업로드 가능합니다.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('password', password)
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setMsg({ kind: 'err', text: j.error || `업로드 실패 (HTTP ${res.status})` })
        return
      }
      const md = `![${file.name.replace(/\.[^.]+$/, '')}](${j.url})`
      insertAtCursor(md.endsWith('\n') ? md : md + '\n')
      setMsg({ kind: 'ok', text: `${j.url} 삽입됨` })
    } catch (e) {
      setMsg({ kind: 'err', text: `네트워크 오류: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setBusy(false)
    }
  }, [password, insertAtCursor])

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) uploadFile(f)
  }, [uploadFile])

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of Array.from(items)) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) {
          e.preventDefault()
          uploadFile(f)
          return
        }
      }
    }
  }, [uploadFile])

  const onDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.dataTransfer?.files ?? [])
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (imgs.length === 0) return
    e.preventDefault()
    for (const f of imgs) uploadFile(f)
  }, [uploadFile])

  // overlay 거울에 들어갈 색칠된 HTML. trailing zero-width space 로 마지막 빈 줄 보존.
  const highlightedHtml = useMemo(() => highlightMarkdown(value) + '​', [value])

  // textarea 스크롤 → pre 거울에 transform 동기화
  const onTextareaScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const st = e.currentTarget.scrollTop
    if (preRef.current) preRef.current.style.transform = `translateY(${-st}px)`
  }, [])

  // 텍스트 변경/모드 전환 시 거울 transform 재동기화
  useEffect(() => {
    if (showPreview) return
    const ta = taRef.current
    if (!ta || !preRef.current) return
    preRef.current.style.transform = `translateY(${-ta.scrollTop}px)`
  }, [value, showPreview])

  const previewHtml = useMemo(() => {
    if (!showPreview || !value) return ''
    return DOMPurify.sanitize(marked(value) as string)
  }, [showPreview, value])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>body</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {headerExtra}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="font-mono"
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '0.2rem 0.5rem',
              cursor: busy ? 'wait' : 'pointer',
            }}
            title="이미지/gif 업로드 → ![](url) 자동 삽입. 붙여넣기·드래그도 됨."
          >
            {busy ? '...' : '+ 이미지'}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(v => !v)}
            className="font-mono"
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {showPreview ? '편집으로' : '미리보기'}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={onFileSelect}
        style={{ display: 'none' }}
      />

      {showPreview ? (
        <div
          className="prose"
          style={{
            minHeight: EDITOR_HEIGHT,
            padding: '1rem',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            background: 'var(--bg)',
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <div
          className="md-editor"
          style={{
            position: 'relative',
            height: EDITOR_HEIGHT,
            border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
            background: 'var(--bg)',
            borderRadius: '4px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            transition: 'border-color 0.12s',
          }}
        >
          <pre
            ref={preRef}
            aria-hidden="true"
            className="md-editor-overlay md-hl"
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
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={onTextareaScroll}
            onPaste={onPaste}
            onDrop={onDrop}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
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
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
        <p className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
          이미지/gif: 버튼·붙여넣기·드래그앤드롭으로 업로드 → 마크다운 자동 삽입
        </p>
        {msg && (
          <p className="font-mono" style={{ fontSize: '0.68rem', color: msg.kind === 'ok' ? 'var(--accent)' : '#ff6b6b' }}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}
