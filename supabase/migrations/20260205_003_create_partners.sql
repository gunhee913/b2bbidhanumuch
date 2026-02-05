-- ============================================
-- 거래처 관리 테이블 마이그레이션
-- ============================================

-- 1. partners (거래처) 테이블
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_no VARCHAR(20) UNIQUE NOT NULL,           -- 거래처번호 (10001 형식)
  name VARCHAR(100) NOT NULL,                        -- 거래처명
  business_no VARCHAR(20),                           -- 사업자번호 (123-45-67890)
  representative VARCHAR(50),                        -- 대표자
  phone VARCHAR(20),                                 -- 연락처
  address VARCHAR(255),                              -- 주소
  business_type VARCHAR(50),                         -- 거래처구분 (음식점, 일반정육점, 마트 등)
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- 중도매인 연결 (최대 3명)
  dealer1_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  dealer2_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  dealer3_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_partners_partner_no ON partners(partner_no);
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);
CREATE INDEX IF NOT EXISTS idx_partners_business_type ON partners(business_type);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_dealer1_id ON partners(dealer1_id);
CREATE INDEX IF NOT EXISTS idx_partners_dealer2_id ON partners(dealer2_id);
CREATE INDEX IF NOT EXISTS idx_partners_dealer3_id ON partners(dealer3_id);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
-- 서비스 역할 전체 접근
CREATE POLICY "partners_service_role_all" ON partners
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. 코멘트
COMMENT ON TABLE partners IS '거래처 정보';
COMMENT ON COLUMN partners.partner_no IS '거래처번호 (10001 형식)';
COMMENT ON COLUMN partners.name IS '거래처명';
COMMENT ON COLUMN partners.business_no IS '사업자번호';
COMMENT ON COLUMN partners.representative IS '대표자';
COMMENT ON COLUMN partners.phone IS '연락처';
COMMENT ON COLUMN partners.address IS '주소';
COMMENT ON COLUMN partners.business_type IS '거래처구분 (음식점, 일반정육점, 마트, 육가공장, 기타)';
COMMENT ON COLUMN partners.dealer1_id IS '담당 중도매인 1';
COMMENT ON COLUMN partners.dealer2_id IS '담당 중도매인 2';
COMMENT ON COLUMN partners.dealer3_id IS '담당 중도매인 3';

-- 6. 자동번호 생성 함수
CREATE OR REPLACE FUNCTION generate_partner_no()
RETURNS TRIGGER AS $$
DECLARE
  max_no INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(partner_no AS INTEGER)), 10000)
  INTO max_no
  FROM partners
  WHERE partner_no ~ '^\d+$';
  
  NEW.partner_no := (max_no + 1)::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 트리거: 자동 번호 생성
CREATE TRIGGER trigger_generate_partner_no
  BEFORE INSERT ON partners
  FOR EACH ROW
  WHEN (NEW.partner_no IS NULL OR NEW.partner_no = '')
  EXECUTE FUNCTION generate_partner_no();

-- 8. 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_partners_updated_at();
