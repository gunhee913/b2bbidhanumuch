-- ============================================
-- 중도매인 메모 테이블
-- dealer 단위 공유, activeDate 기반 자동 초기화
--
-- dealer_favorites 와 같은 열쇠(dealer_id + active_date + target_type + target_id)를 쓴다.
-- 메모는 "이 개체/부위를 보고 남긴 말"이라 관심과 붙는 자리가 똑같고, 같은 열쇠여야
-- 상장표 1열에서 별 옆에 자국을 놓고 관심 목록에 함께 띄울 수 있다.
--
-- 관심과 다른 건 둘뿐이다 — 내용(body)이 있고, 고쳐 쓸 수 있어 updated_at 이 있다.
-- ============================================

CREATE TABLE IF NOT EXISTS dealer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  active_date TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'part')),
  target_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 한 대상에 메모는 하나 · 고쳐 쓰기는 upsert 로 받는다
CREATE UNIQUE INDEX IF NOT EXISTS idx_dealer_notes_unique
  ON dealer_notes(dealer_id, active_date, target_type, target_id);

-- 그날 메모를 통째로 읽는 조회용
CREATE INDEX IF NOT EXISTS idx_dealer_notes_dealer_date
  ON dealer_notes(dealer_id, active_date);

-- RLS · 관심과 같이 service_role 로만 드나든다 (API 라우트가 세션으로 dealer_id 를 정한다)
ALTER TABLE dealer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer_notes_service_role_all" ON dealer_notes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 같은 딜러의 다른 자리(다른 창 · 다른 직원)에서 고친 메모가 바로 따라오게
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'dealer_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dealer_notes;
  END IF;
END $$;

-- 코멘트
COMMENT ON TABLE dealer_notes IS '중도매인 메모 (딜러 단위 공유, 상장일별)';
COMMENT ON COLUMN dealer_notes.dealer_id IS '소속 중도매인 ID';
COMMENT ON COLUMN dealer_notes.active_date IS '상장일 (YYMMDD or YYYY-MM-DD)';
COMMENT ON COLUMN dealer_notes.target_type IS 'listing: 개체별, part: 부위별';
COMMENT ON COLUMN dealer_notes.target_id IS 'listingNo (개체별) 또는 part UUID (부위별)';
COMMENT ON COLUMN dealer_notes.body IS '메모 내용 · 빈 문자열이면 API 가 행을 지운다';
COMMENT ON COLUMN dealer_notes.created_by IS '처음 쓴 사용자 ID';
COMMENT ON COLUMN dealer_notes.updated_by IS '마지막으로 고친 사용자 ID';
