/**
 * 매장 픽업 예약 계산 · 서버(검증·잔여 계산)와 클라이언트(날짜·시간 선택)가 같은 식을 쓴다.
 * 모든 날짜·시간은 한국 시간(+09:00) 기준으로 다룬다.
 */

import type { ConsumerStore, PickupSlot } from '../types';

/** 주문일 + 3일부터 예약할 수 있고, 그날부터 14일 안에서 고른다 */
export const PICKUP_LEAD_DAYS = 3;
export const PICKUP_WINDOW_DAYS = 14;

const KST_OFFSET = '+09:00';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 'YYYY-MM-DD' (한국 날짜) */
export function kstDateString(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 한국 날짜 문자열에 일수를 더한다 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00${KST_OFFSET}`);
  return kstDateString(new Date(d.getTime() + days * 24 * 60 * 60 * 1000));
}

/** 한국 날짜의 요일 · 0=일 */
export function kstWeekday(dateStr: string): number {
  // 정오(KST) = 같은 날 03:00 UTC 라 UTC 요일이 곧 한국 요일
  return new Date(`${dateStr}T12:00:00${KST_OFFSET}`).getUTCDay();
}

export const weekdayLabel = (weekday: number) => WEEKDAY_LABELS[weekday] ?? '';

/** 'HH:MM' 또는 'HH:MM:SS' → 분 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

const pad = (n: number) => String(n).padStart(2, '0');
export const minutesToTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** 'HH:MM:SS' → 'HH:MM' · 화면·입력용 */
export const shortTime = (time: string) => time.slice(0, 5);

/** 픽업 시작 시각 ISO · 날짜 + 분 → '2026-10-22T14:00:00+09:00' */
export function pickupIso(dateStr: string, minutes: number): string {
  return `${dateStr}T${minutesToTime(minutes)}:00${KST_OFFSET}`;
}

export interface PickupDate {
  date: string;
  /** '10.22 (수)' */
  label: string;
  weekday: number;
  closed: boolean;
}

/** 첫 예약 가능일 · 기준 시각(주문일)의 한국 날짜 + 3일 */
export function firstPickupDate(now: Date = new Date()): string {
  return addDays(kstDateString(now), PICKUP_LEAD_DAYS);
}

/** 선택 가능한 날짜 목록 · 휴무일은 표시하되 고를 수 없다 */
export function buildPickupDates(store: Pick<ConsumerStore, 'closedWeekdays'>, now: Date = new Date()): PickupDate[] {
  const first = firstPickupDate(now);
  return Array.from({ length: PICKUP_WINDOW_DAYS }, (_, i) => {
    const date = addDays(first, i);
    const weekday = kstWeekday(date);
    return {
      date,
      label: `${date.slice(5, 7)}.${date.slice(8, 10)} (${weekdayLabel(weekday)})`,
      weekday,
      closed: store.closedWeekdays.includes(weekday),
    };
  });
}

/** 영업시간 안의 슬롯 시작 분 목록 · 마지막 슬롯은 마감 전에 끝나야 한다 */
export function slotStartMinutes(store: Pick<ConsumerStore, 'openTime' | 'closeTime' | 'slotMinutes'>): number[] {
  const open = timeToMinutes(store.openTime);
  const close = timeToMinutes(store.closeTime);
  const step = Math.max(10, store.slotMinutes || 30);
  const out: number[] = [];
  for (let m = open; m + step <= close; m += step) out.push(m);
  return out;
}

/**
 * 하루치 슬롯 · `taken` 은 슬롯 ISO → 이미 잡힌 주문 수.
 * 휴무일이면 빈 배열.
 */
export function buildPickupSlots(store: Pick<ConsumerStore, 'openTime' | 'closeTime' | 'slotMinutes' | 'slotCapacity' | 'closedWeekdays'>, dateStr: string, taken: Map<string, number> = new Map()): PickupSlot[] {
  if (store.closedWeekdays.includes(kstWeekday(dateStr))) return [];
  return slotStartMinutes(store).map((m) => {
    const at = pickupIso(dateStr, m);
    return { at, label: minutesToTime(m), remaining: Math.max(0, store.slotCapacity - (taken.get(at) ?? 0)) };
  });
}

/** 서버 검증 · 매장 규칙에 맞는 시각인지 (정원은 따로 센다) */
export function validatePickupAt(store: Pick<ConsumerStore, 'openTime' | 'closeTime' | 'slotMinutes' | 'closedWeekdays'>, pickupAt: string, now: Date = new Date()): string | null {
  const d = new Date(pickupAt);
  if (Number.isNaN(d.getTime())) return '픽업 시간이 올바르지 않습니다.';
  const date = kstDateString(d);
  const first = firstPickupDate(now);
  const last = addDays(first, PICKUP_WINDOW_DAYS - 1);
  if (date < first) return `픽업은 주문일 ${PICKUP_LEAD_DAYS}일 뒤(${first.slice(5).replace('-', '.')})부터 가능합니다.`;
  if (date > last) return `픽업은 ${last.slice(5).replace('-', '.')}까지만 예약할 수 있습니다.`;
  if (store.closedWeekdays.includes(kstWeekday(date))) return '선택한 날은 매장 휴무일입니다.';
  const minutes = Math.round((d.getTime() + KST_OFFSET_MS) / 60000) % (24 * 60);
  if (!slotStartMinutes(store).includes(minutes)) return '선택한 시간은 예약할 수 없는 시간입니다.';
  return null;
}

/** 슬롯 ISO 를 정규화 · 다른 표기(Z 등)로 들어와도 같은 슬롯이면 같은 키가 되게 */
export function normalizePickupKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const minutes = Math.round((d.getTime() + KST_OFFSET_MS) / 60000) % (24 * 60);
  return pickupIso(kstDateString(d), minutes);
}

/** '10.22 (수) 14:00' */
export function formatPickup(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = kstDateString(d);
  const minutes = Math.round((d.getTime() + KST_OFFSET_MS) / 60000) % (24 * 60);
  return `${date.slice(5, 7)}.${date.slice(8, 10)} (${weekdayLabel(kstWeekday(date))}) ${minutesToTime(minutes)}`;
}

/** 픽업 전날 자정(한국)까지 변경 가능 */
export function canChangePickup(pickupAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!pickupAt) return false;
  const d = new Date(pickupAt);
  if (Number.isNaN(d.getTime())) return false;
  return kstDateString(now) < kstDateString(d);
}

/** '매일 11:00 – 21:00' 또는 '화 휴무 · 11:00 – 21:00' */
export function storeHoursLabel(store: Pick<ConsumerStore, 'openTime' | 'closeTime' | 'closedWeekdays'>): string {
  const hours = `${shortTime(store.openTime)} – ${shortTime(store.closeTime)}`;
  if (store.closedWeekdays.length === 0) return `매일 ${hours}`;
  return `${store.closedWeekdays.map(weekdayLabel).join('·')} 휴무 · ${hours}`;
}

export const storeFullAddress = (store: Pick<ConsumerStore, 'address' | 'addressDetail'>) => [store.address, store.addressDetail].filter(Boolean).join(' ');
