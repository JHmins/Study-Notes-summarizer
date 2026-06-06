'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import Sidebar from '@/components/sidebar'
import ThemeToggle from '@/components/theme-toggle'
import type { Category, LinkGroup, LinkSubgroup, Note, StudyLink } from '@/types'

interface PublicLinksClientProps {
  notes: Note[]
  categories: Category[]
  links: StudyLink[]
  groups: LinkGroup[]
  subgroups: LinkSubgroup[]
  authorLabel: string
}

export default function PublicLinksClient({
  notes,
  categories,
  links,
  groups,
  subgroups,
  authorLabel,
}: PublicLinksClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedSubgroups, setExpandedSubgroups] = useState<Set<string>>(new Set())
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, StudyLink[]>> = {}
    links.forEach((link) => {
      const g = link.group_id || '_none'
      const sg = link.subgroup_id || '_none'
      if (!map[g]) map[g] = {}
      if (!map[g][sg]) map[g][sg] = []
      map[g][sg].push(link)
    })
    return map
  }, [links])

  const sortedGroupIds = useMemo(() => {
    const ids = Object.keys(grouped)
    return ids.sort((a, b) => {
      if (a === '_none') return 1
      if (b === '_none') return -1
      const ga = groups.find((g) => g.id === a)
      const gb = groups.find((g) => g.id === b)
      if (!ga || !gb) return a.localeCompare(b)
      if (ga.sort_order !== gb.sort_order) return ga.sort_order - gb.sort_order
      return new Date(ga.created_at).getTime() - new Date(gb.created_at).getTime()
    })
  }, [grouped, groups])

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <Sidebar
        mode="public"
        noteHrefBase="/public/notes"
        notes={notes}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onCategoriesChange={() => {}}
        userId="public"
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        calendarMonth={calendarMonth}
        onCalendarMonthChange={setCalendarMonth}
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
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">수업 자료</span>
              <p className="text-xs text-[var(--foreground-subtle)]">작성자: {authorLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
              로그인
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6">
          <h1 className="mb-6 text-2xl font-bold text-[var(--foreground)]">수업 자료</h1>
          {links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
              공개된 수업 자료가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedGroupIds.map((groupId) => {
                const groupName = groupId === '_none' ? '미분류' : (groups.find((g) => g.id === groupId)?.name ?? '그룹')
                const subgroupMap = grouped[groupId] ?? {}
                const subgroupIds = Object.keys(subgroupMap).sort((a, b) => {
                  if (a === '_none') return 1
                  if (b === '_none') return -1
                  const sa = subgroups.find((s) => s.id === a)
                  const sb = subgroups.find((s) => s.id === b)
                  if (!sa || !sb) return a.localeCompare(b)
                  if (sa.sort_order !== sb.sort_order) return sa.sort_order - sb.sort_order
                  return new Date(sa.created_at).getTime() - new Date(sb.created_at).getTime()
                })
                return (
                  <section key={groupId} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroups((prev) => {
                          const next = new Set(prev)
                          if (next.has(groupId)) next.delete(groupId)
                          else next.add(groupId)
                          return next
                        })
                      }
                      className="w-full border-b border-[var(--border)] px-4 py-3 text-left hover:bg-[var(--surface-hover)]"
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-[var(--foreground)]">{groupName}</h2>
                        <span className="text-xs text-[var(--foreground-subtle)]">
                          {(Object.values(subgroupMap).flat().length)}개
                        </span>
                      </div>
                    </button>
                    {expandedGroups.has(groupId) && <div>
                      {subgroupIds.map((subId) => {
                        const subgroupName = subId === '_none' ? null : (subgroups.find((s) => s.id === subId)?.name ?? null)
                        return (
                          <div key={subId} className="border-b border-[var(--border)] last:border-b-0">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSubgroups((prev) => {
                                  const key = `${groupId}-${subId}`
                                  const next = new Set(prev)
                                  if (next.has(key)) next.delete(key)
                                  else next.add(key)
                                  return next
                                })
                              }
                              className="w-full px-4 py-2 text-left hover:bg-[var(--surface-hover)]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[var(--foreground-subtle)]">{subgroupName ?? '기본'}</span>
                                <span className="text-xs text-[var(--foreground-subtle)]">{subgroupMap[subId].length}개</span>
                              </div>
                            </button>
                            {expandedSubgroups.has(`${groupId}-${subId}`) && (
                              <ul className="divide-y divide-[var(--border)]">
                                {subgroupMap[subId].map((link) => {
                                  const note = link.note_id ? notes.find((n) => n.id === link.note_id) : null
                                  const isOpen = expandedLinks.has(link.id)
                                  return (
                                    <li key={link.id}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedLinks((prev) => {
                                            const next = new Set(prev)
                                            if (next.has(link.id)) next.delete(link.id)
                                            else next.add(link.id)
                                            return next
                                          })
                                        }
                                        className="w-full px-4 py-3 text-left hover:bg-[var(--surface-hover)]"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">{link.title}</span>
                                          <span className="shrink-0 text-xs text-[var(--foreground-subtle)]">
                                            {format(new Date(link.created_at), 'yyyy.M.d')}
                                          </span>
                                        </div>
                                        {note && (
                                          <span className="mt-1 inline-flex rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs text-[var(--foreground-muted)]">
                                            {note.title}
                                          </span>
                                        )}
                                      </button>
                                      {isOpen && (
                                        <div className="px-4 pb-4 pt-1">
                                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--accent)] hover:underline break-all">
                                            {link.url}
                                          </a>
                                          {link.description && <p className="mt-2 text-sm text-[var(--foreground-muted)]">{link.description}</p>}
                                        </div>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                            )}
                          </div>
                        )
                      })}
                    </div>}
                  </section>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
