-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_dealer ON notifications (dealer_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications (type, created_at DESC);

COMMENT ON TABLE notifications IS '중도매인 알림';
COMMENT ON COLUMN notifications.type IS '알림 타입 (listing_upload/auction_start/auction_result/balance)';

-- 중도매인 개인 알림 설정
CREATE TABLE IF NOT EXISTS notification_settings (
  dealer_id UUID PRIMARY KEY REFERENCES dealers(id) ON DELETE CASCADE,
  listing_upload BOOLEAN NOT NULL DEFAULT TRUE,
  auction_start BOOLEAN NOT NULL DEFAULT TRUE,
  auction_result BOOLEAN NOT NULL DEFAULT TRUE,
  balance BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notification_settings IS '중도매인 개인 알림 설정';

-- 관리자 전역 알림 설정
CREATE TABLE IF NOT EXISTS admin_notification_settings (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(300) NOT NULL DEFAULT '',
  category VARCHAR(20) NOT NULL DEFAULT 'auction',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO admin_notification_settings (id, name, description, category, enabled) VALUES
  ('listing_upload', '상장 정보 업로드', '관리자가 상장 등록 시 전체 중도매인에게 알림', 'auction', true),
  ('auction_start', '경매 시작', '당일 경매가 시작될 때 전체 중도매인에게 알림', 'auction', true),
  ('auction_result', '경매 결과', '회차 마감 시 참여 중도매인에게 낙찰 결과 및 금액 알림', 'auction', true),
  ('balance', '잔고/입금', '입출금 처리 시 해당 중도매인에게 알림', 'payment', true)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE admin_notification_settings IS '관리자 전역 알림 설정';

-- 알림 발송 내역 로그
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  target VARCHAR(50) NOT NULL DEFAULT 'all',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES admins(id),
  created_by_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_created ON notification_logs (created_at DESC);
CREATE INDEX idx_notification_logs_type ON notification_logs (type, created_at DESC);

COMMENT ON TABLE notification_logs IS '알림 발송 내역';
COMMENT ON COLUMN notification_logs.target IS '발송 대상 (all 또는 특정 dealer_id)';
