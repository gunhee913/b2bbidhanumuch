import 'server-only';

import { gradeWithMarbling } from '../lib/format';
import {
  GIFT_CELL_COUNTS,
  GIFT_CELL_GRAMS,
  GIFT_CELL_KG,
  DEFAULT_PACKAGING_FEE,
  giftUsableKg,
  packagingAmount,
  roundKg,
  toGiftCellCount,
  toRecipientMode,
  type GiftCellSnapshot,
} from '../lib/gift';
import { applyFixedKg, offersForSpec, planGiftSupply } from '../lib/giftSupply';
import { gradeKeyLabel, gradeKeyOf } from '../lib/pools';
import { getPaymentProvider } from '../lib/payment/mock';
import { isDineIn, shippingForReceive, toReceiveMethod } from '../lib/receive';
import { buildProductZones } from '../lib/slots';
import type {
  ConsumerGiftSet,
  ConsumerOrder,
  CreateGiftSetInput,
  GiftLeftoverLine,
  GiftRecipient,
  GiftSetStatus,
  GiftSettings,
  GroupBuyOrderRow,
  GroupBuyPoolRow,
  GroupBuyReservationRow,
  ReceiveMethod,
  ShippingInfo,
} from '../types';
import {
  loadGroupImageMap,
  ORDER_SELECT,
  PRODUCT_SELECT,
  supabase,
  toNumber,
  type OrderWithJoins,
  type ProductWithJoins,
} from './db';
import { resolveProductImages, toConsumerOrder } from './mappers';
import { cancelOrder, createOrder } from './orders';
import { matchPool } from './pools';
import { resolvePickup, STORE_SUMMARY_SELECT, toStoreSummary, type StoreJoin } from './stores';

const GIFT_STATUS_LABEL: Record<GiftSetStatus, string> = {
  paid: '결제 완료',
  cancelled: '취소',
  refunded: '환불',
};

interface GiftSetRow {
  id: string;
  gift_no: string;
  consumer_id: string;
  cell_count: number;
  quantity: number;
  packaging_fee: number;
  cells: GiftCellSnapshot[];
  recipient_mode: string;
  leftover_receive_method: string;
  leftover_store_id: string | null;
  leftover_pickup_at: string | null;
  leftover_shipping: ShippingInfo | null;
  leftover_kg: number | string | null;
  meat_amount: number;
  amount: number;
  status: GiftSetStatus;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

interface GiftRecipientRow {
  set_index: number;
  shipping: ShippingInfo;
  message: string | null;
}

const GIFT_SELECT = `*, ${STORE_SUMMARY_SELECT}`;

export async function getGiftSettings(): Promise<GiftSettings> {
  const { data } = await supabase.from('group_buy_gift_settings').select('packaging_fee').eq('id', 1).maybeSingle();
  return { packagingFee: (data as { packaging_fee?: number } | null)?.packaging_fee ?? DEFAULT_PACKAGING_FEE };
}

export async function updateGiftSettings(packagingFee: number): Promise<{ error: string | null }> {
  if (!Number.isInteger(packagingFee) || packagingFee < 0 || packagingFee > 200_000) {
    return { error: '포장비는 0~200,000원 사이여야 합니다.' };
  }
  const { error } = await supabase.from('group_buy_gift_settings').upsert({ id: 1, packaging_fee: packagingFee, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  return { error: error?.message ?? null };
}

export interface CreateGiftSetResult {
  ok: boolean;
  gift?: ConsumerGiftSet;
  status?: number;
  error?: string;
}

/** 선물세트 생성 · 구좌를 배정하고 고기값+포장비를 한 번에 결제한다 */
export async function createGiftSet(
  consumer: { id: string; name: string; phone: string },
  input: CreateGiftSetInput,
): Promise<CreateGiftSetResult> {
  const cellCount = toGiftCellCount(input.cellCount);
  const quantity = Math.floor(input.quantity);
  if (!(GIFT_CELL_COUNTS as readonly number[]).includes(cellCount)) return { ok: false, status: 400, error: '2구 · 3구 · 4구 · 6구 중에서 골라주세요.' };
  if (quantity < 1) return { ok: false, status: 400, error: '세트는 1개 이상 주문할 수 있어요.' };

  const cells = (input.cells ?? []).filter((c) => (c?.productId || c?.poolId) && c.cellNo >= 1 && c.cellNo <= cellCount);
  if (new Set(cells.map((c) => c.cellNo)).size !== cellCount || cells.length !== cellCount) {
    return { ok: false, status: 400, error: '모든 칸에 부위를 넣어주세요.' };
  }

  const mode = toRecipientMode(input.recipientMode);
  const recipients = input.recipients ?? [];
  const expectedRecipients = mode === 'batch' ? 1 : quantity;
  if (recipients.length !== expectedRecipients) {
    return { ok: false, status: 400, error: mode === 'batch' ? '일괄 수령 주소를 입력해주세요.' : '세트마다 받는 분 주소를 입력해주세요.' };
  }
  for (const r of recipients) {
    const err = validateFullShipping(r.shipping);
    if (err) return { ok: false, status: 400, error: err };
  }

  const leftoverMethod = toReceiveMethod(input.leftoverReceiveMethod);
  const productIds = Array.from(
    new Set([
      ...cells.map((cell) => cell.productId).filter((id): id is string => !!id),
      ...(input.supplies ?? []).flatMap((supply) => supply.bulks.map((bulk) => bulk.productId)),
    ]),
  );
  const [{ data: productRows }, { data: poolRows }] = await Promise.all([
    productIds.length > 0 ? supabase.from('group_buy_products').select(PRODUCT_SELECT).in('id', productIds) : Promise.resolve({ data: [] }),
    supabase.from('group_buy_pools').select('*').eq('status', 'open'),
  ]);
  const products = ((productRows ?? []) as unknown as ProductWithJoins[]).filter((p) => p.status === 'recruiting');
  const byId = new Map(products.map((p) => [p.id, p]));
  const poolList = ((poolRows ?? []) as GroupBuyPoolRow[]).map((pool) => ({
    id: pool.id,
    partGroup: pool.part_group,
    gradeKey: pool.grade_key,
    gradeLabel: gradeKeyLabel(pool.grade_key),
    pricePerKg: pool.price_per_kg,
    minKg: pool.min_kg,
    maxKg: pool.max_kg,
    status: 'open' as const,
    ttlDays: pool.reservation_ttl_days,
  }));
  const groupImages = await loadGroupImageMap();

  const buckets = new Map<string, { productId: string | null; poolId: string | null; cellNos: number[]; kg: number | null }>();
  const useSupplies = (input.supplies?.length ?? 0) > 0;
  if (!useSupplies) {
    for (const cell of cells) {
      const key = cell.productId ? `product:${cell.productId}` : `pool:${cell.poolId ?? ''}`;
      const bucket = buckets.get(key) ?? { productId: cell.productId ?? null, poolId: cell.poolId ?? null, cellNos: [], kg: typeof cell.kg === 'number' ? cell.kg : null };
      buckets.set(key, { ...bucket, cellNos: [...bucket.cellNos, cell.cellNo] });
    }
  }

  const allocations: Array<{
    product: ProductWithJoins | null;
    pool: (typeof poolList)[number] | null;
    slotNos: number[];
    kg: number;
    leftoverKg: number;
    amount: number;
    label: string;
  }> = [];
  const leftoverLines: GiftLeftoverLine[] = [];
  const snapshots: GiftCellSnapshot[] = [];

  if (useSupplies) {
    const supplied = input.supplies ?? [];
    const covered = supplied.flatMap((supply) => supply.cellNos);
    if (new Set(covered).size !== cellCount || covered.length !== cellCount) {
      return { ok: false, status: 400, error: '모든 칸의 구매를 확인해주세요.' };
    }
    const usedSlots = new Set<string>();
    for (const supply of supplied) {
      const needKg = roundKg(GIFT_CELL_KG * quantity * supply.cellNos.length);
      let bulkKg = 0;
      let primary: ProductWithJoins | null = null;
      const productAllocations: typeof allocations = [];
      for (const bulk of supply.bulks) {
        const product = byId.get(bulk.productId);
        if (!product) return { ok: false, status: 400, error: '모집이 끝난 부위가 있어요. 칸을 다시 채워주세요.' };
        if (primary && (primary.part_group !== product.part_group || gradeKeyOf(primary.cattle_listings?.grade, primary.cattle_listings?.marbling_score) !== gradeKeyOf(product.cattle_listings?.grade, product.cattle_listings?.marbling_score))) {
          return { ok: false, status: 400, error: '같은 부위·등급의 벌크만 한 칸에 담을 수 있어요.' };
        }
        primary = primary ?? product;
        const zones = buildProductZones(toNumber(product.cattle_parts?.weight), product.price_per_kg ?? 0, (product.group_buy_order_slots ?? []).map((slot) => slot.slot_no), product.slot_count, product.cattle_parts?.part_name);
        const chosen = zones.filter((zone) => bulk.slotNos.includes(zone.slotNo) && !zone.sold);
        if (chosen.length !== bulk.slotNos.length) return { ok: false, status: 400, error: '이미 팔린 구좌가 있어요. 다시 골라주세요.' };
        for (const zone of chosen) {
          const slotKey = `${product.id}:${zone.slotNo}`;
          if (usedSlots.has(slotKey)) return { ok: false, status: 400, error: '같은 구좌를 두 번 담을 수 없어요.' };
          usedSlots.add(slotKey);
        }
        bulkKg = roundKg(bulkKg + chosen.reduce((acc, zone) => acc + zone.kg, 0));
        const label = `${product.cattle_parts?.part_name ?? product.part_group} ${gradeWithMarbling(product.cattle_listings?.grade, product.cattle_listings?.marbling_score)}`;
        productAllocations.push({
          product,
          pool: null,
          slotNos: chosen.map((zone) => zone.slotNo),
          kg: 0,
          leftoverKg: 0,
          amount: chosen.reduce((acc, zone) => acc + zone.price, 0),
          label,
        });
      }
      const gradeKey = primary ? gradeKeyOf(primary.cattle_listings?.grade, primary.cattle_listings?.marbling_score) : null;
      const offers = primary && gradeKey ? offersForSpec(poolList, { partGroup: primary.part_group, gradeKey }) : [];
      const pool = supply.kg > 0 ? poolList.find((item) => item.id === supply.poolId && (offers.length === 0 || offers.some((offer) => offer.id === item.id))) ?? null : null;
      if (supply.kg > 0 && !pool) return { ok: false, status: 400, error: '1kg 구매를 진행할 수 없어요.' };
      if (pool && supply.kg > pool.maxKg) return { ok: false, status: 400, error: '1kg 구매 수량이 너무 많아요.' };
      const rawKg = roundKg(bulkKg + (supply.kg > 0 ? supply.kg : 0));
      const usedKg = giftUsableKg(rawKg);
      const shortKg = roundKg(Math.max(0, needKg - usedKg));
      const name = primary?.cattle_parts?.part_name ?? primary?.part_group ?? pool?.partGroup ?? '부위';
      if (shortKg > 0) return { ok: false, status: 400, error: `${name}: ${shortKg.toFixed(1)}kg 부족` };
      const leftoverKg = supply.leftoverMode === 'pack' ? 0 : roundKg(Math.max(0, usedKg - needKg));
      if (supply.kg > 0 && pool) {
        allocations.push(...productAllocations);
        const poolLabel = `${pool.partGroup} ${pool.gradeLabel}`;
        allocations.push({ product: null, pool, slotNos: [], kg: supply.kg, leftoverKg, amount: pool.pricePerKg * supply.kg, label: poolLabel });
        if (leftoverKg > 0) leftoverLines.push({ productId: pool.id, label: poolLabel, leftoverKg });
      } else if (productAllocations.length > 0) {
        const last = productAllocations[productAllocations.length - 1];
        allocations.push(...productAllocations.slice(0, -1), { ...last, leftoverKg });
        if (leftoverKg > 0 && last.product) leftoverLines.push({ productId: last.product.id, label: last.label, leftoverKg });
      }
      const listing = primary?.cattle_listings;
      for (const cellNo of [...supply.cellNos].sort((a, b) => a - b)) {
        snapshots.push({
          cellNo,
          productId: primary?.id ?? '',
          partName: primary?.cattle_parts?.part_name ?? pool?.partGroup ?? '부위',
          partGroup: primary?.part_group ?? pool?.partGroup ?? '',
          grade: primary ? gradeWithMarbling(listing?.grade, listing?.marbling_score) : (pool?.gradeLabel ?? ''),
          image: primary ? resolveProductImages(primary, groupImages)[0] ?? null : null,
          grams: GIFT_CELL_GRAMS,
        });
      }
    }
  }

  for (const bucket of buckets.values()) {
    const needKg = roundKg(GIFT_CELL_KG * quantity * bucket.cellNos.length);
    const product = bucket.productId ? byId.get(bucket.productId) : undefined;
    if (bucket.productId && !product) return { ok: false, status: 400, error: '모집이 끝난 부위가 있어요. 칸을 다시 채워주세요.' };
    const gradeKey = product ? gradeKeyOf(product.cattle_listings?.grade, product.cattle_listings?.marbling_score) : null;
    const offers = product && gradeKey
      ? offersForSpec(poolList, { partGroup: product.part_group, gradeKey })
      : poolList.filter((pool) => pool.id === bucket.poolId).map((pool) => ({ id: pool.id, label: `${pool.partGroup} ${pool.gradeLabel}`, pricePerKg: pool.pricePerKg, minKg: pool.minKg, maxKg: pool.maxKg }));
    const zones = product
      ? buildProductZones(toNumber(product.cattle_parts?.weight), product.price_per_kg ?? 0, (product.group_buy_order_slots ?? []).map((slot) => slot.slot_no), product.slot_count, product.cattle_parts?.part_name)
      : [];
    const planned = planGiftSupply(zones, needKg, offers, bucket.productId ? { requireZone: true } : undefined);
    const name = product?.cattle_parts?.part_name ?? product?.part_group ?? offers[0]?.label ?? '부위';
    if (planned.ok === false) return { ok: false, status: 400, error: `${name}: ${planned.error}` };
    const supply = typeof bucket.kg === 'number' ? applyFixedKg(planned, bucket.kg, offers, needKg) : planned;
    const shortKg = roundKg(Math.max(0, needKg - supply.usedKg));
    if (shortKg > 0) return { ok: false, status: 400, error: `${name}: ${shortKg.toFixed(1)}kg 부족` };
    const pool = supply.poolId ? poolList.find((item) => item.id === supply.poolId) ?? null : null;
    const label = product
      ? `${product.cattle_parts?.part_name ?? product.part_group} ${gradeWithMarbling(product.cattle_listings?.grade, product.cattle_listings?.marbling_score)}`
      : (supply.poolLabel ?? '1kg 구매');
    allocations.push({ product: product ?? null, pool, slotNos: supply.slotNos, kg: supply.kg, leftoverKg: supply.leftoverKg, amount: supply.amount, label });
    if (supply.leftoverKg > 0) leftoverLines.push({ productId: product?.id ?? pool?.id ?? '', label, leftoverKg: supply.leftoverKg });

    const listing = product?.cattle_listings;
    for (const cellNo of [...bucket.cellNos].sort((a, b) => a - b)) {
      snapshots.push({
        cellNo,
        productId: product?.id ?? '',
        partName: product?.cattle_parts?.part_name ?? pool?.partGroup ?? product?.part_group ?? '부위',
        partGroup: product?.part_group ?? pool?.partGroup ?? '',
        grade: product ? gradeWithMarbling(listing?.grade, listing?.marbling_score) : (pool?.gradeLabel ?? ''),
        image: product ? resolveProductImages(product, groupImages)[0] ?? null : null,
        grams: GIFT_CELL_GRAMS,
      });
    }
  }
  snapshots.sort((a, b) => a.cellNo - b.cellNo);

  const leftoverKg = leftoverLines.reduce((acc, l) => acc + l.leftoverKg, 0);
  let leftoverPickup = null as { store: { id: string; name: string; address: string; addressDetail: string; zipcode?: string | null }; pickupAt: string } | null;
  if (leftoverKg > 0 && isDineIn(leftoverMethod)) {
    const resolved = await resolvePickup(input.leftoverPickup);
    if (resolved.ok === false) return { ok: false, status: 400, error: resolved.error };
    leftoverPickup = resolved.pickup;
  }
  if (leftoverKg > 0 && !isDineIn(leftoverMethod)) {
    const leftoverShipErr = validateFullShipping(input.leftoverShipping);
    if (leftoverShipErr) return { ok: false, status: 400, error: `남는 양 배송지: ${leftoverShipErr}` };
  }

  const leftoverShipping = leftoverKg > 0
    ? (leftoverPickup
        ? shippingForReceive('dine_in', normalizeShipping(input.leftoverShipping), leftoverPickup.store)
        : normalizeShipping(input.leftoverShipping))
    : normalizeShipping(recipients[0].shipping);

  const settings = await getGiftSettings();
  const packagingFee = settings.packagingFee;
  const giftNo = buildGiftNo();

  const { data: giftData, error: giftError } = await supabase
    .from('group_buy_gift_sets')
    .insert({
      gift_no: giftNo,
      consumer_id: consumer.id,
      cell_count: cellCount,
      quantity,
      packaging_fee: packagingFee,
      cells: snapshots,
      recipient_mode: mode,
      leftover_receive_method: leftoverMethod,
      leftover_store_id: leftoverPickup?.store.id ?? null,
      leftover_pickup_at: leftoverPickup?.pickupAt ?? null,
      leftover_shipping: leftoverShipping,
      leftover_kg: leftoverKg,
      meat_amount: 0,
      amount: 0,
      status: 'paid',
    })
    .select('*')
    .single();
  if (giftError || !giftData) return { ok: false, status: 500, error: giftError?.message ?? '선물세트를 만들지 못했어요.' };
  const giftId = (giftData as GiftSetRow).id;

  const { error: recError } = await supabase.from('group_buy_gift_recipients').insert(
    recipients.map((r, i) => ({
      gift_set_id: giftId,
      set_index: i + 1,
      shipping: normalizeShipping(r.shipping),
      message: r.message?.trim() || null,
    })),
  );
  if (recError) {
    await supabase.from('group_buy_gift_sets').delete().eq('id', giftId);
    return { ok: false, status: 500, error: recError.message };
  }

  const createdOrders: ConsumerOrder[] = [];
  const reservationIds: string[] = [];
  for (const alloc of allocations) {
    if (alloc.product && alloc.slotNos.length > 0) {
      const result = await createOrder(consumer, {
        productId: alloc.product.id,
        slotNos: alloc.slotNos,
        shipping: leftoverShipping,
        receiveMethod: leftoverKg > 0 ? leftoverMethod : 'delivery',
        pickup: leftoverPickup ? { storeId: leftoverPickup.store.id, pickupAt: leftoverPickup.pickupAt } : undefined,
        giftSetId: giftId,
        skipPayment: true,
      });
      if (!result.ok || !result.order) {
        await rollbackGift(giftId, createdOrders.map((o) => o.id), reservationIds);
        return { ok: false, status: result.status ?? 400, error: result.error ?? '구좌를 담지 못했어요.' };
      }
      createdOrders.push(result.order);
    }
    if (alloc.pool && alloc.kg > 0) {
      const reserved = await insertGiftReservation({
        pool: alloc.pool,
        kg: alloc.kg,
        consumerId: consumer.id,
        giftId,
        shipping: leftoverShipping,
        receiveMethod: leftoverKg > 0 ? leftoverMethod : 'delivery',
        storeId: leftoverPickup?.store.id ?? null,
        pickupAt: leftoverPickup?.pickupAt ?? null,
      });
      if (!reserved.ok || !reserved.id) {
        await rollbackGift(giftId, createdOrders.map((o) => o.id), reservationIds);
        return { ok: false, status: 400, error: reserved.error ?? '1kg 구매를 담지 못했어요.' };
      }
      reservationIds.push(reserved.id);
    }
  }

  const kgAmount = allocations.reduce((acc, alloc) => acc + (alloc.pool && alloc.kg > 0 ? alloc.pool.pricePerKg * alloc.kg : 0), 0);
  const meatAmount = createdOrders.reduce((acc, o) => acc + o.amount, 0) + kgAmount;
  const amount = meatAmount + packagingAmount(packagingFee, quantity);
  const payment = await getPaymentProvider().approve({
    orderNo: giftNo,
    amount,
    orderName: `한우 선물세트 ${cellCount}구 × ${quantity}`,
    customerName: consumer.name,
    customerPhone: consumer.phone,
  });
  if (!payment.ok) {
    await rollbackGift(giftId, createdOrders.map((o) => o.id), reservationIds);
    return { ok: false, status: 402, error: payment.message ?? '결제에 실패했습니다.' };
  }

  await supabase
    .from('group_buy_gift_sets')
    .update({
      meat_amount: meatAmount,
      amount,
      leftover_kg: leftoverKg,
      payment_provider: getPaymentProvider().name,
      payment_key: payment.paymentKey,
      paid_at: payment.approvedAt,
    })
    .eq('id', giftId);

  if (createdOrders.length > 0) {
    await supabase
      .from('group_buy_orders')
      .update({ payment_key: payment.paymentKey, paid_at: payment.approvedAt })
      .in('id', createdOrders.map((o) => o.id));
  }
  if (reservationIds.length > 0) {
    await supabase
      .from('group_buy_reservations')
      .update({ payment_key: payment.paymentKey, paid_at: payment.approvedAt })
      .in('id', reservationIds);
    const poolIds = Array.from(new Set(allocations.map((alloc) => alloc.pool?.id).filter((id): id is string => !!id)));
    for (const poolId of poolIds) await matchPool(poolId, consumer.id);
  }

  const gift = await getConsumerGiftSet(giftId, consumer.id);
  if (!gift) return { ok: false, status: 500, error: '결제는 됐지만 조회에 실패했어요.' };
  return { ok: true, gift };
}

export async function listConsumerGiftSets(consumerId: string): Promise<ConsumerGiftSet[]> {
  const { data } = await supabase.from('group_buy_gift_sets').select(GIFT_SELECT).eq('consumer_id', consumerId).order('created_at', { ascending: false });
  const rows = (data ?? []) as (GiftSetRow & { group_buy_stores: StoreJoin | null })[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [recipients, orders] = await Promise.all([loadRecipients(ids), loadGiftOrders(ids, consumerId)]);
  return rows.map((row) => toConsumerGiftSet(row, recipients.get(row.id) ?? [], orders.get(row.id) ?? []));
}

export async function getConsumerGiftSet(id: string, consumerId: string): Promise<ConsumerGiftSet | null> {
  const { data } = await supabase.from('group_buy_gift_sets').select(GIFT_SELECT).eq('id', id).eq('consumer_id', consumerId).maybeSingle();
  const row = data as (GiftSetRow & { group_buy_stores: StoreJoin | null }) | null;
  if (!row) return null;
  const [recipients, orders] = await Promise.all([loadRecipients([id]), loadGiftOrders([id], consumerId)]);
  return toConsumerGiftSet(row, recipients.get(id) ?? [], orders.get(id) ?? []);
}

export async function listAdminGiftSets(): Promise<ConsumerGiftSet[]> {
  const { data } = await supabase.from('group_buy_gift_sets').select(GIFT_SELECT).order('created_at', { ascending: false }).limit(80);
  const rows = (data ?? []) as (GiftSetRow & { group_buy_stores: StoreJoin | null })[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [recipients, orders] = await Promise.all([loadRecipients(ids), loadGiftOrders(ids)]);
  return rows.map((row) => toConsumerGiftSet(row, recipients.get(row.id) ?? [], orders.get(row.id) ?? []));
}

/** 모집 중인 원천 구좌를 모두 취소하고 세트도 환불한다 */
export async function cancelGiftSet(id: string, consumerId: string): Promise<{ error: string | null; status?: number }> {
  const gift = await getConsumerGiftSet(id, consumerId);
  if (!gift) return { error: '선물세트를 찾을 수 없습니다.', status: 404 };
  if (gift.status !== 'paid') return { error: '이미 취소된 세트입니다.', status: 400 };
  if (!gift.canCancel) return { error: '모집이 끝나 취소할 수 없어요. 고객센터로 문의해주세요.', status: 400 };

  for (const order of gift.orders) {
    const result = await cancelOrder(order.id, consumerId);
    if (result.error) return { error: result.error, status: result.status };
  }

  const { data: openReservations } = await supabase.from('group_buy_reservations').select('*').eq('gift_set_id', id).eq('status', 'open');
  for (const row of (openReservations ?? []) as GroupBuyReservationRow[]) {
    const refund = await getPaymentProvider().refund(row.payment_key ?? '', row.held_amount, '선물세트 취소');
    if (!refund.ok) return { error: refund.message ?? '1kg 구매를 환불하지 못했어요.', status: 500 };
    await supabase
      .from('group_buy_reservations')
      .update({ status: 'cancelled', refunded_at: refund.refundedAt ?? new Date().toISOString(), refund_reason: '선물세트 취소' })
      .eq('id', row.id)
      .eq('status', 'open');
  }

  await supabase
    .from('group_buy_gift_sets')
    .update({ status: 'cancelled', refunded_at: new Date().toISOString() })
    .eq('id', id);
  return { error: null };
}

async function loadRecipients(giftIds: string[]): Promise<Map<string, GiftRecipient[]>> {
  const map = new Map<string, GiftRecipient[]>();
  if (giftIds.length === 0) return map;
  const { data } = await supabase.from('group_buy_gift_recipients').select('gift_set_id, set_index, shipping, message').in('gift_set_id', giftIds).order('set_index');
  for (const row of (data ?? []) as (GiftRecipientRow & { gift_set_id: string })[]) {
    const list = map.get(row.gift_set_id) ?? [];
    list.push({ setIndex: row.set_index, shipping: row.shipping, message: row.message });
    map.set(row.gift_set_id, list);
  }
  return map;
}

async function loadGiftOrders(giftIds: string[], consumerId?: string): Promise<Map<string, ConsumerOrder[]>> {
  const map = new Map<string, ConsumerOrder[]>();
  if (giftIds.length === 0) return map;
  let query = supabase.from('group_buy_orders').select(ORDER_SELECT).in('gift_set_id', giftIds).order('created_at');
  if (consumerId) query = query.eq('consumer_id', consumerId);
  const { data } = await query;
  const orders = (data ?? []) as unknown as OrderWithJoins[];
  if (orders.length === 0) return map;

  const productIds = Array.from(new Set(orders.map((o) => o.product_id)));
  const [{ data: productRows }, groupImages] = await Promise.all([
    supabase.from('group_buy_products').select(PRODUCT_SELECT).in('id', productIds),
    loadGroupImageMap(),
  ]);
  const products = new Map(((productRows ?? []) as unknown as ProductWithJoins[]).map((p) => [p.id, p]));
  for (const order of orders) {
    const product = products.get(order.product_id);
    if (!product) continue;
    const mapped = toConsumerOrder(order, product, groupImages);
    const key = (order as GroupBuyOrderRow).gift_set_id;
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(mapped);
    map.set(key, list);
  }
  return map;
}

function toConsumerGiftSet(
  row: GiftSetRow & { group_buy_stores: StoreJoin | null },
  recipients: GiftRecipient[],
  orders: ConsumerOrder[],
): ConsumerGiftSet {
  const leftoverLines: GiftLeftoverLine[] = orders
    .map((order) => {
      const used = (row.cells ?? []).filter((c) => c.productId === order.productId).length * 0.5 * row.quantity;
      return {
        productId: order.productId,
        label: `${order.partName} ${order.grade ?? ''}`.trim(),
        leftoverKg: Math.max(0, Math.round((order.weightKg - used) * 10) / 10),
      };
    })
    .filter((l) => l.leftoverKg > 0);

  return {
    id: row.id,
    giftNo: row.gift_no,
    cellCount: toGiftCellCount(row.cell_count),
    quantity: row.quantity,
    packagingFee: row.packaging_fee,
    cells: row.cells ?? [],
    recipientMode: toRecipientMode(row.recipient_mode),
    leftoverReceiveMethod: toReceiveMethod(row.leftover_receive_method),
    leftoverStore: toStoreSummary(row.group_buy_stores),
    leftoverPickupAt: row.leftover_pickup_at,
    leftoverShipping: row.leftover_shipping,
    leftoverKg: toNumber(row.leftover_kg),
    leftoverLines,
    meatAmount: row.meat_amount,
    amount: row.amount,
    status: row.status,
    statusLabel: GIFT_STATUS_LABEL[row.status] ?? row.status,
    canCancel: row.status === 'paid' && orders.every((o) => o.canCancel),
    recipients,
    orders,
    paidAt: row.paid_at,
    refundedAt: row.refunded_at,
    createdAt: row.created_at,
  };
}

async function rollbackGift(giftId: string, orderIds: string[], reservationIds: string[] = []) {
  if (reservationIds.length > 0) await supabase.from('group_buy_reservations').delete().in('id', reservationIds);
  for (const orderId of orderIds) {
    await supabase.from('group_buy_order_slots').delete().eq('order_id', orderId);
    await supabase.from('group_buy_orders').delete().eq('id', orderId);
  }
  await supabase.from('group_buy_gift_recipients').delete().eq('gift_set_id', giftId);
  await supabase.from('group_buy_gift_sets').delete().eq('id', giftId);
}

async function insertGiftReservation(input: {
  pool: { id: string; pricePerKg: number; ttlDays: number };
  kg: number;
  consumerId: string;
  giftId: string;
  shipping: ShippingInfo;
  receiveMethod: ReceiveMethod;
  storeId: string | null;
  pickupAt: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const expiresAt = new Date(Date.now() + input.pool.ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('group_buy_reservations')
    .insert({
      reservation_no: `GR${kstStamp()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      pool_id: input.pool.id,
      consumer_id: input.consumerId,
      kg: input.kg,
      price_per_kg: input.pool.pricePerKg,
      trim_and_slice: false,
      option_fee_per_kg: 0,
      held_amount: input.pool.pricePerKg * input.kg,
      status: 'open',
      payment_provider: getPaymentProvider().name,
      receive_method: input.receiveMethod,
      store_id: input.storeId,
      pickup_at: input.pickupAt,
      shipping: input.shipping,
      expires_at: expiresAt,
      gift_set_id: input.giftId,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? '1kg 구매를 담지 못했어요.' };
  return { ok: true, id: (data as { id: string }).id };
}

function kstStamp(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(2, 10).replace(/-/g, '');
}

function validateFullShipping(s: ShippingInfo | undefined): string | null {
  if (!s) return '받으실 분 정보를 입력해주세요.';
  if (!s.name?.trim()) return '받는 분 이름을 입력해주세요.';
  if (!s.phone?.trim()) return '받는 분 연락처를 입력해주세요.';
  if (!s.address?.trim()) return '배송 주소를 입력해주세요.';
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

function buildGiftNo(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GF${date}-${rand}`;
}
