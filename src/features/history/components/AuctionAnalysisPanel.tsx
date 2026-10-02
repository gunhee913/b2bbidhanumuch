"use client";

import { Fragment, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { parseISO } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { AuctionResult } from "@/features/bids/types";
import { formatWon } from "@/features/live-auction/lib/masking";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";

export interface AuctionAnalysisPanelProps {
  /** 이미 기간 필터가 적용된 결과 목록 */
  results: AuctionResult[];
}

const KRW = new Intl.NumberFormat("ko-KR");

/**
 * 경매 분석 · 딜러 본인 경매내역 데이터 시각화.
 * 기간 선택과 KPI 는 상위(캘린더 달 = 분석 기간)가 담당하고, 여기서는 분포와 상세만 그린다.
 *
 * 섹션 구성:
 * 1. 분포 도넛 (등급 / 부위 / 가공업체) · 기타는 hover 시 세부
 * 2. 낙찰 상세 통합 테이블 · 부위별 ↔ 등급별 탭 · 육량통합 토글
 *    - 각 행 확장 시 · 반대축 세부 + 요일별 평균단가 차트
 */
export function AuctionAnalysisPanel({ results }: AuctionAnalysisPanelProps) {
  const partsBreakdown = useMemo(
    () => buildPartsWithGrades(results),
    [results],
  );
  const gradesBreakdown = useMemo(
    () => buildGradesWithParts(results),
    [results],
  );

  const gradeDist = useMemo(
    () => buildDistribution(results, toFineGrade, GRADE_BUCKETS),
    [results],
  );
  const partDist = useMemo(
    () => buildDistribution(results, (r) => r.partName || "기타", undefined, 6),
    [results],
  );
  const companyDist = useMemo(
    () =>
      buildDistribution(
        results,
        (r) => r.companyName || "미지정",
        undefined,
        6,
      ),
    [results],
  );

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <DonutCard title="등급 분포" data={gradeDist} />
        <DonutCard title="부위 분포" data={partDist} />
        <DonutCard title="가공업체 분포" data={companyDist} />
      </div>

      <PartsGradesBreakdown
        partsRows={partsBreakdown}
        gradesRows={gradesBreakdown}
      />
    </div>
  );
}

// ============================================================
// 데이터 가공 유틸
// ============================================================

/**
 * 도넛 분포용 육질등급 (근내지방도 포함) 버킷 순서.
 * 육량(A/B/C) 은 통합된 형태로 표시.
 */
const GRADE_BUCKETS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1++",
  "1+",
  "1",
  "2",
  "3",
];

/**
 * fine-grained 육질등급 키 (육량 A/B/C 제외 · 도넛/기존 뷰 용).
 * '1++' 는 marbling score 에 따라 1++(9)/1++(8)/1++(7) 로 분리.
 */
function toFineGrade(r: AuctionResult): string {
  const g = (r.grade || "").trim();
  if (!g) return "기타";
  const parsed = parseGradeParts(g, r.marblingScore);
  if (!parsed) return "기타";
  const { quality, marbling } = parsed;
  if (
    quality === "1++" &&
    marbling &&
    (marbling === 9 || marbling === 8 || marbling === 7)
  ) {
    return `1++(${marbling})`;
  }
  return quality;
}

/**
 * FULL 등급 키 · 육량 A/B/C 포함.
 * 예: "1++A(9)", "1++B(9)", "1+A", "2C"
 */
function toFullGrade(r: AuctionResult): string {
  const g = (r.grade || "").trim();
  if (!g) return "기타";
  const parsed = parseGradeParts(g, r.marblingScore);
  if (!parsed) return "기타";
  const { quality, yieldG, marbling } = parsed;
  if (
    quality === "1++" &&
    marbling &&
    (marbling === 9 || marbling === 8 || marbling === 7)
  ) {
    return `${quality}${yieldG}(${marbling})`;
  }
  return `${quality}${yieldG}`;
}

/**
 * grade 문자열 파싱 · quality / yield / marbling 로 분해.
 * 지원 포맷:
 * - "1++A(9)" · quality=1++, yield=A, marbling=9
 * - "1+B"     · quality=1+, yield=B
 * - "2"       · quality=2 (yield 없음)
 */
function parseGradeParts(
  grade: string,
  fallbackMarbling: number | null | undefined,
): { quality: string; yieldG: string; marbling: number | null } | null {
  const match = grade.match(/^(1\+\+|1\+|1|2|3)([A-C])?/);
  if (!match) return null;
  const quality = match[1];
  const yieldG = match[2] ?? "";
  const inline = grade.match(/\((\d)\)/);
  const marbling = inline
    ? Number(inline[1])
    : ((fallbackMarbling ?? null) as number | null);
  return { quality, yieldG, marbling };
}

/**
 * 등급 정렬용 스코어.
 * 육질(1++ > 1+ > 1 > 2 > 3) → 근내지방도(9/8/7/기타) → 육량(A > B > C) 순으로 정렬.
 */
function gradeScore(grade: string): number {
  const match = grade.match(/^(1\+\+|1\+|1|2|3)([A-C])?(?:\((\d)\))?/);
  if (!match) return -1;
  const quality = match[1];
  const yieldG = match[2] || "";
  const marbling = match[3] ? Number(match[3]) : 0;
  const qualityRank =
    (
      { "1++": 100, "1+": 90, "1": 80, "2": 70, "3": 60 } as Record<
        string,
        number
      >
    )[quality] ?? 0;
  const yieldRank =
    ({ A: 3, B: 2, C: 1 } as Record<string, number>)[yieldG] ?? 0;
  return qualityRank * 10000 + marbling * 100 + yieldRank;
}

/**
 * 육량등급 통합용 · A/B/C 를 등급 문자열에서 제거.
 * 예: "1++A(9)" → "1++(9)", "1+B" → "1+", "2A" → "2"
 */
function stripYieldGrade(grade: string): string {
  return grade.replace(/(1\+\+|1\+|1|2|3)([A-C])/, "$1");
}

export interface DistItem {
  name: string;
  count: number;
  pct: number;
  children?: DistItem[];
}

/**
 * 분포 데이터 생성 (도넛 용).
 * '기타' 항목 생성 시 원본 하위 카테고리들을 children 에 담음.
 */
function buildDistribution(
  results: AuctionResult[],
  keyOf: (r: AuctionResult) => string,
  preferredOrder?: string[],
  topN?: number,
): DistItem[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const r of results) {
    if (r.result !== "won") continue;
    const key = keyOf(r);
    map.set(key, (map.get(key) ?? 0) + 1);
    total++;
  }
  if (total === 0) return [];

  const pctOf = (count: number) => Math.round((count / total) * 100);
  const toDistItems = (items: { name: string; count: number }[]): DistItem[] =>
    items
      .sort((a, b) => b.count - a.count)
      .map((e) => ({ name: e.name, count: e.count, pct: pctOf(e.count) }));

  let entries: DistItem[];
  if (preferredOrder) {
    entries = preferredOrder
      .filter((name) => (map.get(name) ?? 0) > 0)
      .map((name) => ({
        name,
        count: map.get(name) ?? 0,
        pct: pctOf(map.get(name) ?? 0),
      }));
    const otherItems = Array.from(map.entries())
      .filter(([k]) => !preferredOrder.includes(k))
      .map(([name, count]) => ({ name, count }));
    const otherCount = otherItems.reduce((sum, e) => sum + e.count, 0);
    if (otherCount > 0) {
      entries.push({
        name: "기타",
        count: otherCount,
        pct: pctOf(otherCount),
        children: toDistItems(otherItems),
      });
    }
  } else {
    const sorted = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    if (topN && sorted.length > topN) {
      const top = sorted.slice(0, topN);
      const restItems = sorted.slice(topN);
      const restCount = restItems.reduce((sum, e) => sum + e.count, 0);
      entries = top.map((e) => ({
        name: e.name,
        count: e.count,
        pct: pctOf(e.count),
      }));
      if (restCount > 0) {
        entries.push({
          name: "기타",
          count: restCount,
          pct: pctOf(restCount),
          children: toDistItems(restItems),
        });
      }
    } else {
      entries = sorted.map((e) => ({
        name: e.name,
        count: e.count,
        pct: pctOf(e.count),
      }));
    }
  }

  return entries;
}

interface BreakdownRow {
  name: string;
  wonCount: number;
  weight: number;
  avgPrice: number;
  totalAmount: number;
}

/**
 * 요일별 낙찰 평균단가 통계 항목.
 * 확장 영역에서 부위별로 계산 · 최상단 카드로 상시 노출 가능.
 */
interface DowStat {
  label: string;
  won: number;
  priceN: number;
  priceSum: number;
  avgPrice: number;
}

const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const emptyDowStats = (): DowStat[] =>
  DOW_LABELS.map((label) => ({
    label,
    won: 0,
    priceN: 0,
    priceSum: 0,
    avgPrice: 0,
  }));

/**
 * 부위 행 데이터 · 각 부위마다 fine-grained 등급별 세부 + 요일별 평균단가 포함.
 * 렌더링 시점에 육량등급 통합 여부에 따라 등급을 재집계.
 */
interface PartRow extends BreakdownRow {
  /** fine-grained (1++(9)/1++(8)/1++(7) 분리) 등급별 세부 */
  gradeItems: BreakdownRow[];
  /** 해당 부위의 요일별 평균 낙찰단가 (7개 요일) */
  dowStats: DowStat[];
}

/**
 * 부위별 낙찰 상세 (등급 세부 + 요일별 평균단가 포함) 데이터 생성.
 * 부위 → 세부등급 (fine-grained) 로 이중 집계 + 부위별 요일 집계.
 */
function buildPartsWithGrades(results: AuctionResult[]): PartRow[] {
  interface Agg {
    wonCount: number;
    weight: number;
    priceSum: number;
    priceN: number;
    totalAmount: number;
  }
  const partMap = new Map<
    string,
    { agg: Agg; grades: Map<string, Agg>; dow: DowStat[] }
  >();
  const emptyAgg = (): Agg => ({
    wonCount: 0,
    weight: 0,
    priceSum: 0,
    priceN: 0,
    totalAmount: 0,
  });
  const addTo = (agg: Agg, r: AuctionResult) => {
    agg.wonCount++;
    agg.weight += r.weight;
    agg.totalAmount += r.totalAmount;
    const price = r.winningBid ?? r.myBid;
    if (price > 0) {
      agg.priceSum += price;
      agg.priceN++;
    }
  };

  for (const r of results) {
    if (r.result !== "won") continue;
    const partName = r.partName || "기타";
    // gradeItems 는 FULL 등급 (육량 A/B/C 포함) · 렌더 시점에 통합 여부에 따라 재집계
    const gradeKey = toFullGrade(r);
    const entry = partMap.get(partName) ?? {
      agg: emptyAgg(),
      grades: new Map<string, Agg>(),
      dow: emptyDowStats(),
    };
    addTo(entry.agg, r);
    const g = entry.grades.get(gradeKey) ?? emptyAgg();
    addTo(g, r);
    entry.grades.set(gradeKey, g);

    if (r.listingDate) {
      const dowIdx = parseISO(r.listingDate).getDay();
      const dowItem = entry.dow[dowIdx];
      dowItem.won++;
      const price = r.winningBid ?? r.myBid;
      if (price > 0) {
        dowItem.priceSum += price;
        dowItem.priceN++;
      }
    }

    partMap.set(partName, entry);
  }

  const toRow = (name: string, a: Agg): BreakdownRow => ({
    name,
    wonCount: a.wonCount,
    weight: a.weight,
    avgPrice: a.priceN > 0 ? Math.round(a.priceSum / a.priceN) : 0,
    totalAmount: a.totalAmount,
  });

  const rows: PartRow[] = Array.from(partMap.entries())
    .map(([name, entry]) => {
      const gradeItems = Array.from(entry.grades.entries())
        .map(([gradeName, agg]) => toRow(gradeName, agg))
        .sort((a, b) => gradeScore(b.name) - gradeScore(a.name));
      const dowStats = entry.dow.map((d) => ({
        ...d,
        avgPrice: d.priceN > 0 ? Math.round(d.priceSum / d.priceN) : 0,
      }));
      return { ...toRow(name, entry.agg), gradeItems, dowStats };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return rows;
}

// ============================================================
// 등급별 낙찰 상세 · 등급 → 부위 이중 집계 (부위별의 반대 방향)
// ============================================================

/**
 * 등급 행 데이터 · 각 등급마다 부위별 세부 + 요일별 평균단가 포함.
 * 상위 등급은 FULL 등급(육량 포함)으로 저장 · 렌더 시점에 육량 통합 여부에 따라 재집계.
 */
interface GradeRow extends BreakdownRow {
  /** 이 등급에서 낙찰된 부위별 세부 */
  partItems: BreakdownRow[];
  /** 이 등급의 요일별 평균 낙찰단가 (7개 요일) */
  dowStats: DowStat[];
}

/**
 * 등급별 낙찰 상세 (부위 세부 + 요일별 평균단가 포함) 데이터 생성.
 * FULL 등급 (예: 1++A(9)) 기준으로 이중 집계 · 육량 통합은 렌더 시점 처리.
 */
function buildGradesWithParts(results: AuctionResult[]): GradeRow[] {
  interface Agg {
    wonCount: number;
    weight: number;
    priceSum: number;
    priceN: number;
    totalAmount: number;
  }
  const emptyAgg = (): Agg => ({
    wonCount: 0,
    weight: 0,
    priceSum: 0,
    priceN: 0,
    totalAmount: 0,
  });
  const addTo = (agg: Agg, r: AuctionResult) => {
    agg.wonCount++;
    agg.weight += r.weight;
    agg.totalAmount += r.totalAmount;
    const price = r.winningBid ?? r.myBid;
    if (price > 0) {
      agg.priceSum += price;
      agg.priceN++;
    }
  };

  const gradeMap = new Map<
    string,
    { agg: Agg; parts: Map<string, Agg>; dow: DowStat[] }
  >();

  for (const r of results) {
    if (r.result !== "won") continue;
    const gradeKey = toFullGrade(r);
    const partKey = r.partName || "기타";
    const entry = gradeMap.get(gradeKey) ?? {
      agg: emptyAgg(),
      parts: new Map<string, Agg>(),
      dow: emptyDowStats(),
    };
    addTo(entry.agg, r);
    const p = entry.parts.get(partKey) ?? emptyAgg();
    addTo(p, r);
    entry.parts.set(partKey, p);

    if (r.listingDate) {
      const dowIdx = parseISO(r.listingDate).getDay();
      const dowItem = entry.dow[dowIdx];
      dowItem.won++;
      const price = r.winningBid ?? r.myBid;
      if (price > 0) {
        dowItem.priceSum += price;
        dowItem.priceN++;
      }
    }

    gradeMap.set(gradeKey, entry);
  }

  const toRow = (name: string, a: Agg): BreakdownRow => ({
    name,
    wonCount: a.wonCount,
    weight: a.weight,
    avgPrice: a.priceN > 0 ? Math.round(a.priceSum / a.priceN) : 0,
    totalAmount: a.totalAmount,
  });

  return Array.from(gradeMap.entries())
    .map(([name, entry]) => {
      const partItems = Array.from(entry.parts.entries())
        .map(([partName, agg]) => toRow(partName, agg))
        .sort((a, b) => b.totalAmount - a.totalAmount);
      const dowStats = entry.dow.map((d) => ({
        ...d,
        avgPrice: d.priceN > 0 ? Math.round(d.priceSum / d.priceN) : 0,
      }));
      return { ...toRow(name, entry.agg), partItems, dowStats };
    })
    .sort((a, b) => gradeScore(b.name) - gradeScore(a.name));
}

/**
 * 등급 행 리스트를 육량등급 통합 여부에 맞춰 재집계.
 *
 * - yieldUnified=false: FULL 등급 그대로 (1++A(9), 1++B(9), 1++C(9), ...)
 * - yieldUnified=true : 육량 A/B/C 제거 후 병합 (1++(9), 1++(8), 1++, 1+, ...)
 *
 * 통합 시:
 * - 최상위 등급 합계 (건/중량/총액) 는 합산
 * - 평균단가는 낙찰건 가중평균
 * - 하위 부위 리스트는 partName 기준 재집계 (가중평균)
 * - 요일별 통계는 요일 인덱스 기준 합산 후 재계산
 */
function aggregateGradeRowsByYield(
  rows: GradeRow[],
  yieldUnified: boolean,
): GradeRow[] {
  if (!yieldUnified) return rows;

  interface PartAcc {
    wonCount: number;
    weight: number;
    priceSumWeighted: number;
    priceCount: number;
    totalAmount: number;
  }
  interface DowAcc {
    label: string;
    won: number;
    priceSum: number;
    priceN: number;
  }
  interface GradeAcc {
    wonCount: number;
    weight: number;
    priceSumWeighted: number;
    priceCount: number;
    totalAmount: number;
    parts: Map<string, PartAcc>;
    dow: DowAcc[];
  }
  const emptyGradeAcc = (): GradeAcc => ({
    wonCount: 0,
    weight: 0,
    priceSumWeighted: 0,
    priceCount: 0,
    totalAmount: 0,
    parts: new Map(),
    dow: DOW_LABELS.map((label) => ({ label, won: 0, priceSum: 0, priceN: 0 })),
  });

  const merged = new Map<string, GradeAcc>();
  for (const row of rows) {
    const key = stripYieldGrade(row.name);
    const cur = merged.get(key) ?? emptyGradeAcc();
    cur.wonCount += row.wonCount;
    cur.weight += row.weight;
    cur.priceSumWeighted += row.avgPrice * row.wonCount;
    cur.priceCount += row.wonCount;
    cur.totalAmount += row.totalAmount;
    for (const p of row.partItems) {
      const pp = cur.parts.get(p.name) ?? {
        wonCount: 0,
        weight: 0,
        priceSumWeighted: 0,
        priceCount: 0,
        totalAmount: 0,
      };
      pp.wonCount += p.wonCount;
      pp.weight += p.weight;
      pp.priceSumWeighted += p.avgPrice * p.wonCount;
      pp.priceCount += p.wonCount;
      pp.totalAmount += p.totalAmount;
      cur.parts.set(p.name, pp);
    }
    for (let i = 0; i < 7; i++) {
      cur.dow[i].won += row.dowStats[i].won;
      cur.dow[i].priceSum += row.dowStats[i].priceSum;
      cur.dow[i].priceN += row.dowStats[i].priceN;
    }
    merged.set(key, cur);
  }

  return Array.from(merged.entries())
    .map(([name, v]) => {
      const partItems: BreakdownRow[] = Array.from(v.parts.entries())
        .map(([partName, p]) => ({
          name: partName,
          wonCount: p.wonCount,
          weight: p.weight,
          avgPrice:
            p.priceCount > 0
              ? Math.round(p.priceSumWeighted / p.priceCount)
              : 0,
          totalAmount: p.totalAmount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);
      const dowStats: DowStat[] = v.dow.map((d) => ({
        label: d.label,
        won: d.won,
        priceSum: d.priceSum,
        priceN: d.priceN,
        avgPrice: d.priceN > 0 ? Math.round(d.priceSum / d.priceN) : 0,
      }));
      return {
        name,
        wonCount: v.wonCount,
        weight: v.weight,
        avgPrice:
          v.priceCount > 0 ? Math.round(v.priceSumWeighted / v.priceCount) : 0,
        totalAmount: v.totalAmount,
        partItems,
        dowStats,
      };
    })
    .sort((a, b) => gradeScore(b.name) - gradeScore(a.name));
}

/**
 * 세부 등급 리스트를 육량등급 통합 여부에 맞춰 재집계.
 *
 * - yieldUnified=false (기본): FULL 등급 그대로 · 예) 1++A(9), 1++B(9), 1++C(9)
 * - yieldUnified=true: 육량(A/B/C) 을 제거하고 병합 · 예) 1++(9) 하나로
 *
 * 평균단가는 낙찰건 가중평균으로 병합.
 */
function aggregateGradesForDisplay(
  items: BreakdownRow[],
  yieldUnified: boolean,
): BreakdownRow[] {
  if (!yieldUnified) return items;
  interface Sum extends BreakdownRow {
    priceSumWeighted: number;
    priceCount: number;
  }
  const merged = new Map<string, Sum>();
  for (const item of items) {
    const key = stripYieldGrade(item.name);
    const cur = merged.get(key);
    if (!cur) {
      merged.set(key, {
        name: key,
        wonCount: item.wonCount,
        weight: item.weight,
        avgPrice: item.avgPrice,
        totalAmount: item.totalAmount,
        priceSumWeighted: item.avgPrice * item.wonCount,
        priceCount: item.wonCount,
      });
    } else {
      cur.wonCount += item.wonCount;
      cur.weight += item.weight;
      cur.totalAmount += item.totalAmount;
      cur.priceSumWeighted += item.avgPrice * item.wonCount;
      cur.priceCount += item.wonCount;
      cur.avgPrice =
        cur.priceCount > 0
          ? Math.round(cur.priceSumWeighted / cur.priceCount)
          : 0;
    }
  }
  return Array.from(merged.values())
    .map(({ name, wonCount, weight, avgPrice, totalAmount }) => ({
      name,
      wonCount,
      weight,
      avgPrice,
      totalAmount,
    }))
    .sort((a, b) => gradeScore(b.name) - gradeScore(a.name));
}

// ============================================================
// 뷰 · 카드 · 테이블 · 차트
// ============================================================

/**
 * 도넛 조각 색 · 무채색 사다리 일곱 단 · 큰 조각이 진하다.
 *
 * recharts 는 SVG `fill` 에 값을 직접 받으므로 CSS 변수 토큰을 못 쓴다. 그래서
 * 명암마다 한 벌씩 손으로 적어 두고 훅이 고른다 (`PartMarketChart` 가 캔버스에
 * 색을 칠하는 방식과 같다). 값은 `globals.css` 의 글자 사다리에서 따왔지만 그대로
 * 쓰지는 않았다 — 다크의 `content-soft`(#9898a3)와 `content-faint`(#8d8d98)는
 * 글자로는 갈라지는 두 단계라도 면으로 나란히 놓으면 한 색으로 보인다.
 */
const DONUT_PALETTE_LIGHT = [
  "#17171c",
  "#3d3d46",
  "#6e6e7a",
  "#9494a0",
  "#b8b8c2",
  "#d4d4dc",
  "#e8e8ee",
];

const DONUT_PALETTE_DARK = [
  "#f2f2f5",
  "#cbcbd3",
  "#a3a3ae",
  "#7d7d8a",
  "#5c5c68",
  "#41414b",
  "#2f2f38",
];

/** 조각 사이 실선 · 패널 면과 같은 색이라야 「붙어 있지 않다」 로만 읽힌다 */
const DONUT_STROKE = { light: "#ffffff", dark: "#17171c" } as const;

function useDonutPalette() {
  const theme = useAppTheme();
  return theme === "dark"
    ? { colors: DONUT_PALETTE_DARK, stroke: DONUT_STROKE.dark }
    : { colors: DONUT_PALETTE_LIGHT, stroke: DONUT_STROKE.light };
}

/**
 * 요일별 평균 낙찰단가 인라인 차트 (확장 영역 임베드용).
 *
 * 막대 톤:
 * - 최고 평균단가 요일 : 반전면 · 한 눈에 집히는 단 하나
 * - 나머지             : 최댓값 대비 비율에 따라 글자 사다리 세 단
 * - 표본 3건 미만      : 제일 묽게 · 숫자는 적되 믿을 것은 못 된다
 * - 자료 없음          : 막대 없이 점선 바닥만
 */
function InlineDowAvgPriceChart({ stats }: { stats: DowStat[] }) {
  const maxPrice = Math.max(0, ...stats.map((s) => s.avgPrice));
  const bestDow = stats.reduce(
    (best, cur) => (cur.avgPrice > best.avgPrice ? cur : best),
    stats[0],
  );
  const hasData = stats.some((s) => s.avgPrice > 0);

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] font-bold text-content">
          요일별 평균 낙찰단가
        </span>
        {hasData && bestDow.avgPrice > 0 ? (
          <span className="text-[11px] tabular-nums text-content-soft">
            최고{" "}
            <span className="font-bold text-content">{bestDow.label}요일</span>{" "}
            <span className="text-content-faint">
              ({KRW.format(bestDow.avgPrice)}원/kg)
            </span>
          </span>
        ) : null}
      </div>
      {hasData ? (
        <div className="grid grid-cols-7 items-end gap-2 pt-3">
          {stats.map((s) => {
            const insufficient = s.priceN < 3 && s.priceN > 0;
            const noData = s.priceN === 0;
            const ratio =
              s.avgPrice > 0 && maxPrice > 0 ? s.avgPrice / maxPrice : 0;
            const heightPct = ratio * 100;
            const isBest =
              s.avgPrice > 0 &&
              bestDow &&
              s.label === bestDow.label &&
              !insufficient;
            /*
             * 최댓값에 가까울수록 진하다 · 색은 하나도 안 쓴다.
             *
             * 글자색 토큰을 면으로 쓰는 건 밝기 사다리가 이미 거기 있어서다.
             * 명암을 뒤집으면 `--content-*` 가 통째로 뒤집히므로, 어두운 바탕에서도
             * 「진한 막대 = 높은 값」 이 그대로 뒤집혀 선다.
             */
            const dataBarClass = isBest
              ? "bg-inverse"
              : insufficient
                ? "bg-content-ghost"
                : ratio >= 0.9
                  ? "bg-content-mid"
                  : ratio >= 0.75
                    ? "bg-content-soft"
                    : "bg-content-faint";
            return (
              <div
                key={s.label}
                className="flex flex-col items-center gap-1"
                title={
                  s.avgPrice > 0
                    ? `${s.label}요일 · 평균 ${KRW.format(s.avgPrice)}원/kg · 낙찰 ${s.won}건`
                    : `${s.label}요일 · 데이터 없음`
                }
              >
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums",
                    noData
                      ? "text-content-ghost"
                      : insufficient
                        ? "text-content-faint"
                        : isBest
                          ? "text-content"
                          : "text-content-mid",
                  )}
                >
                  {s.avgPrice > 0 ? KRW.format(s.avgPrice) : "-"}
                </span>
                <div
                  className={cn(
                    "relative h-16 w-full min-w-0",
                    noData
                      ? "border-b border-dashed border-line"
                      : "bg-surface-muted",
                  )}
                >
                  {!noData ? (
                    <div
                      className={cn(
                        "absolute inset-x-0 bottom-0 transition-all",
                        dataBarClass,
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-[10.5px] font-semibold",
                    isBest ? "text-content" : "text-content-soft",
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-[11px] text-content-faint">
          해당 부위의 낙찰 데이터가 없습니다.
        </div>
      )}
    </div>
  );
}

// ============================================================
// 낙찰 상세 통합 컴포넌트 · 부위별 / 등급별 탭
// ============================================================

type BreakdownTab = "parts" | "grades";

/**
 * 부위별 / 등급별 낙찰 상세 통합 테이블.
 *
 * - 상단 헤더: 탭(부위별/등급별) + 항목 수 + 육량등급 통합 토글 (전역 공유)
 * - 각 행 클릭 시 확장:
 *   - 부위별 → 등급별 낙찰 상세 + 요일별 평균단가 (해당 부위)
 *   - 등급별 → 부위별 낙찰 상세 + 요일별 평균단가 (해당 등급)
 * - 육량등급 통합 체크 시:
 *   - 부위별 뷰: 확장 영역 등급이 1++A(9)+1++B(9)+1++C(9) → 1++(9) 로 병합
 *   - 등급별 뷰: 최상위 등급 자체가 1++A(9),1++B(9),1++C(9) → 1++(9) 로 병합
 */
function PartsGradesBreakdown({
  partsRows,
  gradesRows,
}: {
  partsRows: PartRow[];
  gradesRows: GradeRow[];
}) {
  const [tab, setTab] = useState<BreakdownTab>("parts");
  const [yieldUnified, setYieldUnified] = useState(true);
  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());

  const displayedGrades = useMemo(
    () => aggregateGradeRowsByYield(gradesRows, yieldUnified),
    [gradesRows, yieldUnified],
  );

  const rows = tab === "parts" ? partsRows : displayedGrades;
  const nameLabel = tab === "parts" ? "부위" : "등급";
  const countUnit = tab === "parts" ? "개 부위" : "개 등급";

  const toggleExpansion = (name: string) => {
    const setter = tab === "parts" ? setExpandedParts : setExpandedGrades;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const isExpanded = (name: string) =>
    (tab === "parts" ? expandedParts : expandedGrades).has(name);

  return (
    <div className={cn("flex flex-col", SURFACE_SHELL_CLASS)}>
      {/* 머리 · 탭 + 건수 + 육량 통합 토글 (두 탭이 함께 쓴다) */}
      <header className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-1.5">
        <div className="flex items-center gap-0.5">
          <TabButton
            active={tab === "parts"}
            onClick={() => setTab("parts")}
            label="부위별"
          />
          <TabButton
            active={tab === "grades"}
            onClick={() => setTab("grades")}
            label="등급별"
          />
        </div>
        <div className="flex items-center gap-4">
          {rows.length > 0 ? (
            <span className="text-[11px] tabular-nums text-content-faint">
              {rows.length}
              {countUnit}
            </span>
          ) : null}
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-content-mid">
            <input
              type="checkbox"
              checked={yieldUnified}
              onChange={(e) => setYieldUnified(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-inverse"
            />
            육량등급 통합
          </label>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="flex h-[140px] items-center justify-center text-[12px] text-content-faint">
          표시할 데이터가 없습니다.
        </div>
      ) : (
        <table className="w-full text-[12px] tabular-nums">
          <thead>
            <tr className="border-b border-line bg-surface-muted text-[11px] font-medium text-content-faint">
              <th className="px-3 py-2 text-left">{nameLabel}</th>
              <th className="px-3 py-2 text-right">낙찰건</th>
              <th className="px-3 py-2 text-right">낙찰중량</th>
              <th className="px-3 py-2 text-right">평균단가</th>
              <th className="px-3 py-2 text-right">낙찰금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const open = isExpanded(row.name);
              return (
                <Fragment key={row.name}>
                  <tr
                    onClick={() => toggleExpansion(row.name)}
                    className={cn(
                      "cursor-pointer border-b border-line-soft transition-colors last:border-b-0",
                      open ? "bg-surface-accent" : "hover:bg-surface-muted",
                    )}
                  >
                    <td className="truncate px-3 py-2 text-left font-semibold text-content">
                      <span className="inline-flex items-center gap-1.5">
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5 text-content-soft" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-content-faint" />
                        )}
                        {row.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-content-mid">
                      {row.wonCount}건
                    </td>
                    <td className="px-3 py-2 text-right text-content-mid">
                      {KRW.format(row.weight)}kg
                    </td>
                    <td className="px-3 py-2 text-right text-content-mid">
                      {row.avgPrice > 0 ? KRW.format(row.avgPrice) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-content">
                      {formatWon(row.totalAmount)}
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-b border-line-soft last:border-b-0">
                      <td
                        colSpan={5}
                        className="border-l-2 border-inverse bg-surface-muted px-4 py-4"
                      >
                        <ExpansionBody
                          row={row}
                          tab={tab}
                          yieldUnified={yieldUnified}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * 탭 머리 단추 · 고른 것만 먹색 + 밑줄 · 나머지는 흐리게.
 */
function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex h-8 items-center px-3 text-[13px] font-bold transition-colors",
        active ? "text-content" : "text-content-faint hover:text-content-mid",
      )}
      aria-pressed={active}
    >
      {label}
      {active ? (
        <span
          className="absolute inset-x-2 -bottom-[11px] h-[2px] bg-inverse"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

/**
 * 확장 영역 통합 본체 (Option A · KPI 스트립 + 정돈된 리스트 + 요일차트).
 *
 * 구성:
 * - 상단: KPI 스트립 4개 (최다·최고 평균단가·총 낙찰금액·최고 요일).
 * - 하단: 2열 그리드 · 좌 = 슬림 리스트, 우 = 요일별 차트.
 */
function ExpansionBody({
  row,
  tab,
  yieldUnified,
}: {
  row: PartRow | GradeRow;
  tab: BreakdownTab;
  yieldUnified: boolean;
}) {
  const items = useMemo<BreakdownRow[]>(
    () =>
      tab === "parts"
        ? aggregateGradesForDisplay((row as PartRow).gradeItems, yieldUnified)
        : (row as GradeRow).partItems,
    [row, tab, yieldUnified],
  );

  const innerLabel = tab === "parts" ? "등급" : "부위";

  return (
    <div className="flex flex-col gap-4">
      <ExpansionKpiStrip
        items={items}
        totalAmount={row.totalAmount}
        totalWonCount={row.wonCount}
        totalWeight={row.weight}
        dowStats={row.dowStats}
        innerLabel={innerLabel}
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* 좌 · 세부 breakdown */}
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-bold text-content">
              {innerLabel}별 낙찰 상세
            </span>
            <span className="text-[11px] tabular-nums text-content-faint">
              총 {row.wonCount}건
            </span>
          </div>
          <BreakdownItemList
            items={items}
            parentWonCount={row.wonCount}
            emptyMessage={`${innerLabel} 데이터가 없습니다.`}
          />
        </section>

        {/* 우 · 요일별 평균 낙찰단가 */}
        <section className="lg:border-l lg:border-line lg:pl-8">
          <InlineDowAvgPriceChart stats={row.dowStats} />
        </section>
      </div>
    </div>
  );
}

/**
 * 확장 영역 상단 KPI 스트립 · 4개 요약 카드.
 *
 * - 최다 낙찰: 건수 기준 top 등급/부위 + %
 * - 최고 평균단가: 세부 항목 중 avgPrice 최대
 * - 총 낙찰금액: 부위/등급 전체 합계 (부모행) + 총 건수 · 중량
 * - 최고 요일: 요일별 평균단가 최고
 */
function ExpansionKpiStrip({
  items,
  totalAmount,
  totalWonCount,
  totalWeight,
  dowStats,
  innerLabel,
}: {
  items: BreakdownRow[];
  totalAmount: number;
  totalWonCount: number;
  totalWeight: number;
  dowStats: DowStat[];
  innerLabel: string;
}) {
  // 최다 낙찰 (건수) · 동수일 경우 등장 순서 유지
  const topByCount = useMemo(
    () =>
      items.reduce<BreakdownRow | null>(
        (best, cur) => (!best || cur.wonCount > best.wonCount ? cur : best),
        null,
      ),
    [items],
  );

  // 최고 평균단가
  const topByPrice = useMemo(
    () =>
      items.reduce<BreakdownRow | null>(
        (best, cur) =>
          cur.avgPrice > 0 && (!best || cur.avgPrice > best.avgPrice)
            ? cur
            : best,
        null,
      ),
    [items],
  );

  // 최고 요일
  const bestDow = useMemo(
    () =>
      dowStats.reduce<DowStat | null>(
        (best, cur) =>
          cur.avgPrice > 0 && (!best || cur.avgPrice > best.avgPrice)
            ? cur
            : best,
        null,
      ),
    [dowStats],
  );

  const topPct =
    topByCount && totalWonCount > 0
      ? Math.round((topByCount.wonCount / totalWonCount) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <ExpansionKpiCard
        label={`최다 낙찰 ${innerLabel}`}
        value={topByCount?.name ?? "-"}
        sub={
          topByCount ? `${topByCount.wonCount}건 · ${topPct}%` : "데이터 없음"
        }
      />
      <ExpansionKpiCard
        label={`최고 평균단가`}
        value={
          topByPrice && topByPrice.avgPrice > 0
            ? `${KRW.format(topByPrice.avgPrice)}원/kg`
            : "-"
        }
        sub={
          topByPrice && topByPrice.avgPrice > 0
            ? `${innerLabel} · ${topByPrice.name}`
            : "데이터 없음"
        }
      />
      <ExpansionKpiCard
        label="총 낙찰금액"
        value={formatWon(totalAmount)}
        sub={
          totalWonCount > 0
            ? `${totalWonCount}건 · ${KRW.format(totalWeight)}kg`
            : "-"
        }
      />
      <ExpansionKpiCard
        label="최고 요일"
        value={bestDow ? `${bestDow.label}요일` : "-"}
        sub={
          bestDow && bestDow.avgPrice > 0
            ? `${KRW.format(bestDow.avgPrice)}원/kg`
            : "데이터 없음"
        }
      />
    </div>
  );
}

/**
 * 확장 영역 전용 KPI 요약 카드 · 라벨 · 값 · 서브 텍스트의 3단 위계.
 * (상위 요약용 `KpiCard` 와 이름 충돌 방지를 위해 `ExpansionKpiCard` 로 분리)
 */
function ExpansionKpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5 px-3 py-2.5",
        SURFACE_SHELL_CLASS,
      )}
    >
      <span className="text-[11px] font-medium text-content-faint">
        {label}
      </span>
      <span
        className="truncate text-[14px] font-bold leading-tight tabular-nums text-content"
        title={value}
      >
        {value}
      </span>
      {sub ? (
        <span
          className="truncate text-[10.5px] tabular-nums text-content-soft"
          title={sub}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
}

/**
 * 확장 영역 세부 breakdown 리스트 (부위 또는 등급 공용).
 *
 * 슬림 4열: [컬러칩+이름] · [프로그래스 바 넓게] · [건수] · [낙찰금액].
 * 평균단가 · 중량은 `title` 툴팁으로 이동해서 스캔 밀도 감소.
 */
function BreakdownItemList({
  items,
  parentWonCount,
  emptyMessage,
}: {
  items: BreakdownRow[];
  parentWonCount: number;
  emptyMessage: string;
}) {
  const { colors: palette } = useDonutPalette();

  if (items.length === 0) {
    return (
      <div className="py-2 text-[11px] text-content-faint">{emptyMessage}</div>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((g, i) => {
        const pct =
          parentWonCount > 0
            ? Math.round((g.wonCount / parentWonCount) * 100)
            : 0;
        const color = palette[i % palette.length];
        const tooltip = `${g.name} · ${g.wonCount}건 (${pct}%) · ${KRW.format(g.weight)}kg · 평균 ${g.avgPrice > 0 ? `${KRW.format(g.avgPrice)}원/kg` : "-"} · ${formatWon(g.totalAmount)}`;
        return (
          <li
            key={g.name}
            title={tooltip}
            className="grid grid-cols-[14px_80px_minmax(60px,1fr)_72px_100px] items-center gap-2.5 py-1.5 text-[11.5px] tabular-nums"
          >
            <span
              className="h-2.5 w-2.5"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="min-w-0 truncate font-bold text-content">
              {g.name}
            </span>
            <div className="relative h-2 w-full min-w-0 bg-surface-accent">
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-right">
              <span className="font-bold text-content">{g.wonCount}</span>
              <span className="ml-0.5 text-[10px] text-content-faint">건</span>
              <span className="ml-1 text-[10px] text-content-faint">
                ({pct}%)
              </span>
            </span>
            <span className="text-right font-bold text-content">
              {formatWon(g.totalAmount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DonutCard({
  title,
  data,
}: {
  title: string;
  data: DistItem[];
}) {
  const { colors, stroke } = useDonutPalette();
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.count, 0),
    [data],
  );
  return (
    <div className={SURFACE_SHELL_CLASS}>
      <SectionHeader
        title={title}
        right={
          <span className="text-[11px] tabular-nums text-content-faint">
            {total > 0 ? `${total}건` : "-"}
          </span>
        }
      />
      <div className="p-4">
        {data.length === 0 || total === 0 ? (
          <div className="flex h-[180px] items-center justify-center text-[12px] text-content-faint">
            표시할 데이터가 없습니다.
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <div className="h-[140px] w-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    stroke={stroke}
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {data.map((entry, i) => (
                      <Cell key={entry.name} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {data.map((entry, i) => {
                const hasChildren = entry.children && entry.children.length > 0;
                return (
                  <li
                    key={entry.name}
                    className="group relative flex items-center gap-2 text-[11.5px]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0"
                      style={{
                        backgroundColor: colors[i % colors.length],
                      }}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        hasChildren
                          ? "cursor-help text-content-mid underline decoration-content-faint decoration-dotted underline-offset-2"
                          : "text-content-mid",
                      )}
                      title={
                        hasChildren
                          ? entry
                              .children!.map(
                                (c) => `${c.name} · ${c.count}건 (${c.pct}%)`,
                              )
                              .join("\n")
                          : entry.name
                      }
                    >
                      {entry.name}
                    </span>
                    <span className="shrink-0 tabular-nums font-bold text-content">
                      {entry.pct}%
                    </span>
                    {hasChildren ? (
                      <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden min-w-[180px] border border-line bg-surface p-2 text-[11px] shadow-lg group-hover:block">
                        <div className="mb-1 text-[11px] font-medium text-content-faint">
                          기타 상세
                        </div>
                        <ul className="flex flex-col gap-0.5 tabular-nums">
                          {entry.children!.map((c) => (
                            <li
                              key={c.name}
                              className="flex items-center justify-between gap-3"
                            >
                              <span className="truncate text-content-mid">
                                {c.name}
                              </span>
                              <span className="shrink-0 text-content-soft">
                                <span className="font-semibold text-content">
                                  {c.count}건
                                </span>
                                <span className="ml-1 text-content-faint">
                                  ({c.pct}%)
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-1.5">
      <span className="text-[13px] font-bold text-content">{title}</span>
      {right}
    </header>
  );
}

interface TooltipPayloadItem {
  color?: string;
  name?: string;
  value?: number;
  payload?: { pct?: number; children?: DistItem[] };
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const name = item?.name ?? "";
  const count = item?.value ?? 0;
  const pct = item?.payload?.pct ?? 0;
  const children = item?.payload?.children;
  return (
    <div className={cn("px-3 py-2 shadow-lg", SURFACE_SHELL_CLASS)}>
      <div className="text-[11px] font-bold text-content">{name}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5 text-[12px] tabular-nums">
        <span className="font-bold text-content">{KRW.format(count)}건</span>
        <span className="text-content-soft">({pct}%)</span>
      </div>
      {children && children.length > 0 ? (
        <div className="mt-2 border-t border-line-soft pt-1.5">
          <div className="mb-1 text-[11px] font-medium text-content-faint">
            상세
          </div>
          <ul className="flex flex-col gap-0.5 text-[11px] tabular-nums">
            {children.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate text-content-mid">{c.name}</span>
                <span className="shrink-0 text-content-soft">
                  <span className="font-semibold text-content">
                    {c.count}건
                  </span>
                  <span className="ml-1 text-content-faint">({c.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
