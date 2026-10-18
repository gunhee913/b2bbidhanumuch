import 'server-only';

import { supabase } from './db';

/** 상태 변화 기록 · 실패해도 본 흐름을 막지 않는다 */
export async function logEvent(input: {
  productId?: string | null;
  orderId?: string | null;
  type: string;
  message?: string;
  payload?: Record<string, unknown>;
  createdBy?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('group_buy_events').insert({
    product_id: input.productId ?? null,
    order_id: input.orderId ?? null,
    type: input.type,
    message: input.message ?? null,
    payload: input.payload ?? {},
    created_by: input.createdBy ?? null,
  });
  if (error) console.error('[group-buy] event log failed:', error.message);
}
