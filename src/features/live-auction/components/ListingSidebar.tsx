"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { TruncatedText } from "@/components/ui/tooltip";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { CompactFilterPill } from "./CompactFilterPill";
import type { LiveListing } from "../api";
import { formatGradeLabel, parseQualityGrade } from "../lib/grade";
import { cn } from "@/lib/utils";

/**
 * 해당 개체(상장) 안에서 낙찰이 확정된 부위 수를 카운트.
 * `PartSidebar.countSettled` 와 동일 로직 (allBids 중 rank 필드가 채워진 항목 존재).
 */
function countSettledPartsInListing(listing: LiveListing): number {
  let n = 0;
  for (const p of listing.parts) {
    if (p.allBids.some((b) => b.rank != null)) n += 1;
  }
  return n;
}

/**
 * 개체 라이브 활동 지표:
 *  - bidCount    · 상장 내 모든 부위의 총 입찰 액션 수 (part.bidCount 합계)
 *  - bidderCount · 상장 내 unique 딜러 수 (allBids.dealerId 기준)
 * `PartSidebar.computeGroupActivity` 와 동일 시맨틱 · 라이브 tick up.
 */
function computeListingActivity(listing: LiveListing): {
  bidCount: number;
  bidderCount: number;
} {
  let bidCount = 0;
  const bidderIds = new Set<string>();
  for (const p of listing.parts) {
    bidCount += p.bidCount;
    for (const b of p.allBids) {
      bidderIds.add(b.dealerId);
    }
  }
  return { bidCount, bidderCount: bidderIds.size };
}

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
  // `currentRoundListingIds` 는 이전 테이블에서 회차 필터링용이었으나
  // 새 레이아웃(PartSidebar 미러)에서는 사용하지 않음. props 는 backwards
  // compat 을 위해 유지 (LiveAuctionRoom 이 계속 넘겨주므로 receive 만).
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
      {/* 뷰 모드 탭 · `PartSidebar` 와 동일 (기본 slate-900) */}
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
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {viewMode === "individual" ? (
        <IndividualView
          listings={listings}
          filtered={filtered}
          selectedListingId={selectedListingId}
          onSelect={onSelect}
          gradeFilter={gradeFilter}
          companyFilter={companyFilter}
          onGradeChange={onGradeChange}
          onCompanyChange={onCompanyChange}
          companyOptions={companyOptions}
          hasActiveFilter={hasActiveFilter}
          resetFilters={resetFilters}
          isLoading={isLoading}
        />
      ) : (
        // 부위별 뷰는 LiveAuctionRoom 에서 PartSidebar 로 별도 렌더링됨.
        // 이 컴포넌트는 렌더링되지 않지만 방어적 fallback 을 남겨둔다.
        null
      )}
    </aside>
  );
}

/**
 * 개체별 뷰 · `PartSidebar` (부위별) 와 완전 통일된 스펙.
 *
 * 구조 (위 → 아래 · `PartSidebar` 미러):
 *  1. 필터 행 · 등급/업체 필터(좌) + 요약 카운트 "총 X건 · 낙찰 Y건"(우)
 *  2. 컬럼 헤더 · [개체 | 상장 | 낙찰 || 입찰 | 참여] · 5-col · 2 시맨틱 그룹
 *  3. 개체 리스트 · 각 행 = Fintech pill button
 *     - 좌 (2-line stack · `ListingInfoStack`):
 *         Line 1 · 상장번호 (좌) + 업체명 (우 · justify-between)
 *         Line 2 · [등급 · 축종 · 성별]
 *     - Group 1 · 상장 · 낙찰 amber pill
 *     - Group 2 · 입찰 NumberFlow + flash · 참여자
 */
function IndividualView({
  listings,
  filtered,
  selectedListingId,
  onSelect,
  gradeFilter,
  companyFilter,
  onGradeChange,
  onCompanyChange,
  companyOptions,
  hasActiveFilter,
  resetFilters,
  isLoading,
}: {
  listings: LiveListing[];
  filtered: LiveListing[];
  selectedListingId: string | null;
  onSelect: (id: string) => void;
  gradeFilter: string;
  companyFilter: string;
  onGradeChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  companyOptions: string[];
  hasActiveFilter: boolean;
  resetFilters: () => void;
  isLoading: boolean;
}) {
  const settledByListing = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of filtered) map.set(l.id, countSettledPartsInListing(l));
    return map;
  }, [filtered]);

  const activityByListing = useMemo(() => {
    const map = new Map<
      string,
      { bidCount: number; bidderCount: number }
    >();
    for (const l of filtered) map.set(l.id, computeListingActivity(l));
    return map;
  }, [filtered]);

  const totalSettled = useMemo(() => {
    let sum = 0;
    for (const n of settledByListing.values()) sum += n;
    return sum;
  }, [settledByListing]);

  return (
    <>
      {/* 필터(좌) + 요약 카운트(우) · `PartSidebar` 와 동일 컨벤션 */}
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
        <div className="flex shrink-0 items-baseline gap-1.5 text-[11px] font-bold tabular-nums">
          <span className="flex items-baseline gap-0.5 text-slate-700">
            <span className="text-slate-400">총</span>
            <span>{filtered.length}</span>
            <span className="text-[10px] font-medium text-slate-400">건</span>
          </span>
          <span className="text-slate-200">·</span>
          <span
            className={cn(
              "flex items-baseline gap-0.5",
              totalSettled > 0 ? "text-sky-700" : "text-slate-400",
            )}
          >
            <span>낙찰</span>
            <span>{totalSettled}</span>
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
      </div>

      {/*
       * 컬럼 헤더 · 5-col · 2개 시맨틱 그룹 (아래 rows 와 동일 template).
       *   [개체 | 상장 | 낙찰 || 입찰 | 참여]
       * `PartSidebar` 헤더와 완벽 대칭 · 두 뷰 스캔 리듬 동일.
       */}
      <div className="grid grid-cols-[minmax(0,1fr)_28px_28px_38px_28px] items-baseline gap-x-1.5 border-b border-slate-100 bg-slate-50/60 pl-4 pr-3 py-2">
        <span className="text-[10px] font-semibold text-slate-500">개체</span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          상장
        </span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          낙찰
        </span>
        <span className="border-l border-slate-200/60 pl-2 text-right text-[10px] font-semibold text-sky-700">
          입찰
        </span>
        <span className="text-right text-[10px] font-semibold text-sky-700/80">
          참여
        </span>
      </div>

      {/*
       * 개체 리스트 · 심플 텍스트 톤 · `PartSidebar` 와 동일 스펙.
       * 뱃지/pill/dot/ring 없음 · 배경(selected) + 텍스트 색으로만 상태 표현.
       * 라이브 애니메이션만 유지 · 입찰 NumberFlow + flash-up.
       */}
      <OverlayScroll className="flex-1" autoHide="leave">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            {listings.length === 0
              ? "오늘 상장된 개체가 없습니다."
              : "필터에 해당하는 개체가 없습니다."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((listing) => {
              const isActive = listing.id === selectedListingId;
              const partCount = listing.parts.length;
              const settled = settledByListing.get(listing.id) ?? 0;
              const activity = activityByListing.get(listing.id) ?? {
                bidCount: 0,
                bidderCount: 0,
              };
              return (
                <li key={listing.id}>
                  <ListingRow
                    listing={listing}
                    partCount={partCount}
                    settled={settled}
                    bidCount={activity.bidCount}
                    bidderCount={activity.bidderCount}
                    isActive={isActive}
                    onClick={() => onSelect(listing.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </OverlayScroll>
    </>
  );
}

/**
 * 개체 row · 5-col grid · 순수 텍스트 톤 (뱃지/pill/dot 없음).
 * `PartSidebar.PartRow` 와 완전 통일된 스펙.
 * 라이브 애니메이션 · 입찰 NumberFlow + flash-up on 증가.
 */
function ListingRow({
  listing,
  partCount,
  settled,
  bidCount,
  bidderCount,
  isActive,
  onClick,
}: {
  listing: LiveListing;
  partCount: number;
  settled: number;
  bidCount: number;
  bidderCount: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const bidFlash = usePriceFlash(bidCount);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_28px_28px_38px_28px] items-center gap-x-1.5 pl-4 pr-3 py-3 text-left transition-colors",
        isActive ? "bg-slate-100" : "hover:bg-slate-50",
      )}
    >
      <ListingInfoStack listing={listing} />

      {/* 상장 · static base */}
      <span className="flex items-baseline justify-end text-[11px] font-semibold text-slate-500 tabular-nums">
        {partCount}
      </span>

      {/* 낙찰 · 값 있으면 sky-700 · 없으면 muted */}
      <span
        className={cn(
          "flex items-baseline justify-end text-[11px] font-semibold tabular-nums",
          settled > 0 ? "text-sky-700" : "text-slate-300",
        )}
      >
        {settled}
      </span>

      {/* 입찰 · 라이브 카운터 · NumberFlow + flash-up on 증가 */}
      <span
        className={cn(
          "flex items-center justify-end border-l border-slate-200/60 pl-2 text-[11px] font-bold tabular-nums",
          bidCount > 0 ? "text-sky-700" : "text-slate-300",
          bidFlash === "up" && "flash-up",
        )}
      >
        <NumberFlow value={bidCount} locales="ko-KR" willChange />
      </span>

      {/* 참여자 · secondary · 값 있으면 slate-600 · 없으면 muted */}
      <span
        className={cn(
          "flex items-baseline justify-end text-[11px] font-semibold tabular-nums",
          bidderCount > 0 ? "text-slate-600" : "text-slate-300",
        )}
      >
        {bidderCount}
      </span>
    </button>
  );
}

/**
 * 개체 정보 2-line 스택 · 상장번호 dominant + meta 단일 라인 정렬.
 *
 * Line 1 · [상장번호] 단독 · sky-700 bold · 스캔 진입점
 * Line 2 · [등급 · 축종(성별) · 업체명]
 *   - 등급 · semibold slate-900
 *   - 축종/성별 · `한우(거세)` 형식으로 응축 · slate-600
 *   - 업체명 · truncate + tooltip · 남는 폭 auto-fit
 *
 * 폭 제약 (사이드바 좁음 + 우측 5-metric 확장) 대응:
 *  - line 2 폰트 11px (기존 11.5px) · `-tracking-[0.015em]` 자간 압축
 *  - 축종+성별 괄호 병합 (구분자 1개 절감 · `·` 3개 → 2개)
 *  - 업체명만 `min-w-0 truncate` (앞 요소 `shrink-0`) 로 마지막에 자연 축소
 */
function ListingInfoStack({ listing }: { listing: LiveListing }) {
  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);
  const breed = listing.breed?.trim();
  const gender = listing.gender?.trim();
  const company = listing.companyName?.trim();

  const breedGender =
    breed && gender ? `${breed}(${gender})` : breed || gender || null;

  return (
    <div className="flex min-w-0 flex-col leading-tight">
      {/* Line 1 · 상장번호 단독 */}
      <span className="truncate whitespace-nowrap text-[13px] font-bold tabular-nums -tracking-[0.01em] text-sky-700">
        {listing.listingNo}
      </span>

      {/* Line 2 · [등급 · 축종(성별) · 업체명] · 자간 압축 + 폰트 축소 */}
      <div className="mt-1 flex min-w-0 items-baseline gap-1 -tracking-[0.015em]">
        <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold tabular-nums text-slate-900">
          {gradeLabel}
        </span>
        {breedGender ? (
          <>
            <span className="shrink-0 text-slate-300" aria-hidden>
              ·
            </span>
            <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-600">
              {breedGender}
            </span>
          </>
        ) : null}
        {company ? (
          <>
            <span className="shrink-0 text-slate-300" aria-hidden>
              ·
            </span>
            <TruncatedText
              value={company}
              className="min-w-0 truncate text-[11px] font-medium text-slate-500"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
