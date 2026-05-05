'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Props {
  value: string
  onChange: (next: string) => void
  password: string
  placeholder?: string
  rows?: number
  /** Header label content (passed in to allow extra controls like KO/EN tabs). */
  headerExtra?: React.ReactNode
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-bright)',
  font: 'inherit',
  fontSize: '0.85rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  color: 'var(--text-dim)',
  marginBottom: '0.35rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function BodyEditorWithUpload({
  value,
  onChange,
  password,
  placeholder = '# 제목\n\n본문...',
  rows = 20,
  headerExtra,
}: Props) {
  const [showPreview, setShowPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

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
            minHeight: '20rem',
            padding: '1rem',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            background: 'var(--bg)',
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          onDrop={onDrop}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
          style={{ ...inputStyle, minHeight: '20rem', resize: 'vertical', fontFamily: 'var(--font-jb-mono, monospace)' }}
        />
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
