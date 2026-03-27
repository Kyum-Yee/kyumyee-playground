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
      <h1 className="text-2xl font-bold mb-6">블로그</h1>
      <TagFilter tags={tags} categories={categories} basePath="/blog" />
      <div className="mt-6 space-y-4">
        {posts.map(p => <BlogCard key={p.slug} post={p} />)}
        {posts.length === 0 && <p className="text-gray-500">글이 없습니다.</p>}
      </div>
    </div>
  )
}
