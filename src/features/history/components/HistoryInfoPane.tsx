"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import {
  CattleInfoRows,
  type CattleInfoFacts,
} from "@/features/live-auction/components/CattleInfoRows";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import type { DailyListing } from "../hooks/useDailyListings";

const infoFactsOf = (l: DailyListing): CattleInfoFacts => ({
  breed: l.breed || null,
  gender: l.gender || null,
  grade: l.grade || null,
  marblingScore: l.marblingScore,
  monthAge: l.monthAge,
  slaughterHouse: l.slaughterHouse,
  slaughterDate: l.slaughterDate,
  slaughterNo: l.slaughterNo,
  unitPrice: l.unitPrice,
  carcassWeight: l.carcassWeight,
  companyName: l.companyName ?? null,
  processDate: l.processDate,
  processWeight: l.processWeight,
  traceNo: l.traceNo,
});

export interface HistoryInfoPaneProps {
  /** 표에서 고른 줄의 개체 · 못 찾았으면 null */
  listing: DailyListing | null;
  /** 상장내역을 아직 받는 중 */
  isLoading: boolean;
  /** 머리글 오른쪽 · 판을 옮기는 손잡이가 들어온다 */
  headerAction?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

/**
 * 왼쪽 열 셋째 행 · 고른 줄의 개체가 무슨 소였나.
 *
 * 배송지시 개체정보 카드(`DeliveryFocusPane`)와 **같은 다섯 줄**을 그대로 쓴다
 * (`CattleInfoRows`). 거기서는 거래처에 불러 주는 값이고 여기서는 되짚어 보는 값이라
 * 쓰임은 다르지만 묻는 것은 같다.
 *
 * 사진 위 각인(`GradeStamp`)과 겹치지 않는다. 각인은 판정사가 **이 사진**에 매긴
 * 일곱 값이고, 여기는 사진에 안 찍히는 것들이다 — 이력번호를 사진 위에 얹을 수는 없다.
 */
export function HistoryInfoPane({
  listing,
  isLoading,
  headerAction,
  className,
  style,
  ref,
}: HistoryInfoPaneProps) {
  return (
    <section
      ref={ref}
      style={style}
      className={cn("flex flex-col", SURFACE_SHELL_CLASS, className)}
    >
      <header className="flex h-8 shrink-0 items-center gap-1.5 border-b border-line-soft pl-3 pr-1">
        <span className="shrink-0 text-[12px] font-bold text-content-mid">
          개체정보
        </span>
        <div className="ml-auto flex shrink-0 items-center">{headerAction}</div>
      </header>

      {!listing ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-[12.5px] text-content-faint">
          {isLoading
            ? "상장내역 불러오는 중"
            : "표에서 줄을 고르면 여기 뜹니다"}
        </div>
      ) : (
        <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
          <dl className="flex flex-col gap-2 px-3 py-2.5">
            <CattleInfoRows facts={infoFactsOf(listing)} />
          </dl>
        </OverlayScroll>
      )}
    </section>
  );
}
