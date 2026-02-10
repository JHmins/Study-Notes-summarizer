'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import Link from 'next/link'
import Sidebar from '@/components/sidebar'
import ThemeToggle from '@/components/theme-toggle'
import type { User } from '@supabase/supabase-js'
import type { StudyLink, Category, Note, LinkGroup, LinkSubgroup } from '@/types'

interface LinksClientProps {
  initialLinks: StudyLink[]
  initialCategories: Category[]
  initialNotes: Note[]
  initialGroups: LinkGroup[]
  initialSubgroups: LinkSubgroup[]
  user: User
  isAdmin?: boolean
}

export default function LinksClient({ initialLinks, initialCategories, initialNotes, initialGroups, initialSubgroups, user, isAdmin }: LinksClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [links, setLinks] = useState<StudyLink[]>(initialLinks)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [groups, setGroups] = useState<LinkGroup[]>(initialGroups)
  const [subgroups, setSubgroups] = useState<LinkSubgroup[]>(initialSubgroups)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set())
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [editingSubgroupId, setEditingSubgroupId] = useState<string | null>(null)
  const [editingSubgroupName, setEditingSubgroupName] = useState('')
  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null)
  const [deleteConfirmSubgroupId, setDeleteConfirmSubgroupId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    group_name: '',
    subgroup_name: '',
    note_id: '' as string,
  })

  const refreshLinks = async () => {
    const { data } = await supabase
      .from('study_links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (data) setLinks(data)
  }

  const refreshCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (data) setCategories(data)
  }

  const refreshNotes = async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
  }

  const refreshGroups = async () => {
    const { data } = await supabase
      .from('link_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (data) setGroups(data)
  }

  const refreshSubgroups = async () => {
    const { data } = await supabase
      .from('link_subgroups')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (data) setSubgroups(data)
  }

  useEffect(() => {
    setLinks(initialLinks)
    setCategories(initialCategories)
    setNotes(initialNotes)
    setGroups(initialGroups)
    setSubgroups(initialSubgroups)
  }, [initialLinks, initialCategories, initialNotes, initialGroups, initialSubgroups])

  // 사이드바 "수업 자료" 클릭 시(?reset=1) 모든 그룹·소그룹·링크 펼침 초기화
  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      setExpandedGroups(new Set())
      setExpandedSubgroups(new Set())
      setExpandedLinks(new Set())
      router.replace('/dashboard/links', { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    const onFocus = () => {
      refreshLinks()
      refreshNotes()
      refreshCategories()
      refreshGroups()
      refreshSubgroups()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user.id])

  useEffect(() => {
    const linksChannel = supabase
      .channel('links-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'study_links', filter: `user_id=eq.${user.id}` },
        () => refreshLinks()
      )
      .subscribe()

    const categoriesChannel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${user.id}` },
        () => refreshCategories()
      )
      .subscribe()

    const notesChannel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` },
        () => refreshNotes()
      )
      .subscribe()

    const groupsChannel = supabase
      .channel('link-groups-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'link_groups', filter: `user_id=eq.${user.id}` },
        () => refreshGroups()
      )
      .subscribe()

    const subgroupsChannel = supabase
      .channel('link-subgroups-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'link_subgroups', filter: `user_id=eq.${user.id}` },
        () => refreshSubgroups()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(linksChannel)
      supabase.removeChannel(categoriesChannel)
      supabase.removeChannel(notesChannel)
      supabase.removeChannel(groupsChannel)
      supabase.removeChannel(subgroupsChannel)
    }
  }, [user.id])

  // 카테고리별 노트 개수 계산
  const notesCountByCategory = notes.reduce<Record<string, number>>((acc, n) => {
    const id = n.category_id ?? '_none'
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  // 그룹 ID 찾기 또는 생성
  const getOrCreateGroup = async (groupName: string): Promise<string | null> => {
    if (!groupName.trim()) return null
    
    const existingGroup = groups.find((g) => g.name === groupName.trim())
    if (existingGroup) return existingGroup.id

    // 새 그룹 생성
    const maxSortOrder = groups.length > 0 ? Math.max(...groups.map((g) => g.sort_order)) : -1
    const { data, error } = await supabase
      .from('link_groups')
      .insert({
        user_id: user.id,
        name: groupName.trim(),
        sort_order: maxSortOrder + 1,
      })
      .select()
      .single()

    if (error) throw error
    if (data) {
      await refreshGroups()
      return data.id
    }
    return null
  }

  // 소그룹 ID 찾기 또는 생성
  const getOrCreateSubgroup = async (groupId: string, subgroupName: string): Promise<string | null> => {
    if (!subgroupName.trim() || !groupId) return null

    const existingSubgroup = subgroups.find((sg) => sg.group_id === groupId && sg.name === subgroupName.trim())
    if (existingSubgroup) return existingSubgroup.id

    // 새 소그룹 생성
    const groupSubgroups = subgroups.filter((sg) => sg.group_id === groupId)
    const maxSortOrder = groupSubgroups.length > 0 ? Math.max(...groupSubgroups.map((sg) => sg.sort_order)) : -1
    const { data, error } = await supabase
      .from('link_subgroups')
      .insert({
        group_id: groupId,
        user_id: user.id,
        name: subgroupName.trim(),
        sort_order: maxSortOrder + 1,
      })
      .select()
      .single()

    if (error) throw error
    if (data) {
      await refreshSubgroups()
      return data.id
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.url.trim()) {
      alert('제목과 URL을 입력해주세요.')
      return
    }

    try {
      let groupId: string | null = null
      let subgroupId: string | null = null

      // 그룹 이름으로 ID 찾기 또는 생성
      if (formData.group_name.trim()) {
        groupId = await getOrCreateGroup(formData.group_name)
      }

      // 소그룹 이름으로 ID 찾기 또는 생성
      if (groupId && formData.subgroup_name.trim()) {
        subgroupId = await getOrCreateSubgroup(groupId, formData.subgroup_name)
      }

      if (editingId) {
        const { error } = await supabase
          .from('study_links')
          .update({
            title: formData.title.trim(),
            url: formData.url.trim(),
            description: formData.description.trim() || null,
            group_id: groupId,
            subgroup_id: subgroupId,
            note_id: formData.note_id.trim() || null,
          })
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
        setEditingId(null)
      } else {
        const { error } = await supabase.from('study_links').insert({
          user_id: user.id,
          title: formData.title.trim(),
          url: formData.url.trim(),
          description: formData.description.trim() || null,
          group_id: groupId,
          subgroup_id: subgroupId,
          note_id: formData.note_id.trim() || null,
        })

        if (error) throw error
      }

      setFormData({ title: '', url: '', description: '', group_name: '', subgroup_name: '', note_id: '' })
      setIsAdding(false)
      // SQL에서 최신 데이터를 불러와서 그룹과 소그룹이 제대로 반영되도록
      await refreshLinks()
    } catch (error: unknown) {
      console.error('Link save error:', error)
      const errorMessage = error instanceof Error ? error.message : '링크 저장에 실패했습니다.'
      alert(errorMessage)
    }
  }

  const handleEdit = (link: StudyLink) => {
    const group = groups.find((g) => g.id === link.group_id)
    const subgroup = subgroups.find((sg) => sg.id === link.subgroup_id)
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || '',
      group_name: group?.name || '',
      subgroup_name: subgroup?.name || '',
      note_id: link.note_id || '',
    })
    setEditingId(link.id)
    setIsAdding(true)
    
    // 수정 폼 위치로 스크롤
    setTimeout(() => {
      const formElement = document.getElementById('link-edit-form')
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 링크를 삭제할까요?')) return

    try {
      const { error } = await supabase.from('study_links').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error
      refreshLinks()
    } catch (error: unknown) {
      console.error('Link delete error:', error)
      const errorMessage = error instanceof Error ? error.message : '링크 삭제에 실패했습니다.'
      alert(errorMessage)
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({ title: '', url: '', description: '', group_name: '', subgroup_name: '', note_id: '' })
  }

  // 그룹 이름 수정 시작
  const startEditGroup = (group: LinkGroup) => {
    setEditingGroupId(group.id)
    setEditingGroupName(group.name)
  }

  // 그룹 이름 수정 저장
  const handleUpdateGroup = async (groupId: string) => {
    const name = editingGroupName.trim()
    if (!name) {
      alert('그룹 이름을 입력해주세요.')
      return
    }
    try {
      const { error } = await supabase
        .from('link_groups')
        .update({ name })
        .eq('id', groupId)
        .eq('user_id', user.id)
      if (error) throw error
      setEditingGroupId(null)
      setEditingGroupName('')
      await refreshGroups()
    } catch (error: unknown) {
      console.error('Group update error:', error)
      const errorMessage = error instanceof Error ? error.message : '그룹 수정에 실패했습니다.'
      alert(errorMessage)
    }
  }

  // 그룹 삭제
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('이 그룹을 삭제하면 그룹에 속한 모든 링크의 그룹 정보가 제거됩니다. 계속하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('link_groups')
        .delete()
        .eq('id', groupId)
        .eq('user_id', user.id)
      if (error) throw error
      setDeleteConfirmGroupId(null)
      await refreshGroups()
      await refreshLinks()
    } catch (error: unknown) {
      console.error('Group delete error:', error)
      const errorMessage = error instanceof Error ? error.message : '그룹 삭제에 실패했습니다.'
      alert(errorMessage)
    }
  }

  // 소그룹 이름 수정 시작
  const startEditSubgroup = (subgroup: LinkSubgroup) => {
    setEditingSubgroupId(subgroup.id)
    setEditingSubgroupName(subgroup.name)
  }

  // 소그룹 이름 수정 저장
  const handleUpdateSubgroup = async (subgroupId: string) => {
    const name = editingSubgroupName.trim()
    if (!name) {
      alert('소그룹 이름을 입력해주세요.')
      return
    }
    try {
      const { error } = await supabase
        .from('link_subgroups')
        .update({ name })
        .eq('id', subgroupId)
        .eq('user_id', user.id)
      if (error) throw error
      setEditingSubgroupId(null)
      setEditingSubgroupName('')
      await refreshSubgroups()
    } catch (error: unknown) {
      console.error('Subgroup update error:', error)
      const errorMessage = error instanceof Error ? error.message : '소그룹 수정에 실패했습니다.'
      alert(errorMessage)
    }
  }

  // 소그룹 삭제
  const handleDeleteSubgroup = async (subgroupId: string) => {
    if (!confirm('이 소그룹을 삭제하면 소그룹에 속한 모든 링크의 소그룹 정보가 제거됩니다. 계속하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('link_subgroups')
        .delete()
        .eq('id', subgroupId)
        .eq('user_id', user.id)
      if (error) throw error
      setDeleteConfirmSubgroupId(null)
      await refreshSubgroups()
      await refreshLinks()
    } catch (error: unknown) {
      console.error('Subgroup delete error:', error)
      const errorMessage = error instanceof Error ? error.message : '소그룹 삭제에 실패했습니다.'
      alert(errorMessage)
    }
  }

  // 그룹별로 링크 분류 (그룹 ID 기반)
  const groupedLinks = links.reduce<Record<string, Record<string, StudyLink[]>>>(
    (acc, link) => {
      const groupId = link.group_id || '_none'
      const subgroupId = link.subgroup_id || '_none'
      if (!acc[groupId]) acc[groupId] = {}
      if (!acc[groupId][subgroupId]) acc[groupId][subgroupId] = []
      acc[groupId][subgroupId].push(link)
      return acc
    },
    {}
  )

  // 그룹 순서 정렬 (sort_order 기준, 없으면 created_at)
  const sortedGroups = groups
    .filter((g) => groupedLinks[g.id] && Object.values(groupedLinks[g.id]).some((links) => links.length > 0))
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    .map((g) => g.id)

  // 소그룹 순서 정렬 (sort_order 기준, 없으면 created_at)
  const sortSubgroups = (groupId: string) => {
    const groupSubgroups = subgroups
      .filter((sg) => sg.group_id === groupId && groupedLinks[groupId]?.[sg.id])
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
    return ['_none', ...groupSubgroups.map((sg) => sg.id)]
  }

  const toggleLink = (linkId: string) => {
    setExpandedLinks((prev) => {
      const next = new Set(prev)
      if (next.has(linkId)) {
        next.delete(linkId)
      } else {
        next.add(linkId)
      }
      return next
    })
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
        // 그룹을 닫을 때 해당 그룹의 모든 소그룹도 닫기
        const subgroupIds = Object.keys(groupedLinks[groupId] || {}).map((subKey) => `${groupId}-${subKey}`)
        subgroupIds.forEach((id) => setExpandedSubgroups((prevSub) => {
          const nextSub = new Set(prevSub)
          nextSub.delete(id)
          return nextSub
        }))
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const toggleSubgroup = (subgroupId: string) => {
    setExpandedSubgroups((prev) => {
      const next = new Set(prev)
      if (next.has(subgroupId)) {
        next.delete(subgroupId)
      } else {
        next.add(subgroupId)
      }
      return next
    })
  }


  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <Sidebar
        notes={notes}
        categories={categories}
        selectedCategoryId={null}
        onSelectCategory={(id) => router.push(id ? `/dashboard?category=${id}` : '/dashboard')}
        onCategoriesChange={refreshCategories}
        userId={user.id}
        selectedDate={null}
        onSelectDate={(date) => router.push(date ? `/dashboard?date=${format(date, 'yyyy-MM-dd')}` : '/dashboard')}
        calendarMonth={new Date()}
        onCalendarMonthChange={() => {}}
        filterStatus="all"
        onFilterStatusChange={() => {}}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:min-w-[400px]">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] lg:hidden"
              aria-label="메뉴 열기"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-medium text-[var(--foreground)]">수업 자료</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden text-sm text-[var(--foreground-subtle)] sm:inline">
              {user.email || '익명'}
            </span>
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-muted)] px-2 py-1 text-xs font-medium text-[var(--accent)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                관리자
              </span>
            )}
            {isAdmin && (
              <Link href="/admin/approvals" className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:underline">
                가입 승인
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">수업 자료</h1>
            {!isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                링크 추가
              </button>
            )}
          </div>

          {isAdding && (
            <div id="link-edit-form" className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                {editingId ? '링크 수정' : '새 링크 추가'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    제목 *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                    placeholder="링크 제목을 입력하세요"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    URL *
                  </label>
                  <input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                    placeholder="https://example.com"
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    설명
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                    placeholder="링크에 대한 설명을 입력하세요"
                    rows={3}
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="group_name" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                      그룹
                    </label>
                    <input
                      id="group_name"
                      type="text"
                      value={formData.group_name}
                      onChange={(e) => setFormData({ ...formData, group_name: e.target.value, subgroup_name: '' })}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                      placeholder="그룹 이름을 입력하세요 (예: 강의자료, 참고사이트, 유튜브 등)"
                      list="link-groups"
                    />
                    {groups.length > 0 && (
                      <datalist id="link-groups">
                        {groups.map((group) => (
                          <option key={group.id} value={group.name} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  {formData.group_name && (
                    <div>
                      <label htmlFor="subgroup_name" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                        소그룹 (선택사항)
                      </label>
                      <input
                        id="subgroup_name"
                        type="text"
                        value={formData.subgroup_name}
                        onChange={(e) => setFormData({ ...formData, subgroup_name: e.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                        placeholder="소그룹 이름을 입력하세요 (예: 1주차, 2주차 등)"
                        list="link-subgroups"
                      />
                      {subgroups.filter((sg) => {
                        const group = groups.find((g) => g.id === sg.group_id)
                        return group?.name === formData.group_name
                      }).length > 0 && (
                        <datalist id="link-subgroups">
                          {subgroups
                            .filter((sg) => {
                              const group = groups.find((g) => g.id === sg.group_id)
                              return group?.name === formData.group_name
                            })
                            .map((sg) => (
                              <option key={sg.id} value={sg.name} />
                            ))}
                        </datalist>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-[var(--foreground-subtle)]">
                    같은 그룹 이름을 사용하면 링크들이 그룹으로 묶여서 표시됩니다. 소그룹을 지정하면 그룹 안에 하위 그룹으로 표시됩니다.
                  </p>
                </div>
                <div>
                  <label htmlFor="note_id" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    연결할 노트
                  </label>
                  <select
                    id="note_id"
                    value={formData.note_id}
                    onChange={(e) => setFormData({ ...formData, note_id: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                  >
                    <option value="">연결 안 함</option>
                    {notes.map((n) => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                    노트와 연결하면 해당 노트 상세에서 링크가 표시되고, 변동 시 실시간 반영됩니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  >
                    {editingId ? '수정' : '추가'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

          {links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--foreground-muted)]">
              <p className="mb-2">아직 저장된 링크가 없습니다.</p>
              <p className="text-sm">위의 "링크 추가" 버튼을 눌러 첫 번째 링크를 추가해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedGroups.map((groupId) => {
                const group = groups.find((g) => g.id === groupId)
                if (!group) return null
                const groupData = groupedLinks[groupId]
                const isGroupExpanded = expandedGroups.has(groupId)
                const sortedSubgroupIds = sortSubgroups(groupId)
                const totalLinks = Object.values(groupData).reduce((sum, links) => sum + links.length, 0)
                return (
                  <div key={groupId} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    {/* 그룹 헤더 */}
                    {editingGroupId === groupId ? (
                      <div className="px-4 py-3 bg-[var(--surface-hover)] flex items-center gap-2">
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateGroup(groupId)
                            } else if (e.key === 'Escape') {
                              setEditingGroupId(null)
                              setEditingGroupName('')
                            }
                          }}
                          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateGroup(groupId)}
                          className="rounded p-1.5 text-[var(--accent)] hover:bg-[var(--surface)]"
                          aria-label="저장"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupId(null)
                            setEditingGroupName('')
                          }}
                          className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--surface)]"
                          aria-label="취소"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-hover)] hover:bg-[var(--surface-hover)]/80 transition-colors">
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupId)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <svg
                            className={`h-5 w-5 text-[var(--foreground-subtle)] transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <h2 className="text-lg font-semibold text-[var(--foreground)]">{group.name}</h2>
                          <span className="text-sm text-[var(--foreground-subtle)]">({totalLinks})</span>
                        </button>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {deleteConfirmGroupId === groupId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDeleteGroup(groupId)}
                                className="rounded p-1.5 text-[var(--error)] hover:bg-[var(--error-muted)]"
                                aria-label="삭제 확인"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmGroupId(null)}
                                className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--surface)]"
                                aria-label="취소"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditGroup(group)}
                                className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                                aria-label="수정"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmGroupId(groupId)}
                                className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--error-muted)] hover:text-[var(--error)]"
                                aria-label="삭제"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 그룹 내용 */}
                    {isGroupExpanded && (
                      <div>
                        {sortedSubgroupIds.filter((subId) => subId !== '_none').length > 0 ? (
                          // 소그룹이 있는 경우
                          <>
                            {sortedSubgroupIds.map((subgroupId) => {
                              const subgroupLinks = groupData[subgroupId] || []
                              const subgroup = subgroupId !== '_none' ? subgroups.find((sg) => sg.id === subgroupId) : null
                              const subgroupIdForToggle = `${groupId}-${subgroupId}`
                              const isSubgroupExpanded = expandedSubgroups.has(subgroupIdForToggle)
                              
                              if (subgroup) {
                                // 소그룹 헤더
                                return (
                                  <div key={subgroupId} className="border-t border-[var(--border)]">
                                    {editingSubgroupId === subgroupId ? (
                                      <div className="px-6 py-2.5 bg-[var(--surface)] flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={editingSubgroupName}
                                          onChange={(e) => setEditingSubgroupName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleUpdateSubgroup(subgroupId)
                                            } else if (e.key === 'Escape') {
                                              setEditingSubgroupId(null)
                                              setEditingSubgroupName('')
                                            }
                                          }}
                                          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[var(--foreground)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)]"
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateSubgroup(subgroupId)}
                                          className="rounded p-1.5 text-[var(--accent)] hover:bg-[var(--surface-hover)]"
                                          aria-label="저장"
                                        >
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSubgroupId(null)
                                            setEditingSubgroupName('')
                                          }}
                                          className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--surface-hover)]"
                                          aria-label="취소"
                                        >
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="w-full flex items-center justify-between px-6 py-2.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors">
                                        <button
                                          type="button"
                                          onClick={() => toggleSubgroup(subgroupIdForToggle)}
                                          className="flex items-center gap-2 flex-1 text-left"
                                        >
                                          <svg
                                            className={`h-4 w-4 text-[var(--foreground-subtle)] transition-transform ${isSubgroupExpanded ? 'rotate-90' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                          <h3 className="text-base font-semibold text-[var(--foreground)]">{subgroup.name}</h3>
                                          <span className="text-sm text-[var(--foreground-subtle)]">({subgroupLinks.length})</span>
                                        </button>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                          {deleteConfirmSubgroupId === subgroupId ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteSubgroup(subgroupId)}
                                                className="rounded p-1.5 text-[var(--error)] hover:bg-[var(--error-muted)]"
                                                aria-label="삭제 확인"
                                              >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDeleteConfirmSubgroupId(null)}
                                                className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--surface-hover)]"
                                                aria-label="취소"
                                              >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => startEditSubgroup(subgroup)}
                                                className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                                                aria-label="수정"
                                              >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDeleteConfirmSubgroupId(subgroupId)}
                                                className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--error-muted)] hover:text-[var(--error)]"
                                                aria-label="삭제"
                                              >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {isSubgroupExpanded && (
                                      <div className="divide-y divide-[var(--border)]">
                                        {subgroupLinks.map((link) => renderLinkItem(link))}
                                      </div>
                                    )}
                                  </div>
                                )
                              } else if (subgroupLinks.length > 0) {
                                // 소그룹이 없는 링크들 (그룹에 직접 속한 링크) - 그룹이 열리면 바로 표시
                                return (
                                  <div key={subgroupId} className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                                    {subgroupLinks.map((link) => renderLinkItem(link))}
                                  </div>
                                )
                              }
                              return null
                            })}
                          </>
                        ) : (
                          // 소그룹이 없는 경우 (기존 방식)
                          <div className="divide-y divide-[var(--border)]">
                            {Object.values(groupData).flat().map((link) => renderLinkItem(link))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )

  function renderLinkItem(link: StudyLink) {
    const isExpanded = expandedLinks.has(link.id)
    return (
      <div key={link.id} className="group">
        {/* 링크 제목 (항상 표시) */}
        <button
          type="button"
          onClick={() => toggleLink(link.id)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg
              className={`h-4 w-4 shrink-0 text-[var(--foreground-subtle)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <h3 className="text-base font-medium text-[var(--foreground)] truncate text-left">
              {link.title}
            </h3>
            {link.note_id && (
              <span className="shrink-0 rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs text-[var(--foreground-muted)]">
                {notes.find((n) => n.id === link.note_id)?.title ?? '노트'}
              </span>
            )}
            <span className="text-xs text-[var(--foreground-subtle)] shrink-0">
              {format(new Date(link.created_at), 'yyyy.M.d', { locale: ko })}
            </span>
          </div>
          <div className="flex shrink-0 gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => handleEdit(link)}
              className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              aria-label="수정"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleDelete(link.id)}
              className="rounded p-1.5 text-[var(--foreground-subtle)] hover:bg-[var(--error-muted)] hover:text-[var(--error)]"
              aria-label="삭제"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </button>

        {/* 링크 상세 내용 (클릭 시 표시) */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 bg-[var(--surface)]">
            <div className="space-y-3">
              <div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent)] hover:underline break-all inline-flex items-center gap-1"
                >
                  {link.url}
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
              {link.description && (
                <p className="text-sm text-[var(--foreground-muted)] leading-relaxed whitespace-pre-wrap">
                  {link.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
}
