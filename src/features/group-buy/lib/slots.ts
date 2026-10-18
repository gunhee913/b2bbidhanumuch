/**
 * 구좌 계산 · 서버(상품 설정 저장)와 클라이언트(관리자 미리보기·소비자 가격 표시)가 같은 식을 쓴다.
 */

import { extractSide, toPartGroupName } from '@/features/live-auction/lib/partGrouping';
import { optionFeeOf } from './pools';

const PRICE_ROUND_UNIT = 10;

/** 구좌 중량(kg) = 부위 중량 / 분할 수 · 소수 셋째 자리 */
export function calcSlotWeight(partWeight: number, slotCount: number): number {
  if (!slotCount || slotCount <= 0) return 0;
  return Math.round((partWeight / slotCount) * 1000) / 1000;
}

/** 구좌가(원) = kg당 단가 × 구좌 중량 · 10원 단위 올림 */
export function calcSlotPrice(pricePerKg: number, slotWeight: number): number {
  const raw = pricePerKg * slotWeight;
  return Math.ceil(raw / PRICE_ROUND_UNIT) * PRICE_ROUND_UNIT;
}

/**
 * 소비자 kg당 판매 단가 · 공판장 최저단가 + 20%, 백원 단위에서 반올림(천원 단위).
 * 최저단가가 없으면 null — 호출부가 부위군 기본 단가로 대신한다.
 */
export const CONSUMER_MARKUP_RATE = 1.2;
const CONSUMER_PRICE_UNIT = 1000;
export function consumerPricePerKg(minPricePerKg: number | null | undefined): number | null {
  if (!minPricePerKg || minPricePerKg <= 0) return null;
  return Math.round((minPricePerKg * CONSUMER_MARKUP_RATE) / CONSUMER_PRICE_UNIT) * CONSUMER_PRICE_UNIT;
}

/** 100g 당 가격 · 소비자에게 익숙한 단위 */
export function calcPricePer100g(pricePerKg: number): number {
  return Math.round(pricePerKg / 10);
}

/** 참고 소매가 대비 절약률(%) · 참고가가 없거나 더 싸면 null */
export function calcSavingRate(slotPrice: number, referenceRetailPrice: number | null): number | null {
  if (!referenceRetailPrice || referenceRetailPrice <= slotPrice) return null;
  return Math.round(((referenceRetailPrice - slotPrice) / referenceRetailPrice) * 100);
}

export type SlotZoneKey = 'top' | 'upperMiddle' | 'middle' | 'lowerMiddle' | 'bottom' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom';

export interface SlotZone {
  key: SlotZoneKey;
  label: string;
  description: string;
  slotNos: number[];
}

/**
 * 위치별 메타 · `priceRate` 는 상품 kg당 단가에 곱하는 비율.
 * 마블링이 고른 가운데가 가장 비싸고, 담백한 상단이 가장 싸다.
 * 마지막 위치는 비율을 쓰지 않고 "부위 합계 = 중량 × 기준 단가" 가 정확히 맞도록 나머지를 받는다.
 * 좌·우 분할(안심·채끝·부채)은 같은 쪽의 상단·하단이 짝을 이룬다.
 */
export const ZONE_META: Record<SlotZoneKey, { label: string; description: string; priceRate: number }> = {
  top: { label: '상단', description: '목 쪽 · 지방이 적고 담백한 편', priceRate: 0.95 },
  upperMiddle: { label: '중상단', description: '가운데 위쪽 · 마블링이 고르게 들기 시작하는 부분', priceRate: 1.05 },
  middle: { label: '중단', description: '가운데 · 마블링이 가장 고른 부분', priceRate: 1.05 },
  lowerMiddle: { label: '중하단', description: '가운데 아래쪽 · 마블링이 가장 고른 부분', priceRate: 1.05 },
  bottom: { label: '하단', description: '허리 쪽 · 결이 부드럽고 지방이 조금 더', priceRate: 1 },
  leftTop: { label: '(좌)상단', description: '왼쪽 · 머리 쪽 · 지방이 적고 담백한 편', priceRate: 0.95 },
  leftBottom: { label: '(좌)하단', description: '왼쪽 · 꼬리 쪽 · 결이 부드럽고 마블링이 고른 편', priceRate: 1.05 },
  rightTop: { label: '(우)상단', description: '오른쪽 · 머리 쪽 · 지방이 적고 담백한 편', priceRate: 0.95 },
  rightBottom: { label: '(우)하단', description: '오른쪽 · 꼬리 쪽 · 결이 부드럽고 마블링이 고른 편', priceRate: 1.05 },
};

const ZONE_PRICE_PER_KG_UNIT = 100;

/** 위치별 kg당 단가 · 기준 단가 × 위치 비율, 100원 단위 반올림 */
export function zonePricePerKg(basePricePerKg: number, key: SlotZoneKey): number {
  return Math.round((basePricePerKg * ZONE_META[key].priceRate) / ZONE_PRICE_PER_KG_UNIT) * ZONE_PRICE_PER_KG_UNIT;
}

/** 부위 전체 판매가 · 중량 × 기준 단가 (0.1kg × 천원 단위라 항상 정수) */
export const partTotalPrice = (partWeight: number, basePricePerKg: number) => Math.round(partWeight * basePricePerKg);

/**
 * 위치 분할 · 부위 하나를 2~4개 구좌로 나눈다. 구좌 번호가 곧 위치(1번부터 순서대로).
 * - 2분할: 상단·하단 (치마·업진·토시·제비처럼 짧은 부위)
 * - 3분할: 상단·중단·하단 (목심·설도·양지 등)
 * - 4분할: 상단·중상단·중하단·하단 (등심처럼 긴 부위)
 * - 4분할 좌·우: (좌)상단·(좌)하단·(우)상단·(우)하단 — 안심·채끝·부채처럼 좌우 한 쌍이 한 부위로 상장되는 경우
 */
export const ZONE_COUNTS = [2, 3, 4] as const;
export type ZoneCount = (typeof ZONE_COUNTS)[number];
const ZONE_KEYS_BY_COUNT: Record<ZoneCount, SlotZoneKey[]> = {
  2: ['top', 'bottom'],
  3: ['top', 'middle', 'bottom'],
  4: ['top', 'upperMiddle', 'lowerMiddle', 'bottom'],
};
const SIDED_ZONE_KEYS: SlotZoneKey[] = ['leftTop', 'leftBottom', 'rightTop', 'rightBottom'];
/** 좌·우가 한 부위로 상장되어 4분할 시 좌우로 나누는 부위군 */
const SIDED_PART_GROUPS = new Set(['안심', '채끝', '부채']);

/** 구좌 수가 2·3·4면 위치 분할 상품 · 구좌마다 중량·가격이 다르다 */
export const isZoneSplit = (slotCount: number | null | undefined): slotCount is ZoneCount => slotCount === 2 || slotCount === 3 || slotCount === 4;

/**
 * 분할 수·부위명에 맞는 위치 키 · 분할 상품이 아니면 3분할 키를 돌려준다.
 * 좌·우 분할은 부위명에 (좌)/(우)가 없는 안심·채끝·부채 4분할일 때만.
 */
export function zoneKeysFor(slotCount: number | null | undefined, partName?: string | null): SlotZoneKey[] {
  if (slotCount === 4 && partName && !extractSide(partName) && SIDED_PART_GROUPS.has(toPartGroupName(partName))) return SIDED_ZONE_KEYS;
  return ZONE_KEYS_BY_COUNT[isZoneSplit(slotCount) ? slotCount : 3];
}

/**
 * 부위 중량을 위치별 덩어리로 나눈다 · 0.1kg 단위.
 * 1/n 을 0.1kg 내림한 값을 모두에게 주고, 남는 0.1kg 들을 앞쪽부터 하나씩 더한다 — 4.3kg 3분할 → 1.5 / 1.4 / 1.4, 4.1kg 4분할 → 1.1 / 1.0 / 1.0 / 1.0.
 * 구좌끼리 차이가 0.1kg 을 넘지 않아 좌·우 분할에서도 균형이 맞는다.
 */
export function splitZoneWeights(partWeight: number, count: number = 3): number[] {
  const n = Math.max(1, Math.round(count));
  const total = Math.round(partWeight * 10);
  if (total <= 0) return Array.from({ length: n }, () => 0);
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < extra ? 1 : 0)) / 10);
}

export interface ProductZone {
  slotNo: number;
  key: SlotZoneKey;
  label: string;
  description: string;
  kg: number;
  /** 이 위치의 kg당 단가 */
  pricePerKg: number;
  price: number;
  sold: boolean;
}

/**
 * 상품 한 줄을 위치별 구좌로 펼친다.
 * 상단·중단은 위치 비율로 kg당 단가(100원 단위)를 정하고 kg × 단가로 가격을 매긴다.
 * 마지막 하단은 부위 합계(중량 × 기준 단가)에서 앞 구좌들을 뺀 나머지 — 그래서 합계가 기준 단가 그대로 떨어진다.
 */
export function buildProductZones(
  partWeight: number,
  basePricePerKg: number,
  soldSlotNos: number[],
  slotCount: number | null | undefined = 3,
  partName?: string | null,
): ProductZone[] {
  const keys = zoneKeysFor(slotCount, partName);
  const weights = splitZoneWeights(partWeight, keys.length);
  const sold = new Set(soldSlotNos);
  const total = partTotalPrice(partWeight, basePricePerKg);
  const lastIndex = keys.length - 1;

  const leading = keys.slice(0, lastIndex).map((key, i) => {
    const pricePerKg = zonePricePerKg(basePricePerKg, key);
    return { key, kg: weights[i], pricePerKg, price: Math.round(pricePerKg * weights[i]) };
  });
  const leadingSum = leading.reduce((sum, z) => sum + z.price, 0);
  const lastKg = weights[lastIndex];
  const lastPrice = Math.max(0, total - leadingSum);
  const last = {
    key: keys[lastIndex],
    kg: lastKg,
    pricePerKg: lastKg > 0 ? Math.round(lastPrice / lastKg) : basePricePerKg,
    price: lastPrice,
  };

  return [...leading, last].map((z, i) => ({
    slotNo: i + 1,
    key: z.key,
    label: ZONE_META[z.key].label,
    description: ZONE_META[z.key].description,
    kg: z.kg,
    pricePerKg: z.pricePerKg,
    price: z.price,
    sold: sold.has(i + 1),
  }));
}

/**
 * 고른 구좌의 중량·금액 · 위치 분할이면 구좌별 실제 값의 합, 아니면 균등 구좌 × 수량.
 * 손질 옵션(근막 제거 + 썰어 받기)은 중량 × kg당 요금으로 더한다.
 * 패널·장바구니·결제·완료 화면·서버가 같은 숫자를 쓰도록 한 곳에서 계산한다.
 */
export function orderTotals(
  product: { slotCount: number; slotWeight: number; slotPrice: number; zones: ProductZone[] },
  slotNos: number[],
  trimAndSlice = false,
): { kg: number; amount: number } {
  if (isZoneSplit(product.slotCount)) return sumZones(product.zones, slotNos, trimAndSlice);
  const kg = Math.round(product.slotWeight * slotNos.length * 1000) / 1000;
  return { kg, amount: product.slotPrice * slotNos.length + optionFeeOf(kg, trimAndSlice) };
}

/** 고른 구좌들의 중량·금액 합 (+ 옵션 요금) */
export function sumZones(zones: ProductZone[], slotNos: number[], trimAndSlice = false): { kg: number; amount: number } {
  const picked = zones.filter((z) => slotNos.includes(z.slotNo));
  const kg = Math.round(picked.reduce((acc, z) => acc + z.kg, 0) * 10) / 10;
  return { kg, amount: picked.reduce((acc, z) => acc + z.price, 0) + optionFeeOf(kg, trimAndSlice) };
}

/** 구좌 하나의 결제 금액 · 본 가격 + 옵션 요금 */
export const zoneAmount = (zone: ProductZone, trimAndSlice: boolean) => zone.price + optionFeeOf(zone.kg, trimAndSlice);

/**
 * 구좌 번호를 위치 구간으로 나눈다.
 * 위치 분할(2~4)이면 구좌 하나가 곧 위치 하나, 그보다 많으면 상·중·하 세 구간으로 묶는다.
 * 소분 위치 = 구좌 번호(1번이 상단)라는 전제에서, 긴 부위를 고를 때 위치 감각을 준다.
 */
export function buildSlotZones(slotCount: number, partName?: string | null): SlotZone[] {
  const all = Array.from({ length: slotCount }, (_, i) => i + 1);
  if (slotCount <= 0) return [];
  const zoneOf = (key: SlotZoneKey, slotNos: number[]): SlotZone => ({ key, label: ZONE_META[key].label, description: ZONE_META[key].description, slotNos });
  if (slotCount === 1) return [zoneOf('middle', all)];
  if (isZoneSplit(slotCount)) return zoneKeysFor(slotCount, partName).map((key, i) => zoneOf(key, [i + 1]));

  const base = Math.floor(slotCount / 3);
  const remainder = slotCount % 3;
  // 남는 구좌는 중단부터 채운다 · 가운데가 가장 넓어 보이는 게 자연스럽다
  const sizes = [base, base + (remainder >= 1 ? 1 : 0), base + (remainder === 2 ? 1 : 0)];

  let cursor = 0;
  return (['top', 'middle', 'bottom'] as SlotZoneKey[]).map((key, i) => {
    const slotNos = all.slice(cursor, cursor + sizes[i]);
    cursor += sizes[i];
    return zoneOf(key, slotNos);
  });
}

/** 구좌 번호가 속한 구간 라벨 · 주문 내역 표시용 */
export function slotZoneLabel(slotNo: number, slotCount: number, partName?: string | null): string {
  const zone = buildSlotZones(slotCount, partName).find((z) => z.slotNos.includes(slotNo));
  return zone?.label ?? '';
}

/** 비어 있는 구좌 중 앞에서부터 N개 · 위치 선택을 쓰지 않는 상품의 수량 선택용 */
export function pickAvailableSlots(slotCount: number, soldSlotNos: number[], quantity: number): number[] {
  const sold = new Set(soldSlotNos);
  const picked: number[] = [];
  for (let n = 1; n <= slotCount && picked.length < quantity; n += 1) {
    if (!sold.has(n)) picked.push(n);
  }
  return picked;
}

export function formatKg(value: number): string {
  return `${value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}kg`;
}

export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}
