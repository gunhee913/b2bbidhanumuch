-- companies 테이블에 정산 계좌번호 컬럼 추가
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account TEXT;

COMMENT ON COLUMN companies.bank_account IS '정산 계좌번호 (은행명 + 계좌번호)';
