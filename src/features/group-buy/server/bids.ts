import 'server-only';

import { EVENT_TYPES } from '../constants/status';
import type { GroupBuyProductRow } from '../types';
import { supabase } from './db';
import { logEvent } from './events';
import { getSettings } from './settings';

interface PartForBid {
  id: string;
  min_price: number | null;
  listing_id: string;
  winning_dealer_id: string | null;
}

/**
 * 회차가 열릴 때 호출 · 그 회차 상장들의 `full` 상품에 플랫폼 계정으로 자동 1회 입찰.
 *
 * 입찰 단가 = 상품의 bid_price_cap, 없으면 부위 최저가(min_price).
 * 기존 place_bid RPC 를 그대로 써서 중도매인 입찰과 같은 검증(row lock · min_price · SETTLED)을 받는다.
 */
export async function placePlatformBids(auctionId: string): Promise<{ placed: number; skipped: number; failed: number }> {
  const { platformDealerId } = await getSettings();
  if (!platformDealerId) {
    console.warn('[group-buy] platform dealer not configured · auto bid skipped');
    return { placed: 0, skipped: 0, failed: 0 };
  }

  const { data: links } = await supabase
    .from('auction_listings')
    .select('listing_id')
    .eq('auction_id', auctionId);
  const listingIds = (links ?? []).map((l: { listing_id: string }) => l.listing_id);
  if (listingIds.length === 0) return { placed: 0, skipped: 0, failed: 0 };

  // full: 첫 응찰 · bidding: 지난 회차에서 유찰(낙찰자 없음)된 재경매 부위는 다시 응찰
  const { data: products } = await supabase
    .from('group_buy_products')
    .select('*, cattle_parts ( id, min_price, listing_id, winning_dealer_id )')
    .in('listing_id', listingIds)
    .in('status', ['full', 'bidding']);

  let placed = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of (products ?? []) as (GroupBuyProductRow & { cattle_parts: PartForBid | null })[]) {
    const part = product.cattle_parts;
    if (!part || part.winning_dealer_id) { skipped += 1; continue; }

    const bidPrice = product.bid_price_cap ?? part.min_price ?? null;
    if (!bidPrice) {
      skipped += 1;
      await logEvent({ productId: product.id, type: EVENT_TYPES.BID_FAILED, message: '응찰 단가가 없어 자동 응찰을 건너뜀' });
      continue;
    }

    const { data: rpcData, error } = await supabase.rpc('place_bid', {
      p_part_id: part.id,
      p_dealer_id: platformDealerId,
      p_bid_price: bidPrice,
      p_auction_id: auctionId,
    });

    const result = rpcData as { ok: boolean; code?: string; bidId?: string; bidAmount?: number } | null;

    if (error || !result?.ok) {
      failed += 1;
      await logEvent({
        productId: product.id,
        type: EVENT_TYPES.BID_FAILED,
        message: `자동 응찰 실패 · ${error?.message ?? result?.code ?? 'UNKNOWN'}`,
        payload: { bidPrice, code: result?.code },
      });
      continue;
    }

    await supabase
      .from('group_buy_products')
      .update({ status: 'bidding', bid_id: result.bidId ?? null })
      .eq('id', product.id)
      .in('status', ['full', 'bidding']);

    await supabase.from('bid_audit_logs').insert({
      bid_id: result.bidId ?? null,
      auction_id: auctionId,
      part_id: part.id,
      dealer_id: platformDealerId,
      action_type: 'dealer_create',
      old_bid_price: null,
      new_bid_price: bidPrice,
      old_bid_amount: null,
      new_bid_amount: result.bidAmount ?? null,
      performed_by: null,
    });

    await logEvent({
      productId: product.id,
      type: EVENT_TYPES.BID_PLACED,
      message: `플랫폼 자동 응찰 · ${bidPrice.toLocaleString()}원/kg`,
      payload: { bidPrice, bidId: result.bidId, auctionId },
    });
    placed += 1;
  }

  return { placed, skipped, failed };
}
