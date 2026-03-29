import type { Metadata } from 'next'
import { JetBrains_Mono, Newsreader } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const jbMono = JetBrains_Mono({
  variable: '--font-jb-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
})

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'kyumyee playground',
  description: '블로그, 프로젝트, MCP 도구 모음',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${jbMono.variable} ${newsreader.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <header style={{ borderBottom: '1px solid var(--border)' }}>
          <nav className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-mono text-sm tracking-tight" style={{ color: 'var(--text-bright)' }}>
              <span className="cursor">kyumyee_</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/blog" className="nav-link">--blog</Link>
              <Link href="/playground" className="nav-link">--playground</Link>
              <Link href="/mcp" className="nav-link">--mcp</Link>
              <Link href="/library" className="nav-link">--library</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
          {children}
        </main>
        <footer style={{ borderTop: '1px solid var(--border)' }}>
          <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
            <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
              kyumyee playground
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
              {new Date().getFullYear()}
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
