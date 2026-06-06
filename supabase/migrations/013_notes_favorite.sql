-- ============================================================================
-- 013_notes_favorite.sql
-- 노트 즐겨찾기 기능
-- ============================================================================

ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(user_id, is_favorite) WHERE is_favorite = true;
