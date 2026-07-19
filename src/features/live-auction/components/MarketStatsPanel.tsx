"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing, PartPriceSeriesPoint } from "../api";
import { MiniSparklineChart } from "./MiniSparklineChart";

const YIELDS = ["A", "B", "C"] as const;

const GRADE_KEYS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;
type GradeKey = (typeof GRADE_KEYS)[number];

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

/* ------------------------------------------------------------------ */
/*  Dummy Data Generation                                              */
/* ------------------------------------------------------------------ */

const PART_BASE_PRICES: Record<string, number> = {
  등심: 90000,
  안심: 130000,
  채끝: 82000,
  치마: 45000,
  부채: 55000,
  업진: 40000,
  "토시·제비": 62000,
  설도: 50000,
  앞다리: 42000,
  우둔: 48000,
  목심: 52000,
  양지: 38000,
  사태: 35000,
  꼬리: 32000,
  족: 22000,
  사골: 18000,
  잡뼈: 12000,
};

const GRADE_MULTIPLIERS: Record<GradeKey, number> = {
  "1++(9)": 1.25,
  "1++(8)": 1.2,
  "1++(7)": 1.15,
  "1+": 1.0,
  "1": 0.85,
  "2": 0.7,
  "3": 0.55,
};

/** 결정론적 해시 (모바일 앱 시세 화면과 동일 방식). */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(Math.sin(hash));
}

type Yield = "A" | "B" | "C";

/** 육량 등급별 가격 배수 (A > B > C). */
const YIELD_MULTIPLIER: Record<Yield, number> = {
  A: 1.03,
  B: 1.0,
  C: 0.94,
};

/**
 * 자연스러운 시세 곡선을 위한 결정론적 mean-reverting random walk.
 *
 * 각 날짜의 값은 직전 값에서 ±소량 변동하며 평균으로 회귀 → 인접 값이
 * 부드럽게 이어져 이미지의 시세차트 같은 곡선이 나옴.
 */
function generateDummySeries(
  partName: string,
  grade: GradeKey,
  yieldValue: Yield,
  days = 7,
): PartPriceSeriesPoint[] {
  const basePrice =
    (PART_BASE_PRICES[partName] ?? 60000) *
    (GRADE_MULTIPLIERS[grade] ?? 1) *
    YIELD_MULTIPLIER[yieldValue];

  const series: PartPriceSeriesPoint[] = [];
  let current = basePrice;

  // 큰 사이클(월간 트렌드) + 잔노이즈로 자연스럽게
  const cycleSeed = seededRandom(`${partName}-${grade}-${yieldValue}-cycle`);
  const cycleAmplitude = 0.06 + cycleSeed * 0.06; // ±6~12%
  const cyclePeriod = 18 + Math.floor(cycleSeed * 10); // 18~28일 주기

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const stepIndex = days - 1 - i; // 시작(0) → 끝(days-1)

    // 하루 노이즈 (small · ±0.8%)
    const noiseSeed = `${partName}-${grade}-${yieldValue}-${dateStr}`;
    const noise = (seededRandom(noiseSeed) - 0.5) * 0.016;

    // 트렌드 (sine wave)
    const trend =
      Math.sin((stepIndex / cyclePeriod) * Math.PI * 2) * cycleAmplitude;

    // Mean-reverting: current 가 basePrice 로부터 멀어지면 되돌리는 힘
    const target = basePrice * (1 + trend);
    const revert = (target - current) * 0.35; // 35% 회귀
    current = current + revert + current * noise;

    const avg = Math.round(current);
    // min/max 밴드 (±2~3%)
    const bandR = seededRandom(`${noiseSeed}-band`);
    const min = Math.round(avg * (1 - (0.015 + bandR * 0.015)));
    const max = Math.round(avg * (1 + (0.015 + (1 - bandR) * 0.015)));
    const count = Math.floor(bandR * 4) + 1;

    series.push({ date: dateStr, avg, min, max, count });
  }
  return series;
}

function toPartGroup(partName: string): string {
  return partName.replace(/\(좌\)|\(우\)/g, "").trim();
}

function toGradeKey(
  grade: string | null,
  marblingScore: number | null,
): GradeKey | null {
  if (!grade) return null;
  const match = grade.match(/^(1\+\+|1\+|1|2|3)/);
  if (!match) return null;
  const quality = match[1];
  if (quality === "1++" && marblingScore) {
    const key = `1++(${marblingScore})`;
    return (GRADE_KEYS as readonly string[]).includes(key)
      ? (key as GradeKey)
      : null;
  }
  return quality as GradeKey;
}

/** grade 문자열 끝의 육량(A/B/C)을 추출. 없으면 기본 "A". */
function toYield(grade: string | null | undefined): Yield {
  if (!grade) return "A";
  const m = grade.match(/[ABC]$/);
  return (m?.[0] as Yield) ?? "A";
}

/** `1++(9) + A` → `1++(9)A` 로 조합해 표시. */
function formatGradeWithYield(grade: GradeKey, y: Yield): string {
  return `${grade}${y}`;
}

export interface MarketStatsPanelProps {
  allListings: LiveListing[];
  currentListing: LiveListing | null;
  currentPartName: string | null;
}

export function MarketStatsPanel({
  currentListing,
  currentPartName,
}: MarketStatsPanelProps) {
  // 현재 상세 화면의 부위/등급/육량 컨텍스트 자동 사용
  const partName = currentPartName ? toPartGroup(currentPartName) : "등심";
  const grade =
    toGradeKey(
      currentListing?.grade ?? null,
      currentListing?.marblingScore ?? null,
    ) ?? "1++(9)";
  const contextYield = toYield(currentListing?.grade);

  // 육량 세그먼트 필터 (사용자 선택 · null 이면 컨텍스트 자동)
  const [yieldOverride, setYieldOverride] = useState<Yield | null>(null);
  const effectiveYield = yieldOverride ?? contextYield;

  // 개체가 바뀌면 필터 오버라이드 리셋
  useEffect(() => {
    setYieldOverride(null);
  }, [currentListing?.id]);

  return (
    <div className="border-t border-slate-100 bg-slate-50/40">
      {/* 헤더 */}
      <header className="flex items-center gap-1.5 border-b border-slate-100 px-5 py-2.5">
        <BarChart2 className="h-3.5 w-3.5 text-sky-600" />
        <h4 className="text-[12px] font-bold text-slate-900">시세 차트</h4>
        <span className="text-[10px] text-slate-400">최근 30일</span>
      </header>

      <ChartView
        partName={partName}
        grade={grade}
        yieldValue={effectiveYield}
        onYieldChange={setYieldOverride}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart View                                                         */
/* ------------------------------------------------------------------ */

function ChartView({
  partName,
  grade,
  yieldValue,
  onYieldChange,
}: {
  partName: string;
  grade: GradeKey;
  yieldValue: Yield;
  onYieldChange: (y: Yield) => void;
}) {
  const series = useMemo(
    () => generateDummySeries(partName, grade, yieldValue, 30),
    [partName, grade, yieldValue],
  );
  const isLoading = false;

  const validPoints = series.filter(
    (p): p is typeof p & { avg: number } => p.avg !== null,
  );

  const latest = validPoints[validPoints.length - 1] ?? null;

  const summary = useMemo(() => {
    if (validPoints.length === 0) return null;
    const mins = validPoints.map((p) => p.min ?? p.avg);
    const maxs = validPoints.map((p) => p.max ?? p.avg);
    const totalCount = validPoints.reduce((sum, p) => sum + p.count, 0);
    return {
      min: Math.min(...mins),
      max: Math.max(...maxs),
      totalCount,
    };
  }, [validPoints]);

  const gradeLabel = formatGradeWithYield(grade, yieldValue);

  return (
    <div className="bg-white">
      {/* 상단 요약 · 왼쪽: 컨텍스트+현재가, 오른쪽: 육량 세그먼트 필터 */}
      <div className="flex items-end justify-between gap-2 px-4 pb-2 pt-3.5">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold">
            <span className="text-slate-400">{partName}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sky-700">{gradeLabel}</span>
          </div>
          {isLoading ? (
            <span className="text-[15px] text-slate-300">로딩중…</span>
          ) : latest ? (
            <div className="flex items-baseline gap-0.5">
              <span className="text-[22px] font-bold leading-none tabular-nums text-slate-900">
                {NUMBER_FORMATTER.format(latest.avg)}
              </span>
              <span className="ml-0.5 text-[11px] font-semibold text-slate-400">
                원 /kg
              </span>
            </div>
          ) : (
            <span className="text-[15px] text-slate-300">데이터 없음</span>
          )}
        </div>
        <YieldSegmented value={yieldValue} onChange={onYieldChange} />
      </div>

      {/* 미니 차트 (lightweight-charts · hover 툴팁 내장) */}
      <div className="pb-3">
        {summary ? (
          <MiniSparklineChart points={series} chartHeight={170} />
        ) : (
          <div className="py-6 text-center text-[10px] text-slate-300">
            집계된 낙찰 데이터가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 가로형 세그먼트 육량 필터 (A | B | C).
 * 트랙 배경(slate-100) 안에 선택된 셀만 흰색으로 떠오르는 iOS 스타일.
 */
function YieldSegmented({
  value,
  onChange,
}: {
  value: Yield;
  onChange: (y: Yield) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="육량 등급 필터"
      className="inline-flex rounded-md bg-slate-100 p-0.5"
    >
      {YIELDS.map((y) => {
        const isActive = value === y;
        return (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(y)}
            className={cn(
              "flex h-5 w-6 items-center justify-center rounded text-[10px] font-bold transition-all",
              isActive
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}

