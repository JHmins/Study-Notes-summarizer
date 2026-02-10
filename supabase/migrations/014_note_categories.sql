-- ============================================================================
-- 014_note_categories.sql
-- 노트-카테고리 다대다: 한 노트가 여러 카테고리에 속할 수 있음
-- Note-categories many-to-many with UUID-safe RLS policies
-- ============================================================================

-- (1) 테이블 생성
CREATE TABLE IF NOT EXISTS note_categories (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_note_categories_note_id ON note_categories(note_id);
CREATE INDEX IF NOT EXISTS idx_note_categories_category_id ON note_categories(category_id);
ALTER TABLE note_categories ENABLE ROW LEVEL SECURITY;

-- (2) RLS 정책: UUID로 직접 비교 (notes.user_id는 UUID)
DROP POLICY IF EXISTS "Users can view note_categories for their notes" ON note_categories;
DROP POLICY IF EXISTS "Users can insert note_categories for their notes" ON note_categories;
DROP POLICY IF EXISTS "Users can delete note_categories for their notes" ON note_categories;

CREATE POLICY "Users can view note_categories for their notes"
  ON note_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_categories.note_id
        AND (
          n.user_id = (SELECT auth.uid())
          OR n.user_id::text LIKE 'anonymous_%'
          OR auth.role() = 'anon'
        )
    )
  );

CREATE POLICY "Users can insert note_categories for their notes"
  ON note_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_categories.note_id
        AND (
          n.user_id = (SELECT auth.uid())
          OR n.user_id::text LIKE 'anonymous_%'
          OR auth.role() = 'anon'
        )
    )
  );

CREATE POLICY "Users can delete note_categories for their notes"
  ON note_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_categories.note_id
        AND (
          n.user_id = (SELECT auth.uid())
          OR n.user_id::text LIKE 'anonymous_%'
          OR auth.role() = 'anon'
        )
    )
  );

-- (3) 기존 데이터 이전 (타입을 UUID로 확실히 맞춤)
INSERT INTO note_categories (note_id, category_id)
SELECT n.id::uuid, n.category_id::uuid FROM notes n
WHERE n.category_id IS NOT NULL
ON CONFLICT (note_id, category_id) DO NOTHING;
