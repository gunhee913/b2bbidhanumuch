-- close_round 함수 수정: 카운트다운 경매는 started_at + duration으로 ended_at 계산
CREATE OR REPLACE FUNCTION close_round(p_auction_id UUID)
RETURNS void AS $$
DECLARE
    v_listing RECORD;
    v_part RECORD;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM auctions 
        WHERE id = p_auction_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION '진행 중인 회차만 마감할 수 있습니다.';
    END IF;

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

    UPDATE auctions
    SET status = 'closed',
        ended_at = CASE 
            WHEN round_duration_min IS NOT NULL AND round_duration_min > 0
                THEN started_at + (round_duration_min * interval '1 minute')
            ELSE NOW()
        END
    WHERE id = p_auction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION close_round IS '회차 마감 처리 - 카운트다운 경매는 정확한 종료시간 계산, 수동 경매는 NOW() 사용';
