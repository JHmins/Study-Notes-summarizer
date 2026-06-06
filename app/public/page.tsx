import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import ThemeToggle from '@/components/theme-toggle'
import { getPublicAuthors, getPublicNotes } from '@/lib/public-notes'

export default async function PublicNotesPage() {
  const [authors, notes] = await Promise.all([getPublicAuthors(), getPublicNotes()])
  const authorLabel =
    authors.length > 0
      ? authors.map((a) => a.email).filter(Boolean).join(', ')
      : '관리자'

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/auth/login" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            로그인으로 돌아가기
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card">
          <h1 className="text-2xl font-semibold tracking-tight">관리자가 정리한 공부 노트</h1>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            이 화면은 읽기 전용입니다. 요약 내용을 감상할 수 있으며, 작성/수정/삭제와 원본 파일 보기는 제한됩니다.
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-subtle)]">공개 작성자: {authorLabel}</p>
        </section>

        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--foreground-muted)]">
            공개된 노트가 아직 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/public/notes/${note.id}`}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card transition-colors hover:border-[var(--border-focus)]"
                >
                  <h2 className="text-lg font-semibold">{note.title || '제목 없음'}</h2>
                  <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                    {format(new Date(note.created_at), 'yyyy.M.d HH:mm', { locale: ko })}
                  </p>
                  {note.summary && (
                    <p className="mt-3 line-clamp-2 text-sm text-[var(--foreground-muted)]">
                      {note.summary.replace(/^#+\s*/gm, '').replace(/\n+/g, ' ').trim().slice(0, 220)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
