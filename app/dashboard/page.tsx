import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Note } from '@/types'
import type { User } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/utils/auth'
import DashboardClient from './dashboard-client'

interface PageProps {
  searchParams: Promise<{ date?: string; category?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { date: dateParam, category: categoryParam } = await searchParams
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

    const userId = user.id
    const [notesResult, categoriesResult, noteCategoriesResult, linksResult, projectsResult] = await Promise.allSettled([
      supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', userId).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('note_categories').select('note_id, category_id'),
      supabase.from('study_links').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])

    const notesRaw = notesResult.status === 'fulfilled' ? (notesResult.value.data ?? []) : []
    const noteCategories = noteCategoriesResult.status === 'fulfilled' ? (noteCategoriesResult.value.data ?? []) : []
    const notes: Note[] = notesRaw.map((n: Record<string, unknown> & { id: string; category_id?: string | null }) => {
      const ids = noteCategories.filter((nc: { note_id: string }) => nc.note_id === n.id).map((nc: { category_id: string }) => nc.category_id)
      return { ...n, category_ids: ids.length > 0 ? ids : (n.category_id ? [n.category_id] : []) } as Note
    })
    const categories = categoriesResult.status === 'fulfilled' ? (categoriesResult.value.data ?? []) : []
    const linksCount = linksResult.status === 'fulfilled' && linksResult.value.count != null ? linksResult.value.count : 0
    const projectsCount = projectsResult.status === 'fulfilled' && projectsResult.value.count != null ? projectsResult.value.count : 0

    const userIsAdmin = isAdmin(user.email)

    return (
      <DashboardClient
        initialNotes={notes}
        initialCategories={categories}
        initialLinksCount={linksCount}
        initialProjectsCount={projectsCount}
        user={user as User}
        isAdmin={userIsAdmin}
        initialDate={dateParam ?? undefined}
        initialCategoryId={categoryParam ?? undefined}
      />
    )
  } catch (err) {
    console.error('Dashboard page error:', err)
    throw err instanceof Error ? err : new Error('대시보드를 불러오는 중 오류가 났습니다.')
  }
}
