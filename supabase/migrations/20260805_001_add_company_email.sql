-- 사업장 정보에 이메일 컬럼 추가
ALTER TABLE company_info
  ADD COLUMN IF NOT EXISTS email VARCHAR(200) NOT NULL DEFAULT '';

COMMENT ON COLUMN company_info.email IS '고객문의/제휴문의 대표 이메일';
