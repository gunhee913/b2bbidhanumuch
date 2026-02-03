-- =============================================
-- 관리자(admins) 테이블 생성
-- =============================================

-- admins 테이블
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department VARCHAR(100) NOT NULL,
  position VARCHAR(50),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('master', 'admin')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_admins_phone ON admins(phone);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- RLS 활성화
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS 정책: service_role은 모든 작업 가능
CREATE POLICY "Service role can do all on admins"
  ON admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS 정책: authenticated 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Authenticated users can view own admin record"
  ON admins
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- 코멘트
COMMENT ON TABLE admins IS '관리자 테이블';
COMMENT ON COLUMN admins.id IS '관리자 고유 ID';
COMMENT ON COLUMN admins.department IS '소속';
COMMENT ON COLUMN admins.name IS '이름';
COMMENT ON COLUMN admins.phone IS '연락처 (로그인 ID로 사용)';
COMMENT ON COLUMN admins.password_hash IS '비밀번호 해시 (bcrypt)';
COMMENT ON COLUMN admins.role IS '권한 (master: 마스터권한, admin: 관리자)';
COMMENT ON COLUMN admins.status IS '상태 (active: 활성, inactive: 비활성)';
COMMENT ON COLUMN admins.created_at IS '등록일';
COMMENT ON COLUMN admins.last_login_at IS '최근 로그인 일시';
