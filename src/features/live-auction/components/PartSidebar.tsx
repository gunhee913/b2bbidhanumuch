"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
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
                    : "text-slate-400",
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

      {/* 컬럼 헤더 · 부위 | 상장건수 | 낙찰건수 (아래 행과 동일 grid 로 정렬) */}
      <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-baseline gap-x-4 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
        <span className="text-[10px] font-semibold text-slate-500">부위</span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          상장건수
        </span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          낙찰건수
        </span>
      </div>

      {/* 부위 그룹 리스트 · overlay 스크롤바 · gutter 예약 X (컨텐츠 위 부유) */}
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
              return (
                <li key={g.group}>
                  <button
                    type="button"
                    onClick={() => onSelect(g.group)}
                    aria-pressed={isActive}
                    className={cn(
                      "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_64px_64px] items-baseline gap-x-4 px-4 py-3 text-left transition-colors",
                      isActive ? "bg-slate-100" : "hover:bg-slate-50",
                    )}
                  >
                    <span className="truncate text-[13px] font-bold -tracking-[0.01em] text-sky-700">
                      {g.group}
                    </span>
                    <span className="flex items-baseline justify-end gap-0.5 text-[11px] font-semibold text-slate-500">
                      <span className="tabular-nums">{g.count}</span>
                      <span className="text-[10px] font-medium text-slate-400">
                        건
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex items-baseline justify-end gap-0.5 text-[11px] font-semibold",
                        settled > 0 ? "text-sky-700" : "text-slate-400",
                      )}
                    >
                      <span className="tabular-nums">{settled}</span>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          settled > 0 ? "text-sky-500/70" : "text-slate-400",
                        )}
                      >
                        건
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </OverlayScroll>
    </aside>
  );
}
