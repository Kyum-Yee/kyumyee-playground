'use client'

import { useState } from 'react'

interface Props {
  text: string
  filename: string
  mime?: string
  label?: string
  doneLabel?: string
  className?: string
  style?: React.CSSProperties
  feedbackMs?: number
}

export default function DownloadButton({
  text,
  filename,
  mime = 'text/markdown;charset=utf-8',
  label = '다운로드',
  doneLabel = '✓ 받음',
  className,
  style,
  feedbackMs = 1400,
}: Props) {
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle')

  const onClick = () => {
    try {
      const blob = new Blob([text], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setState('done')
      setTimeout(() => setState('idle'), feedbackMs)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), feedbackMs)
    }
  }

  const labelText = state === 'done' ? doneLabel : state === 'error' ? '실패' : label
  const isActive = state === 'done'

  return (
    <button
      type="button"
      onClick={onClick}
      className={className ?? 'font-mono'}
      style={{
        padding: '0.4rem 0.85rem',
        fontSize: '0.72rem',
        background: isActive ? 'var(--accent)' : 'transparent',
        color: isActive ? 'var(--bg)' : 'var(--text-bright)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background 120ms, color 120ms, border-color 120ms',
        ...style,
      }}
      aria-live="polite"
    >
      {labelText}
    </button>
  )
}
