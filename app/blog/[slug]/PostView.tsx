'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import markedFootnote from 'marked-footnote'
import DOMPurify from 'dompurify'
import { highlightMarkdown } from '@/lib/markdown-highlight'
import type { BlogMeta } from '@/lib/content'

marked.use(markedKatex({ throwOnError: false, output: 'html', nonStandard: true }))
marked.use(markedFootnote())

type Lang = 'ko' | 'en'
type Mode = 'rendered' | 'raw'

interface Props {
  meta: BlogMeta
  metaEn?: { title: string; summary?: string }
  bodyKo: string
  bodyEn: string | null
  htmlKo: string
  htmlEn: string | null
}

interface EditPoint {
  start: number
  end: number
  original: string
  revised: string
}

const EDIT_POINT_RE = /\{([\s\S]*?)\}\s*⟶\s*([\s\S]*?)\s*,,,/gu

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function findEditPoints(text: string): EditPoint[] {
  const points: EditPoint[] = []
  for (const m of text.matchAll(EDIT_POINT_RE)) {
    points.push({
      start: m.index!,
      end: m.index! + m[0].length,
      original: m[1],
      revised: m[2],
    })
  }
  return points
}

function findEditPointAt(points: EditPoint[], pos: number): EditPoint | null {
  for (const p of points) {
    if (pos > p.start && pos < p.end) return p
  }
  return null
}

function highlightDiffSpan(raw: string): string {
  const m = raw.match(/^(\{)([\s\S]*?)(\})(\s*⟶\s*)([\s\S]*?)(\s*,,,)$/)
  if (!m) return `<span class="edit-point">${escHtml(raw)}</span>`
  const [, lBrace, original, rBrace, arrow, revised, terminator] = m
  return (
    `<span class="edit-marker">${escHtml(lBrace)}</span>` +
    `<span class="edit-orig">${escHtml(original)}</span>` +
    `<span class="edit-marker">${escHtml(rBrace)}</span>` +
    `<span class="edit-arrow">${escHtml(arrow)}</span>` +
    `<span class="edit-revised">${escHtml(revised)}</span>` +
    `<span class="edit-marker">${escHtml(terminator)}</span>`
  )
}

function buildRawHighlightedHTML(text: string, points: EditPoint[]): string {
  if (!text) return ''
  if (points.length === 0) return highlightMarkdown(text)
  let out = ''
  let cursor = 0
  for (const p of points) {
    out += highlightMarkdown(text.slice(cursor, p.start))
    out += highlightDiffSpan(text.slice(p.start, p.end))
    cursor = p.end
  }
  out += highlightMarkdown(text.slice(cursor))
  return out
}

const RAW_FONT_FAMILY = 'var(--font-jb-mono, monospace)'
const RAW_FONT_SIZE = '0.85rem'
const RAW_LINE_HEIGHT = 1.65
const RAW_PADDING = '1rem'

export default function PostView({ meta, metaEn, bodyKo, bodyEn, htmlKo, htmlEn }: Props) {
  const [lang, setLang] = useState<Lang>('ko')
  const [mode, setMode] = useState<Mode>('rendered')

  const hasEn = bodyEn !== null && htmlEn !== null
  const activeBody = lang === 'en' && hasEn ? bodyEn! : bodyKo
  const activeServerHtml = lang === 'en' && hasEn ? htmlEn! : htmlKo
  const activeTitle = lang === 'en' && metaEn ? metaEn.title : meta.title

  // 편집 가능한 텍스트 상태. 언어 전환 시 해당 언어의 원문으로 리셋.
  const [text, setText] = useState<string>(activeBody)
  useEffect(() => {
    setText(activeBody)
  }, [activeBody])

  const dirty = text !== activeBody
  const filename = lang === 'en'
    ? `${meta.slug}.en.md`
    : `${meta.slug}.md`

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const proseRef = useRef<HTMLDivElement>(null)
  const [editorFocused, setEditorFocused] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  // 저장 & 배포 상태
  type SaveStage = 'idle' | 'saving' | 'deploying' | 'done' | 'error'
  const [saveStage, setSaveStage] = useState<SaveStage>('idle')
  const [saveMsg, setSaveMsg] = useState<string>('')
  const isDev = process.env.NODE_ENV === 'development'

  const editPoints = useMemo(() => findEditPoints(text), [text])
  const highlightedHTML = useMemo(
    () => buildRawHighlightedHTML(text, editPoints),
    [text, editPoints],
  )

  // rendered 모드: 편집 안 된 상태면 서버 HTML, 편집된 상태면 클라이언트 재렌더.
  const renderedHtml = useMemo(() => {
    if (!dirty) return activeServerHtml
    if (!text) return ''
    const raw = marked(text) as string
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['class', 'id'] })
  }, [dirty, text, activeServerHtml])

  const onDownload = useCallback(() => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
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

  const onReset = useCallback(() => {
    setText(activeBody)
  }, [activeBody])

  const onSaveAndDeploy = useCallback(async () => {
    if (saveStage === 'saving' || saveStage === 'deploying') return

    let password = sessionStorage.getItem('blog_write_pw') || ''
    if (!password) {
      const entered = window.prompt('블로그 비밀번호를 입력하세요:')
      if (!entered) return
      password = entered
    }

    setSaveStage('saving')
    setSaveMsg('파일 저장 + 커밋 + push + vercel 배포 (최대 2~3분)...')

    try {
      // single-shot: save + git + vercel deploy. 응답까지 1~3분 걸릴 수 있음.
      setSaveStage('deploying')
      const res = await fetch('/api/blog/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          slug: meta.slug,
          lang,
          body: text,
          deploy: true,
        }),
      })
      const j = await res.json().catch(() => ({}))

      if (res.status === 401) {
        sessionStorage.removeItem('blog_write_pw')
        setSaveStage('error')
        setSaveMsg(j.error || '비밀번호가 일치하지 않습니다.')
        return
      }
      if (!res.ok || !j.ok) {
        setSaveStage('error')
        setSaveMsg(j.error || `배포 실패 (HTTP ${res.status})`)
        return
      }

      sessionStorage.setItem('blog_write_pw', password)
      setSaveStage('done')
      const tail =
        j.vercel_url
          ? `→ ${j.vercel_url}`
          : (j.steps as string[] | undefined)?.[((j.steps as string[]).length || 1) - 1] || '완료'
      setSaveMsg(`✓ ${tail}`)

      // 저장된 텍스트가 새로운 baseline이 되도록 reload (서버 HTML도 새로 받기)
      setTimeout(() => {
        location.reload()
      }, 1500)
    } catch (e) {
      setSaveStage('error')
      setSaveMsg(`네트워크 오류: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [saveStage, meta.slug, lang, text])

  // 수정포인트 accept/reject.
  // React 19 controlled textarea + execCommand 조합은 onChange 체인이 불안정 →
  // 단일 진실 공급원은 React state. setText 를 직접 호출하고, 가능하면 native input
  // event 도 디스패치해서 native undo 스택에도 등록한다.
  const applyEdit = useCallback(
    (point: EditPoint, action: 'accept' | 'reject') => {
      const ta = textareaRef.current
      if (!ta) return
      const replacement = action === 'accept' ? point.revised : point.original
      const next = text.slice(0, point.start) + replacement + text.slice(point.end)

      // 1) React state 즉시 갱신 (save 시 전송될 진짜 본문)
      setText(next)

      // 2) cursor 복원 (다음 render 후)
      const cursor = point.start + replacement.length
      requestAnimationFrame(() => {
        ta.focus()
        try {
          ta.setSelectionRange(cursor, cursor)
        } catch {
          /* selection 실패 무시 */
        }
      })
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
      ta.setSelectionRange(target.start + 1, target.start + 1)
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

  const onTextareaScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      const st = e.currentTarget.scrollTop
      if (preRef.current) {
        preRef.current.style.transform = `translateY(${-st}px)`
      }
    },
    [],
  )

  useEffect(() => {
    if (mode !== 'raw') return
    const ta = textareaRef.current
    if (!ta || !preRef.current) return
    preRef.current.style.transform = `translateY(${-ta.scrollTop}px)`
  }, [text, mode])

  // rendered HTML 안의 hash anchor (footnote ref ↔ backref) 클릭 시 부드럽게 스크롤.
  // dangerouslySetInnerHTML 로 박힌 plain <a href="#..."> 들이 Next.js SPA 환경에서
  // 가끔 기본 jump가 안 먹는 경우가 있어 명시적으로 scrollIntoView 처리.
  useEffect(() => {
    const container = proseRef.current
    if (!container) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!anchor || !container.contains(anchor)) return
      const href = anchor.getAttribute('href')
      if (!href || href.length < 2) return
      const id = decodeURIComponent(href.slice(1))
      const el = document.getElementById(id)
      if (!el) return
      e.preventDefault()
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // URL hash 도 갱신 → :target 스타일이 발화 + 새로고침/공유 시 위치 보존
      history.replaceState(null, '', `#${id}`)
    }
    container.addEventListener('click', onClick)
    return () => container.removeEventListener('click', onClick)
  }, [renderedHtml, mode, isDev])

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.7rem',
    fontSize: '0.72rem',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--text-dim)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'var(--font-jb-mono, monospace)',
  })

  const ghostBtn: React.CSSProperties = {
    fontFamily: 'var(--font-jb-mono, monospace)',
    fontSize: '0.7rem',
    letterSpacing: '0.04em',
    padding: '0.3rem 0.7rem',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    background: 'transparent',
    color: 'var(--text-dim)',
    cursor: 'pointer',
  }

  const copyLabel =
    copyStatus === 'copied' ? '✓ 복사됨' : copyStatus === 'error' ? '✕ 복사 실패' : '⧉ md 복사'

  return (
    <article className="md-editor">
      <Link href="/blog" className="nav-link" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        ← --blog
      </Link>

      <header style={{ marginBottom: '2rem' }}>
        <h1
          className="font-serif"
          style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 300,
            color: 'var(--text-bright)',
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            marginBottom: '1rem',
          }}
        >
          {activeTitle}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{meta.date}</span>
          {meta.categories.map(c => (
            <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className="pill">{c}</Link>
          ))}
          {meta.tags.map(t => (
            <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="tag">{t}</Link>
          ))}
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          paddingBottom: '0.8rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button onClick={() => setLang('ko')} style={toggleBtn(lang === 'ko')}>KO</button>
        <button
          onClick={() => hasEn && setLang('en')}
          disabled={!hasEn}
          style={{ ...toggleBtn(lang === 'en'), opacity: hasEn ? 1 : 0.35, cursor: hasEn ? 'pointer' : 'not-allowed' }}
          title={hasEn ? 'English' : '영어 버전 없음'}
        >
          EN
        </button>

        <span style={{ width: '1px', height: '1.2rem', background: 'var(--border)', margin: '0 0.3rem' }} />

        {isDev && (
          <>
            <button onClick={() => setMode('rendered')} style={toggleBtn(mode === 'rendered')}>rendered</button>
            <button onClick={() => setMode('raw')} style={toggleBtn(mode === 'raw')}>raw</button>
          </>
        )}

        <span style={{ flex: 1 }} />

        {dirty && (
          <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--accent)' }}>
            ● modified
          </span>
        )}
        {editPoints.length > 0 && mode === 'raw' && (
          <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--accent)' }}>
            수정포인트 {editPoints.length}
          </span>
        )}
        <button
          type="button"
          onClick={onCopy}
          style={{
            ...ghostBtn,
            color: copyStatus === 'copied' ? 'var(--accent)' : ghostBtn.color,
            borderColor: copyStatus === 'copied' ? 'var(--accent)' : 'var(--border)',
          }}
          aria-label="현재 내용 클립보드 복사"
        >
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={onDownload}
          style={ghostBtn}
          aria-label="현재 내용 .md로 다운로드"
        >
          ↓ md 다운로드
        </button>
        {dirty && (
          <button
            type="button"
            onClick={onReset}
            style={{ ...ghostBtn, color: 'var(--text-dim)' }}
            aria-label="원본으로 되돌리기"
            title="편집 내용을 버리고 원본으로 되돌립니다"
          >
            ↺ 되돌리기
          </button>
        )}
        {isDev && (
          <button
            type="button"
            onClick={onSaveAndDeploy}
            disabled={saveStage === 'saving' || saveStage === 'deploying'}
            style={{
              ...ghostBtn,
              color:
                saveStage === 'done'
                  ? 'var(--accent)'
                  : saveStage === 'error'
                    ? '#ff6b6b'
                    : ghostBtn.color,
              borderColor:
                saveStage === 'done'
                  ? 'var(--accent)'
                  : saveStage === 'error'
                    ? '#ff6b6b'
                    : 'var(--border)',
              cursor:
                saveStage === 'saving' || saveStage === 'deploying' ? 'wait' : 'pointer',
            }}
            aria-label="파일 저장 후 vercel 프로덕션 배포"
            title="현재 편집 내용을 .md 파일에 저장하고 git commit + push + vercel --prod로 배포합니다 (1~3분 소요). 로컬 dev에서만 동작."
          >
            {saveStage === 'saving' && '⏳ 저장 중...'}
            {saveStage === 'deploying' && '🚀 배포 중...'}
            {saveStage === 'done' && '✓ 배포됨'}
            {saveStage === 'error' && '✕ 실패'}
            {saveStage === 'idle' && '💾 저장 & 배포'}
          </button>
        )}
      </div>

      {isDev && saveMsg && (
        <div
          className="font-mono"
          style={{
            fontSize: '0.7rem',
            color:
              saveStage === 'done'
                ? 'var(--accent)'
                : saveStage === 'error'
                  ? '#ff6b6b'
                  : 'var(--text-dim)',
            marginTop: '-0.8rem',
            marginBottom: '1rem',
            padding: '0.5rem 0.7rem',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            background: 'var(--bg)',
            wordBreak: 'break-all',
          }}
        >
          {saveMsg}
        </div>
      )}

      {!isDev || mode === 'rendered' ? (
        <div ref={proseRef} className="prose-wrap">
          <div className="prose" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        </div>
      ) : (
        <>
          <p
            className="font-mono"
            style={{
              fontSize: '0.68rem',
              color: 'var(--text-dim)',
              marginBottom: '0.6rem',
            }}
          >
            <code style={{ background: 'var(--surface, transparent)', padding: '0 0.3em' }}>{'{원문} ⟶ 수정 ,,,'}</code>{' '}
            토막은 수정포인트 — 커서를 그 안에 두고{' '}
            <strong style={{ color: 'var(--accent)' }}>Tab</strong> 으로 수정안 반영,{' '}
            <strong style={{ color: 'var(--accent)' }}>Backspace/Del</strong> 로 원문 유지.{' '}
            <strong style={{ color: 'var(--accent)' }}>Shift+↓/↑</strong> 로 다음/이전 포인트 이동. Cmd/Ctrl+Z 로 되돌릴 수 있다.
          </p>
          <div
            style={{
              position: 'relative',
              height: '70vh',
              border: `1px solid ${editorFocused ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '4px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              transition: 'border-color 0.12s',
              background: 'var(--bg)',
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
        </>
      )}
    </article>
  )
}
