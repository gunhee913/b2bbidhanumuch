"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyAuctionResults } from "@/features/bids/hooks";
import { AuctionAnalysisPanel } from "@/features/history/components/AuctionAnalysisPanel";
import { filterResultsByRange } from "@/features/history/lib/analysisKpi";

export interface MyAnalysisSectionProps {
  /** yyyy-MM-dd · 상단 조회기간(applied) 과 동일 */
  startDate: string;
  endDate: string;
}

const toDotDate = (iso: string) => iso.replace(/-/g, ".");

/**
 * 시세·동향 하단 · 내 낙찰 분석 (등급 / 부위 / 업체 분포 + 상세).
 *
 * - 시장 시세와 같은 조회기간을 따른다 · 이 페이지의 기준 축은 하나
 * - 로그인 중도매인에게만 · 비로그인은 렌더하지 않음
 * - 접이식 · 기본 펼침
 */
export function MyAnalysisSection({ startDate, endDate }: MyAnalysisSectionProps) {
  const { data: session } = useSession();
  const dealerId = session?.dealer?.id ?? session?.employee?.dealerId ?? null;
  const { data: results, isLoading } = useMyAuctionResults(dealerId);
  const [open, setOpen] = useState(true);

  const scoped = useMemo(
    () => filterResultsByRange(results ?? [], startDate, endDate),
    [results, startDate, endDate],
  );

  if (!dealerId) return null;

  const rangeLabel = `${toDotDate(startDate)} ~ ${toDotDate(endDate)}`;

  return (
    <section className="border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-content-faint transition-transform",
              !open && "-rotate-90",
            )}
            aria-hidden
          />
          <span className="text-[13px] font-extrabold text-content">내 낙찰 분석</span>
          <span className="text-[11px] tabular-nums text-content-faint">
            {rangeLabel}
            {isLoading ? "" : ` · ${scoped.length}건`}
          </span>
        </button>
        <span className="text-[11px] text-content-faint">시장 시세와 같은 조회기간</span>
      </header>

      {open ? (
        <div className="border-t border-line bg-slate-50/40 p-4">
          {isLoading ? (
            <div className="h-48 animate-pulse bg-surface-accent" />
          ) : scoped.length === 0 ? (
            <div className="py-14 text-center text-[13px] text-content-faint">
              이 기간에는 분석할 낙찰 결과가 없습니다.
            </div>
          ) : (
            <AuctionAnalysisPanel results={scoped} />
          )}
        </div>
      ) : null}
    </section>
  );
}
