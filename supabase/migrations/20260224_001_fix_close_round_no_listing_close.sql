-- close_round 함수 수정: 상장 상태를 자동으로 변경하지 않음 (관리자 수동 마감)
CREATE OR REPLACE FUNCTION close_round(p_auction_id UUID)
RETURNS void AS $$
DECLARE
    v_listing RECORD;
    v_part RECORD;
BEGIN
    -- 경매(회차) 상태 확인
    IF NOT EXISTS (
        SELECT 1 FROM auctions 
        WHERE id = p_auction_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION '진행 중인 회차만 마감할 수 있습니다.';
    END IF;

    -- 해당 회차에 배정된 각 상장의 각 부위별로 낙찰자 결정
    FOR v_listing IN
        SELECT listing_id FROM auction_listings WHERE auction_id = p_auction_id
    LOOP
        FOR v_part IN
            SELECT id FROM cattle_parts WHERE listing_id = v_listing.listing_id
        LOOP
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
    END LOOP;

    -- 회차 상태를 closed로 변경
    UPDATE auctions
    SET status = 'closed',
        ended_at = NOW()
    WHERE id = p_auction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION close_round IS '회차 마감 처리 - 낙찰자 결정만 수행, 상장 마감은 관리자가 수동으로 처리';
