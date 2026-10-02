-- ============================================
-- 배송 거래처 지정 · 「누가 언제 왜」 를 남긴다
--
-- 상장일 13:30 이 지나면 중도매인은 읽기만 하고, 그 뒤 수정은 관리자만 한다.
-- 관리자가 마감을 넘어 고치는 일은 흔치 않아야 하고, 흔치 않은 일일수록 까닭이
-- 남아 있어야 한다 — 「왜 이 고기가 저 집으로 갔나」 를 나중에 되짚는 자리다.
--
-- assigned_by 는 이미 있었지만 글자(VARCHAR)뿐이고 그마저 요청 본문에서 받아
-- 그대로 적고 있었다. 누구든 아무 이름이나 적을 수 있었다는 뜻이다. 이제 서버가
-- 세션에서 이름을 꺼내 적고, 되짚을 수 있도록 사용자 id 도 같이 둔다.
-- ============================================

ALTER TABLE delivery_assignments
  ADD COLUMN IF NOT EXISTS assigned_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ;

COMMENT ON COLUMN delivery_assignments.assigned_by_user_id IS '마지막으로 손댄 사람 · 세션에서 서버가 적는다';
COMMENT ON COLUMN delivery_assignments.override_reason IS '관리자가 마감(상장일 13:30) 뒤에 고친 까닭 · 그 외에는 NULL';
COMMENT ON COLUMN delivery_assignments.overridden_at IS '마감 뒤 수정 시각 · override_reason 과 짝';

-- 마감 뒤 수정만 따로 훑는 조회용 · 대개 비어 있어 부분 인덱스로 둔다
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_override
  ON delivery_assignments(overridden_at DESC)
  WHERE overridden_at IS NOT NULL;
