import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAILS } from '@/lib/utils/constants'
import type { Category, Note } from '@/types'

interface PublicAuthor {
  id: string
  email: string | null
}

export async function getPublicAuthors(): Promise<PublicAuthor[]> {
  if (ADMIN_EMAILS.length === 0) return []
  const adminEmailSet = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase()))
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, email')
    .not('email', 'is', null)

  if (error) {
    console.error('Public authors query error:', error)
    return []
  }

  const matched = ((data ?? []) as PublicAuthor[]).filter((p) => {
    if (!p.email) return false
    return adminEmailSet.has(p.email.toLowerCase())
  })

  return matched
}

export async function getPublicNotes(): Promise<Note[]> {
  const authors = await getPublicAuthors()
  const authorIds = authors.map((a) => a.id)
  if (authorIds.length === 0) return []

  const admin = createAdminClient()
  const { data: notesRaw, error: notesError } = await admin
    .from('notes')
    .select('*')
    .in('user_id', authorIds)
    .eq('is_public', true)
    .eq('status', 'completed')
    .not('summary', 'is', null)
    .order('created_at', { ascending: false })

  if (notesError) {
    console.error('Public notes query error:', notesError)
    return []
  }

  const notes = (notesRaw ?? []) as Note[]
  if (notes.length === 0) return []

  const noteIds = notes.map((n) => n.id)
  const { data: noteCategories, error: categoriesError } = await admin
    .from('note_categories')
    .select('note_id, category_id')
    .in('note_id', noteIds)

  if (categoriesError) {
    console.error('Public note categories query error:', categoriesError)
  }

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

export async function getPublicCategories(notes: Note[]): Promise<Category[]> {
  const categoryIds = Array.from(
    new Set(
      notes.flatMap((n) => n.category_ids ?? (n.category_id ? [n.category_id] : []))
    )
  )
  if (categoryIds.length === 0) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('categories')
    .select('*')
    .in('id', categoryIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return (data ?? []) as Category[]
}
