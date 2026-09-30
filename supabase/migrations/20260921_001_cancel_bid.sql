-- ============================================================
-- 매참인 입찰 취소 RPC · cancel_bid
-- ============================================================
-- 배경:
--   /api/bids/[id] DELETE 의 매참인 경로가 (1) 소유권 검증 없이 bid id 만으로 삭제되고,
--   (2) 마감 판정이 place_bid(SETTLED · rank 확정) 와 달라 회차 마감 직전 취소와
--   낙찰 확정이 겹칠 수 있었다. place_bid 와 같은 부위 row lock 안에서 처리한다.
--
-- 정책 (2026-09 확정):
--   - 본인 입찰만 취소 가능 (FORBIDDEN)
--   - 해당 상장이 속한 회차가 진행 중(auctions.status = 'open') 일 때만 취소 가능 (NOT_OPEN)
--     · 회차 대기/종료 상태에서는 취소 불가
--   - 이미 rank 가 확정된(마감된) 부위는 취소 불가 (SETTLED)
--   - 삭제 후 recalc_top_bid 로 is_top_bid 정합성 유지 · bid_audit_logs 에 dealer_cancel 기록
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_bid(
  p_bid_id UUID,
  p_dealer_id UUID,
  p_performed_by TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_bid RECORD;
  v_settled BOOLEAN;
  v_round_open BOOLEAN;
BEGIN
  -- 입찰 행 잠금
  SELECT id, auction_id, listing_id, part_id, dealer_id, bid_price, bid_amount
    INTO v_bid
    FROM bids
    WHERE id = p_bid_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_bid.dealer_id IS DISTINCT FROM p_dealer_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  -- 부위 잠금 · place_bid / close_round 와 직렬화
  PERFORM 1 FROM cattle_parts WHERE id = v_bid.part_id FOR UPDATE;

  -- 이미 회차 마감(rank 확정)된 부위
  SELECT EXISTS (
    SELECT 1 FROM bids WHERE part_id = v_bid.part_id AND rank IS NOT NULL
  ) INTO v_settled;

  IF v_settled THEN
    RETURN jsonb_build_object('ok', false, 'code', 'SETTLED');
  END IF;

  -- 상장이 속한 회차가 진행 중인가
  SELECT EXISTS (
    SELECT 1
      FROM auction_listings al
      JOIN auctions a ON a.id = al.auction_id
      WHERE al.listing_id = v_bid.listing_id
        AND a.status = 'open'
  ) INTO v_round_open;

  IF NOT v_round_open THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_OPEN');
  END IF;

  DELETE FROM bids WHERE id = v_bid.id;

  INSERT INTO bid_audit_logs (
    bid_id, auction_id, part_id, dealer_id, action_type,
    old_bid_price, new_bid_price, old_bid_amount, new_bid_amount, performed_by
  ) VALUES (
    v_bid.id, v_bid.auction_id, v_bid.part_id, v_bid.dealer_id, 'dealer_cancel',
    v_bid.bid_price, NULL, v_bid.bid_amount, NULL, p_performed_by
  );

  PERFORM recalc_top_bid(v_bid.part_id);

  RETURN jsonb_build_object(
    'ok', true,
    'bidId', v_bid.id,
    'partId', v_bid.part_id,
    'bidPrice', v_bid.bid_price,
    'bidAmount', v_bid.bid_amount
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_bid IS
  '매참인 본인 입찰 취소 · 부위 row lock · 회차 진행 중(open)·미마감(rank 없음) 일 때만 삭제 · 감사 로그 + is_top_bid 재계산';
