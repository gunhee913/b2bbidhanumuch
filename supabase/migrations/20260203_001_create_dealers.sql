-- ============================================
-- 중도매인 관리 테이블 마이그레이션
-- Phase 1: dealers, dealer_employees
-- ============================================

-- 1. dealers (중도매인) 테이블
CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_no VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  auction_password_hash VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 2. dealer_employees (직원/경매대리인) 테이블
CREATE TABLE IF NOT EXISTS dealer_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  role VARCHAR(50),
  position VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_dealers_phone ON dealers(phone);
CREATE INDEX IF NOT EXISTS idx_dealers_dealer_no ON dealers(dealer_no);
CREATE INDEX IF NOT EXISTS idx_dealers_status ON dealers(status);

CREATE INDEX IF NOT EXISTS idx_dealer_employees_dealer_id ON dealer_employees(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_employees_phone ON dealer_employees(phone);
CREATE INDEX IF NOT EXISTS idx_dealer_employees_status ON dealer_employees(status);

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_employees ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책: 관리자는 모든 작업 가능
-- 참고: 실제 관리자 역할 체크는 애플리케이션 레벨에서 처리
-- service_role 키를 사용하면 RLS 우회 가능

-- 인증된 사용자 읽기 정책 (본인 정보만)
CREATE POLICY "dealers_select_own" ON dealers
  FOR SELECT
  TO authenticated
  USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "dealer_employees_select_own" ON dealer_employees
  FOR SELECT
  TO authenticated
  USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

-- 서비스 역할 전체 접근 (관리자용 API에서 service_role 키 사용)
CREATE POLICY "dealers_service_role_all" ON dealers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "dealer_employees_service_role_all" ON dealer_employees
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. 코멘트
COMMENT ON TABLE dealers IS '중도매인 정보';
COMMENT ON COLUMN dealers.dealer_no IS '중도매인 번호 (7000001 형식)';
COMMENT ON COLUMN dealers.phone IS '연락처 (로그인 ID로 사용)';
COMMENT ON COLUMN dealers.password_hash IS '로그인 비밀번호 (bcrypt 해시)';
COMMENT ON COLUMN dealers.auction_password_hash IS '경매 비밀번호 (bcrypt 해시)';

COMMENT ON TABLE dealer_employees IS '중도매인 소속 직원/경매대리인';
COMMENT ON COLUMN dealer_employees.dealer_id IS '소속 중도매인 ID';
COMMENT ON COLUMN dealer_employees.role IS '구분 (경매대리인, 직원 등)';
COMMENT ON COLUMN dealer_employees.position IS '직책 (대리, 사원 등)';
