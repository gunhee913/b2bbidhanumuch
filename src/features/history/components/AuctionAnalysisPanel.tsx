"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuctionResult } from "@/features/bids/types";
import { formatWon } from "@/features/live-auction/lib/masking";
import { PeriodFilter } from "./PeriodFilter";

export interface AuctionAnalysisPanelProps {
  results: AuctionResult[];
  isLoading: boolean;
}

const KRW = new Intl.NumberFormat("ko-KR");

/**
 * 경매 분석 대시보드 · 딜러 본인 경매내역 데이터 시각화.
 *
 * 섹션 구성:
 * 1. 기간 필터 (프리셋 이번주~올해)
 * 2. KPI 8 카드 · 참여 · 낙찰 성과 지표 · 일부 카드에 sparkline
 * 3. 회차별 낙찰률 (1/2/3차) + 요일별 낙찰 패턴
 * 4. 부위별 / 등급별 낙찰단가 테이블
 * 5. 분포 도넛 (등급/부위/가공업체)
 * 6. 미낙찰 분석 (TOP 5 부위 · 등급)
 */
export function AuctionAnalysisPanel({
  results,
  isLoading,
}: AuctionAnalysisPanelProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [searchStart, setSearchStart] = useState(monthAgo);
  const [searchEnd, setSearchEnd] = useState(today);

  const filtered = useMemo(
    () =>
      results.filter((r) => {
        if (!r.listingDate) return true;
        return r.listingDate >= searchStart && r.listingDate <= searchEnd;
      }),
    [results, searchStart, searchEnd],
  );

  /**
   * KPI 지표 · 참여 · 낙찰 · 단가 · 중량 · 참여일수 등 딜러 성과 종합.
   */
  const kpi = useMemo(() => {
    let wonCount = 0;
    let lostCount = 0;
    let wonAmount = 0;
    let wonWeight = 0;
    let wonPriceSum = 0;
    let wonPriceN = 0;
    let maxWinPrice = 0;
    const participatedDates = new Set<string>();
    const wonDates = new Set<string>();
    for (const r of filtered) {
      if (r.listingDate) participatedDates.add(r.listingDate);
      if (r.result === "won") {
        wonCount++;
        wonAmount += r.totalAmount;
        wonWeight += r.weight;
        const price = r.winningBid ?? r.myBid;
        if (price > 0) {
          wonPriceSum += price;
          wonPriceN++;
          if (price > maxWinPrice) maxWinPrice = price;
        }
        if (r.listingDate) wonDates.add(r.listingDate);
      } else {
        lostCount++;
      }
    }
    const total = wonCount + lostCount;
    const winRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;
    const avgWinPrice =
      wonPriceN > 0 ? Math.round(wonPriceSum / wonPriceN) : 0;
    const dailyAvgWonAmount =
      wonDates.size > 0 ? Math.round(wonAmount / wonDates.size) : 0;

    return {
      total,
      wonCount,
      lostCount,
      wonAmount,
      wonWeight,
      avgWinPrice,
      maxWinPrice,
      winRate,
      participatedDayCount: participatedDates.size,
      dailyAvgWonAmount,
    };
  }, [filtered]);

  /**
   * P2 · 회차별 낙찰률 · 1/2/3차 각각 낙찰건수 / 참여건수 / 낙찰률.
   */
  const roundStats = useMemo(() => {
    const stats: Record<
      number,
      { won: number; total: number; rate: number }
    > = {
      1: { won: 0, total: 0, rate: 0 },
      2: { won: 0, total: 0, rate: 0 },
      3: { won: 0, total: 0, rate: 0 },
    };
    for (const r of filtered) {
      const round = r.roundNo;
      if (round !== 1 && round !== 2 && round !== 3) continue;
      stats[round].total++;
      if (r.result === "won") stats[round].won++;
    }
    for (const k of [1, 2, 3] as const) {
      const s = stats[k];
      s.rate = s.total > 0 ? Math.round((s.won / s.total) * 100) : 0;
    }
    return stats;
  }, [filtered]);

  /**
   * P3 · 부위별 낙찰 상세 (전체 부위).
   * 각 부위 행에는 세부 등급별 breakdown 이 포함됨 · 행 클릭 시 확장.
   * 세부 등급은 fine-grained (1++(9)/1++(8)/1++(7) 분리) 로 저장 · 렌더 시점에 통합 여부 선택.
   */
  const partsBreakdown = useMemo(
    () => buildPartsWithGrades(filtered),
    [filtered],
  );

  /** 등급별 낙찰 상세 · fine-grained · TOP 8 (총액 기준) */
  const gradesBreakdown = useMemo(
    () => buildBreakdown(filtered, (r) => toFineGrade(r), 8),
    [filtered],
  );

  /**
   * P4 · 미낙찰 분석 · 부위 기준 두 가지 관점.
   * - freqLost: 자주 놓치는 부위 (미낙찰 건수 desc)
   * - highRate: 미낙찰율 높은 부위 (미낙찰 비율 desc · 표본 3건 이상 필터)
   */
  const lostParts = useMemo(() => {
    const map = new Map<
      string,
      { total: number; lost: number; rate: number }
    >();
    for (const r of filtered) {
      const key = r.partName || "기타";
      const p = map.get(key) ?? { total: 0, lost: 0, rate: 0 };
      p.total++;
      if (r.result === "lost") p.lost++;
      map.set(key, p);
    }
    const arr = Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        total: v.total,
        lost: v.lost,
        rate: v.total > 0 ? Math.round((v.lost / v.total) * 100) : 0,
      }))
      .filter((e) => e.lost > 0);

    const freqLost = [...arr].sort((a, b) => b.lost - a.lost).slice(0, 5);
    const highRate = [...arr]
      .filter((e) => e.total >= 3)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    return { freqLost, highRate };
  }, [filtered]);

  /** 분포 도넛 · 등급 · 부위 · 가공업체 */
  const gradeDist = useMemo(
    () => buildDistribution(filtered, toFineGrade, GRADE_BUCKETS),
    [filtered],
  );

  const partDist = useMemo(
    () => buildDistribution(filtered, (r) => r.partName || "기타", undefined, 6),
    [filtered],
  );
  const companyDist = useMemo(
    () =>
      buildDistribution(
        filtered,
        (r) => r.companyName || "미지정",
        undefined,
        6,
      ),
    [filtered],
  );

  return (
    <div className="grid gap-4">
      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        onChange={({ startDate: s, endDate: e }) => {
          setStartDate(s);
          setEndDate(e);
        }}
        onSearch={() => {
          setSearchStart(startDate);
          setSearchEnd(endDate);
        }}
      />

      {/* 요약 KPI · 4개 · 참여 · 성과 · 단가 · 규모 */}
      <div className="grid grid-cols-4 gap-2">
        <KpiCard
          label="입찰 건수"
          value={isLoading ? "-" : `${kpi.total}건`}
          hint={
            isLoading
              ? " "
              : `낙찰 ${kpi.wonCount} · 미낙찰 ${kpi.lostCount}`
          }
        />
        <KpiCard
          label="낙찰률"
          value={isLoading ? "-" : `${kpi.winRate}%`}
          tone="sky"
          hint={isLoading ? " " : `${kpi.wonCount} / ${kpi.total} 건`}
        />
        <KpiCard
          label="평균 낙찰단가"
          value={
            isLoading
              ? "-"
              : kpi.avgWinPrice > 0
                ? `${KRW.format(kpi.avgWinPrice)}원/kg`
                : "-"
          }
        />
        <KpiCard
          label="총 낙찰금액"
          value={isLoading ? "-" : formatWon(kpi.wonAmount)}
          tone="sky"
        />
      </div>

      {/* 분포 도넛 · 등급 / 부위 / 가공업체 */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DonutCard title="등급 분포" data={gradeDist} />
        <DonutCard title="부위 분포" data={partDist} />
        <DonutCard title="가공업체 분포" data={companyDist} />
      </div>

      {/* 부위별 낙찰 상세 · 전체 부위 · 행 클릭 시 등급별 breakdown 확장 */}
      <PartsBreakdownTable rows={partsBreakdown} />

      {/* 회차별 낙찰률 · 요일별 평균단가는 부위 확장 영역에서 부위별로 노출 */}
      <RoundRateCard stats={roundStats} />

      {/* 등급별 낙찰 상세 · 풀 폭 */}
      <BreakdownTable
        title="등급별 낙찰 상세"
        rows={gradesBreakdown}
        nameLabel="등급"
      />

      {/* 미낙찰 분석 · 최하단 · 자주놓침 + 미낙찰율 높음 */}
      <div className="grid gap-3 md:grid-cols-2">
        <LostTable
          title="자주 놓치는 부위 TOP 5"
          rows={lostParts.freqLost}
          nameLabel="부위"
          hint="미낙찰 건수 기준"
        />
        <LostTable
          title="미낙찰율 높은 부위 TOP 5"
          rows={lostParts.highRate}
          nameLabel="부위"
          hint="표본 3건 이상 · 미낙찰 비율 기준"
        />
      </div>
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
  if (quality === "1++" && marbling && (marbling === 9 || marbling === 8 || marbling === 7)) {
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
  if (quality === "1++" && marbling && (marbling === 9 || marbling === 8 || marbling === 7)) {
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
    : (fallbackMarbling ?? null) as number | null;
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
    ({ "1++": 100, "1+": 90, "1": 80, "2": 70, "3": 60 } as Record<
      string,
      number
    >)[quality] ?? 0;
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

interface DistItem {
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
 * P3 · 부위/등급별 낙찰 상세 데이터 생성.
 * 낙찰건 기준으로 건수/중량/평균단가/총액을 집계, TOP N + 기타로 반환.
 */
function buildBreakdown(
  results: AuctionResult[],
  keyOf: (r: AuctionResult) => string,
  topN?: number,
): BreakdownRow[] {
  const map = new Map<
    string,
    {
      wonCount: number;
      weight: number;
      priceSum: number;
      priceN: number;
      totalAmount: number;
    }
  >();
  for (const r of results) {
    if (r.result !== "won") continue;
    const key = keyOf(r);
    const item = map.get(key) ?? {
      wonCount: 0,
      weight: 0,
      priceSum: 0,
      priceN: 0,
      totalAmount: 0,
    };
    item.wonCount++;
    item.weight += r.weight;
    item.totalAmount += r.totalAmount;
    const price = r.winningBid ?? r.myBid;
    if (price > 0) {
      item.priceSum += price;
      item.priceN++;
    }
    map.set(key, item);
  }

  const arr = Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      wonCount: v.wonCount,
      weight: v.weight,
      avgPrice: v.priceN > 0 ? Math.round(v.priceSum / v.priceN) : 0,
      totalAmount: v.totalAmount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  if (!topN || arr.length <= topN) return arr;
  const top = arr.slice(0, topN);
  const rest = arr.slice(topN);
  const restTotal = rest.reduce(
    (acc, e) => ({
      wonCount: acc.wonCount + e.wonCount,
      weight: acc.weight + e.weight,
      avgPrice: 0,
      totalAmount: acc.totalAmount + e.totalAmount,
    }),
    { wonCount: 0, weight: 0, avgPrice: 0, totalAmount: 0 },
  );
  return restTotal.wonCount > 0
    ? [...top, { name: "기타", ...restTotal }]
    : top;
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

const DONUT_PALETTE = [
  "#0f172a", // slate-900
  "#334155", // slate-700
  "#64748b", // slate-500
  "#94a3b8", // slate-400
  "#cbd5e1", // slate-300
  "#e2e8f0", // slate-200
  "#f1f5f9", // slate-100
];

/**
 * KPI 카드 · 라벨 + 값 + 힌트 + 옵션 sparkline.
 * sparkData 가 있으면 우측 하단에 초소형 라인차트 렌더링 (P5).
 */
function KpiCard({
  label,
  value,
  hint,
  tone = "slate",
  sparkData,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "slate" | "sky";
  sparkData?: number[];
}) {
  return (
    <div className="relative border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-[20px] font-extrabold tabular-nums tracking-tight",
          tone === "sky" ? "text-sky-700" : "text-slate-900",
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10.5px] tabular-nums text-slate-400">
          {hint}
        </div>
      ) : null}
      {sparkData && sparkData.some((v) => v > 0) ? (
        <div className="absolute bottom-2 right-2 h-8 w-24 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sparkData.map((v, i) => ({ i, v }))}
              margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
            >
              <Line
                type="monotone"
                dataKey="v"
                stroke={tone === "sky" ? "#0284c7" : "#64748b"}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

/**
 * P2 · 회차별 낙찰률 카드.
 * 1/2/3차 각각 미니 KPI 형태로 · 낙찰건수 / 전체 / 낙찰률 표시.
 */
function RoundRateCard({
  stats,
}: {
  stats: Record<number, { won: number; total: number; rate: number }>;
}) {
  const rounds = [1, 2, 3] as const;
  return (
    <div className="border border-slate-200 bg-white">
      <SectionHeader title="회차별 낙찰률" />
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        {rounds.map((r) => {
          const s = stats[r];
          const emptySample = s.total === 0;
          return (
            <div key={r} className="px-4 py-3">
              <div className="text-[11px] font-semibold text-slate-500">
                {r}차 경매
              </div>
              <div
                className={cn(
                  "mt-1 text-[20px] font-extrabold tabular-nums tracking-tight",
                  emptySample ? "text-slate-300" : "text-sky-700",
                )}
              >
                {emptySample ? "-" : `${s.rate}%`}
              </div>
              <div className="mt-0.5 text-[10.5px] tabular-nums text-slate-400">
                {s.won} / {s.total} 건
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 요일별 평균 낙찰단가 인라인 차트 (확장 영역 임베드용).
 *
 * 색상 전략:
 * - 최고 평균단가 요일  : sky-600 (브랜드 강조)
 * - 데이터 있는 나머지  : slate-500/600 (강한 대비 · 최댓값 비율에 따라 그라데이션)
 * - 표본 3건 미만       : slate-300 (참고 · 톤 다운)
 * - 데이터 없음         : slate-100 (트랙만 표시)
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
        <span className="text-[12px] font-bold text-slate-800">
          요일별 평균 낙찰단가
        </span>
        {hasData && bestDow.avgPrice > 0 ? (
          <span className="text-[11px] tabular-nums text-slate-500">
            최고{" "}
            <span className="font-bold text-sky-700">
              {bestDow.label}요일
            </span>{" "}
            <span className="text-slate-400">
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
            // 최댓값 대비 비율에 따라 slate 톤을 단계별로 진하게
            const dataBarClass = isBest
              ? "bg-sky-600"
              : insufficient
                ? "bg-slate-300"
                : ratio >= 0.9
                  ? "bg-slate-700"
                  : ratio >= 0.75
                    ? "bg-slate-600"
                    : "bg-slate-500";
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
                      ? "text-slate-300"
                      : insufficient
                        ? "text-slate-400"
                        : isBest
                          ? "text-sky-700"
                          : "text-slate-700",
                  )}
                >
                  {s.avgPrice > 0 ? KRW.format(s.avgPrice) : "-"}
                </span>
                <div
                  className={cn(
                    "relative h-16 w-full min-w-0",
                    noData
                      ? "border-b border-dashed border-slate-200"
                      : "bg-slate-50",
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
                    isBest
                      ? "text-sky-700"
                      : s.label === "일"
                        ? "text-rose-400"
                        : s.label === "토"
                          ? "text-sky-500"
                          : "text-slate-500",
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-[11px] text-slate-400">
          해당 부위의 낙찰 데이터가 없습니다.
        </div>
      )}
    </div>
  );
}

// ============================================================
// 부위별 낙찰 상세 · 행 클릭 시 등급 세부 breakdown 확장
// ============================================================

/**
 * 부위별 낙찰 상세 · 확장 가능 행 + 육량등급 통합 토글.
 *
 * - 헤더 우측 · 통합/개별 토글 · 통합 시 1++(9/8/7) → "1++" 병합
 * - 행 클릭 시 해당 부위의 등급별 상세 확장 · 등급별 낙찰건/중량/평균단가/낙찰금액 노출
 * - 확장 영역은 프로그래스 바로 각 등급 비중을 시각화
 */
function PartsBreakdownTable({ rows }: { rows: PartRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  /**
   * 육량등급 (A/B/C) 통합 여부.
   * true : 1++(9) · 육량 병합
   * false: 1++A(9), 1++B(9), 1++C(9) · 육량별 분리
   *
   * 상태는 표 전체 공유 · 어느 확장 행에서 토글해도 모든 확장 행 반영.
   */
  const [yieldUnified, setYieldUnified] = useState(true);

  const toggleRow = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex flex-col border border-slate-200 bg-white">
      <SectionHeader
        title="부위별 낙찰 상세"
        right={
          rows.length > 0 ? (
            <span className="text-[11px] tabular-nums text-slate-400">
              {rows.length}개 부위
            </span>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <div className="flex h-[140px] items-center justify-center text-[12px] text-slate-400">
          표시할 데이터가 없습니다.
        </div>
      ) : (
        <table className="w-full text-[12px] tabular-nums">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
              <th className="px-3 py-2 text-left">부위</th>
              <th className="px-3 py-2 text-right">낙찰건</th>
              <th className="px-3 py-2 text-right">낙찰중량</th>
              <th className="px-3 py-2 text-right">평균단가</th>
              <th className="px-3 py-2 text-right">낙찰금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = expanded.has(row.name);
              const gradeRows = aggregateGradesForDisplay(
                row.gradeItems,
                yieldUnified,
              );
              return (
                <Fragment key={row.name}>
                  <tr
                    onClick={() => toggleRow(row.name)}
                    className={cn(
                      "cursor-pointer border-b border-slate-100 transition-colors last:border-b-0",
                      isOpen
                        ? "bg-slate-50"
                        : "hover:bg-slate-50/60",
                    )}
                  >
                    <td className="truncate px-3 py-2 text-left font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1.5">
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {row.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {row.wonCount}건
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {KRW.format(row.weight)}kg
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {row.avgPrice > 0 ? KRW.format(row.avgPrice) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">
                      {formatWon(row.totalAmount)}
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="border-b border-slate-100 last:border-b-0">
                      <td
                        colSpan={5}
                        className="border-l-2 border-slate-900 bg-slate-50/70 px-4 py-4"
                      >
                        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                          {/* 좌측 · 등급별 낙찰 상세 (육량등급 통합 토글 포함) */}
                          <section>
                            <div className="mb-2 flex items-baseline justify-between gap-3">
                              <span className="text-[12px] font-bold text-slate-800">
                                등급별 낙찰 상세
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] tabular-nums text-slate-400">
                                  총 {row.wonCount}건
                                </span>
                                <label
                                  className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={yieldUnified}
                                    onChange={(e) =>
                                      setYieldUnified(e.target.checked)
                                    }
                                    className="h-3.5 w-3.5 cursor-pointer accent-slate-900"
                                  />
                                  육량등급 통합
                                </label>
                              </div>
                            </div>
                            <GradeBreakdownList
                              items={gradeRows}
                              parentWonCount={row.wonCount}
                            />
                          </section>

                          {/* 우측 · 요일별 평균 낙찰단가 (해당 부위) */}
                          <section className="lg:border-l lg:border-slate-200 lg:pl-8">
                            <InlineDowAvgPriceChart stats={row.dowStats} />
                          </section>
                        </div>
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
 * 확장 영역의 등급별 breakdown 리스트.
 * 각 행: 컬러칩 + 등급명 + 프로그래스 바 + 낙찰건(%) + 중량 + 평균단가 + 낙찰금액.
 *
 * 좁은 컨테이너에서도 잘 보이도록 컴팩트한 그리드로 구성.
 */
function GradeBreakdownList({
  items,
  parentWonCount,
}: {
  items: BreakdownRow[];
  parentWonCount: number;
}) {
  if (items.length === 0) {
    return (
      <div className="py-2 text-[11px] text-slate-400">
        등급 데이터가 없습니다.
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((g, i) => {
        const pct =
          parentWonCount > 0
            ? Math.round((g.wonCount / parentWonCount) * 100)
            : 0;
        const color = DONUT_PALETTE[i % DONUT_PALETTE.length];
        return (
          <li
            key={g.name}
            className="grid grid-cols-[10px_52px_minmax(40px,1fr)_82px_66px_88px_92px] items-center gap-2 text-[11px] tabular-nums"
          >
            <span
              className="h-2.5 w-2.5"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="font-bold text-slate-800">{g.name}</span>
            <div className="relative h-1.5 w-full min-w-0 bg-slate-200/60">
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-right text-slate-700">
              <span className="font-semibold">{g.wonCount}건</span>
              <span className="ml-1 text-slate-400">({pct}%)</span>
            </span>
            <span className="text-right text-slate-500">
              {KRW.format(g.weight)}kg
            </span>
            <span className="text-right text-slate-500">
              {g.avgPrice > 0 ? `${KRW.format(g.avgPrice)}원` : "-"}
            </span>
            <span className="text-right font-bold text-slate-900">
              {formatWon(g.totalAmount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * P3 · 등급별 낙찰 상세 테이블.
 * 이름 / 낙찰건수 / 낙찰중량 / 평균단가 / 낙찰금액 (총액 desc 정렬).
 */
function BreakdownTable({
  title,
  rows,
  nameLabel,
  scrollable = false,
}: {
  title: string;
  rows: BreakdownRow[];
  nameLabel: string;
  /** true 일 경우 tbody 를 스크롤 컨테이너로 감싸고 헤더 sticky */
  scrollable?: boolean;
}) {
  const emptyView = (
    <div className="flex h-[140px] items-center justify-center text-[12px] text-slate-400">
      표시할 데이터가 없습니다.
    </div>
  );

  const table = (
    <table className="w-full text-[12px] tabular-nums">
      <thead className={cn(scrollable && "sticky top-0 z-10")}>
        <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 backdrop-blur">
          <th className="px-3 py-2 text-left">{nameLabel}</th>
          <th className="px-3 py-2 text-right">낙찰건</th>
          <th className="px-3 py-2 text-right">낙찰중량</th>
          <th className="px-3 py-2 text-right">평균단가</th>
          <th className="px-3 py-2 text-right">낙찰금액</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.name}
            className="border-b border-slate-100 last:border-b-0"
          >
            <td className="truncate px-3 py-2 text-left font-semibold text-slate-800">
              {row.name}
            </td>
            <td className="px-3 py-2 text-right text-slate-700">
              {row.wonCount}건
            </td>
            <td className="px-3 py-2 text-right text-slate-700">
              {KRW.format(row.weight)}kg
            </td>
            <td className="px-3 py-2 text-right text-slate-700">
              {row.avgPrice > 0 ? `${KRW.format(row.avgPrice)}` : "-"}
            </td>
            <td className="px-3 py-2 text-right font-bold text-slate-900">
              {formatWon(row.totalAmount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col border border-slate-200 bg-white">
      <SectionHeader
        title={title}
        right={
          rows.length > 0 ? (
            <span className="text-[11px] tabular-nums text-slate-400">
              {rows.length}개 항목
            </span>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        emptyView
      ) : scrollable ? (
        <div className="max-h-[520px] overflow-y-auto">{table}</div>
      ) : (
        table
      )}
    </div>
  );
}

/**
 * P4 · 미낙찰 분석 테이블.
 * 자주 놓치는 부위 · 미낙찰율 높은 부위 TOP 5.
 */
function LostTable({
  title,
  rows,
  nameLabel,
  hint,
}: {
  title: string;
  rows: { name: string; total: number; lost: number; rate: number }[];
  nameLabel: string;
  hint?: string;
}) {
  return (
    <div className="border border-slate-200 bg-white">
      <SectionHeader
        title={title}
        right={
          hint ? (
            <span className="text-[10.5px] text-slate-400">{hint}</span>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <div className="flex h-[140px] items-center justify-center text-[12px] text-slate-400">
          미낙찰 데이터가 없습니다.
        </div>
      ) : (
        <table className="w-full text-[12px] tabular-nums">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500">
              <th className="px-3 py-2 text-left">{nameLabel}</th>
              <th className="px-3 py-2 text-right">미낙찰</th>
              <th className="px-3 py-2 text-right">참여</th>
              <th className="px-3 py-2 text-right">미낙찰률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="truncate px-3 py-2 text-left font-semibold text-slate-800">
                  {row.name}
                </td>
                <td className="px-3 py-2 text-right text-slate-700">
                  {row.lost}건
                </td>
                <td className="px-3 py-2 text-right text-slate-500">
                  {row.total}건
                </td>
                <td className="px-3 py-2 text-right font-bold text-rose-600">
                  {row.rate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DonutCard({ title, data }: { title: string; data: DistItem[] }) {
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.count, 0),
    [data],
  );
  return (
    <div className="border border-slate-200 bg-white">
      <SectionHeader
        title={title}
        right={
          <span className="text-[11px] tabular-nums text-slate-400">
            {total > 0 ? `${total}건` : "-"}
          </span>
        }
      />
      <div className="p-4">
        {data.length === 0 || total === 0 ? (
          <div className="flex h-[180px] items-center justify-center text-[12px] text-slate-400">
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
                    stroke="#ffffff"
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {data.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {data.map((entry, i) => {
                const hasChildren =
                  entry.children && entry.children.length > 0;
                return (
                  <li
                    key={entry.name}
                    className="group relative flex items-center gap-2 text-[11.5px]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0"
                      style={{
                        backgroundColor:
                          DONUT_PALETTE[i % DONUT_PALETTE.length],
                      }}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        hasChildren
                          ? "cursor-help text-slate-700 underline decoration-dotted decoration-slate-400 underline-offset-2"
                          : "text-slate-700",
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
                    <span className="shrink-0 tabular-nums font-bold text-slate-900">
                      {entry.pct}%
                    </span>
                    {hasChildren ? (
                      <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden min-w-[180px] border border-slate-200 bg-white p-2 text-[11px] shadow-lg group-hover:block">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          기타 상세
                        </div>
                        <ul className="flex flex-col gap-0.5 tabular-nums">
                          {entry.children!.map((c) => (
                            <li
                              key={c.name}
                              className="flex items-center justify-between gap-3"
                            >
                              <span className="truncate text-slate-600">
                                {c.name}
                              </span>
                              <span className="shrink-0 text-slate-500">
                                <span className="font-semibold text-slate-800">
                                  {c.count}건
                                </span>
                                <span className="ml-1 text-slate-400">
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
    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
      <span className="text-[13px] font-extrabold text-slate-900">{title}</span>
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
    <div className="border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-[11px] font-bold text-slate-900">{name}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5 text-[12px] tabular-nums">
        <span className="font-bold text-slate-900">
          {KRW.format(count)}건
        </span>
        <span className="text-slate-500">({pct}%)</span>
      </div>
      {children && children.length > 0 ? (
        <div className="mt-2 border-t border-slate-100 pt-1.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            상세
          </div>
          <ul className="flex flex-col gap-0.5 text-[11px] tabular-nums">
            {children.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="truncate text-slate-600">{c.name}</span>
                <span className="shrink-0 text-slate-500">
                  <span className="font-semibold text-slate-800">
                    {c.count}건
                  </span>
                  <span className="ml-1 text-slate-400">({c.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
