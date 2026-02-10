'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCategoryErrorMessage } from '@/lib/utils/errors'
import type { Category } from '@/types'

interface SidebarCategoriesProps {
  categories: Category[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onCategoriesChange: () => void
  userId: string
  notesCountByCategory: Record<string, number>
  onMobileClose?: () => void
}

export default function SidebarCategories({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCategoriesChange,
  userId,
  notesCountByCategory,
  onMobileClose,
}: SidebarCategoriesProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const supabase = createClient()

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setAddError(null)
    setAdding(true)
    const { error } = await supabase.from('categories').insert({
      user_id: userId,
      name,
      sort_order: categories.length,
    })
    setAdding(false)
    if (error) {
      setAddError(getCategoryErrorMessage(error) ?? error.message)
      return
    }
    setNewName('')
    setAddOpen(false)
    onCategoriesChange()
  }

  const handleUpdate = async (id: string) => {
    const name = editName.trim()
    if (!name) return
    setEditError(null)
    const { error } = await supabase.from('categories').update({ name }).eq('id', id).eq('user_id', userId)
    if (error) {
      setEditError(getCategoryErrorMessage(error) ?? error.message)
      return
    }
    setEditingId(null)
    setEditName('')
    setEditError(null)
    onCategoriesChange()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      alert(getCategoryErrorMessage(error) ?? error.message)
      return
    }
    setDeleteConfirmId(null)
    onSelectCategory(selectedCategoryId === id ? null : selectedCategoryId)
    onCategoriesChange()
  }

  const startEdit = (c: Category) => {
    setEditingId(c.id)
    setEditName(c.name)
  }

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return
    const curr = categories[index]
    const prev = categories[index - 1]
    setMovingId(curr.id)
    const currOrder = curr.sort_order
    const prevOrder = prev.sort_order
    const { error: e1 } = await supabase.from('categories').update({ sort_order: prevOrder }).eq('id', curr.id).eq('user_id', userId)
    const { error: e2 } = await supabase.from('categories').update({ sort_order: currOrder }).eq('id', prev.id).eq('user_id', userId)
    setMovingId(null)
    if (e1 || e2) {
      alert(getCategoryErrorMessage(e1 || e2) || '순서 변경에 실패했습니다.')
      return
    }
    onCategoriesChange()
  }

  const handleMoveDown = async (index: number) => {
    if (index >= categories.length - 1) return
    const curr = categories[index]
    const next = categories[index + 1]
    setMovingId(curr.id)
    const currOrder = curr.sort_order
    const nextOrder = next.sort_order
    const { error: e1 } = await supabase.from('categories').update({ sort_order: nextOrder }).eq('id', curr.id).eq('user_id', userId)
    const { error: e2 } = await supabase.from('categories').update({ sort_order: currOrder }).eq('id', next.id).eq('user_id', userId)
    setMovingId(null)
    if (e1 || e2) {
      alert(getCategoryErrorMessage(e1 || e2) || '순서 변경에 실패했습니다.')
      return
    }
    onCategoriesChange()
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedId && draggedId !== id) setDragOverId(id)
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    setDragOverId(null)
    setDraggedId(null)
    const fromId = e.dataTransfer.getData('text/plain')
    const fromIndex = categories.findIndex((c) => c.id === fromId)
    if (fromIndex < 0 || fromIndex === toIndex) return
    setMovingId(fromId)
    const reordered = [...categories]
    const [removed] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, removed)
    const updates = reordered.map((c, i) =>
      supabase.from('categories').update({ sort_order: i }).eq('id', c.id).eq('user_id', userId)
    )
    const results = await Promise.all(updates)
    setMovingId(null)
    const failed = results.find((r) => r.error)
    if (failed?.error) {
      alert(getCategoryErrorMessage(failed.error) || '순서 변경에 실패했습니다.')
      return
    }
    onCategoriesChange()
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <div className="pl-3 pr-0 py-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-subtle)]">
          카테고리
        </p>
        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-xl p-1.5 text-[var(--foreground-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            aria-label="카테고리 추가"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        ) : null}
      </div>

      {addOpen && (
        <div className="mb-2 space-y-1">
          <div className="flex flex-col gap-2">
            <textarea
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setAddError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setAddOpen(false); setNewName(''); setAddError(null); }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd()
              }}
              placeholder="과목 이름 (엔터로 줄바꿈, Ctrl+Enter로 추가)"
              rows={2}
              className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:border-[var(--border-focus)] focus:outline-none resize-none"
              autoFocus
              disabled={adding}
            />
            <div className="flex gap-1">
              <button type="button" onClick={handleAdd} disabled={adding} className="shrink-0 rounded-xl bg-[var(--accent)] px-2.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {adding ? '추가 중…' : '추가'}
              </button>
              <button type="button" onClick={() => { setAddOpen(false); setNewName(''); setAddError(null); }} disabled={adding} className="shrink-0 rounded-xl border border-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50">
                취소
              </button>
            </div>
          </div>
          {addError && (
            <p className="rounded border border-[var(--error)]/30 bg-[var(--error-muted)] px-2 py-1.5 text-xs text-[var(--error)]">
              {addError}
            </p>
          )}
        </div>
      )}

      <ul className="space-y-0.5">
        <li className="flex items-center gap-1 rounded-xl transition-colors hover:bg-[var(--surface-hover)]">
          <button
            type="button"
            onClick={() => { onSelectCategory(selectedCategoryId === '_favorites' ? null : '_favorites'); onMobileClose?.(); }}
            className={`flex min-w-0 flex-1 items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
              selectedCategoryId === '_favorites'
                ? 'bg-[var(--accent-muted)] font-medium text-[var(--accent)]'
                : 'text-[var(--foreground-muted)]'
            }`}
          >
            <span className="break-words whitespace-pre-wrap">즐겨찾기</span>
            {(notesCountByCategory['_favorites'] ?? 0) > 0 && (
              <span className="shrink-0 rounded-full bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs text-[var(--foreground-muted)]">
                {notesCountByCategory['_favorites']}
              </span>
            )}
          </button>
        </li>
        <li className="flex items-center gap-1 rounded-xl transition-colors hover:bg-[var(--surface-hover)]">
          <button
            type="button"
            onClick={() => { onSelectCategory(selectedCategoryId === '_none' ? null : '_none'); onMobileClose?.(); }}
            className={`flex min-w-0 flex-1 items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
              selectedCategoryId === '_none'
                ? 'bg-[var(--accent-muted)] font-medium text-[var(--accent)]'
                : 'text-[var(--foreground-muted)]'
            }`}
          >
            <span className="break-words whitespace-pre-wrap">
              미분류
            </span>
            {(notesCountByCategory['_none'] ?? 0) > 0 && (
              <span className="shrink-0 rounded-full bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs text-[var(--foreground-muted)]">
                {notesCountByCategory['_none']}
              </span>
            )}
          </button>
        </li>
        {categories.map((c, index) => (
          <li
            key={c.id}
            draggable={editingId !== c.id && deleteConfirmId !== c.id}
            onDragStart={(e) => handleDragStart(e, c.id)}
            onDragOver={(e) => handleDragOver(e, c.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`group flex items-center gap-0.5 rounded-xl transition-colors hover:bg-[var(--surface-hover)] ${
              editingId !== c.id && deleteConfirmId !== c.id ? 'cursor-grab active:cursor-grabbing' : ''
            } ${dragOverId === c.id ? 'ring-1 ring-[var(--accent)] bg-[var(--accent-muted)]/50' : ''} ${draggedId === c.id ? 'opacity-50' : ''}`}
          >
            {editingId === c.id ? (
              <div className="w-full space-y-1 px-3 py-2">
                <div className="flex flex-col gap-1">
                  <textarea
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setEditError(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setEditingId(null); setEditName(''); setEditError(null); }
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleUpdate(c.id)
                    }}
                    rows={2}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm focus:border-[var(--border-focus)] focus:outline-none resize-none"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button type="button" onClick={() => handleUpdate(c.id)} className="shrink-0 text-xs text-[var(--accent)] hover:underline">확인</button>
                    <button type="button" onClick={() => { setEditingId(null); setEditName(''); setEditError(null); }} className="shrink-0 text-xs text-[var(--foreground-muted)] hover:underline">취소</button>
                  </div>
                </div>
                {editError && <p className="text-xs text-[var(--error)]">{editError}</p>}
              </div>
            ) : deleteConfirmId === c.id ? (
              <div className="flex w-full items-center gap-1 px-2 py-1">
                <span className="flex-1 text-xs text-[var(--foreground-muted)]">삭제할까요? (노트는 미분류로)</span>
                <button type="button" onClick={() => handleDelete(c.id)} className="shrink-0 text-xs font-medium text-[var(--error)] hover:underline">삭제</button>
                <button type="button" onClick={() => setDeleteConfirmId(null)} className="shrink-0 text-xs text-[var(--foreground-muted)] hover:underline">취소</button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { onSelectCategory(selectedCategoryId === c.id ? null : c.id); onMobileClose?.(); }}
                  className={`flex min-w-0 flex-1 items-start gap-0 rounded-xl pl-3 pr-1 py-2 text-left text-sm transition-colors ${
                    selectedCategoryId === c.id
                      ? 'bg-[var(--accent-muted)] font-medium text-[var(--accent)]'
                      : 'text-[var(--foreground)]'
                  }`}
                >
                  <span className="break-words whitespace-pre-wrap min-w-0 flex-1">
                    {c.name}
                  </span>
                  {(notesCountByCategory[c.id] ?? 0) > 0 && (
                    <span className="shrink-0 rounded-full bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs text-[var(--foreground-muted)] ml-0.5">
                      {notesCountByCategory[c.id]}
                    </span>
                  )}
                </button>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                    className="rounded-lg p-1.5 text-[var(--foreground-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100"
                    aria-label="메뉴"
                    aria-expanded={menuOpenId === c.id}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {menuOpenId === c.id && (
                    <>
                      <div className="absolute right-0 top-full z-10 mt-1 flex flex-row gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => { handleMoveUp(index); setMenuOpenId(null); }}
                          disabled={index === 0 || movingId !== null}
                          className="flex items-center justify-center rounded-lg p-1.5 text-[var(--foreground-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          aria-label="위로"
                          title="위로"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleMoveDown(index); setMenuOpenId(null); }}
                          disabled={index === categories.length - 1 || movingId !== null}
                          className="flex items-center justify-center rounded-lg p-1.5 text-[var(--foreground-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          aria-label="아래로"
                          title="아래로"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => { startEdit(c); setMenuOpenId(null); }}
                          className="flex items-center justify-center rounded-lg p-1.5 text-[var(--foreground-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                          aria-label="수정"
                          title="수정"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteConfirmId(c.id); setMenuOpenId(null); }}
                          className="flex items-center justify-center rounded-lg p-1.5 text-[var(--foreground-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--error)]"
                          aria-label="삭제"
                          title="삭제"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div
                        className="fixed inset-0 z-0"
                        onClick={() => setMenuOpenId(null)}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {categories.length === 0 && !addOpen && (
        <p className="py-2 text-center text-xs text-[var(--foreground-subtle)]">
          + 버튼으로 과목을 추가하세요
        </p>
      )}
    </div>
  )
}
