"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CompactFilterPill } from "@/features/live-auction/components/CompactFilterPill";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";
import { useMarketPartGradePrices } from "../hooks/useMarketPartGradePrices";
import type { MarketPartGradeRow } from "../api";

export interface MarketPartSummaryTableProps {
  startDate: string;
  endDate: string;
  gradeFilter: string;
  onChangeGradeFilter: (grade: string) => void;
}

const GRADE_FILTER_OPTIONS = ["1++", "1+", "1", "2", "3"] as const;

/** 등급 표시 우선순위 · 낮을수록 위쪽 */
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

/**
 * 부위 × 등급 낙찰 요약 테이블 · v2 · 범위 압축 레이아웃 (6열).
 *
 * 지표 셀 스택 구조:
 *   [평균값 · primary · bold] (강조 컬러)
 *   [min ~ max · secondary · small muted]
 *
 * 이전 12열 (min/max/avg × 중량/단가/낙찰금) 을 3개 지표 셀로 압축.
 * 눈이 좌우로 튀지 않고 세로 한 눈에 지표별 요약을 스캔 가능.
 */
export function MarketPartSummaryTable({
  startDate,
  endDate,
  gradeFilter,
  onChangeGradeFilter,
}: MarketPartSummaryTableProps) {
  const { data, isLoading, isError } = useMarketPartGradePrices({
    startDate,
    endDate,
    grade: gradeFilter || null,
  });

  const sortedRows = useMemo(() => {
    const order = getPartGroupOrder();
    const partRank = new Map<string, number>();
    order.forEach((p, i) => partRank.set(p, i));

    const rows = [...(data?.rows ?? [])];
    rows.sort((a, b) => {
      const pa = partRank.get(a.partName) ?? 999;
      const pb = partRank.get(b.partName) ?? 999;
      if (pa !== pb) return pa - pb;
      return gradeRank(a.grade) - gradeRank(b.grade);
    });
    return rows;
  }, [data]);

  const totalCount = useMemo(
    () => sortedRows.reduce((s, r) => s + r.count, 0),
    [sortedRows],
  );

  const hasData = sortedRows.length > 0;

  return (
    <section className="overflow-x-auto border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-4 py-2">
        <CompactFilterPill
          label="등급"
          value={gradeFilter}
          onChange={onChangeGradeFilter}
          options={GRADE_FILTER_OPTIONS}
        />
        <span className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-slate-500">
          낙찰 {totalCount}건
        </span>
      </div>

      <table className="w-full table-fixed text-sm">
        {/*
         * 컬럼 폭 설계 (6열) · 컨테이너 1176px 기준.
         * 부위 90 · 등급 108 · 낙찰건수 96 · 중량 200 · 단가 260 · 낙찰금 344 (spare 78)
         * 낙찰건수를 앞으로 옮겨 표본 크기(N)를 먼저 확인 후 지표로 이동하는 스캔 순서.
         */}
        <colgroup>
          <col className="w-[90px]" />
          <col className="w-[108px]" />
          <col className="w-[96px]" />
          <col className="w-[200px]" />
          <col className="w-[260px]" />
          <col className="w-[344px]" />
        </colgroup>
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              부위
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              등급
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              낙찰건수
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              중량
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              단가
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-center">
              낙찰금
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows colSpan={6} rows={8} />
          ) : isError ? (
            <EmptyRow
              colSpan={6}
              message="시세 데이터를 불러오지 못했습니다."
            />
          ) : !hasData ? (
            <EmptyRow
              colSpan={6}
              message={
                gradeFilter
                  ? `조회 기간 내 '${gradeFilter}' 등급 낙찰이 없습니다.`
                  : "조회 기간 내 낙찰 데이터가 없습니다."
              }
            />
          ) : (
            sortedRows.map((row, idx) => {
              const prev = sortedRows[idx - 1];
              const isFirstOfPart = !prev || prev.partName !== row.partName;
              return (
                <SummaryRow
                  key={`${row.partName}-${row.grade}`}
                  row={row}
                  showPart={isFirstOfPart}
                  isPartBoundary={isFirstOfPart && idx > 0}
                />
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}

function SummaryRow({
  row,
  showPart,
  isPartBoundary,
}: {
  row: MarketPartGradeRow;
  showPart: boolean;
  isPartBoundary: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-b border-slate-100 transition-colors hover:bg-slate-50/60",
        isPartBoundary && "border-t border-slate-200",
      )}
    >
      <td className="whitespace-nowrap px-3 py-3 text-center align-middle text-[13px] font-semibold text-slate-900">
        {showPart ? row.partName : ""}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-center align-middle text-[12px] font-semibold tabular-nums text-slate-800">
        {row.grade}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-center align-middle text-[12.5px] font-semibold tabular-nums text-slate-700">
        {row.count}건
      </td>
      <MetricCell
        primary={formatWeight(row.avgWeight)}
        range={formatWeightRange(row.minWeight, row.maxWeight)}
        tone="neutral"
      />
      <MetricCell
        primary={formatKrw(row.avgPrice)}
        range={formatPriceRange(row.minPrice, row.maxPrice)}
        tone="strong"
      />
      <MetricCell
        primary={row.avgAmount > 0 ? formatKrw(row.avgAmount) : "-"}
        range={formatPriceRange(row.minAmount, row.maxAmount)}
        tone="brand"
      />
    </tr>
  );
}

/**
 * 지표 셀 · 상단 평균 (강조) + 하단 min ~ max (subtext).
 * tone: neutral (중량) · strong (단가) · brand (낙찰금)
 */
function MetricCell({
  primary,
  range,
  tone,
}: {
  primary: string;
  range: string | null;
  tone: "neutral" | "strong" | "brand";
}) {
  const primaryClass =
    tone === "brand"
      ? "text-[13.5px] font-bold text-sky-700"
      : tone === "strong"
        ? "text-[13.5px] font-bold text-slate-900"
        : "text-[13px] font-semibold text-slate-800";

  return (
    <td className="whitespace-nowrap px-3 py-3 text-center align-middle">
      <div className={cn("tabular-nums leading-tight", primaryClass)}>
        {primary}
      </div>
      {range ? (
        <div className="mt-0.5 text-[10.5px] tabular-nums leading-tight text-slate-400">
          {range}
        </div>
      ) : null}
    </td>
  );
}

/* ---------- formatters ---------- */

function formatWeight(kg: number): string {
  if (!kg || kg <= 0) return "-";
  return `${kg.toFixed(1)}kg`;
}

function formatWeightRange(min: number, max: number): string | null {
  if (!min || !max || min <= 0 || max <= 0) return null;
  if (Math.abs(min - max) < 0.05) return null; // 동일값이면 subtext 숨김
  return `${min.toFixed(1)} ~ ${max.toFixed(1)}kg`;
}

function formatPriceRange(min: number, max: number): string | null {
  if (!min || !max || min <= 0 || max <= 0) return null;
  if (min === max) return null;
  return `${formatKrw(min)} ~ ${formatKrw(max)}`;
}

function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-16 text-center text-[13px] text-slate-400"
      >
        {message}
      </td>
    </tr>
  );
}

function SkeletonRows({ colSpan, rows }: { colSpan: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td colSpan={colSpan} className="px-3 py-4">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
