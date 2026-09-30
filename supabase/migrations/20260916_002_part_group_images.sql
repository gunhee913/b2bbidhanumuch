-- 부위 대표이미지
-- 라이브 경매 좌측 사이드바(부위별 탭) 사진 모드에서 각 부위 그룹(등심·안심·채끝 …)에 보여줄
-- 대표 사진. 상장(개체) 사진은 등심 단면 1장만 올라오므로 부위별 사진은 관리자가 별도 등록한다.
-- group_name 은 `toPartGroupName()` 결과(좌/우 제거한 대분류, 예: "등심") 와 일치해야 한다.

CREATE TABLE IF NOT EXISTS part_group_images (
  group_name  VARCHAR(50) PRIMARY KEY,
  image_url   TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT
);

COMMENT ON TABLE part_group_images IS '부위 대분류별 대표이미지 (관리자 등록 · 라이브 사이드바 사진 모드용)';
COMMENT ON COLUMN part_group_images.group_name IS '부위 대분류명 (좌/우 제거, 예: 등심 · 토시·제비)';
COMMENT ON COLUMN part_group_images.image_url IS 'Supabase storage public URL (bucket: image / folder: part-groups)';

ALTER TABLE part_group_images ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능 (공개 라이브 페이지에서 사용)
DROP POLICY IF EXISTS part_group_images_select_all ON part_group_images;
CREATE POLICY part_group_images_select_all
  ON part_group_images FOR SELECT
  USING (true);

-- 쓰기는 service role(관리자 API) 만 · anon/authenticated 정책 없음
