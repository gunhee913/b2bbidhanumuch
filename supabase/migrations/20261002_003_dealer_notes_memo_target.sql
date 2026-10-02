-- ============================================================
-- dealer_notes · 자유 메모장 대상(`memo`) 허용
-- ============================================================
-- 지금까지 메모는 늘 가리키는 것이 있었다 — 개체 하나(`listing`), 부위 하나(`part`).
-- 여기에 아무것도 가리키지 않는 한 칸을 더한다. 경매장 메모 패널 아래쪽 메모장이
-- 쓰는 자리로, 「3번 트럭 4시」 처럼 어느 소에도 붙지 않는 그날의 메모를 받는다.
--
-- 날짜는 `active_date` 가 이미 들고 있으므로 `target_id` 는 `day` 한 값만 쓴다.
-- 기존 유니크 인덱스 (dealer_id, active_date, target_type, target_id) 가 그대로
-- 「딜러 · 하루 · 메모장 하나」 를 보장한다.
-- ============================================================

ALTER TABLE dealer_notes
  DROP CONSTRAINT IF EXISTS dealer_notes_target_type_check;

ALTER TABLE dealer_notes
  ADD CONSTRAINT dealer_notes_target_type_check
  CHECK (target_type IN ('listing', 'part', 'memo'));

COMMENT ON COLUMN dealer_notes.target_type IS 'listing: 개체별, part: 부위별, memo: 그날의 자유 메모장';
COMMENT ON COLUMN dealer_notes.target_id IS 'listingNo (개체별) · part UUID (부위별) · ''day'' (메모장)';
