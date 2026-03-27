'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  tags: string[]
  categories: string[]
  basePath: string
}

function TagFilterInner({ tags, categories, basePath }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTag = searchParams.get('tag') ?? ''
  const activeCategory = searchParams.get('category') ?? ''

  function navigate(tag: string, category: string) {
    const params = new URLSearchParams()
    if (tag) params.set('tag', tag)
    if (category) params.set('category', category)
    const qs = params.toString()
    router.push(`${basePath}${qs ? `?${qs}` : ''}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          <button
            onClick={() => navigate('', '')}
            className={`pill${!activeCategory && !activeTag ? ' pill-active' : ''}`}
          >
            ALL
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => navigate(activeTag, activeCategory === c ? '' : c)}
              className={`pill${activeCategory === c ? ' pill-active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {tags.map(t => (
            <button
              key={t}
              onClick={() => navigate(activeTag === t ? '' : t, activeCategory)}
              className={`tag${activeTag === t ? ' tag-active' : ''}`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TagFilter(props: Props) {
  return (
    <Suspense fallback={null}>
      <TagFilterInner {...props} />
    </Suspense>
  )
}
