import { notFound } from 'next/navigation'
import {
  getPublicAuthorIds,
  getPublicAuthors,
  getPublicCategories,
  getPublicNotes,
} from '@/lib/public-notes'
import { createAdminClient } from '@/lib/supabase/admin'
import PublicProjectDetailClient from './public-project-detail-client'

interface PageProps {
  params: {
    id: string
  }
}

export default async function PublicProjectDetailPage({ params }: PageProps) {
  const [authorIds, authors, notes] = await Promise.all([
    getPublicAuthorIds(),
    getPublicAuthors(),
    getPublicNotes(),
  ])
  if (authorIds.length === 0) notFound()
  const categories = await getPublicCategories(notes)

  const admin = createAdminClient()
  const { data: project } = await admin
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()
  if (!project) notFound()
  if (!authorIds.includes(project.user_id)) notFound()

  const linkedNotes = notes
    .filter((n) => n.project_id === project.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const { data: files } = await admin
    .from('project_files')
    .select('id, title, file_size, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const authorLabel = authors.length > 0 ? authors.map((a) => a.email).filter(Boolean).join(', ') : '관리자'

  return (
    <PublicProjectDetailClient
      project={project}
      notes={notes}
      categories={categories}
      linkedNotes={linkedNotes}
      files={files ?? []}
      authorLabel={authorLabel}
    />
  )
}
