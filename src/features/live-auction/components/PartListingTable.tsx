"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/tooltip";
import { formatGradeLabel } from "../lib/grade";
import { formatWon } from "../lib/masking";
import { usePriceFlash } from "../hooks/usePriceFlash";
import type { PartGroupEntry, PartGroupItem } from "../lib/partGrouping";
import type { LivePart } from "../api";
import { BulkPriceCell } from "./BulkPriceCell";
import {
  MaskedPriceSlot,
  PriceSlot,
  type PriceTone,
} from "./PriceSlot";

export interface PartListingTableProps {
  group: PartGroupEntry | null;
  selectedListingId: string | null;
  selectedPartId: string | null;
  /** 행 자체 클릭 · 개체정보 탭으로 유도. */
  onSelect: (listingId: string, partId: string) => void;
  /** "입찰하기" 버튼 클릭 · 입찰하기 탭으로 유도. */
  onBidRequest: (listingId: string, partId: string) => void;
  /** 마감된 sub-row 의 "입찰내역" 링크 클릭 · 입찰내역 탭으로 유도. */
  onHistoryRequest?: (listingId: string, partId: string) => void;
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
  onHistoryRequest,
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

  // 등급/업체 필터는 좌측 사이드바(`PartSidebar`) 로 이관됨 → 여기서는 노출/처리 안 함.
  // 낙찰분 숨김만 테이블-local 토글로 유지 (본 테이블 스캔 중 임시로 완료 항목 감추기).
  const [hideSettled, setHideSettled] = useState(false);

  const filteredItems = useMemo(() => {
    if (!group) return [];
    if (!hideSettled) return group.items;
    return group.items.filter(
      ({ part }) => !part.allBids.some((b) => b.rank != null),
    );
  }, [group, hideSettled]);

  const hasActiveFilter = hideSettled;

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

  const colCount = bulkMode ? 6 : 5;

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
        <div className="flex items-center gap-3">
          {/* 낙찰분 숨김 · 체크박스 + label · 좌측 사이드바 필터와 UX 분리 (테이블-local action) */}
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

      <table className="w-full table-fixed text-sm">
        {/*
         * 5컬럼 · 2-group IA (identity | metrics+action).
         *   ── LEFT GROUP ──
         *   · auto 열                → 상장번호 line + 업체명·부위·등급 line
         *                              (업체명 truncate 되지 않도록 폭 최대 확보)
         *
         *   ── GUTTER (visual boundary) ──
         *   · 중량 컬럼에 `border-l` + `pl-3` → 좌·우 그룹 경계 시각화
         *     (trading UI 표준 · Coinbase/Upbit 등에서 관찰되는 패턴)
         *
         *   ── RIGHT GROUP (metrics + action) ──
         *   · 중량 · 최저단가 · 현재가격 · 내 입찰가 → 하나의 응집 블록으로 인지
         *   · 최저단가 66px          → 헤더 "최저단가" 4자 + tracking-wider 1줄 수용
         *   · 현재가격 · 내 입찰가   → 실 컨텐츠 대비 여유 있는 폭 유지
         *
         * 총 고정폭 non-bulk 60+66+76+68 = 270px · 컨테이너 ~472px 기준 auto ≈ 202px.
         * 총 고정폭 bulk    28+60+60+68+64 = 280px · auto ≈ 192px.
         *
         * 내 입찰가 · 80→68 (bulk 76→64):
         *   - 입찰하기 버튼 min-w-56 + px-1.5 = 56px (딱 맞춤) · 셀 padding 12px 각 사이드
         *   - 실제 content 44-48px + padding 12px = 56-60px 로 tight fit
         *   - table-fixed 특성상 min-w 가 셀 폭 초과해도 좌측으로 overflow (right align)
         *
         * 별점(관심 등록) 아이콘 제거로 auto 컬럼 content 영역 +28px 추가 확보.
         *   - 5-6자 업체명 + "토시·제비" (52px) + "1++A(9)" (45px) 조합 여유 노출.
         */}
        <colgroup>
          {bulkMode ? <col className="w-[28px]" /> : null}
          <col className="w-auto" />
          <col className="w-[60px]" />
          <col className={bulkMode ? "w-[60px]" : "w-[66px]"} />
          <col className={bulkMode ? "w-[68px]" : "w-[76px]"} />
          <col className={bulkMode ? "w-[64px]" : "w-[68px]"} />
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
            <th className="whitespace-nowrap border-b border-slate-200 py-2 pl-3 pr-2 text-left">
              상장정보
            </th>
            <th className="whitespace-nowrap border-b border-l border-slate-200 border-l-slate-100 py-2 pl-3 pr-4 text-right">
              중량
            </th>
            <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-right">
              최저단가
            </th>
            <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-right">
              현재 최고가
            </th>
            <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-center">
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
                      onHistoryClick={
                        onHistoryRequest
                          ? () => onHistoryRequest(item.listing.id, item.part.id)
                          : undefined
                      }
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
  colSpan = 5,
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

  // 진행 중 · 내 입찰 상태 3분화:
  //   - isMyTop     · 내가 최고가 (leading)         → sky wash + sky-500 bar
  //   - isMyOutbid  · 내가 밀림 (outbid, 액션 필요) → rose wash + rose-500 bar
  //   - 그 외        · 미입찰                       → white / hover 만
  const isMyTop = !isSettled && !!myBid && part.topBid?.isMine === true;
  const isMyOutbid = !isSettled && !!myBid && part.topBid?.isMine !== true;

  // 좌측 accent bar 색: 마감 → 결과별, 진행 중 → 상태별 (내 1위/밀림/선택).
  //   iWon  → sky-600  (내 낙찰)
  //   iLost → rose-500 (내 미낙찰 · 진행 중 밀림 시 rose 와 시맨틱 통일)
  //   noBid → slate-300 (미참여 · 중립)
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

  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);
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
  //   · 진행 중(!isSettled) row 만 flash · settled 은 정적이라 불필요
  //   · box-shadow inset 방식이라 base bg-color 와 충돌 없음
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
      <td className="relative overflow-hidden py-2 pl-3 pr-2 text-left align-middle">
        {accentColor && !bulkMode ? (
          <span
            className={cn(
              "absolute inset-y-0 left-0 w-[3px]",
              accentColor,
            )}
            aria-hidden
          />
        ) : null}
        <ListingPartGradeStack
          displayNo={part.listingPartNo || listing.listingNo}
          companyName={listing.companyName}
          partName={part.partName}
          gradeLabel={gradeLabel}
          isSettled={isSettled}
        />
      </td>
      <td
        className={cn(
          "whitespace-nowrap border-l border-slate-100 py-2 pl-3 pr-4 text-right text-xs",
          isSettled ? "text-slate-600" : "text-slate-900",
        )}
      >
        <WeightCell weight={part.weight} isSettled={isSettled} />
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2 text-right",
          isSettled ? "text-slate-600" : "text-slate-700",
        )}
      >
        <PriceSlot value={part.minPrice} tone={isSettled ? "muted" : "regular"} />
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2 text-right",
          hasSubRowBelow && "border-b-0",
        )}
      >
        <TopBidCell topBid={part.topBid} isSettled={isSettled} />
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2 text-right",
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
            <PriceSlot value={null} tone="muted" />
          )
        ) : (
          // 셀 자체가 text-right 로 정렬되어 있어 inline-flex 버튼이 우측 벽에 밀착됨.
          // flex justify-center 래퍼로 감싸 버튼만 셀 내부 중앙에 배치 · 좌우 breathing 확보.
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
                <MyBidBadge bidPrice={myBid.bidPrice} canRead={canReadBids} />
              ) : (
                "입찰하기"
              )}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * 회차 마감 후 각 부위 아래에 표시되는 결과 sub-row.
 * 개체별 `PartsTable.SettlementSubRow` 와 동일하되 colSpan 은 5 (통합 컬럼 기준).
 * `onHistoryClick` 이 제공되면 우측에 "입찰내역 →" 링크 노출.
 */
function SettlementSubRow({
  isSelected,
  settlementCase,
  winningBid,
  weight,
  onClick,
  onHistoryClick,
  colSpan = 5,
}: {
  isSelected: boolean;
  settlementCase: SettlementCase;
  winningBid: LivePart["allBids"][number] | null;
  weight: number | null;
  onClick: () => void;
  onHistoryClick?: () => void;
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
         * Flex row · [chip] [낙찰자] [낙찰가] [낙찰대금] ....(ml-auto).... [입찰내역 →]
         * · Grid → flex 로 전환 · 각 metric 은 컨텐츠 크기로 tight fit (shrink-0)
         * · Metric 사이 간격은 gap-3 (12px) 균일 · 값 폭이 변해도 gap 유지
         * · 낙찰가는 "88,000" ~ "999,999" (십만원단위 수용) 자동 fit
         * · Chip 은 w-[46px] 고정 슬롯 → 다른 chip 폭(낙찰/미낙찰/미입찰)에도 이후 요소 X 좌표 동일
         * · 입찰내역은 `ml-auto` 로 우측 벽 밀착 · 위치는 카드 오른쪽 그대로
         * · 값 색은 상태별 palette 유지 (won/sky · lost/rose · noBid/slate)
         */}
        <div className="flex items-center gap-x-3 pl-1 text-[11px]">
          <div className="flex w-[46px] shrink-0">
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

          <div className="flex shrink-0 items-center gap-1">
            <span className="text-slate-500">낙찰자</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
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

          <div className="flex shrink-0 items-center gap-1">
            <span className="text-slate-500">낙찰가</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                iWon
                  ? "text-sky-700"
                  : iLost
                    ? "text-rose-700"
                    : "text-slate-800",
              )}
            >
              {winningBid?.bidPrice != null
                ? KRW_NUMBER.format(Math.round(winningBid.bidPrice))
                : "-"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span className="text-slate-500">낙찰대금</span>
            <span
              className={cn(
                "font-bold tabular-nums",
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

          {onHistoryClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHistoryClick();
              }}
              className="ml-auto inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold text-slate-500 transition-colors hover:text-sky-700"
            >
              입찰내역
              <ChevronRight className="h-3 w-3" aria-hidden />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

const KRW_NUMBER = new Intl.NumberFormat("ko-KR");
const BID_MASK_TOKEN = "***";

/**
 * 상장번호(`yymmdd-NNN-PP`) + [등급 · 부위 · 업체명] 세로 스택.
 *
 * Typography System (v4 · Grade-First):
 *   Meta line  · 11px  medium ·   상장번호        → slate-500
 *   Main line  · 12.5px         · 등급·부위·업체명
 *     - 등급 (leftmost anchor) · font-semibold · slate-900 (진행) / slate-600 (마감)
 *     - 부위 (variant)         · font-medium   · slate-700 (진행) / slate-500 (마감)
 *     - 업체 (context)         · font-medium   · slate-500 (진행) / slate-400 (마감)
 *
 * v3 → v4 재설계 이유:
 *   1. 스캔 우선순위 반영 · 구매자는 [등급 → 부위 → 업체] 순으로 훑음
 *      - 이전 [업체 → 부위 → 등급] 은 반대 순서 · 등급이 맨 뒤라 지연
 *   2. 반복 노이즈 감소 · 동일 업체가 여러 행 반복 시 slate-500 로 자연 fade
 *   3. Anchor 명확 · 등급만 semibold + slate-900 → 각 행 즉시 구분 가능
 *      (1++A(9), 1+A, 1A, 1++B(8), 2A 등 · 볼드 앵커로 리듬 형성)
 *
 * flex-shrink 우선순위:
 *   업체명(shrink-[3]) → 부위(shrink-1) → 등급(shrink-0 · 절대 안 줄어듦)
 */
export function ListingPartGradeStack({
  displayNo,
  companyName,
  partName,
  gradeLabel,
  isSettled,
}: {
  displayNo: string;
  companyName: string;
  partName: string;
  gradeLabel: string;
  isSettled: boolean;
}) {
  const gradeColor = isSettled ? "text-slate-600" : "text-slate-900";
  const partColor = isSettled ? "text-slate-500" : "text-slate-700";
  const companyColor = isSettled ? "text-slate-400" : "text-slate-500";

  return (
    <div className="flex min-w-0 flex-col leading-tight">
      <span className="whitespace-nowrap text-[11px] font-medium tabular-nums -tracking-[0.02em] text-slate-500">
        {displayNo}
      </span>
      <div className="mt-1 flex min-w-0 items-baseline gap-1">
        {/* 등급 · leftmost anchor · semibold slate-900 · 스캔 진입점 */}
        <span
          className={cn(
            "shrink-0 whitespace-nowrap text-[12.5px] font-semibold tabular-nums -tracking-[0.01em]",
            gradeColor,
          )}
        >
          {gradeLabel}
        </span>
        <span className="shrink-0 text-slate-300" aria-hidden>
          ·
        </span>
        {/* 부위 · 변형 식별자 (좌/우 등) · medium slate-700 */}
        <TruncatedText
          value={partName}
          className={cn(
            "min-w-0 truncate text-[12.5px] font-medium -tracking-[0.01em]",
            partColor,
          )}
        />
        {companyName ? (
          <>
            <span className="shrink-0 text-slate-300" aria-hidden>
              ·
            </span>
            {/* 업체 · 컨텍스트 (반복 시 자연 fade) · medium slate-500 */}
            <TruncatedText
              value={companyName}
              className={cn(
                "min-w-0 shrink-[3] truncate text-[12.5px] font-medium -tracking-[0.01em]",
                companyColor,
              )}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 현재가격 셀 · 부위별 현재 최고가.
 * - 진행 중 + isMine → 가격 텍스트 sky-700 bold (row 배경 sky wash 와 결합해 이중 시그널)
 * - 진행 중 + 밀림   → 가격 텍스트 slate-800 (남의 가격, row 배경 rose wash 로 상태 인지)
 * - 마감 후          → slate-500 (낙찰가는 서브 row 에서 다시 강조)
 * - 최고가 없음      → "-"
 */
function TopBidCell({
  topBid,
  isSettled,
}: {
  topBid: LivePart["topBid"];
  isSettled: boolean;
}) {
  if (!topBid) {
    return <PriceSlot value={null} tone="muted" />;
  }
  const tone: PriceTone = isSettled
    ? "muted"
    : topBid.isMine
      ? "mine"
      : "primary";
  return <PriceSlot value={topBid.bidPrice} tone={tone} />;
}

/**
 * "내 입찰가" 배지 텍스트 · 단위(`원/kg`)는 헤더 우측 상단 캡션에 명시.
 * 셀에는 순수 숫자만 노출해 컬럼 스캔 속도 향상.
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
    <span className="tabular-nums -tracking-[0.02em]">
      {KRW_NUMBER.format(rounded)}
    </span>
  );
}

/**
 * 중량 셀 · 숫자 부분을 고정폭 슬롯에 우측 정렬해 소수점이 세로로 일직선이 되도록 함.
 *
 * text-xs 기준 tabular-nums 한 자리 ≈ 7px → "10.0" 은 약 28-30px.
 * `w-[30px]` 슬롯에 우측 정렬하면 1자리(`9.8`) 도 소수점 위치가 2자리(`10.0`) 와 일치.
 * "kg" 단위는 slate-500 로 살짝 muted 하여 숫자와 위계 구분.
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
 * 낙찰 후 표시되는 "내 입찰가" 텍스트 (버튼 없이 텍스트만).
 * 단위는 헤더 캡션에서 처리 · tone(won/lost) 만 색상으로 구분.
 * PriceSlot 을 사용해 최저단가·현재가격과 세로 열 일치.
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
  if (!canRead) return <MaskedPriceSlot tone={tone} />;
  return <PriceSlot value={bidPrice} tone={tone} />;
}
