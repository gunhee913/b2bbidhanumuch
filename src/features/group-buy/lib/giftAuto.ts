/**
 * 선물세트 자동 담기 · 칸의 부위×등급과 세트 수량으로 벌크를 고른다.
 * 한 상품으로 필요 중량이 안 되면 같은 부위·등급의 다른 벌크를 더 담는다.
 */

import type { ConsumerProduct } from '../types';
import { GIFT_CELL_KG, roundKg, type GiftCellPick } from './gift';
import { gradeKeyLabel, gradeKeyOf } from './pools';
import { applyFixedKg, offersForSpec, planGiftProducts, planGiftSupply, planPickedZones, type GiftKgOffer, type GiftPoolSource, type GiftSupplyLine, type GiftSupplyPlan } from './giftSupply';

export type GiftFillMode = 'auto' | 'manual';

export const GIFT_FILL_MODE_LABEL: Record<GiftFillMode, string> = {
  auto: '상품 자동선택',
  manual: '상품 직접선택',
};

export interface GiftCellSpec {
  partGroup: string;
  gradeKey: string;
}

export interface GiftCellDraft {
  partGroup: string;
  gradeKey: string;
}

export const emptyDrafts = (cellCount: number): GiftCellDraft[] => Array.from({ length: cellCount }, () => ({ partGroup: '', gradeKey: '' }));

export const specFromDraft = (draft: GiftCellDraft): GiftCellSpec | null =>
  draft.partGroup && draft.gradeKey ? { partGroup: draft.partGroup, gradeKey: draft.gradeKey } : null;

export const specKeyOf = (spec: GiftCellSpec) => `${spec.partGroup}::${spec.gradeKey}`;

export interface GiftBulkPick {
  productId: string;
  slotNos: number[];
}

export const specLabelOf = (spec: GiftCellSpec) => `${spec.partGroup} ${gradeKeyLabel(spec.gradeKey)}`;

export const productMatchesSpec = (product: ConsumerProduct, spec: GiftCellSpec) =>
  product.partGroup === spec.partGroup && gradeKeyOf(product.cattle.grade, product.cattle.marblingScore) === spec.gradeKey;

export function emptySpecs(cellCount: number): Array<GiftCellSpec | null> {
  return Array.from({ length: cellCount }, () => null);
}

export interface GiftAutoGroup {
  spec: GiftCellSpec;
  cellNos: number[];
  needKg: number;
  product: ConsumerProduct | null;
  poolId: string | null;
  poolLabel: string | null;
  lines: GiftSupplyLine[];
  bulkKg: number;
  kg: number;
  leftoverKg: number;
  usedKg: number;
  availableKg: number;
  shortKg: number;
  amount: number;
  error: string | null;
  /** 1kg를 더하거나 줄일 수 있는 상한 */
  kgMax: number;
  kgLabel: string | null;
  kgImage: string | null;
  kgPrice: number;
  bulks: GiftBulkPick[];
}

const availableKgOf = (product: ConsumerProduct) => roundKg(product.zones.filter((zone) => !zone.sold).reduce((acc, zone) => acc + zone.kg, 0));

const emptyGroup = (spec: GiftCellSpec, cellNos: number[], needKg: number, error: string, availableKg = 0): GiftAutoGroup => ({
  spec,
  cellNos,
  needKg,
  product: null,
  poolId: null,
  poolLabel: null,
  lines: [],
  bulkKg: 0,
  kg: 0,
  leftoverKg: 0,
  usedKg: 0,
  availableKg,
  shortKg: needKg,
  amount: 0,
  error,
  kgMax: 0,
  kgLabel: null,
  kgImage: null,
  kgPrice: 0,
  bulks: [],
});

const cheapestOffer = (offers: GiftKgOffer[]) => [...offers].sort((a, b) => a.pricePerKg - b.pricePerKg)[0];

const settledGroup = (
  spec: GiftCellSpec,
  cellNos: number[],
  needKg: number,
  product: ConsumerProduct | null,
  plan: GiftSupplyPlan,
  availableKg: number,
  offers: GiftKgOffer[],
  pools: GiftPoolSource[],
): GiftAutoGroup => {
  const offer = (plan.poolId ? offers.find((item) => item.id === plan.poolId) : undefined) ?? cheapestOffer(offers);
  const pool = offer ? pools.find((item) => item.id === offer.id) : undefined;
  const shortKg = roundKg(Math.max(0, needKg - plan.usedKg));
  return {
    spec,
    cellNos,
    needKg,
    product,
    poolId: plan.poolId,
    poolLabel: plan.poolLabel,
    lines: plan.lines,
    bulkKg: plan.bulkKg,
    kg: plan.kg,
    leftoverKg: plan.leftoverKg,
    usedKg: plan.usedKg,
    availableKg,
    shortKg,
    amount: plan.amount,
    error: shortKg > 0 ? `${shortKg.toFixed(1)}kg 부족` : null,
    kgMax: offer?.maxKg ?? 0,
    kgLabel: offer?.label ?? plan.poolLabel,
    kgImage: pool?.image ?? null,
    kgPrice: offer?.pricePerKg ?? 0,
    bulks: bulksFromLines(plan.lines),
  };
};

const bulksFromLines = (lines: GiftSupplyLine[]): GiftBulkPick[] => {
  const buckets = new Map<string, number[]>();
  for (const line of lines) {
    if (line.kind !== 'bulk' || !line.productId || line.slotNo == null) continue;
    buckets.set(line.productId, [...(buckets.get(line.productId) ?? []), line.slotNo]);
  }
  return Array.from(buckets, ([productId, slotNos]) => ({ productId, slotNos }));
};

/** 칸 조건을 묶어 벌크 구좌와 1kg 구매를 섞어 고른다 · 한 상품으로 부족하면 같은 등급 벌크를 더 담는다 */
export function resolveAutoGiftCells(
  specs: Array<GiftCellSpec | null>,
  products: ConsumerProduct[],
  quantity: number,
  overrides: Record<string, string> = {},
  pools: GiftPoolSource[] = [],
  kgOverrides: Record<string, number> = {},
  bulkPicks: Record<string, GiftBulkPick[]> = {},
) {
  const groups = new Map<string, { spec: GiftCellSpec; indexes: number[] }>();
  specs.forEach((spec, index) => {
    if (!spec) return;
    const key = specKeyOf(spec);
    const group = groups.get(key) ?? { spec, indexes: [] };
    groups.set(key, { spec: group.spec, indexes: [...group.indexes, index] });
  });

  const cells: Array<GiftCellPick | null> = specs.map(() => null);
  const taken = new Set<string>(Object.values(bulkPicks).flatMap((picks) => picks.map((pick) => pick.productId)));
  const planned: GiftAutoGroup[] = [];

  for (const { spec, indexes } of groups.values()) {
    const cellNos = indexes.map((index) => index + 1);
    const needKg = roundKg(GIFT_CELL_KG * Math.max(1, quantity) * indexes.length);
    const offers = offersForSpec(pools, spec);
    const specKey = specKeyOf(spec);
    const fixedKg = kgOverrides[specKey];
    const manual = bulkPicks[specKey];
    if (manual) {
      const items = manual.flatMap((pick) => {
        const product = products.find((item) => item.id === pick.productId && productMatchesSpec(item, spec));
        if (!product) return [];
        const zones = product.zones.filter((zone) => pick.slotNos.includes(zone.slotNo) && !zone.sold);
        return zones.length > 0 ? [{ productId: product.id, title: product.partName, zones }] : [];
      });
      const plan = planPickedZones(items, needKg, offers, typeof fixedKg === 'number' ? fixedKg : 0);
      const primary = items[0]?.productId ?? null;
      for (const index of indexes) cells[index] = { cellNo: index + 1, productId: primary, poolId: plan.kg > 0 ? plan.poolId : null, kg: plan.kg };
      const product = primary ? products.find((item) => item.id === primary) ?? null : null;
      planned.push(settledGroup(spec, cellNos, needKg, product, plan, product ? availableKgOf(product) : plan.usedKg, offers, pools));
      continue;
    }
    const override = overrides[specKey];
    const poolOnlyId = override?.startsWith('pool:') ? override.slice(5) : null;
    const candidates = products.filter((product) => productMatchesSpec(product, spec) && !taken.has(product.id));

    const sources = (poolOnlyId ? [] : candidates).map((product) => ({ id: product.id, partName: product.partName, zones: product.zones }));
    const across = sources.length > 0 ? planGiftProducts(sources, needKg, offers, { requireZone: true }) : null;
    const bulkOk = across && across.ok === true ? across : null;
    const kgOffers = poolOnlyId ? offers.filter((offer) => offer.id === poolOnlyId) : offers;
    const kgPlan = kgOffers.length > 0 ? planGiftSupply([], needKg, kgOffers) : null;
    const kgOk = kgPlan && kgPlan.ok ? kgPlan : null;
    const useKgOnly = !!kgOk && (!bulkOk || kgOk.leftoverKg < bulkOk.leftoverKg || (kgOk.leftoverKg === bulkOk.leftoverKg && kgOk.amount < bulkOk.amount));

    if (useKgOnly && kgOk) {
      const plan = typeof fixedKg === 'number' ? applyFixedKg(kgOk, fixedKg, offers, needKg) : kgOk;
      for (const index of indexes) cells[index] = { cellNo: index + 1, productId: null, poolId: plan.poolId, kg: plan.kg };
      planned.push(settledGroup(spec, cellNos, needKg, null, plan, plan.usedKg, offers, pools));
      continue;
    }

    if (!bulkOk) {
      const availableKg = across && across.ok === false ? across.availableKg : 0;
      const shortKg = across && across.ok === false ? across.shortKg : needKg;
      const product = [...candidates].sort((a, b) => availableKgOf(b) - availableKgOf(a) || a.id.localeCompare(b.id))[0] ?? null;
      if (product) {
        taken.add(product.id);
        for (const index of indexes) cells[index] = { cellNo: index + 1, productId: product.id, poolId: null, kg: 0 };
      }
      planned.push({
        ...emptyGroup(spec, cellNos, needKg, across && across.ok === false ? across.error : `이 부위·등급으로 ${needKg.toFixed(1)}kg 을 채울 상품이 없어요.`, availableKg),
        product,
        shortKg,
      });
      continue;
    }

    const plan = typeof fixedKg === 'number' ? applyFixedKg(bulkOk, fixedKg, offers, needKg) : bulkOk;
    const primaryId = plan.lines.find((line) => line.kind === 'bulk' && line.productId)?.productId ?? null;
    const product = primaryId ? candidates.find((item) => item.id === primaryId) ?? null : null;
    for (const line of plan.lines) {
      if (line.productId) taken.add(line.productId);
    }
    for (const index of indexes) cells[index] = { cellNo: index + 1, productId: primaryId, poolId: plan.kg > 0 ? plan.poolId : null, kg: plan.kg };
    const openKg = roundKg(candidates.reduce((acc, item) => acc + availableKgOf(item), 0));
    planned.push(settledGroup(spec, cellNos, needKg, product, plan, openKg, offers, pools));
  }

  return { cells, groups: planned };
}
