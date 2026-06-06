'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import Sidebar from '@/components/sidebar'
import ThemeToggle from '@/components/theme-toggle'
import { formatFileSize } from '@/lib/utils/format'
import type { Category, Note, Project } from '@/types'

interface PublicProjectFile {
  id: string
  title: string
  file_size: number | null
  created_at: string
}

interface PublicProjectDetailClientProps {
  project: Project
  notes: Note[]
  categories: Category[]
  linkedNotes: Note[]
  files: PublicProjectFile[]
  authorLabel: string
}

export default function PublicProjectDetailClient({
  project,
  notes,
  categories,
  linkedNotes,
  files,
  authorLabel,
}: PublicProjectDetailClientProps) {
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
            <Link href="/public/projects" className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
              목록
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <nav className="mb-8">
              <Link
                href="/public/projects"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--foreground-subtle)] no-underline transition-colors hover:text-[var(--accent)]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                프로젝트 목록
              </Link>
            </nav>

            <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{project.name}</h1>
                  <p className="mt-2 text-xs text-[var(--foreground-subtle)]">
                    생성 {format(new Date(project.created_at), 'yyyy.M.d HH:mm', { locale: ko })}
                  </p>
                  {project.description ? (
                    <p className="mt-3 text-sm text-[var(--foreground-muted)]">{project.description}</p>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--foreground-subtle)]">설명 없음</p>
                  )}
                  <p className="mt-4 text-xs text-[var(--foreground-subtle)]">읽기 전용</p>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--foreground-subtle)]">
                연결된 노트 · {linkedNotes.length}개
              </p>
              {linkedNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 py-10 text-center text-sm text-[var(--foreground-muted)]">
                  연결된 공개 노트가 없습니다.
                </div>
              ) : (
                <ul className="space-y-2">
                  {linkedNotes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-xl bg-[var(--surface)] px-4 py-3 ring-1 ring-[var(--border)] transition-colors hover:ring-[var(--border-focus)]"
                    >
                      <Link
                        href={`/public/notes/${note.id}`}
                        className="text-sm font-medium text-[var(--accent)] no-underline hover:underline"
                      >
                        {note.title || '제목 없음'}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                        {format(new Date(note.created_at), 'yyyy.M.d HH:mm', { locale: ko })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(note.category_ids ?? (note.category_id ? [note.category_id] : [])).map((cid) => {
                          const cat = categories.find((c) => c.id === cid)
                          return (
                            <span key={`${note.id}-${cid}`} className="rounded-md bg-[var(--accent-muted)] px-1.5 py-0.5 text-xs text-[var(--accent)]">
                              {cat?.name ?? cid}
                            </span>
                          )
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--foreground-subtle)]">
                프로젝트 파일 · {files.length}개
              </p>
              {files.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 py-12 text-center text-sm text-[var(--foreground-muted)]">
                  업로드된 파일이 없습니다.
                </div>
              ) : (
                <ul className="space-y-2">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="rounded-xl bg-[var(--surface)] px-4 py-3.5 ring-1 ring-[var(--border)] transition-colors hover:ring-[var(--border-focus)]"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">{file.title}</p>
                      <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                        {file.file_size ? formatFileSize(file.file_size) : '-'} · {format(new Date(file.created_at), 'yyyy.M.d HH:mm', { locale: ko })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
