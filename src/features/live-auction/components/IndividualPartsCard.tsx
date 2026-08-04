"use client";

import { useMemo, useState } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing } from "../api";
import { formatGradeLabel } from "../lib/grade";
import { PartsTable } from "./PartsTable";

export interface IndividualPartsCardProps {
  listing: LiveListing | null;
  dealerId: string | null;
  isLoggedIn: boolean;
  isAuthorized: boolean;
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  onBidRequest: (partId: string) => void;
  isLoading: boolean;
  /** 일괄입찰 편집 모드 */
  bulkMode?: boolean;
  bulkSelected?: Set<string>;
  bulkPrices?: Map<string, number>;
  onBulkToggle?: (partId: string) => void;
  onBulkPriceChange?: (partId: string, price: number | null) => void;
}

/**
 * 개체별 뷰 · 3-column 레이아웃의 가운데 카드.
 *
 * 부위별 뷰의 `PartListingTable` 과 시각 톤을 동일하게 유지:
 * - 좌측: `접수번호 · 축종/성별 · 등급` 요약 + 부위수/낙찰수 카운트
 * - 우측: `낙찰분 숨김` 토글 (등급/업체 필터는 한 개체 내부이므로 불필요)
 * - Body: `PartsTable` 재사용 (컬럼: 부위 · 중량 · 최저단가 · 내입찰가)
 */
export function IndividualPartsCard({
  listing,
  dealerId,
  isLoggedIn,
  isAuthorized,
  selectedPartId,
  onSelectPart,
  onBidRequest,
  isLoading,
  bulkMode = false,
  bulkSelected,
  bulkPrices,
  onBulkToggle,
  onBulkPriceChange,
}: IndividualPartsCardProps) {
  const [hideSettled, setHideSettled] = useState(false);

  const { total, settled } = useMemo(() => {
    if (!listing) return { total: 0, settled: 0 };
    let s = 0;
    for (const p of listing.parts) {
      if (p.allBids.some((b) => b.rank != null)) s += 1;
    }
    return { total: listing.parts.length, settled: s };
  }, [listing]);

  return (
    <div className="flex flex-col overflow-hidden border border-slate-200 bg-white">
      {/* 헤더 · 2단 구성 */}
      {listing ? (
        <div className="border-b border-slate-100 px-4 pb-2 pt-2.5">
          {/* Row 1 · 타이틀 (접수번호 · 등급 · 축종/성별) */}
          <div className="flex items-center gap-2">
            <h3 className="shrink-0 whitespace-nowrap text-[14px] font-bold -tracking-[0.01em] tabular-nums text-slate-900">
              {listing.listingNo}
            </h3>
            <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-px text-[10px] font-bold tabular-nums text-slate-700">
              {formatGradeLabel(listing.grade, listing.marblingScore)}
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-slate-500">
              {listing.breed || "-"}
              <span className="mx-0.5 text-slate-300">·</span>
              {listing.gender || "-"}
            </span>
          </div>

          {/* Row 2 · 메타 (부위/낙찰) 좌 · 단위/액션 우 */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
                {total}
                <span className="ml-0.5 text-[10px] font-medium text-slate-400">
                  부위
                </span>
              </span>
              <span className="text-slate-300">·</span>
              <span
                className={cn(
                  "shrink-0 text-[11px] font-semibold tabular-nums",
                  settled > 0 ? "text-sky-700" : "text-slate-400",
                )}
              >
                낙찰 {settled}
                <span
                  className={cn(
                    "ml-0.5 text-[10px] font-medium",
                    settled > 0 ? "text-sky-500/70" : "text-slate-400",
                  )}
                >
                  건
                </span>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="whitespace-nowrap text-[10.5px] font-medium tabular-nums text-slate-400">
                단위 · 원/kg
              </span>
              <HideSettledToggle
                active={hideSettled}
                onClick={() => setHideSettled((v) => !v)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-100 px-4 py-3">
          <span className="text-[13px] font-semibold text-slate-400">
            개체를 선택해 주세요
          </span>
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="px-4 py-12 text-center text-xs text-slate-400">
          불러오는 중...
        </div>
      ) : !listing ? (
        <div className="px-4 py-16 text-center text-xs text-slate-400">
          왼쪽 사이드바에서 개체를 선택하면
          <br />
          부위별 최저단가 · 내 입찰가를 확인할 수 있습니다.
        </div>
      ) : (
        <PartsTable
          listing={listing}
          dealerId={dealerId}
          isLoggedIn={isLoggedIn}
          isAuthorized={isAuthorized}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
          onBidRequest={onBidRequest}
          hideSettled={hideSettled}
          bulkMode={bulkMode}
          bulkSelected={bulkSelected}
          bulkPrices={bulkPrices}
          onBulkToggle={onBulkToggle}
          onBulkPriceChange={onBulkPriceChange}
        />
      )}
    </div>
  );
}

/**
 * 낙찰분 숨김 토글 · `CompactFilterPill` 과 동일 시각 스펙 (h-7, text-[11px], border, rounded-md).
 * 부위별 `PartListingTable` 과 톤 통일.
 */
function HideSettledToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors",
        active
          ? "border-sky-500 bg-sky-50 text-sky-700 hover:border-sky-500"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
      )}
      aria-pressed={active}
    >
      <EyeOff className="h-3 w-3" />
      낙찰분 숨김
    </button>
  );
}
