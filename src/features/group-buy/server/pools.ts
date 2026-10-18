import 'server-only';

import { EVENT_TYPES, RESERVATION_STATUS_LABELS, reservationStatusMessage } from '../constants/status';
import { getPaymentProvider } from '../lib/payment/mock';
import {
  TRIM_SLICE_FEE_PER_KG,
  TRIM_SLICE_LABEL,
  allocateFifo,
  auctionPartGroupOf,
  fillPercent,
  gradeKeyLabel,
  gradeKeyOf,
  gradeKeyShort,
  lineAmountOf,
  savingRateOf,
  sumKg,
} from '../lib/pools';
import { allowsTrimAndSlice, isDineIn, RECEIVE_METHOD_LABELS, shippingForReceive, toReceiveMethod } from '../lib/receive';
import type {
  AdminPool,
  ConsumerPool,
  ConsumerPoolFilter,
  ConsumerReservation,
  CreateReservationInput,
  GroupBuyPoolRow,
  GroupBuyReservationRow,
  ReceiveMethod,
  ShippingInfo,
  UpsertPoolInput,
} from '../types';
import { groupImageKey, loadGroupImageMap, supabase, toNumber, type GroupImageMap } from './db';
import { logEvent } from './events';

/** 매칭된 뒤 아직 끝나지 않은 상품 · 풀 카드의 "진행 중 N건" */
const ACTIVE_PRODUCT_STATUSES = ['full', 'bidding', 'won', 'processing', 'shipped'];

const LOST_REFUND_REASON = '물량 미확보';
const EXPIRED_REFUND_REASON = '예약 기간 만료';

interface OpenReservationAgg {
  kg: number;
  createdAt: string;
}

// ------------------------------------------------------------
// 소비자 조회
// ------------------------------------------------------------

export async function listConsumerPools(filter: ConsumerPoolFilter = {}): Promise<ConsumerPool[]> {
  let query = supabase.from('group_buy_pools').select('*').eq('status', 'open').order('part_group').order('grade_key');
  if (filter.partGroup) query = query.eq('part_group', filter.partGroup);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let pools = (data ?? []) as GroupBuyPoolRow[];
  if (filter.grade) pools = pools.filter((p) => gradeKeyShort(p.grade_key) === filter.grade);
  if (pools.length === 0) return [];

  const ids = pools.map((p) => p.id);
  const [openByPool, matchedByPool, reviewsByPool, groupImages] = await Promise.all([
    loadOpenReservations(ids),
    loadMatchedCounts(ids),
    loadReviewCounts(ids),
    loadGroupImageMap(),
  ]);

  return pools
    .map((p) => toConsumerPool(p, openByPool.get(p.id) ?? [], matchedByPool.get(p.id) ?? 0, reviewsByPool.get(p.id) ?? 0, groupImages))
    .sort(byActivity);
}

export async function getConsumerPool(id: string): Promise<ConsumerPool | null> {
  const { data } = await supabase.from('group_buy_pools').select('*').eq('id', id).maybeSingle();
  const pool = data as GroupBuyPoolRow | null;
  if (!pool) return null;
  const [openByPool, matchedByPool, reviewsByPool, groupImages] = await Promise.all([
    loadOpenReservations([id]),
    loadMatchedCounts([id]),
    loadReviewCounts([id]),
    loadGroupImageMap(),
  ]);
  return toConsumerPool(pool, openByPool.get(id) ?? [], matchedByPool.get(id) ?? 0, reviewsByPool.get(id) ?? 0, groupImages);
}

/** 풀별 리뷰 개수 · 테이블이 아직 없으면(마이그레이션 전) 0으로 둔다 */
async function loadReviewCounts(poolIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data, error } = await supabase.from('group_buy_reviews').select('pool_id').in('pool_id', poolIds);
  if (error) return map;
  for (const r of (data ?? []) as { pool_id: string }[]) map.set(r.pool_id, (map.get(r.pool_id) ?? 0) + 1);
  return map;
}

export async function listConsumerReservations(consumerId: string): Promise<ConsumerReservation[]> {
  const { data } = await supabase
    .from('group_buy_reservations')
    .select('*, group_buy_pools ( part_group, grade_key )')
    .eq('consumer_id', consumerId)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as (GroupBuyReservationRow & { group_buy_pools: Pick<GroupBuyPoolRow, 'part_group' | 'grade_key'> | null })[];
  if (rows.length === 0) return [];
  const groupImages = await loadGroupImageMap();
  return rows.map((r) => toConsumerReservation(r, r.group_buy_pools, groupImages));
}

export async function getConsumerReservation(id: string, consumerId: string): Promise<ConsumerReservation | null> {
  const { data } = await supabase
    .from('group_buy_reservations')
    .select('*, group_buy_pools ( part_group, grade_key )')
    .eq('id', id)
    .eq('consumer_id', consumerId)
    .maybeSingle();
  const row = data as (GroupBuyReservationRow & { group_buy_pools: Pick<GroupBuyPoolRow, 'part_group' | 'grade_key'> | null }) | null;
  if (!row) return null;
  return toConsumerReservation(row, row.group_buy_pools, await loadGroupImageMap());
}

// ------------------------------------------------------------
// 예약 생성 · 취소 · 만료
// ------------------------------------------------------------

export interface CreateReservationResult {
  ok: boolean;
  reservation?: ConsumerReservation;
  /** 예약 직후 바로 매칭되어 확정됐는지 */
  matched?: boolean;
  status?: number;
  error?: string;
}

/**
 * 예약 = kg 참여 1건 · kg × 관리자 단가를 결제한다.
 * 저장 뒤 이 풀을 기다리는 draft 상품이 있으면 즉시 매칭을 시도한다.
 */
export async function createReservation(
  consumer: { id: string; name: string; phone: string },
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const receiveMethod = toReceiveMethod(input.receiveMethod);
  const shippingError = validateShipping(input.shipping, receiveMethod);
  if (shippingError) return { ok: false, status: 400, error: shippingError };

  const { data: poolData } = await supabase.from('group_buy_pools').select('*').eq('id', input.poolId).maybeSingle();
  const pool = poolData as GroupBuyPoolRow | null;
  if (!pool) return { ok: false, status: 404, error: '모집 중인 부위를 찾을 수 없습니다.' };
  if (pool.status !== 'open') return { ok: false, status: 400, error: '지금은 참여를 받지 않는 부위입니다.' };

  const kg = Math.trunc(input.kg);
  if (!Number.isInteger(kg) || kg < pool.min_kg || kg > pool.max_kg) {
    return { ok: false, status: 400, error: `${pool.min_kg}kg부터 ${pool.max_kg}kg까지 참여할 수 있어요.` };
  }
  const pricePerKg = pool.price_per_kg;
  // 손질 옵션은 택배일 때만 · 매장에서 받기면 클라이언트가 보내도 무시한다
  const trimAndSlice = input.trimAndSlice === true && allowsTrimAndSlice(receiveMethod);
  const optionFeePerKg = trimAndSlice ? TRIM_SLICE_FEE_PER_KG : 0;
  const heldAmount = lineAmountOf(pricePerKg, kg, trimAndSlice, optionFeePerKg);
  const reservationNo = buildReservationNo();
  const payment = await getPaymentProvider().approve({
    orderNo: reservationNo,
    amount: heldAmount,
    orderName: `${pool.part_group} ${gradeKeyLabel(pool.grade_key)} ${kg}kg${trimAndSlice ? ` · ${TRIM_SLICE_LABEL}` : ''}${isDineIn(receiveMethod) ? ` · ${RECEIVE_METHOD_LABELS.dine_in}` : ''}`,
    customerName: consumer.name,
    customerPhone: consumer.phone,
  });
  if (!payment.ok) return { ok: false, status: 402, error: payment.message ?? '결제에 실패했습니다.' };

  const expiresAt = new Date(Date.now() + pool.reservation_ttl_days * 24 * 60 * 60 * 1000).toISOString();
  const { data: inserted, error } = await supabase
    .from('group_buy_reservations')
    .insert({
      reservation_no: reservationNo,
      pool_id: pool.id,
      consumer_id: consumer.id,
      kg,
      price_per_kg: pricePerKg,
      trim_and_slice: trimAndSlice,
      option_fee_per_kg: optionFeePerKg,
      held_amount: heldAmount,
      status: 'open',
      payment_provider: getPaymentProvider().name,
      payment_key: payment.paymentKey,
      paid_at: payment.approvedAt,
      receive_method: receiveMethod,
      // 매장 수령이면 주소는 서버가 매장 주소로 바꾼다
      shipping: shippingForReceive(receiveMethod, normalizeShipping(input.shipping)),
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    await getPaymentProvider().refund(payment.paymentKey ?? '', heldAmount, '예약 저장 실패');
    return { ok: false, status: 500, error: error?.message ?? '예약 저장에 실패했습니다.' };
  }
  const row = inserted as GroupBuyReservationRow;

  await logEvent({
    type: EVENT_TYPES.RESERVATION_PLACED,
    message: `${consumer.name} · ${pool.part_group} ${gradeKeyLabel(pool.grade_key)} ${kg}kg × ${(pricePerKg + optionFeePerKg).toLocaleString()}원${trimAndSlice ? ` (${TRIM_SLICE_LABEL})` : ''} · ${RECEIVE_METHOD_LABELS[receiveMethod]} = ${heldAmount.toLocaleString()}원`,
    payload: { reservationId: row.id, poolId: pool.id, kg, pricePerKg, trimAndSlice, optionFeePerKg, receiveMethod, amount: heldAmount },
    createdBy: consumer.id,
  });

  const { matched } = await matchPool(pool.id, null);

  const reservation = await getConsumerReservation(row.id, consumer.id);
  if (!reservation) return { ok: false, status: 500, error: '예약은 완료되었지만 조회에 실패했습니다.' };
  return { ok: true, reservation, matched: matched > 0 && reservation.status === 'allocated' };
}

/** 본인 취소 · 아직 모이는 중(open)일 때만 */
export async function cancelReservation(id: string, consumerId: string): Promise<{ error: string | null; status?: number }> {
  const { data } = await supabase.from('group_buy_reservations').select('*').eq('id', id).eq('consumer_id', consumerId).maybeSingle();
  const row = data as GroupBuyReservationRow | null;
  if (!row) return { error: '예약을 찾을 수 없습니다.', status: 404 };
  if (row.status === 'allocated') return { error: '물량이 확정되어 취소할 수 없습니다. 고객센터로 문의해주세요.', status: 400 };
  if (row.status !== 'open') return { error: '이미 취소된 예약입니다.', status: 400 };

  const result = await refundReservation(row, '소비자 취소', 'cancelled');
  if (!result.ok) return { error: result.error ?? '환불 처리에 실패했습니다.', status: 500 };

  await logEvent({
    type: EVENT_TYPES.RESERVATION_CANCELLED,
    message: `소비자 취소 · ${row.kg}kg · ${row.held_amount.toLocaleString()}원 환불`,
    payload: { reservationId: row.id, poolId: row.pool_id },
    createdBy: consumerId,
  });
  return { error: null };
}

/** 유효기간이 지난 open 예약 → 만료 + 환불 · cron/관리자 버튼 */
export async function expireReservations(now = new Date(), by: string | null = null): Promise<{ expired: number }> {
  const { data } = await supabase
    .from('group_buy_reservations')
    .select('*')
    .eq('status', 'open')
    .lt('expires_at', now.toISOString());
  let expired = 0;
  for (const row of (data ?? []) as GroupBuyReservationRow[]) {
    const result = await refundReservation(row, EXPIRED_REFUND_REASON, 'expired');
    if (!result.ok) continue;
    await logEvent({
      type: EVENT_TYPES.RESERVATION_EXPIRED,
      message: `예약 기간 만료 · ${row.kg}kg · ${row.held_amount.toLocaleString()}원 환불`,
      payload: { reservationId: row.id, poolId: row.pool_id },
      createdBy: by,
    });
    expired += 1;
  }
  return { expired };
}

/**
 * kg 모드 상품이 물량을 확보하지 못했을 때(lost/cancelled) · 주문 환불은 기존 흐름이 하고,
 * 여기서는 예약 상태만 refunded 로 맞춘다. 돈은 이미 주문 쪽에서 돌려줬다.
 */
export async function markReservationsRefundedForProduct(productId: string, reason = LOST_REFUND_REASON): Promise<number> {
  const { data } = await supabase
    .from('group_buy_reservations')
    .update({ status: 'refunded', refunded_at: new Date().toISOString(), refund_reason: reason })
    .eq('product_id', productId)
    .eq('status', 'allocated')
    .select('id');
  return data?.length ?? 0;
}

async function refundReservation(
  row: GroupBuyReservationRow,
  reason: string,
  toStatus: 'cancelled' | 'expired',
): Promise<{ ok: boolean; error?: string }> {
  const result = await getPaymentProvider().refund(row.payment_key ?? '', row.held_amount, reason);
  if (!result.ok) return { ok: false, error: result.message };
  const { error } = await supabase
    .from('group_buy_reservations')
    .update({ status: toStatus, refunded_at: result.refundedAt, refund_reason: reason })
    .eq('id', row.id)
    .eq('status', 'open');
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ------------------------------------------------------------
// 매칭 · draft 상품(부위 실물) ↔ 풀의 예약
// ------------------------------------------------------------

interface DraftCandidate {
  id: string;
  part_group: string;
  bid_price_cap: number | null;
  recruit_deadline: string | null;
  cattle_parts: { weight: number | string | null; part_name: string } | null;
  cattle_listings: { grade: string | null; marbling_score: number | null; listing_no: string } | null;
}

const CANDIDATE_SELECT = `
  id, part_group, bid_price_cap, recruit_deadline,
  cattle_parts ( weight, part_name ),
  cattle_listings ( grade, marbling_score, listing_no )
`;

/** 아직 매칭되지 않은 draft 상품 중 이 풀(부위×등급)에 해당하고 마감이 남은 것 · 마감 빠른 순 */
async function loadWaitingDrafts(pool: Pick<GroupBuyPoolRow, 'part_group' | 'grade_key'>, now = new Date()): Promise<DraftCandidate[]> {
  const { data } = await supabase
    .from('group_buy_products')
    .select(CANDIDATE_SELECT)
    .eq('status', 'draft')
    .eq('sale_mode', 'slot')
    .is('pool_id', null)
    .eq('part_group', auctionPartGroupOf(pool.part_group))
    .gt('recruit_deadline', now.toISOString())
    .order('recruit_deadline', { ascending: true });
  return ((data ?? []) as unknown as DraftCandidate[]).filter(
    (d) => gradeKeyOf(d.cattle_listings?.grade, d.cattle_listings?.marbling_score) === pool.grade_key,
  );
}

/** 한 풀에 대해 기다리는 부위를 차례로 채운다 · 하나 확정될 때마다 남은 예약으로 다음 부위 시도 */
export async function matchPool(poolId: string, by: string | null): Promise<{ matched: number }> {
  const { data } = await supabase.from('group_buy_pools').select('*').eq('id', poolId).maybeSingle();
  const pool = data as GroupBuyPoolRow | null;
  if (!pool || pool.status !== 'open') return { matched: 0 };

  const drafts = await loadWaitingDrafts(pool);
  let matched = 0;
  for (const draft of drafts) {
    const ok = await tryMatchDraft(draft, pool, by);
    if (!ok) break; // 가장 급한 부위도 못 채우면 그 뒤는 볼 필요 없다
    matched += 1;
  }
  return { matched };
}

/** 열린 풀 전부 · 상장 승인 훅과 cron 이 부른다 */
export async function matchAllPools(by: string | null = null): Promise<{ matched: number }> {
  const { data } = await supabase.from('group_buy_pools').select('id').eq('status', 'open');
  let matched = 0;
  for (const p of (data ?? []) as { id: string }[]) {
    matched += (await matchPool(p.id, by)).matched;
  }
  return { matched };
}

async function tryMatchDraft(draft: DraftCandidate, pool: GroupBuyPoolRow, by: string | null): Promise<boolean> {
  const targetKg = toNumber(draft.cattle_parts?.weight);
  if (targetKg <= 0) return false;

  const { data } = await supabase
    .from('group_buy_reservations')
    .select('*')
    .eq('pool_id', pool.id)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString());
  const open = ((data ?? []) as GroupBuyReservationRow[]).map((r) => ({ ...r, createdAt: r.created_at }));

  const allocation = allocateFifo(open, targetKg);
  if (!allocation) return false;

  const acceptedIds = allocation.accepted.map((r) => r.id);

  // 1) 예약 잠금 · 그 사이 취소된 게 있으면 되돌리고 포기
  const { data: locked } = await supabase
    .from('group_buy_reservations')
    .update({ status: 'allocated', allocated_at: new Date().toISOString() })
    .in('id', acceptedIds)
    .eq('status', 'open')
    .select('id');
  const lockedIds = (locked ?? []).map((r: { id: string }) => r.id);
  if (lockedIds.length !== acceptedIds.length) {
    await supabase.from('group_buy_reservations').update({ status: 'open', allocated_at: null }).in('id', lockedIds);
    return false;
  }

  // 2) 상품을 kg 모드 · 모집완료로 · draft 가 아니게 됐으면 되돌리고 포기
  const { data: updatedProduct } = await supabase
    .from('group_buy_products')
    .update({
      sale_mode: 'kg',
      pool_id: pool.id,
      price_per_kg: pool.price_per_kg,
      slot_count: allocation.accepted.length,
      slot_weight: null,
      slot_price: null,
      positional: false,
      reference_retail_price: null,
      bid_price_cap: pool.bid_price_cap ?? draft.bid_price_cap,
      status: 'full',
      published_at: new Date().toISOString(),
    })
    .eq('id', draft.id)
    .eq('status', 'draft')
    .select('id');
  if (!updatedProduct || updatedProduct.length === 0) {
    await supabase.from('group_buy_reservations').update({ status: 'open', allocated_at: null }).in('id', lockedIds);
    return false;
  }

  // 3) 예약 → 주문 · 결제는 이미 끝났으므로 금액 그대로 옮긴다
  for (const r of allocation.accepted) {
    const amount = r.held_amount;
    const { data: orderData } = await supabase
      .from('group_buy_orders')
      .insert({
        order_no: buildOrderNo(),
        product_id: draft.id,
        consumer_id: r.consumer_id,
        quantity: r.kg,
        amount,
        status: 'paid',
        payment_provider: r.payment_provider,
        payment_key: r.payment_key,
        paid_at: r.paid_at,
        shipping: r.shipping,
        receive_method: toReceiveMethod(r.receive_method),
        weight_kg: r.kg,
        trim_and_slice: r.trim_and_slice ?? false,
        reservation_id: r.id,
      })
      .select('id')
      .single();
    const orderId = (orderData as { id: string } | null)?.id ?? null;

    await supabase
      .from('group_buy_reservations')
      .update({ product_id: draft.id, order_id: orderId })
      .eq('id', r.id);

    await logEvent({
      productId: draft.id,
      orderId,
      type: EVENT_TYPES.ORDER_PLACED,
      message: `kg 참여 확정 · ${r.kg}kg × ${r.price_per_kg.toLocaleString()}원 = ${amount.toLocaleString()}원`,
      payload: { reservationId: r.id, kg: r.kg, pricePerKg: r.price_per_kg, amount },
      createdBy: r.consumer_id,
    });
  }

  await logEvent({
    productId: draft.id,
    type: EVENT_TYPES.POOL_MATCHED,
    message: `수요 풀 매칭 · ${pool.part_group} ${gradeKeyLabel(pool.grade_key)} · ${allocation.accepted.length}명 ${allocation.acceptedKg}kg (부위 ${targetKg}kg) · 단가 ${pool.price_per_kg.toLocaleString()}원/kg`,
    payload: { poolId: pool.id, pricePerKg: pool.price_per_kg, acceptedKg: allocation.acceptedKg, targetKg, reservationIds: acceptedIds },
    createdBy: by,
  });
  return true;
}

// ------------------------------------------------------------
// 관리자
// ------------------------------------------------------------

export async function listAdminPools(): Promise<AdminPool[]> {
  const { data, error } = await supabase.from('group_buy_pools').select('*').order('part_group').order('grade_key');
  if (error) throw new Error(error.message);
  const pools = (data ?? []) as GroupBuyPoolRow[];
  if (pools.length === 0) return [];
  const ids = pools.map((p) => p.id);

  const [openByPool, allocatedRes, drafts] = await Promise.all([
    loadOpenReservations(ids),
    supabase.from('group_buy_reservations').select('pool_id').in('pool_id', ids).eq('status', 'allocated'),
    loadAllWaitingDraftKeys(),
  ]);
  const allocated = new Map<string, number>();
  for (const r of (allocatedRes.data ?? []) as { pool_id: string }[]) allocated.set(r.pool_id, (allocated.get(r.pool_id) ?? 0) + 1);

  return pools.map((p) => {
    const open = openByPool.get(p.id) ?? [];
    return {
      id: p.id,
      partGroup: p.part_group,
      gradeKey: p.grade_key,
      gradeLabel: gradeKeyLabel(p.grade_key),
      pricePerKg: p.price_per_kg,
      bidPriceCap: p.bid_price_cap,
      referenceRetailPricePerKg: p.reference_retail_price_per_kg,
      targetKg: toNumber(p.typical_weight_kg),
      minKg: p.min_kg,
      maxKg: p.max_kg,
      reservationTtlDays: p.reservation_ttl_days,
      status: p.status,
      openKg: sumKg(open),
      openCount: open.length,
      allocatedCount: allocated.get(p.id) ?? 0,
      waitingDraftCount: drafts.get(`${auctionPartGroupOf(p.part_group)}::${p.grade_key}`) ?? 0,
      updatedAt: p.updated_at,
    };
  });
}

export async function upsertPool(input: UpsertPoolInput, by: string): Promise<{ error: string | null; status?: number }> {
  if (!Number.isInteger(input.pricePerKg) || input.pricePerKg <= 0) return { error: 'kg당 단가를 입력해주세요.', status: 400 };
  if (input.targetKg <= 0) return { error: '한 덩어리 목표 중량을 입력해주세요.', status: 400 };
  if (input.minKg < 1 || input.maxKg < input.minKg) return { error: 'kg 범위가 올바르지 않습니다.', status: 400 };

  const row = {
    part_group: input.partGroup,
    grade_key: input.gradeKey,
    price_per_kg: input.pricePerKg,
    bid_price_cap: input.bidPriceCap,
    reference_retail_price_per_kg: input.referenceRetailPricePerKg,
    typical_weight_kg: input.targetKg,
    min_kg: input.minKg,
    max_kg: input.maxKg,
    reservation_ttl_days: input.reservationTtlDays,
    status: input.status,
    updated_by: by,
  };
  const { error } = input.id
    ? await supabase.from('group_buy_pools').update(row).eq('id', input.id)
    : await supabase.from('group_buy_pools').upsert(row, { onConflict: 'part_group,grade_key' });
  if (error) return { error: error.message, status: 500 };
  return { error: null };
}

// ------------------------------------------------------------
// 내부 · 조회 보조 · 매퍼
// ------------------------------------------------------------

async function loadOpenReservations(poolIds: string[]): Promise<Map<string, OpenReservationAgg[]>> {
  const map = new Map<string, OpenReservationAgg[]>();
  const { data } = await supabase
    .from('group_buy_reservations')
    .select('pool_id, kg, created_at')
    .in('pool_id', poolIds)
    .eq('status', 'open')
    .gt('expires_at', new Date().toISOString());
  for (const r of (data ?? []) as { pool_id: string; kg: number; created_at: string }[]) {
    const list = map.get(r.pool_id) ?? [];
    list.push({ kg: r.kg, createdAt: r.created_at });
    map.set(r.pool_id, list);
  }
  return map;
}

async function loadMatchedCounts(poolIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data } = await supabase.from('group_buy_products').select('pool_id').in('pool_id', poolIds).in('status', ACTIVE_PRODUCT_STATUSES);
  for (const r of (data ?? []) as { pool_id: string }[]) map.set(r.pool_id, (map.get(r.pool_id) ?? 0) + 1);
  return map;
}

/** 기다리는 draft 를 (부위::등급키) 로 센다 · 관리자 표 */
async function loadAllWaitingDraftKeys(): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('group_buy_products')
    .select(CANDIDATE_SELECT)
    .eq('status', 'draft')
    .eq('sale_mode', 'slot')
    .is('pool_id', null)
    .gt('recruit_deadline', new Date().toISOString());
  const map = new Map<string, number>();
  for (const d of (data ?? []) as unknown as DraftCandidate[]) {
    const key = gradeKeyOf(d.cattle_listings?.grade, d.cattle_listings?.marbling_score);
    if (!key) continue;
    const k = `${d.part_group}::${key}`;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

/** 풀 부위 이미지 · 윗등심처럼 전용 이미지가 없으면 경매 대분류(등심) 이미지를 쓴다 */
function poolImage(partGroup: string, groupImages: GroupImageMap): string | null {
  return groupImages.get(groupImageKey(null, partGroup)) ?? groupImages.get(groupImageKey(null, auctionPartGroupOf(partGroup))) ?? null;
}

function toConsumerPool(p: GroupBuyPoolRow, open: OpenReservationAgg[], matchedCount: number, reviewCount: number, groupImages: GroupImageMap): ConsumerPool {
  const targetKg = toNumber(p.typical_weight_kg);
  const totalKg = sumKg(open);
  return {
    id: p.id,
    partGroup: p.part_group,
    gradeKey: p.grade_key,
    gradeLabel: gradeKeyLabel(p.grade_key),
    pricePerKg: p.price_per_kg,
    referenceRetailPricePerKg: p.reference_retail_price_per_kg,
    savingRate: savingRateOf(p.price_per_kg, p.reference_retail_price_per_kg),
    totalKg,
    participantCount: open.length,
    targetKg,
    kgToFill: Math.max(0, Math.ceil(targetKg - totalKg)),
    fillPct: fillPercent(totalKg, targetKg),
    minKg: p.min_kg,
    maxKg: p.max_kg,
    matchedCount,
    reviewCount,
    image: poolImage(p.part_group, groupImages),
    status: p.status,
  };
}

function toConsumerReservation(
  r: GroupBuyReservationRow,
  pool: Pick<GroupBuyPoolRow, 'part_group' | 'grade_key'> | null,
  groupImages: GroupImageMap,
): ConsumerReservation {
  const partGroup = pool?.part_group ?? '';
  const gradeKey = pool?.grade_key ?? '';
  return {
    id: r.id,
    reservationNo: r.reservation_no,
    poolId: r.pool_id,
    partGroup,
    gradeKey,
    gradeLabel: gradeKey ? gradeKeyLabel(gradeKey) : '',
    kg: r.kg,
    pricePerKg: r.price_per_kg,
    trimAndSlice: r.trim_and_slice ?? false,
    optionFeePerKg: r.option_fee_per_kg ?? 0,
    receiveMethod: toReceiveMethod(r.receive_method),
    amount: r.held_amount,
    status: r.status,
    statusLabel: RESERVATION_STATUS_LABELS[r.status],
    statusMessage: reservationStatusMessage(r.status),
    orderId: r.order_id,
    canCancel: r.status === 'open',
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    image: partGroup ? poolImage(partGroup, groupImages) : null,
  };
}

/** 모인 양이 많은 풀부터 */
function byActivity(a: ConsumerPool, b: ConsumerPool): number {
  return b.totalKg - a.totalKg || b.participantCount - a.participantCount || a.partGroup.localeCompare(b.partGroup, 'ko');
}

function buildReservationNo(): string {
  return `GR${kstDateStamp()}-${randomSuffix()}`;
}

function buildOrderNo(): string {
  return `GB${kstDateStamp()}-${randomSuffix()}`;
}

function kstDateStamp(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(2, 10).replace(/-/g, '');
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
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
