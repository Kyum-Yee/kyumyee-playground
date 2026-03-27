import Link from 'next/link'
import type { ProjectMeta } from '@/lib/content'

export default function ProjectCard({ project }: { project: ProjectMeta }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors">
      <div className="flex items-start justify-between">
        <Link href={`/playground/${project.slug}`}>
          <h2 className="font-semibold hover:underline">{project.title}</h2>
        </Link>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2 shrink-0">
          {project.type === 'ai' ? 'AI' : '데모'}
        </span>
      </div>
      {project.description && <p className="text-sm text-gray-600 mt-1">{project.description}</p>}
      <div className="flex gap-2 flex-wrap mt-2 text-xs">
        {project.tags.map(t => (
          <Link key={t} href={`/playground?tag=${encodeURIComponent(t)}`} className="text-blue-600">#{t}</Link>
        ))}
      </div>
    </div>
  )
}
