'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────
interface ExtractedFile {
  path: string
  size: number
  isDirectory: boolean
  method: string
  data?: string
}

interface ApiResult {
  success: true
  files: ExtractedFile[]
  archiveSize: number
  isSplit: boolean
  isSolid: boolean
  totalFiles: number
  totalDirs: number
  totalSize: number
}

type State =
  | { phase: 'idle' }
  | { phase: 'dragging' }
  | { phase: 'loading'; name: string; size: number }
  | { phase: 'done'; result: ApiResult; name: string }
  | { phase: 'error'; message: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function downloadBase64(filename: string, b64: string) {
  const parts = filename.split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  const mimeMap: Record<string, string> = {
    txt: 'text/plain', md: 'text/markdown', json: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    pdf: 'application/pdf', zip: 'application/zip',
  }
  const mime = mimeMap[ext] ?? 'application/octet-stream'
  const link = document.createElement('a')
  link.href = `data:${mime};base64,${b64}`
  link.download = parts[parts.length - 1] !== '' ? parts[parts.length - 1] : filename
  link.click()
}

// Build a tree from flat file list
interface TreeNode {
  name: string
  fullPath: string
  isDirectory: boolean
  size: number
  method: string
  data?: string
  children: TreeNode[]
}

function buildTree(files: ExtractedFile[]): TreeNode[] {
  const root: TreeNode[] = []
  const dirMap = new Map<string, TreeNode>()

  const getOrCreateDir = (pathParts: string[], upTo: number): TreeNode[] => {
    if (upTo === 0) return root
    const key = pathParts.slice(0, upTo).join('/')
    if (dirMap.has(key)) return dirMap.get(key)!.children
    const parent = getOrCreateDir(pathParts, upTo - 1)
    const node: TreeNode = {
      name: pathParts[upTo - 1],
      fullPath: key,
      isDirectory: true,
      size: 0,
      method: '-',
      children: [],
    }
    parent.push(node)
    dirMap.set(key, node)
    return node.children
  }

  for (const f of files) {
    const parts = f.path.split('/')
    if (f.isDirectory) {
      getOrCreateDir(parts, parts.length)
      continue
    }
    const parentChildren = getOrCreateDir(parts, parts.length - 1)
    parentChildren.push({
      name: parts[parts.length - 1],
      fullPath: f.path,
      isDirectory: false,
      size: f.size,
      method: f.method,
      data: f.data,
      children: [],
    })
  }

  // Sort: dirs first, then files alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach(n => n.children.length && sortNodes(n.children))
  }
  sortNodes(root)
  return root
}

// ── FileTree component ───────────────────────────────────────────────────────
function FileNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)

  const indent = depth * 16

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            paddingLeft: indent,
            paddingTop: '0.3rem',
            paddingBottom: '0.3rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            letterSpacing: '0.02em',
            textAlign: 'left',
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-bright)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <span style={{ color: 'var(--accent)', width: '0.8em', flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
          <span style={{ color: 'var(--amber)' }}>◈</span>
          <span>{node.name}/</span>
        </button>
        {open && (
          <div>
            {node.children.map(child => (
              <FileNode key={child.fullPath} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        paddingLeft: indent,
        paddingTop: '0.25rem',
        paddingBottom: '0.25rem',
        borderBottom: '1px solid transparent',
      }}
    >
      <span style={{ width: '0.8em', flexShrink: 0, color: 'transparent' }}>·</span>
      <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>─</span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.78rem',
        color: 'var(--text)',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{node.name}</span>

      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color: 'var(--text-dim)',
        flexShrink: 0,
        marginLeft: 'auto',
        paddingLeft: '1rem',
      }}>{fmtBytes(node.size)}</span>

      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.6rem',
        color: node.method === 'deflate' ? 'var(--accent)' : 'var(--text-dim)',
        border: `1px solid ${node.method === 'deflate' ? 'var(--accent-dim)' : 'var(--border)'}`,
        padding: '0.1em 0.4em',
        flexShrink: 0,
        letterSpacing: '0.06em',
        minWidth: '4.5rem',
        textAlign: 'center',
      }}>{node.method}</span>

      {node.data ? (
        <button
          onClick={() => downloadBase64(node.name, node.data!)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: 'var(--text-dim)',
            background: 'none',
            border: '1px solid var(--border)',
            padding: '0.1em 0.5em',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.12s',
            letterSpacing: '0.06em',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-bright)'
            e.currentTarget.style.borderColor = 'var(--border-hi)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-dim)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >↓ save</button>
      ) : (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          color: 'var(--text-dim)',
          opacity: 0.4,
          flexShrink: 0,
          minWidth: '3rem',
          textAlign: 'center',
        }}>—</span>
      )}
    </div>
  )
}

// ── Scan animation ─────────────────────────────────────────────────────────
const scanLines = [
  'reading archive header…',
  'parsing EGG magic 0x41474745…',
  'scanning file entries…',
  'decompressing blocks…',
  'verifying CRC32 checksums…',
  'building file tree…',
]

function ScanLog({ name, size }: { name: string; size: number }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: '2px solid var(--accent)',
      padding: '1.25rem',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.78rem',
      lineHeight: 2,
    }}>
      <div style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
        <span style={{ color: 'var(--accent)' }}>$</span> egg-extract {name} <span style={{ opacity: 0.5 }}>({fmtBytes(size)})</span>
      </div>
      {scanLines.map((line, i) => (
        <div
          key={i}
          style={{
            color: 'var(--text-dim)',
            animation: `fadeUp 0.3s ease both`,
            animationDelay: `${i * 200}ms`,
            opacity: 0,
          }}
        >
          <span style={{ color: 'var(--accent)', marginRight: '0.5rem' }}>›</span>
          {line}
        </div>
      ))}
      <div style={{
        color: 'var(--accent)',
        animation: 'fadeUp 0.3s ease both',
        animationDelay: `${scanLines.length * 200}ms`,
        opacity: 0,
      }}>
        <span className="cursor" />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EggExtractPage() {
  const [state, setState] = useState<State>({ phase: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const process = useCallback(async (file: File) => {
    setState({ phase: 'loading', name: file.name, size: file.size })

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/egg-extract', { method: 'POST', body: form })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Unknown error')
      setState({ phase: 'done', result: json as ApiResult, name: file.name })
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) process(file)
    else setState({ phase: 'idle' })
  }, [process])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) process(file)
  }, [process])

  const reset = () => {
    setState({ phase: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div>
        <Link href="/playground" className="nav-link" style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
          ← --playground
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-demo">demo</span>
          <span className="pill">파일 도구</span>
          <span className="pill">Python</span>
        </div>
        <h1 className="font-serif" style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
          fontWeight: 300,
          color: 'var(--text-bright)',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          marginBottom: '0.75rem',
        }}>
          egg<span style={{ color: 'var(--accent)' }}>_extract</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--text-dim)',
          lineHeight: 1.7,
          maxWidth: '52ch',
        }}>
          한국산 압축 포맷 <span style={{ color: 'var(--text)' }}>.egg</span> 아카이브를 브라우저에서 직접 열람 · 추출.
          {' '}<span style={{ color: 'var(--text)' }}>store</span> / <span style={{ color: 'var(--accent)' }}>deflate</span>{' '}
          지원 · 최대 300 MB · 파일 데이터는 서버에 저장되지 않음.
        </p>
      </div>

      {/* Drop zone (idle / dragging) */}
      {(state.phase === 'idle' || state.phase === 'dragging') && (
        <div
          onDragOver={e => { e.preventDefault(); setState({ phase: 'dragging' }) }}
          onDragLeave={() => setState({ phase: 'idle' })}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            position: 'relative',
            border: `1px dashed ${state.phase === 'dragging' ? 'var(--accent)' : 'var(--border-hi)'}`,
            background: state.phase === 'dragging' ? 'var(--accent-dim)' : 'var(--surface)',
            padding: '4rem 2rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            transition: 'all 0.15s ease',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Hex grid bg */}
          <svg
            aria-hidden
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              opacity: state.phase === 'dragging' ? 0.12 : 0.04,
              transition: 'opacity 0.15s',
              pointerEvents: 'none',
            }}
          >
            <defs>
              <pattern id="hex" x="0" y="0" width="28" height="24" patternUnits="userSpaceOnUse">
                <polygon
                  points="14,2 26,8 26,16 14,22 2,16 2,8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex)" color="var(--accent)" />
          </svg>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '2.5rem',
            color: state.phase === 'dragging' ? 'var(--accent)' : 'var(--border-hi)',
            transition: 'color 0.15s',
            lineHeight: 1,
          }}>⬡</div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            color: state.phase === 'dragging' ? 'var(--accent)' : 'var(--text-dim)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            transition: 'color 0.15s',
          }}>
            {state.phase === 'dragging' ? 'drop to extract' : 'drop .egg file or click to browse'}
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--text-dim)',
            opacity: 0.6,
          }}>max 300 MB</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".egg"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />

      {/* Loading */}
      {state.phase === 'loading' && (
        <ScanLog name={state.name} size={state.size} />
      )}

      {/* Error */}
      {state.phase === 'error' && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: '2px solid oklch(0.65 0.18 25)',
          padding: '1.25rem',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'oklch(0.65 0.18 25)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}>error</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6 }}>
            {state.message}
          </div>
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              background: 'none',
              border: '1px solid var(--border)',
              padding: '0.3em 0.9em',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-bright)'; e.currentTarget.style.borderColor = 'var(--border-hi)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >try another file</button>
        </div>
      )}

      {/* Results */}
      {state.phase === 'done' && (() => {
        const { result, name } = state
        const tree = buildTree(result.files)
        const ratio = result.totalSize > 0
          ? ((1 - result.archiveSize / result.totalSize) * 100).toFixed(1)
          : '0.0'

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeUp 0.4s ease both' }}>

            {/* Stats bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '1px',
              background: 'var(--border)',
              border: '1px solid var(--border)',
            }}>
              {[
                { label: 'archive', value: fmtBytes(result.archiveSize) },
                { label: 'extracted', value: fmtBytes(result.totalSize) },
                { label: 'files', value: String(result.totalFiles) },
                { label: 'dirs', value: String(result.totalDirs) },
                { label: 'ratio', value: `${ratio}%` },
                { label: 'solid', value: result.isSolid ? 'yes' : 'no' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: 'var(--surface)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--text-bright)', letterSpacing: '-0.01em' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* File tree */}
            <div>
              <div className="section-head">01/ FILE TREE — {name}</div>

              {/* Header row */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border)',
                marginBottom: '0.25rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                <span style={{ flex: 1 }}>name</span>
                <span style={{ marginLeft: 'auto', paddingLeft: '1rem' }}>size</span>
                <span style={{ minWidth: '4.5rem', textAlign: 'center' }}>method</span>
                <span style={{ minWidth: '3rem', textAlign: 'center' }}>dl</span>
              </div>

              <div style={{ borderBottom: '1px solid var(--border)' }}>
                {tree.map(node => <FileNode key={node.fullPath || node.name} node={node} />)}
                {tree.length === 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', padding: '1rem 0' }}>
                    empty archive
                  </div>
                )}
              </div>

              <div style={{
                marginTop: '0.5rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-dim)',
                opacity: 0.7,
              }}>
                ↓ save 표시된 파일은 브라우저에서 직접 다운로드 (≤ 512 KB). 큰 파일은 원본 .egg 아카이브에서 직접 추출하세요.
              </div>
            </div>

            {/* Reset */}
            <div>
              <button
                onClick={reset}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  background: 'none',
                  border: '1px solid var(--border)',
                  padding: '0.4em 1.1em',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent-dim)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >↺ extract another</button>
            </div>
          </div>
        )
      })()}

      {/* Info footer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}>
        <div className="section-head">02/ ABOUT</div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.8, maxWidth: '60ch' }}>
          EGG는 ESTsoft가 개발한 한국산 압축 포맷. ZIP 대비 높은 한글 파일명 호환성을 제공한다.
          이 데모는 <span style={{ color: 'var(--text)' }}>egg_extract.py</span>를 TypeScript로 포팅한 것으로,
          순수 바이너리 파싱 · CRC32 검증 · deflate 압축 해제를 서버사이드에서 처리한다.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <a
            href="https://github.com/Kyum-Yee/kyumyee-playground"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >source →</a>
        </div>
      </div>
    </div>
  )
}
