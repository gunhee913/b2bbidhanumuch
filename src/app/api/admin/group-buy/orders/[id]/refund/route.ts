import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/resolve-auth';
import { supabase } from '@/features/group-buy/server/db';
import { refundOrder } from '@/features/group-buy/server/refund';
import { logEvent } from '@/features/group-buy/server/events';
import { EVENT_TYPES } from '@/features/group-buy/constants/status';
import type { GroupBuyOrderRow } from '@/features/group-buy/types';

/** POST: 관리자 개별 주문 환불 · 모집중이면 구좌도 풀어준다 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await resolveAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const { id } = await params;

  const { data } = await supabase
    .from('group_buy_orders')
    .select('*, group_buy_products ( status )')
    .eq('id', id)
    .maybeSingle();
  const order = data as (GroupBuyOrderRow & { group_buy_products: { status: string } | null }) | null;
  if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  if (order.status !== 'paid') return NextResponse.json({ error: '이미 환불된 주문입니다.' }, { status: 400 });

  const reason = body.reason?.trim() || `관리자 환불 (${admin.name})`;
  const result = await refundOrder(order, reason, 'refunded', admin.name);
  if (!result.ok) return NextResponse.json({ error: result.error ?? '환불에 실패했습니다.' }, { status: 500 });

  if (order.group_buy_products?.status === 'recruiting') {
    const { data: slots } = await supabase.from('group_buy_order_slots').select('slot_no').eq('order_id', id);
    await supabase.from('group_buy_order_slots').delete().eq('order_id', id);
    await logEvent({
      productId: order.product_id,
      orderId: id,
      type: EVENT_TYPES.ORDER_CANCELLED,
      message: `관리자 환불 · ${(slots ?? []).map((s: { slot_no: number }) => s.slot_no).join(', ')}번 구좌 해제`,
      createdBy: admin.name,
    });
  }

  return NextResponse.json({ ok: true });
}
