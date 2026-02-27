-- 경매 시작/종료 담당자 기록용 컬럼 추가
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS started_by TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS ended_by TEXT;
