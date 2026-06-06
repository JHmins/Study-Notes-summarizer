import PublicProjectsClient from './public-projects-client'
import { getPublicAuthors, getPublicCategories, getPublicNotes, getPublicProjects } from '@/lib/public-notes'

export default async function PublicProjectsPage() {
  const [authors, notes, projects] = await Promise.all([
    getPublicAuthors(),
    getPublicNotes(),
    getPublicProjects(),
  ])
  const categories = await getPublicCategories(notes)
  const authorLabel = authors.length > 0 ? authors.map((a) => a.email).filter(Boolean).join(', ') : '관리자'

  return <PublicProjectsClient notes={notes} categories={categories} projects={projects} authorLabel={authorLabel} />
}
