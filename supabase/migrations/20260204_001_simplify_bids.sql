-- =============================================
-- 입찰 시스템 단순화
-- auction_id 의존성 제거, listing_id 추가
-- =============================================

-- 1. auction_id를 optional로 변경
ALTER TABLE bids ALTER COLUMN auction_id DROP NOT NULL;

-- 2. listing_id 컬럼 추가 (부위에서 상장 조회 가능하지만 편의상)
ALTER TABLE bids ADD COLUMN listing_id UUID REFERENCES cattle_listings(id) ON DELETE CASCADE;

-- 3. 기존 데이터의 listing_id 채우기 (part_id로부터)
UPDATE bids b
SET listing_id = cp.listing_id
FROM cattle_parts cp
WHERE b.part_id = cp.id AND b.listing_id IS NULL;

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_bids_listing ON bids(listing_id);

-- 5. unique constraint 수정 (auction_id 없이도 동작하도록)
-- 기존: UNIQUE (auction_id, part_id, dealer_id)
-- 새로: 같은 부위에 같은 중도매인은 한 번만 입찰 가능 (auction 무관)
ALTER TABLE bids DROP CONSTRAINT IF EXISTS unique_bid_per_part;
ALTER TABLE bids ADD CONSTRAINT unique_bid_per_part UNIQUE (part_id, dealer_id);

-- 6. close_auction 함수 수정 (auction_id 없는 입찰도 처리)
CREATE OR REPLACE FUNCTION close_listing(p_listing_id UUID)
RETURNS void AS $$
DECLARE
    v_part RECORD;
BEGIN
    -- 각 부위별로 최고 입찰자 결정
    FOR v_part IN 
        SELECT id FROM cattle_parts WHERE listing_id = p_listing_id
    LOOP
        -- 순위 업데이트
        WITH ranked_bids AS (
            SELECT 
                id,
                ROW_NUMBER() OVER (ORDER BY bid_price DESC, created_at ASC) as rank
            FROM bids
            WHERE part_id = v_part.id
        )
        UPDATE bids b
        SET rank = rb.rank,
            is_winning = (rb.rank = 1)
        FROM ranked_bids rb
        WHERE b.id = rb.id;
    END LOOP;

    -- 상장 상태를 completed로 변경
    UPDATE cattle_listings
    SET status = 'completed'
    WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION close_listing IS '상장 마감 처리 - 부위별 낙찰자 결정 및 상태 업데이트';
