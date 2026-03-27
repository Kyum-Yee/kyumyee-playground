import Link from 'next/link'
import type { BlogMeta } from '@/lib/content'

export default function BlogCard({ post }: { post: BlogMeta }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
      <Link href={`/blog/${post.slug}`}>
        <h2 className="font-semibold hover:underline">{post.title}</h2>
      </Link>
      {post.summary && <p className="text-sm text-gray-600 mt-1">{post.summary}</p>}
      <div className="flex gap-2 flex-wrap mt-2 text-xs text-gray-500">
        <span>{post.date}</span>
        {post.categories.map(c => (
          <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className="bg-gray-100 px-1.5 py-0.5 rounded">{c}</Link>
        ))}
        {post.tags.map(t => (
          <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="text-blue-600">#{t}</Link>
        ))}
      </div>
    </div>
  )
}
