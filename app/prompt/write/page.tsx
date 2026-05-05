'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import BodyEditorWithUpload from '@/components/BodyEditorWithUpload'

const TODAY = () => new Date().toISOString().slice(0, 10)
const CATEGORIES = ['design', 'reference', 'prompt'] as const
type Category = typeof CATEGORIES[number]

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

const fieldGap: React.CSSProperties = { marginBottom: '1.1rem' }

function Btn({
  children, onClick, disabled, primary, type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  primary?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="font-mono"
      style={{
        padding: '0.5rem 1rem',
        fontSize: '0.78rem',
        background: primary ? 'var(--accent)' : 'transparent',
        color: primary ? 'var(--bg)' : 'var(--text-bright)',
        border: `1px solid ${primary ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

export default function PromptWritePage() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(TODAY())
  const [category, setCategory] = useState<Category>('prompt')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [overwrite, setOverwrite] = useState(false)

  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('blog_write_pw') : null
    if (saved) setPassword(saved)
  }, [])

  useEffect(() => {
    if (slugTouched) return
    const auto = title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)
    setSlug(auto)
  }, [title, slugTouched])

  const onUnlock = useCallback(async () => {
    setAuthBusy(true)
    setAuthError(null)
    try {
      const res = await fetch('/api/prompt/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          slug: '__probe__',
          title: '_',
          date: '0000-00-00',
          category: 'prompt',
          body: '_',
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 401) { setAuthError(j.error || '비밀번호가 일치하지 않습니다.'); return }
      if (res.status === 503) { setAuthError(j.error || '프로덕션에서는 사용할 수 없습니다.'); return }
      if (res.status === 500) { setAuthError(j.error || '서버 설정 오류.'); return }
      sessionStorage.setItem('blog_write_pw', password)
      setUnlocked(true)
    } catch (e) {
      setAuthError(`네트워크 오류: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAuthBusy(false)
    }
  }, [password])

  const onSubmit = useCallback(async () => {
    setSubmitBusy(true)
    setSubmitMsg(null)
    try {
      const res = await fetch('/api/prompt/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password, slug, title, date, category,
          summary: summary || undefined,
          body, overwrite,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setSubmitMsg({ kind: 'err', text: j.error || `요청 실패 (HTTP ${res.status})` })
      } else {
        setSubmitMsg({
          kind: 'ok',
          text: `저장됨: ${j.path}${j.overwritten ? ' (덮어씀)' : ''}. ${j.url} 에서 확인.`,
        })
      }
    } catch (e) {
      setSubmitMsg({ kind: 'err', text: `네트워크 오류: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSubmitBusy(false)
    }
  }, [password, slug, title, date, category, summary, body, overwrite])

  if (!unlocked) {
    return (
      <div style={{ maxWidth: '24rem', margin: '4rem auto' }}>
        <div className="section-head">PROMPT / WRITE</div>
        <p className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '1.5rem', marginBottom: '1rem' }}>
          항목 작성하려면 비밀번호가 필요합니다.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); if (!authBusy) onUnlock() }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            autoFocus
            style={inputStyle}
          />
          {authError && (
            <p className="font-mono" style={{ fontSize: '0.72rem', color: '#ff6b6b', marginTop: '0.5rem' }}>{authError}</p>
          )}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <Btn type="submit" primary disabled={authBusy || !password}>
              {authBusy ? '확인 중...' : '들어가기'}
            </Btn>
            <Link href="/prompt" className="nav-link" style={{ alignSelf: 'center' }}>← --prompt</Link>
          </div>
        </form>
      </div>
    )
  }

  const tagBtn = (active: boolean): React.CSSProperties => ({
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="section-head" style={{ marginBottom: 0 }}>PROMPT / WRITE</div>
        <Link href="/prompt" className="nav-link">← --prompt</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', ...fieldGap }}>
        <div>
          <label style={labelStyle}>title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>date</label>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={fieldGap}>
        <label style={labelStyle}>slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => { setSlugTouched(true); setSlug(e.target.value) }}
          placeholder="my-prompt-slug"
          style={inputStyle}
        />
      </div>

      <div style={fieldGap}>
        <label style={labelStyle}>category</label>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={tagBtn(category === c)}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
          design = 8축 디자인 (이미지 첨부 가능) / reference = 번역 direction·reference / prompt = 일반 프롬프트
        </p>
      </div>

      <div style={fieldGap}>
        <label style={labelStyle}>summary (선택)</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="짧은 요약"
          style={inputStyle}
        />
      </div>

      <div style={fieldGap}>
        <BodyEditorWithUpload
          value={body}
          onChange={setBody}
          password={password}
          placeholder={category === 'design' ? '# 8축 디자인\n\n축1...\n축2...\n\n![](/uploads/...)' : '# 제목\n\n본문...'}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <label className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            style={{ marginRight: '0.4rem' }}
          />
          기존 항목 덮어쓰기 허용
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn primary onClick={onSubmit} disabled={submitBusy || !title || !slug || !body}>
          {submitBusy ? '저장 중...' : '저장'}
        </Btn>
        {submitMsg && (
          <span className="font-mono" style={{ fontSize: '0.75rem', color: submitMsg.kind === 'ok' ? 'var(--accent)' : '#ff6b6b' }}>
            {submitMsg.text}
          </span>
        )}
      </div>
    </div>
  )
}
