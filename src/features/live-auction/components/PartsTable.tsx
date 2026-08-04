"use client";

import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { LiveListing, LivePart } from "../api";
import {
  formatKrw,
  formatWeightKg,
  formatWon,
  formatWonPerKg,
  maskKrw,
} from "../lib/masking";
import { BulkPriceCell } from "./BulkPriceCell";

export interface PartsTableProps {
  listing: LiveListing;
  dealerId: string | null;
  isLoggedIn: boolean;
  isAuthorized: boolean;
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  /**
   * "입찰하기" 버튼 클릭 · 부모(`LiveAuctionRoom`)에서 우측 상세 패널의
   * `bid` 탭을 활성화하는 데 사용. 부위별 뷰의 `PartListingTable` 과 동일 UX.
   * 제공되지 않으면 버튼 대신 기존의 masked 값 노출로 fallback.
   */
  onBidRequest?: (partId: string) => void;
  /** 낙찰 완료된 부위 숨김 (헤더 필터에서 토글) */
  hideSettled?: boolean;
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

export function PartsTable({
  listing,
  dealerId,
  isLoggedIn,
  isAuthorized,
  selectedPartId,
  onSelectPart,
  onBidRequest,
  hideSettled = false,
  bulkMode = false,
  bulkSelected,
  bulkPrices,
  onBulkToggle,
  onBulkPriceChange,
}: PartsTableProps) {
  const canReadBids = isLoggedIn && isAuthorized;

  const myBidsByPart = useMemo(() => {
    if (!dealerId) return new Map<string, LivePart["allBids"][number]>();
    const map = new Map<string, LivePart["allBids"][number]>();
    listing.parts.forEach((p) => {
      const mine = p.allBids.find((b) => b.dealerId === dealerId);
      if (mine) map.set(p.id, mine);
    });
    return map;
  }, [listing.parts, dealerId]);

  const visibleParts = useMemo(() => {
    if (!hideSettled) return listing.parts;
    return listing.parts.filter(
      (p) => !p.allBids.some((b) => b.rank != null),
    );
  }, [listing.parts, hideSettled]);

  // 편집 모드의 전체 선택 상태 계산 (미체결만 대상)
  const editableParts = useMemo(
    () =>
      visibleParts.filter(
        (p) => !p.allBids.some((b) => b.rank != null),
      ),
    [visibleParts],
  );
  const allSelected =
    bulkMode &&
    editableParts.length > 0 &&
    editableParts.every((p) => bulkSelected?.has(p.id));
  const someSelected =
    bulkMode &&
    !allSelected &&
    editableParts.some((p) => bulkSelected?.has(p.id));

  const handleToggleAll = () => {
    if (!onBulkToggle) return;
    if (allSelected) {
      editableParts.forEach((p) => onBulkToggle(p.id));
    } else {
      editableParts.forEach((p) => {
        if (!bulkSelected?.has(p.id)) onBulkToggle(p.id);
      });
    }
  };

  const colCount = bulkMode ? 5 : 4;

  return (
    <div className="overflow-hidden">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          {bulkMode ? <col className="w-[28px]" /> : null}
          <col className={bulkMode ? "w-[92px]" : "w-[110px]"} />
          <col className="w-[70px]" />
          <col className="w-auto" />
          <col className={bulkMode ? "w-[108px]" : "w-auto"} />
        </colgroup>
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            {bulkMode ? (
              <th className="border-b border-slate-200 px-0 py-2 align-middle">
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
            <th className="border-b border-slate-200 px-3 py-2 text-left">
              부위
            </th>
            <th className="border-b border-slate-200 px-3 py-2 text-right">
              중량
            </th>
            <th className="border-b border-slate-200 px-3 py-2 text-right">
              최저단가
            </th>
            <th className="border-b border-slate-200 px-3 py-2 text-right">
              내 입찰가
            </th>
          </tr>
        </thead>
        <tbody>
          {listing.parts.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-12 text-center text-xs text-slate-400"
              >
                등록된 부위가 없습니다.
              </td>
            </tr>
          ) : visibleParts.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-12 text-center text-xs text-slate-400"
              >
                낙찰 완료된 부위만 있습니다. 숨김 해제 후 확인해 주세요.
              </td>
            </tr>
          ) : (
            visibleParts.map((part, index) => {
              const myBid = myBidsByPart.get(part.id) || null;
              const isSelected = selectedPartId === part.id;
              const winningBid =
                part.allBids.find((b) => b.isWinning) || null;
              const isSettled = part.allBids.some((b) => b.rank != null);
              const settlementCase = getSettlementCase(myBid);
              const isLast = index === visibleParts.length - 1;

              return (
                <Fragment key={part.id}>
                  <MainRow
                    part={part}
                    myBid={myBid}
                    isSelected={isSelected}
                    isSettled={isSettled}
                    settlementCase={settlementCase}
                    canReadBids={canReadBids}
                    hasSubRowBelow={isSettled}
                    onClick={() => onSelectPart(part.id)}
                    onBidClick={
                      onBidRequest ? () => onBidRequest(part.id) : null
                    }
                    bulkMode={bulkMode}
                    bulkChecked={bulkSelected?.has(part.id) ?? false}
                    bulkPrice={bulkPrices?.get(part.id)}
                    onBulkToggle={
                      onBulkToggle ? () => onBulkToggle(part.id) : null
                    }
                    onBulkPriceChange={onBulkPriceChange ?? null}
                  />
                  {isSettled ? (
                    <SettlementSubRow
                      isSelected={isSelected}
                      settlementCase={settlementCase}
                      winningBid={winningBid}
                      weight={part.weight}
                      onClick={() => onSelectPart(part.id)}
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
  colSpan = 4,
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
 * 부위 메인 row. 마감 시 slate-50 배경 + text muted.
 */
function MainRow({
  part,
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
  part: LivePart;
  myBid: LivePart["allBids"][number] | null;
  isSelected: boolean;
  isSettled: boolean;
  settlementCase: SettlementCase;
  canReadBids: boolean;
  hasSubRowBelow: boolean;
  onClick: () => void;
  /** null 이면 기존 masked 값 표시 (하위호환) */
  onBidClick: (() => void) | null;
  bulkMode?: boolean;
  bulkChecked?: boolean;
  bulkPrice?: number;
  onBulkToggle: (() => void) | null;
  onBulkPriceChange: ((partId: string, price: number | null) => void) | null;
}) {
  const iWon = settlementCase === "won";
  const iLost = settlementCase === "lost";

  // 좌측 accent: 마감된 경우 sub-row 와 연결되도록 항상 표시,
  // 진행 중일 땐 선택 시에만 sky.
  // (마감 + 선택 조합은 배경 tint 로 구분)
  const settlementAccent = iWon
    ? "bg-sky-600"
    : iLost
      ? "bg-slate-400"
      : "bg-slate-300";
  // bulk 편집 모드에서 미체결 행은 체크박스가 선택 표시를 대신하므로
  // 좌측 sky accent bar 는 노출하지 않는다. 낙찰된 행의 settlement accent 는 유지.
  const accentColor = isSettled
    ? settlementAccent
    : isSelected && !bulkMode
      ? "bg-sky-500"
      : null;

  const bulkHighlight = bulkMode && bulkChecked && !isSettled;
  const bulkHasMyBidUnchecked =
    bulkMode && !bulkChecked && !!myBid && !isSettled;
  // 진행 중 · 내가 입찰한 행 (bulk 모드가 아닌 일반 조회 시).
  // 미입찰 흰 배경 ↔ 낙찰 진한 sky 사이의 중간 톤으로 스캔 시 즉시 인지.
  const hasMyBidInProgress = !bulkMode && !!myBid && !isSettled;

  return (
    <tr
      onClick={onClick}
      aria-selected={isSelected}
      className={cn(
        "relative cursor-pointer transition-colors",
        bulkHighlight && "bg-sky-50/70 hover:bg-sky-50",
        !bulkHighlight && bulkHasMyBidUnchecked && "bg-sky-50/25 hover:bg-sky-50/50",
        !bulkHighlight && !bulkHasMyBidUnchecked && isSelected && !isSettled && "bg-sky-50/70 hover:bg-sky-50",
        // 진행 중 · 내가 입찰한 행 (미선택) → 옅은 sky wash 로 3단 위계 구성
        hasMyBidInProgress && !isSelected && "bg-sky-50/40 hover:bg-sky-50/60",
        // 낙찰: 선택 여부와 무관하게 sky wash 로 강조 (스캔 시 즉시 인지)
        isSettled && iWon && isSelected && "bg-sky-100/70 hover:bg-sky-100/80",
        isSettled && iWon && !isSelected && "bg-sky-50/70 hover:bg-sky-100/50",
        // 유찰 · 미입찰(settled): 기존 slate wash 유지
        isSettled && !iWon && isSelected && "bg-sky-50/40 hover:bg-sky-50/50",
        isSettled && !iWon && !isSelected && "bg-slate-50 hover:bg-slate-100/60",
        !bulkHighlight && !bulkHasMyBidUnchecked && !hasMyBidInProgress && !isSelected && !isSettled && "hover:bg-slate-50/50",
      )}
    >
      {bulkMode ? (
        <td className="relative px-0 py-2 align-middle">
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
      <td
        className={cn(
          "relative px-3 py-2 text-left text-sm font-semibold",
          isSettled ? "text-slate-500" : "text-slate-900",
        )}
      >
        {accentColor && !bulkMode ? (
          <span
            className={cn(
              "absolute inset-y-0 left-0 w-[3px]",
              accentColor,
            )}
            aria-hidden
          />
        ) : null}
        {part.partName}
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right text-xs tabular-nums",
          isSettled ? "text-slate-400" : "text-slate-700",
        )}
      >
        {formatWeightKg(part.weight)}
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right text-xs tabular-nums",
          isSettled ? "text-slate-400" : "text-slate-700",
        )}
      >
        {formatKrw(part.minPrice)}
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right",
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
            <span
              className={cn(
                "text-xs font-bold tabular-nums",
                iWon ? "text-sky-700" : "text-slate-400",
              )}
            >
              {maskKrw(myBid.bidPrice, canReadBids)}
            </span>
          ) : (
            <span className="text-xs text-slate-300">-</span>
          )
        ) : onBidClick ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBidClick();
            }}
            className={cn(
              "group/bid inline-flex h-6 min-w-[92px] items-baseline gap-0.5 border px-2 text-[11px] font-bold transition-colors",
              myBid ? "justify-end" : "justify-center",
              // 입찰중: filled sky (강조) · 미입찰: outline sky (수동 액션 유도)
              myBid
                ? "border-sky-600 bg-sky-600 text-white shadow-sm hover:border-sky-700 hover:bg-sky-700"
                : "border-sky-500 bg-white text-sky-600 hover:border-sky-500 hover:bg-sky-500 hover:text-white",
            )}
          >
            {myBid ? (
              <MyBidBadgeInline bidPrice={myBid.bidPrice} canRead={canReadBids} />
            ) : (
              "입찰하기"
            )}
          </button>
        ) : myBid ? (
          <span
            className={cn(
              "text-xs font-bold tabular-nums",
              canReadBids ? "text-sky-700" : "text-slate-400",
            )}
          >
            {maskKrw(myBid.bidPrice, canReadBids)}
          </span>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        )}
      </td>
    </tr>
  );
}

/**
 * 회차 마감 후 각 부위 아래에 표시되는 결과 sub-row.
 * 3가지 케이스:
 * - won  → sky-600 accent + `낙찰` chip (진한 sky · 브랜드)
 * - lost → slate accent + `유찰` chip
 * - noBid → slate accent (chip 없음) · 순수 정보 표시
 */
function SettlementSubRow({
  isSelected,
  settlementCase,
  winningBid,
  weight,
  onClick,
  colSpan = 4,
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

  // 총 낙찰금액 = 낙찰가 × 중량 (winningBid.bidAmount 이 이미 계산된 경우 우선)
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

const KRW_NUMBER = new Intl.NumberFormat("ko-KR");
const BID_MASK_TOKEN = "***";

/**
 * "내 입찰가" 아웃라인 버튼 안 텍스트.
 * 단위(`원/kg`)는 헤더 우측 상단 캡션에 명시하므로 셀에서는 순수 숫자만 표시.
 */
function MyBidBadgeInline({
  bidPrice,
  canRead,
}: {
  bidPrice: number;
  canRead: boolean;
}) {
  if (!canRead) return <span className="tabular-nums">{BID_MASK_TOKEN}</span>;
  const rounded = Math.round(bidPrice);
  return (
    <span className="tabular-nums -tracking-[0.02em]">
      {KRW_NUMBER.format(rounded)}
    </span>
  );
}

/** listing 하단 요약 라인용 */
export function computeListingSummary(listing: LiveListing) {
  const totalParts = listing.parts.length;
  const winningParts = listing.parts.filter((p) => p.bidCount > 0).length;
  const totalMinAmount = listing.parts.reduce((sum, p) => {
    if (!p.weight || !p.minPrice) return sum;
    return sum + p.weight * p.minPrice;
  }, 0);

  return { totalParts, winningParts, totalMinAmount };
}
