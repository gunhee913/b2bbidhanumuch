"use client";

import { useState } from "react";
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
 * - 좌측: `접수번호 · 등급 · 축종/성별` 타이틀 라인 (한 줄)
 * - 우측: `낙찰분 숨김` 체크박스 + `단위 : 원/kg`
 * - Body: `PartsTable` 재사용 (컬럼: 부위 · 중량 · 최저단가 · 내입찰가)
 *
 * 부위수/낙찰수 카운트는 헤더에서 제거 · 좌측 사이드바 리스트가 이미 개체 단위
 * 낙찰 상태를 표시하므로 중복. 헤더는 액션(낙찰분 숨김) + 단위만 노출해 세로 절약.
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

  return (
    <div className="flex flex-col overflow-hidden border border-slate-200 bg-white">
      {/* 헤더 · 단일 라인 · [타이틀 좌]  [낙찰분 숨김 · 단위 우] */}
      {listing ? (
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
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

          {/* 낙찰분 숨김 (체크박스) · 단위 : 원/kg
           * 부위별 `PartListingTable` 헤더와 순서 통일:
           *   [체크박스 · 낙찰분 숨김]  ...  [단위 : 원/kg]
           * 왼쪽 = 액션 · 오른쪽 = 정보 (읽기 전용)
           */}
          <div className="ml-auto flex items-center gap-3">
            <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={hideSettled}
                onChange={(e) => setHideSettled(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-sky-600"
              />
              <span>낙찰분 숨김</span>
            </label>
            <span className="whitespace-nowrap text-[10.5px] font-medium tabular-nums text-slate-400">
              단위 : 원/kg
            </span>
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

