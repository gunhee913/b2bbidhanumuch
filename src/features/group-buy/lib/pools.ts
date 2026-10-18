/**
 * kg 수요 풀(1kg 구매) 계산 · 서버(매칭)와 클라이언트(표)가 같은 식을 쓴다.
 *
 * 핵심 규칙
 * - 가격은 관리자가 부위×등급별로 정한 kg당 고정 단가 하나다. 소비자는 kg만 고른다.
 * - 한 덩어리 목표 중량만큼 모이면 먼저 넣은 순서(FIFO)로 묶어 매참인이 경매에 참여해 확보한다.
 * - 못 확보하면 전액 환불. 가격 흥정·확정가 개념은 없다.
 */

import { shortGrade } from './format';

/** 1++ 만 근내지방도(7·8·9)로 나눈다 · 나머지 등급은 등급만 */
export function gradeKeyOf(grade: string | null | undefined, marblingScore: number | null | undefined): string | null {
  const short = shortGrade(grade);
  if (short === '-') return null;
  if (short !== '1++') return short;
  const score = marblingScore ?? Number(grade?.match(/\((\d)\)/)?.[1] ?? NaN);
  if (score === 7 || score === 8 || score === 9) return `1++${score}`;
  return '1++';
}

/** `1++9` → `1++(9)등급`, `1+` → `1+등급` */
export function gradeKeyLabel(key: string): string {
  const m = key.match(/^(1\+\+)(\d)$/);
  return m ? `${m[1]}(${m[2]})등급` : `${key}등급`;
}

/** 표·패널용 짧은 표기 · `1++9` → `1++(9)`, `1+` → `1+등급`, `1` → `1등급` */
export function gradeKeyCompact(key: string): string {
  const m = key.match(/^(1\+\+)(\d)$/);
  return m ? `${m[1]}(${m[2]})` : `${key}등급`;
}

/** 표·패널·장바구니에서 쓰는 풀 이름 · "윗등심 1++(9)" */
export function poolTitle(pool: { partGroup: string; gradeKey: string }): string {
  return `${pool.partGroup} ${gradeKeyCompact(pool.gradeKey)}`;
}

/** 손질 옵션 · 근막 제거 + 썰어 받기 · kg당 추가 요금 */
export const TRIM_SLICE_FEE_PER_KG = 5000;
export const TRIM_SLICE_LABEL = '근막 제거 + 썰어 받기';

/** 옵션 포함 kg당 단가 */
export function unitPriceOf(pricePerKg: number, trimAndSlice: boolean, feePerKg = TRIM_SLICE_FEE_PER_KG): number {
  return pricePerKg + (trimAndSlice ? feePerKg : 0);
}

/** 옵션 요금만 · 구좌 상품처럼 본 가격이 따로 있을 때 더한다 (0.1kg 단위라 항상 정수) */
export function optionFeeOf(kg: number, trimAndSlice: boolean, feePerKg = TRIM_SLICE_FEE_PER_KG): number {
  return trimAndSlice ? Math.round(kg * feePerKg) : 0;
}

/** 결제 금액 = kg × (단가 + 옵션 요금) */
export function lineAmountOf(pricePerKg: number, kg: number, trimAndSlice: boolean, feePerKg = TRIM_SLICE_FEE_PER_KG): number {
  return kg * unitPriceOf(pricePerKg, trimAndSlice, feePerKg);
}

/** kg 을 풀의 최소~최대 범위로 자른다 */
export function clampKg(pool: { minKg: number; maxKg: number }, kg: number): number {
  return Math.min(Math.max(kg, pool.minKg), pool.maxKg);
}

/** 등급키 → 필터용 짧은 등급 (`1++9` → `1++`) */
export function gradeKeyShort(key: string): string {
  return key.replace(/^(1\+\+)\d$/, '$1');
}

/** 등급키 표시 순서 · 좋은 등급이 먼저 */
export const GRADE_KEY_ORDER = ['1++9', '1++8', '1++7', '1++', '1+', '1', '2'] as const;

export function compareGradeKey(a: string, b: string): number {
  const ia = GRADE_KEY_ORDER.indexOf(a as (typeof GRADE_KEY_ORDER)[number]);
  const ib = GRADE_KEY_ORDER.indexOf(b as (typeof GRADE_KEY_ORDER)[number]);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}

/** 1kg 구매 화면의 부위 순서 · 등심은 윗/아랫으로 나눠 판다 */
export const POOL_PART_ORDER = ['윗등심', '아랫등심', '안심', '채끝', '치마', '부채', '토시·제비'] as const;

export function comparePoolPart(a: string, b: string): number {
  const ia = POOL_PART_ORDER.indexOf(a as (typeof POOL_PART_ORDER)[number]);
  const ib = POOL_PART_ORDER.indexOf(b as (typeof POOL_PART_ORDER)[number]);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'ko');
}

/** 풀 부위 → 경매 부위 대분류 · 윗등심/아랫등심은 모두 "등심" 실물에서 나온다 */
const AUCTION_PART_OF: Record<string, string> = { 윗등심: '등심', 아랫등심: '등심' };
export function auctionPartGroupOf(poolPart: string): string {
  return AUCTION_PART_OF[poolPart] ?? poolPart;
}

export interface ReservationLike {
  kg: number;
  createdAt: string;
}

export interface AllocationResult<T extends ReservationLike> {
  accepted: T[];
  acceptedKg: number;
}

/** 먼저 넣은 순서로 쌓아 목표 중량을 채운다 · 마지막 예약은 통째로 들어간다(초과분은 실중량 정산 TODO) */
export function allocateFifo<T extends ReservationLike>(reservations: T[], targetKg: number): AllocationResult<T> | null {
  if (targetKg <= 0) return null;
  const sorted = [...reservations].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const accepted: T[] = [];
  let acc = 0;
  for (const r of sorted) {
    accepted.push(r);
    acc += r.kg;
    if (acc >= targetKg) return { accepted, acceptedKg: acc };
  }
  return null;
}

export function sumKg(reservations: ReservationLike[]): number {
  return reservations.reduce((s, r) => s + r.kg, 0);
}

/** 0~100 · 목표가 0이면 0 */
export function fillPercent(totalKg: number, targetKg: number): number {
  if (targetKg <= 0) return 0;
  return Math.min(100, Math.round((totalKg / targetKg) * 100));
}

/** 시중 소매가 대비 절약률(%) · 소매가가 없거나 더 싸지 않으면 null */
export function savingRateOf(pricePerKg: number, retailPerKg: number | null): number | null {
  if (!retailPerKg || retailPerKg <= pricePerKg) return null;
  return Math.round((1 - pricePerKg / retailPerKg) * 100);
}
