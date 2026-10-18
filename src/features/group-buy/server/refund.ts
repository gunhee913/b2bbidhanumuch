import 'server-only';

import { EVENT_TYPES } from '../constants/status';
import { getPaymentProvider } from '../lib/payment/mock';
import type { GroupBuyOrderRow, OrderStatus } from '../types';
import { supabase } from './db';
import { logEvent } from './events';

/**
 * 한 상품의 결제 완료 주문을 모두 환불한다 · 미달 취소·물량 미확보·관리자 환불 공용.
 * 구좌 행은 삭제하지 않는다 — 상품이 끝난 뒤라 다시 팔 일이 없고, 누가 어느 구좌였는지 남겨둔다.
 */
export async function refundProductOrders(input: {
  productId: string;
  reason: string;
  toStatus?: OrderStatus;
  by?: string | null;
}): Promise<{ refunded: number; failed: number }> {
  const { data } = await supabase
    .from('group_buy_orders')
    .select('*')
    .eq('product_id', input.productId)
    .eq('status', 'paid');

  const orders = (data ?? []) as GroupBuyOrderRow[];
  let refunded = 0;
  let failed = 0;

  for (const order of orders) {
    const result = await refundOrder(order, input.reason, input.toStatus ?? 'refunded', input.by ?? null);
    if (result.ok) refunded += 1;
    else failed += 1;
  }

  return { refunded, failed };
}

export async function refundOrder(
  order: GroupBuyOrderRow,
  reason: string,
  toStatus: OrderStatus,
  by: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const provider = getPaymentProvider();
  const result = await provider.refund(order.payment_key ?? '', order.amount, reason);
  if (!result.ok) {
    await logEvent({ productId: order.product_id, orderId: order.id, type: EVENT_TYPES.REFUNDED, message: `환불 실패: ${result.message}`, createdBy: by });
    return { ok: false, error: result.message };
  }

  const { error } = await supabase
    .from('group_buy_orders')
    .update({ status: toStatus, refunded_at: result.refundedAt, refund_reason: reason })
    .eq('id', order.id)
    .eq('status', 'paid');

  if (error) return { ok: false, error: error.message };

  await logEvent({
    productId: order.product_id,
    orderId: order.id,
    type: EVENT_TYPES.REFUNDED,
    message: `${order.amount.toLocaleString()}원 환불 · ${reason}`,
    payload: { amount: order.amount, toStatus },
    createdBy: by,
  });
  return { ok: true };
}
