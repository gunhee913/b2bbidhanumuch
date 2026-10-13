-- =============================================
-- 부위별 사진 (cattle_parts.images)
--
-- 지금까지 사진은 개체(cattle_listings.images) 단위뿐이라 등심 단면 한 장이 20부위를 다 대표했다.
-- 부위마다 사진을 따로 달 수 있게 배열 칸을 둔다. 비어 있으면 화면은 개체 사진(첫 장이 대표)을
-- 그대로 보여 준다 — 그래서 NULL 대신 빈 배열이 기본값이다.
-- 대표(메인) 사진은 따로 칸을 두지 않고 cattle_listings.images[0] 으로 못 박는다.
-- =============================================

ALTER TABLE cattle_parts
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN cattle_parts.images IS '부위 사진 URL 배열 (최대 4장) · 비어 있으면 개체 대표 사진(cattle_listings.images[0])을 보여 준다';
