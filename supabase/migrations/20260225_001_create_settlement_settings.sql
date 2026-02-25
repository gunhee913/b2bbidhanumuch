CREATE TABLE IF NOT EXISTS settlement_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO settlement_settings (name, type, value, enabled, sort_order, updated_by) VALUES
  ('상장수수료', 'percentage', 1.5, true, 0, '시스템'),
  ('물류비', 'fixed', 21000, true, 1, '시스템'),
  ('상차비', 'fixed', 20000, true, 2, '시스템');
