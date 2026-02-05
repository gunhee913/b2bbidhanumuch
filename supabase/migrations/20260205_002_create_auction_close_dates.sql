-- 경매 마감 날짜 테이블
-- 마감된 날짜를 저장하여 해당 날짜에 새 상장 등록을 방지

CREATE TABLE auction_close_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    close_date DATE NOT NULL UNIQUE,           -- 마감된 날짜
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 마감 처리 시간
    closed_by UUID REFERENCES admins(id),      -- 마감 처리자
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_auction_close_dates_date ON auction_close_dates(close_date);

-- RLS
ALTER TABLE auction_close_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on auction_close_dates"
    ON auction_close_dates
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE auction_close_dates IS '경매 마감 날짜 - 마감된 날짜에는 새 상장 등록 불가';
COMMENT ON COLUMN auction_close_dates.close_date IS '마감된 날짜 (YYYY-MM-DD)';
