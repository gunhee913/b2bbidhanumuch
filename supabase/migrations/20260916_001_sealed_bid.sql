-- ============================================================
-- 비공개 1회 입찰 (Sealed-Bid) 복귀
-- ============================================================
-- 배경:
--   20260811_001_open_auction.sql 에서 오픈 최고가(공개 최고가 갱신) 방식으로
--   전환했으나, 사업 정책이 "비공개 1회 입찰" 로 확정되어 되돌린다.
--
-- 변경 요지:
--   1) place_bid RPC 재정의
--      - 유지: 부위 row lock(FOR UPDATE) · is_included · min_price 검증 · upsert
--      - 제거: 현재 최고가 대비 증가폭(min_increment) 검증 · OUTBID 반환
--      - 추가: 이미 rank 가 확정된(마감된) 부위에는 입찰 불가 (SETTLED)
--      - 마감 전 본인 입찰 수정은 허용 (정책 A · 오입찰 자가 수정 가능)
--   2) is_top_bid 컬럼·인덱스는 유지
--      - 관리자 화면 O(1) 최고가 조회 및 /api/bids/[id] 재계산 로직 호환용
--      - 매참인/비로그인 응답에는 API 레이어에서 노출하지 않는다
--      - place_bid 는 계속 is_top_bid 를 정합하게 유지한다 (내부 정보)
--   3) recalc_top_bid 는 그대로 유지
--
-- 낙찰 확정(rank / is_winning)은 여전히 close_round RPC 에서만 세팅된다.
-- ============================================================

DROP FUNCTION IF EXISTS place_bid(UUID, UUID, INT, UUID, INT);

CREATE OR REPLACE FUNCTION place_bid(
  p_part_id UUID,
  p_dealer_id UUID,
  p_bid_price INT,
  p_auction_id UUID DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_part RECORD;
  v_existing RECORD;
  v_bid_amount INT;
  v_bid_id UUID;
  v_settled BOOLEAN;
BEGIN
  -- 부위 잠금 · 동일 부위 동시 입찰 직렬화
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

  -- 이미 회차 마감(rank 확정)된 부위는 편집 불가
  SELECT EXISTS (
    SELECT 1 FROM bids WHERE part_id = p_part_id AND rank IS NOT NULL
  ) INTO v_settled;

  IF v_settled THEN
    RETURN jsonb_build_object('ok', false, 'code', 'SETTLED');
  END IF;

  -- min_price 검증 · 비공개 입찰에서 유일한 가격 하한
  IF v_part.min_price IS NOT NULL AND p_bid_price < v_part.min_price THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'BELOW_MIN',
      'minPrice', v_part.min_price
    );
  END IF;

  v_bid_amount := ROUND(p_bid_price * COALESCE(v_part.weight, 0))::INT;

  -- 내 기존 입찰 (있으면) 잠금 → 수정, 없으면 신규
  SELECT id, bid_price
    INTO v_existing
    FROM bids
    WHERE part_id = p_part_id AND dealer_id = p_dealer_id
    FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    UPDATE bids
      SET bid_price = p_bid_price,
          bid_amount = v_bid_amount,
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
      p_bid_price, v_bid_amount, false, NOW()
    )
    RETURNING id INTO v_bid_id;
  END IF;

  -- is_top_bid 정합성 유지 (내부용 · 관리자 화면 O(1) 조회)
  PERFORM recalc_top_bid(p_part_id);

  RETURN jsonb_build_object(
    'ok', true,
    'bidId', v_bid_id,
    'bidAmount', v_bid_amount,
    'isUpdate', v_existing.id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION place_bid IS
  '비공개 1회 입찰 · 부위 row lock 으로 동시 입찰 직렬화, min_price 검증 후 본인 입찰 upsert. 최고가 비교/증가폭 검증 없음.';
