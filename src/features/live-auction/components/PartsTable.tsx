"use client";

import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { LiveListing, LivePart } from "../api";
import { formatWon, formatWonPerKg } from "../lib/masking";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { BulkPriceCell } from "./BulkPriceCell";
import {
  MaskedPriceSlot,
  PriceSlot,
  type PriceTone,
} from "./PriceSlot";

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

  const colCount = bulkMode ? 6 : 5;

  return (
    <div className="overflow-hidden">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          {bulkMode ? <col className="w-[28px]" /> : null}
          <col className={bulkMode ? "w-[92px]" : "w-[110px]"} />
          <col className="w-[70px]" />
          <col className="w-auto" />
          <col className="w-[104px]" />
          <col className={bulkMode ? "w-[108px]" : "w-auto"} />
        </colgroup>
        <thead className="bg-slate-50 text-[11px] font-semibold -tracking-[0.01em] text-slate-500">
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
              현재 최고가
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

  // 진행 중 · 내 입찰 상태 3분화 (부위별 탭과 동일 스펙):
  //   - isMyTop     · 내가 최고가 (leading)         → sky wash + sky-500 bar
  //   - isMyOutbid  · 내가 밀림 (outbid, 액션 필요) → rose wash + rose-500 bar
  //   - 그 외        · 미입찰                       → white / hover 만
  const isMyTop = !isSettled && !!myBid && part.topBid?.isMine === true;
  const isMyOutbid = !isSettled && !!myBid && part.topBid?.isMine !== true;

  // 좌측 accent bar 색: 마감 → 결과별, 진행 중 → 상태별 (내 1위/밀림/선택).
  //   iWon  → sky-600, iLost → rose-500 (진행 중 밀림과 시맨틱 통일), noBid → slate-300
  const settlementAccent = iWon
    ? "bg-sky-600"
    : iLost
      ? "bg-rose-500"
      : "bg-slate-300";
  const progressAccent = isMyTop
    ? "bg-sky-500"
    : isMyOutbid
      ? "bg-rose-500"
      : isSelected && !bulkMode
        ? "bg-sky-500"
        : null;
  const accentColor = isSettled ? settlementAccent : progressAccent;

  const bulkHighlight = bulkMode && bulkChecked && !isSettled;
  // bulk 모드 · 체크 안 됨 + 내 입찰 있음:
  //   - 내가 1위     → 옅은 sky wash
  //   - 내가 밀림    → 옅은 rose wash (액션 필요 강조)
  const bulkMyBidWash =
    bulkMode && !bulkChecked && !!myBid && !isSettled
      ? isMyTop
        ? "bg-sky-50/30 hover:bg-sky-50/50"
        : "bg-rose-50/30 hover:bg-rose-50/50"
      : null;

  // 실시간 최고가 변화 감지 → row flash (Upbit/Bithumb 스타일).
  const priceFlash = usePriceFlash(!isSettled ? part.topBid?.bidPrice : null);

  return (
    <tr
      onClick={onClick}
      aria-selected={isSelected}
      className={cn(
        "relative cursor-pointer transition-colors",
        priceFlash === "up" && "flash-up",
        priceFlash === "down" && "flash-down",
        // bulk highlight (체크됨) — 편집 상태 우선, sky wash 로 통일
        bulkHighlight && "bg-sky-50/70 hover:bg-sky-50",
        // bulk 모드 · 체크 안됨 · 내 입찰 상태 wash
        !bulkHighlight && bulkMyBidWash,
        // 진행 중 · 내가 1위 (leading) → sky wash · selected 시 진한 톤
        !bulkMode && isMyTop && isSelected && "bg-sky-100/60 hover:bg-sky-100/80",
        !bulkMode && isMyTop && !isSelected && "bg-sky-50/60 hover:bg-sky-50/80",
        // 진행 중 · 내가 밀림 (outbid) → rose wash · 액션 유도
        !bulkMode && isMyOutbid && isSelected && "bg-rose-100/60 hover:bg-rose-100/80",
        !bulkMode && isMyOutbid && !isSelected && "bg-rose-50/60 hover:bg-rose-50/80",
        // 진행 중 · 미입찰 · selected → 기존 sky selection 유지
        !bulkMode && !isMyTop && !isMyOutbid && !isSettled && isSelected && "bg-sky-50/70 hover:bg-sky-50",
        // 진행 중 · 미입찰 · unselected → 흰 배경 + hover 만
        !bulkMode && !isMyTop && !isMyOutbid && !isSettled && !isSelected && "hover:bg-slate-50/50",
        // 낙찰 (settled + iWon): sky wash · 선택 시 진한 톤
        isSettled && iWon && isSelected && "bg-sky-100/70 hover:bg-sky-100/80",
        isSettled && iWon && !isSelected && "bg-sky-50/70 hover:bg-sky-100/50",
        // 정산 · 미낙찰 (iLost, 참여했으나 밀림) → rose wash (진행 중 밀림 상태의 연장)
        isSettled && iLost && isSelected && "bg-rose-100/60 hover:bg-rose-100/80",
        isSettled && iLost && !isSelected && "bg-rose-50/60 hover:bg-rose-50/80",
        // 정산 · 미입찰 (noBid, 참여 안 함) → slate wash (중립)
        isSettled && !iWon && !iLost && isSelected && "bg-sky-50/40 hover:bg-sky-50/50",
        isSettled && !iWon && !iLost && !isSelected && "bg-slate-50 hover:bg-slate-100/60",
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
          isSettled ? "text-slate-700" : "text-slate-900",
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
          "px-3 py-2 text-right text-xs",
          isSettled ? "text-slate-600" : "text-slate-900",
        )}
      >
        <WeightCell weight={part.weight} isSettled={isSettled} />
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right",
          isSettled ? "text-slate-600" : "text-slate-700",
        )}
      >
        <PriceSlot
          value={part.minPrice}
          tone={isSettled ? "muted" : "regular"}
        />
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right",
          hasSubRowBelow && "border-b-0",
        )}
      >
        <TopBidCell
          topBid={part.topBid}
          isSettled={isSettled}
        />
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
            !canReadBids ? (
              <MaskedPriceSlot tone={iWon ? "won" : "lost"} />
            ) : (
              <PriceSlot
                value={myBid.bidPrice}
                tone={iWon ? "won" : "lost"}
              />
            )
          ) : (
            <PriceSlot value={null} tone="muted" />
          )
        ) : onBidClick ? (
          // 셀 자체가 text-right 로 정렬되어 있어 inline-flex 버튼이 우측 벽에 밀착됨.
          // flex justify-center 래퍼로 감싸 버튼만 셀 내부 중앙에 배치 · 좌우 breathing 확보.
          // (부위별 뷰 `PartListingTable` 과 동일 스펙: h-7 · min-w-[60px] · px-2 · font-semibold)
          <div className="flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBidClick();
              }}
              className={cn(
                "group/bid inline-flex h-7 min-w-[60px] items-center justify-center gap-0.5 border px-2 text-[11px] font-semibold transition-colors",
                // 입찰중: filled sky (강조) · 미입찰: outline sky (수동 액션 유도)
                myBid
                  ? "border-sky-600 bg-sky-600 text-white shadow-sm hover:border-sky-700 hover:bg-sky-700"
                  : "border-sky-500 bg-white text-sky-600 hover:border-sky-500 hover:bg-sky-500 hover:text-white",
              )}
            >
              {myBid ? (
                <MyBidBadgeInline
                  bidPrice={myBid.bidPrice}
                  canRead={canReadBids}
                />
              ) : (
                "입찰하기"
              )}
            </button>
          </div>
        ) : myBid ? (
          !canReadBids ? (
            <MaskedPriceSlot tone="mine" />
          ) : (
            <PriceSlot value={myBid.bidPrice} tone="mine" />
          )
        ) : (
          <PriceSlot value={null} tone="muted" />
        )}
      </td>
    </tr>
  );
}

/**
 * 회차 마감 후 각 부위 아래에 표시되는 결과 sub-row.
 * 3가지 케이스 (내 관점):
 * - won   → sky-600 accent + `낙찰` chip (진한 sky · 브랜드)
 * - lost  → rose-500 accent + `미낙찰` chip (내가 입찰했으나 밀림 · rose wash · 진행 중 outbid 상태 연장)
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

  // Accent · MainRow 와 완전 통일: won=sky-600, lost=rose-500, noBid=slate-300
  const accentColor = iWon
    ? "bg-sky-600"
    : iLost
      ? "bg-rose-500"
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
        // sub-row 도 main row 와 통일된 wash · 하나의 "결과 블록" 으로 인지
        iWon
          ? isSelected
            ? "bg-sky-100/60"
            : "bg-sky-50/70"
          : iLost
            ? isSelected
              ? "bg-rose-100/60"
              : "bg-rose-50/60"
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
        {/**
         * Grid 4열 · [chip | 낙찰자 | 낙찰가 | 총액] · `PartListingTable` 과 통일 스펙.
         * 부위별 뷰와 동일 컨벤션 · 모든 row 에서 세로 정렬 유지.
         * 컬럼 폭은 tight fit (chip 46 · 낙찰자 88 · 낙찰가 120 · 총액 1fr).
         */}
        <div className="grid grid-cols-[46px_88px_120px_minmax(0,1fr)] items-center gap-x-1.5 pl-1 text-[11px]">
          <div className="flex">
            {iWon ? (
              <span className="inline-flex items-center bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                낙찰
              </span>
            ) : iLost ? (
              <span className="inline-flex items-center bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                미낙찰
              </span>
            ) : (
              <span className="inline-flex items-center bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                미입찰
              </span>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-slate-500">낙찰자</span>
            <span
              className={cn(
                "truncate font-semibold tabular-nums",
                iWon
                  ? "text-sky-800"
                  : iLost
                    ? "text-rose-800"
                    : "text-slate-800",
              )}
            >
              {winningBid?.dealerNo || "-"}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-slate-500">낙찰가</span>
            <span
              className={cn(
                "truncate font-bold tabular-nums",
                iWon
                  ? "text-sky-700"
                  : iLost
                    ? "text-rose-700"
                    : "text-slate-800",
              )}
            >
              {formatWonPerKg(winningBid?.bidPrice ?? null)}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-slate-500">총액</span>
            <span
              className={cn(
                "truncate font-bold tabular-nums",
                iWon
                  ? "text-sky-700"
                  : iLost
                    ? "text-rose-700"
                    : "text-slate-800",
              )}
            >
              {totalAmount != null ? formatWon(totalAmount) : "-"}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

const KRW_NUMBER = new Intl.NumberFormat("ko-KR");
const BID_MASK_TOKEN = "***";

/**
 * 중량 셀 · 숫자를 고정폭 슬롯에 우측 정렬해 소수점이 세로로 일직선이 되도록 함.
 * text-xs · tabular-nums 기준 `w-[30px]` 슬롯이면 "10.0" 과 "9.8" 의 소수점이 정렬됨.
 * 부위별 탭(`PartListingTable.WeightCell`) 과 동일 스펙.
 */
function WeightCell({
  weight,
  isSettled,
}: {
  weight: number | null | undefined;
  isSettled: boolean;
}) {
  if (
    weight === null ||
    weight === undefined ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    return <span className="text-slate-300">-</span>;
  }
  return (
    <span className="inline-flex items-baseline justify-end tabular-nums">
      <span className="inline-block w-[30px] text-right font-medium">
        {weight.toFixed(1)}
      </span>
      <span
        className={cn(
          "pl-0.5 font-medium",
          isSettled ? "text-slate-500" : "text-slate-400",
        )}
      >
        kg
      </span>
    </span>
  );
}

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

/**
 * 오픈 최고가 · 부위별 현재 최고가 셀.
 * PriceSlot 을 사용해 6자리 fixed 포맷으로 정렬 · 최저단가·내입찰가와 세로 열 통일.
 */
function TopBidCell({
  topBid,
  isSettled,
}: {
  topBid: LivePart["topBid"];
  isSettled: boolean;
}) {
  if (!topBid) return <PriceSlot value={null} tone="muted" />;
  const tone: PriceTone = isSettled
    ? "muted"
    : topBid.isMine
      ? "mine"
      : "primary";
  return <PriceSlot value={topBid.bidPrice} tone={tone} />;
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
