-- =============================================
-- 부분육 상장 테이블 (cattle_listings)
-- 개체(소) 단위의 상장 정보를 저장
-- =============================================

CREATE TABLE cattle_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 상장 기본 정보
    listing_no VARCHAR(20) NOT NULL UNIQUE,      -- 접수번호 (예: 260203-101)
    listing_date DATE NOT NULL,                   -- 상장일
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    
    -- 개체 정보
    breed VARCHAR(20) NOT NULL DEFAULT '한우',    -- 축종
    gender VARCHAR(10) NOT NULL,                  -- 성별 (거세/암/수)
    grade VARCHAR(20) NOT NULL,                   -- 등급 (1++A, 1+A 등)
    marbling_score INT,                           -- 근내지방도 (1-9)
    month_age INT,                                -- 월령
    trace_no VARCHAR(50),                         -- 이력번호
    
    -- 도축 정보
    slaughter_house VARCHAR(100),                 -- 도축장
    slaughter_date DATE,                          -- 도축일
    slaughter_no VARCHAR(50),                     -- 도축번호
    carcass_weight DECIMAL(10,2),                 -- 도체중 (kg)
    
    -- 등급 판정 정보
    back_fat INT,                                 -- 등지방 두께 (mm)
    eye_muscle INT,                               -- 배최장근 단면적 (cm²)
    meat_color INT,                               -- 육색 (1-7)
    fat_color INT,                                -- 지방색 (1-7)
    texture INT,                                  -- 조직감 (1-3)
    maturity INT,                                 -- 성숙도 (1-9)
    
    -- 가공 정보
    process_date DATE,                            -- 가공일
    process_weight DECIMAL(10,2),                 -- 가공중량 (kg)
    
    -- 증명서 (JSON으로 저장)
    slaughter_cert JSONB,                         -- 도축증명서 {fileName, fileData, fileType}
    grade_cert JSONB,                             -- 등급판정서 {fileName, fileData, fileType}
    
    -- 이미지 (JSON 배열로 저장)
    images JSONB DEFAULT '[]'::jsonb,             -- 이미지 URL 배열
    
    -- 상태 관리
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending(대기), approved(승인), auction(경매중), completed(완료), cancelled(취소)
    approved_at TIMESTAMP WITH TIME ZONE,         -- 승인일시
    approved_by UUID REFERENCES admins(id),       -- 승인자
    
    -- 메타 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,                              -- 등록자 (company_employees.id)
    
    -- 제약조건
    CONSTRAINT valid_gender CHECK (gender IN ('거세', '암', '수')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'auction', 'completed', 'cancelled'))
);

-- =============================================
-- 부분육 부위 테이블 (cattle_parts)
-- 개체별 19개 부위의 상세 정보
-- =============================================

CREATE TABLE cattle_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES cattle_listings(id) ON DELETE CASCADE,
    
    -- 부위 정보
    part_no INT NOT NULL,                         -- 부위 순번 (1-19)
    part_name VARCHAR(30) NOT NULL,               -- 부위명
    listing_part_no VARCHAR(30),                  -- 상장번호 (예: 260203-101-01)
    
    -- 중량 및 가격
    weight DECIMAL(10,2),                         -- 중량 (kg)
    min_price INT,                                -- 최저가 (원/kg)
    is_included BOOLEAN NOT NULL DEFAULT true,   -- 상장 포함 여부
    
    -- 낙찰 정보 (경매 완료 후 업데이트)
    bid_price INT,                                -- 낙찰가 (원/kg)
    bid_amount INT,                               -- 낙찰금액 (원)
    winning_dealer_id UUID REFERENCES dealers(id), -- 낙찰 중도매인
    bid_at TIMESTAMP WITH TIME ZONE,              -- 낙찰일시
    
    -- 메타 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 제약조건
    CONSTRAINT unique_listing_part UNIQUE (listing_id, part_no),
    CONSTRAINT valid_part_no CHECK (part_no >= 1 AND part_no <= 19)
);

-- =============================================
-- 인덱스
-- =============================================

-- cattle_listings 인덱스
CREATE INDEX idx_cattle_listings_company ON cattle_listings(company_id);
CREATE INDEX idx_cattle_listings_date ON cattle_listings(listing_date);
CREATE INDEX idx_cattle_listings_status ON cattle_listings(status);
CREATE INDEX idx_cattle_listings_trace_no ON cattle_listings(trace_no);
CREATE INDEX idx_cattle_listings_created_at ON cattle_listings(created_at DESC);

-- cattle_parts 인덱스
CREATE INDEX idx_cattle_parts_listing ON cattle_parts(listing_id);
CREATE INDEX idx_cattle_parts_dealer ON cattle_parts(winning_dealer_id);
CREATE INDEX idx_cattle_parts_included ON cattle_parts(listing_id, is_included);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE cattle_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cattle_parts ENABLE ROW LEVEL SECURITY;

-- service_role은 모든 작업 허용
CREATE POLICY "Service role full access on cattle_listings"
    ON cattle_listings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on cattle_parts"
    ON cattle_parts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================
-- 트리거: updated_at 자동 갱신
-- =============================================

CREATE OR REPLACE FUNCTION update_cattle_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cattle_listings_updated_at
    BEFORE UPDATE ON cattle_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_cattle_listings_updated_at();

CREATE OR REPLACE FUNCTION update_cattle_parts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cattle_parts_updated_at
    BEFORE UPDATE ON cattle_parts
    FOR EACH ROW
    EXECUTE FUNCTION update_cattle_parts_updated_at();

-- =============================================
-- 코멘트
-- =============================================

COMMENT ON TABLE cattle_listings IS '부분육 상장 - 개체(소) 단위 정보';
COMMENT ON TABLE cattle_parts IS '부분육 부위 - 개체별 19개 부위 상세';

COMMENT ON COLUMN cattle_listings.listing_no IS '접수번호 (YYMMDD-XXX 형식)';
COMMENT ON COLUMN cattle_listings.status IS 'pending(대기), approved(승인), auction(경매중), completed(완료), cancelled(취소)';
COMMENT ON COLUMN cattle_parts.part_no IS '부위 순번 (1-19)';
COMMENT ON COLUMN cattle_parts.listing_part_no IS '상장번호 (접수번호-부위번호 형식)';
