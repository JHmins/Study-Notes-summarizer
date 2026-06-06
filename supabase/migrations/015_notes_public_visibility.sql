-- ============================================================================
-- 015_notes_public_visibility.sql
-- 공개 관람 노출 제어용 컬럼 추가 (관리자 노트 공개/숨김)
-- ============================================================================

ALTER TABLE notes
ADD COLUMN IF NOT EXISTS is_public BOOLEAN;

UPDATE notes
SET is_public = true
WHERE is_public IS NULL;

ALTER TABLE notes
ALTER COLUMN is_public SET DEFAULT true;

ALTER TABLE notes
ALTER COLUMN is_public SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_public_completed
  ON notes (user_id, created_at DESC)
  WHERE is_public = true AND status = 'completed';
