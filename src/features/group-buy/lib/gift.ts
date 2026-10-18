/**
 * 선물세트 계산 · 서버(구좌 배정·검증)와 클라이언트(미리보기·금액)가 같은 식을 쓴다.
 * 칸 중량은 500g 고정 · 2·3·4·6구 · 세트당 포장비는 설정값.
 */

import type { ProductZone } from './slots';

export type GiftCellCount = 2 | 3 | 4 | 5 | 6;
export type GiftRecipientMode = 'batch' | 'split';

export const GIFT_CELL_GRAMS = 500;
export const GIFT_CELL_KG = 0.5;
/** 근막 제거 가공에서 빠지는 비율 · 구성 중량은 구매 중량에서 이만큼 뺀다 */
export const GIFT_TRIM_LOSS_RATE = 0.1;
export type GiftLeftoverMode = 'pack' | 'separate';
export const GIFT_CELL_COUNTS = [2, 3, 4, 6] as const;
export const DEFAULT_PACKAGING_FEE = 15_000;

/**
 * 정육 N구 스티로폼 박스 수치.
 * 시중 3구 박스가 435×230×150mm 이라, 칸은 12×18cm · 외벽 2.5cm 로 맞춘다.
 */
export const GIFT_CELL_PACK_CM = { w: 12, h: 18 } as const;
export const GIFT_TRAY_GAP_CM = 1.5;
export const GIFT_TRAY_PAD_CM = 2.5;
export const TRAY_PX_PER_CM = 8;

export const GIFT_TRAY_META: Record<GiftCellCount, { title: string; hint: string; people: string; kg: number }> = {
  2: { title: '2구', hint: '1.0kg', people: '2~3인', kg: 1.0 },
  3: { title: '3구', hint: '1.5kg', people: '3~5인', kg: 1.5 },
  4: { title: '4구', hint: '2.0kg', people: '4~6인', kg: 2.0 },
  5: { title: '5구', hint: '2.5kg', people: '5~8인', kg: 2.5 },
  6: { title: '6구', hint: '3.0kg', people: '6~9인', kg: 3.0 },
};

/** 구매 카드가 트레이 칸과 같은 자리에 놓이도록 행·열을 정한다 */
export function traySlotPlacements(cellCount: GiftCellCount): { columns: number; slots: { cellNo: number; row: number; column: string }[] } {
  const { cols, rowsCells } = trayGrid(cellCount);
  const fine = cols * 2;
  const cellSpan = fine / cols;
  let cellNo = 1;
  const slots = rowsCells.flatMap((count, row) => {
    const start = 1 + Math.floor((fine - count * cellSpan) / 2);
    return Array.from({ length: count }, (_, index) => ({
      cellNo: cellNo++,
      row: row + 1,
      column: `${start + index * cellSpan} / span ${cellSpan}`,
    }));
  });
  return { columns: fine, slots };
}

export function trayGrid(cellCount: GiftCellCount): { cols: number; rows: number; rowsCells: number[] } {
  if (cellCount === 2) return { cols: 2, rows: 1, rowsCells: [2] };
  if (cellCount === 3) return { cols: 3, rows: 1, rowsCells: [3] };
  if (cellCount === 4) return { cols: 2, rows: 2, rowsCells: [2, 2] };
  if (cellCount === 5) return { cols: 3, rows: 2, rowsCells: [2, 3] };
  return { cols: 3, rows: 2, rowsCells: [3, 3] };
}

export function traySizeCm(cellCount: GiftCellCount) {
  const { cols, rows } = trayGrid(cellCount);
  return {
    w: GIFT_TRAY_PAD_CM * 2 + cols * GIFT_CELL_PACK_CM.w + (cols - 1) * GIFT_TRAY_GAP_CM,
    h: GIFT_TRAY_PAD_CM * 2 + rows * GIFT_CELL_PACK_CM.h + (rows - 1) * GIFT_TRAY_GAP_CM,
  };
}

export function trayViewBox(cellCount: GiftCellCount) {
  const cm = traySizeCm(cellCount);
  return { w: cm.w * TRAY_PX_PER_CM, h: cm.h * TRAY_PX_PER_CM };
}

export const TRAY_CANVAS = trayViewBox(6);

export const formatCm = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export const formatCellPack = () => `칸 ${formatCm(GIFT_CELL_PACK_CM.w)}×${formatCm(GIFT_CELL_PACK_CM.h)}cm`;

export const formatTraySize = (cellCount: GiftCellCount) => {
  const { w, h } = traySizeCm(cellCount);
  return `박스 ${formatCm(w)}×${formatCm(h)}cm`;
};

export const isGiftCellCount = (n: number): n is GiftCellCount => n === 2 || n === 3 || n === 4 || n === 5 || n === 6;

export const toGiftCellCount = (n: number | null | undefined): GiftCellCount => (isGiftCellCount(n ?? 0) ? (n as GiftCellCount) : 3);

export const toRecipientMode = (value: string | null | undefined): GiftRecipientMode => (value === 'split' ? 'split' : 'batch');

export interface GiftCellPick {
  cellNo: number;
  /** 벌크 구좌를 쓰는 상품 · 1kg 구매만이면 null */
  productId: string | null;
  /** 1kg 구매를 섞거나 1kg 만 살 때 풀 id */
  poolId: string | null;
  /** 이 칸이 속한 구성의 1kg 구매 개수 */
  kg: number;
}

export interface GiftCellSnapshot {
  cellNo: number;
  productId: string;
  partName: string;
  partGroup: string;
  grade: string;
  image: string | null;
  grams: number;
}

export interface TrayCellBox {
  cellNo: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 스티로폼 트레이 칸 배치 · 500g 칸은 구수와 상관없이 같은 크기 */
export function trayBoxes(cellCount: GiftCellCount): TrayCellBox[] {
  const { cols, rowsCells } = trayGrid(cellCount);
  const cellW = GIFT_CELL_PACK_CM.w * TRAY_PX_PER_CM;
  const cellH = GIFT_CELL_PACK_CM.h * TRAY_PX_PER_CM;
  const gap = GIFT_TRAY_GAP_CM * TRAY_PX_PER_CM;
  const pad = GIFT_TRAY_PAD_CM * TRAY_PX_PER_CM;
  const innerW = cols * cellW + (cols - 1) * gap;

  return rowsCells.flatMap((count, row) => {
    const rowW = count * cellW + (count - 1) * gap;
    const x0 = pad + (innerW - rowW) / 2;
    const y = pad + row * (cellH + gap);
    const start = rowsCells.slice(0, row).reduce((acc, n) => acc + n, 0);
    return Array.from({ length: count }, (_, i) => ({
      cellNo: start + i + 1,
      x: x0 + i * (cellW + gap),
      y,
      w: cellW,
      h: cellH,
    }));
  });
}

export function emptyCells(cellCount: GiftCellCount): Array<GiftCellPick | null> {
  return Array.from({ length: cellCount }, () => null);
}

/** 상품별 필요 중량 · 칸 수 × 0.5kg × 세트 수 */
export function neededKgByProduct(cells: GiftCellPick[], quantity: number): Map<string, number> {
  const qty = Math.max(1, quantity);
  const map = new Map<string, number>();
  for (const cell of cells) {
    if (!cell.productId) continue;
    map.set(cell.productId, roundKg((map.get(cell.productId) ?? 0) + GIFT_CELL_KG * qty));
  }
  return map;
}

export interface ZonePick {
  slotNos: number[];
  usedKg: number;
  leftoverKg: number;
}

/** 필요 중량을 채울 때까지 남은 구좌를 단가 싼 순으로 고른다 */
export function pickZonesForNeed(zones: ProductZone[], neededKg: number): { ok: true; pick: ZonePick } | { ok: false; error: string; remainingKg: number } {
  const need = roundKg(neededKg);
  if (need <= 0) return { ok: true, pick: { slotNos: [], usedKg: 0, leftoverKg: 0 } };

  const open = zones.filter((z) => !z.sold).sort((a, b) => a.pricePerKg - b.pricePerKg || a.slotNo - b.slotNo);
  const available = roundKg(open.reduce((acc, z) => acc + z.kg, 0));
  if (available < need) {
    return { ok: false, error: `남은 양이 ${available.toFixed(1)}kg 뿐이에요. ${need.toFixed(1)}kg 이 필요해요.`, remainingKg: available };
  }

  const slotNos: number[] = [];
  let used = 0;
  for (const zone of open) {
    if (used >= need) break;
    slotNos.push(zone.slotNo);
    used = roundKg(used + zone.kg);
  }
  return { ok: true, pick: { slotNos, usedKg: used, leftoverKg: roundKg(used - need) } };
}

export const packagingAmount = (fee: number, quantity: number) => Math.max(0, fee) * Math.max(1, quantity);

export const setMeatKg = (cellCount: GiftCellCount, quantity: number) => roundKg(GIFT_CELL_KG * cellCount * quantity);

export function roundKg(kg: number): number {
  return Math.round(kg * 10) / 10;
}

/** 구매 중량에서 근막 제거 10%를 뺀 구성 중량 */
export const giftUsableKg = (rawKg: number) => roundKg(Math.max(0, rawKg) * (1 - GIFT_TRIM_LOSS_RATE));

export const leftoverLines = (items: Array<{ label: string; leftoverKg: number }>) =>
  items.filter((i) => i.leftoverKg > 0).map((i) => `${i.label} ${i.leftoverKg.toFixed(1)}kg`);

/** 손질·포장 전에 계산한 남는 중량이라 실제와 달라질 수 있다 */
export const GIFT_LEFTOVER_NOTICE = '가공 과정에서 중량이 변동될 수 있어요.';
