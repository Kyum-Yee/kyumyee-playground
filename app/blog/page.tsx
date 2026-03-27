import { getMDPosts, getAllBlogTags, getAllBlogCategories } from '@/lib/blog'
import BlogCard from '@/components/BlogCard'
import TagFilter from '@/components/TagFilter'

interface Props {
  searchParams: Promise<{ tag?: string; category?: string }>
}

export default async function BlogPage({ searchParams }: Props) {
  const { tag, category } = await searchParams
  const posts = getMDPosts(tag, category)
  const tags = getAllBlogTags()
  const categories = getAllBlogCategories()

  return (
    <div>
      <div className="section-head">01/ BLOG</div>
      <TagFilter tags={tags} categories={categories} basePath="/blog" />
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {posts.map(p => <BlogCard key={p.slug} post={p} />)}
        {posts.length === 0 && (
          <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>글이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
