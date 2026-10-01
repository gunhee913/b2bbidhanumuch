-- ============================================
-- 거래처 숫자 단축키 (dealer_partner_pins)
--
-- 배송지시 화면에서 1~9 키에 못 박아 둔 거래처.
-- 중도매인 단위로 공유한다 — 「1번은 대한식당」 은 업소 공통 약속이라
-- 직원이 다른 PC 에서 들어와도 같은 숫자가 같은 곳을 가리켜야 한다.
--
-- 0 은 「배정 해제」 로 쓰므로 자리는 1~9 뿐이다.
-- ============================================

CREATE TABLE IF NOT EXISTS dealer_partner_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 9),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  pinned_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- 한 자리에 한 거래처
  CONSTRAINT unique_dealer_slot UNIQUE (dealer_id, slot),
  -- 같은 거래처가 두 자리를 차지하면 어느 숫자가 맞는지 알 수 없다
  CONSTRAINT unique_dealer_partner UNIQUE (dealer_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_dealer_partner_pins_dealer
  ON dealer_partner_pins(dealer_id);

-- RLS
ALTER TABLE dealer_partner_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer_partner_pins_service_role_all" ON dealer_partner_pins
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_dealer_partner_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dealer_partner_pins_updated_at ON dealer_partner_pins;
CREATE TRIGGER trigger_dealer_partner_pins_updated_at
  BEFORE UPDATE ON dealer_partner_pins
  FOR EACH ROW
  EXECUTE FUNCTION update_dealer_partner_pins_updated_at();

COMMENT ON TABLE dealer_partner_pins IS '배송지시 거래처 숫자 단축키 (중도매인 단위 공유)';
COMMENT ON COLUMN dealer_partner_pins.slot IS '숫자 키 자리 1~9 · 0 은 배정 해제라 쓰지 않는다';
COMMENT ON COLUMN dealer_partner_pins.pinned_by IS '자리를 건 사용자 ID (dealer 또는 employee)';
