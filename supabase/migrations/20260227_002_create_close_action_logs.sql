-- 전체 마감 / 마감 취소 이력 추적 테이블
CREATE TABLE IF NOT EXISTS close_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL CHECK (action_type IN ('close_all', 'reopen_all')),
  listing_count INTEGER NOT NULL DEFAULT 0,
  performed_by TEXT,
  action_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_close_action_logs_date ON close_action_logs (action_date);
