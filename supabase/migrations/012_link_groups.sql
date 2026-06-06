-- ============================================================================
-- 012_link_groups.sql
-- 링크 그룹 및 소그룹 기능: study_links의 그룹/소그룹을 별도 테이블로 관리
-- ============================================================================

-- ============================================================================
-- link_groups 테이블: 사용자별 링크 그룹 관리
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_groups_user_id ON link_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_link_groups_sort_order ON link_groups(user_id, sort_order);

ALTER TABLE link_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own link groups
CREATE POLICY "Users can view their own link groups"
  ON link_groups FOR SELECT
  USING (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  );

-- Policy: Users can insert their own link groups
CREATE POLICY "Users can insert their own link groups"
  ON link_groups FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  );

-- Policy: Users can update their own link groups
CREATE POLICY "Users can update their own link groups"
  ON link_groups FOR UPDATE
  USING (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  )
  WITH CHECK (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  );

-- Policy: Users can delete their own link groups
CREATE POLICY "Users can delete their own link groups"
  ON link_groups FOR DELETE
  USING (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  );

-- ============================================================================
-- link_subgroups 테이블: 그룹별 소그룹 관리
-- ============================================================================
CREATE TABLE IF NOT EXISTS link_subgroups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES link_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_subgroups_group_id ON link_subgroups(group_id);
CREATE INDEX IF NOT EXISTS idx_link_subgroups_user_id ON link_subgroups(user_id);
CREATE INDEX IF NOT EXISTS idx_link_subgroups_sort_order ON link_subgroups(group_id, sort_order);

ALTER TABLE link_subgroups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own link subgroups
CREATE POLICY "Users can view their own link subgroups"
  ON link_subgroups FOR SELECT
  USING (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  );

-- Policy: Users can insert their own link subgroups
CREATE POLICY "Users can insert their own link subgroups"
  ON link_subgroups FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  );

-- Policy: Users can update their own link subgroups
CREATE POLICY "Users can update their own link subgroups"
  ON link_subgroups FOR UPDATE
  USING (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  )
  WITH CHECK (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  );

-- Policy: Users can delete their own link subgroups
CREATE POLICY "Users can delete their own link subgroups"
  ON link_subgroups FOR DELETE
  USING (
    auth.uid()::text = user_id OR
    user_id LIKE 'anonymous_%' OR
    auth.role() = 'anon'
  );

-- ============================================================================
-- study_links 테이블에 group_id, subgroup_id 컬럼 추가
-- ============================================================================
ALTER TABLE study_links ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES link_groups(id) ON DELETE SET NULL;
ALTER TABLE study_links ADD COLUMN IF NOT EXISTS subgroup_id UUID REFERENCES link_subgroups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_links_group_id ON study_links(group_id);
CREATE INDEX IF NOT EXISTS idx_study_links_subgroup_id ON study_links(subgroup_id);

-- ============================================================================
-- 기존 데이터 마이그레이션: category 필드를 파싱해서 그룹/소그룹 생성
-- ============================================================================
DO $$
DECLARE
  link_record RECORD;
  group_name TEXT;
  subgroup_name TEXT;
  group_id_val UUID;
  subgroup_id_val UUID;
  user_id_val TEXT;
  sort_order_val INTEGER;
BEGIN
  -- 모든 study_links를 순회하면서 category 필드를 파싱
  FOR link_record IN 
    SELECT DISTINCT user_id, category 
    FROM study_links 
    WHERE category IS NOT NULL AND category != ''
  LOOP
    user_id_val := link_record.user_id;
    
    -- "그룹명 > 소그룹명" 형식 파싱
    IF link_record.category LIKE '% > %' THEN
      group_name := TRIM(SPLIT_PART(link_record.category, ' > ', 1));
      subgroup_name := TRIM(SPLIT_PART(link_record.category, ' > ', 2));
    ELSE
      group_name := TRIM(link_record.category);
      subgroup_name := NULL;
    END IF;
    
    -- 그룹이 없으면 생성
    SELECT id INTO group_id_val 
    FROM link_groups 
    WHERE user_id = user_id_val AND name = group_name;
    
    IF group_id_val IS NULL THEN
      SELECT COALESCE(MAX(sort_order), -1) + 1 INTO sort_order_val
      FROM link_groups
      WHERE user_id = user_id_val;
      
      INSERT INTO link_groups (user_id, name, sort_order)
      VALUES (user_id_val, group_name, sort_order_val)
      RETURNING id INTO group_id_val;
    END IF;
    
    -- 소그룹이 있으면 생성
    IF subgroup_name IS NOT NULL AND subgroup_name != '' THEN
      SELECT id INTO subgroup_id_val
      FROM link_subgroups
      WHERE group_id = group_id_val AND name = subgroup_name;
      
      IF subgroup_id_val IS NULL THEN
        SELECT COALESCE(MAX(sort_order), -1) + 1 INTO sort_order_val
        FROM link_subgroups
        WHERE group_id = group_id_val;
        
        INSERT INTO link_subgroups (group_id, user_id, name, sort_order)
        VALUES (group_id_val, user_id_val, subgroup_name, sort_order_val)
        RETURNING id INTO subgroup_id_val;
      END IF;
    ELSE
      subgroup_id_val := NULL;
    END IF;
    
    -- 해당 category를 가진 모든 링크 업데이트
    UPDATE study_links
    SET group_id = group_id_val,
        subgroup_id = subgroup_id_val
    WHERE user_id = user_id_val 
      AND category = link_record.category
      AND (group_id IS NULL OR subgroup_id IS NULL);
  END LOOP;
END $$;
