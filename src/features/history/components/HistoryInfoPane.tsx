"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import {
  formatDate,
  formatTraceNo,
  InfoRow,
} from "@/features/live-auction/components/ListingSpecSheet";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { formatWonPerKg } from "@/features/live-auction/lib/masking";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import type { DailyListing } from "../hooks/useDailyListings";

const join = (parts: (string | number | null | undefined)[]) =>
  parts
    .map((v) => (v == null ? "" : String(v)))
    .filter((v) => v && v !== "-")
    .join(" · ");

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
 * 배송지시 개체정보 카드(`DeliveryFocusPane`)와 **같은 여섯 줄**을 같은 차례로 적는다.
 * 거기서는 거래처에 전화로 불러 주는 값이고 여기서는 되짚어 보는 값이라 쓰임은 다르지만,
 * 물어보는 것은 똑같다 — 무슨 소였나(품종·성별·등급·월령), 얼마나 나갔나(도체중),
 * 어디서 언제 잡았나(도축), 지육이 얼마였나(경락단가), 누가 올렸나(상장), 이력번호.
 * 두 화면에서 줄 차례가 다르면 같은 값을 매번 다른 데서 찾아야 한다.
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
            <InfoRow label="개체" size="md">
              {join([
                listing.breed,
                listing.gender,
                formatGradeLabel(listing.grade, listing.marblingScore),
                listing.monthAge ? `${listing.monthAge}개월` : null,
              ]) || "-"}
            </InfoRow>
            <InfoRow label="도체중" size="md">
              {listing.carcassWeight ? `${listing.carcassWeight}kg` : "-"}
            </InfoRow>
            <InfoRow label="도축" size="md">
              {join([
                listing.slaughterHouse,
                formatDate(listing.slaughterDate),
                listing.slaughterNo ? `No.${listing.slaughterNo}` : null,
              ]) || "-"}
            </InfoRow>
            {/* 지육 한 마리 값이다 · 부위 낙찰단가는 표에 따로 있다 */}
            <InfoRow label="경락단가" size="md">
              {formatWonPerKg(listing.unitPrice ?? 0)}
            </InfoRow>
            <InfoRow label="상장" size="md">
              {join([listing.companyName, formatDate(listing.listingDate)]) ||
                "-"}
            </InfoRow>
            <InfoRow label="이력" size="md">
              {formatTraceNo(listing.traceNo)}
            </InfoRow>
          </dl>
        </OverlayScroll>
      )}
    </section>
  );
}
