CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('android', 'ios')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, token)
);

CREATE INDEX idx_device_tokens_dealer ON device_tokens(dealer_id);

COMMENT ON TABLE device_tokens IS 'FCM 디바이스 토큰 (푸시 알림용)';
COMMENT ON COLUMN device_tokens.platform IS '플랫폼 (android | ios)';
