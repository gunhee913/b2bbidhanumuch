import 'server-only';

import { addDays, format, parseISO } from 'date-fns';
import { toPartGroupName } from '@/features/live-auction/lib/partGrouping';
import { todayKst } from '@/lib/utils';
import type {
  AdminProduct,
  AdminProductDetail,
  ConsumerProduct,
  ConsumerProductFilter,
  ConsumerProductSummary,
  CertificateFile,
  GroupBuyPartDefaultRow,
  ProductCerts,
  GroupBuyProductRow,
  GroupBuyStatus,
  UpdateProductSettingsInput,
} from '../types';
import { ADMIN_FORCE_TRANSITIONS, EVENT_TYPES } from '../constants/status';
import { calcSlotPrice, calcSlotWeight, consumerPricePerKg } from '../lib/slots';
import {
  loadGroupImageMap,
  PRODUCT_SELECT,
  ORDER_SELECT,
  supabase,
  toNumber,
  type OrderWithJoins,
  type ProductWithJoins,
} from './db';
import { logEvent } from './events';
import {
  toAdminOrder,
  toAdminProduct,
  toConsumerProduct,
  toConsumerProductSummary,
  toGroupBuyEvent,
  toPartDefault,
} from './mappers';
import { getSettings } from './settings';

/** 관리자 목록 상한 · 상장일 필터 없이 열었을 때 최근 것만 */
const ADMIN_LIST_LIMIT = 500;

/** 경매 시각 기준 마감이 이미 지났을 때(일정 없음·경매 후 승인) 대신 쓰는 모집 시간 */
const FALLBACK_RECRUIT_HOURS = 24;

/** 동기화가 되돌아보는 상장일 범위 · 전날 밤 승인분까지만 */
const SYNC_LOOKBACK_DAYS = 2;

/** `yyyy-MM-dd` 에 일수를 더한다 */
function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

/** 공동구매로 올리지 않는 부위 · 뼈·부산물은 소비자 소분 판매 대상이 아니다 */
const EXCLUDED_PART_GROUPS = new Set(['꼬리', '족', '사골', '잡뼈']);

/** 자동 공개 조건 · 분할 수·단가·마감이 모두 있어야 소비자에게 보인다 */
type PublishFields = Pick<GroupBuyProductRow, 'slot_count' | 'price_per_kg' | 'recruit_deadline'>;
const isReadyToPublish = (row: PublishFields) => !!row.slot_count && !!row.price_per_kg && !!row.recruit_deadline;

const PUBLIC_STATUSES: GroupBuyStatus[] = [
  'recruiting', 'full', 'bidding', 'won', 'processing', 'shipped', 'completed', 'lost', 'cancelled',
];

// ------------------------------------------------------------
// draft 자동 생성
// ------------------------------------------------------------

interface ListingForDraft {
  id: string;
  listing_date: string;
  slaughter_house: string | null;
}

/**
 * 상장 승인 시 호출 · 포함된 부위마다 상품 1건(뼈·부산물 제외).
 * 이미 있는 부위는 건너뛴다(part_id UNIQUE). kg당 단가는 부위 최저단가 + 20%(천원 반올림),
 * 최저단가가 없을 때만 부위군 기본 단가를 쓴다. 대분류 기본값이 있으면 분할 수 등을 미리 채우고,
 * 분할 수·단가·마감이 다 갖춰진 부위는 바로 모집중으로 공개한다 — 기본값 없는 부위만 draft 로 남는다.
 */
export async function createDraftProductsForListing(listingId: string): Promise<{ created: number; error: string | null }> {
  const { data: listing, error: listingError } = await supabase
    .from('cattle_listings')
    .select('id, listing_date, slaughter_house')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) return { created: 0, error: listingError?.message ?? '상장을 찾을 수 없습니다.' };

  const { data: parts, error: partsError } = await supabase
    .from('cattle_parts')
    .select('id, part_name, weight, min_price')
    .eq('listing_id', listingId)
    .eq('is_included', true);

  if (partsError) return { created: 0, error: partsError.message };
  if (!parts || parts.length === 0) return { created: 0, error: null };

  const { data: existing } = await supabase
    .from('group_buy_products')
    .select('part_id')
    .in('part_id', parts.map((p) => p.id));
  const existingIds = new Set((existing ?? []).map((e: { part_id: string }) => e.part_id));

  const { data: defaultsRows } = await supabase.from('group_buy_part_defaults').select('*');
  const defaults = new Map<string, GroupBuyPartDefaultRow>(
    ((defaultsRows ?? []) as GroupBuyPartDefaultRow[]).map((d) => [d.part_group, d]),
  );

  const deadline = await computeDefaultDeadline(listing as ListingForDraft);

  const rows = parts
    .filter((p) => !existingIds.has(p.id) && !EXCLUDED_PART_GROUPS.has(toPartGroupName(p.part_name)))
    .map((p) => {
      const group = toPartGroupName(p.part_name);
      const def = defaults.get(group);
      const weight = toNumber(p.weight);
      const slotCount = def?.slot_count ?? null;
      const pricePerKg = consumerPricePerKg(p.min_price) ?? def?.price_per_kg ?? null;
      const slotWeight = slotCount ? calcSlotWeight(weight, slotCount) : null;
      const slotPrice = slotWeight && pricePerKg ? calcSlotPrice(pricePerKg, slotWeight) : null;
      const referenceRetail =
        slotWeight && def?.reference_retail_price_per_kg
          ? calcSlotPrice(def.reference_retail_price_per_kg, slotWeight)
          : null;
      const ready = isReadyToPublish({ slot_count: slotCount, price_per_kg: pricePerKg, recruit_deadline: deadline });

      return {
        part_id: p.id,
        listing_id: listingId,
        part_group: group,
        slot_count: slotCount,
        slot_weight: slotWeight,
        price_per_kg: pricePerKg,
        slot_price: slotPrice,
        reference_retail_price: referenceRetail,
        positional: def?.positional ?? true,
        bid_price_cap: def?.bid_price_cap ?? null,
        recruit_deadline: deadline,
        status: ready ? ('recruiting' as const) : ('draft' as const),
        published_at: ready ? new Date().toISOString() : null,
      };
    });

  if (rows.length === 0) return { created: 0, error: null };

  const { data: inserted, error } = await supabase
    .from('group_buy_products')
    .insert(rows)
    .select('id, status');

  if (error) return { created: 0, error: error.message };

  await Promise.all(
    ((inserted ?? []) as { id: string; status: GroupBuyStatus }[]).map((row) =>
      logEvent({
        productId: row.id,
        type: row.status === 'recruiting' ? EVENT_TYPES.PUBLISHED : EVENT_TYPES.DRAFT_CREATED,
        message: row.status === 'recruiting' ? '상장 승인 · 부위 기본값으로 자동 공개' : '상장 승인으로 상품 초안 생성 · 부위 기본값 없음',
      }),
    ),
  );

  return { created: inserted?.length ?? 0, error: null };
}

const DRAFT_CONCURRENCY = 5;

/** 여러 상장의 초안을 동시에 만든다 · 풀 매칭은 호출하는 쪽에서 한 번만 한다 */
export async function createDraftProductsForListings(
  listingIds: string[],
): Promise<{ created: number; error: string | null }> {
  let created = 0;
  let error: string | null = null;

  for (let index = 0; index < listingIds.length; index += DRAFT_CONCURRENCY) {
    const chunk = listingIds.slice(index, index + DRAFT_CONCURRENCY);
    const results = await Promise.all(chunk.map((id) => createDraftProductsForListing(id)));
    for (const result of results) {
      created += result.created;
      if (result.error) error = result.error;
    }
  }

  return { created, error };
}

/**
 * 관리자 "동기화" 버튼 · 두 가지를 한다.
 * 1) 승인 이후 상태인데 상품이 없는 상장을 훑어 상품을 만든다.
 * 2) 남아 있는 draft 에 현재 부위 기본값을 채우고, 갖춰진 것은 공개한다.
 * 대상 = 아직 경매 전(approved)이면서 상장일이 (오늘 − SYNC_LOOKBACK_DAYS) 이후인 상장
 *      + 오늘 이후 경매중(auction) 상장.
 * 전날 밤에 승인된 상장은 잡되, 경매가 끝난 상장이나 몇 달 전에 승인만 되고 방치된 상장까지
 * 훑으면 수천 건의 초안이 쏟아져 목록이 무의미해지므로 날짜로 자른다.
 */
export async function syncDraftProducts(today: string = todayKst()): Promise<{ listings: number; created: number; published: number }> {
  const fromDate = shiftDate(today, -SYNC_LOOKBACK_DAYS);
  const { data: listings } = await supabase
    .from('cattle_listings')
    .select('id')
    .in('status', ['approved', 'auction'])
    .gte('listing_date', fromDate)
    .or(`status.eq.approved,listing_date.gte.${today}`);

  const listingIds = ((listings ?? []) as { id: string }[]).map((listing) => listing.id);
  const { created } = await createDraftProductsForListings(listingIds);
  const { published } = await publishReadyDrafts(today);
  return { listings: listingIds.length, created, published };
}

interface DraftForPublish {
  id: string;
  part_group: string;
  slot_count: number | null;
  slot_weight: number | string | null;
  price_per_kg: number | null;
  slot_price: number | null;
  reference_retail_price: number | null;
  recruit_deadline: string | null;
  cattle_parts: { weight: number | string | null; min_price: number | null } | null;
  cattle_listings: ListingForDraft | null;
}

/**
 * draft 백필 · 기본값이 나중에 채워졌거나 마감이 지난 초안을 되살린다.
 * 비어 있는 분할 수·단가는 부위 기본값으로 채우고, 지난 마감은 다시 계산한 뒤
 * 세 값이 모두 갖춰지면 모집중으로 공개한다. 이미 관리자가 넣은 값은 건드리지 않는다.
 */
export async function publishReadyDrafts(today: string = todayKst()): Promise<{ published: number; filled: number }> {
  const fromDate = shiftDate(today, -SYNC_LOOKBACK_DAYS);
  const { data } = await supabase
    .from('group_buy_products')
    .select(
      'id, part_group, slot_count, slot_weight, price_per_kg, slot_price, reference_retail_price, recruit_deadline, cattle_parts ( weight, min_price ), cattle_listings!inner ( id, listing_date, slaughter_house, status )',
    )
    .eq('status', 'draft')
    .in('cattle_listings.status', ['approved', 'auction'])
    .gte('cattle_listings.listing_date', fromDate)
    .or(`status.eq.approved,listing_date.gte.${today}`, { referencedTable: 'cattle_listings' });
  const drafts = (data ?? []) as unknown as DraftForPublish[];
  if (drafts.length === 0) return { published: 0, filled: 0 };

  const { data: defaultsRows } = await supabase.from('group_buy_part_defaults').select('*');
  const defaults = new Map<string, GroupBuyPartDefaultRow>(
    ((defaultsRows ?? []) as GroupBuyPartDefaultRow[]).map((d) => [d.part_group, d]),
  );

  const now = Date.now();
  const deadlineByListing = new Map<string, string>();
  let published = 0;
  let filled = 0;

  for (const d of drafts) {
    const def = defaults.get(d.part_group);
    const weight = toNumber(d.cattle_parts?.weight);
    const patch: Partial<GroupBuyProductRow> = {};

    const slotCount = d.slot_count ?? def?.slot_count ?? null;
    const pricePerKg = d.price_per_kg ?? consumerPricePerKg(d.cattle_parts?.min_price) ?? def?.price_per_kg ?? null;
    if (!d.slot_count && slotCount) {
      patch.slot_count = slotCount;
      patch.slot_weight = calcSlotWeight(weight, slotCount);
      if (def) patch.positional = def.positional;
      if (def?.bid_price_cap) patch.bid_price_cap = def.bid_price_cap;
    }
    if (!d.price_per_kg && pricePerKg) patch.price_per_kg = pricePerKg;
    const slotWeight = patch.slot_weight ?? toNumber(d.slot_weight);
    if (slotCount && pricePerKg && slotWeight && !d.slot_price) patch.slot_price = calcSlotPrice(pricePerKg, slotWeight);
    if (slotWeight && def?.reference_retail_price_per_kg && d.reference_retail_price === null) {
      patch.reference_retail_price = calcSlotPrice(def.reference_retail_price_per_kg, slotWeight);
    }

    let deadline = d.recruit_deadline;
    const deadlinePassed = !deadline || new Date(deadline).getTime() <= now;
    if (deadlinePassed && d.cattle_listings) {
      const key = d.cattle_listings.id;
      if (!deadlineByListing.has(key)) deadlineByListing.set(key, await computeDefaultDeadline(d.cattle_listings));
      deadline = deadlineByListing.get(key)!;
      patch.recruit_deadline = deadline;
    }

    const ready = isReadyToPublish({ slot_count: slotCount, price_per_kg: pricePerKg, recruit_deadline: deadline });
    if (ready) {
      patch.status = 'recruiting';
      patch.published_at = new Date().toISOString();
    }
    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase.from('group_buy_products').update(patch).eq('id', d.id).eq('status', 'draft');
    if (error) continue;
    filled += 1;
    if (ready) {
      published += 1;
      await logEvent({ productId: d.id, type: EVENT_TYPES.PUBLISHED, message: '동기화 · 부위 기본값으로 자동 공개' });
    }
  }

  return { published, filled };
}

/**
 * 모집 마감 기본값 = 상장일 1회차 예정 시작 - offset.
 * round_schedules 가 없으면 상장일 10:00(KST) 기준.
 * 그 시각이 이미 지났으면(경매 뒤 승인·일정 없음) 지금부터 FALLBACK_RECRUIT_HOURS 뒤로 잡는다.
 */
export async function computeDefaultDeadline(listing: ListingForDraft): Promise<string> {
  const { deadlineOffsetMin } = await getSettings();

  let plannedStart: string | null = null;
  if (listing.slaughter_house) {
    const { data } = await supabase
      .from('round_schedules')
      .select('planned_start')
      .eq('slaughter_house', listing.slaughter_house)
      .eq('auction_date', listing.listing_date)
      .eq('round_no', 1)
      .maybeSingle();
    plannedStart = (data as { planned_start: string } | null)?.planned_start ?? null;
  }

  const time = (plannedStart ?? '10:00:00').slice(0, 8);
  const start = new Date(`${listing.listing_date}T${time}+09:00`);
  const deadline = new Date(start.getTime() - deadlineOffsetMin * 60 * 1000);
  if (deadline.getTime() <= Date.now()) {
    return new Date(Date.now() + FALLBACK_RECRUIT_HOURS * 60 * 60 * 1000).toISOString();
  }
  return deadline.toISOString();
}

// ------------------------------------------------------------
// 소비자 조회
// ------------------------------------------------------------

export async function listConsumerProducts(filter: ConsumerProductFilter = {}): Promise<ConsumerProduct[]> {
  let query = supabase
    .from('group_buy_products')
    .select(PRODUCT_SELECT)
    .in('status', filter.status === 'all' ? PUBLIC_STATUSES : ['recruiting'])
    .order('recruit_deadline', { ascending: true });

  if (filter.partGroup) query = query.eq('part_group', filter.partGroup);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const groupImages = await loadGroupImageMap();
  let rows = (data ?? []) as unknown as ProductWithJoins[];

  // 조인 컬럼 필터는 메모리에서
  if (filter.grade) rows = rows.filter((r) => (r.cattle_listings?.grade ?? '').startsWith(filter.grade!));
  if (filter.slaughterHouse) rows = rows.filter((r) => r.cattle_listings?.slaughter_house === filter.slaughterHouse);

  return rows.map((r) => toConsumerProduct(r, groupImages));
}

export async function getConsumerProduct(
  id: string,
): Promise<{ product: ConsumerProduct; siblings: ConsumerProductSummary[] } | null> {
  const { data, error } = await supabase
    .from('group_buy_products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as ProductWithJoins;
  if (row.status === 'draft') return null;

  const groupImages = await loadGroupImageMap();

  const { data: siblingRows } = await supabase
    .from('group_buy_products')
    .select(PRODUCT_SELECT)
    .eq('listing_id', row.listing_id)
    .neq('id', id)
    .in('status', ['recruiting', 'full', 'bidding', 'won', 'processing', 'shipped'])
    .order('recruit_deadline', { ascending: true });

  return {
    product: toConsumerProduct(row, groupImages),
    siblings: ((siblingRows ?? []) as unknown as ProductWithJoins[]).map((r) => toConsumerProductSummary(r, groupImages)),
  };
}

/** 증명서 스캔본 · 경매 플랫폼 상장에 등록된 파일 그대로 · 비공개(draft) 상품은 없음 처리 */
export async function getConsumerProductCerts(id: string): Promise<ProductCerts | null> {
  const { data, error } = await supabase
    .from('group_buy_products')
    .select('id, status, cattle_listings ( grade_cert, slaughter_cert )')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as { status: string; cattle_listings: { grade_cert: CertificateFile | null; slaughter_cert: CertificateFile | null } | null };
  if (row.status === 'draft') return null;
  const pick = (c: CertificateFile | null | undefined) => (c?.fileData ? c : null);
  return { gradeCert: pick(row.cattle_listings?.grade_cert), slaughterCert: pick(row.cattle_listings?.slaughter_cert) };
}

// ------------------------------------------------------------
// 관리자 조회·설정
// ------------------------------------------------------------

export async function listAdminProducts(filter: { status?: GroupBuyStatus | 'all'; listingDate?: string } = {}): Promise<AdminProduct[]> {
  let query = supabase
    .from('group_buy_products')
    .select(PRODUCT_SELECT)
    .order('created_at', { ascending: false });

  if (filter.status && filter.status !== 'all') query = query.eq('status', filter.status);

  // 상장일 필터는 DB 에서 건다 · PostgREST 기본 1000행 제한에 걸리지 않도록
  if (filter.listingDate) {
    const { data: listingIds } = await supabase.from('cattle_listings').select('id').eq('listing_date', filter.listingDate);
    const ids = (listingIds ?? []).map((l: { id: string }) => l.id);
    if (ids.length === 0) return [];
    query = query.in('listing_id', ids);
  }

  const { data, error } = await query.limit(ADMIN_LIST_LIMIT);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as ProductWithJoins[];

  const groupImages = await loadGroupImageMap();

  const { data: orderCounts } = await supabase
    .from('group_buy_orders')
    .select('product_id')
    .eq('status', 'paid')
    .in('product_id', rows.map((r) => r.id));
  const countMap = new Map<string, number>();
  for (const o of (orderCounts ?? []) as { product_id: string }[]) {
    countMap.set(o.product_id, (countMap.get(o.product_id) ?? 0) + 1);
  }

  return rows.map((r) => toAdminProduct(r, groupImages, countMap.get(r.id) ?? 0));
}

export async function getAdminProductDetail(id: string): Promise<AdminProductDetail | null> {
  const { data, error } = await supabase
    .from('group_buy_products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as ProductWithJoins;

  const [groupImages, ordersRes, eventsRes] = await Promise.all([
    loadGroupImageMap(),
    supabase.from('group_buy_orders').select(ORDER_SELECT).eq('product_id', id).order('created_at', { ascending: false }),
    supabase.from('group_buy_events').select('*').eq('product_id', id).order('created_at', { ascending: false }).limit(100),
  ]);

  const orders = ((ordersRes.data ?? []) as unknown as OrderWithJoins[]).map(toAdminOrder);
  const paidCount = orders.filter((o) => o.status === 'paid').length;

  return {
    ...toAdminProduct(row, groupImages, paidCount),
    orders,
    events: (eventsRes.data ?? []).map(toGroupBuyEvent),
    soldSlotNos: (row.group_buy_order_slots ?? []).map((s) => s.slot_no).sort((a, b) => a - b),
  };
}

export async function listPartDefaults() {
  const { data } = await supabase.from('group_buy_part_defaults').select('*').order('part_group');
  return ((data ?? []) as GroupBuyPartDefaultRow[]).map(toPartDefault);
}

export async function upsertPartDefault(input: {
  partGroup: string;
  slotCount: number | null;
  pricePerKg: number | null;
  referenceRetailPricePerKg: number | null;
  bidPriceCap: number | null;
  positional: boolean;
  updatedBy: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('group_buy_part_defaults').upsert(
    {
      part_group: input.partGroup,
      slot_count: input.slotCount,
      price_per_kg: input.pricePerKg,
      reference_retail_price_per_kg: input.referenceRetailPricePerKg,
      bid_price_cap: input.bidPriceCap,
      positional: input.positional,
      updated_by: input.updatedBy,
    },
    { onConflict: 'part_group' },
  );
  return { error: error?.message ?? null };
}

/**
 * 상품 설정 저장 · 분할 수/단가가 바뀌면 구좌 중량·구좌가를 다시 계산한다.
 * 이미 구좌가 팔린 상품은 분할 수를 줄일 수 없다.
 */
export async function updateProductSettings(
  id: string,
  input: UpdateProductSettingsInput,
  updatedBy: string,
): Promise<{ product: AdminProduct | null; error: string | null; status?: number }> {
  const { data: current, error: fetchError } = await supabase
    .from('group_buy_products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (fetchError || !current) return { product: null, error: '상품을 찾을 수 없습니다.', status: 404 };

  const row = current as unknown as ProductWithJoins;
  const soldCount = row.group_buy_order_slots?.length ?? 0;
  const partWeight = toNumber(row.cattle_parts?.weight);

  const slotCount = input.slotCount === undefined ? row.slot_count : input.slotCount;
  const pricePerKg = input.pricePerKg === undefined ? row.price_per_kg : input.pricePerKg;

  if (slotCount !== null && soldCount > 0 && slotCount < soldCount) {
    return { product: null, error: `이미 ${soldCount}구좌가 판매되어 분할 수를 그보다 줄일 수 없습니다.`, status: 400 };
  }
  if (slotCount !== null && (slotCount < 1 || slotCount > 100)) {
    return { product: null, error: '분할 수는 1~100 사이여야 합니다.', status: 400 };
  }
  if (pricePerKg !== null && pricePerKg <= 0) {
    return { product: null, error: 'kg당 단가는 0보다 커야 합니다.', status: 400 };
  }

  const slotWeight = slotCount ? calcSlotWeight(partWeight, slotCount) : null;
  const slotPrice = slotWeight && pricePerKg ? calcSlotPrice(pricePerKg, slotWeight) : null;

  const patch: Partial<GroupBuyProductRow> = {
    slot_count: slotCount,
    price_per_kg: pricePerKg,
    slot_weight: slotWeight,
    slot_price: slotPrice,
  };
  if (input.referenceRetailPrice !== undefined) patch.reference_retail_price = input.referenceRetailPrice;
  if (input.positional !== undefined) patch.positional = input.positional;
  if (input.bidPriceCap !== undefined) patch.bid_price_cap = input.bidPriceCap;
  if (input.recruitDeadline !== undefined) patch.recruit_deadline = input.recruitDeadline;
  if (input.description !== undefined) patch.description = input.description?.trim() || null;

  const { data: updated, error } = await supabase
    .from('group_buy_products')
    .update(patch)
    .eq('id', id)
    .select(PRODUCT_SELECT)
    .single();
  if (error) return { product: null, error: error.message, status: 500 };

  await logEvent({ productId: id, type: EVENT_TYPES.SETTINGS_UPDATED, message: '판매 조건 수정', payload: patch as Record<string, unknown>, createdBy: updatedBy });

  const groupImages = await loadGroupImageMap();
  return { product: toAdminProduct(updated as unknown as ProductWithJoins, groupImages, 0), error: null };
}

/** draft → recruiting · 필수값이 모두 있어야 한다 */
export async function publishProduct(id: string, publishedBy: string): Promise<{ error: string | null; status?: number }> {
  const { data, error: fetchError } = await supabase
    .from('group_buy_products')
    .select('id, status, slot_count, price_per_kg, slot_price, recruit_deadline')
    .eq('id', id)
    .maybeSingle();
  if (fetchError || !data) return { error: '상품을 찾을 수 없습니다.', status: 404 };

  const row = data as Pick<GroupBuyProductRow, 'id' | 'status' | 'slot_count' | 'price_per_kg' | 'slot_price' | 'recruit_deadline'>;
  if (row.status !== 'draft') return { error: '설정 필요 상태인 상품만 공개할 수 있습니다.', status: 400 };

  const missing: string[] = [];
  if (!row.slot_count) missing.push('분할 수');
  if (!row.price_per_kg) missing.push('kg당 단가');
  if (!row.recruit_deadline) missing.push('모집 마감');
  if (missing.length > 0) return { error: `${missing.join(', ')}을(를) 먼저 입력해주세요.`, status: 400 };

  const { error } = await supabase
    .from('group_buy_products')
    .update({ status: 'recruiting', published_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message, status: 500 };

  await logEvent({ productId: id, type: EVENT_TYPES.PUBLISHED, message: '소비자에게 공개', createdBy: publishedBy });
  return { error: null };
}

/** 공개 취소 · 아직 아무도 참여하지 않은 모집중 상품만 draft 로 되돌린다 */
export async function unpublishProduct(id: string, by: string): Promise<{ error: string | null; status?: number }> {
  const { data } = await supabase
    .from('group_buy_products')
    .select('status, group_buy_order_slots ( slot_no )')
    .eq('id', id)
    .maybeSingle();
  const row = data as { status: GroupBuyStatus; group_buy_order_slots: { slot_no: number }[] | null } | null;
  if (!row) return { error: '상품을 찾을 수 없습니다.', status: 404 };
  if (row.status !== 'recruiting') return { error: '모집중 상품만 비공개로 돌릴 수 있습니다.', status: 400 };
  if ((row.group_buy_order_slots?.length ?? 0) > 0) return { error: '이미 참여한 구좌가 있어 비공개로 돌릴 수 없습니다.', status: 400 };

  const { error } = await supabase
    .from('group_buy_products')
    .update({ status: 'draft', published_at: null })
    .eq('id', id);
  if (error) return { error: error.message, status: 500 };
  await logEvent({ productId: id, type: EVENT_TYPES.SETTINGS_UPDATED, message: '비공개로 전환', createdBy: by });
  return { error: null };
}

/** 관리자 강제 전이 · 허용된 전이만 */
export function canForceTransition(from: GroupBuyStatus, to: GroupBuyStatus): boolean {
  return (ADMIN_FORCE_TRANSITIONS[from] ?? []).includes(to);
}
