'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import BodyEditorWithUpload from '@/components/BodyEditorWithUpload'

const TODAY = () => new Date().toISOString().slice(0, 10)
const ALLOWED_TAGS = ['AI', '프롬프트', '디자인'] as const
type AllowedTag = typeof ALLOWED_TAGS[number]

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

type Lang = 'ko' | 'en'

export default function BlogWritePage() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  const [slug, setSlug] = useState('')
  const [titleKo, setTitleKo] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [date, setDate] = useState(TODAY())
  const [summaryKo, setSummaryKo] = useState('')
  const [summaryEn, setSummaryEn] = useState('')
  const [categoriesRaw, setCategoriesRaw] = useState('')
  const [tags, setTags] = useState<Set<AllowedTag>>(new Set())
  const [bodyKo, setBodyKo] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [overwrite, setOverwrite] = useState(false)

  const [lang, setLang] = useState<Lang>('ko')

  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('blog_write_pw') : null
    if (saved) setPassword(saved)
  }, [])

  const onUnlock = useCallback(async () => {
    setAuthBusy(true)
    setAuthError(null)
    try {
      const res = await fetch('/api/blog/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          slug: '__probe__',
          title_ko: '_',
          date: '0000-00-00',
          body_ko: '',
        }),
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

  const [slugTouched, setSlugTouched] = useState(false)
  useEffect(() => {
    if (slugTouched) return
    const source = titleEn || titleKo
    const auto = source
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)
    setSlug(auto)
  }, [titleKo, titleEn, slugTouched])

  const activeBody = lang === 'ko' ? bodyKo : bodyEn
  const setActiveBody = lang === 'ko' ? setBodyKo : setBodyEn

  const toggleTag = (t: AllowedTag) => {
    const next = new Set(tags)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setTags(next)
  }

  const onSubmit = useCallback(async () => {
    setSubmitBusy(true)
    setSubmitMsg(null)
    try {
      const categories = categoriesRaw.split(',').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/blog/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          slug,
          title_ko: titleKo,
          title_en: titleEn || undefined,
          date,
          summary_ko: summaryKo || undefined,
          summary_en: summaryEn || undefined,
          categories,
          tags: Array.from(tags),
          body_ko: bodyKo,
          body_en: bodyEn || undefined,
          overwrite,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setSubmitMsg({ kind: 'err', text: j.error || `요청 실패 (HTTP ${res.status})` })
      } else {
        const paths = (j.paths as string[] | undefined)?.join(', ') ?? j.path
        setSubmitMsg({
          kind: 'ok',
          text: `저장됨: ${paths}${j.overwritten ? ' (덮어씀)' : ''}. git push + vercel --prod로 배포하세요.`,
        })
      }
    } catch (e) {
      setSubmitMsg({ kind: 'err', text: `네트워크 오류: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSubmitBusy(false)
    }
  }, [password, slug, titleKo, titleEn, date, summaryKo, summaryEn, categoriesRaw, tags, bodyKo, bodyEn, overwrite])

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
  const langTabBtn = (active: boolean): React.CSSProperties => ({
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
        <div className="section-head" style={{ marginBottom: 0 }}>BLOG / WRITE</div>
        <Link href="/blog" className="nav-link">← --blog</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', ...fieldGap }}>
        <div>
          <label style={labelStyle}>title (ko)</label>
          <input
            type="text"
            value={titleKo}
            onChange={(e) => setTitleKo(e.target.value)}
            placeholder="제목"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>title (en, optional)</label>
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Title"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', ...fieldGap }}>
        <div>
          <label style={labelStyle}>slug</label>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', ...fieldGap }}>
        <div>
          <label style={labelStyle}>summary (ko)</label>
          <input
            type="text"
            value={summaryKo}
            onChange={(e) => setSummaryKo(e.target.value)}
            placeholder="짧은 요약"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>summary (en, optional)</label>
          <input
            type="text"
            value={summaryEn}
            onChange={(e) => setSummaryEn(e.target.value)}
            placeholder="Short summary"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={fieldGap}>
        <label style={labelStyle}>categories (쉼표로 구분, 자유)</label>
        <input
          type="text"
          value={categoriesRaw}
          onChange={(e) => setCategoriesRaw(e.target.value)}
          placeholder="dev, essay"
          style={inputStyle}
        />
      </div>

      <div style={fieldGap}>
        <label style={labelStyle}>tags (3개 중 선택)</label>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {ALLOWED_TAGS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={`tag${tags.has(t) ? ' tag-active' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={fieldGap}>
        <BodyEditorWithUpload
          key={lang}
          value={activeBody}
          onChange={setActiveBody}
          password={password}
          placeholder={lang === 'ko' ? '# 제목\n\n본문...' : '# Heading\n\nBody...'}
          headerExtra={
            <>
              <button type="button" onClick={() => setLang('ko')} style={langTabBtn(lang === 'ko')}>KO</button>
              <button type="button" onClick={() => setLang('en')} style={langTabBtn(lang === 'en')}>EN</button>
            </>
          }
        />
        <p className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
          수정 표기 양식: {'{원문}'} ⟶ 수정 ,,, (글 페이지에서 빨/초로 하이라이트됨)
        </p>
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
        <Btn primary onClick={onSubmit} disabled={submitBusy || !titleKo || !slug || !bodyKo}>
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
