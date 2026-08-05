-- 공판장·일자별 경매 회차 예정 시간표
-- 실행 이력(auctions) 과 분리하여 관리자가 사전에 회차별 시작/종료 시각을 등록하는 테이블.
-- 라이브 페이지가 이 테이블을 조회해 회차별 예정 시간표를 노출한다.
-- 자동 타이머는 아니며, 담당자가 수동으로 회차를 open/close 하는 흐름은 유지된다.

CREATE TABLE IF NOT EXISTS round_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slaughter_house VARCHAR(100) NOT NULL,
  auction_date DATE NOT NULL,
  round_no INT NOT NULL,
  planned_start TIME NOT NULL,
  planned_end   TIME NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT,
  CONSTRAINT round_schedules_uniq UNIQUE (slaughter_house, auction_date, round_no),
  CONSTRAINT round_schedules_time_order CHECK (planned_end > planned_start),
  CONSTRAINT round_schedules_round_positive CHECK (round_no > 0)
);

CREATE INDEX IF NOT EXISTS idx_round_schedules_house_date
  ON round_schedules (slaughter_house, auction_date);

COMMENT ON TABLE round_schedules IS '공판장·일자별 회차 예정 시간표 (관리자 수동 등록)';
COMMENT ON COLUMN round_schedules.slaughter_house IS '공판장명 (예: 농협 음성)';
COMMENT ON COLUMN round_schedules.auction_date IS '경매일';
COMMENT ON COLUMN round_schedules.round_no IS '회차 번호 (1부터)';
COMMENT ON COLUMN round_schedules.planned_start IS '예정 시작 시각 (Asia/Seoul)';
COMMENT ON COLUMN round_schedules.planned_end IS '예정 종료 시각 (Asia/Seoul)';
