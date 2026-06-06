'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import Sidebar from '@/components/sidebar'
import ThemeToggle from '@/components/theme-toggle'
import type { Category, Note, Project } from '@/types'

interface PublicProjectsClientProps {
  notes: Note[]
  categories: Category[]
  projects: Project[]
  authorLabel: string
}

export default function PublicProjectsClient({ notes, categories, projects, authorLabel }: PublicProjectsClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

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
              <span className="text-sm font-medium text-[var(--foreground)]">프로젝트</span>
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

        <main className="flex-1 overflow-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">프로젝트</h1>

            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
                공개된 프로젝트가 없습니다.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm ring-1 ring-[var(--border)] transition-all hover:shadow-md hover:ring-[var(--border-focus)]"
                  >
                    <Link href={`/public/projects/${project.id}`} className="block p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold tracking-tight text-[var(--foreground)] truncate">{project.name}</h3>
                          {project.description ? (
                            <p className="mt-1 text-sm text-[var(--foreground-muted)] line-clamp-2">{project.description}</p>
                          ) : (
                            <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                              {format(new Date(project.created_at), 'yyyy년 M월 d일', { locale: ko })}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex border-t border-[var(--border)]">
                      <Link
                        href={`/public/projects/${project.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-muted)]/30"
                      >
                        열기
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
