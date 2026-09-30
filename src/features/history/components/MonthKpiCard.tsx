"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWon } from "@/features/live-auction/lib/masking";
import type { AnalysisKpi } from "../lib/analysisKpi";

export interface MonthKpiCardProps {
  /** yyyy.MM */
  monthLabel: string;
  isLoading: boolean;
  kpi: AnalysisKpi;
  /** 이 달 낙찰분 중 거래처 미배정 건수 */
  unassignedCount: number;
}

/**
 * 이 달 KPI 카드 · 캘린더 아래 · "이 달 성적표".
 *
 * 위계: 총 낙찰금액(히어로) → 낙찰/미낙찰 비율 바 → 액션 행.
 * 일별 분포는 캘린더가, 단가·부위별 비교는 아래 분석 섹션이 담당하므로 여기서는 그리지 않는다.
 * 격자선 대신 여백으로 구분 · sky 는 히어로 숫자 · 비율 바 · 배송지시 링크에만.
 */
export function MonthKpiCard({
  monthLabel,
  isLoading,
  kpi,
  unassignedCount,
}: MonthKpiCardProps) {
  const dash = isLoading;
  const hasWon = !dash && kpi.wonAmount > 0;

  return (
    <section className="border border-line bg-surface">
      <header className="px-5 pt-4">
        <span className="text-[12px] font-bold text-content-soft">
          {monthLabel}월 경매 요약
        </span>
      </header>

      {/* 히어로 · 총 낙찰금액 */}
      <div className="px-5 pt-3">
        <div className="text-[11px] font-semibold text-content-soft">총 낙찰금액</div>
        <div
          className={cn(
            "mt-1 truncate text-[24px] font-extrabold tabular-nums leading-none -tracking-[0.02em]",
            hasWon ? "text-sky-700" : "text-content-ghost",
          )}
        >
          {hasWon ? formatWon(kpi.wonAmount) : "-"}
        </div>
      </div>

      {/* 낙찰 / 미낙찰 비율 바 · 데이터가 적어도 항상 꽉 차 보이는 한 줄 */}
      <WinLossBar
        wonCount={kpi.wonCount}
        lostCount={kpi.lostCount}
        muted={dash}
      />

      {/* 액션 행 · 이 페이지에서 유일하게 "할 일"을 만드는 정보 */}
      {!dash && kpi.wonCount > 0 ? (
        <Link
          href="/delivery"
          className={cn(
            "group flex items-center justify-between border-t px-5 py-3 text-[11.5px] transition-colors",
            unassignedCount > 0
              ? "border-line bg-slate-50/70 hover:bg-sky-50/70"
              : "border-line-soft hover:bg-slate-50/70",
          )}
        >
          <span className="flex items-center gap-1.5 text-content-mid">
            거래처 미배정
            <b
              className={cn(
                "font-extrabold tabular-nums",
                unassignedCount > 0 ? "text-content" : "text-content-faint",
              )}
            >
              {unassignedCount}건
            </b>
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-sky-700">
            배송지시
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>
      ) : null}
    </section>
  );
}

/**
 * 낙찰 / 미낙찰 건수 비율 바 · 6px · 낙찰 sky-500 · 미낙찰 rose-200.
 * 입찰이 없으면 빈 트랙만 · 라벨은 바 오른쪽 아래 한 줄.
 */
function WinLossBar({
  wonCount,
  lostCount,
  muted,
}: {
  wonCount: number;
  lostCount: number;
  muted: boolean;
}) {
  const total = wonCount + lostCount;
  const wonRatio = total > 0 ? (wonCount / total) * 100 : 0;

  return (
    <div className="px-5 pb-4 pt-4">
      <div
        className="flex h-1.5 w-full overflow-hidden bg-surface-accent"
        role="img"
        aria-label={total > 0 ? `낙찰 ${wonCount}건 · 미낙찰 ${lostCount}건` : "입찰 없음"}
      >
        {!muted && total > 0 ? (
          <>
            <span
              className="h-full bg-sky-500 transition-[width] duration-500"
              style={{ width: `${wonRatio}%` }}
            />
            <span className="h-full flex-1 bg-rose-200" />
          </>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] tabular-nums">
        <LegendItem dot="bg-sky-500" label="낙찰" value={muted ? "-" : `${wonCount}`} />
        <LegendItem dot="bg-rose-200" label="미낙찰" value={muted ? "-" : `${lostCount}`} />
      </div>
    </div>
  );
}

function LegendItem({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 shrink-0", dot)} aria-hidden />
      <span className="text-content-soft">{label}</span>
      <span className="font-bold text-content">{value}</span>
    </span>
  );
}
