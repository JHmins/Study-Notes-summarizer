import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as {
      category_id?: string | null
      category_ids?: string[]
      is_favorite?: boolean
    }
    const categoryIds = body.category_ids
    const isFavorite = body.is_favorite
    const legacyCategoryId = body.category_id === undefined ? undefined : (body.category_id === null || body.category_id === '' ? null : body.category_id)
    if (categoryIds === undefined && legacyCategoryId === undefined && isFavorite === undefined) {
      return NextResponse.json({ error: 'category_ids, category_id 또는 is_favorite 중 하나가 필요합니다.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: note, error: fetchError } = await admin
      .from('notes')
      .select('id, user_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !note) {
      return NextResponse.json({ error: '노트를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (note.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (categoryIds !== undefined) {
      const ids = Array.isArray(categoryIds) ? categoryIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : []
      await admin.from('note_categories').delete().eq('note_id', params.id)
      if (ids.length > 0) {
        await admin.from('note_categories').insert(ids.map((category_id) => ({ note_id: params.id, category_id })))
      }
      const primaryId = ids[0] ?? null
      await admin.from('notes').update({ category_id: primaryId }).eq('id', params.id).eq('user_id', user.id)
    } else if (legacyCategoryId !== undefined) {
      await admin.from('note_categories').delete().eq('note_id', params.id)
      if (legacyCategoryId) {
        await admin.from('note_categories').insert({ note_id: params.id, category_id: legacyCategoryId })
      }
      await admin.from('notes').update({ category_id: legacyCategoryId }).eq('id', params.id).eq('user_id', user.id)
    }

    if (isFavorite !== undefined) {
      const { error: updateError } = await admin
        .from('notes')
        .update({ is_favorite: isFavorite })
        .eq('id', params.id)
        .eq('user_id', user.id)
      if (updateError) {
        return NextResponse.json({ error: updateError.message || '변경에 실패했습니다.' }, { status: 500 })
      }
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Note category update error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '카테고리 변경 중 오류가 났습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: note, error: fetchError } = await admin
      .from('notes')
      .select('id, user_id, file_path')
      .eq('id', params.id)
      .single()

    if (fetchError || !note) {
      return NextResponse.json({ error: '노트를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (note.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (note.file_path) {
      await admin.storage.from('study-notes').remove([note.file_path])
    }
    await admin.from('notes').delete().eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Note delete error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '삭제 중 오류가 났습니다.' },
      { status: 500 }
    )
  }
}
