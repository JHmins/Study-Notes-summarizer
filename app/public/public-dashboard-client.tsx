'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, isSameDay, parseISO, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import ThemeToggle from '@/components/theme-toggle'
import Sidebar from '@/components/sidebar'
import type { Category, Note } from '@/types'
import { NOTE_STATUS_CONFIG } from '@/types'

type SortKey = 'newest' | 'oldest' | 'title'

interface PublicDashboardClientProps {
  notes: Note[]
  categories: Category[]
  authorLabel: string
  linksCount: number
  projectsCount: number
}

export default function PublicDashboardClient({ notes, categories, authorLabel, linksCount, projectsCount }: PublicDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [sortBy, setSortBy] = useState<SortKey>('newest')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [perPage, setPerPage] = useState<number | 'all'>(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [visitSeconds, setVisitSeconds] = useState(0)

  const filteredNotes = useMemo(() => {
    let list = notes.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.summary ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === 'all' || note.status === filterStatus
      const categoryIds = note.category_ids ?? (note.category_id ? [note.category_id] : [])
      const matchesCategory = selectedCategoryId ? categoryIds.includes(selectedCategoryId) : true
      const matchesDate = selectedDate
        ? isSameDay(startOfDay(parseISO(note.created_at)), selectedDate)
        : true
      return matchesSearch && matchesCategory && matchesDate && matchesStatus
    })

    list = [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return (a.title || '').localeCompare(b.title || '', 'ko')
    })

    return list
  }, [notes, searchQuery, selectedCategoryId, selectedDate, sortBy, filterStatus])

  const todayCount = useMemo(
    () =>
      notes.filter((n) => isSameDay(startOfDay(parseISO(n.created_at)), startOfDay(new Date()))).length,
    [notes]
  )
  const perPageOptions = [1, 3, 5, 7, 10, 'all'] as const
  const totalPages = perPage === 'all' ? 1 : Math.max(1, Math.ceil(filteredNotes.length / perPage))
  const paginatedNotes = useMemo(() => {
    if (perPage === 'all') return filteredNotes
    const start = (currentPage - 1) * perPage
    return filteredNotes.slice(start, start + perPage)
  }, [filteredNotes, perPage, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategoryId, selectedDate, sortBy, perPage, filterStatus])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages))
  }, [currentPage, totalPages])

  useEffect(() => {
    const KEY = 'publicVisitStart'
    const stored = sessionStorage.getItem(KEY)
    const start = stored ? Number(stored) : Date.now()
    if (!stored) sessionStorage.setItem(KEY, String(start))
    const tick = () => setVisitSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen flex bg-[var(--background)] text-[var(--foreground)]">
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
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        onFullNotesClick={() => {
          setSelectedCategoryId(null)
          setSelectedDate(null)
          setFilterStatus('all')
          setCurrentPage(1)
        }}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
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
              <p className="text-sm font-medium text-[var(--foreground)]">관리자가 정리한 노트 공부 보기</p>
              <p className="text-xs text-[var(--foreground-subtle)]">공개 작성자: {authorLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
              로그인
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6">
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="공개 학습 통계">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-shadow hover:shadow-md">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-subtle)]">총 노트</p>
              <p className="mt-1 text-2xl font-bold">{notes.length}<span className="text-base font-normal text-[var(--foreground-muted)]">개</span></p>
              <p className="mt-0.5 text-xs text-[var(--foreground-subtle)]">정리한 파일</p>
            </div>
            <Link href="/public/links" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-shadow hover:shadow-md hover:border-[var(--accent)]/40">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-subtle)]">수업 자료</p>
              <p className="mt-1 text-2xl font-bold">{linksCount}<span className="text-base font-normal text-[var(--foreground-muted)]">개</span></p>
              <p className="mt-0.5 text-xs text-[var(--foreground-subtle)]">저장한 링크</p>
            </Link>
            <Link href="/public/projects" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-shadow hover:shadow-md hover:border-[var(--accent)]/40">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-subtle)]">프로젝트</p>
              <p className="mt-1 text-2xl font-bold">{projectsCount}<span className="text-base font-normal text-[var(--foreground-muted)]">개</span></p>
              <p className="mt-0.5 text-xs text-[var(--foreground-subtle)]">진행 중</p>
            </Link>
            <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-muted)]/20 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">방문 시간</p>
              <p className="mt-1 text-2xl font-bold text-[var(--accent)]">
                {visitSeconds >= 3600
                  ? `${Math.floor(visitSeconds / 3600)}시간 ${Math.floor((visitSeconds % 3600) / 60)}분`
                  : visitSeconds >= 60
                    ? `${Math.floor(visitSeconds / 60)}분 ${visitSeconds % 60}초`
                    : `${visitSeconds}초`}
              </p>
              <p className="mt-0.5 text-xs text-[var(--foreground-subtle)]">읽기 전용</p>
            </div>
          </section>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="노트 제목 또는 요약 검색..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm focus:border-[var(--border-focus)] focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="perPage" className="text-sm text-[var(--foreground-subtle)]">보기</label>
              <select
                id="perPage"
                value={perPage}
                onChange={(e) => setPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm focus:border-[var(--border-focus)] focus:outline-none"
              >
                {perPageOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'all' ? '전체' : `${opt}개`}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm focus:border-[var(--border-focus)] focus:outline-none"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="title">제목순</option>
            </select>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
              조건에 맞는 공개 노트가 없습니다.
            </div>
          ) : (
            <ul className="space-y-2">
              {paginatedNotes.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/public/notes/${note.id}`}
                    className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-focus)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold sm:text-lg">{note.title || '제목 없음'}</h3>
                        <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                          {format(new Date(note.created_at), 'yyyy.M.d HH:mm', { locale: ko })}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${NOTE_STATUS_CONFIG[note.status].className}`}>
                        {NOTE_STATUS_CONFIG[note.status].label}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--foreground-muted)]">
                      {(note.summary ?? '').replace(/^#+\s*/gm, '').replace(/\n+/g, ' ').trim().slice(0, 220)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {(note.category_ids ?? (note.category_id ? [note.category_id] : [])).map((cid) => {
                        const cat = categories.find((c) => c.id === cid)
                        return (
                          <span key={cid} className="inline-flex items-center rounded-md bg-[var(--accent-muted)] px-1.5 py-0.5 text-xs text-[var(--accent)]">
                            {cat?.name ?? cid}
                          </span>
                        )
                      })}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
              <p className="text-sm text-[var(--foreground-subtle)]">
                {perPage === 'all'
                  ? `전체 ${filteredNotes.length}개`
                  : `${filteredNotes.length}개 중 ${(currentPage - 1) * (perPage as number) + 1}-${Math.min(currentPage * (perPage as number), filteredNotes.length)}번`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  이전
                </button>
                <span className="px-2 text-sm text-[var(--foreground-subtle)]">{currentPage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
