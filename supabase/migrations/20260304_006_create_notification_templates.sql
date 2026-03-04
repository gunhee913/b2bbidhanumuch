-- 알림 양식 템플릿 테이블
CREATE TABLE IF NOT EXISTS notification_templates (
  id VARCHAR(30) PRIMARY KEY,
  title_template VARCHAR(200) NOT NULL,
  message_template TEXT NOT NULL DEFAULT '',
  available_vars TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO notification_templates (id, title_template, message_template, available_vars) VALUES
  ('listing_upload', '상장 정보 업로드', '상장 정보가 등록되었습니다. ({listingNo})', 'listingNo'),
  ('auction_start', '경매 시작', '{roundNo}차 경매가 시작되었습니다. ({count}두)', 'roundNo, count'),
  ('auction_result', '{roundNo}차 경매 결과', E'총 입찰 {totalCount}건 | 낙찰 {successCount}건 | 미낙찰 {failedCount}건\n총 낙찰금액: {bidAmount}원\n낙찰금액은 잔고에서 차감됩니다.', 'roundNo, totalCount, successCount, failedCount, bidAmount'),
  ('balance', '{type} 안내', '{type} {amount}원 (잔액: {balance}원)', 'type, amount, balance')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE notification_templates IS '알림 양식 템플릿';
COMMENT ON COLUMN notification_templates.title_template IS '제목 양식 ({변수명} 형태)';
COMMENT ON COLUMN notification_templates.message_template IS '내용 양식 ({변수명} 형태)';
COMMENT ON COLUMN notification_templates.available_vars IS '사용 가능한 변수 목록 (쉼표 구분)';
