import 'server-only';

import { EVENT_TYPES } from '../constants/status';
import { getPaymentProvider } from '../lib/payment/mock';
import { TRIM_SLICE_LABEL } from '../lib/pools';
import { allowsTrimAndSlice, isDineIn, RECEIVE_METHOD_LABELS, shippingForReceive, toReceiveMethod } from '../lib/receive';
import { buildProductZones, calcSlotWeight, orderTotals } from '../lib/slots';
import type { ConsumerOrder, CreateOrderInput, GroupBuyOrderRow, ReceiveMethod, ShippingInfo } from '../types';
import {
  loadGroupImageMap,
  ORDER_SELECT,
  PRODUCT_SELECT,
  supabase,
  toNumber,
  type OrderWithJoins,
  type ProductWithJoins,
} from './db';
import { logEvent } from './events';
import { toConsumerOrder } from './mappers';
import { refundOrder } from './refund';
import { resolvePickup, type ResolvedPickup } from './stores';

export interface CreateOrderResult {
  ok: boolean;
  order?: ConsumerOrder;
  status?: number;
  error?: string;
  code?: string;
  takenSlotNos?: number[];
}

/**
 * 주문 생성 · 구좌 선점은 group_buy_order_slots UNIQUE 로 보장한다.
 *
 * 순서: 주문 행 생성(미결제) → 구좌 insert(충돌 시 409 · 주문 삭제) → 결제 승인 →
 * paid_at 기록 → 전 구좌 소진이면 상품 full (일부만 팔린 상품은 모집 마감 때 full 로 넘어간다).
 * 결제가 실패하면 구좌와 주문을 되돌린다.
 */
export async function createOrder(
  consumer: { id: string; name: string; phone: string },
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const slotNos = Array.from(new Set(input.slotNos)).filter((n) => Number.isInteger(n) && n >= 1).sort((a, b) => a - b);
  if (slotNos.length === 0) return { ok: false, status: 400, error: '구좌를 선택해주세요.' };

  const receiveMethod = toReceiveMethod(input.receiveMethod);
  const shippingError = validateShipping(input.shipping, receiveMethod);
  if (shippingError) return { ok: false, status: 400, error: shippingError };

  // 매장 수령이면 매장·픽업 시간이 있어야 한다 · 정원까지 여기서 확인
  let pickup: ResolvedPickup | null = null;
  if (isDineIn(receiveMethod)) {
    const resolved = await resolvePickup(input.pickup);
    if (resolved.ok === false) return { ok: false, status: 400, error: resolved.error };
    pickup = resolved.pickup;
  }

  const { data: productData } = await supabase
    .from('group_buy_products')
    .select(PRODUCT_SELECT)
    .eq('id', input.productId)
    .maybeSingle();
  const product = productData as unknown as ProductWithJoins | null;

  if (!product || product.status === 'draft') return { ok: false, status: 404, error: '상품을 찾을 수 없습니다.' };
  if (product.status !== 'recruiting') return { ok: false, status: 400, error: '모집이 마감된 상품입니다.' };
  if (product.recruit_deadline && new Date(product.recruit_deadline).getTime() < Date.now()) {
    return { ok: false, status: 400, error: '모집 기간이 종료되었습니다.' };
  }
  if (!product.slot_count || !product.slot_price) return { ok: false, status: 400, error: '판매 조건이 아직 설정되지 않았습니다.' };
  if (slotNos.some((n) => n > product.slot_count!)) return { ok: false, status: 400, error: '존재하지 않는 구좌입니다.' };

  const sold = new Set((product.group_buy_order_slots ?? []).map((s) => s.slot_no));
  const alreadyTaken = slotNos.filter((n) => sold.has(n));
  if (alreadyTaken.length > 0) {
    return { ok: false, status: 409, error: '방금 다른 분이 선택한 구좌가 있습니다. 다시 선택해주세요.', code: 'SLOT_TAKEN', takenSlotNos: alreadyTaken };
  }

  // 상·중·하 분할이면 구좌마다 중량·단가가 달라 실제 합, 아니면 균등 구좌가 × 수량 · 손질 옵션은 중량 × kg당 요금
  // 손질 옵션은 택배일 때만 · 매장에서 받기면 클라이언트가 보내도 무시한다
  const trimAndSlice = input.trimAndSlice === true && allowsTrimAndSlice(receiveMethod);
  const partWeight = toNumber(product.cattle_parts?.weight);
  const { amount } = orderTotals(
    {
      slotCount: product.slot_count,
      slotWeight: toNumber(product.slot_weight) || calcSlotWeight(partWeight, product.slot_count),
      slotPrice: product.slot_price,
      zones: buildProductZones(partWeight, product.price_per_kg ?? 0, [], product.slot_count, product.cattle_parts?.part_name),
    },
    slotNos,
    trimAndSlice,
  );
  const orderNo = buildOrderNo();

  const { data: orderData, error: orderError } = await supabase
    .from('group_buy_orders')
    .insert({
      order_no: orderNo,
      product_id: product.id,
      consumer_id: consumer.id,
      quantity: slotNos.length,
      amount,
      trim_and_slice: trimAndSlice,
      receive_method: receiveMethod,
      store_id: pickup?.store.id ?? null,
      pickup_at: pickup?.pickupAt ?? null,
      gift_set_id: input.giftSetId ?? null,
      status: 'paid',
      payment_provider: getPaymentProvider().name,
      // 매장 수령이면 주소는 서버가 매장 주소로 바꾼다 · 클라이언트 값을 믿지 않는다
      shipping: shippingForReceive(receiveMethod, normalizeShipping(input.shipping), pickup?.store),
    })
    .select('*')
    .single();

  if (orderError || !orderData) return { ok: false, status: 500, error: orderError?.message ?? '주문 생성에 실패했습니다.' };
  const order = orderData as GroupBuyOrderRow;

  const { error: slotError } = await supabase
    .from('group_buy_order_slots')
    .insert(slotNos.map((slot_no) => ({ product_id: product.id, order_id: order.id, slot_no })));

  if (slotError) {
    await supabase.from('group_buy_orders').delete().eq('id', order.id);
    if (slotError.code === '23505') {
      const { data: nowSold } = await supabase.from('group_buy_order_slots').select('slot_no').eq('product_id', product.id);
      const nowSoldSet = new Set((nowSold ?? []).map((s: { slot_no: number }) => s.slot_no));
      return {
        ok: false,
        status: 409,
        error: '방금 다른 분이 선택한 구좌가 있습니다. 다시 선택해주세요.',
        code: 'SLOT_TAKEN',
        takenSlotNos: slotNos.filter((n) => nowSoldSet.has(n)),
      };
    }
    return { ok: false, status: 500, error: slotError.message };
  }

  if (!input.skipPayment) {
    const payment = await getPaymentProvider().approve({
      orderNo,
      amount,
      orderName: `${product.cattle_parts?.part_name ?? product.part_group} ${slotNos.length}구좌${trimAndSlice ? ` · ${TRIM_SLICE_LABEL}` : ''}${isDineIn(receiveMethod) ? ` · ${RECEIVE_METHOD_LABELS.dine_in}` : ''}`,
      customerName: consumer.name,
      customerPhone: consumer.phone,
    });

    if (!payment.ok) {
      await supabase.from('group_buy_order_slots').delete().eq('order_id', order.id);
      await supabase.from('group_buy_orders').delete().eq('id', order.id);
      return { ok: false, status: 402, error: payment.message ?? '결제에 실패했습니다.', code: payment.code };
    }

    await supabase
      .from('group_buy_orders')
      .update({ payment_key: payment.paymentKey, paid_at: payment.approvedAt })
      .eq('id', order.id);
  }

  await logEvent({
    productId: product.id,
    orderId: order.id,
    type: EVENT_TYPES.ORDER_PLACED,
    message: `${consumer.name} · ${slotNos.length}구좌 (${slotNos.join(', ')}번)${trimAndSlice ? ` · ${TRIM_SLICE_LABEL}` : ''} · ${RECEIVE_METHOD_LABELS[receiveMethod]} · ${amount.toLocaleString()}원`,
    payload: { slotNos, amount, trimAndSlice, receiveMethod, storeId: pickup?.store.id ?? null, pickupAt: pickup?.pickupAt ?? null },
    createdBy: consumer.id,
  });

  await markFullIfSoldOut(product.id);

  const detail = await getConsumerOrder(order.id, consumer.id);
  if (!detail) return { ok: false, status: 500, error: '주문은 완료되었지만 조회에 실패했습니다.' };
  return { ok: true, order: detail };
}

/** 전 구좌가 팔렸으면 full · 경쟁 조건에서 여러 번 불려도 결과는 같다 */
export async function markFullIfSoldOut(productId: string): Promise<boolean> {
  const { data } = await supabase
    .from('group_buy_products')
    .select('slot_count, status, group_buy_order_slots ( slot_no )')
    .eq('id', productId)
    .maybeSingle();
  const row = data as { slot_count: number | null; status: string; group_buy_order_slots: { slot_no: number }[] | null } | null;
  if (!row || row.status !== 'recruiting' || !row.slot_count) return false;
  if ((row.group_buy_order_slots?.length ?? 0) < row.slot_count) return false;

  const { error } = await supabase
    .from('group_buy_products')
    .update({ status: 'full' })
    .eq('id', productId)
    .eq('status', 'recruiting');
  if (error) return false;

  await logEvent({ productId, type: EVENT_TYPES.FULL, message: `전 ${row.slot_count}구좌 판매 완료 · 응찰 대기` });
  return true;
}

/** 소비자 본인 취소 · 모집중일 때만 · 구좌는 풀어준다 */
export async function cancelOrder(orderId: string, consumerId: string): Promise<{ error: string | null; status?: number }> {
  const { data } = await supabase
    .from('group_buy_orders')
    .select('*, group_buy_products ( status )')
    .eq('id', orderId)
    .eq('consumer_id', consumerId)
    .maybeSingle();
  const row = data as (GroupBuyOrderRow & { group_buy_products: { status: string } | null }) | null;
  if (!row) return { error: '주문을 찾을 수 없습니다.', status: 404 };
  if (row.status !== 'paid') return { error: '이미 취소된 주문입니다.', status: 400 };
  if (row.group_buy_products?.status !== 'recruiting') {
    return { error: '모집이 완료되어 취소할 수 없습니다. 고객센터로 문의해주세요.', status: 400 };
  }

  const { data: slots } = await supabase.from('group_buy_order_slots').select('slot_no').eq('order_id', orderId);
  const slotNos = (slots ?? []).map((s: { slot_no: number }) => s.slot_no);

  const refund = await refundOrder(row, '소비자 취소', 'cancelled', consumerId);
  if (!refund.ok) return { error: refund.error ?? '환불 처리에 실패했습니다.', status: 500 };

  await supabase.from('group_buy_order_slots').delete().eq('order_id', orderId);
  await logEvent({
    productId: row.product_id,
    orderId,
    type: EVENT_TYPES.ORDER_CANCELLED,
    message: `소비자 취소 · ${slotNos.join(', ')}번 구좌 해제`,
    payload: { slotNos },
    createdBy: consumerId,
  });
  return { error: null };
}

export async function listConsumerOrders(consumerId: string): Promise<ConsumerOrder[]> {
  const { data } = await supabase
    .from('group_buy_orders')
    .select(ORDER_SELECT)
    .eq('consumer_id', consumerId)
    .is('gift_set_id', null)
    .order('created_at', { ascending: false });
  const orders = (data ?? []) as unknown as OrderWithJoins[];
  if (orders.length === 0) return [];

  const productIds = Array.from(new Set(orders.map((o) => o.product_id)));
  const [{ data: productRows }, groupImages, released] = await Promise.all([
    supabase.from('group_buy_products').select(PRODUCT_SELECT).in('id', productIds),
    loadGroupImageMap(),
    loadReleasedSlots(orders.filter((o) => o.status !== 'paid').map((o) => o.id)),
  ]);
  const products = new Map(((productRows ?? []) as unknown as ProductWithJoins[]).map((p) => [p.id, p]));

  return orders
    .filter((o) => products.has(o.product_id))
    .map((o) => toConsumerOrder(o, products.get(o.product_id)!, groupImages, released.get(o.id) ?? []));
}

export async function getConsumerOrder(orderId: string, consumerId: string): Promise<ConsumerOrder | null> {
  const { data } = await supabase
    .from('group_buy_orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .eq('consumer_id', consumerId)
    .maybeSingle();
  const order = data as unknown as OrderWithJoins | null;
  if (!order) return null;

  const [{ data: productRow }, groupImages, released] = await Promise.all([
    supabase.from('group_buy_products').select(PRODUCT_SELECT).eq('id', order.product_id).maybeSingle(),
    loadGroupImageMap(),
    order.status !== 'paid' ? loadReleasedSlots([order.id]) : Promise.resolve(new Map<string, number[]>()),
  ]);
  if (!productRow) return null;
  return toConsumerOrder(order, productRow as unknown as ProductWithJoins, groupImages, released.get(order.id) ?? []);
}

/** 취소된 주문의 구좌 번호 · 이벤트 payload 에서 복원 */
async function loadReleasedSlots(orderIds: string[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (orderIds.length === 0) return map;
  const { data } = await supabase
    .from('group_buy_events')
    .select('order_id, payload')
    .in('order_id', orderIds)
    .eq('type', EVENT_TYPES.ORDER_PLACED);
  for (const e of (data ?? []) as { order_id: string; payload: { slotNos?: number[] } }[]) {
    if (Array.isArray(e.payload?.slotNos)) map.set(e.order_id, e.payload.slotNos);
  }
  return map;
}

function buildOrderNo(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GB${date}-${rand}`;
}

/** 택배면 주소까지, 매장 수령이면 이름·연락처만 있으면 된다 */
function validateShipping(s: ShippingInfo | undefined, receiveMethod: ReceiveMethod): string | null {
  if (!s) return '받으실 분 정보를 입력해주세요.';
  if (!s.name?.trim()) return '받는 분 이름을 입력해주세요.';
  if (!s.phone?.trim()) return '받는 분 연락처를 입력해주세요.';
  if (!isDineIn(receiveMethod) && !s.address?.trim()) return '배송 주소를 입력해주세요.';
  return null;
}

function normalizeShipping(s: ShippingInfo): ShippingInfo {
  return {
    name: s.name.trim(),
    phone: s.phone.trim(),
    zipcode: s.zipcode?.trim() ?? '',
    address: s.address?.trim() ?? '',
    addressDetail: s.addressDetail?.trim() ?? '',
    memo: s.memo?.trim() || undefined,
  };
}
