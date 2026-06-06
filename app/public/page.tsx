import PublicDashboardClient from './public-dashboard-client'
import {
  getPublicAuthors,
  getPublicCategories,
  getPublicLinks,
  getPublicNotes,
  getPublicProjects,
} from '@/lib/public-notes'

export default async function PublicNotesPage() {
  const [authors, notes, links, projects] = await Promise.all([
    getPublicAuthors(),
    getPublicNotes(),
    getPublicLinks(),
    getPublicProjects(),
  ])
  const categories = await getPublicCategories(notes)
  const authorLabel =
    authors.length > 0
      ? authors.map((a) => a.email).filter(Boolean).join(', ')
      : '관리자'

  return (
    <PublicDashboardClient
      notes={notes}
      categories={categories}
      authorLabel={authorLabel}
      linksCount={links.length}
      projectsCount={projects.length}
    />
  )
}
