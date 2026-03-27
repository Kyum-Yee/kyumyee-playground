import Link from 'next/link'
import type { BlogMeta } from '@/lib/content'

export default function BlogCard({ post }: { post: BlogMeta }) {
  return (
    <div className="card">
      <Link href={`/blog/${post.slug}`}>
        <h2
          className="font-serif"
          style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.3 }}
        >
          {post.title}
        </h2>
      </Link>
      {post.summary && (
        <p className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.35rem', lineHeight: 1.5 }}>
          {post.summary}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem', alignItems: 'center' }}>
        <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{post.date}</span>
        {post.categories.map(c => (
          <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} className="pill">
            {c}
          </Link>
        ))}
        {post.tags.map(t => (
          <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="tag">
            #{t}
          </Link>
        ))}
      </div>
    </div>
  )
}
