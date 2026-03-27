import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'kyumyee playground',
  description: 'Blog, projects, and MCP tools by kyumyee',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <nav className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-6">
            <Link href="/" className="font-bold text-lg">kyumyee</Link>
            <Link href="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link>
            <Link href="/playground" className="text-gray-600 hover:text-gray-900">Playground</Link>
            <Link href="/mcp" className="text-gray-600 hover:text-gray-900">MCP</Link>
          </nav>
        </header>
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
          {children}
        </main>
        <footer className="border-t border-gray-200 text-center text-sm text-gray-500 py-4">
          kyumyee playground
        </footer>
      </body>
    </html>
  )
}
