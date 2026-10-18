/**
 * 선물세트 자동 담기 · 칸의 부위×등급과 세트 수량으로 벌크를 고른다.
 * 같은 조건 칸은 한 상품에 모아, 남는 양이 적고 금액이 낮은 구좌를 쓴다.
 */

import type { ConsumerProduct } from '../types';
import { GIFT_CELL_KG, roundKg, type GiftCellPick } from './gift';
import { gradeKeyLabel, gradeKeyOf } from './pools';
import { offersForSpec, planGiftSupply, type GiftPoolSource, type GiftSupplyLine } from './giftSupply';

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
});

/** 칸 조건을 묶어 벌크 구좌와 1kg 구매를 섞어 고른다 · 고른 안이 부족하면 부족량을 남긴다 */
export function resolveAutoGiftCells(
  specs: Array<GiftCellSpec | null>,
  products: ConsumerProduct[],
  quantity: number,
  overrides: Record<string, string> = {},
  pools: GiftPoolSource[] = [],
) {
  const groups = new Map<string, { spec: GiftCellSpec; indexes: number[] }>();
  specs.forEach((spec, index) => {
    if (!spec) return;
    const key = specKeyOf(spec);
    const group = groups.get(key) ?? { spec, indexes: [] };
    groups.set(key, { spec: group.spec, indexes: [...group.indexes, index] });
  });

  const cells: Array<GiftCellPick | null> = specs.map(() => null);
  const taken = new Set<string>();
  const planned: GiftAutoGroup[] = [];

  for (const { spec, indexes } of groups.values()) {
    const cellNos = indexes.map((index) => index + 1);
    const needKg = roundKg(GIFT_CELL_KG * Math.max(1, quantity) * indexes.length);
    const offers = offersForSpec(pools, spec);
    const override = overrides[specKeyOf(spec)];
    const poolOnlyId = override?.startsWith('pool:') ? override.slice(5) : null;
    const candidates = products.filter((product) => productMatchesSpec(product, spec) && !taken.has(product.id));
    const forced = poolOnlyId ? undefined : candidates.find((product) => product.id === override);

    const ranked = (poolOnlyId ? [] : forced ? [forced] : candidates)
      .map((product) => ({ product, plan: planGiftSupply(product.zones, needKg, offers, { requireZone: true }) }))
      .filter((row): row is { product: ConsumerProduct; plan: Extract<typeof row.plan, { ok: true }> } => row.plan.ok);
    const kgOffers = poolOnlyId ? offers.filter((offer) => offer.id === poolOnlyId) : forced ? [] : offers;
    const kgPlan = kgOffers.length > 0 ? planGiftSupply([], needKg, kgOffers) : null;
    const kgOk = kgPlan && kgPlan.ok ? kgPlan : null;

    ranked.sort((a, b) => a.plan.leftoverKg - b.plan.leftoverKg || a.plan.amount - b.plan.amount || a.product.id.localeCompare(b.product.id));
    const bestBulk = ranked[0];
    const useKgOnly = !!kgOk && (!bestBulk || kgOk.leftoverKg < bestBulk.plan.leftoverKg || (kgOk.leftoverKg === bestBulk.plan.leftoverKg && kgOk.amount < bestBulk.plan.amount));

    if (useKgOnly && kgOk) {
      for (const index of indexes) cells[index] = { cellNo: index + 1, productId: null, poolId: kgOk.poolId };
      planned.push({
        spec,
        cellNos,
        needKg,
        product: null,
        poolId: kgOk.poolId,
        poolLabel: kgOk.poolLabel,
        lines: kgOk.lines,
        bulkKg: kgOk.bulkKg,
        kg: kgOk.kg,
        leftoverKg: kgOk.leftoverKg,
        usedKg: kgOk.usedKg,
        availableKg: kgOk.usedKg,
        shortKg: 0,
        amount: kgOk.amount,
        error: null,
      });
      continue;
    }

    const product = bestBulk?.product ?? forced ?? [...candidates].sort((a, b) => availableKgOf(b) - availableKgOf(a) || a.id.localeCompare(b.id))[0];
    if (!product || !bestBulk) {
      const failed = product ? planGiftSupply(product.zones, needKg, offers, { requireZone: true }) : null;
      const availableKg = failed && failed.ok === false ? failed.availableKg : 0;
      const shortKg = failed && failed.ok === false ? failed.shortKg : needKg;
      if (product) {
        taken.add(product.id);
        for (const index of indexes) cells[index] = { cellNo: index + 1, productId: product.id, poolId: null };
      }
      planned.push({
        ...emptyGroup(spec, cellNos, needKg, failed && failed.ok === false ? failed.error : `이 부위·등급으로 ${needKg.toFixed(1)}kg 을 채울 상품이 없어요.`, availableKg),
        product: product ?? null,
        shortKg,
      });
      continue;
    }

    taken.add(product.id);
    for (const index of indexes) cells[index] = { cellNo: index + 1, productId: product.id, poolId: bestBulk.plan.poolId };
    planned.push({
      spec,
      cellNos,
      needKg,
      product,
      poolId: bestBulk.plan.poolId,
      poolLabel: bestBulk.plan.poolLabel,
      lines: bestBulk.plan.lines,
      bulkKg: bestBulk.plan.bulkKg,
      kg: bestBulk.plan.kg,
      leftoverKg: bestBulk.plan.leftoverKg,
      usedKg: bestBulk.plan.usedKg,
      availableKg: availableKgOf(product),
      shortKg: 0,
      amount: bestBulk.plan.amount,
      error: null,
    });
  }

  return { cells, groups: planned };
}
