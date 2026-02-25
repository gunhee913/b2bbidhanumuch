-- 재경매 시간 설정을 위한 컬럼 추가
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS reauction_duration_min integer DEFAULT NULL;
