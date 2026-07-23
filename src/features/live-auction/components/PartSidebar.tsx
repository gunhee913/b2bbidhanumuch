"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { PartGroupEntry } from "../lib/partGrouping";
import type { ListingViewMode } from "./ListingSidebar";

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
  { value: "favorite", label: "관심" },
];

export interface PartSidebarProps {
  viewMode: ListingViewMode;
  onViewModeChange: (v: ListingViewMode) => void;
  groups: PartGroupEntry[];
  selectedGroup: string | null;
  onSelect: (group: string) => void;
  isLoading: boolean;
  totalPartCount: number;
}

/**
 * 부위별 뷰의 좌측 사이드바.
 *
 * - 상단: 뷰모드 탭 (개체별/부위별/관심) — 개체별과 동일 UX
 * - 상단 헤더 밑: 부위 그룹 총 개체수
 * - 리스트: 각 부위 그룹 (부위명 + 상장 인스턴스 수)
 *   선택된 항목은 좌측에 파란 accent + bg-slate-100 강조
 */
export function PartSidebar({
  viewMode,
  onViewModeChange,
  groups,
  selectedGroup,
  onSelect,
  isLoading,
  totalPartCount,
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

  return (
    <aside className="flex h-full flex-col overflow-hidden border border-slate-200 bg-white">
      <nav className="border-b border-slate-100">
        <ul className="flex items-stretch">
          {VIEW_MODE_TABS.map((tab) => (
            <li key={tab.value} className="flex-1">
              <button
                type="button"
                onClick={() => onViewModeChange(tab.value)}
                className={cn(
                  "relative flex h-11 w-full items-center justify-center text-sm font-bold transition-colors",
                  viewMode === tab.value
                    ? "text-slate-900"
                    : "text-slate-400 hover:text-slate-700",
                )}
              >
                {tab.label}
                {viewMode === tab.value ? (
                  <span
                    className="absolute inset-x-4 bottom-0 h-[2px] bg-slate-900"
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 상단: 부위 카운트 + 총 낙찰 건수 · 아래 행과 동일 grid 로 세로 정렬 */}
      <div className="grid grid-cols-[minmax(0,1fr)_56px_68px] items-baseline gap-x-5 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
        <span className="text-[11px] font-semibold text-slate-500">부위</span>
        <span className="flex items-baseline justify-end gap-0.5 text-[11px] font-bold text-slate-700">
          <span className="text-slate-400">총</span>
          <span className="inline-block w-6 text-right tabular-nums">
            {totalPartCount}
          </span>
          <span className="text-[10px] font-medium text-slate-400">건</span>
        </span>
        <span
          className={cn(
            "flex items-baseline justify-end gap-0.5 text-[11px] font-bold",
            totalSettled > 0 ? "text-sky-700" : "text-slate-400",
          )}
        >
          <span>낙찰</span>
          <span className="inline-block w-5 text-right tabular-nums">
            {totalSettled}
          </span>
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

      {/* 부위 그룹 리스트 */}
      <div className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            불러오는 중...
          </div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            오늘 상장된 부위가 없습니다.
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
                      "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_56px_68px] items-baseline gap-x-5 px-4 py-3 text-left transition-colors",
                      isActive ? "bg-slate-100" : "hover:bg-slate-50",
                    )}
                  >
                    <span className="truncate text-[13px] font-bold -tracking-[0.01em] text-sky-700">
                      {g.group}
                    </span>
                    <span className="flex items-baseline justify-end gap-0.5 text-[11px] font-semibold text-slate-500">
                      <span className="inline-block w-6 text-right tabular-nums">
                        {g.count}
                      </span>
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
                      <span>낙찰</span>
                      <span className="inline-block w-5 text-right tabular-nums">
                        {settled}
                      </span>
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
      </div>
    </aside>
  );
}
