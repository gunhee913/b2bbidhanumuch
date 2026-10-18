/**
 * 선물세트 물량 · 벌크 구좌와 1kg 구매를 섞어 남는 중량이 가장 적게 맞춘다.
 * 구좌는 통째로만 사고, 1kg 구매는 정수 kg 만 산다.
 */

import type { ProductZone } from './slots';
import { auctionPartGroupOf, gradeKeyLabel } from './pools';
import { roundKg } from './gift';

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
}

export interface GiftSupplyLine {
  kind: 'bulk' | 'kg';
  label: string;
  kg: number;
  amount: number;
  slotNo?: number;
  poolId?: string;
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
  const availableKg = roundKg(availableBulk + maxOffer);

  let best: GiftSupplyPlan | null = null;

  const consider = (chosen: ProductZone[], offer: GiftKgOffer | null, kg: number) => {
    const bulkKg = roundKg(chosen.reduce((acc, zone) => acc + zone.kg, 0));
    const usedKg = roundKg(bulkKg + kg);
    if (usedKg + 0.001 < need) return;
    const bulkAmount = chosen.reduce((acc, zone) => acc + zone.price, 0);
    const kgAmount = offer ? offer.pricePerKg * kg : 0;
    const plan: GiftSupplyPlan = {
      ok: true,
      slotNos: chosen.map((zone) => zone.slotNo),
      lines: [
        ...chosen.map((zone) => ({ kind: 'bulk' as const, label: `벌크 · ${zone.label}`, kg: zone.kg, amount: zone.price, slotNo: zone.slotNo })),
        ...(offer && kg > 0 ? [{ kind: 'kg' as const, label: `1kg 구매 · ${offer.label}`, kg, amount: kgAmount, poolId: offer.id }] : []),
      ],
      bulkKg,
      kg,
      poolId: offer && kg > 0 ? offer.id : null,
      poolLabel: offer && kg > 0 ? offer.label : null,
      usedKg,
      leftoverKg: roundKg(usedKg - need),
      amount: bulkAmount + kgAmount,
    };
    if (!best || isBetter(plan, best)) best = plan;
  };

  const masks = 1 << open.length;
  for (let mask = 0; mask < masks; mask += 1) {
    const chosen = open.filter((_, index) => (mask & (1 << index)) !== 0);
    if (options?.requireZone && chosen.length === 0) continue;
    const bulkKg = roundKg(chosen.reduce((acc, zone) => acc + zone.kg, 0));
    if (bulkKg >= need) {
      consider(chosen, null, 0);
      continue;
    }
    const gap = roundKg(need - bulkKg);
    for (const offer of offers) {
      let kg = Math.ceil(gap - 1e-9);
      if (kg < offer.minKg) kg = offer.minKg;
      if (kg > offer.maxKg || kg < 1) continue;
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
