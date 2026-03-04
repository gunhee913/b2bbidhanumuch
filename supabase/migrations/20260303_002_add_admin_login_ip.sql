-- admins 테이블에 최근 로그인 IP 컬럼 추가
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

COMMENT ON COLUMN admins.last_login_ip IS '최근 로그인 IP 주소';
