import { notFound } from 'next/navigation'
import { getPost, getMDPosts } from '@/lib/blog'
import PostView from './PostView'

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

  return (
    <PostView
      meta={post.meta}
      metaEn={post.metaEn}
      bodyKo={post.bodyKo}
      bodyEn={post.bodyEn}
      htmlKo={post.htmlKo}
      htmlEn={post.htmlEn}
    />
  )
}
