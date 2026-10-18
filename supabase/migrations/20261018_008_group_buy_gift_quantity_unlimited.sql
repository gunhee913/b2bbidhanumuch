-- 선물세트 수량 상한(10) 제거 · 1개 이상이면 된다

ALTER TABLE group_buy_gift_sets
  DROP CONSTRAINT IF EXISTS group_buy_gift_sets_quantity_check;

ALTER TABLE group_buy_gift_sets
  ADD CONSTRAINT group_buy_gift_sets_quantity_check CHECK (quantity >= 1);
