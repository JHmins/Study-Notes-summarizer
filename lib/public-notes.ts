import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAILS } from '@/lib/utils/constants'
import type { Note } from '@/types'

interface PublicAuthor {
  id: string
  email: string | null
}

export async function getPublicAuthors(): Promise<PublicAuthor[]> {
  if (ADMIN_EMAILS.length === 0) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, email')
    .in('email', ADMIN_EMAILS)

  return (data ?? []) as PublicAuthor[]
}

export async function getPublicNotes(): Promise<Note[]> {
  const authors = await getPublicAuthors()
  const authorIds = authors.map((a) => a.id)
  if (authorIds.length === 0) return []

  const admin = createAdminClient()
  const { data: notesRaw } = await admin
    .from('notes')
    .select('*')
    .in('user_id', authorIds)
    .eq('is_public', true)
    .eq('status', 'completed')
    .not('summary', 'is', null)
    .order('created_at', { ascending: false })

  const notes = (notesRaw ?? []) as Note[]
  if (notes.length === 0) return []

  const noteIds = notes.map((n) => n.id)
  const { data: noteCategories } = await admin
    .from('note_categories')
    .select('note_id, category_id')
    .in('note_id', noteIds)

  return notes.map((n) => {
    const ids = (noteCategories ?? [])
      .filter((nc) => nc.note_id === n.id)
      .map((nc) => nc.category_id)
    return {
      ...n,
      category_ids: ids.length > 0 ? ids : (n.category_id ? [n.category_id] : []),
    }
  })
}
