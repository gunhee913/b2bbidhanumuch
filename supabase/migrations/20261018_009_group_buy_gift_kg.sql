-- 선물세트에 묶인 1kg 구매
ALTER TABLE group_buy_reservations
  ADD COLUMN IF NOT EXISTS gift_set_id UUID REFERENCES group_buy_gift_sets(id);

CREATE INDEX IF NOT EXISTS group_buy_reservations_gift_set_idx
  ON group_buy_reservations (gift_set_id);
