-- cattle_listings 테이블에 경락단가(원/kg) 컬럼 추가
ALTER TABLE cattle_listings
  ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT NULL;

COMMENT ON COLUMN cattle_listings.unit_price IS '경락단가 (원/kg)';
