-- ============================================================
-- 사진 보정 기록 · 비파괴 편집
-- ============================================================
-- 등록 화면의 사진 편집기(자르기 · 회전 · 반전 · 밝기 · 대비 · 색온도)는 결과를
-- 새 파일로 올리고, 화면(listings.images · cattle_parts.images)에는 그 URL 만 들어간다.
-- 그 URL 을 키로 「어느 원본에서 어떤 값으로 만들었나」 를 여기 남긴다.
--
--   - 편집기를 다시 열면 원본 위에 슬라이더가 전 자리로 돌아온다 (화질 누적 손실 없음)
--   - 「원본으로」 한 번이면 되돌아간다
--   - 분쟁 때 원본을 꺼낼 수 있다 (사진은 입찰 근거다)
--
-- 원본 파일은 저장소에 그대로 남긴다. 화면 쪽 테이블은 손대지 않는다.
-- ============================================================

CREATE TABLE IF NOT EXISTS image_edits (
  edited_url   TEXT PRIMARY KEY,
  original_url TEXT NOT NULL,
  params       JSONB NOT NULL,
  updated_by   TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS image_edits_original_idx ON image_edits (original_url);

COMMENT ON TABLE image_edits IS '사진 보정 기록 · 보정 결과 URL → 원본 URL + 보정값(비파괴 편집용)';
COMMENT ON COLUMN image_edits.edited_url IS '보정 결과 파일의 public URL · 화면 테이블(images 배열)에 들어가는 값';
COMMENT ON COLUMN image_edits.original_url IS '보정 전 원본 파일의 public URL · 여러 번 고쳐도 늘 최초 원본';
COMMENT ON COLUMN image_edits.params IS 'PhotoEditParams · { area{x,y,width,height}, rotation, flip, brightness, contrast, temperature } · area 는 반전·회전 뒤 원본 픽셀 좌표';

ALTER TABLE image_edits ENABLE ROW LEVEL SECURITY;

-- 읽기 · 쓰기 모두 service role(서버 API) 만 · anon/authenticated 정책 없음
