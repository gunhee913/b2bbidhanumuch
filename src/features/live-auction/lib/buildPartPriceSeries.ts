import { startOfMonth, startOfWeek } from "date-fns";
import type { PartPriceSeriesPoint } from "../api";

/** 시간축 단위. AuctionLab `PriceGranularity` 와 동일 규약. */
export type PriceGranularity = "day" | "week" | "month";

/** 육량 등급. */
export type YieldGrade = "A" | "B" | "C";

/** 라인 차트 한 시점. */
export interface PricePoint {
  /** 로컬 Date (자정 기준). */
  date: Date;
  /** 가중 평균 단가 (원/kg). */
  value: number;
  /** 해당 시점 두수 (거래량). */
  count: number;
}

/* ================================================================== */
/*  1. 집계 헬퍼                                                       */
/* ================================================================== */

/**
 * 일별 `PricePoint[]` 를 granularity 별로 재집계.
 *
 * - `day`  → 그대로
 * - `week` → `startOfWeek({ weekStartsOn: 1 })` 그루핑 · value=두수 가중평균 · count=합계
 * - `month` → `startOfMonth` 그루핑
 */
export function aggregatePricePoints(
  daily: PricePoint[],
  granularity: PriceGranularity,
): PricePoint[] {
  if (granularity === "day") return daily;

  const grouped = new Map<
    number,
    { date: Date; sumValueWeighted: number; sumCount: number }
  >();

  for (const p of daily) {
    const bucketStart =
      granularity === "week"
        ? startOfWeek(p.date, { weekStartsOn: 1 })
        : startOfMonth(p.date);
    const key = bucketStart.getTime();
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.sumValueWeighted += p.value * p.count;
      bucket.sumCount += p.count;
    } else {
      grouped.set(key, {
        date: bucketStart,
        sumValueWeighted: p.value * p.count,
        sumCount: p.count,
      });
    }
  }

  return [...grouped.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({
      date: b.date,
      value:
        b.sumCount > 0 ? Math.round(b.sumValueWeighted / b.sumCount) : 0,
      count: b.sumCount,
    }));
}

/** `PartPriceSeriesPoint[]` (API 응답) → 집계된 `PricePoint[]`. */
export function aggregatePartPriceSeries({
  series,
  granularity,
}: {
  series: PartPriceSeriesPoint[];
  granularity: PriceGranularity;
}): PricePoint[] {
  const daily: PricePoint[] = [];
  for (const p of series) {
    if (p.avg == null || p.count <= 0) continue;
    daily.push({
      date: parseLocalDate(p.date),
      value: p.avg,
      count: p.count,
    });
  }
  return aggregatePricePoints(daily, granularity);
}

/* ================================================================== */
/*  2. 더미 시계열 생성기 (실 데이터 부족 시 폴백)                     */
/* ================================================================== */

export interface BuildPartPriceSeriesParams {
  partName: string;
  grade: string;
  yieldGrade: YieldGrade;
  granularity: PriceGranularity;
  days?: number;
}

const GRADE_BASELINE: Record<string, number> = {
  "1++(9)": 95000,
  "1++(8)": 88000,
  "1++(7)": 82000,
  "1++": 82000,
  "1+": 65000,
  "1": 45000,
  "2": 32000,
  "3": 22000,
};

const YIELD_MULTIPLIER: Record<YieldGrade, number> = {
  A: 1.03,
  B: 1.0,
  C: 0.92,
};

const PART_OFFSET: Record<string, number> = {
  안심: 3500,
  등심: 0,
  채끝: 1500,
  갈비: -8000,
  양지: -5000,
  사태: -6000,
  목심: -3000,
  우둔: -4000,
  홍두깨살: -2500,
};

/**
 * 시드 기반 결정론적 90일 시계열 생성.
 * `(partName, grade, yieldGrade)` 조합이 같으면 항상 같은 결과.
 */
export function buildPartPriceSeries({
  partName,
  grade,
  yieldGrade,
  granularity,
  days = 730,
}: BuildPartPriceSeriesParams): PricePoint[] {
  const seed = hashString(`${partName}::${grade}::${yieldGrade}`);
  const rand = mulberry32(seed);

  const baseline =
    (GRADE_BASELINE[grade] ?? 45000) * YIELD_MULTIPLIER[yieldGrade] +
    (PART_OFFSET[partName] ?? 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let last = baseline + (rand() - 0.5) * baseline * 0.05;

  const daily: PricePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // 주말(일=0, 토=6) 은 실제 경매 미개설 · 스킵
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    // 평균회귀 랜덤워크: step ~ N(0, ~800), 회귀 12%
    const noise = (rand() - 0.5) * 1600;
    const mr = (baseline - last) * 0.12;
    last = clamp(last + noise + mr, baseline * 0.7, baseline * 1.3);

    // 건수 · 20% 확률로 미거래 · 정상 거래일은 10~59건
    const skip = rand() < 0.2;
    const count = skip ? 0 : 10 + Math.floor(rand() * 50);
    if (count === 0) continue;

    daily.push({
      date: d,
      value: Math.round(last),
      count,
    });
  }

  return aggregatePricePoints(daily, granularity);
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
