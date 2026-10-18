-- ------------------------------------------------------------
-- kg 수요 풀 · 등심을 윗등심 / 아랫등심으로 분리 + 리뷰 테이블
--
-- 소비자 화면에서는 윗등심·아랫등심을 따로 판다. 경매 쪽 부위 대분류는 그대로
-- "등심" 이므로, 풀 ↔ draft 상품 매칭은 코드에서 윗등심/아랫등심 → 등심으로 묶어 본다.
-- ------------------------------------------------------------

-- 1. 기존 등심 풀 → 윗등심 (예약은 pool_id 로 매여 있어 그대로 따라간다)
--    * 1·2번은 2026-10-17 REST 로 이미 반영됨 · 다시 실행해도 안전(no-op)
UPDATE group_buy_pools
SET part_group = '윗등심', typical_weight_kg = 8
WHERE part_group = '등심'
  AND NOT EXISTS (SELECT 1 FROM group_buy_pools w WHERE w.part_group = '윗등심' AND w.grade_key = group_buy_pools.grade_key);

-- 2. 아랫등심 풀 추가 · 윗등심보다 조금 낮은 단가 · 한 덩어리 ≈ 10kg
INSERT INTO group_buy_pools (part_group, grade_key, price_per_kg, bid_price_cap, reference_retail_price_per_kg, typical_weight_kg)
VALUES
  ('아랫등심', '1++9', 115000, 30000, 169000, 10),
  ('아랫등심', '1++8', 105000, 28000, 155000, 10),
  ('아랫등심', '1++7',  95000, 26000, 139000, 10),
  ('아랫등심', '1+',    78000, 22000, 109000, 10),
  ('아랫등심', '1',     60000, 18000,  82000, 10)
ON CONFLICT (part_group, grade_key) DO NOTHING;

-- 3. 리뷰 · 배송 완료된 참여에 소비자가 남긴다 · 표에는 풀별 개수만 보여준다
CREATE TABLE IF NOT EXISTS group_buy_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES group_buy_pools(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES group_buy_orders(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_buy_reviews_one_per_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_group_buy_reviews_pool ON group_buy_reviews(pool_id);

ALTER TABLE group_buy_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_reviews_service_role_all" ON group_buy_reviews;
CREATE POLICY "group_buy_reviews_service_role_all" ON group_buy_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_reviews IS '1kg 구매 리뷰 · 풀(부위×등급) 단위로 모아 개수를 보여준다';
