import Link from 'next/link'
import { getMDPosts } from '@/lib/blog'
import { getProjects } from '@/lib/projects'
import { getMCPs } from '@/lib/mcp-registry'

export default function Home() {
  const posts = getMDPosts().slice(0, 3)
  const projects = getProjects().slice(0, 3)
  const mcps = getMCPs().slice(0, 3)

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl font-bold mb-2">kyumyee playground</h1>
        <p className="text-gray-600">블로그, 프로젝트, MCP 도구 모음</p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">최근 블로그</h2>
          <Link href="/blog" className="text-sm text-blue-600 hover:underline">전체 보기 →</Link>
        </div>
        <ul className="space-y-2">
          {posts.map(p => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="hover:underline font-medium">{p.title}</Link>
              <span className="text-sm text-gray-500 ml-2">{p.date}</span>
            </li>
          ))}
          {posts.length === 0 && <li className="text-gray-500 text-sm">글이 없습니다.</li>}
        </ul>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">프로젝트</h2>
          <Link href="/playground" className="text-sm text-blue-600 hover:underline">전체 보기 →</Link>
        </div>
        <ul className="space-y-2">
          {projects.map(p => (
            <li key={p.slug}>
              <Link href={`/playground/${p.slug}`} className="hover:underline font-medium">{p.title}</Link>
              <span className="text-sm text-gray-500 ml-2">{p.type === 'ai' ? 'AI' : '데모'}</span>
            </li>
          ))}
          {projects.length === 0 && <li className="text-gray-500 text-sm">프로젝트가 없습니다.</li>}
        </ul>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">MCP 갤러리</h2>
          <Link href="/mcp" className="text-sm text-blue-600 hover:underline">전체 보기 →</Link>
        </div>
        <ul className="space-y-2">
          {mcps.map(m => (
            <li key={m.slug}>
              <Link href={`/mcp/${m.slug}`} className="hover:underline font-medium">{m.title}</Link>
              <span className="text-sm text-gray-500 ml-2">{m.description.slice(0, 40)}</span>
            </li>
          ))}
          {mcps.length === 0 && <li className="text-gray-500 text-sm">MCP가 없습니다.</li>}
        </ul>
      </section>
    </div>
  )
}
