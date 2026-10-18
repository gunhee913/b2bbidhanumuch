/**
 * 선물세트 물량 · 벌크 구좌와 1kg 구매를 섞어 남는 중량이 가장 적게 맞춘다.
 * 구좌는 통째로만 사고, 1kg 구매는 정수 kg 만 산다.
 */

import type { ProductZone } from './slots';
import { auctionPartGroupOf, gradeKeyLabel } from './pools';
import { GIFT_TRIM_LOSS_RATE, giftUsableKg, roundKg } from './gift';

const coversNeed = (rawKg: number, need: number) => giftUsableKg(rawKg) + 0.001 >= need;

/** 벌크 구매 중량에 1kg를 더해 근막 제거 10%를 빼도 필요 중량을 덮는 최소 개수 */
const extraKg = (bulkRaw: number, need: number) => {
  if (coversNeed(bulkRaw, need)) return 0;
  const rate = 1 - GIFT_TRIM_LOSS_RATE;
  let kg = Math.max(1, Math.ceil((need - giftUsableKg(bulkRaw)) / rate - 1e-9));
  while (kg < 99 && !coversNeed(bulkRaw + kg, need)) kg += 1;
  return kg;
};

const weighed = (rawKg: number, need: number) => {
  const usedKg = giftUsableKg(rawKg);
  return { usedKg, leftoverKg: roundKg(Math.max(0, usedKg - need)) };
};

export interface GiftKgOffer {
  id: string;
  label: string;
  pricePerKg: number;
  minKg: number;
  maxKg: number;
}

export interface GiftPoolSource {
  id: string;
  partGroup: string;
  gradeKey: string;
  gradeLabel: string;
  pricePerKg: number;
  minKg: number;
  maxKg: number;
  status: 'open' | 'paused';
  image?: string | null;
}

export interface GiftSupplyLine {
  kind: 'bulk' | 'kg';
  label: string;
  kg: number;
  /** 이 줄의 kg당 단가 */
  pricePerKg: number;
  amount: number;
  slotNo?: number;
  poolId?: string;
  productId?: string;
}

export interface GiftSupplyPlan {
  ok: true;
  slotNos: number[];
  lines: GiftSupplyLine[];
  bulkKg: number;
  kg: number;
  poolId: string | null;
  poolLabel: string | null;
  usedKg: number;
  leftoverKg: number;
  amount: number;
}

export type GiftSupplyResult =
  | GiftSupplyPlan
  | { ok: false; shortKg: number; availableKg: number; error: string };

/** 부위·등급에 맞는 1kg 풀 · 윗등심/아랫등심은 등심 칸에 쓴다 */
export function offersForSpec(pools: GiftPoolSource[], spec: { partGroup: string; gradeKey: string }): GiftKgOffer[] {
  return pools
    .filter(
      (pool) =>
        pool.status === 'open' &&
        pool.gradeKey === spec.gradeKey &&
        (pool.partGroup === spec.partGroup || auctionPartGroupOf(pool.partGroup) === spec.partGroup),
    )
    .map((pool) => ({
      id: pool.id,
      label: `${pool.partGroup} ${pool.gradeLabel || gradeKeyLabel(pool.gradeKey)}`,
      pricePerKg: pool.pricePerKg,
      minKg: pool.minKg,
      maxKg: pool.maxKg,
    }));
}

const isBetter = (next: GiftSupplyPlan, prev: GiftSupplyPlan) => {
  if (next.leftoverKg !== prev.leftoverKg) return next.leftoverKg < prev.leftoverKg;
  if (next.amount !== prev.amount) return next.amount < prev.amount;
  if (next.slotNos.length !== prev.slotNos.length) return next.slotNos.length < prev.slotNos.length;
  return next.kg < prev.kg;
};

/**
 * 필요 중량을 덮는 구좌 조합 + 정수 kg 중에서 남음이 가장 적고, 같으면 금액이 낮은 안을 고른다.
 * 구좌가 4개 이하므로 조합을 전부 본다.
 */
export function planGiftSupply(
  zones: ProductZone[],
  needKg: number,
  offers: GiftKgOffer[],
  options?: { requireZone?: boolean },
): GiftSupplyResult {
  const need = roundKg(needKg);
  const open = zones.filter((zone) => !zone.sold).sort((a, b) => a.pricePerKg - b.pricePerKg || a.slotNo - b.slotNo);
  const availableBulk = roundKg(open.reduce((acc, zone) => acc + zone.kg, 0));
  const maxOffer = offers.reduce((max, offer) => Math.max(max, offer.maxKg), 0);
  const availableKg = giftUsableKg(availableBulk + maxOffer);

  let best: GiftSupplyPlan | null = null;

  const consider = (chosen: ProductZone[], offer: GiftKgOffer | null, kg: number) => {
    const bulkKg = roundKg(chosen.reduce((acc, zone) => acc + zone.kg, 0));
    const rawKg = roundKg(bulkKg + kg);
    if (!coversNeed(rawKg, need)) return;
    const { usedKg, leftoverKg } = weighed(rawKg, need);
    const bulkAmount = chosen.reduce((acc, zone) => acc + zone.price, 0);
    const kgAmount = offer ? offer.pricePerKg * kg : 0;
    const plan: GiftSupplyPlan = {
      ok: true,
      slotNos: chosen.map((zone) => zone.slotNo),
      lines: [
        ...chosen.map((zone) => ({ kind: 'bulk' as const, label: `벌크 · ${zone.label}`, kg: zone.kg, pricePerKg: zone.pricePerKg, amount: zone.price, slotNo: zone.slotNo })),
        ...(offer && kg > 0 ? [{ kind: 'kg' as const, label: `1kg 구매 · ${offer.label}`, kg, pricePerKg: offer.pricePerKg, amount: kgAmount, poolId: offer.id }] : []),
      ],
      bulkKg,
      kg,
      poolId: offer && kg > 0 ? offer.id : null,
      poolLabel: offer && kg > 0 ? offer.label : null,
      usedKg,
      leftoverKg,
      amount: bulkAmount + kgAmount,
    };
    if (!best || isBetter(plan, best)) best = plan;
  };

  const masks = 1 << open.length;
  for (let mask = 0; mask < masks; mask += 1) {
    const chosen = open.filter((_, index) => (mask & (1 << index)) !== 0);
    if (options?.requireZone && chosen.length === 0) continue;
    const bulkKg = roundKg(chosen.reduce((acc, zone) => acc + zone.kg, 0));
    if (coversNeed(bulkKg, need)) {
      consider(chosen, null, 0);
      continue;
    }
    for (const offer of offers) {
      let kg = extraKg(bulkKg, need);
      if (kg < offer.minKg) kg = offer.minKg;
      if (kg > offer.maxKg || kg < 1 || !coversNeed(bulkKg + kg, need)) continue;
      consider(chosen, offer, kg);
    }
  }

  if (best) return best;
  const shortKg = roundKg(Math.max(0, need - availableKg));
  return {
    ok: false,
    shortKg,
    availableKg,
    error: `${shortKg.toFixed(1)}kg 부족 · 살 수 있는 양 ${availableKg.toFixed(1)}kg`,
  };
}

interface TaggedZone extends ProductZone {
  productId: string;
  partName: string;
}

const planFromZones = (chosen: TaggedZone[], offer: GiftKgOffer | null, kg: number, need: number): GiftSupplyPlan => {
  const bulkKg = roundKg(chosen.reduce((acc, zone) => acc + zone.kg, 0));
  const { usedKg, leftoverKg } = weighed(roundKg(bulkKg + kg), need);
  const bulkAmount = chosen.reduce((acc, zone) => acc + zone.price, 0);
  const kgAmount = offer ? offer.pricePerKg * kg : 0;
  return {
    ok: true,
    slotNos: chosen.map((zone) => zone.slotNo),
    lines: [
      ...chosen.map((zone) => ({
        kind: 'bulk' as const,
        label: `벌크 · ${zone.partName} ${zone.label}`,
        kg: zone.kg,
        pricePerKg: zone.pricePerKg,
        amount: zone.price,
        slotNo: zone.slotNo,
        productId: zone.productId,
      })),
      ...(offer && kg > 0 ? [{ kind: 'kg' as const, label: `1kg 구매 · ${offer.label}`, kg, pricePerKg: offer.pricePerKg, amount: kgAmount, poolId: offer.id }] : []),
    ],
    bulkKg,
    kg,
    poolId: offer && kg > 0 ? offer.id : null,
    poolLabel: offer && kg > 0 ? offer.label : null,
    usedKg,
    leftoverKg,
    amount: bulkAmount + kgAmount,
  };
};

const considerZones = (best: GiftSupplyPlan | null, chosen: TaggedZone[], offer: GiftKgOffer | null, kg: number, need: number) => {
  const plan = planFromZones(chosen, offer, kg, need);
  return !best || isBetter(plan, best) ? plan : best;
};

/** 구좌 조합을 전부 본다. 구좌가 많으면 싼 쪽부터 필요량을 덮은 뒤 빼도 되는 구좌를 뺀다 */
const searchZones = (open: TaggedZone[], need: number, offers: GiftKgOffer[], requireZone: boolean): GiftSupplyPlan | null => {
  if (open.length > 14) return null;
  let best: GiftSupplyPlan | null = null;
  const masks = 1 << open.length;
  for (let mask = 0; mask < masks; mask += 1) {
    const chosen = open.filter((_, index) => (mask & (1 << index)) !== 0);
    if (requireZone && chosen.length === 0) continue;
    const bulkKg = roundKg(chosen.reduce((acc, zone) => acc + zone.kg, 0));
    if (coversNeed(bulkKg, need)) {
      best = considerZones(best, chosen, null, 0, need);
      continue;
    }
    for (const offer of offers) {
      let kg = extraKg(bulkKg, need);
      if (kg < offer.minKg) kg = offer.minKg;
      if (kg > offer.maxKg || kg < 1 || !coversNeed(bulkKg + kg, need)) continue;
      best = considerZones(best, chosen, offer, kg, need);
    }
  }
  return best;
};

const greedyZones = (open: TaggedZone[], need: number, offers: GiftKgOffer[]): GiftSupplyPlan | null => {
  const sorted = [...open].sort((a, b) => a.pricePerKg - b.pricePerKg || a.kg - b.kg || a.slotNo - b.slotNo);
  const chosen: TaggedZone[] = [];
  let sum = 0;
  for (const zone of sorted) {
    if (coversNeed(sum, need)) break;
    chosen.push(zone);
    sum = roundKg(sum + zone.kg);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = chosen.length - 1; index >= 0; index -= 1) {
      const restKg = roundKg(sum - chosen[index].kg);
      if (!coversNeed(restKg, need)) continue;
      chosen.splice(index, 1);
      sum = restKg;
      changed = true;
      break;
    }
  }
  if (coversNeed(sum, need)) return planFromZones(chosen, null, 0, need);
  const offer = [...offers].sort((a, b) => a.pricePerKg - b.pricePerKg)[0];
  if (!offer) return null;
  let kg = extraKg(sum, need);
  if (kg < offer.minKg) kg = offer.minKg;
  if (kg > offer.maxKg || kg < 1 || !coversNeed(sum + kg, need)) return null;
  return planFromZones(chosen, offer, kg, need);
};

/**
 * 같은 부위·등급의 벌크를 여러 상품에서 모아 필요 중량을 채운다.
 * 한 상품으로 되면 그 상품만 쓰고, 부족하면 다른 상품 구좌를 더한다.
 */
export function planGiftProducts(
  products: { id: string; partName: string; zones: ProductZone[] }[],
  needKg: number,
  offers: GiftKgOffer[],
  options?: { requireZone?: boolean },
): GiftSupplyResult {
  const need = roundKg(needKg);
  const open = products.flatMap((product) =>
    product.zones.filter((zone) => !zone.sold).map((zone) => ({ ...zone, productId: product.id, partName: product.partName })),
  );
  const availableBulk = roundKg(open.reduce((acc, zone) => acc + zone.kg, 0));
  const maxOffer = offers.reduce((max, offer) => Math.max(max, offer.maxKg), 0);
  const availableKg = giftUsableKg(availableBulk + maxOffer);
  const requireZone = options?.requireZone === true;
  const searchable = open.length <= 14 ? open : [...open].sort((a, b) => a.pricePerKg - b.pricePerKg || a.kg - b.kg).slice(0, 14);
  const best = searchZones(searchable, need, offers, requireZone) ?? (open.length > 14 ? greedyZones(open, need, offers) : null);
  if (best) return best;
  const shortKg = roundKg(Math.max(0, need - availableKg));
  return {
    ok: false,
    shortKg,
    availableKg,
    error: `${shortKg.toFixed(1)}kg 부족 · 살 수 있는 양 ${availableKg.toFixed(1)}kg`,
  };
}

/** 고른 벌크는 그대로 두고 1kg 개수만 바꾼다 */
export function applyFixedKg(plan: GiftSupplyPlan, kg: number, offers: GiftKgOffer[], needKg: number): GiftSupplyPlan {
  const offer =
    (plan.poolId ? offers.find((item) => item.id === plan.poolId) : undefined) ??
    [...offers].sort((a, b) => a.pricePerKg - b.pricePerKg)[0];
  const nextKg = offer ? Math.min(Math.max(0, Math.floor(kg)), offer.maxKg) : 0;
  const bulkLines = plan.lines.filter((line) => line.kind === 'bulk');
  const bulkAmount = bulkLines.reduce((acc, line) => acc + line.amount, 0);
  const kgAmount = offer && nextKg > 0 ? offer.pricePerKg * nextKg : 0;
  const { usedKg, leftoverKg } = weighed(roundKg(plan.bulkKg + nextKg), roundKg(needKg));
  return {
    ok: true,
    slotNos: plan.slotNos,
    lines: [
      ...bulkLines,
      ...(offer && nextKg > 0
        ? [{ kind: 'kg' as const, label: `1kg 구매 · ${offer.label}`, kg: nextKg, pricePerKg: offer.pricePerKg, amount: kgAmount, poolId: offer.id }]
        : []),
    ],
    bulkKg: plan.bulkKg,
    kg: nextKg,
    poolId: offer ? offer.id : null,
    poolLabel: offer ? offer.label : null,
    usedKg,
    leftoverKg,
    amount: bulkAmount + kgAmount,
  };
}

/** 직접 고른 구좌와 1kg 개수로 구성한다. 1kg 는 0이어도 된다 */
export function planPickedZones(
  items: { productId: string; title: string; zones: ProductZone[] }[],
  needKg: number,
  offers: GiftKgOffer[],
  kg: number,
): GiftSupplyPlan {
  const lines: GiftSupplyLine[] = items.flatMap((item) =>
    item.zones
      .filter((zone) => !zone.sold)
      .map((zone) => ({
        kind: 'bulk' as const,
        label: `벌크 · ${item.title} ${zone.label}`,
        kg: zone.kg,
        pricePerKg: zone.pricePerKg,
        amount: zone.price,
        slotNo: zone.slotNo,
        productId: item.productId,
      })),
  );
  const bulkKg = roundKg(lines.reduce((acc, line) => acc + line.kg, 0));
  const bulkAmount = lines.reduce((acc, line) => acc + line.amount, 0);
  const offer = [...offers].sort((a, b) => a.pricePerKg - b.pricePerKg)[0];
  const nextKg = offer ? Math.min(Math.max(0, Math.floor(kg)), offer.maxKg) : 0;
  const kgAmount = offer && nextKg > 0 ? offer.pricePerKg * nextKg : 0;
  const { usedKg, leftoverKg } = weighed(roundKg(bulkKg + nextKg), roundKg(needKg));
  return {
    ok: true,
    slotNos: lines.flatMap((line) => (line.slotNo == null ? [] : [line.slotNo])),
    lines: [
      ...lines,
      ...(offer && nextKg > 0 ? [{ kind: 'kg' as const, label: `1kg 구매 · ${offer.label}`, kg: nextKg, pricePerKg: offer.pricePerKg, amount: kgAmount, poolId: offer.id }] : []),
    ],
    bulkKg,
    kg: nextKg,
    poolId: offer ? offer.id : null,
    poolLabel: offer ? offer.label : null,
    usedKg,
    leftoverKg,
    amount: bulkAmount + kgAmount,
  };
}
