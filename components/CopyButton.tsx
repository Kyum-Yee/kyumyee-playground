'use client'

import { useState } from 'react'

interface Props {
  text: string
  label?: string
  copiedLabel?: string
  className?: string
  style?: React.CSSProperties
  /** 사용자가 복사 직후 토스트로 보여주는 상태 유지 시간(ms). */
  feedbackMs?: number
}

export default function CopyButton({
  text,
  label = '한번에 복사',
  copiedLabel = '✓ 복사됨',
  className,
  style,
  feedbackMs = 1400,
}: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  const onClick = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // fallback for non-https / 구식 브라우저
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!ok) throw new Error('execCommand failed')
      }
      setState('copied')
      setTimeout(() => setState('idle'), feedbackMs)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), feedbackMs)
    }
  }

  const text_ = state === 'copied' ? copiedLabel : state === 'error' ? '복사 실패' : label
  const isActive = state === 'copied'

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
      {text_}
    </button>
  )
}
