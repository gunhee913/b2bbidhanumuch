-- ============================================
-- 매참인 신청 접수 테이블
-- 게시판 방식 · 관리자는 신청 내역을 열람하고 처리 상태만 라벨링
-- ============================================

CREATE TABLE IF NOT EXISTS dealer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 개인 정보
  applicant_name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(120),
  password_hash VARCHAR(255) NOT NULL,
  auction_password_hash VARCHAR(255) NOT NULL,

  -- 사업자 정보
  business_name VARCHAR(120) NOT NULL,
  business_no VARCHAR(20) NOT NULL,
  representative_name VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  business_type VARCHAR(20) NOT NULL CHECK (business_type IN ('individual', 'corporation')),

  -- 거래 희망 사항
  preferred_slaughter_houses TEXT[] DEFAULT '{}',
  preferred_parts TEXT[] DEFAULT '{}',
  preferred_grades TEXT[] DEFAULT '{}',
  expected_monthly_volume VARCHAR(30),
  distribution_channels TEXT[] DEFAULT '{}',
  inquiry TEXT,

  -- 약정 동의 이력
  agreed_service BOOLEAN NOT NULL DEFAULT false,
  agreed_privacy BOOLEAN NOT NULL DEFAULT false,
  agreed_trade BOOLEAN NOT NULL DEFAULT false,
  agreed_marketing BOOLEAN NOT NULL DEFAULT false,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  agreed_ip VARCHAR(45),
  agreed_user_agent TEXT,

  -- 처리 상태 (관리자 라벨링)
  handle_status VARCHAR(20) NOT NULL DEFAULT 'unread'
    CHECK (handle_status IN ('unread', 'viewed', 'contacted', 'onhold', 'done')),
  admin_note TEXT,
  handled_by TEXT,
  handled_at TIMESTAMPTZ,

  -- 메타
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dealer_applications_created_at
  ON dealer_applications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dealer_applications_status
  ON dealer_applications (handle_status);

CREATE INDEX IF NOT EXISTS idx_dealer_applications_phone
  ON dealer_applications (phone);

-- RLS
ALTER TABLE dealer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer_applications_service_role_all" ON dealer_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE dealer_applications IS '매참인 신청 접수 게시판 · 관리자 열람 전용';
COMMENT ON COLUMN dealer_applications.handle_status IS 'unread: 미확인, viewed: 확인함, contacted: 연락완료, onhold: 보류, done: 처리완료';
COMMENT ON COLUMN dealer_applications.preferred_slaughter_houses IS '거래 희망 공판장 슬러그 배열 (eumseong, bucheon, naju, goryeong)';
COMMENT ON COLUMN dealer_applications.preferred_parts IS '주요 필요 부위 (등심, 안심, 채끝 등)';
COMMENT ON COLUMN dealer_applications.preferred_grades IS '관심 등급대 (1++, 1+, 1, 2-)';
COMMENT ON COLUMN dealer_applications.expected_monthly_volume IS '예상 월 거래량 (under_500kg, 500_2000, 2000_5000, over_5000)';
COMMENT ON COLUMN dealer_applications.distribution_channels IS '유통 채널 (wholesale, retail, foodservice, butcher, distributor, etc)';
