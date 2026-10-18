-- 선물세트 칸 수 · 2구~6구
ALTER TABLE group_buy_gift_sets DROP CONSTRAINT IF EXISTS group_buy_gift_sets_cell_count_check;
ALTER TABLE group_buy_gift_sets
  ADD CONSTRAINT group_buy_gift_sets_cell_count_check CHECK (cell_count IN (2, 3, 4, 5, 6));
