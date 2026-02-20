-- =============================================
-- 회차별 경매 시스템
-- auctions 테이블에 라운드 관련 컬럼 추가
-- =============================================

-- 1. auctions 테이블에 회차 관련 컬럼 추가
DO $$
BEGIN
    -- 회차 번호 (1, 2, 3...)
    ALTER TABLE auctions ADD COLUMN round_no INT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    -- 회차당 경매 시간 (분)
    ALTER TABLE auctions ADD COLUMN round_duration_min INT DEFAULT 5;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    -- 회차 간 텀 (분)
    ALTER TABLE auctions ADD COLUMN term_duration_min INT DEFAULT 2;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    -- 자동 다음 회차 시작 여부
    ALTER TABLE auctions ADD COLUMN auto_next_round BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    -- 경매 세션 ID (같은 날 같은 세션의 회차들을 묶는 용도, 1회차의 id를 사용)
    ALTER TABLE auctions ADD COLUMN session_id UUID REFERENCES auctions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    -- 실제 시작 시각 (timestamp, 타이머 계산용)
    ALTER TABLE auctions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    -- 실제 종료 시각 (timestamp, 마감 시각)
    ALTER TABLE auctions ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_auctions_session ON auctions(session_id);
CREATE INDEX IF NOT EXISTS idx_auctions_round ON auctions(session_id, round_no);

-- 3. close_round 함수: 회차 마감 + 낙찰 결정
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

        -- 상장 상태를 completed로 변경
        UPDATE cattle_listings
        SET status = 'completed'
        WHERE id = v_listing.listing_id;
    END LOOP;

    -- 회차 상태를 closed로 변경
    UPDATE auctions
    SET status = 'closed',
        ended_at = NOW()
    WHERE id = p_auction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION close_round IS '회차 마감 처리 - 해당 회차 상장들의 부위별 낙찰자 결정';

-- 4. 코멘트
COMMENT ON COLUMN auctions.round_no IS '회차 번호 (1, 2, 3...)';
COMMENT ON COLUMN auctions.round_duration_min IS '회차당 경매 시간 (분, 기본 5분)';
COMMENT ON COLUMN auctions.term_duration_min IS '회차 간 텀 (분, 기본 2분)';
COMMENT ON COLUMN auctions.auto_next_round IS '자동 다음 회차 시작 여부';
COMMENT ON COLUMN auctions.session_id IS '경매 세션 ID (같은 세션의 회차들을 묶음, 1회차 id 사용)';
COMMENT ON COLUMN auctions.started_at IS '실제 시작 시각 (타이머 계산용)';
COMMENT ON COLUMN auctions.ended_at IS '실제 종료 시각';

-- 5. Realtime 활성화 (auctions 테이블 변경 감지용)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE auctions;
EXCEPTION WHEN others THEN NULL;
END $$;
