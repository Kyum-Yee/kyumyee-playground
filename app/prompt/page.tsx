import Link from 'next/link'
import { getPromptList, PROMPT_CATEGORIES, type PromptCategory } from '@/lib/prompt'

export const metadata = {
  title: '--prompt | kyumyee',
  description: 'design · reference · prompt 모음',
}

interface Props {
  searchParams: Promise<{ category?: string }>
}

const CATEGORY_LABEL: Record<PromptCategory, string> = {
  design: 'design',
  reference: 'reference',
  prompt: 'prompt',
  rolePlay: 'rolePlay',
}

export default async function PromptListPage({ searchParams }: Props) {
  const { category } = await searchParams
  const items = getPromptList(category)
  const showWriteLink = !process.env.VERCEL && process.env.NODE_ENV !== 'production'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-head">04/ PROMPT</div>
        {showWriteLink && (
          <Link href="/prompt/write" className="nav-link" style={{ fontSize: '0.78rem' }}>+ 새 프롬</Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <Link
          href="/prompt"
          className={`pill${!category ? ' pill-active' : ''}`}
        >
          ALL
        </Link>
        {PROMPT_CATEGORIES.map(c => (
          <Link
            key={c}
            href={`/prompt?category=${c}`}
            className={`pill${category === c ? ' pill-active' : ''}`}
          >
            {CATEGORY_LABEL[c]}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map(item => (
          <div key={item.slug} className="card">
            <Link href={`/prompt/${item.slug}`}>
              <h2
                className="font-serif"
                style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.3 }}
              >
                {item.title}
              </h2>
            </Link>
            {item.summary && (
              <p
                className="font-mono"
                style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.35rem', lineHeight: 1.5 }}
              >
                {item.summary}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem', alignItems: 'center' }}>
              <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{item.date}</span>
              <Link href={`/prompt?category=${item.category}`} className="pill">{CATEGORY_LABEL[item.category]}</Link>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>항목이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
