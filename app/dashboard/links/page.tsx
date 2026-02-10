import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/utils/auth'
import type { User } from '@supabase/supabase-js'
import LinksClient from './links-client'

export default async function LinksPage() {
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
    const [linksResult, categoriesResult, notesResult, noteCategoriesResult, groupsResult, subgroupsResult] = await Promise.allSettled([
      supabase
        .from('study_links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('note_categories').select('note_id, category_id'),
      supabase
        .from('link_groups')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('link_subgroups')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    const links = linksResult.status === 'fulfilled' ? (linksResult.value.data ?? []) : []
    const categories = categoriesResult.status === 'fulfilled' ? (categoriesResult.value.data ?? []) : []
    const notesRaw = notesResult.status === 'fulfilled' ? (notesResult.value.data ?? []) : []
    const noteCategories = noteCategoriesResult.status === 'fulfilled' ? (noteCategoriesResult.value.data ?? []) : []
    const notes = notesRaw.map((n: { id: string; category_id?: string | null }) => {
      const ids = noteCategories.filter((nc: { note_id: string }) => nc.note_id === n.id).map((nc: { category_id: string }) => nc.category_id)
      return { ...n, category_ids: ids.length > 0 ? ids : (n.category_id ? [n.category_id] : []) }
    })
    const groups = groupsResult.status === 'fulfilled' ? (groupsResult.value.data ?? []) : []
    const subgroups = subgroupsResult.status === 'fulfilled' ? (subgroupsResult.value.data ?? []) : []

    if (linksResult.status === 'rejected') {
      console.error('Links fetch error:', linksResult.reason)
    }
    if (categoriesResult.status === 'rejected') {
      console.error('Categories fetch error:', categoriesResult.reason)
    }
    if (notesResult.status === 'rejected') {
      console.error('Notes fetch error:', notesResult.reason)
    }
    if (groupsResult.status === 'rejected') {
      console.error('Link groups fetch error:', groupsResult.reason)
    }
    if (subgroupsResult.status === 'rejected') {
      console.error('Link subgroups fetch error:', subgroupsResult.reason)
    }

    const userIsAdmin = isAdmin(user?.email)
    if (!user) {
      redirect('/auth/login')
    }
    return (
      <LinksClient
        initialLinks={links}
        initialCategories={categories}
        initialNotes={notes}
        initialGroups={groups}
        initialSubgroups={subgroups}
        user={user as User}
        isAdmin={userIsAdmin}
      />
    )
  } catch (err) {
    console.error('Links page error:', err)
    throw err instanceof Error ? err : new Error('링크 페이지를 불러오는 중 오류가 났습니다.')
  }
}
