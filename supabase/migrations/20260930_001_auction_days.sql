-- 공판장·일자별 개장/휴장
--
-- 지금까지 경매 달력은 cattle_listings 에 그날 상장이 있는지로 경매일을 판단했다.
-- 상장 데이터는 경매 직전에야 올라오므로 (1) 다음 주에 장이 서는지 미리 알 수 없고,
-- (2) 점이 없는 날이 휴장인지 아직 안 올린 건지 구분되지 않았다. 중도매인에게는
-- 이 둘이 전혀 다른 정보라, 관리자가 미리 선언하는 자리를 따로 둔다.
--
-- 회차 시간표(round_schedules)와는 역할이 다르다. 여기는 "그날 장이 서는가",
-- 저기는 "선다면 몇 시에 몇 회차인가". 행이 없으면 아직 정해지지 않은 날(미정)이다.

CREATE TABLE IF NOT EXISTS auction_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_house VARCHAR(100) NOT NULL,
  auction_date DATE NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT,
  CONSTRAINT auction_days_uniq UNIQUE (slaughter_house, auction_date)
);

CREATE INDEX IF NOT EXISTS idx_auction_days_house_date
  ON auction_days (slaughter_house, auction_date);

COMMENT ON TABLE auction_days IS '공판장·일자별 개장/휴장 (관리자 선언) · 행이 없으면 미정';
COMMENT ON COLUMN auction_days.slaughter_house IS '공판장명 (예: 농협 음성)';
COMMENT ON COLUMN auction_days.auction_date IS '경매일';
COMMENT ON COLUMN auction_days.is_open IS 'TRUE 개장 · FALSE 휴장 (명시적 휴장은 사유를 note 에)';
COMMENT ON COLUMN auction_days.note IS '휴장 사유·특이사항 (예: 설 연휴 휴장)';

-- 이미 상장이 있었던 날은 개장으로 채워 둔다.
-- 과거 달력이 빈 채로 남으면 "예전엔 장이 없었나" 로 읽힌다.
INSERT INTO auction_days (slaughter_house, auction_date, is_open, updated_by)
SELECT DISTINCT slaughter_house, listing_date, TRUE, 'backfill'
  FROM cattle_listings
 WHERE listing_date IS NOT NULL
   AND slaughter_house IS NOT NULL
   AND status IN ('approved', 'auction', 'completed', 'closed')
ON CONFLICT (slaughter_house, auction_date) DO NOTHING;

-- 회차 시간표를 등록해 둔 날도 개장으로 본다 (관리자가 이미 열겠다고 선언한 날).
INSERT INTO auction_days (slaughter_house, auction_date, is_open, updated_by)
SELECT DISTINCT slaughter_house, auction_date, TRUE, 'backfill'
  FROM round_schedules
ON CONFLICT (slaughter_house, auction_date) DO NOTHING;
