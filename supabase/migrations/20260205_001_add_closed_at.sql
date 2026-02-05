-- 상장 마감일시 컬럼 추가
ALTER TABLE cattle_listings 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_cattle_listings_closed_at ON cattle_listings(closed_at);
CREATE INDEX IF NOT EXISTS idx_cattle_listings_status ON cattle_listings(status);
