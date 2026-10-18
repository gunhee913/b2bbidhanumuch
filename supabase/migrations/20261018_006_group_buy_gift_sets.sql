-- 선물세트 · 벌크 구좌를 칸(500g)으로 나눠 포장하고, 남는 양은 집 또는 매장으로 받는다

CREATE TABLE IF NOT EXISTS group_buy_gift_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  packaging_fee INTEGER NOT NULL DEFAULT 15000 CHECK (packaging_fee >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO group_buy_gift_settings (id, packaging_fee)
VALUES (1, 15000)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS group_buy_gift_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_no TEXT NOT NULL UNIQUE,
  consumer_id UUID NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
  cell_count SMALLINT NOT NULL CHECK (cell_count IN (2, 3, 4, 5, 6)),
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  packaging_fee INTEGER NOT NULL,
  cells JSONB NOT NULL DEFAULT '[]',
  recipient_mode TEXT NOT NULL CHECK (recipient_mode IN ('batch', 'split')),
  leftover_receive_method TEXT NOT NULL CHECK (leftover_receive_method IN ('delivery', 'dine_in')),
  leftover_store_id UUID REFERENCES group_buy_stores(id),
  leftover_pickup_at TIMESTAMPTZ,
  leftover_shipping JSONB,
  leftover_kg NUMERIC,
  meat_amount INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'cancelled', 'refunded')),
  payment_provider TEXT,
  payment_key TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_buy_gift_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_set_id UUID NOT NULL REFERENCES group_buy_gift_sets(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL CHECK (set_index >= 1),
  shipping JSONB NOT NULL,
  message TEXT,
  UNIQUE (gift_set_id, set_index)
);

ALTER TABLE group_buy_orders
  ADD COLUMN IF NOT EXISTS gift_set_id UUID REFERENCES group_buy_gift_sets(id);

CREATE INDEX IF NOT EXISTS group_buy_gift_sets_consumer_idx
  ON group_buy_gift_sets (consumer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS group_buy_orders_gift_set_idx
  ON group_buy_orders (gift_set_id);

CREATE OR REPLACE FUNCTION set_group_buy_gift_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_buy_gift_sets_updated_at ON group_buy_gift_sets;
CREATE TRIGGER trg_group_buy_gift_sets_updated_at
  BEFORE UPDATE ON group_buy_gift_sets
  FOR EACH ROW EXECUTE FUNCTION set_group_buy_gift_sets_updated_at();
