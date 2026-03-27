import { notFound } from 'next/navigation'
import { getPost, getMDPosts } from '@/lib/blog'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getMDPosts().map(p => ({ slug: p.slug }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const { meta, html } = post

  return (
    <article>
      <div className="mb-6">
        <Link href="/blog" className="text-sm text-blue-600 hover:underline">← 블로그 목록</Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">{meta.title}</h1>
        <div className="text-sm text-gray-500 flex gap-3 flex-wrap">
          <span>{meta.date}</span>
          {meta.categories.map(c => (
            <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className="bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200">{c}</Link>
          ))}
          {meta.tags.map(t => (
            <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100">#{t}</Link>
          ))}
        </div>
      </div>
      <div
        className="prose prose-gray max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  )
}
