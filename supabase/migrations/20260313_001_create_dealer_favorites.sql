-- ============================================
-- 중도매인 관심(즐겨찾기) 테이블
-- dealer 단위 공유, activeDate 기반 자동 초기화
-- ============================================

CREATE TABLE IF NOT EXISTS dealer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  active_date TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'part')),
  target_id TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 동일 딜러 + 날짜 + 타입 + 대상 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_dealer_favorites_unique
  ON dealer_favorites(dealer_id, active_date, target_type, target_id);

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_dealer_favorites_dealer_date
  ON dealer_favorites(dealer_id, active_date);

-- RLS
ALTER TABLE dealer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer_favorites_service_role_all" ON dealer_favorites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE dealer_favorites IS '중도매인 관심 목록 (딜러 단위 공유)';
COMMENT ON COLUMN dealer_favorites.dealer_id IS '소속 중도매인 ID';
COMMENT ON COLUMN dealer_favorites.active_date IS '상장일 (YYMMDD or YYYY-MM-DD)';
COMMENT ON COLUMN dealer_favorites.target_type IS 'listing: 개체별, part: 부위별';
COMMENT ON COLUMN dealer_favorites.target_id IS 'listingNo (개체별) 또는 part UUID (부위별)';
COMMENT ON COLUMN dealer_favorites.created_by IS '관심 등록한 사용자 ID (dealer 또는 employee)';
