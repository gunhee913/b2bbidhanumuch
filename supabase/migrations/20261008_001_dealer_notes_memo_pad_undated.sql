-- ============================================================
-- dealer_notes · 메모장을 날짜에서 떼어 딜러마다 한 칸으로
-- ============================================================
-- 메모장(target_type='memo')은 지금까지 상장일마다 따로 열렸다. 날이 바뀌면 빈 칸이
-- 뜨고 어제 적은 것은 달력을 거슬러야 보였는데, 그러느니 안 적게 된다.
--
-- 앞으로는 날짜 자리에 늘 '-' 를 넣어 (딜러 · '-' · 'memo' · 'day') 한 줄만 쓴다.
-- 기존 유니크 인덱스 (dealer_id, active_date, target_type, target_id) 가 그대로
-- 「딜러마다 메모장 하나」 를 보장한다. '-' 는 실제 상장일(yyyy-MM-dd)과 겹치지 않고
-- 아스키로 숫자보다 앞서, 날짜 범위 조회에도 걸려들지 않는다.
--
-- 이미 날짜별로 적어 둔 것은 버리지 않고 한 칸에 모은다. 최근 것이 위로 오게 쌓고
-- 사이를 빈 줄로만 벌린다 — 날짜 머리글은 달지 않는다. 메모장은 날짜를 가르는 자리가
-- 아니라 그냥 계속 적어 두는 칸이라, 머리글이 있으면 적을 때마다 「오늘 머리를 새로
-- 달아야 하나」 를 생각하게 된다.
--
-- 모은 뒤 원본을 지우므로 두 번 돌려도 같은 결과다.
-- ============================================================

BEGIN;

WITH gathered AS (
  SELECT
    dealer_id,
    string_agg(body, E'\n\n' ORDER BY active_date DESC) AS body,
    max(updated_at) AS updated_at,
    (array_agg(created_by ORDER BY active_date ASC))[1] AS created_by,
    (array_agg(updated_by ORDER BY active_date DESC))[1] AS updated_by
  FROM dealer_notes
  WHERE target_type = 'memo'
    AND target_id = 'day'
    AND active_date <> '-'
  GROUP BY dealer_id
)
INSERT INTO dealer_notes
  (dealer_id, active_date, target_type, target_id, body,
   created_by, updated_by, updated_at)
SELECT
  dealer_id, '-', 'memo', 'day', left(body, 4000),
  created_by, updated_by, updated_at
FROM gathered
ON CONFLICT (dealer_id, active_date, target_type, target_id)
DO UPDATE SET
  -- 이미 '-' 칸을 쓰고 있었다면 그쪽이 최신이므로 위에 둔다
  body = left(dealer_notes.body || E'\n\n' || excluded.body, 4000),
  updated_at = now();

DELETE FROM dealer_notes
WHERE target_type = 'memo'
  AND target_id = 'day'
  AND active_date <> '-';

COMMIT;

COMMENT ON COLUMN dealer_notes.active_date IS
  '상장일 (yyyy-MM-dd) · 메모장(target_type=''memo'')만 날짜를 안 가리는 ''-''';
COMMENT ON COLUMN dealer_notes.target_type IS
  'listing: 개체별, part: 부위별, memo: 날짜와 무관한 자유 메모장';
