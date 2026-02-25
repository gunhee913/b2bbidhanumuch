-- ============================================
-- 배송 거래처 지정 테이블 (delivery_assignments)
-- 낙찰 부위별 거래처 지정 영구 저장
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES cattle_parts(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  assigned_by VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_part_assignment UNIQUE (part_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_part_id ON delivery_assignments(part_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_partner_id ON delivery_assignments(partner_id);

-- RLS
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_assignments_service_role_all" ON delivery_assignments
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_delivery_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delivery_assignments_updated_at
  BEFORE UPDATE ON delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_assignments_updated_at();

COMMENT ON TABLE delivery_assignments IS '배송 거래처 지정 - 낙찰 부위별 거래처 매핑';
