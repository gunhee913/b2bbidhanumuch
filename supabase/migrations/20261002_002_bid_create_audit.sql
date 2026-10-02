-- ============================================
-- 입찰 「처음 넣음」 도 감사 로그에 남긴다
--
-- 지금까지 bid_audit_logs 는 **고치거나 지운 것**만 받았다. 처음 넣은 입찰은
-- bids 행 자체가 기록이니 따로 남길 까닭이 없다고 본 것인데, 그 전제는 취소에서
-- 깨진다 — cancel_bid 가 bids 행을 지우고 나면 그 입찰이 언제 들어왔는지를
-- 아는 데가 한 곳도 안 남는다. 중도매인 화면에는 「10:27 에 넣었다가 10:31 에
-- 뺐다」 가 떠야 하는데 뒷말만 남아 있던 셈이다.
--
-- 그래서 action_type 에 'dealer_create' 를 들인다. 쌓이는 것은 오늘부터이고
-- 지난 취소분은 취소 시각만 보인다 — 없는 과거를 지어낼 수는 없다.
-- ============================================

ALTER TABLE bid_audit_logs
  DROP CONSTRAINT IF EXISTS bid_audit_logs_action_type_check;

ALTER TABLE bid_audit_logs
  ADD CONSTRAINT bid_audit_logs_action_type_check
  CHECK (action_type IN (
    'dealer_create',
    'dealer_update',
    'dealer_cancel',
    'update',
    'delete'
  ));

COMMENT ON COLUMN bid_audit_logs.action_type IS
  'dealer_create 처음 넣음 · dealer_update 중도매인 수정 · dealer_cancel 중도매인 취소 · update/delete 관리자 조작';

-- 중도매인 한 사람의 입찰내역을 시간순으로 훑는 조회용.
-- 기존 세 인덱스(auction · part · created)는 관리자가 「이 부위에 무슨 일이
-- 있었나」 를 볼 때의 길이라, 「내가 오늘 뭘 했나」 에는 하나도 맞지 않는다.
CREATE INDEX IF NOT EXISTS idx_bid_audit_logs_dealer_created
  ON bid_audit_logs(dealer_id, created_at DESC);
