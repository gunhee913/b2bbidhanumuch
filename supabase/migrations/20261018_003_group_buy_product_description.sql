-- 공동구매 상품 상세설명 · 상품(개체 × 부위)마다 따로 쓴다
-- 관리자 "판매 조건" 시트에서 편집 · 소비자 상세 페이지 맨 아래 "상세설명" 에 표시

ALTER TABLE group_buy_products
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN group_buy_products.description IS '소비자 상세 페이지 상세설명 · 줄바꿈 그대로 표시';
