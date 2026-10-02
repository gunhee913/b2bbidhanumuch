import {
  formatGradeWithYield,
  GRADE_FILTER_OPTIONS,
} from "@/features/live-auction/lib/grade";
import type { MarketPartGradeRow } from "../api";

/** 갈라 볼 때 늘 세우는 육량 세 칸 */
const YIELD_LETTERS = ["A", "B", "C"] as const;

/** 등급 표시 차례 · 낮을수록 위쪽 */
const GRADE_ORDER: Record<string, number> = {
  "1++(9)": 0,
  "1++(8)": 1,
  "1++(7)": 2,
  "1+": 3,
  "1": 4,
  "2": 5,
  "3": 6,
};

const gradeRank = (g: string) =>
  GRADE_ORDER[g] ?? (g.startsWith("1++") ? 2.5 : 99);

/** 육량 차례 · A → B → C → 모름 */
const yieldRank = (y: string | null) =>
  y === "A" ? 0 : y === "B" ? 1 : y === "C" ? 2 : 3;

/** 표 한 줄 · 합을 나눠 평균까지 낸 꼴 */
export interface MarketRow {
  /** `등급` 또는 `등급||육량` · 짚은 줄을 가리키는 열쇠 */
  key: string;
  /** 사람이 보는 등급 · `1++A(9)` · 통합했으면 `1++(9)` */
  label: string;
  /** 차트에 넘길 등급 열쇠 · `1++(9)` 꼴 (육량은 따로) */
  grade: string;
  /** 통합했으면 null */
  yieldGrade: string | null;
  count: number;
  avgWeight: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgAmount: number;
}

interface Bucket {
  grade: string;
  yieldGrade: string | null;
  count: number;
  weightSum: number;
  weightCount: number;
  priceSum: number;
  priceMin: number;
  priceMax: number;
  amountSum: number;
}

const emptyBucket = (grade: string, yieldGrade: string | null): Bucket => ({
  grade,
  yieldGrade,
  count: 0,
  weightSum: 0,
  weightCount: 0,
  priceSum: 0,
  priceMin: Infinity,
  priceMax: 0,
  amountSum: 0,
});

const rowKeyOf = (grade: string, yieldGrade: string | null) =>
  yieldGrade === null ? grade : `${grade}||${yieldGrade}`;

/**
 * 부위 하나의 등급 줄을 만든다 · **격자를 먼저 깔고** 거기에 자료를 붓는다.
 *
 * 낙찰이 없던 등급도 줄을 세운다. 있는 것만 세우면 부위를 넘길 때마다 줄 수가
 * 달라져, 위에서 셋째 줄이 등심에서는 1++(7)A 인데 안심에서는 1+B 가 된다 — 방향키로
 * 훑으며 차트를 보는 손놀림이 매번 다시 자리를 잡아야 한다. 「이 부위 1++(9) 는 이번
 * 기간에 한 건도 없었다」 도 봐야 하는 사실이고, 줄을 지워 버리면 그걸 볼 자리가 없다.
 *
 * `unified` 면 A·B·C 를 한 줄로 합친다. 합친 뒤에 나누는 것이지 평균의 평균이
 * 아니다 — A 가 백 건이고 C 가 두 건일 때 둘을 반반으로 치면 C 쪽으로 값이
 * 끌려간다. 최고·최저는 양 끝만 고르면 되니 나눌 것이 없다.
 *
 * 중량·낙찰대금의 분모는 전체 건수가 아니라 **중량이 적힌 건수**다. 중량이 비어
 * 있는 줄은 금액도 못 내므로, 그것까지 분모에 넣으면 평균이 조용히 내려앉는다.
 */
export function buildMarketRows(
  rows: readonly MarketPartGradeRow[],
  partName: string,
  unified: boolean,
): MarketRow[] {
  const buckets = new Map<string, Bucket>();

  for (const grade of GRADE_FILTER_OPTIONS) {
    if (unified) {
      buckets.set(rowKeyOf(grade, null), emptyBucket(grade, null));
    } else {
      for (const y of YIELD_LETTERS) {
        buckets.set(rowKeyOf(grade, y), emptyBucket(grade, y));
      }
    }
  }

  for (const row of rows) {
    if (row.partName !== partName) continue;
    const yieldGrade = unified ? null : row.yieldGrade;
    const key = rowKeyOf(row.grade, yieldGrade);
    /* 격자에 없던 짝(육량이 안 적힌 물량 등)도 떨어뜨리지 않고 줄을 하나 연다 */
    const bucket = buckets.get(key) ?? emptyBucket(row.grade, yieldGrade);
    bucket.count += row.count;
    bucket.weightSum += row.weightSum;
    bucket.weightCount += row.weightCount;
    bucket.priceSum += row.priceSum;
    bucket.priceMin = Math.min(bucket.priceMin, row.priceMin);
    bucket.priceMax = Math.max(bucket.priceMax, row.priceMax);
    bucket.amountSum += row.amountSum;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .map(([key, b]) => ({
      key,
      label: formatGradeWithYield(b.grade, b.yieldGrade),
      grade: b.grade,
      yieldGrade: b.yieldGrade,
      count: b.count,
      avgWeight:
        b.weightCount > 0
          ? Math.round((b.weightSum / b.weightCount) * 10) / 10
          : 0,
      avgPrice: b.count > 0 ? Math.round(b.priceSum / b.count) : 0,
      minPrice: Number.isFinite(b.priceMin) ? b.priceMin : 0,
      maxPrice: b.priceMax,
      avgAmount:
        b.weightCount > 0 ? Math.round(b.amountSum / b.weightCount) : 0,
    }))
    .sort(
      (a, b) =>
        gradeRank(a.grade) - gradeRank(b.grade) ||
        yieldRank(a.yieldGrade) - yieldRank(b.yieldGrade),
    );
}

/**
 * 탭에 세울 부위 · 낙찰이 없던 부위도 빼지 않는다.
 *
 * 있는 것만 세우면 탭 줄이 기간을 바꿀 때마다 길어졌다 짧아지고, 그때마다 칸들이
 * 좌우로 밀린다 — 조금 전 눌렀던 자리에 다른 부위가 와 있다. 「이 기간에 등심은
 * 아예 안 나왔다」 도 봐야 하는 사실인데, 칸을 지워 버리면 그걸 확인할 자리 자체가
 * 없어진다.
 */
export function orderedParts(
  rows: readonly MarketPartGradeRow[],
  order: readonly string[],
): string[] {
  /* 차례에 없는 이름이 자료에 들어와도 떨어뜨리지 않는다 · 부위명이 늘면 여기부터 깨진다 */
  const known = new Set(order);
  const extra = [...new Set(rows.map((r) => r.partName))]
    .filter((p) => !known.has(p))
    .sort();
  return [...order, ...extra];
}
