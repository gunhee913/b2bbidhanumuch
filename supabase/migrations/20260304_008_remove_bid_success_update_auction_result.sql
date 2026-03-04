-- bid_success 알림 타입 제거, auction_result 템플릿 업데이트

-- 1. admin_notification_settings에서 bid_success 삭제
DELETE FROM admin_notification_settings WHERE id = 'bid_success';

-- 2. auction_result 설명 업데이트
UPDATE admin_notification_settings
SET name = '경매 결과',
    description = '회차 마감 시 참여 중도매인에게 낙찰 결과 및 금액 알림'
WHERE id = 'auction_result';

-- 3. notification_templates에서 bid_success 삭제
DELETE FROM notification_templates WHERE id = 'bid_success';

-- 4. auction_result 템플릿 업데이트 (회차, 낙찰금액 포함)
UPDATE notification_templates
SET title_template = '{roundNo}차 경매 결과',
    message_template = '총 입찰 {totalCount}건 | 낙찰 {successCount}건 | 미낙찰 {failedCount}건' || E'\n' || '총 낙찰금액: {bidAmount}원' || E'\n' || '낙찰금액은 잔고에서 차감됩니다.',
    available_vars = 'roundNo, totalCount, successCount, failedCount, bidAmount'
WHERE id = 'auction_result';

-- 5. notification_settings 테이블에서 bid_success 컬럼 제거
ALTER TABLE notification_settings DROP COLUMN IF EXISTS bid_success;

-- 6. notifications 테이블의 type 코멘트 업데이트
COMMENT ON COLUMN notifications.type IS '알림 타입 (listing_upload/auction_start/auction_result/balance)';
