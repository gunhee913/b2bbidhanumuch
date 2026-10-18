-- ============================================================
-- 부분육 공동구매 · kg 단위 수요 풀(호가창)
-- ============================================================
-- 기존 흐름은 "소 한 마리의 부위 1건 = 상품 1건" 에 소비자가 구좌를 선점하는 방식이다.
-- 여기서는 반대로 수요가 먼저 쌓인다.
--
--   group_buy_pools         부위 대분류 × 등급키(예: 등심 × 1++9) 단위의 수요 풀
--   group_buy_reservations  소비자가 "n kg 를 kg당 최대 P원까지" 로 넣은 예약 = 호가 1건
--
-- 매칭: 상장 승인으로 생긴 draft 상품(부위 실물)과 풀의 예약을 맞춘다.
--   예약을 단가 내림차순·시간 오름차순으로 쌓아 부위 중량을 채우는 순간
--   마지막으로 들어간 예약의 단가가 확정가(P)가 되고, 참여자 전원이 P로 결제한다(단일 확정가).
--   확정된 예약은 기존 group_buy_orders 로 변환되어 응찰·정산·배송 파이프라인을 그대로 탄다.
-- ============================================================

-- ------------------------------------------------------------
-- 1. group_buy_pools
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_group VARCHAR(50) NOT NULL,
  grade_key VARCHAR(10) NOT NULL,
  price_ladder INT[] NOT NULL DEFAULT '{}',
  floor_price_per_kg INT NOT NULL CHECK (floor_price_per_kg > 0),
  bid_price_cap INT CHECK (bid_price_cap IS NULL OR bid_price_cap > 0),
  reference_retail_price_per_kg INT CHECK (reference_retail_price_per_kg IS NULL OR reference_retail_price_per_kg > 0),
  typical_weight_kg NUMERIC(10, 1) NOT NULL DEFAULT 15,
  min_kg INT NOT NULL DEFAULT 1 CHECK (min_kg >= 1),
  max_kg INT NOT NULL DEFAULT 10 CHECK (max_kg >= min_kg),
  reservation_ttl_days INT NOT NULL DEFAULT 14 CHECK (reservation_ttl_days BETWEEN 1 AND 90),
  status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  CONSTRAINT group_buy_pools_unique UNIQUE (part_group, grade_key)
);

DROP TRIGGER IF EXISTS trigger_group_buy_pools_updated_at ON group_buy_pools;
CREATE TRIGGER trigger_group_buy_pools_updated_at
  BEFORE UPDATE ON group_buy_pools
  FOR EACH ROW EXECUTE FUNCTION group_buy_set_updated_at();

ALTER TABLE group_buy_pools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_pools_service_role_all" ON group_buy_pools;
CREATE POLICY "group_buy_pools_service_role_all" ON group_buy_pools
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_pools IS 'kg 단위 수요 풀 · 부위 대분류 × 등급키(1++9, 1++8, 1++7, 1+, 1, 2)';
COMMENT ON COLUMN group_buy_pools.price_ladder IS '소비자에게 노출하는 가격대(원/kg) · 내림차순 · 모두 floor 이상';
COMMENT ON COLUMN group_buy_pools.floor_price_per_kg IS '원가 하한(원/kg) · 이 아래 가격대는 노출하지 않는다 · 비노출';
COMMENT ON COLUMN group_buy_pools.bid_price_cap IS '매칭된 상품에 넣을 플랫폼 응찰 단가(원/kg 지육) · 없으면 부위 기본값·최저가';
COMMENT ON COLUMN group_buy_pools.typical_weight_kg IS '"보통 한 덩어리 ≈ N kg" 안내용 · 실제 매칭은 부위 실중량으로';
COMMENT ON COLUMN group_buy_pools.reservation_ttl_days IS '예약 유효기간(일) · 지나면 자동 만료·환불';

-- ------------------------------------------------------------
-- 2. group_buy_reservations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_no VARCHAR(30) NOT NULL UNIQUE,
  pool_id UUID NOT NULL REFERENCES group_buy_pools(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
  kg INT NOT NULL CHECK (kg >= 1),
  max_price_per_kg INT NOT NULL CHECK (max_price_per_kg > 0),
  held_amount INT NOT NULL CHECK (held_amount >= 0),
  status VARCHAR(12) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'allocated', 'cancelled', 'expired', 'refunded')),
  product_id UUID REFERENCES group_buy_products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES group_buy_orders(id) ON DELETE SET NULL,
  final_price_per_kg INT,
  allocated_at TIMESTAMPTZ,
  payment_provider VARCHAR(20) NOT NULL DEFAULT 'mock',
  payment_key VARCHAR(100),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  shipping JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_buy_reservations_pool_open
  ON group_buy_reservations (pool_id, status, max_price_per_kg DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_group_buy_reservations_consumer
  ON group_buy_reservations (consumer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_buy_reservations_expires
  ON group_buy_reservations (status, expires_at);

DROP TRIGGER IF EXISTS trigger_group_buy_reservations_updated_at ON group_buy_reservations;
CREATE TRIGGER trigger_group_buy_reservations_updated_at
  BEFORE UPDATE ON group_buy_reservations
  FOR EACH ROW EXECUTE FUNCTION group_buy_set_updated_at();

ALTER TABLE group_buy_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_reservations_service_role_all" ON group_buy_reservations;
CREATE POLICY "group_buy_reservations_service_role_all" ON group_buy_reservations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_reservations IS 'kg 예약 = 호가 1건 · open 상태만 호가창에 쌓인다';
COMMENT ON COLUMN group_buy_reservations.held_amount IS '예약 시 선결제한 금액 = kg × 최대단가 · 확정 시 확정가와의 차액을 환불';
COMMENT ON COLUMN group_buy_reservations.status IS 'open(모이는 중) → allocated(확정·주문 생성) · open → cancelled(본인 취소)/expired(기간 만료) · allocated → refunded(물량 미확보)';

-- ------------------------------------------------------------
-- 3. 기존 테이블 확장
-- ------------------------------------------------------------
ALTER TABLE group_buy_products
  ADD COLUMN IF NOT EXISTS sale_mode VARCHAR(10) NOT NULL DEFAULT 'slot' CHECK (sale_mode IN ('slot', 'kg')),
  ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES group_buy_pools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_buy_products_pool ON group_buy_products (pool_id);

-- kg 모드 상품은 구좌 개념이 없다 · 공개 조건에서 제외
ALTER TABLE group_buy_products DROP CONSTRAINT IF EXISTS group_buy_products_published_requires_pricing;
ALTER TABLE group_buy_products ADD CONSTRAINT group_buy_products_published_requires_pricing CHECK (
  status = 'draft'
  OR sale_mode = 'kg'
  OR (slot_count IS NOT NULL AND price_per_kg IS NOT NULL AND slot_price IS NOT NULL AND recruit_deadline IS NOT NULL)
);

COMMENT ON COLUMN group_buy_products.sale_mode IS 'slot: 구좌 선점 · kg: 수요 풀 매칭(quantity = kg)';

ALTER TABLE group_buy_orders
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10, 3),
  ADD COLUMN IF NOT EXISTS reservation_id UUID;

COMMENT ON COLUMN group_buy_orders.weight_kg IS 'kg 모드 주문의 중량 · 구좌 모드는 NULL';

-- ------------------------------------------------------------
-- 4. Realtime
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_buy_reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_buy_reservations;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. 시드 · 주요 부위 × 등급 풀 (가격은 시연용 · 관리자 화면에서 수정)
-- ------------------------------------------------------------
INSERT INTO group_buy_pools (part_group, grade_key, price_ladder, floor_price_per_kg, bid_price_cap, reference_retail_price_per_kg, typical_weight_kg)
VALUES
  ('등심', '1++9', '{135000,130000,125000,120000,115000,110000}', 110000, 30000, 189000, 18),
  ('등심', '1++8', '{125000,120000,115000,110000,105000,100000}', 100000, 28000, 169000, 18),
  ('등심', '1++7', '{115000,110000,105000,100000,95000,90000}',   90000, 26000, 149000, 18),
  ('등심', '1+',   '{95000,90000,85000,80000,75000}',             75000, 22000, 119000, 17),
  ('등심', '1',    '{75000,70000,65000,60000,55000}',             55000, 18000,  89000, 16),
  ('채끝', '1++9', '{125000,120000,115000,110000,105000}',       105000, 30000, 169000, 6),
  ('채끝', '1++8', '{115000,110000,105000,100000,95000}',         95000, 28000, 149000, 6),
  ('채끝', '1+',   '{85000,80000,75000,70000,65000}',             65000, 22000, 109000, 6),
  ('안심', '1++9', '{145000,140000,135000,130000,125000}',       125000, 30000, 199000, 5),
  ('안심', '1++8', '{135000,130000,125000,120000,115000}',       115000, 28000, 179000, 5),
  ('안심', '1+',   '{105000,100000,95000,90000,85000}',           85000, 22000, 139000, 5),
  ('부채', '1++9', '{85000,80000,75000,70000,65000}',             65000, 30000, 119000, 8),
  ('부채', '1+',   '{65000,60000,55000,50000,45000}',             45000, 22000,  89000, 8),
  ('치마', '1++9', '{95000,90000,85000,80000,75000}',             75000, 30000, 129000, 7),
  ('치마', '1+',   '{70000,65000,60000,55000,50000}',             50000, 22000,  95000, 7)
ON CONFLICT (part_group, grade_key) DO NOTHING;
