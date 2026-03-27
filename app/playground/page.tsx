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
      <h1 className="text-2xl font-bold mb-6">Playground</h1>
      <TagFilter tags={tags} categories={categories} basePath="/playground" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {projects.map(p => <ProjectCard key={p.slug} project={p} />)}
        {projects.length === 0 && <p className="text-gray-500">프로젝트가 없습니다.</p>}
      </div>
    </div>
  )
}
