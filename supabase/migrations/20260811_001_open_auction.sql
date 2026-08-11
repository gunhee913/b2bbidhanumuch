-- ============================================================
-- 오픈 최고가 경매 (Open Highest-Bid) 전환
-- ============================================================
-- Phase 3 · 계획서 [플랫폼_개방_통합_전환]
--
-- 변경 요지:
-- 1) bids.is_top_bid 컬럼 · 진행 중에도 부위별 최고가 O(1) 조회
-- 2) place_bid RPC · SELECT FOR UPDATE 로 race condition 방지,
--    min_price + (currentTop + min_increment) 검증, is_top_bid upsert
-- 3) 기존 데이터 backfill · 각 부위별 최고가에 is_top_bid = true
--
-- 낙찰 확정 (is_winning / rank) 는 여전히 close_round RPC 에서만 세팅.
-- is_top_bid 는 "지금 이 순간 최고가" 이며, is_winning 은 "회차 마감 후 확정" 이다.
-- ============================================================

-- 1) is_top_bid 컬럼 (bids) --------------------------------------------------
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS is_top_bid BOOLEAN NOT NULL DEFAULT false;

-- 부위별로 is_top_bid=true 인 row 는 정확히 0개 (입찰 없음) 또는 1개 (최고가).
-- 부분 UNIQUE 인덱스로 무결성 보장 + 최고가 조회 O(1).
CREATE UNIQUE INDEX IF NOT EXISTS bids_part_top_uniq
  ON bids (part_id) WHERE is_top_bid = true;

-- 조회용 보조 인덱스 (part_id, bid_price desc) · place_bid 내부 FOR UPDATE 스캔용
CREATE INDEX IF NOT EXISTS bids_part_price_desc_idx
  ON bids (part_id, bid_price DESC, created_at ASC);

-- 2) 기존 데이터 backfill · 각 부위의 최고가에 is_top_bid=true --------------
-- 동가일 경우 먼저 입찰한 row 를 선택 (close_round 의 tiebreaker 와 동일 규칙)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY part_id
           ORDER BY bid_price DESC, created_at ASC
         ) AS rn
  FROM bids
)
UPDATE bids b
SET is_top_bid = (ranked.rn = 1)
FROM ranked
WHERE b.id = ranked.id
  AND b.is_top_bid IS DISTINCT FROM (ranked.rn = 1);

-- 3) place_bid RPC ----------------------------------------------------------
-- 원자적 오픈 최고가 입찰 함수.
-- - cattle_parts row lock (FOR UPDATE) 로 동시 입찰 race condition 방지
-- - min_price / min_increment 검증
-- - 기존 최고가 row 의 is_top_bid=false 로 강등, 새 입찰 row 를 is_top_bid=true 로 upsert
-- - 성공 시 { ok:true, bidId, currentTop, bidAmount }, 실패 시 { ok:false, code, ... }
CREATE OR REPLACE FUNCTION place_bid(
  p_part_id UUID,
  p_dealer_id UUID,
  p_bid_price INT,
  p_auction_id UUID DEFAULT NULL,
  p_min_increment INT DEFAULT 100
) RETURNS jsonb AS $$
DECLARE
  v_part RECORD;
  v_current_top RECORD;
  v_existing RECORD;
  v_next_min INT;
  v_bid_amount INT;
  v_bid_id UUID;
BEGIN
  -- 부위 잠금
  SELECT id, listing_id, min_price, weight, is_included
    INTO v_part
    FROM cattle_parts
    WHERE id = p_part_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PART_NOT_FOUND');
  END IF;

  IF NOT v_part.is_included THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_INCLUDED');
  END IF;

  -- min_price 검증
  IF v_part.min_price IS NOT NULL AND p_bid_price < v_part.min_price THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'BELOW_MIN',
      'minPrice', v_part.min_price
    );
  END IF;

  -- 현재 최고가 row (있으면) 잠금
  SELECT id, dealer_id, bid_price
    INTO v_current_top
    FROM bids
    WHERE part_id = p_part_id AND is_top_bid = true
    FOR UPDATE;

  -- 내 기존 입찰 (있으면) 잠금
  SELECT id, bid_price, is_top_bid
    INTO v_existing
    FROM bids
    WHERE part_id = p_part_id AND dealer_id = p_dealer_id
    FOR UPDATE;

  -- 최고가 대비 증가폭 검증
  -- 내가 이미 1위인 경우엔 min_price 이상이면 자유롭게 조정 가능.
  -- 그 외에는 currentTop + min_increment 이상이어야 갱신.
  IF v_current_top.id IS NOT NULL
     AND (v_existing.id IS NULL OR v_existing.is_top_bid IS NOT TRUE) THEN
    v_next_min := v_current_top.bid_price + p_min_increment;
    IF p_bid_price < v_next_min THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'OUTBID',
        'currentTop', v_current_top.bid_price,
        'nextMin', v_next_min
      );
    END IF;
  END IF;

  v_bid_amount := ROUND(p_bid_price * COALESCE(v_part.weight, 0))::INT;

  -- 기존 최고가 row 강등 (내 기존 입찰이 최고가였다면 아래 upsert 에서 다시 true 로 세팅됨)
  IF v_current_top.id IS NOT NULL THEN
    UPDATE bids SET is_top_bid = false WHERE id = v_current_top.id;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE bids
      SET bid_price = p_bid_price,
          bid_amount = v_bid_amount,
          is_top_bid = true,
          auction_id = COALESCE(p_auction_id, auction_id),
          updated_at = NOW()
      WHERE id = v_existing.id;
    v_bid_id := v_existing.id;
  ELSE
    INSERT INTO bids (
      auction_id, listing_id, part_id, dealer_id,
      bid_price, bid_amount, is_top_bid, created_at
    )
    VALUES (
      p_auction_id, v_part.listing_id, p_part_id, p_dealer_id,
      p_bid_price, v_bid_amount, true, NOW()
    )
    RETURNING id INTO v_bid_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'bidId', v_bid_id,
    'currentTop', p_bid_price,
    'bidAmount', v_bid_amount,
    'isUpdate', v_existing.id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION place_bid IS
  '오픈 최고가 입찰 · 부위 row lock 으로 race condition 방지, min_price/min_increment 검증 후 is_top_bid 재계산';

-- 4) 입찰 삭제/수정 후 is_top_bid 재계산 헬퍼 -------------------------------
-- 앱 코드의 recalcWinnerForPart 와 동일한 tie-break 규칙을 DB 에서도 사용할 수 있도록 제공.
-- (앱 코드에서 rank/is_winning 갱신을 이미 처리하므로 필수는 아니지만, 관리자 API 에서 병행 호출 시 안전한 backup).
CREATE OR REPLACE FUNCTION recalc_top_bid(p_part_id UUID)
RETURNS void AS $$
DECLARE
  v_new_top UUID;
BEGIN
  SELECT id INTO v_new_top
    FROM bids
    WHERE part_id = p_part_id
    ORDER BY bid_price DESC, created_at ASC
    LIMIT 1
    FOR UPDATE;

  UPDATE bids SET is_top_bid = false
    WHERE part_id = p_part_id AND is_top_bid = true;

  IF v_new_top IS NOT NULL THEN
    UPDATE bids SET is_top_bid = true WHERE id = v_new_top;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalc_top_bid IS
  '부위별 is_top_bid 재계산 · 관리자 입찰 수정/삭제 후 backup 용';
