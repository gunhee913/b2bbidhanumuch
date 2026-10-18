-- ------------------------------------------------------------
-- kg 수요 풀 · 고정 단가 모델로 전환
--
-- 가격은 관리자가 부위×등급별로 정한다(kg당 고정 단가). 소비자는 kg만 고르고
-- kg × 단가를 결제한다. 한 덩어리 목표 중량만큼 모이면 매참인이 경매에 참여해
-- 확보하고, 못 확보하면 환불한다. 가격 사다리·최대가·확정가 개념은 없앤다.
-- ------------------------------------------------------------

-- 1. 풀 · 고정 단가 추가 (기존 사다리의 가운데 값으로 채움 · 관리자에서 수정)
ALTER TABLE group_buy_pools ADD COLUMN IF NOT EXISTS price_per_kg INT;

UPDATE group_buy_pools
SET price_per_kg = price_ladder[GREATEST(1, (array_length(price_ladder, 1) + 1) / 2)]
WHERE price_per_kg IS NULL AND price_ladder IS NOT NULL AND array_length(price_ladder, 1) > 0;

UPDATE group_buy_pools SET price_per_kg = floor_price_per_kg WHERE price_per_kg IS NULL;

ALTER TABLE group_buy_pools
  ALTER COLUMN price_per_kg SET NOT NULL,
  DROP COLUMN IF EXISTS price_ladder,
  DROP COLUMN IF EXISTS floor_price_per_kg;

ALTER TABLE group_buy_pools DROP CONSTRAINT IF EXISTS group_buy_pools_price_per_kg_check;
ALTER TABLE group_buy_pools ADD CONSTRAINT group_buy_pools_price_per_kg_check CHECK (price_per_kg > 0);

COMMENT ON COLUMN group_buy_pools.price_per_kg IS '관리자가 정한 kg당 판매 단가 · 소비자는 이 가격으로만 참여';
COMMENT ON COLUMN group_buy_pools.typical_weight_kg IS '한 덩어리 목표 중량 · 이만큼 모이면 매참인이 경매에 참여해 확보';

-- 2. 예약 · 최대가/확정가 → 고정 단가
--    이전 모델로 들어온 시험 예약은 의미가 달라 지운다(프로토타입 · 모의 결제).
DELETE FROM group_buy_reservations;

ALTER TABLE group_buy_reservations RENAME COLUMN max_price_per_kg TO price_per_kg;
ALTER TABLE group_buy_reservations DROP COLUMN IF EXISTS final_price_per_kg;

COMMENT ON COLUMN group_buy_reservations.price_per_kg IS '참여 당시 풀의 kg당 단가';
COMMENT ON COLUMN group_buy_reservations.held_amount IS '결제 금액 = kg × 단가 · 미확보 시 전액 환불';
