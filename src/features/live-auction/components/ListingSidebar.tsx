"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { TruncatedText } from "@/components/ui/tooltip";
import { CompactFilterPill } from "./CompactFilterPill";
import type { LiveListing } from "../api";
import { formatGradeLabel, parseQualityGrade } from "../lib/grade";
import { cn } from "@/lib/utils";

const GRADE_OPTIONS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;

export type ListingViewMode = "individual" | "part";

const VIEW_MODE_TABS: { value: ListingViewMode; label: string }[] = [
  { value: "part", label: "부위별" },
  { value: "individual", label: "개체별" },
];

export interface ListingSidebarProps {
  viewMode: ListingViewMode;
  onViewModeChange: (v: ListingViewMode) => void;
  listings: LiveListing[];
  selectedListingId: string | null;
  onSelect: (listingId: string) => void;
  currentRoundListingIds: Set<string>;
  gradeFilter: string;
  companyFilter: string;
  onGradeChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  isLoading: boolean;
}

/**
 * 축종 · 성별을 한 셀에서 표시하기 위한 조합 유틸.
 */
function formatBreedGender(
  breed: string | null | undefined,
  gender: string | null | undefined,
): string {
  const b = breed?.trim();
  const g = gender?.trim();
  if (b && g) return `${b} · ${g}`;
  return b || g || "-";
}

/**
 * 필터 값(`1++(9)`, `1+` 등)과 상장의 육질/근내지방도가 매칭되는지 검사.
 */
function matchesGradeFilter(
  filterValue: string,
  quality: string,
  marblingScore: number | null,
): boolean {
  if (!filterValue) return true;
  const marblingMatch = filterValue.match(/^1\+\+\((\d)\)$/);
  if (marblingMatch) {
    const target = Number(marblingMatch[1]);
    return quality === "1++" && marblingScore === target;
  }
  return quality === filterValue;
}

export function ListingSidebar({
  viewMode,
  onViewModeChange,
  listings,
  selectedListingId,
  onSelect,
  currentRoundListingIds,
  gradeFilter,
  companyFilter,
  onGradeChange,
  onCompanyChange,
  isLoading,
}: ListingSidebarProps) {
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.companyName) set.add(l.companyName);
    });
    return Array.from(set).sort();
  }, [listings]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (gradeFilter) {
        const quality = parseQualityGrade(l.grade || "");
        if (!matchesGradeFilter(gradeFilter, quality, l.marblingScore)) {
          return false;
        }
      }
      if (companyFilter && l.companyName !== companyFilter) return false;
      return true;
    });
  }, [listings, gradeFilter, companyFilter]);

  const hasActiveFilter = !!(gradeFilter || companyFilter);

  const resetFilters = () => {
    onGradeChange("");
    onCompanyChange("");
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden border border-slate-200 bg-white">
      {/* 뷰 모드 탭 */}
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

      {viewMode === "individual" ? (
        <>
          {/* 상단: 카운트 + 필터 */}
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
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-700">
              {hasActiveFilter ? (
                <>
                  {filtered.length}
                  <span className="mx-0.5 text-slate-300">/</span>
                  {listings.length}
                </>
              ) : (
                listings.length
              )}
              두
            </span>
          </div>

          {/* 테이블 */}
          <ListingTable
            listings={filtered}
            allListings={listings}
            selectedListingId={selectedListingId}
            onSelect={onSelect}
            currentRoundListingIds={currentRoundListingIds}
            isLoading={isLoading}
          />
        </>
      ) : (
        // 부위별 뷰는 LiveAuctionRoom 에서 PartSidebar 로 별도 렌더링됨.
        // 이 컴포넌트는 렌더링되지 않지만 방어적 fallback 을 남겨둔다.
        null
      )}
    </aside>
  );
}

interface ListingTableProps {
  listings: LiveListing[];
  allListings: LiveListing[];
  selectedListingId: string | null;
  onSelect: (listingId: string) => void;
  currentRoundListingIds: Set<string>;
  isLoading: boolean;
}

const TABLE_COLGROUP = (
  <colgroup>
    <col className="w-[108px]" />
    <col className="w-[68px]" />
    <col className="w-[76px]" />
    <col className="w-auto" />
  </colgroup>
);

function ListingTable({
  listings,
  allListings,
  selectedListingId,
  onSelect,
  isLoading,
}: ListingTableProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 고정 헤더 (스크롤 영역 밖) · overlay 스크롤바 사용 · gutter 예약 없음 */}
      <div className="overflow-hidden border-b border-slate-200 bg-slate-50">
        <table className="w-full table-fixed text-xs">
          {TABLE_COLGROUP}
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-2 py-2 text-left">접수번호</th>
              <th className="px-2 py-2 text-center">업체</th>
              <th className="whitespace-nowrap px-2 py-2 text-center">
                축종/성별
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-center">등급</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* 스크롤 본문 · overlay 스크롤바 (컨텐츠 위 부유) */}
      <OverlayScroll className="flex-1" autoHide="leave">
        <table className="w-full table-fixed text-xs">
          {TABLE_COLGROUP}
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-xs text-slate-400"
                >
                  불러오는 중...
                </td>
              </tr>
            ) : listings.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-xs text-slate-400"
                >
                  {allListings.length === 0
                    ? "오늘 상장된 개체가 없습니다."
                    : "필터에 해당하는 개체가 없습니다."}
                </td>
              </tr>
            ) : (
              listings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  isSelected={listing.id === selectedListingId}
                  onSelect={onSelect}
                />
              ))
            )}
          </tbody>
        </table>
      </OverlayScroll>
    </div>
  );
}

function ListingRow({
  listing,
  isSelected,
  onSelect,
}: {
  listing: LiveListing;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <tr
      onClick={() => onSelect(listing.id)}
      aria-selected={isSelected}
      className={cn(
        "cursor-pointer transition-colors",
        isSelected ? "bg-slate-100" : "hover:bg-slate-50",
      )}
    >
      <td className="whitespace-nowrap px-2 py-3 text-left align-middle">
        <span className="text-[12px] font-bold -tracking-[0.04em] tabular-nums text-sky-700">
          {listing.listingNo}
        </span>
      </td>
      <td className="px-2 py-3 text-center align-middle">
        <TruncatedText
          value={listing.companyName || "-"}
          className="block truncate text-[12px] text-slate-700"
        />
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-center align-middle text-[12px] text-slate-600">
        {formatBreedGender(listing.breed, listing.gender)}
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-center align-middle">
        <span className="text-[12px] font-semibold tabular-nums text-slate-800">
          {formatGradeLabel(listing.grade, listing.marblingScore)}
        </span>
      </td>
    </tr>
  );
}
