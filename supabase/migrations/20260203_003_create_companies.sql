-- =============================================
-- 상장업체(companies) 및 직원(company_employees) 테이블 생성
-- =============================================

-- companies 테이블 (상장업체)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_no VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  business_no VARCHAR(20) UNIQUE NOT NULL,
  ceo VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- company_employees 테이블 (상장업체 직원)
CREATE TABLE IF NOT EXISTS company_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_company_no ON companies(company_no);
CREATE INDEX IF NOT EXISTS idx_companies_business_no ON companies(business_no);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

CREATE INDEX IF NOT EXISTS idx_company_employees_company_id ON company_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_company_employees_phone ON company_employees(phone);
CREATE INDEX IF NOT EXISTS idx_company_employees_status ON company_employees(status);

-- RLS 활성화
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_employees ENABLE ROW LEVEL SECURITY;

-- RLS 정책: service_role은 모든 작업 가능
CREATE POLICY "Service role can do all on companies"
  ON companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do all on company_employees"
  ON company_employees
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE companies IS '상장업체 테이블';
COMMENT ON COLUMN companies.id IS '상장업체 고유 ID';
COMMENT ON COLUMN companies.company_no IS '업체번호';
COMMENT ON COLUMN companies.name IS '업체명';
COMMENT ON COLUMN companies.business_no IS '사업자등록번호';
COMMENT ON COLUMN companies.ceo IS '대표자';
COMMENT ON COLUMN companies.phone IS '대표번호';
COMMENT ON COLUMN companies.status IS '상태 (active: 활성, inactive: 비활성)';
COMMENT ON COLUMN companies.created_at IS '등록일';
COMMENT ON COLUMN companies.last_login_at IS '최근 로그인 일시';

COMMENT ON TABLE company_employees IS '상장업체 직원 테이블';
COMMENT ON COLUMN company_employees.id IS '직원 고유 ID';
COMMENT ON COLUMN company_employees.company_id IS '소속 상장업체 ID';
COMMENT ON COLUMN company_employees.role IS '구분 (대표, 직원 등)';
COMMENT ON COLUMN company_employees.name IS '이름';
COMMENT ON COLUMN company_employees.phone IS '연락처 (로그인 ID로 사용)';
COMMENT ON COLUMN company_employees.password_hash IS '비밀번호 해시 (bcrypt)';
COMMENT ON COLUMN company_employees.address IS '주소';
COMMENT ON COLUMN company_employees.status IS '상태 (active: 활성, inactive: 비활성)';
COMMENT ON COLUMN company_employees.created_at IS '등록일';
COMMENT ON COLUMN company_employees.last_login_at IS '최근 로그인 일시';
