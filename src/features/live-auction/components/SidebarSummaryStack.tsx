"use client";

import { cn } from "@/lib/utils";

/**
 * 사이드바 요약 스택 · `PartSidebar` · `ListingSidebar` 공용.
 *
 * 카운트 요약만 표시 (전체 낙찰대금은 의도적으로 제외).
 * → 사용자 요구: "전체가 아닌 부위별/개체별 낙찰대금" · row-level 로 이동함.
 *
 * 노출 정보:
 *   총 N건 · 낙찰 M건
 *
 * `SettlementAmountLine` 은 별도 컴포넌트로 각 row 하단에 렌더링.
 */
export function SummaryStack({
  totalCount,
  settledCount,
}: {
  totalCount: number;
  settledCount: number;
}) {
  return (
    <div className="flex shrink-0 items-baseline gap-1.5 text-[11px] font-bold tabular-nums leading-none">
      <span className="flex items-baseline gap-0.5 text-slate-700">
        <span className="text-slate-400">총</span>
        <span>{totalCount}</span>
        <span className="text-[10px] font-medium text-slate-400">건</span>
      </span>
      <span className="text-slate-200">·</span>
      <span
        className={cn(
          "flex items-baseline gap-0.5",
          settledCount > 0 ? "text-sky-700" : "text-slate-400",
        )}
      >
        <span>낙찰</span>
        <span>{settledCount}</span>
        <span
          className={cn(
            "text-[10px] font-medium",
            settledCount > 0 ? "text-sky-500/70" : "text-slate-400",
          )}
        >
          건
        </span>
      </span>
    </div>
  );
}
