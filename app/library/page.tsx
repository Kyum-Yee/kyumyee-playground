import { SUBJECTS } from '@/lib/expert-library'
import SubjectGrid from '@/components/SubjectGrid'

export const metadata = {
  title: '--library | kyumyee',
  description: '이과 25개 · 문과 42개 전문 분야 커리큘럼. 단계별 열람.',
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>
}) {
  const { q = '', cat = '전체' } = await searchParams

  return (
    <main style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <div className="section-head" style={{ marginBottom: '2rem' }}>
        [04] library
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-newsreader)',
            fontSize: '1.9rem',
            fontWeight: 300,
            color: 'var(--text-bright)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Expert Curriculum Library
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-jb-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            marginTop: '0.5rem',
          }}
        >
          {SUBJECTS.filter(s => s.category === '이과').length} sciences ·{' '}
          {SUBJECTS.filter(s => s.category === '문과').length} humanities · 5 stages each
        </p>
      </div>

      <SubjectGrid subjects={SUBJECTS} initialQ={q} initialCat={cat} />
    </main>
  )
}
