import 'server-only';

import { extractSide, toPartGroupName } from '@/features/live-auction/lib/partGrouping';
import type {
  AdminOrder,
  AdminProduct,
  CattleSummary,
  ConsumerOrder,
  ConsumerProduct,
  ConsumerProductSummary,
  GroupBuyEvent,
  GroupBuyEventRow,
  GroupBuyPartDefault,
  GroupBuyPartDefaultRow,
  ShippingInfo,
} from '../types';
import {
  CONSUMER_STATUS_LABELS,
  consumerCancelMessage,
  toConsumerStatus,
} from '../constants/status';
import { buildProductZones, calcPricePer100g, calcSavingRate, isZoneSplit, sumZones } from '../lib/slots';
import { toReceiveMethod } from '../lib/receive';
import { toStoreSummary } from './stores';
import { groupImageKey, toNumber, type GroupImageMap, type OrderWithJoins, type ProductWithJoins } from './db';

/**
 * 부위 사진 우선순위 · 경매장과 같은 규칙.
 * 부위 사진 → 업체 대표이미지 → 전체 대표이미지 → 개체 사진
 */
export function resolveProductImages(row: ProductWithJoins, groupImages: GroupImageMap): string[] {
  const partImages = (row.cattle_parts?.images ?? []).filter(Boolean);
  if (partImages.length > 0) return partImages;

  const companyId = row.cattle_listings?.company_id ?? null;
  const group = row.part_group;
  const companyImage = companyId ? groupImages.get(groupImageKey(companyId, group)) : undefined;
  const defaultImage = groupImages.get(groupImageKey(null, group));
  const groupImage = companyImage ?? defaultImage;

  const listingImages = (row.cattle_listings?.images ?? []).filter(Boolean);
  if (groupImage) return [groupImage, ...listingImages.slice(0, 3)];
  return listingImages;
}

/**
 * 소비자에게 보여 줄 공판장 이름 · 자료에는 마스터 값 「농협 음성」 이 들어 있다.
 * 경매장(`CattleInfoRows`)과 같은 규칙으로 「공판장」 으로 끝나게 맞춘다 (`농협 음성` → `농협 음성공판장`).
 */
const slaughterHouseLabel = (name: string | null | undefined): string | null =>
  !name || name.endsWith('공판장') ? (name ?? null) : `${name}공판장`;

function toCattleSummary(row: ProductWithJoins): CattleSummary {
  const l = row.cattle_listings;
  return {
    listingNo: l?.listing_no ?? '',
    listingDate: l?.listing_date ?? '',
    grade: l?.grade ?? null,
    marblingScore: l?.marbling_score ?? null,
    gender: l?.gender ?? null,
    monthAge: l?.month_age ?? null,
    traceNo: l?.trace_no ?? null,
    slaughterHouse: slaughterHouseLabel(l?.slaughter_house),
    slaughterDate: l?.slaughter_date ?? null,
    carcassWeight: l?.carcass_weight != null ? toNumber(l.carcass_weight) : null,
    companyName: l?.companies?.name ?? null,
    hasGradeCert: !!l?.gradeCertFileName,
    hasSlaughterCert: !!l?.slaughterCertFileName,
    slaughterNo: l?.slaughter_no ?? null,
    backFat: l?.back_fat ?? null,
    eyeMuscle: l?.eye_muscle ?? null,
    meatColor: l?.meat_color ?? null,
    fatColor: l?.fat_color ?? null,
    texture: l?.texture ?? null,
    maturity: l?.maturity ?? null,
    processDate: l?.process_date ?? null,
    processWeight: l?.process_weight != null ? toNumber(l.process_weight) : null,
  };
}

export function soldSlotNos(row: ProductWithJoins): number[] {
  return (row.group_buy_order_slots ?? []).map((s) => s.slot_no).sort((a, b) => a - b);
}

/**
 * 소비자용 상품 · 경매 관련 필드(bid_price_cap, bid_id, result_price, winning_dealer_id …)는
 * 여기서 걸러진다. draft 는 호출 전에 걸러야 한다.
 */
export function toConsumerProduct(row: ProductWithJoins, groupImages: GroupImageMap): ConsumerProduct {
  const partName = row.cattle_parts?.part_name ?? row.part_group;
  const slotCount = row.slot_count ?? 0;
  const slotPrice = row.slot_price ?? 0;
  const pricePerKg = row.price_per_kg ?? 0;
  const sold = soldSlotNos(row);
  const partWeight = toNumber(row.cattle_parts?.weight);

  return {
    id: row.id,
    partName,
    partGroup: row.part_group,
    side: extractSide(partName),
    partWeight,
    slotCount,
    slotWeight: toNumber(row.slot_weight),
    slotPrice,
    pricePerKg,
    pricePer100g: calcPricePer100g(pricePerKg),
    referenceRetailPrice: row.reference_retail_price,
    savingRate: calcSavingRate(slotPrice, row.reference_retail_price),
    positional: row.positional,
    recruitDeadline: row.recruit_deadline ?? '',
    status: toConsumerStatus(row.status),
    soldSlotNos: sold,
    soldCount: sold.length,
    remainingCount: Math.max(0, slotCount - sold.length),
    zones: buildProductZones(partWeight, pricePerKg, sold, slotCount, partName),
    images: resolveProductImages(row, groupImages),
    cattle: toCattleSummary(row),
    publishedAt: row.published_at,
    description: row.description ?? null,
  };
}

export function toConsumerProductSummary(row: ProductWithJoins, groupImages: GroupImageMap): ConsumerProductSummary {
  const sold = soldSlotNos(row);
  const slotCount = row.slot_count ?? 0;
  return {
    id: row.id,
    partName: row.cattle_parts?.part_name ?? row.part_group,
    partGroup: row.part_group,
    slotPrice: row.slot_price ?? 0,
    slotWeight: toNumber(row.slot_weight),
    remainingCount: Math.max(0, slotCount - sold.length),
    slotCount,
    status: toConsumerStatus(row.status),
    image: resolveProductImages(row, groupImages)[0] ?? null,
    recruitDeadline: row.recruit_deadline ?? '',
  };
}

export function toAdminProduct(
  row: ProductWithJoins,
  groupImages: GroupImageMap,
  orderCount = 0,
): AdminProduct {
  const sold = soldSlotNos(row);
  return {
    id: row.id,
    partId: row.part_id,
    listingId: row.listing_id,
    listingNo: row.cattle_listings?.listing_no ?? '',
    listingDate: row.cattle_listings?.listing_date ?? '',
    partName: row.cattle_parts?.part_name ?? row.part_group,
    partGroup: row.part_group,
    saleMode: row.sale_mode ?? 'slot',
    partWeight: toNumber(row.cattle_parts?.weight),
    minPrice: row.cattle_parts?.min_price ?? null,
    slotCount: row.slot_count,
    slotWeight: row.slot_weight != null ? toNumber(row.slot_weight) : null,
    pricePerKg: row.price_per_kg,
    slotPrice: row.slot_price,
    referenceRetailPrice: row.reference_retail_price,
    positional: row.positional,
    bidPriceCap: row.bid_price_cap,
    recruitDeadline: row.recruit_deadline,
    status: row.status,
    publishedAt: row.published_at,
    bidId: row.bid_id,
    resultPrice: row.result_price,
    cancelledReason: row.cancelled_reason,
    soldCount: sold.length,
    orderCount,
    grade: row.cattle_listings?.grade ?? null,
    slaughterHouse: slaughterHouseLabel(row.cattle_listings?.slaughter_house),
    companyName: row.cattle_listings?.companies?.name ?? null,
    winningDealerId: row.cattle_parts?.winning_dealer_id ?? null,
    image: resolveProductImages(row, groupImages)[0] ?? null,
    description: row.description ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function orderSlotNos(row: OrderWithJoins): number[] {
  return (row.group_buy_order_slots ?? []).map((s) => s.slot_no).sort((a, b) => a - b);
}

export function toAdminOrder(row: OrderWithJoins): AdminOrder {
  return {
    id: row.id,
    orderNo: row.order_no,
    consumerId: row.consumer_id,
    consumerName: row.consumers?.name ?? '',
    consumerPhone: row.consumers?.phone ?? '',
    slotNos: orderSlotNos(row),
    quantity: row.quantity,
    trimAndSlice: row.trim_and_slice ?? false,
    receiveMethod: toReceiveMethod(row.receive_method),
    amount: row.amount,
    status: row.status,
    paidAt: row.paid_at,
    refundedAt: row.refunded_at,
    refundReason: row.refund_reason,
    shipping: (row.shipping ?? {}) as ShippingInfo,
    createdAt: row.created_at,
  };
}

/**
 * 소비자용 주문 · 상품 내부 상태를 소비자 상태로 번역하고 사유 문구를 붙인다.
 * 취소된 주문의 구좌는 이미 삭제되어 있으므로 payload 의 slotNos 를 쓴다.
 */
export function toConsumerOrder(
  row: OrderWithJoins,
  product: ProductWithJoins,
  groupImages: GroupImageMap,
  releasedSlotNos: number[] = [],
): ConsumerOrder {
  const isOrderDead = row.status !== 'paid';
  const status = isOrderDead ? 'cancelled' : toConsumerStatus(product.status);
  const slotNos = orderSlotNos(row);
  const saleMode = product.sale_mode ?? 'slot';
  const slotWeight = toNumber(product.slot_weight);
  const effectiveSlotNos = slotNos.length > 0 ? slotNos : releasedSlotNos;
  // 구좌 모드 중량 · 상·중·하 분할이면 고른 구좌의 실제 중량 합, 아니면 평균 구좌 중량 × 수량
  const slotWeightKg = isZoneSplit(product.slot_count)
    ? sumZones(buildProductZones(toNumber(product.cattle_parts?.weight), product.price_per_kg ?? 0, [], product.slot_count, product.cattle_parts?.part_name), effectiveSlotNos).kg
    : slotWeight * row.quantity;

  return {
    id: row.id,
    orderNo: row.order_no,
    productId: product.id,
    partName: product.cattle_parts?.part_name ?? product.part_group,
    partGroup: product.part_group,
    listingNo: product.cattle_listings?.listing_no ?? '',
    grade: product.cattle_listings?.grade ?? null,
    image: resolveProductImages(product, groupImages)[0] ?? null,
    saleMode,
    slotNos: effectiveSlotNos,
    quantity: row.quantity,
    slotWeight,
    weightKg: saleMode === 'kg' ? toNumber(row.weight_kg) || row.quantity : slotWeightKg,
    pricePerKg: product.price_per_kg ?? 0,
    trimAndSlice: row.trim_and_slice ?? false,
    amount: row.amount,
    positional: saleMode === 'kg' ? false : product.positional,
    status,
    statusLabel: CONSUMER_STATUS_LABELS[status],
    statusMessage: status === 'cancelled' ? consumerCancelMessage(product.status, row.status) : null,
    isRefunded: row.status !== 'paid',
    canCancel: row.status === 'paid' && product.status === 'recruiting' && saleMode === 'slot',
    recruitDeadline: product.recruit_deadline ?? '',
    receiveMethod: toReceiveMethod(row.receive_method),
    store: toStoreSummary(row.group_buy_stores),
    pickupAt: row.pickup_at ?? null,
    shipping: (row.shipping ?? {}) as ShippingInfo,
    paidAt: row.paid_at,
    refundedAt: row.refunded_at,
    giftSetId: row.gift_set_id ?? null,
    createdAt: row.created_at,
  };
}

export function toGroupBuyEvent(row: GroupBuyEventRow): GroupBuyEvent {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    payload: row.payload ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function toPartDefault(row: GroupBuyPartDefaultRow): GroupBuyPartDefault {
  return {
    partGroup: row.part_group,
    slotCount: row.slot_count,
    pricePerKg: row.price_per_kg,
    referenceRetailPricePerKg: row.reference_retail_price_per_kg,
    bidPriceCap: row.bid_price_cap,
    positional: row.positional,
  };
}

export { toPartGroupName };
