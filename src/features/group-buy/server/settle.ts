import 'server-only';

import { EVENT_TYPES } from '../constants/status';
import type { GroupBuyProductRow, GroupBuyStatus } from '../types';
import { supabase } from './db';
import { logEvent } from './events';
import { markReservationsRefundedForProduct } from './pools';
import { canForceTransition } from './products';
import { refundProductOrders } from './refund';
import { getSettings } from './settings';

const LOST_REASON = '물량 미확보';
const EXPIRED_REASON = '모집 기간 내 주문 없음';

interface SettleTarget extends GroupBuyProductRow {
  cattle_parts: { id: string; winning_dealer_id: string | null; bid_price: number | null } | null;
}

/**
 * 경매(회차) 마감 후 호출 · 응찰중(bidding)·모집완료(full) 상품의 낙찰 여부를 판정한다.
 * - cattle_parts.winning_dealer_id 가 플랫폼 계정이면 won
 * - 다른 중도매인이 낙찰했거나, 이 상장이 마감(closed)됐는데 낙찰자가 없으면 lost → 전액 환불
 * - 아직 낙찰 확정이 없고 상장이 안 끝났으면(재경매 대기) 그대로 둔다
 */
export async function settleProductsForListings(listingIds: string[], by: string | null = null): Promise<{ won: number; lost: number; pending: number }> {
  if (listingIds.length === 0) return { won: 0, lost: 0, pending: 0 };
  const { platformDealerId } = await getSettings();

  const { data } = await supabase
    .from('group_buy_products')
    .select('*, cattle_parts ( id, winning_dealer_id, bid_price )')
    .in('listing_id', listingIds)
    .in('status', ['full', 'bidding']);

  const { data: listings } = await supabase
    .from('cattle_listings')
    .select('id, status')
    .in('id', listingIds);
  const closedListings = new Set(
    ((listings ?? []) as { id: string; status: string }[]).filter((l) => l.status === 'closed').map((l) => l.id),
  );

  let won = 0;
  let lost = 0;
  let pending = 0;

  for (const product of (data ?? []) as SettleTarget[]) {
    const winner = product.cattle_parts?.winning_dealer_id ?? null;

    if (winner && platformDealerId && winner === platformDealerId) {
      await supabase
        .from('group_buy_products')
        .update({ status: 'won', result_price: product.cattle_parts?.bid_price ?? null })
        .eq('id', product.id);
      await logEvent({ productId: product.id, type: EVENT_TYPES.WON, message: `플랫폼 낙찰 · ${(product.cattle_parts?.bid_price ?? 0).toLocaleString()}원/kg`, createdBy: by });
      won += 1;
      continue;
    }

    const listingClosed = closedListings.has(product.listing_id);
    if (winner || listingClosed) {
      await markLost(product.id, winner ? '타 중도매인 낙찰' : '유찰 · 상장 마감', by);
      lost += 1;
      continue;
    }

    pending += 1;
  }

  return { won, lost, pending };
}

/** 회차 id 로 상장 목록을 풀어 정산 */
export async function settleProductsForAuction(auctionId: string, by: string | null = null) {
  const { data: links } = await supabase.from('auction_listings').select('listing_id').eq('auction_id', auctionId);
  const listingIds = (links ?? []).map((l: { listing_id: string }) => l.listing_id);
  return settleProductsForListings(listingIds, by);
}

async function markLost(productId: string, internalReason: string, by: string | null) {
  await supabase
    .from('group_buy_products')
    .update({ status: 'lost', cancelled_reason: internalReason })
    .eq('id', productId);
  await logEvent({ productId, type: EVENT_TYPES.LOST, message: `물량 미확보 · ${internalReason}`, createdBy: by });
  await refundProductOrders({ productId, reason: LOST_REASON, by });
  await markReservationsRefundedForProduct(productId, LOST_REASON);
}

/**
 * 모집 마감이 지났는데 아직 recruiting 인 상품을 정리한다 · cron 또는 관리자 버튼에서 호출.
 * - 구좌가 하나라도 팔렸으면 full → 물량 확보(응찰)로 넘어간다. 안 팔린 위치는 식육식당(매장)에서 판다.
 * - 주문이 하나도 없으면 cancelled · 환불할 주문도 없다.
 */
export async function expireRecruitingProducts(now = new Date(), by: string | null = null): Promise<{ expired: number }> {
  const { data } = await supabase
    .from('group_buy_products')
    .select('id, slot_count, group_buy_order_slots ( slot_no )')
    .eq('status', 'recruiting')
    .lt('recruit_deadline', now.toISOString());

  let expired = 0;
  for (const row of (data ?? []) as { id: string; slot_count: number | null; group_buy_order_slots: { slot_no: number }[] | null }[]) {
    const sold = row.group_buy_order_slots?.length ?? 0;
    const total = row.slot_count ?? 0;
    if (sold > 0) {
      await supabase.from('group_buy_products').update({ status: 'full' }).eq('id', row.id).eq('status', 'recruiting');
      const rest = Math.max(0, total - sold);
      await logEvent({
        productId: row.id,
        type: EVENT_TYPES.FULL,
        message: rest === 0 ? `모집 마감 · 전 ${total}구좌 판매 완료 · 응찰 대기` : `모집 마감 · ${sold}/${total}구좌 판매 · 남은 ${rest}구좌는 매장 판매 · 응찰 대기`,
        createdBy: by,
      });
      continue;
    }

    await supabase
      .from('group_buy_products')
      .update({ status: 'cancelled', cancelled_reason: `주문 없음 (0/${total})` })
      .eq('id', row.id)
      .eq('status', 'recruiting');
    await logEvent({ productId: row.id, type: EVENT_TYPES.EXPIRED, message: `모집 마감 · 주문 없음 · 자동 종료`, createdBy: by });
    await refundProductOrders({ productId: row.id, reason: EXPIRED_REASON, by });
    expired += 1;
  }
  return { expired };
}

/**
 * 관리자 강제 전이 · 시연·예외 처리용.
 * lost/cancelled 로 보내면 환불까지 같이 돈다.
 */
export async function forceTransition(
  productId: string,
  to: GroupBuyStatus,
  by: string,
  note?: string,
): Promise<{ error: string | null; status?: number }> {
  const { data } = await supabase.from('group_buy_products').select('status').eq('id', productId).maybeSingle();
  const row = data as { status: GroupBuyStatus } | null;
  if (!row) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  if (!canForceTransition(row.status, to)) {
    return { error: `${row.status} → ${to} 전이는 허용되지 않습니다.`, status: 400 };
  }

  const patch: Partial<GroupBuyProductRow> = { status: to };
  if (to === 'lost' || to === 'cancelled') patch.cancelled_reason = note || `관리자 처리 (${by})`;

  const { error } = await supabase.from('group_buy_products').update(patch).eq('id', productId);
  if (error) return { error: error.message, status: 500 };

  await logEvent({
    productId,
    type: EVENT_TYPES.STATUS_FORCED,
    message: `관리자 상태 변경 · ${row.status} → ${to}${note ? ` · ${note}` : ''}`,
    payload: { from: row.status, to },
    createdBy: by,
  });

  if (to === 'lost') await refundProductOrders({ productId, reason: LOST_REASON, by });
  if (to === 'cancelled') await refundProductOrders({ productId, reason: EXPIRED_REASON, by });
  if (to === 'lost' || to === 'cancelled') await markReservationsRefundedForProduct(productId, to === 'lost' ? LOST_REASON : EXPIRED_REASON);

  return { error: null };
}
