-- ============================================================
-- 부분육 공동구매 플랫폼(B2C)
-- ============================================================
-- 기존 B2B 경매(cattle_listings → cattle_parts → auctions/bids) 위에
-- 소비자용 공동구매 레이어를 얹는다.
--
--   consumers               소비자 계정 (휴대폰 + 비밀번호)
--   group_buy_settings      플랫폼 단일 설정 (플랫폼 전용 중도매인 계정 등)
--   group_buy_part_defaults 대분류별 기본값 · 관리자 폼 자동 채움용
--   group_buy_products      공동구매 상품 · cattle_parts 1행 = 상품 1건
--   group_buy_orders        주문(결제 1건) · 한 상품에 여러 구좌
--   group_buy_order_slots   주문이 선점한 구좌 · UNIQUE(product_id, slot_no)
--   group_buy_events        상태 변화 타임라인 · 감사
--
-- 경매·응찰은 운영 내부 메커니즘이다. 소비자 화면은 상품/주문 상태를
-- "모집중 → 준비중 → 소분 가공 → 배송 → 완료" 로만 번역해 보여준다.
-- ============================================================

-- 공통 updated_at 트리거 함수
CREATE OR REPLACE FUNCTION group_buy_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. consumers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(120),
  zipcode VARCHAR(10),
  address VARCHAR(255),
  address_detail VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consumers_phone ON consumers (phone);

DROP TRIGGER IF EXISTS trigger_consumers_updated_at ON consumers;
CREATE TRIGGER trigger_consumers_updated_at
  BEFORE UPDATE ON consumers
  FOR EACH ROW EXECUTE FUNCTION group_buy_set_updated_at();

ALTER TABLE consumers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consumers_service_role_all" ON consumers;
CREATE POLICY "consumers_service_role_all" ON consumers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE consumers IS '공동구매 소비자 계정 · 휴대폰 번호가 로그인 ID';

-- ------------------------------------------------------------
-- 2. group_buy_settings (단일 행)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  deadline_offset_min INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

DROP TRIGGER IF EXISTS trigger_group_buy_settings_updated_at ON group_buy_settings;
CREATE TRIGGER trigger_group_buy_settings_updated_at
  BEFORE UPDATE ON group_buy_settings
  FOR EACH ROW EXECUTE FUNCTION group_buy_set_updated_at();

ALTER TABLE group_buy_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_settings_service_role_all" ON group_buy_settings;
CREATE POLICY "group_buy_settings_service_role_all" ON group_buy_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_settings IS '공동구매 플랫폼 설정 · 단일 행 (id = 1)';
COMMENT ON COLUMN group_buy_settings.platform_dealer_id IS '플랫폼 명의로 자동 응찰하는 중도매인 계정';
COMMENT ON COLUMN group_buy_settings.deadline_offset_min IS '모집 마감 기본값 = 1회차 예정 시작 - N분';

-- 플랫폼 전용 중도매인 계정 시드 · 로그인 불가(더미 해시) · 자동 응찰 전용
DO $$
DECLARE
  v_dealer_id UUID;
BEGIN
  SELECT id INTO v_dealer_id FROM dealers WHERE dealer_no = 'GB-PLATFORM';

  IF v_dealer_id IS NULL THEN
    INSERT INTO dealers (
      dealer_no, name, representative_name, phone,
      password_hash, auction_password_hash, address, status
    ) VALUES (
      'GB-PLATFORM',
      '부분육 공동구매 플랫폼',
      '농협경제지주 축산기획부',
      '000-0000-0000',
      '$2a$10$GBPLATFORMLOGINDISABLEDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      '$2a$10$GBPLATFORMLOGINDISABLEDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      NULL,
      'active'
    )
    RETURNING id INTO v_dealer_id;
  END IF;

  INSERT INTO group_buy_settings (id, platform_dealer_id)
  VALUES (1, v_dealer_id)
  ON CONFLICT (id) DO UPDATE
    SET platform_dealer_id = COALESCE(group_buy_settings.platform_dealer_id, EXCLUDED.platform_dealer_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'group_buy platform dealer seed skipped: %', SQLERRM;
END $$;

-- ------------------------------------------------------------
-- 3. group_buy_part_defaults
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_part_defaults (
  part_group VARCHAR(50) PRIMARY KEY,
  slot_count INT CHECK (slot_count IS NULL OR slot_count BETWEEN 1 AND 100),
  price_per_kg INT CHECK (price_per_kg IS NULL OR price_per_kg > 0),
  reference_retail_price_per_kg INT CHECK (reference_retail_price_per_kg IS NULL OR reference_retail_price_per_kg > 0),
  bid_price_cap INT CHECK (bid_price_cap IS NULL OR bid_price_cap > 0),
  positional BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

DROP TRIGGER IF EXISTS trigger_group_buy_part_defaults_updated_at ON group_buy_part_defaults;
CREATE TRIGGER trigger_group_buy_part_defaults_updated_at
  BEFORE UPDATE ON group_buy_part_defaults
  FOR EACH ROW EXECUTE FUNCTION group_buy_set_updated_at();

ALTER TABLE group_buy_part_defaults ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_part_defaults_service_role_all" ON group_buy_part_defaults;
CREATE POLICY "group_buy_part_defaults_service_role_all" ON group_buy_part_defaults
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_part_defaults IS '부위 대분류별 기본값 · 관리자 상품 설정 폼 자동 채움용 (강제 아님)';
COMMENT ON COLUMN group_buy_part_defaults.positional IS '상·중·하 위치 선택 사용 여부 기본값';

-- 위치 차이가 의미 없는 부위는 기본 끔
INSERT INTO group_buy_part_defaults (part_group, positional)
VALUES
  ('등심', true), ('안심', true), ('채끝', true), ('치마', false), ('부채', false),
  ('업진', false), ('토시·제비', false), ('설도', false), ('앞다리', false), ('우둔', false),
  ('목심', false), ('양지', false), ('사태', false), ('꼬리', false), ('족', false),
  ('사골', false), ('잡뼈', false)
ON CONFLICT (part_group) DO NOTHING;

-- ------------------------------------------------------------
-- 4. group_buy_products
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL UNIQUE REFERENCES cattle_parts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES cattle_listings(id) ON DELETE CASCADE,
  part_group VARCHAR(50) NOT NULL,

  -- 관리자가 상품마다 정하는 값 · draft 동안은 비어 있을 수 있다
  slot_count INT CHECK (slot_count IS NULL OR slot_count BETWEEN 1 AND 100),
  slot_weight NUMERIC(10, 3),
  price_per_kg INT CHECK (price_per_kg IS NULL OR price_per_kg > 0),
  slot_price INT CHECK (slot_price IS NULL OR slot_price > 0),
  reference_retail_price INT CHECK (reference_retail_price IS NULL OR reference_retail_price > 0),
  positional BOOLEAN NOT NULL DEFAULT true,
  bid_price_cap INT CHECK (bid_price_cap IS NULL OR bid_price_cap > 0),
  recruit_deadline TIMESTAMPTZ,

  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'recruiting', 'full', 'bidding',
      'won', 'lost', 'cancelled', 'processing', 'shipped', 'completed'
    )),
  published_at TIMESTAMPTZ,
  bid_id UUID,
  result_price INT,
  cancelled_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 공개(recruiting 이후) 상품은 판매 조건이 모두 있어야 한다
  CONSTRAINT group_buy_products_published_requires_pricing CHECK (
    status = 'draft'
    OR (slot_count IS NOT NULL AND price_per_kg IS NOT NULL AND slot_price IS NOT NULL AND recruit_deadline IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_group_buy_products_status ON group_buy_products (status);
CREATE INDEX IF NOT EXISTS idx_group_buy_products_listing ON group_buy_products (listing_id);
CREATE INDEX IF NOT EXISTS idx_group_buy_products_deadline ON group_buy_products (recruit_deadline);

DROP TRIGGER IF EXISTS trigger_group_buy_products_updated_at ON group_buy_products;
CREATE TRIGGER trigger_group_buy_products_updated_at
  BEFORE UPDATE ON group_buy_products
  FOR EACH ROW EXECUTE FUNCTION group_buy_set_updated_at();

ALTER TABLE group_buy_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_products_service_role_all" ON group_buy_products;
CREATE POLICY "group_buy_products_service_role_all" ON group_buy_products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_products IS '공동구매 상품 · cattle_parts 1행 = 상품 1건 · 상장 승인 시 draft 로 자동 생성';
COMMENT ON COLUMN group_buy_products.status IS 'draft(미공개) → recruiting → full → bidding → won/lost · won → processing → shipped → completed · recruiting → cancelled(미달)';
COMMENT ON COLUMN group_buy_products.slot_weight IS '구좌 중량(kg) = 부위 중량 / 분할 수';
COMMENT ON COLUMN group_buy_products.slot_price IS '구좌가(원) = kg당 단가 × 구좌 중량 · 10원 단위 올림';
COMMENT ON COLUMN group_buy_products.reference_retail_price IS '참고 소매가(원/구좌) · 절약률 표시용 · 선택';
COMMENT ON COLUMN group_buy_products.positional IS 'true 면 구좌 번호 = 소분 위치(상·중·하 선택)';
COMMENT ON COLUMN group_buy_products.bid_price_cap IS '플랫폼 자동 응찰 단가(원/kg) · 소비자에게 노출하지 않음';

-- ------------------------------------------------------------
-- 5. group_buy_orders (결제 1건)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(30) NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES group_buy_products(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  amount INT NOT NULL CHECK (amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'paid'
    CHECK (status IN ('paid', 'cancelled', 'refunded')),
  payment_provider VARCHAR(20) NOT NULL DEFAULT 'mock',
  payment_key VARCHAR(100),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  shipping JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_buy_orders_consumer ON group_buy_orders (consumer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_buy_orders_product ON group_buy_orders (product_id);

DROP TRIGGER IF EXISTS trigger_group_buy_orders_updated_at ON group_buy_orders;
CREATE TRIGGER trigger_group_buy_orders_updated_at
  BEFORE UPDATE ON group_buy_orders
  FOR EACH ROW EXECUTE FUNCTION group_buy_set_updated_at();

ALTER TABLE group_buy_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_orders_service_role_all" ON group_buy_orders;
CREATE POLICY "group_buy_orders_service_role_all" ON group_buy_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_orders IS '공동구매 주문 · 결제 1건 · 구좌는 group_buy_order_slots';
COMMENT ON COLUMN group_buy_orders.status IS 'paid: 결제완료 · cancelled: 소비자 취소(환불) · refunded: 시스템 환불(미달·물량 미확보)';
COMMENT ON COLUMN group_buy_orders.shipping IS '{ name, phone, zipcode, address, addressDetail, memo }';

-- ------------------------------------------------------------
-- 6. group_buy_order_slots (구좌 선점)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_order_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES group_buy_products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES group_buy_orders(id) ON DELETE CASCADE,
  slot_no INT NOT NULL CHECK (slot_no >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT group_buy_order_slots_unique UNIQUE (product_id, slot_no)
);

CREATE INDEX IF NOT EXISTS idx_group_buy_order_slots_order ON group_buy_order_slots (order_id);

ALTER TABLE group_buy_order_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_order_slots_service_role_all" ON group_buy_order_slots;
CREATE POLICY "group_buy_order_slots_service_role_all" ON group_buy_order_slots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_order_slots IS '주문이 선점한 구좌 · UNIQUE(product_id, slot_no) 로 동시 결제 충돌을 DB 에서 막는다 · 취소 시 행 삭제';

-- ------------------------------------------------------------
-- 7. group_buy_events (타임라인 · 감사)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES group_buy_products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES group_buy_orders(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_buy_events_product ON group_buy_events (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_buy_events_order ON group_buy_events (order_id, created_at DESC);

ALTER TABLE group_buy_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_buy_events_service_role_all" ON group_buy_events;
CREATE POLICY "group_buy_events_service_role_all" ON group_buy_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE group_buy_events IS '공동구매 상태 변화 기록 · 관리자 타임라인 · 소비자에게는 번역된 문구만 노출';

-- ------------------------------------------------------------
-- 8. Realtime · 구좌 선점/상태 변경이 다른 브라우저에 바로 반영되게
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_buy_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_buy_products;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_buy_order_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_buy_order_slots;
  END IF;
END $$;
