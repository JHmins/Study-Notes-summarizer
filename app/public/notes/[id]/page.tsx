import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import ThemeToggle from '@/components/theme-toggle'
import SimpleMarkdown from '@/components/simple-markdown'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicAuthors } from '@/lib/public-notes'

interface PageProps {
  params: {
    id: string
  }
}

export default async function PublicNoteDetailPage({ params }: PageProps) {
  const authors = await getPublicAuthors()
  const authorIds = authors.map((a) => a.id)
  if (authorIds.length === 0) notFound()

  const admin = createAdminClient()
  const { data: note } = await admin
    .from('notes')
    .select('id, title, summary, created_at, user_id, status, is_public')
    .eq('id', params.id)
    .single()

  if (!note) notFound()
  if (!authorIds.includes(note.user_id)) notFound()
  if (!note.is_public) notFound()
  if (note.status !== 'completed' || !note.summary) notFound()

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/public" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            공개 노트 목록
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{note.title || '제목 없음'}</h1>
          <p className="mt-2 text-sm text-[var(--foreground-subtle)]">
            {format(new Date(note.created_at), 'yyyy.M.d HH:mm', { locale: ko })}
          </p>

          <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <SimpleMarkdown>{note.summary}</SimpleMarkdown>
          </div>

          <p className="mt-4 text-xs text-[var(--foreground-subtle)]">읽기 전용</p>
        </article>
      </main>
    </div>
  )
}
