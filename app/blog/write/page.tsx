'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const TODAY = () => new Date().toISOString().slice(0, 10)

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
  children,
  onClick,
  disabled,
  primary,
  type = 'button',
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

export default function BlogWritePage() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(TODAY())
  const [summary, setSummary] = useState('')
  const [categoriesRaw, setCategoriesRaw] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [body, setBody] = useState('')
  const [overwrite, setOverwrite] = useState(false)

  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Restore password from sessionStorage so refresh doesn't kick out.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('blog_write_pw') : null
    if (saved) setPassword(saved)
  }, [])

  const onUnlock = useCallback(async () => {
    setAuthBusy(true)
    setAuthError(null)
    try {
      // Cheap probe: send a write request that will fail validation but reveal auth status.
      const res = await fetch('/api/blog/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, slug: '__probe__', title: '_', date: '0000-00-00', body: '' }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setAuthError(j.error || '비밀번호가 일치하지 않습니다.')
        return
      }
      if (res.status === 503) {
        setAuthError(j.error || '프로덕션에서는 사용할 수 없습니다.')
        return
      }
      // 400 (validation) or 500 (env) — auth passed if not 401
      if (res.status === 500) {
        setAuthError(j.error || '서버 설정 오류.')
        return
      }
      sessionStorage.setItem('blog_write_pw', password)
      setUnlocked(true)
    } catch (e) {
      setAuthError(`네트워크 오류: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAuthBusy(false)
    }
  }, [password])

  // Auto-derive slug from title until user edits it manually.
  const [slugTouched, setSlugTouched] = useState(false)
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

  const previewHtml = useMemo(() => {
    if (!showPreview) return ''
    if (!body) return ''
    const raw = marked(body) as string
    return DOMPurify.sanitize(raw)
  }, [body, showPreview])

  const onSubmit = useCallback(async () => {
    setSubmitBusy(true)
    setSubmitMsg(null)
    try {
      const categories = categoriesRaw.split(',').map(s => s.trim()).filter(Boolean)
      const tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/blog/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          slug,
          title,
          date,
          summary: summary || undefined,
          categories,
          tags,
          body,
          overwrite,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setSubmitMsg({ kind: 'err', text: j.error || `요청 실패 (HTTP ${res.status})` })
      } else {
        setSubmitMsg({
          kind: 'ok',
          text: `저장됨: ${j.path}${j.overwritten ? ' (덮어씀)' : ''}. git push + vercel --prod로 배포하세요.`,
        })
      }
    } catch (e) {
      setSubmitMsg({ kind: 'err', text: `네트워크 오류: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSubmitBusy(false)
    }
  }, [password, slug, title, date, summary, categoriesRaw, tagsRaw, body, overwrite])

  // ─── Auth gate ───────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div style={{ maxWidth: '24rem', margin: '4rem auto' }}>
        <div className="section-head">BLOG / WRITE</div>
        <p className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '1.5rem', marginBottom: '1rem' }}>
          글 쓰려면 비밀번호가 필요합니다.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!authBusy) onUnlock()
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            autoFocus
            style={inputStyle}
          />
          {authError && (
            <p className="font-mono" style={{ fontSize: '0.72rem', color: '#ff6b6b', marginTop: '0.5rem' }}>
              {authError}
            </p>
          )}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <Btn type="submit" primary disabled={authBusy || !password}>
              {authBusy ? '확인 중...' : '들어가기'}
            </Btn>
            <Link href="/blog" className="nav-link" style={{ alignSelf: 'center' }}>
              ← --blog
            </Link>
          </div>
        </form>
      </div>
    )
  }

  // ─── Editor ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="section-head" style={{ marginBottom: 0 }}>BLOG / WRITE</div>
        <Link href="/blog" className="nav-link">← --blog</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', ...fieldGap }}>
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
        <label style={labelStyle}>slug (파일명: content/blog/&lt;slug&gt;.md)</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          placeholder="my-post-slug"
          style={inputStyle}
        />
      </div>

      <div style={fieldGap}>
        <label style={labelStyle}>summary (1~2줄, 카드에 표시됨)</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="짧은 요약"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', ...fieldGap }}>
        <div>
          <label style={labelStyle}>categories (쉼표로 구분)</label>
          <input
            type="text"
            value={categoriesRaw}
            onChange={(e) => setCategoriesRaw(e.target.value)}
            placeholder="AI, 프롬프트엔지니어링"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>tags (쉼표로 구분)</label>
          <input
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="LLM, Claude, GPT"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={fieldGap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>body (markdown)</label>
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
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="# 제목&#10;&#10;본문..."
            rows={20}
            spellCheck={false}
            style={{ ...inputStyle, minHeight: '20rem', resize: 'vertical', fontFamily: 'var(--font-mono, monospace)' }}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <label className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            style={{ marginRight: '0.4rem' }}
          />
          기존 글 덮어쓰기 허용
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Btn primary onClick={onSubmit} disabled={submitBusy || !title || !slug || !body}>
          {submitBusy ? '저장 중...' : '저장'}
        </Btn>
        {submitMsg && (
          <span
            className="font-mono"
            style={{
              fontSize: '0.75rem',
              color: submitMsg.kind === 'ok' ? 'var(--accent)' : '#ff6b6b',
            }}
          >
            {submitMsg.text}
          </span>
        )}
      </div>
    </div>
  )
}
