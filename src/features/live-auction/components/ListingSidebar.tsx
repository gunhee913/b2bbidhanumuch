"use client";

import { useMemo } from "react";
import { RotateCcw, Star } from "lucide-react";
import { CompactFilterPill } from "./CompactFilterPill";
import type { LiveListing } from "../api";
import { formatGradeLabel, parseQualityGrade } from "../lib/grade";
import { useListingFavorites } from "../hooks/useListingFavorites";
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

export type ListingViewMode = "individual" | "part" | "favorite";

const VIEW_MODE_TABS: { value: ListingViewMode; label: string }[] = [
  { value: "individual", label: "개체별" },
  { value: "part", label: "부위별" },
  { value: "favorite", label: "관심" },
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
  const favoriteIds = useListingFavorites((s) => s.favoriteIds);
  const favoriteIdSet = useMemo(
    () => new Set(favoriteIds),
    [favoriteIds],
  );

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

  const favoriteListings = useMemo(
    () => listings.filter((l) => favoriteIdSet.has(l.id)),
    [listings, favoriteIdSet],
  );

  const hasActiveFilter = !!(gradeFilter || companyFilter);

  const resetFilters = () => {
    onGradeChange("");
    onCompanyChange("");
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden border border-slate-200 bg-white">
      {/* 뷰 모드 탭 */}
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
      ) : viewMode === "part" ? (
        // 부위별 뷰는 LiveAuctionRoom 에서 PartSidebar 로 별도 렌더링됨.
        // 이 컴포넌트는 렌더링되지 않지만 방어적 fallback 을 남겨둔다.
        null
      ) : (
        <>
          {/* 상단: 관심 개체 카운트 */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <span className="text-[11px] font-semibold text-slate-500">
              관심 개체
            </span>
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-700">
              {favoriteListings.length}두
            </span>
          </div>

          {favoriteIds.length === 0 ? (
            <FavoriteEmptyState variant="never" />
          ) : favoriteListings.length === 0 ? (
            <FavoriteEmptyState variant="notToday" />
          ) : (
            <ListingTable
              listings={favoriteListings}
              allListings={listings}
              selectedListingId={selectedListingId}
              onSelect={onSelect}
              currentRoundListingIds={currentRoundListingIds}
              isLoading={isLoading}
            />
          )}
        </>
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
      {/* 고정 헤더 (스크롤 영역 밖) · 오른쪽에 스크롤 gutter(6px) 만큼 여백 확보 */}
      <div className="overflow-hidden border-b border-slate-200 bg-slate-50 pr-[6px]">
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

      {/* 스크롤 본문 (얇은 스크롤바 · gutter 예약) */}
      <div className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden">
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
      </div>
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
  const isFavorite = useListingFavorites((s) =>
    s.favoriteIds.includes(listing.id),
  );
  const toggleFavorite = useListingFavorites((s) => s.toggle);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(listing.id);
  };

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
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? "관심 해제" : "관심 등록"}
            aria-pressed={isFavorite}
            title={isFavorite ? "관심 해제" : "관심 등록"}
            className={cn(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
              isFavorite
                ? "text-amber-500 hover:text-amber-600"
                : "text-slate-300 hover:text-amber-500",
            )}
          >
            <Star
              className="h-3.5 w-3.5"
              fill={isFavorite ? "currentColor" : "none"}
              strokeWidth={isFavorite ? 1.5 : 2}
            />
          </button>
          <span className="text-[12px] font-bold -tracking-[0.04em] tabular-nums text-sky-700">
            {listing.listingNo}
          </span>
        </div>
      </td>
      <td className="px-2 py-3 text-center align-middle">
        <div
          className="truncate text-[12px] text-slate-700"
          title={listing.companyName || undefined}
        >
          {listing.companyName || "-"}
        </div>
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

function FavoriteEmptyState({
  variant,
}: {
  variant: "never" | "notToday";
}) {
  const title =
    variant === "never" ? "관심 등록된 개체가 없어요" : "오늘 상장분에 없어요";
  const description =
    variant === "never"
      ? "개체별 목록에서 별(★) 아이콘을 눌러 관심 개체를 등록해보세요."
      : "관심 개체는 저장되어 있지만 오늘 상장된 개체 중에는 없습니다.";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Star className="h-6 w-6 text-slate-300" />
      <span className="text-sm font-bold text-slate-700">{title}</span>
      <span className="text-xs leading-relaxed text-slate-400">
        {description}
      </span>
    </div>
  );
}

