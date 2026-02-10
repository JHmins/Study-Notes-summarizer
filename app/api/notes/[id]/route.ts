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

    const body = await request.json().catch(() => ({})) as { category_id?: string | null; is_favorite?: boolean }
    const categoryId = body.category_id === undefined ? undefined : (body.category_id === null || body.category_id === '' ? null : body.category_id)
    const isFavorite = body.is_favorite
    if (categoryId === undefined && isFavorite === undefined) {
      return NextResponse.json({ error: 'category_id 또는 is_favorite 중 하나가 필요합니다.' }, { status: 400 })
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

    const updates: { category_id?: string | null; is_favorite?: boolean } = {}
    if (categoryId !== undefined) updates.category_id = categoryId
    if (isFavorite !== undefined) updates.is_favorite = isFavorite

    const { error: updateError } = await admin
      .from('notes')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message || '변경에 실패했습니다.' }, { status: 500 })
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
