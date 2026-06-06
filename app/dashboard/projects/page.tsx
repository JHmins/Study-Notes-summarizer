import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Note } from '@/types'
import ProjectsClient from './projects-client'
import type { User } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/utils/auth'

export default async function ProjectsPage() {
  try {
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

    const [projectsResult, notesResult, noteCategoriesResult, categoriesResult] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('notes')
        .select('id, title, created_at, category_id, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('note_categories').select('note_id, category_id'),
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    const projects = projectsResult.data ?? []
    const notesRaw = notesResult.data ?? []
    const noteCategories = noteCategoriesResult.data ?? []
    const notes: Note[] = notesRaw.map((n: Record<string, unknown> & { id: string; category_id?: string | null }) => {
      const ids = noteCategories.filter((nc: { note_id: string }) => nc.note_id === n.id).map((nc: { category_id: string }) => nc.category_id)
      return { ...n, category_ids: ids.length > 0 ? ids : (n.category_id ? [n.category_id] : []) } as Note
    })
    const categories = categoriesResult.data ?? []
    const userIsAdmin = isAdmin(user.email)

    return (
      <ProjectsClient
        initialProjects={projects}
        initialNotes={notes}
        initialCategories={categories}
        user={user as User}
        isAdmin={userIsAdmin}
      />
    )
  } catch (err) {
    console.error('Projects page error:', err)
    throw err instanceof Error ? err : new Error('프로젝트 페이지를 불러오는 중 오류가 났습니다.')
  }
}
