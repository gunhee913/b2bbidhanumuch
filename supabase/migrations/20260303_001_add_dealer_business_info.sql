-- dealers 테이블에 대표자명, 사업자등록번호 컬럼 추가
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS representative_name VARCHAR(100);
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS business_no VARCHAR(20);

COMMENT ON COLUMN dealers.representative_name IS '대표자명';
COMMENT ON COLUMN dealers.business_no IS '사업자등록번호';
