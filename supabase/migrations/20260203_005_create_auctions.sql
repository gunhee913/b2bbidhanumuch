-- =============================================
-- 경매 테이블 (auctions)
-- 경매 회차 정보 (일자별 경매 세션)
-- =============================================

CREATE TABLE auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 경매 기본 정보
    auction_date DATE NOT NULL,                   -- 경매일
    auction_no VARCHAR(20) NOT NULL UNIQUE,       -- 경매번호 (YYMMDD-001 형식)
    title VARCHAR(200),                           -- 경매 제목
    
    -- 경매 시간
    start_time TIME,                              -- 경매 시작 시간
    end_time TIME,                                -- 경매 종료 시간
    
    -- 상태 관리
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled(예정), open(진행중), closed(마감), cancelled(취소)
    
    -- 메타 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admins(id),        -- 생성자 (관리자)
    
    -- 제약조건
    CONSTRAINT valid_auction_status CHECK (status IN ('scheduled', 'open', 'closed', 'cancelled'))
);

-- =============================================
-- 입찰 테이블 (bids)
-- 부위별 입찰 내역
-- =============================================

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 관계 정보
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES cattle_parts(id) ON DELETE CASCADE,
    dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
    
    -- 입찰 정보
    bid_price INT NOT NULL,                       -- 입찰가 (원/kg)
    bid_amount INT NOT NULL,                      -- 입찰금액 (원) = 입찰가 * 중량
    
    -- 입찰 순위 (경매 종료 시 계산)
    rank INT,                                     -- 순위 (1위가 낙찰)
    is_winning BOOLEAN DEFAULT false,             -- 낙찰 여부
    
    -- 메타 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 입찰시간
    
    -- 제약조건: 같은 경매에서 같은 부위에 같은 중도매인은 한 번만 입찰 가능
    CONSTRAINT unique_bid_per_part UNIQUE (auction_id, part_id, dealer_id)
);

-- =============================================
-- 경매-상장 연결 테이블 (auction_listings)
-- 어떤 경매에 어떤 상장이 포함되는지
-- =============================================

CREATE TABLE auction_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES cattle_listings(id) ON DELETE CASCADE,
    
    -- 순서
    display_order INT DEFAULT 0,                  -- 표시 순서
    
    -- 메타 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약조건: 같은 경매에 같은 상장은 한 번만
    CONSTRAINT unique_auction_listing UNIQUE (auction_id, listing_id)
);

-- =============================================
-- 인덱스
-- =============================================

-- auctions 인덱스
CREATE INDEX idx_auctions_date ON auctions(auction_date);
CREATE INDEX idx_auctions_status ON auctions(status);

-- bids 인덱스
CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_part ON bids(part_id);
CREATE INDEX idx_bids_dealer ON bids(dealer_id);
CREATE INDEX idx_bids_winning ON bids(is_winning) WHERE is_winning = true;
CREATE INDEX idx_bids_created_at ON bids(created_at DESC);

-- auction_listings 인덱스
CREATE INDEX idx_auction_listings_auction ON auction_listings(auction_id);
CREATE INDEX idx_auction_listings_listing ON auction_listings(listing_id);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_listings ENABLE ROW LEVEL SECURITY;

-- service_role은 모든 작업 허용
CREATE POLICY "Service role full access on auctions"
    ON auctions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on bids"
    ON bids FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on auction_listings"
    ON auction_listings FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =============================================
-- 트리거: updated_at 자동 갱신
-- =============================================

CREATE OR REPLACE FUNCTION update_auctions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auctions_updated_at
    BEFORE UPDATE ON auctions
    FOR EACH ROW
    EXECUTE FUNCTION update_auctions_updated_at();

-- =============================================
-- 트리거: 낙찰 처리 시 cattle_parts 업데이트
-- =============================================

CREATE OR REPLACE FUNCTION update_part_on_winning_bid()
RETURNS TRIGGER AS $$
BEGIN
    -- 낙찰로 변경될 때만 실행
    IF NEW.is_winning = true AND (OLD.is_winning IS NULL OR OLD.is_winning = false) THEN
        UPDATE cattle_parts
        SET 
            bid_price = NEW.bid_price,
            bid_amount = NEW.bid_amount,
            winning_dealer_id = NEW.dealer_id,
            bid_at = NEW.created_at
        WHERE id = NEW.part_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_part_on_winning
    AFTER UPDATE OF is_winning ON bids
    FOR EACH ROW
    EXECUTE FUNCTION update_part_on_winning_bid();

-- =============================================
-- 함수: 경매 종료 시 낙찰자 결정
-- =============================================

CREATE OR REPLACE FUNCTION close_auction(p_auction_id UUID)
RETURNS void AS $$
DECLARE
    v_part RECORD;
BEGIN
    -- 경매 상태 확인
    IF NOT EXISTS (
        SELECT 1 FROM auctions 
        WHERE id = p_auction_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION '진행 중인 경매만 마감할 수 있습니다.';
    END IF;

    -- 각 부위별로 최고 입찰자 결정
    FOR v_part IN 
        SELECT DISTINCT part_id FROM bids WHERE auction_id = p_auction_id
    LOOP
        -- 순위 업데이트
        WITH ranked_bids AS (
            SELECT 
                id,
                ROW_NUMBER() OVER (ORDER BY bid_price DESC, created_at ASC) as rank
            FROM bids
            WHERE auction_id = p_auction_id AND part_id = v_part.part_id
        )
        UPDATE bids b
        SET rank = rb.rank,
            is_winning = (rb.rank = 1)
        FROM ranked_bids rb
        WHERE b.id = rb.id;
    END LOOP;

    -- 경매 상태를 closed로 변경
    UPDATE auctions
    SET status = 'closed'
    WHERE id = p_auction_id;

    -- 해당 경매의 상장들 상태를 completed로 변경
    UPDATE cattle_listings
    SET status = 'completed'
    WHERE id IN (
        SELECT listing_id FROM auction_listings WHERE auction_id = p_auction_id
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 코멘트
-- =============================================

COMMENT ON TABLE auctions IS '경매 - 일자별 경매 세션 정보';
COMMENT ON TABLE bids IS '입찰 - 부위별 입찰 내역';
COMMENT ON TABLE auction_listings IS '경매-상장 연결';

COMMENT ON COLUMN auctions.status IS 'scheduled(예정), open(진행중), closed(마감), cancelled(취소)';
COMMENT ON COLUMN bids.rank IS '입찰 순위 (1위가 낙찰)';
COMMENT ON COLUMN bids.is_winning IS '낙찰 여부';
COMMENT ON FUNCTION close_auction IS '경매 마감 처리 - 낙찰자 결정 및 상태 업데이트';
