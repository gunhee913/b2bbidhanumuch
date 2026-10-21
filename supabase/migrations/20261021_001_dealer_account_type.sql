-- ============================================================
-- 중도매인 거래 구분 · 선수(prepaid) / 외상(credit) + 총 한도
-- ============================================================
-- 입찰 가능 금액은 두 구분을 한 식으로 센다.
--
--   입찰 가능 = credit_limit + 입금 누계 − 출금 누계 − 낙찰대금 누계
--
--   - 선수 : credit_limit = 0 → 넣은 돈만큼 (기존과 같다)
--   - 외상 : 총 한도에서 미결제 외상(낙찰 − 결제 + 출금)을 뺀 「잔여 한도」
--   - 외상 중도매인이 선수금을 같이 넣는 혼합도 같은 식으로 된다
--
-- 값은 관리자 「중도매인 관리」 에서 수동으로 넣는다 (프로토타입 · 외부 연동 없음).
-- ============================================================

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'prepaid';

ALTER TABLE dealers
  DROP CONSTRAINT IF EXISTS dealers_account_type_check;

ALTER TABLE dealers
  ADD CONSTRAINT dealers_account_type_check
  CHECK (account_type IN ('prepaid', 'credit'));

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC NOT NULL DEFAULT 0 CHECK (credit_limit >= 0);

COMMENT ON COLUMN dealers.account_type IS
  '거래 구분 · prepaid=선수(입금한 만큼 입찰) / credit=외상(총 한도 안에서 입찰, 나중에 결제)';
COMMENT ON COLUMN dealers.credit_limit IS
  '외상 총 한도(원) · 선수는 0. 입찰 가능 = credit_limit + 입금 − 출금 − 낙찰대금';
