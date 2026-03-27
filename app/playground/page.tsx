import { getProjects, getAllProjectTags, getAllProjectCategories } from '@/lib/projects'
import ProjectCard from '@/components/ProjectCard'
import TagFilter from '@/components/TagFilter'

interface Props {
  searchParams: Promise<{ tag?: string; category?: string }>
}

export default async function PlaygroundPage({ searchParams }: Props) {
  const { tag, category } = await searchParams
  const projects = getProjects(tag, category)
  const tags = getAllProjectTags()
  const categories = getAllProjectCategories()

  return (
    <div>
      <div className="section-head">02/ PLAYGROUND</div>
      <TagFilter tags={tags} categories={categories} basePath="/playground" />
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {projects.map(p => <ProjectCard key={p.slug} project={p} />)}
        {projects.length === 0 && (
          <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>프로젝트가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
