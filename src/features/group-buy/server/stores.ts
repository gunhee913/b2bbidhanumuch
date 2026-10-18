import 'server-only';

import { supabase } from './db';
import type { ConsumerStore, GroupBuyStoreRow, PickupInput, PickupSlot, StoreSummary, UpsertStoreInput } from '../types';
import { buildPickupSlots, normalizePickupKey, pickupIso, validatePickupAt, shortTime } from '../lib/stores';

/** 주문·예약 조인용 · 매장 요약 */
export const STORE_SUMMARY_SELECT = 'group_buy_stores ( id, slug, name, address, address_detail, phone, zipcode )';

export type StoreJoin = Pick<GroupBuyStoreRow, 'id' | 'slug' | 'name' | 'address' | 'address_detail' | 'phone' | 'zipcode'>;

export function toStoreSummary(row: StoreJoin | null | undefined): StoreSummary | null {
  if (!row) return null;
  return { id: row.id, slug: row.slug, name: row.name, address: row.address, addressDetail: row.address_detail ?? '', phone: row.phone ?? '' };
}

export function toConsumerStore(row: GroupBuyStoreRow): ConsumerStore {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    zipcode: row.zipcode ?? '',
    address: row.address,
    addressDetail: row.address_detail ?? '',
    phone: row.phone ?? '',
    lat: Number(row.lat),
    lng: Number(row.lng),
    openTime: shortTime(row.open_time),
    closeTime: shortTime(row.close_time),
    closedWeekdays: row.closed_weekdays ?? [],
    slotMinutes: row.slot_minutes,
    slotCapacity: row.slot_capacity,
    description: row.description ?? '',
    directions: row.directions ?? '',
    parking: row.parking ?? '',
    imageUrl: row.image_url,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

/** 소비자용 매장 목록 · 활성 매장만, 정렬 순 */
export async function listStores(includeInactive = false): Promise<ConsumerStore[]> {
  let query = supabase.from('group_buy_stores').select('*').order('sort_order').order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data } = await query;
  return ((data ?? []) as GroupBuyStoreRow[]).map(toConsumerStore);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** slug 또는 id 로 매장 하나 */
export async function getStore(slugOrId: string, includeInactive = false): Promise<ConsumerStore | null> {
  let query = supabase.from('group_buy_stores').select('*').eq(UUID_RE.test(slugOrId) ? 'id' : 'slug', slugOrId);
  if (!includeInactive) query = query.eq('is_active', true);
  const { data } = await query.maybeSingle();
  return data ? toConsumerStore(data as GroupBuyStoreRow) : null;
}

/**
 * 슬롯별로 이미 잡힌 수 · 결제된 주문 + 살아 있는 예약(open/allocated).
 * 예약이 주문으로 번역되면 reservation_id 가 붙은 주문과 예약이 둘 다 남으므로 예약은 open 만 센다.
 */
async function loadTakenCounts(storeId: string, dateStr: string, exclude?: { orderId?: string; reservationId?: string }): Promise<Map<string, number>> {
  const from = pickupIso(dateStr, 0);
  const to = pickupIso(dateStr, 24 * 60 - 1);
  const [orders, reservations] = await Promise.all([
    supabase.from('group_buy_orders').select('id, pickup_at').eq('store_id', storeId).eq('status', 'paid').gte('pickup_at', from).lte('pickup_at', to),
    supabase.from('group_buy_reservations').select('id, pickup_at').eq('store_id', storeId).eq('status', 'open').gte('pickup_at', from).lte('pickup_at', to),
  ]);
  const taken = new Map<string, number>();
  const add = (rows: { id: string; pickup_at: string | null }[] | null, skipId?: string) => {
    for (const r of rows ?? []) {
      if (!r.pickup_at || r.id === skipId) continue;
      const key = normalizePickupKey(r.pickup_at);
      taken.set(key, (taken.get(key) ?? 0) + 1);
    }
  };
  add(orders.data as { id: string; pickup_at: string | null }[] | null, exclude?.orderId);
  add(reservations.data as { id: string; pickup_at: string | null }[] | null, exclude?.reservationId);
  return taken;
}

/** 하루치 슬롯과 잔여 */
export async function getStoreSlots(store: ConsumerStore, dateStr: string): Promise<PickupSlot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];
  const taken = await loadTakenCounts(store.id, dateStr);
  return buildPickupSlots(store, dateStr, taken);
}

export interface ResolvedPickup {
  store: ConsumerStore;
  pickupAt: string;
}
export type PickupResolution = { ok: true; pickup: ResolvedPickup } | { ok: false; error: string };

/**
 * 주문·예약 생성 시 픽업 검증 · 매장 활성, 날짜 범위, 영업시간·휴무, 정원.
 * `now` 는 주문 시점 · 변경 시에는 원래 주문일이 아니라 변경 시점 기준으로 다시 센다.
 */
export async function resolvePickup(
  input: PickupInput | undefined,
  now: Date = new Date(),
  exclude?: { orderId?: string; reservationId?: string },
): Promise<PickupResolution> {
  if (!input?.storeId || !input.pickupAt) return { ok: false, error: '받을 매장과 픽업 시간을 골라주세요.' };
  const store = await getStore(input.storeId);
  if (!store) return { ok: false, error: '선택한 매장을 찾을 수 없습니다.' };
  const ruleError = validatePickupAt(store, input.pickupAt, now);
  if (ruleError) return { ok: false, error: ruleError };
  const pickupAt = normalizePickupKey(input.pickupAt);
  const taken = await loadTakenCounts(store.id, pickupAt.slice(0, 10), exclude);
  if ((taken.get(pickupAt) ?? 0) >= store.slotCapacity) return { ok: false, error: '선택한 시간은 예약이 모두 찼습니다. 다른 시간을 골라주세요.' };
  return { ok: true, pickup: { store, pickupAt } };
}

/** 주문 픽업 변경 · 본인 주문, 결제 상태, 매장 수령일 때만 */
export async function updateOrderPickup(orderId: string, consumerId: string, input: PickupInput): Promise<{ error?: string; status?: number }> {
  const { data } = await supabase.from('group_buy_orders').select('id, status, receive_method, pickup_at').eq('id', orderId).eq('consumer_id', consumerId).maybeSingle();
  const row = data as { id: string; status: string; receive_method: string | null; pickup_at: string | null } | null;
  if (!row) return { error: '주문을 찾을 수 없습니다.', status: 404 };
  if (row.status !== 'paid') return { error: '취소된 주문은 변경할 수 없습니다.', status: 400 };
  if (row.receive_method !== 'dine_in') return { error: '매장 수령 주문만 픽업 시간을 바꿀 수 있습니다.', status: 400 };
  const resolved = await resolvePickup(input, new Date(), { orderId });
  if (resolved.ok === false) return { error: resolved.error, status: 400 };
  const { store, pickupAt } = resolved.pickup;
  const { error } = await supabase.from('group_buy_orders').update({ store_id: store.id, pickup_at: pickupAt }).eq('id', orderId);
  if (error) return { error: error.message, status: 500 };
  return {};
}

/** 1kg 구매 예약 픽업 변경 · 아직 모이는 중(open)일 때만 · 확정된 뒤에는 주문 쪽에서 바꾼다 */
export async function updateReservationPickup(reservationId: string, consumerId: string, input: PickupInput): Promise<{ error?: string; status?: number }> {
  const { data } = await supabase.from('group_buy_reservations').select('id, status, receive_method').eq('id', reservationId).eq('consumer_id', consumerId).maybeSingle();
  const row = data as { id: string; status: string; receive_method: string | null } | null;
  if (!row) return { error: '주문을 찾을 수 없습니다.', status: 404 };
  if (row.status !== 'open') return { error: '확정되었거나 끝난 주문은 여기서 변경할 수 없습니다.', status: 400 };
  if (row.receive_method !== 'dine_in') return { error: '매장 수령 주문만 픽업 시간을 바꿀 수 있습니다.', status: 400 };
  const resolved = await resolvePickup(input, new Date(), { reservationId });
  if (resolved.ok === false) return { error: resolved.error, status: 400 };
  const { store, pickupAt } = resolved.pickup;
  const { error } = await supabase.from('group_buy_reservations').update({ store_id: store.id, pickup_at: pickupAt }).eq('id', reservationId);
  if (error) return { error: error.message, status: 500 };
  return {};
}

// ------------------------------------------------------------
// 관리자
// ------------------------------------------------------------

export async function upsertStore(input: UpsertStoreInput): Promise<{ store?: ConsumerStore; error?: string }> {
  const row = {
    ...(input.id ? { id: input.id } : {}),
    slug: input.slug.trim().toLowerCase(),
    name: input.name.trim(),
    zipcode: input.zipcode?.trim() || null,
    address: input.address.trim(),
    address_detail: input.addressDetail?.trim() || null,
    phone: input.phone?.trim() || null,
    lat: input.lat,
    lng: input.lng,
    open_time: input.openTime,
    close_time: input.closeTime,
    closed_weekdays: input.closedWeekdays,
    slot_minutes: input.slotMinutes,
    slot_capacity: input.slotCapacity,
    description: input.description?.trim() || null,
    directions: input.directions?.trim() || null,
    parking: input.parking?.trim() || null,
    image_url: input.imageUrl?.trim() || null,
    is_active: input.isActive,
    sort_order: input.sortOrder,
  };
  const { data, error } = await supabase.from('group_buy_stores').upsert(row, { onConflict: 'id' }).select('*').single();
  if (error || !data) return { error: error?.message ?? '매장 저장에 실패했습니다.' };
  return { store: toConsumerStore(data as GroupBuyStoreRow) };
}
