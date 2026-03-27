import { notFound } from 'next/navigation'
import { getProject, getProjects } from '@/lib/projects'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getProjects().map(p => ({ slug: p.slug }))
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const project = getProject(slug)
  if (!project) notFound()

  return (
    <div>
      <Link href="/playground" className="text-sm text-blue-600 hover:underline">← Playground</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">{project.title}</h1>
      <div className="flex gap-2 flex-wrap mb-4 text-sm">
        <span className="bg-gray-100 px-2 py-0.5 rounded">{project.type === 'ai' ? 'AI 프로젝트' : '데모 프로젝트'}</span>
        {project.categories.map(c => (
          <Link key={c} href={`/playground?category=${encodeURIComponent(c)}`} className="bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200">{c}</Link>
        ))}
        {project.tags.map(t => (
          <Link key={t} href={`/playground?tag=${encodeURIComponent(t)}`} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100">#{t}</Link>
        ))}
      </div>
      <p className="text-gray-700 mb-6">{project.description}</p>

      {/* AI 프로젝트: 프롬프트 + GitHub 링크 */}
      {project.type === 'ai' && (
        <div className="space-y-4">
          {project.github && (
            <a href={project.github} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700">
              GitHub →
            </a>
          )}
          {project.prompt && (
            <div>
              <h2 className="font-semibold mb-2">사용한 프롬프트</h2>
              <pre className="bg-gray-50 border rounded p-4 text-sm whitespace-pre-wrap overflow-x-auto">{project.prompt}</pre>
            </div>
          )}
        </div>
      )}

      {/* 비AI 프로젝트: 데모 iframe or 링크 */}
      {project.type === 'non-ai' && project.demo && (
        <div>
          <h2 className="font-semibold mb-2">데모</h2>
          <iframe
            src={project.demo}
            className="w-full h-96 border rounded"
            title={project.title}
          />
        </div>
      )}

      {project.github && project.type === 'non-ai' && (
        <div className="mt-4">
          <a href={project.github} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700">
            GitHub →
          </a>
        </div>
      )}
    </div>
  )
}
