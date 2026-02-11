import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Note } from '@/types'
import ProjectDetailClient from './project-detail-client'
import type { User } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/utils/auth'

interface PageProps {
  params: { id: string }
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const projectId = params.id
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (!user.is_anonymous) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', user.id)
      .single()
    if (profile && profile.approved !== true) {
      await supabase.auth.signOut()
      redirect('/auth/login?message=pending')
    }
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    redirect('/dashboard/projects')
  }

  if (project.user_id !== user.id) {
    redirect('/dashboard/projects')
  }

  const [
    { data: projectFiles },
    notesResult,
    noteCategoriesResult,
    categoriesResult,
    { data: linkedNotes },
  ] = await Promise.all([
    supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('notes')
      .select('id, title, created_at, category_id, status, project_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('note_categories').select('note_id, category_id'),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('notes')
      .select('id, title, created_at, status')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ])

  const noteCategories = noteCategoriesResult.data ?? []
  const notesRaw = notesResult.data ?? []
  const notes: Note[] = notesRaw.map((n: Record<string, unknown> & { id: string; category_id?: string | null }) => {
    const ids = noteCategories.filter((nc: { note_id: string }) => nc.note_id === n.id).map((nc: { category_id: string }) => nc.category_id)
    return { ...n, category_ids: ids.length > 0 ? ids : (n.category_id ? [n.category_id] : []) } as Note
  })
  const categories = categoriesResult.data ?? []
  const linkedNotesList = linkedNotes ?? []
  const userIsAdmin = isAdmin(user.email)

  return (
    <ProjectDetailClient
      project={project}
      initialFiles={projectFiles ?? []}
      initialLinkedNotes={linkedNotesList}
      initialNotes={notes}
      initialCategories={categories}
      user={user as User}
        isAdmin={userIsAdmin}
    />
  )
}
