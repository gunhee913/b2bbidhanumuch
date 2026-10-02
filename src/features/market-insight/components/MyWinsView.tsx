"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { useMyAuctionResults } from "@/features/bids/hooks";
import { AuctionAnalysisPanel } from "@/features/history/components/AuctionAnalysisPanel";
import { filterResultsByRange } from "@/features/history/lib/analysisKpi";

export interface MyWinsViewProps {
  /** yyyy-MM-dd · 위 조회기간(applied) 과 같다 */
  startDate: string;
  endDate: string;
}

/**
 * 내 낙찰 분석 · 조회기간에 내가 딴 것의 분포와 상세 (등급 / 부위 / 업체).
 *
 * 예전엔 시세 아래 접이식 섹션이었다. 레일이 생기면서 제 화면을 받았으므로 접는
 * 손잡이를 뗐다 — 화면 전체가 이것 하나인데 접으면 빈 줄 하나만 남는다.
 *
 * 분포 셋과 상세표는 `AuctionAnalysisPanel` 이 제 카드로 그린다. 여기서는 기간을
 * 잘라 넘기고, 넘길 것이 없는 세 경우(미로그인 · 받는 중 · 빈 기간)만 맡는다.
 */
export function MyWinsView({ startDate, endDate }: MyWinsViewProps) {
  const { data: session } = useSession();
  const dealerId = session?.dealer?.id ?? session?.employee?.dealerId ?? null;
  const { data: results, isLoading } = useMyAuctionResults(dealerId);

  const scoped = useMemo(
    () => filterResultsByRange(results ?? [], startDate, endDate),
    [results, startDate, endDate],
  );

  if (!dealerId) {
    return (
      <Notice>
        중도매인으로 로그인하면 내가 딴 것의 분포를 볼 수 있습니다.
      </Notice>
    );
  }

  if (isLoading) {
    return <div className={cn("h-64 animate-pulse", SURFACE_SHELL_CLASS)} />;
  }

  if (scoped.length === 0) {
    return <Notice>이 기간에는 분석할 낙찰 결과가 없습니다.</Notice>;
  }

  return <AuctionAnalysisPanel results={scoped} />;
}

/** 그릴 것이 없을 때의 한 판 · 다른 화면의 빈 줄(`EmptyRow`)과 같은 톤 */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "px-4 py-24 text-center text-[13px] text-content-faint",
        SURFACE_SHELL_CLASS,
      )}
    >
      {children}
    </div>
  );
}
