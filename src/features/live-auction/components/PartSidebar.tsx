"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { CompactFilterPill } from "./CompactFilterPill";
import type { PartGroupEntry } from "../lib/partGrouping";
import type { ListingViewMode } from "./ListingSidebar";

const GRADE_OPTIONS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;

/** 그룹 내에서 낙찰이 확정된 부위 개수 (`allBids` 에 rank 가 채워진 항목이 있으면 마감) */
function countSettled(entry: PartGroupEntry): number {
  let n = 0;
  for (const item of entry.items) {
    if (item.part.allBids.some((b) => b.rank != null)) n += 1;
  }
  return n;
}

/**
 * 그룹 라이브 활동 지표 계산:
 *  - bidCount    · 그룹 내 모든 부위의 총 입찰 액션 수 (부위별 bidCount 합계)
 *  - bidderCount · 그룹 내 unique 딜러 수 (allBids.dealerId 기준)
 * 두 값은 실시간 회차 중 tick up 하는 라이브 metric.
 */
function computeGroupActivity(entry: PartGroupEntry): {
  bidCount: number;
  bidderCount: number;
} {
  let bidCount = 0;
  const bidderIds = new Set<string>();
  for (const item of entry.items) {
    bidCount += item.part.bidCount;
    for (const b of item.part.allBids) {
      bidderIds.add(b.dealerId);
    }
  }
  return { bidCount, bidderCount: bidderIds.size };
}

const VIEW_MODE_TABS: { value: ListingViewMode; label: string }[] = [
  { value: "part", label: "부위별" },
  { value: "individual", label: "개체별" },
];

export interface PartSidebarProps {
  viewMode: ListingViewMode;
  onViewModeChange: (v: ListingViewMode) => void;
  groups: PartGroupEntry[];
  selectedGroup: string | null;
  onSelect: (group: string) => void;
  isLoading: boolean;
  totalPartCount: number;
  gradeFilter: string;
  companyFilter: string;
  onGradeChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  companyOptions: string[];
}

/**
 * 부위별 뷰의 좌측 사이드바.
 *
 * 구조 (위 → 아래):
 * 1. 뷰모드 탭 (개체별/부위별) — 개체별 사이드바와 공통 UX
 * 2. 필터 행 · 등급/업체 필터(좌) + 총·낙찰 요약 카운트(우)
 *    → 개체별 사이드바(`ListingSidebar`) 와 동일한 필터 · 요약 컨벤션
 * 3. 컬럼 헤더 · [부위 | 경매건수 | 낙찰건수]
 * 4. 부위 그룹 리스트 · 각 그룹의 카운트 · 낙찰건수
 *    (헤더의 컬럼과 세로 정렬되도록 동일 grid template)
 */
export function PartSidebar({
  viewMode,
  onViewModeChange,
  groups,
  selectedGroup,
  onSelect,
  isLoading,
  totalPartCount,
  gradeFilter,
  companyFilter,
  onGradeChange,
  onCompanyChange,
  companyOptions,
}: PartSidebarProps) {
  const settledByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of groups) map.set(g.group, countSettled(g));
    return map;
  }, [groups]);

  const activityByGroup = useMemo(() => {
    const map = new Map<
      string,
      { bidCount: number; bidderCount: number }
    >();
    for (const g of groups) map.set(g.group, computeGroupActivity(g));
    return map;
  }, [groups]);

  const totalSettled = useMemo(() => {
    let sum = 0;
    for (const n of settledByGroup.values()) sum += n;
    return sum;
  }, [settledByGroup]);

  const hasActiveFilter = !!(gradeFilter || companyFilter);
  const resetFilters = () => {
    onGradeChange("");
    onCompanyChange("");
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden border border-slate-200 bg-white">
      {/* 뷰모드 탭 · 기본 slate-900 (심플·명료한 대비) */}
      <nav className="border-b border-slate-100 p-1">
        <ul className="flex items-stretch gap-0.5">
          {VIEW_MODE_TABS.map((tab) => (
            <li key={tab.value} className="flex-1">
              <button
                type="button"
                onClick={() => onViewModeChange(tab.value)}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-[1px] text-sm font-bold transition-colors",
                  viewMode === tab.value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 필터(좌) + 요약 카운트(우) · `ListingSidebar` 와 동일 컨벤션 */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CompactFilterPill
            value={gradeFilter}
            onChange={onGradeChange}
            label="등급"
            options={GRADE_OPTIONS}
          />
          <CompactFilterPill
            value={companyFilter}
            onChange={onCompanyChange}
            label="업체"
            options={companyOptions}
            className={cn(!companyOptions.length && "opacity-60")}
          />
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-0.5 inline-flex h-7 items-center px-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              title="필터 초기화"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 items-baseline gap-1.5 text-[11px] font-bold tabular-nums">
          <span className="flex items-baseline gap-0.5 text-slate-700">
            <span className="text-slate-400">총</span>
            <span>{totalPartCount}</span>
            <span className="text-[10px] font-medium text-slate-400">건</span>
          </span>
          <span className="text-slate-200">·</span>
          <span
            className={cn(
              "flex items-baseline gap-0.5",
              totalSettled > 0 ? "text-sky-700" : "text-slate-400",
            )}
          >
            <span>낙찰</span>
            <span>{totalSettled}</span>
            <span
              className={cn(
                "text-[10px] font-medium",
                totalSettled > 0 ? "text-sky-500/70" : "text-slate-400",
              )}
            >
              건
            </span>
          </span>
        </div>
      </div>

      {/*
       * 컬럼 헤더 · 5-col · 2 시맨틱 그룹 (아래 rows 와 동일 template).
       *   [부위 | 상장 | 낙찰 | 입찰 | 참여]
       *              ↑ static  ↑ live (얇은 divider)
       * 순수 텍스트 · 색상만으로 그룹 구분.
       */}
      <div className="grid grid-cols-[minmax(0,1fr)_28px_28px_38px_28px] items-baseline gap-x-1.5 border-b border-slate-100 bg-slate-50/60 pl-4 pr-3 py-2">
        <span className="text-[10px] font-semibold text-slate-500">부위</span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          상장
        </span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          낙찰
        </span>
        <span className="border-l border-slate-200/60 pl-2 text-right text-[10px] font-semibold text-sky-700">
          입찰
        </span>
        <span className="text-right text-[10px] font-semibold text-sky-700/80">
          참여
        </span>
      </div>

      {/*
       * 부위 그룹 리스트 · 심플 텍스트 톤 · divide-y 얇은 구분선.
       *
       * Row states (배경/텍스트 색만 · 뱃지/pill/dot 없음):
       *  - Default   · 흰 배경 · hover:slate-50
       *  - Selected  · bg-slate-100
       *  - 낙찰      · sky-700 (있을 때) / slate-300 (0)
       *  - 입찰      · NumberFlow rolling + flash-up · sky-700 bold (라이브)
       *  - 참여자    · slate-500 (있을 때) / slate-300 (0)
       */}
      <OverlayScroll className="flex-1" autoHide="leave">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            불러오는 중...
          </div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            {hasActiveFilter
              ? "필터에 해당하는 부위가 없습니다."
              : "오늘 상장된 부위가 없습니다."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {groups.map((g) => {
              const isActive = g.group === selectedGroup;
              const settled = settledByGroup.get(g.group) ?? 0;
              const activity = activityByGroup.get(g.group) ?? {
                bidCount: 0,
                bidderCount: 0,
              };
              return (
                <li key={g.group}>
                  <PartRow
                    name={g.group}
                    count={g.count}
                    settled={settled}
                    bidCount={activity.bidCount}
                    bidderCount={activity.bidderCount}
                    isActive={isActive}
                    onClick={() => onSelect(g.group)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </OverlayScroll>
    </aside>
  );
}

/**
 * 부위 그룹 row · 5-col grid · 순수 텍스트 톤 (뱃지/pill/dot 없음).
 *
 * 라이브 애니메이션만 유지:
 *  - `NumberFlow` · 입찰 rolling counter (Toss/거래소 감성)
 *  - `usePriceFlash` · 입찰 증가 감지 → flash-up class 900ms (sky wash pulse)
 *
 * 상태는 배경 (selected = bg-slate-100) 과 텍스트 색상으로만 표현.
 */
function PartRow({
  name,
  count,
  settled,
  bidCount,
  bidderCount,
  isActive,
  onClick,
}: {
  name: string;
  count: number;
  settled: number;
  bidCount: number;
  bidderCount: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const bidFlash = usePriceFlash(bidCount);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_28px_28px_38px_28px] items-baseline gap-x-1.5 pl-4 pr-3 py-3 text-left transition-colors",
        isActive ? "bg-slate-100" : "hover:bg-slate-50",
      )}
    >
      {/* 부위명 · 기존 톤 유지 (text-sky-700 bold) */}
      <span className="truncate text-[13px] font-bold -tracking-[0.01em] text-sky-700">
        {name}
      </span>

      {/* 상장 · static base */}
      <span className="flex items-baseline justify-end text-[11px] font-semibold text-slate-500 tabular-nums">
        {count}
      </span>

      {/* 낙찰 · 값 있으면 sky-700 · 없으면 muted */}
      <span
        className={cn(
          "flex items-baseline justify-end text-[11px] font-semibold tabular-nums",
          settled > 0 ? "text-sky-700" : "text-slate-300",
        )}
      >
        {settled}
      </span>

      {/*
       * 입찰 · 라이브 카운터 · NumberFlow rolling + flash-up on 증가.
       * border-l 로 좌측(정적)과 시각 분리 · pl-3 로 divider 여유.
       */}
      <span
        className={cn(
          "flex items-center justify-end border-l border-slate-200/60 pl-2 text-[11px] font-bold tabular-nums",
          bidCount > 0 ? "text-sky-700" : "text-slate-300",
          bidFlash === "up" && "flash-up",
        )}
      >
        <NumberFlow value={bidCount} locales="ko-KR" willChange />
      </span>

      {/* 참여자 · secondary · 값 있으면 slate-600 · 없으면 muted */}
      <span
        className={cn(
          "flex items-baseline justify-end text-[11px] font-semibold tabular-nums",
          bidderCount > 0 ? "text-slate-600" : "text-slate-300",
        )}
      >
        {bidderCount}
      </span>
    </button>
  );
}
