-- ============================================================
-- 중도매인 소속 공판장 · 소속 공판장 상장만 입찰 가능
-- ============================================================
-- 정책: "음성 중도매인은 음성공판장만 입찰할 수 있다" (2026-09 확정)
--
--   1) dealers.slaughter_house 추가 · 값은 cattle_listings.slaughter_house 와 같은
--      마스터 문자열("농협 음성" 등)을 쓴다 (src/constants/slaughterHouses.ts)
--   2) place_bid RPC 에 소속 검사 추가
--      - 중도매인 slaughter_house 가 NULL(미지정) 이면 검사하지 않는다
--        → 마이그레이션 직후 기존 중도매인이 일괄 차단되지 않도록 · 관리자 화면에서 지정
--      - 지정돼 있고 상장의 slaughter_house 와 다르면 HOUSE_MISMATCH
--   3) API(/api/bids, /api/bids/bulk) 에서도 같은 검사를 해 403 을 먼저 돌려준다 (이중 방어)
-- ============================================================

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS slaughter_house VARCHAR(100);

ALTER TABLE dealers
  DROP CONSTRAINT IF EXISTS dealers_slaughter_house_check;

ALTER TABLE dealers
  ADD CONSTRAINT dealers_slaughter_house_check
  CHECK (
    slaughter_house IS NULL
    OR slaughter_house IN ('농협 음성', '농협 부천', '농협 고령', '농협 나주')
  );

COMMENT ON COLUMN dealers.slaughter_house IS
  '소속 공판장 · 이 공판장 상장만 입찰 가능. NULL 이면 미지정(제한 없음 · 관리자 지정 필요)';

CREATE INDEX IF NOT EXISTS idx_dealers_slaughter_house ON dealers(slaughter_house);

-- ------------------------------------------------------------
-- place_bid · 소속 공판장 검사 추가 (나머지는 20260916_001 과 동일)
-- ------------------------------------------------------------
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
  v_listing_house VARCHAR(100);
  v_dealer_house VARCHAR(100);
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

  -- 소속 공판장 검사 · 중도매인에 공판장이 지정된 경우에만
  SELECT slaughter_house INTO v_dealer_house FROM dealers WHERE id = p_dealer_id;
  IF v_dealer_house IS NOT NULL THEN
    SELECT slaughter_house INTO v_listing_house
      FROM cattle_listings WHERE id = v_part.listing_id;
    IF v_listing_house IS DISTINCT FROM v_dealer_house THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'HOUSE_MISMATCH',
        'dealerHouse', v_dealer_house,
        'listingHouse', v_listing_house
      );
    END IF;
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
  '비공개 1회 입찰 · 부위 row lock 으로 동시 입찰 직렬화, 소속 공판장·min_price 검증 후 본인 입찰 upsert. 최고가 비교/증가폭 검증 없음.';
