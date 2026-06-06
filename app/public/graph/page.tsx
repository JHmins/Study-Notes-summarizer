import type { Note } from '@/types'
import GraphViewClient from '@/app/dashboard/graph/graph-view-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicCategories, getPublicNotes } from '@/lib/public-notes'

function extractWords(text: string, limit = 12): string[] {
  if (!text || typeof text !== 'string') return []
  const stop = new Set(['그', '이', '저', '것', '수', '등', '및', '또', '는', '을', '를', '이', '가', '은', '는', '의', '에', '로', '으로', '와', '과', 'the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at'])
  const tokens = text.replace(/[#*_`\[\]()]/g, ' ').split(/\s+/).filter((s) => s.length >= 2 && !/^\d+$/.test(s))
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tokens) {
    const lower = t.toLowerCase().slice(0, 20)
    if (stop.has(lower) || seen.has(lower)) continue
    seen.add(lower)
    out.push(t.slice(0, 12))
    if (out.length >= limit) break
  }
  return out
}

export default async function PublicGraphPage() {
  const notes = await getPublicNotes()
  const categories = await getPublicCategories(notes)
  const dateKeys = [...new Set(notes.map((n) => n.created_at.slice(0, 10)))].sort()
  const noteWords: Record<string, string[]> = {}

  try {
    const admin = createAdminClient()
    for (const note of notes.slice(0, 30)) {
      const fromTitle = extractWords(note.title || '', 6)
      if (!note.file_path) {
        noteWords[note.id] = fromTitle
        continue
      }
      try {
        const { data: fileData } = await admin.storage.from('study-notes').download(note.file_path)
        const text = fileData ? await fileData.text() : ''
        const fromBody = extractWords(text, 10)
        noteWords[note.id] = [...new Set([...fromTitle, ...fromBody])].slice(0, 12)
      } catch {
        noteWords[note.id] = fromTitle
      }
    }
  } catch {
    notes.forEach((n) => {
      noteWords[n.id] = extractWords(n.title || '', 8)
    })
  }

  return (
    <GraphViewClient
      notes={notes.map(({ file_path: _fp, ...r }) => r) as Note[]}
      categories={categories}
      userEmail="읽기 전용"
      mode="public"
      homeHref="/public"
      noteHrefBase="/public/notes"
      dateKeys={dateKeys}
      noteWords={noteWords}
    />
  )
}
