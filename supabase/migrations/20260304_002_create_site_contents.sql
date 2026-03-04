-- 사이트 콘텐츠 테이블 (이용약관, 개인정보처리방침 등 단일 텍스트 관리)
CREATE TABLE IF NOT EXISTS site_contents (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_contents (id, title, content) VALUES
  ('terms', '이용약관', ''),
  ('privacy', '개인정보처리방침', '')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE site_contents IS '사이트 콘텐츠 (약관, 개인정보 등)';

-- 사업장 정보 테이블
CREATE TABLE IF NOT EXISTS company_info (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  name VARCHAR(100) NOT NULL DEFAULT '',
  representative VARCHAR(100) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  fax VARCHAR(50) NOT NULL DEFAULT '',
  business_number VARCHAR(20) NOT NULL DEFAULT '',
  ecommerce_number VARCHAR(100) NOT NULL DEFAULT '',
  address VARCHAR(300) NOT NULL DEFAULT '',
  business_hours VARCHAR(200) NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO company_info (id, name, representative, phone, fax, business_number, ecommerce_number, address, business_hours) VALUES
  ('default', '농협 중부미트센터', '', '031-123-4567', '031-123-4568', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE company_info IS '사업장 정보';
