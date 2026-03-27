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
    <div className="space-y-2">
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('', '')}
            className={`px-3 py-1 rounded-full text-sm border ${!activeCategory && !activeTag ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:border-gray-500'}`}
          >
            전체
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => navigate(activeTag, activeCategory === c ? '' : c)}
              className={`px-3 py-1 rounded-full text-sm border ${activeCategory === c ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:border-gray-500'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(t => (
            <button
              key={t}
              onClick={() => navigate(activeTag === t ? '' : t, activeCategory)}
              className={`px-2 py-0.5 rounded text-sm ${activeTag === t ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
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
