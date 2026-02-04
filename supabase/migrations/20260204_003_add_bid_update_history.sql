-- 입찰 수정 이력 컬럼 추가
-- updated_by는 TEXT로 저장 (수정자 이름)
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 기존 foreign key 제약이 있으면 제거
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_updated_by_fkey;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_bids_updated_at ON bids(updated_at);
