import PublicLinksClient from './public-links-client'
import {
  getPublicAuthors,
  getPublicCategories,
  getPublicLinkGroups,
  getPublicLinks,
  getPublicLinkSubgroups,
  getPublicNotes,
} from '@/lib/public-notes'

export default async function PublicLinksPage() {
  const [authors, notes, links, groups, subgroups] = await Promise.all([
    getPublicAuthors(),
    getPublicNotes(),
    getPublicLinks(),
    getPublicLinkGroups(),
    getPublicLinkSubgroups(),
  ])
  const categories = await getPublicCategories(notes)
  const authorLabel = authors.length > 0 ? authors.map((a) => a.email).filter(Boolean).join(', ') : '관리자'

  return (
    <PublicLinksClient
      notes={notes}
      categories={categories}
      links={links}
      groups={groups}
      subgroups={subgroups}
      authorLabel={authorLabel}
    />
  )
}
