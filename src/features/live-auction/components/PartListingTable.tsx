"use client";

import { Fragment, useMemo, useState } from "react";
import { EyeOff, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGradeLabel, parseQualityGrade } from "../lib/grade";
import {
  formatWeightKg,
  formatWon,
  formatWonPerKg,
} from "../lib/masking";
import { useListingFavorites } from "../hooks/useListingFavorites";
import type { PartGroupEntry, PartGroupItem } from "../lib/partGrouping";
import type { LivePart } from "../api";
import { CompactFilterPill } from "./CompactFilterPill";
import { BulkPriceCell } from "./BulkPriceCell";

const GRADE_OPTIONS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;

/**
 * 필터 값(`1++(9)`, `1+` 등) 이 개체의 육질/근내지방과 매칭되는지 검사.
 * `ListingSidebar` 의 동일 로직을 부위별 필터에서도 그대로 재사용.
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

export interface PartListingTableProps {
  group: PartGroupEntry | null;
  selectedListingId: string | null;
  selectedPartId: string | null;
  /** 행 자체 클릭 · 개체정보 탭으로 유도. */
  onSelect: (listingId: string, partId: string) => void;
  /** "입찰하기" 버튼 클릭 · 입찰하기 탭으로 유도. */
  onBidRequest: (listingId: string, partId: string) => void;
  dealerId: string | null;
  canReadBids: boolean;
  isLoading: boolean;
  /** 일괄입찰 편집 모드 · 좌측 체크박스 + 인라인 input 노출 */
  bulkMode?: boolean;
  bulkSelected?: Set<string>;
  bulkPrices?: Map<string, number>;
  onBulkToggle?: (partId: string) => void;
  onBulkPriceChange?: (partId: string, price: number | null) => void;
}

type SettlementCase = "won" | "lost" | "noBid";

function getSettlementCase(
  myBid: LivePart["allBids"][number] | null,
): SettlementCase {
  if (myBid?.isWinning) return "won";
  if (myBid) return "lost";
  return "noBid";
}

/**
 * 부위별 뷰의 오른쪽 상세 안에 들어가는 부위 리스트 테이블.
 *
 * 컬럼/스타일/낙찰 sub-row 모두 개체별 상세의 `PartsTable` 과 통일.
 * 부위별 특성상 앞에 `접수번호` / `등급` 컬럼이 추가됨.
 */
export function PartListingTable({
  group,
  selectedListingId,
  selectedPartId,
  onSelect,
  onBidRequest,
  dealerId,
  canReadBids,
  isLoading,
  bulkMode = false,
  bulkSelected,
  bulkPrices,
  onBulkToggle,
  onBulkPriceChange,
}: PartListingTableProps) {
  const groupName = group?.group ?? "부위";
  const count = group?.count ?? 0;

  const [gradeFilter, setGradeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [hideSettled, setHideSettled] = useState(false);

  const companyOptions = useMemo(() => {
    if (!group) return [];
    const set = new Set<string>();
    group.items.forEach(({ listing }) => {
      if (listing.companyName) set.add(listing.companyName);
    });
    return Array.from(set).sort();
  }, [group]);

  const filteredItems = useMemo(() => {
    if (!group) return [];
    return group.items.filter(({ listing, part }) => {
      if (gradeFilter) {
        const quality = parseQualityGrade(listing.grade || "");
        if (
          !matchesGradeFilter(gradeFilter, quality, listing.marblingScore)
        ) {
          return false;
        }
      }
      if (companyFilter && listing.companyName !== companyFilter) return false;
      if (hideSettled && part.allBids.some((b) => b.rank != null)) {
        return false;
      }
      return true;
    });
  }, [group, gradeFilter, companyFilter, hideSettled]);

  const hasActiveFilter = !!(gradeFilter || companyFilter || hideSettled);

  // 편집 모드 · 전체선택 상태 (미체결 부위만 대상)
  const editableItems = useMemo(
    () =>
      filteredItems.filter(
        ({ part }) => !part.allBids.some((b) => b.rank != null),
      ),
    [filteredItems],
  );
  const allSelected =
    bulkMode &&
    editableItems.length > 0 &&
    editableItems.every(({ part }) => bulkSelected?.has(part.id));
  const someSelected =
    bulkMode &&
    !allSelected &&
    editableItems.some(({ part }) => bulkSelected?.has(part.id));

  const handleToggleAll = () => {
    if (!onBulkToggle) return;
    if (allSelected) {
      editableItems.forEach(({ part }) => onBulkToggle(part.id));
    } else {
      editableItems.forEach(({ part }) => {
        if (!bulkSelected?.has(part.id)) onBulkToggle(part.id);
      });
    }
  };

  const colCount = bulkMode ? 7 : 6;

  const myBidsByPart = useMemo(() => {
    const map = new Map<string, LivePart["allBids"][number]>();
    if (!dealerId || !group) return map;
    for (const { part } of group.items) {
      const mine = part.allBids.find((b) => b.dealerId === dealerId);
      if (mine) map.set(part.id, mine);
    }
    return map;
  }, [group, dealerId]);

  return (
    <div className="flex flex-col overflow-hidden border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[14px] font-bold -tracking-[0.01em] text-slate-900">
            {groupName}
          </h3>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
            {hasActiveFilter ? (
              <>
                <span className="text-sky-700">{filteredItems.length}</span>
                <span className="mx-0.5 text-slate-300">/</span>
                {count}
              </>
            ) : (
              count
            )}
            <span className="ml-0.5 text-[10px] font-medium text-slate-400">
              건
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CompactFilterPill
            value={gradeFilter}
            onChange={setGradeFilter}
            label="등급"
            options={GRADE_OPTIONS}
          />
          <CompactFilterPill
            value={companyFilter}
            onChange={setCompanyFilter}
            label="업체"
            options={companyOptions}
            className={cn(!companyOptions.length && "opacity-60")}
          />
          <HideSettledToggle
            active={hideSettled}
            onClick={() => setHideSettled((v) => !v)}
          />
        </div>
      </div>

      <table className="w-full table-fixed text-sm">
        <colgroup>
          {bulkMode ? <col className="w-[28px]" /> : null}
          <col className={bulkMode ? "w-[100px]" : "w-[104px]"} />
          <col className={bulkMode ? "w-[54px]" : "w-[62px]"} />
          <col className={bulkMode ? "w-[50px]" : "w-[58px]"} />
          <col className={bulkMode ? "w-[44px]" : "w-[50px]"} />
          <col className={bulkMode ? "w-[68px]" : "w-[76px]"} />
          <col className={bulkMode ? "w-[108px]" : "w-auto"} />
        </colgroup>
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            {bulkMode ? (
              <th className="border-b border-slate-200 px-0 py-2.5 align-middle">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleToggleAll}
                    aria-label="전체 선택"
                    className="block h-4 w-4 cursor-pointer accent-sky-600"
                  />
                </div>
              </th>
            ) : null}
            <th className="border-b border-slate-200 px-2 py-2.5 text-left">
              접수번호
            </th>
            <th className="border-b border-slate-200 px-2 py-2.5 text-left">
              부위
            </th>
            <th className="border-b border-slate-200 px-2 py-2.5 text-center">
              등급
            </th>
            <th className="border-b border-slate-200 px-2 py-2.5 text-right">
              중량
            </th>
            <th className="border-b border-slate-200 px-3 py-2.5 text-right">
              최저단가
            </th>
            <th className="border-b border-slate-200 pl-4 pr-2.5 py-2.5 text-right">
              내 입찰가
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-12 text-center text-xs text-slate-400"
              >
                불러오는 중...
              </td>
            </tr>
          ) : !group || group.items.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-12 text-center text-xs text-slate-400"
              >
                선택한 부위의 상장 개체가 없습니다.
              </td>
            </tr>
          ) : filteredItems.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-12 text-center text-xs text-slate-400"
              >
                필터 조건에 해당하는 부위가 없습니다.
              </td>
            </tr>
          ) : (
            filteredItems.map((item, index) => {
              const myBid = myBidsByPart.get(item.part.id) || null;
              const isSelected =
                item.listing.id === selectedListingId &&
                item.part.id === selectedPartId;
              const winningBid =
                item.part.allBids.find((b) => b.isWinning) || null;
              const isSettled = item.part.allBids.some((b) => b.rank != null);
              const settlementCase = getSettlementCase(myBid);
              const isLast = index === filteredItems.length - 1;

              return (
                <Fragment key={item.part.id}>
                  <MainRow
                    item={item}
                    myBid={myBid}
                    isSelected={isSelected}
                    isSettled={isSettled}
                    settlementCase={settlementCase}
                    canReadBids={canReadBids}
                    hasSubRowBelow={isSettled}
                    onClick={() => onSelect(item.listing.id, item.part.id)}
                    onBidClick={() =>
                      onBidRequest(item.listing.id, item.part.id)
                    }
                    bulkMode={bulkMode}
                    bulkChecked={bulkSelected?.has(item.part.id) ?? false}
                    bulkPrice={bulkPrices?.get(item.part.id)}
                    onBulkToggle={
                      onBulkToggle ? () => onBulkToggle(item.part.id) : null
                    }
                    onBulkPriceChange={onBulkPriceChange ?? null}
                  />
                  {isSettled ? (
                    <SettlementSubRow
                      isSelected={isSelected}
                      settlementCase={settlementCase}
                      winningBid={winningBid}
                      weight={item.part.weight}
                      onClick={() => onSelect(item.listing.id, item.part.id)}
                      colSpan={colCount}
                    />
                  ) : null}
                  {!isLast ? (
                    <RowGap isSettled={isSettled} colSpan={colCount} />
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Row 사이의 시각 구분:
 * - 마감된 그룹 뒤 → 6px 투명 gap (모바일 detach 감성)
 * - 진행 중 row 뒤 → 1px hairline
 */
function RowGap({
  isSettled,
  colSpan = 6,
}: {
  isSettled: boolean;
  colSpan?: number;
}) {
  return (
    <tr aria-hidden>
      <td
        colSpan={colSpan}
        className={cn(isSettled ? "h-1.5" : "h-px bg-slate-100")}
      />
    </tr>
  );
}

/**
 * 부위 메인 row. 마감 시 slate-50 배경 + text muted (개체별 `PartsTable.MainRow` 와 동일).
 */
function MainRow({
  item,
  myBid,
  isSelected,
  isSettled,
  settlementCase,
  canReadBids,
  hasSubRowBelow,
  onClick,
  onBidClick,
  bulkMode = false,
  bulkChecked = false,
  bulkPrice,
  onBulkToggle,
  onBulkPriceChange,
}: {
  item: PartGroupItem;
  myBid: LivePart["allBids"][number] | null;
  isSelected: boolean;
  isSettled: boolean;
  settlementCase: SettlementCase;
  canReadBids: boolean;
  hasSubRowBelow: boolean;
  onClick: () => void;
  onBidClick: () => void;
  bulkMode?: boolean;
  bulkChecked?: boolean;
  bulkPrice?: number;
  onBulkToggle: (() => void) | null;
  onBulkPriceChange: ((partId: string, price: number | null) => void) | null;
}) {
  const { listing, part } = item;
  const iWon = settlementCase === "won";
  const iLost = settlementCase === "lost";

  const isFavorite = useListingFavorites((s) =>
    s.favoriteIds.includes(listing.id),
  );
  const toggleFavorite = useListingFavorites((s) => s.toggle);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(listing.id);
  };

  // 좌측 accent: 마감된 경우 sub-row 와 연결되도록 항상 표시,
  // 진행 중일 땐 선택 시에만 sky.
  // bulk 편집 모드에서 미체결 행은 체크박스가 선택 표시를 대신하므로 좌측 sky bar 는 생략.
  const settlementAccent = iWon
    ? "bg-sky-600"
    : iLost
      ? "bg-slate-400"
      : "bg-slate-300";
  const accentColor = isSettled
    ? settlementAccent
    : isSelected && !bulkMode
      ? "bg-sky-500"
      : null;

  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);
  const bulkHighlight = bulkMode && bulkChecked && !isSettled;
  const bulkHasMyBidUnchecked =
    bulkMode && !bulkChecked && !!myBid && !isSettled;

  return (
    <tr
      onClick={onClick}
      aria-selected={isSelected}
      className={cn(
        "relative cursor-pointer transition-colors",
        bulkHighlight && "bg-sky-50/70 hover:bg-sky-50",
        !bulkHighlight && bulkHasMyBidUnchecked && "bg-sky-50/25 hover:bg-sky-50/50",
        !bulkHighlight && !bulkHasMyBidUnchecked && isSelected && !isSettled && "bg-sky-50/70 hover:bg-sky-50",
        // 낙찰: 선택 여부와 무관하게 sky wash 로 강조 (스캔 시 즉시 인지)
        isSettled && iWon && isSelected && "bg-sky-100/70 hover:bg-sky-100/80",
        isSettled && iWon && !isSelected && "bg-sky-50/70 hover:bg-sky-100/50",
        // 유찰 · 미입찰(settled): 기존 slate wash 유지
        isSettled && !iWon && isSelected && "bg-sky-50/40 hover:bg-sky-50/50",
        isSettled && !iWon && !isSelected && "bg-slate-50 hover:bg-slate-100/60",
        !bulkHighlight && !bulkHasMyBidUnchecked && !isSelected && !isSettled && "hover:bg-slate-50/50",
      )}
    >
      {bulkMode ? (
        <td className="relative px-0 py-3 align-middle">
          {accentColor ? (
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-[3px]",
                accentColor,
              )}
              aria-hidden
            />
          ) : null}
          {!isSettled ? (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={bulkChecked}
                onChange={() => onBulkToggle?.()}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${part.partName} 선택`}
                className="block h-4 w-4 cursor-pointer accent-sky-600"
              />
            </div>
          ) : null}
        </td>
      ) : null}
      <td className="relative whitespace-nowrap px-2 py-3 text-left align-middle">
        {accentColor && !bulkMode ? (
          <span
            className={cn(
              "absolute inset-y-0 left-0 w-[3px]",
              accentColor,
            )}
            aria-hidden
          />
        ) : null}
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? "관심 해제" : "관심 등록"}
            aria-pressed={isFavorite}
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
      <td
        className={cn(
          "whitespace-nowrap px-2 py-3 text-left align-middle text-[13px] font-semibold",
          isSettled ? "text-slate-500" : "text-slate-900",
        )}
      >
        {part.partName}
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-center align-middle">
        <span
          className={cn(
            "text-[12px] font-semibold tabular-nums",
            isSettled ? "text-slate-400" : "text-slate-800",
          )}
        >
          {gradeLabel}
        </span>
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-2 py-3 text-right align-middle text-xs tabular-nums",
          isSettled ? "text-slate-400" : "text-slate-700",
        )}
      >
        {formatWeightKg(part.weight)}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-3 text-right align-middle text-xs tabular-nums",
          isSettled ? "text-slate-400" : "text-slate-700",
        )}
      >
        {formatWonPerKg(part.minPrice)}
      </td>
      <td
        className={cn(
          "whitespace-nowrap pl-4 pr-2.5 py-3 text-right align-middle",
          hasSubRowBelow && "border-b-0",
        )}
      >
        {bulkMode && !isSettled ? (
          <BulkPriceCell
            partId={part.id}
            value={bulkPrice}
            disabled={isSettled}
            minPrice={part.minPrice}
            onChange={(id, price) => onBulkPriceChange?.(id, price)}
          />
        ) : isSettled ? (
          myBid ? (
            <MyBidText
              bidPrice={myBid.bidPrice}
              canRead={canReadBids}
              tone={iWon ? "won" : "lost"}
            />
          ) : (
            <span className="text-xs text-slate-300">-</span>
          )
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBidClick();
            }}
            className={cn(
              "group/bid inline-flex h-6 min-w-[92px] items-baseline gap-0.5 border px-2 text-[11px] font-bold transition-colors",
              myBid ? "justify-end" : "justify-center",
              myBid
                ? "border-sky-500 bg-white text-sky-700 hover:border-sky-500 hover:bg-sky-500 hover:text-white"
                : "border-sky-500 bg-white text-sky-600 hover:border-sky-500 hover:bg-sky-500 hover:text-white",
            )}
          >
            {myBid ? (
              <MyBidBadge bidPrice={myBid.bidPrice} canRead={canReadBids} />
            ) : (
              "입찰하기"
            )}
          </button>
        )}
      </td>
    </tr>
  );
}

/**
 * 회차 마감 후 각 부위 아래에 표시되는 결과 sub-row.
 * 개체별 `PartsTable.SettlementSubRow` 와 동일하되 colSpan 만 6.
 */
function SettlementSubRow({
  isSelected,
  settlementCase,
  winningBid,
  weight,
  onClick,
  colSpan = 6,
}: {
  isSelected: boolean;
  settlementCase: SettlementCase;
  winningBid: LivePart["allBids"][number] | null;
  weight: number | null;
  onClick: () => void;
  colSpan?: number;
}) {
  const iWon = settlementCase === "won";
  const iLost = settlementCase === "lost";

  const accentColor = iWon
    ? "bg-sky-600"
    : iLost
      ? "bg-slate-400"
      : "bg-slate-300";

  const totalAmount =
    winningBid?.bidAmount ??
    (winningBid && weight ? Math.round(winningBid.bidPrice * weight) : null);

  return (
    <tr
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-colors",
        // 낙찰 · sub-row 도 main row 와 통일된 sky wash (하나의 "낙찰 블록" 으로 인지)
        iWon
          ? isSelected
            ? "bg-sky-100/60"
            : "bg-sky-50/70"
          : isSelected
            ? "bg-sky-50/40"
            : "bg-slate-50",
      )}
    >
      <td colSpan={colSpan} className="relative px-3 pb-2 pt-0.5">
        <span
          className={cn("absolute inset-y-0 left-0 w-[3px]", accentColor)}
          aria-hidden
        />
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-[11px]">
          {iWon ? (
            <span className="inline-flex shrink-0 items-center bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              낙찰
            </span>
          ) : iLost ? (
            <span className="inline-flex shrink-0 items-center bg-slate-200 px-1.5 py-px text-[10px] font-bold text-slate-600">
              유찰
            </span>
          ) : null}

          <span className="flex shrink-0 items-center gap-1">
            <span className="text-slate-400">낙찰자</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                iWon ? "text-sky-800" : "text-slate-700",
              )}
            >
              {winningBid?.dealerNo || "-"}
            </span>
          </span>

          <span className="text-slate-300">·</span>

          <span className="flex shrink-0 items-center gap-1">
            <span className="text-slate-400">낙찰가</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                iWon ? "text-sky-700" : "text-slate-700",
              )}
            >
              {formatWonPerKg(winningBid?.bidPrice ?? null)}
            </span>
          </span>

          <span className="text-slate-300">·</span>

          <span className="flex shrink-0 items-center gap-1">
            <span className="text-slate-400">총액</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                iWon ? "text-sky-700" : "text-slate-700",
              )}
            >
              {totalAmount != null ? formatWon(totalAmount) : "-"}
            </span>
          </span>
        </div>
      </td>
    </tr>
  );
}

/**
 * 낙찰분 숨김 토글 · `CompactFilterPill` 과 동일한 스펙(h-7, text-[11px], border, rounded-md).
 * 활성 상태에서 sky 계열로 강조하여 필터가 걸려있음을 명시.
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

const KRW_NUMBER = new Intl.NumberFormat("ko-KR");
const BID_MASK_TOKEN = "***";

/**
 * "내 입찰가" 배지 텍스트 · 좁은 컬럼에 맞게 두 조각으로 분리.
 * - 큰 숫자 (bold + tabular-nums + tighter tracking)
 * - 얇은 접미어 `원/kg` (10px · 0.85 opacity)
 * 컬럼 폭이 부족해 텍스트가 잘리던 문제 해소.
 */
function MyBidBadge({
  bidPrice,
  canRead,
}: {
  bidPrice: number;
  canRead: boolean;
}) {
  if (!canRead) return <span className="tabular-nums">{BID_MASK_TOKEN}</span>;
  const rounded = Math.round(bidPrice);
  return (
    <>
      <span className="tabular-nums -tracking-[0.02em]">
        {KRW_NUMBER.format(rounded)}
      </span>
      <span className="text-[10px] font-semibold text-sky-500 group-hover/bid:text-white/85">
        원/kg
      </span>
    </>
  );
}

/**
 * 낙찰 후 표시되는 "내 입찰가" 텍스트 (버튼 없이 텍스트만).
 * 배지와 동일한 분리 방식으로 tone(won/lost) 만 색상으로 구분.
 */
function MyBidText({
  bidPrice,
  canRead,
  tone,
}: {
  bidPrice: number;
  canRead: boolean;
  tone: "won" | "lost";
}) {
  if (!canRead) {
    return (
      <span className="text-xs font-bold tabular-nums text-slate-400">
        {BID_MASK_TOKEN}
      </span>
    );
  }
  const rounded = Math.round(bidPrice);
  return (
    <span
      className={cn(
        "inline-flex items-baseline justify-end gap-0.5 tabular-nums",
        tone === "won" ? "text-sky-700" : "text-slate-400",
      )}
    >
      <span className="text-xs font-bold -tracking-[0.02em]">
        {KRW_NUMBER.format(rounded)}
      </span>
      <span className="text-[10px] font-semibold opacity-85">원/kg</span>
    </span>
  );
}
