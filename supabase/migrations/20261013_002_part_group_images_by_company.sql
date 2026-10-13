-- =============================================
-- 부위 대표이미지 · 업체별
--
-- 지금까지는 부위 대분류(등심 · 안심 …)마다 사진 한 장이 전체 공통이었다. 상장업체마다
-- 작업장 · 포장 · 절단 모양이 달라 "우리 업체 등심은 이렇게 나간다" 를 보여 주고 싶다는
-- 요구라, 업체별 한 벌을 둘 수 있게 한다.
--
--  - company_id NULL  = 전체 기본 (예전 행이 그대로 여기 남는다)
--  - company_id 있음  = 그 업체 전용 · 화면은 업체 것 → 전체 기본 → 없음 순으로 찾는다
--
-- 부위 사진이 따로 올라온 부위(cattle_parts.images)는 그 사진이 먼저다. 이 표는
-- 「부위 사진이 없을 때 대신 거는 사진」 이다.
-- =============================================

ALTER TABLE part_group_images DROP CONSTRAINT IF EXISTS part_group_images_pkey;

ALTER TABLE part_group_images
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE part_group_images ADD PRIMARY KEY (id);

-- 업체별로는 부위마다 한 장 · 전체 기본도 부위마다 한 장 (NULL 은 UNIQUE 가 서로 다른 값으로 보므로 따로 건다)
CREATE UNIQUE INDEX IF NOT EXISTS part_group_images_company_group_uq
  ON part_group_images (company_id, group_name)
  WHERE company_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS part_group_images_default_group_uq
  ON part_group_images (group_name)
  WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS part_group_images_company_idx
  ON part_group_images (company_id);

COMMENT ON TABLE part_group_images IS '부위 대분류별 대표이미지 · 업체별(company_id) 또는 전체 기본(NULL) · 부위 사진이 없을 때 대신 건다';
COMMENT ON COLUMN part_group_images.company_id IS '상장업체 · NULL 이면 전체 기본값';
