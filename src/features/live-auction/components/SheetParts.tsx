"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { ImageOff, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SHEET_CELL,
  SHEET_GROUP_START,
} from "@/features/listings/components/EntitySheetTable";
import type { LiveListing, LivePart } from "../api";
import type { useSheetBidding, SheetBidEntry } from "../hooks/useSheetBidding";
import { formatGradeLabel } from "../lib/grade";
import { extractSide } from "../lib/partGrouping";
import {
  hasVisibleResult,
  isBidIdle,
  isSoldResult,
  type PartResult,
} from "../lib/partResult";
import { formatKrw, formatWon } from "../lib/masking";
import {
  cyclePartSort,
  toAriaSort,
  type PartSort,
  type PartSortKey,
} from "../lib/partSort";
import { getRowBgClass, getSettlementCase } from "../lib/rowState";
import { isPartSettled, type PartsSummary } from "../lib/sheetSummary";
import { MaskedPriceSlot, PriceSlot } from "./PriceSlot";
import { ResultChip } from "./PartResultRow";
import { SheetBidCell } from "./SheetBidCell";
import { SortHeaderButton } from "./SortHeaderButton";

export type SheetBidding = ReturnType<typeof useSheetBidding>;

/** 푸터 「입찰 취소」 2단계 확인 유지 시간 */
const CANCEL_CONFIRM_MS = 3000;
/**
 * 2열부터 끝까지의 폭 · 「실측 내용 폭 + 좌우 여백 8px」.
 *   표 테두리·결과 구분선에 닿는 열은 바깥쪽 여백이 12px (`PART_GUTTERS`) 이라 그만큼 넓다.
 * 비율로 환산해 쓰므로 표가 넓어져도 한 열만 벌어지지 않는다
 * (한 열만 auto 로 두면 그 열 혼자 늘어나 부위↔중량 사이가 뜬다).
 *
 * 1열 폭은 축이 정한다(`SheetRowAxis.headWidth`) — 개체축 행은 사진을 물고 있어 더 넓다.
 */
const TRAILING_COLUMN_WIDTHS = [48, 65, 65, 76, 37, 58, 72, 76] as const;
const PART_COLUMN_COUNT = TRAILING_COLUMN_WIDTHS.length + 1;
/** 결과 열 묶음이 시작하는 열 인덱스 · 앞 5열은 대상·내 입찰 */
const RESULT_COLUMN_START = 5;
const PART_HEAD =
  "whitespace-nowrap border-b border-line bg-surface-muted px-1 py-1.5 text-[12px] font-medium text-content-faint";
const PART_CELL = "whitespace-nowrap px-1 py-[6px] align-middle tabular-nums";
/**
 * 「내 것」(입찰가·경락대금)과 「결과」(낙찰자·낙찰가·경락대금) 사이 구분선.
 * 토큰을 써야 한다 — `slate-200` 으로 못 박혀 있던 동안 어두운 판에서 흰 선이 되어,
 * 행을 가르는 다른 선들보다 이 하나만 튀었다.
 */
const RESULT_GROUP_START = "border-l border-l-line";
/**
 * 결과 구역은 머리글만 한 톤 진하게 · 본문은 흰 판을 유지해 마감 행 톤과 겹치지 않는다.
 * 먹색까지 올리면 행동하는 입찰 구역보다 결과 머리가 먼저 보여 위계가 뒤집힌다.
 */
const RESULT_HEAD = cn(PART_HEAD, "bg-surface-strong text-content-mid");
/** 입력칸(h-7)이 있는 진행 행 높이 · 마감 행·채움 행도 같은 높이로 두 열의 행을 가로로 맞춘다 */
const PART_ROW_HEIGHT = "h-[41px]";
/**
 * 세로선에 닿는 쪽만 여백을 넓힌다 · 표 좌우 테두리와 결과 구분선.
 * `nth-child(5)` = 결과 구분선 바로 왼쪽 열(내 경락대금) · `RESULT_COLUMN_START` 와 함께 움직인다.
 */
const PART_GUTTERS = cn(
  "[&_td:first-child]:pl-3 [&_th:first-child]:pl-3",
  "[&_td:nth-child(5)]:pr-3 [&_th:nth-child(5)]:pr-3",
  "[&_td:last-child]:pr-3 [&_th:last-child]:pr-3",
);

function splitIntoColumns<T>(items: readonly T[], columns: number): T[][] {
  const size = Math.ceil(items.length / columns);
  return Array.from({ length: columns }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

/* ───────────────────────── 행의 축 · 1열 ───────────────────────── */

/**
 * 표의 고정축이 무엇이냐에 따라 1열만 달라진다 — 나머지 8열(중량 · 최저단가 ·
 * 내 입찰가 · 경락대금 · 결과 4)은 두 축이 완전히 같다.
 *
 *  - 개체를 고정하면 행이 부위다 → 1열은 부위명
 *  - 부위를 고정하면 행이 개체다 → 1열은 사진 + 접수번호
 */
export interface SheetRowAxis {
  /** 1열 머리글 */
  headLabel: string;
  /** 1열 폭(px) · 나머지 열 폭과 합쳐 비율로 환산된다 */
  headWidth: number;
  renderHead: (entry: SheetBidEntry) => ReactNode;
  /** 마우스 올렸을 때 뜨는 전체 이름 */
  headTitle: (entry: SheetBidEntry) => string;
}

/** 개체 고정 · 행 = 부위 · 부위명 + 상장번호 두 줄 */
export const PART_ROW_AXIS: SheetRowAxis = {
  headLabel: "부위",
  headWidth: 93,
  headTitle: ({ listing, part }) =>
    `${part.partName} · ${displayPartNo(listing, part)}`,
  renderHead: ({ listing, part }) => (
    <>
      <span className="block truncate text-[12px] font-semibold leading-[14px] text-content">
        {part.partName}
      </span>
      <span className="block truncate text-[10px] leading-[11px] -tracking-[0.02em] text-content-faint">
        {displayPartNo(listing, part)}
      </span>
    </>
  ),
};

/**
 * 부위 고정 · 행 = 개체 · 사진 옆에 접수번호 + 등급·업체.
 * 같은 개체의 좌/우가 나란히 오므로 접수번호 옆에 쪽을 붙인다 — 안 붙이면
 * 똑같은 번호가 두 줄 연달아 놓여 어느 쪽에 값을 넣는지 알 수 없다.
 */
export const LISTING_ROW_AXIS: SheetRowAxis = {
  headLabel: "개체",
  headWidth: 134,
  headTitle: ({ listing, part }) =>
    [part.partName, listing.listingNo, listing.companyName]
      .filter(Boolean)
      .join(" · "),
  renderHead: ({ listing, part }) => (
    <span className="flex items-center gap-1.5">
      <span className="relative h-[26px] w-[34px] shrink-0 overflow-hidden rounded-[3px] bg-surface-accent ring-1 ring-line">
        {listing.images[0] ? (
          <Image
            src={listing.images[0]}
            alt=""
            fill
            sizes="34px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <ImageOff
            className="absolute inset-0 m-auto h-3 w-3 text-content-ghost"
            strokeWidth={1.5}
            aria-hidden
          />
        )}
      </span>
      <span className="block min-w-0">
        <span className="flex items-baseline gap-1 truncate text-[12px] font-semibold leading-[14px] text-content">
          {listing.listingNo}
          {extractSide(part.partName) ? (
            <span className="shrink-0 text-[10px] font-bold text-content-soft">
              {extractSide(part.partName)}
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[10px] leading-[11px] -tracking-[0.02em] text-content-faint">
          {formatGradeLabel(listing.grade, listing.marblingScore)}
          {listing.companyName ? ` · ${listing.companyName}` : ""}
        </span>
      </span>
    </span>
  ),
};

function displayPartNo(listing: LiveListing, part: LivePart): string {
  return (
    part.listingPartNo ||
    `${listing.listingNo}-${String(part.partNo).padStart(2, "0")}`
  );
}

/* ───────────────────────── 부위 미니표 · n열 ───────────────────────── */

export interface SheetPartGridProps {
  /** 이미 정렬된 행 · 열 수만큼 세로로 나눠 채운다(열 우선) */
  entries: SheetBidEntry[];
  /** 1열에 무엇을 세울지 · `PART_ROW_AXIS` 또는 `LISTING_ROW_AXIS` */
  axis: SheetRowAxis;
  columns: number;
  /** 열 배치 클래스 · 예: `grid-cols-2` */
  gridClassName: string;
  dealerId: string | null;
  canReadBids: boolean;
  selectedPartId: string | null;
  onSelectPart: (entry: SheetBidEntry) => void;
  bidding: SheetBidding;
  isBlocked: (entry: SheetBidEntry) => boolean;
  /** 결과 열(결과·낙찰자·낙찰가·경락대금) · null 이면 아직 결과를 말할 단계가 아니다 */
  getPartResult: (listing: LiveListing, part: LivePart) => PartResult | null;
}

/**
 * 상장표 펼침 영역의 부위 미니표 · 가로 스크롤 없이 컬럼 폭 안에 맞춘다.
 *
 * 부위(+부위번호) · 중량 · 최저단가 · 내 입찰가(input) · 경락대금 | 결과 · 낙찰자 · 낙찰가 · 경락대금
 * 열 폭은 585px 기준 비율 · 넓어지면 모든 열이 같은 비율로 늘어난다 · 부위명은 truncate.
 *
 * 결과를 별도 줄 대신 머리글 붙은 열에 둔다. 남의 낙찰가가 「내 입찰가」 아래 라벨 없이
 * 놓이던 혼동을 머리글이 끊고, 모든 행이 한 줄이라 두 열의 행이 가로로 맞는다.
 * 상장번호는 부위명 아래 줄에 작게 · 개체 행과 대조하지 않아도 행 하나로 어느 부위인지 특정된다.
 */
export function SheetPartGrid({
  entries,
  axis,
  columns,
  gridClassName,
  dealerId,
  canReadBids,
  selectedPartId,
  onSelectPart,
  bidding,
  isBlocked,
  getPartResult,
}: SheetPartGridProps) {
  const chunks = splitIntoColumns(entries, columns);
  const rowsPerColumn = chunks[0]?.length ?? 0;
  const columnWidths = [axis.headWidth, ...TRAILING_COLUMN_WIDTHS];
  const tableBaseWidth = columnWidths.reduce((sum, w) => sum + w, 0);

  return (
    <div className={cn("grid gap-2", gridClassName)}>
      {chunks
        .filter((chunk, ci) => ci === 0 || chunk.length > 0)
        .map((chunk, ci) => (
          <div
            key={ci}
            className="overflow-hidden border border-line bg-surface"
          >
            <table
              className={cn(
                "w-full table-fixed text-[13px] font-semibold text-content",
                PART_GUTTERS,
              )}
            >
              <colgroup>
                {columnWidths.map((width, i) => (
                  <col
                    key={i}
                    style={{ width: `${(width / tableBaseWidth) * 100}%` }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className={cn(PART_HEAD, "text-left")}>
                    {axis.headLabel}
                  </th>
                  <th className={cn(PART_HEAD, "text-right")}>중량</th>
                  <th className={cn(PART_HEAD, "text-right")}>최저단가</th>
                  <th className={cn(PART_HEAD, "text-right")}>내 입찰가</th>
                  <th className={cn(PART_HEAD, "text-right")}>경락대금</th>
                  <th
                    className={cn(
                      RESULT_HEAD,
                      RESULT_GROUP_START,
                      "text-center",
                    )}
                  >
                    결과
                  </th>
                  <th className={cn(RESULT_HEAD, "text-center")}>낙찰자</th>
                  <th className={cn(RESULT_HEAD, "text-right")}>낙찰가</th>
                  <th className={cn(RESULT_HEAD, "text-right")}>경락대금</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((entry) => (
                  <SheetPartRow
                    key={entry.part.id}
                    entry={entry}
                    axis={axis}
                    dealerId={dealerId}
                    canReadBids={canReadBids}
                    isSelected={entry.part.id === selectedPartId}
                    onClick={() => onSelectPart(entry)}
                    bidding={bidding}
                    disabled={isBlocked(entry)}
                    result={getPartResult(entry.listing, entry.part)}
                  />
                ))}
                {Array.from({ length: rowsPerColumn - chunk.length }).map(
                  (_, i) => (
                    <tr
                      key={`pad-${i}`}
                      aria-hidden
                      className={cn(
                        PART_ROW_HEIGHT,
                        "border-b border-line-soft last:border-b-0",
                      )}
                    >
                      {Array.from({ length: PART_COLUMN_COUNT }).map((_, j) => (
                        <td
                          key={j}
                          className={cn(
                            PART_CELL,
                            "text-center text-content-ghost",
                            j === RESULT_COLUMN_START && RESULT_GROUP_START,
                          )}
                        >
                          {j < RESULT_COLUMN_START ? "-" : null}
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

function SheetPartRow({
  entry,
  axis,
  dealerId,
  canReadBids,
  isSelected,
  onClick,
  bidding,
  disabled,
  result,
}: {
  entry: SheetBidEntry;
  axis: SheetRowAxis;
  dealerId: string | null;
  canReadBids: boolean;
  isSelected: boolean;
  onClick: () => void;
  bidding: SheetBidding;
  disabled: boolean;
  result: PartResult | null;
}) {
  const { listing, part } = entry;
  const myBid = dealerId
    ? (part.allBids.find((b) => b.dealerId === dealerId) ?? null)
    : null;
  const isSettled = isPartSettled(part);
  const settlementCase = getSettlementCase(myBid);
  const hasMyBid = !isSettled && !!myBid;

  const rowState = { isSettled, settlementCase, hasMyBid, isSelected };

  const price = bidding.effectivePrice(part);
  const amount = price && part.weight ? Math.round(price * part.weight) : 0;
  const dirty = bidding.isDirty(part);
  const idle = isBidIdle(result);

  return (
    <tr
      onClick={onClick}
      aria-selected={isSelected}
      className={cn(
        PART_ROW_HEIGHT,
        "cursor-pointer border-b border-line-soft transition-colors last:border-b-0",
        getRowBgClass(rowState),
      )}
    >
      <td title={axis.headTitle(entry)} className={cn(PART_CELL, "text-left")}>
        {axis.renderHead(entry)}
      </td>
      <td className={cn(PART_CELL, "text-right text-content-mid")}>
        {part.weight && part.weight > 0 ? (
          <>
            {part.weight.toFixed(1)}
            <span className="pl-0.5 text-content-faint">kg</span>
          </>
        ) : (
          <span className="text-content-ghost">-</span>
        )}
      </td>
      <td className={cn(PART_CELL, "text-right")}>
        <PriceSlot
          value={part.minPrice}
          tone={isSettled ? "faint" : "regular"}
        />
      </td>

      {isSettled ? (
        <>
          {/* 마감 · 「내 입찰가·대금」은 내 것만 · 남의 결과는 뒤쪽 결과 열이 맡는다 */}
          <td className={cn(PART_CELL, "text-right")}>
            {myBid ? (
              canReadBids ? (
                <PriceSlot
                  value={myBid.bidPrice}
                  tone={settlementCase === "won" ? "won" : "lost"}
                  animate={false}
                />
              ) : (
                <MaskedPriceSlot
                  tone={settlementCase === "won" ? "won" : "lost"}
                />
              )
            ) : (
              <span className="text-content-ghost">-</span>
            )}
          </td>
          <td
            className={cn(
              PART_CELL,
              "text-right text-[12px] font-semibold",
              settlementCase === "won" ? "text-content" : "text-content-faint",
            )}
          >
            {myBid && part.weight ? (
              formatWon(Math.round(myBid.bidPrice * part.weight))
            ) : (
              <span className="text-content-ghost">-</span>
            )}
          </td>
        </>
      ) : (
        <>
          <td className={cn(PART_CELL, "text-right")}>
            {idle ? (
              <span className="text-content-ghost">-</span>
            ) : (
              <SheetBidCell
                partId={part.id}
                value={price}
                minPrice={part.minPrice}
                savedPrice={myBid?.bidPrice ?? null}
                state={bidding.cellState(part.id)}
                disabled={disabled}
                onChange={bidding.setDraft}
                onSubmit={() => bidding.submitOne(listing, part)}
                onRevert={() => bidding.clearDraft(part.id)}
              />
            )}
          </td>
          {/* 경락대금 · 내 단가 × 중량 · 변경 중이면 orange, 저장된 내 입찰이면 ink, 아니면 회색 */}
          <td
            className={cn(
              PART_CELL,
              "text-right text-[12px] font-semibold",
              amount > 0
                ? dirty
                  ? "text-orange-700"
                  : myBid
                    ? "text-content"
                    : "text-content-soft"
                : "text-content-ghost",
            )}
          >
            {amount > 0 ? formatWon(amount) : "-"}
          </td>
        </>
      )}
      <ResultCells result={result} />
    </tr>
  );
}

/**
 * 결과 · 낙찰자 · 낙찰가 · 경락대금 4열.
 * 진행 중(다음 회차 입찰 중 포함)엔 비운다 · 대기 · 유찰은 칩만 · 낙찰은 칩 + 숫자 · 내 낙찰은 칩 글자(「내 낙찰」)로 구분.
 * 숫자는 굵기·톤을 한 단계 낮춘다 · 굵은 숫자는 입찰 구역의 「내 입찰가」 하나만 남겨 시선이 먼저 간다.
 */
function ResultCells({ result }: { result: PartResult | null }) {
  const isSold = isSoldResult(result);

  return (
    <>
      <td className={cn(PART_CELL, RESULT_GROUP_START, "text-center")}>
        {hasVisibleResult(result) ? (
          <ResultChip outcome={result.outcome} />
        ) : null}
      </td>
      <td
        className={cn(
          PART_CELL,
          "truncate text-center text-[11px] text-content-soft",
        )}
      >
        {isSold ? result.dealerNo || "-" : null}
      </td>
      <td
        className={cn(
          PART_CELL,
          "text-right -tracking-[0.01em] text-content-mid",
        )}
      >
        {isSold && result.price != null ? formatWon(result.price) : null}
      </td>
      <td className={cn(PART_CELL, "text-right text-[12px] text-content-soft")}>
        {isSold ? formatWon(result.amount) : null}
      </td>
    </>
  );
}

/* ───────────────────────── 묶음 푸터 · 일괄 입찰 / 입찰 취소 / 소계 ───────────────────────── */

/**
 * 펼침 영역 하단 · `1건 입찰` / `n건 일괄 입찰` · 되돌리기 · `입찰 취소 · 부위 가격`(선택 행 1건 · 2단계 확인).
 * `notice` 가 있으면 버튼 대신 그 문구(마감 · 입찰 불가 사유) · 우측은 `children` 소계.
 */
export function SheetBatchFooter({
  batchKey,
  label,
  entries,
  bidding,
  notice,
  selected,
  selectedLabel = (entry) => entry.part.partName,
  children,
}: {
  batchKey: string;
  /** 일괄 입찰 토스트 제목 · 접수번호 또는 부위명 */
  label: string;
  entries: SheetBidEntry[];
  bidding: SheetBidding;
  notice?: string;
  /** 이 묶음 안에서 선택된 행 · 저장된 내 입찰이 있으면 「입찰 취소」 대상 */
  selected: SheetBidEntry | null;
  /** 취소 버튼에 보일 선택 행 이름 · 기본 부위명 */
  selectedLabel?: (entry: SheetBidEntry) => string;
  children: ReactNode;
}) {
  const dirty = bidding.dirtyOf(entries.map((e) => e.part));
  const submitting = bidding.isBatchSubmitting(batchKey);
  const dirtyAmount = dirty.reduce((sum, p) => {
    const price = bidding.effectivePrice(p) ?? 0;
    return sum + Math.round(price * (p.weight ?? 0));
  }, 0);
  const selectedPart = selected?.part ?? null;
  const cancelTarget = selectedPart ? bidding.myOpenBid(selectedPart) : null;
  const cancelPending = selectedPart
    ? bidding.cellState(selectedPart.id).pending
    : false;
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // 3초 지나면 · 선택 행이 바뀌면 · 취소 대상이 사라지면 확인 상태 해제
  useEffect(() => {
    if (!confirmingCancel) return;
    const t = window.setTimeout(
      () => setConfirmingCancel(false),
      CANCEL_CONFIRM_MS,
    );
    return () => window.clearTimeout(t);
  }, [confirmingCancel]);
  useEffect(() => {
    setConfirmingCancel(false);
  }, [selectedPart?.id, cancelTarget?.id]);

  const submitLabel =
    dirty.length === 0
      ? "입찰"
      : dirty.length === 1
        ? "1건 입찰"
        : `${dirty.length}건 일괄 입찰`;

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11.5px] tabular-nums text-content-soft">
      <div className="flex items-center gap-2">
        {notice ? (
          <span className="font-medium text-content-soft">{notice}</span>
        ) : (
          <>
            <button
              type="button"
              disabled={dirty.length === 0 || submitting}
              onClick={(e) => {
                e.stopPropagation();
                bidding.submitBatch(batchKey, entries, label);
              }}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 px-3 text-[11.5px] font-bold transition-colors",
                dirty.length > 0
                  ? "bg-inverse text-inverse-content hover:bg-inverse"
                  : "cursor-default bg-surface-accent text-content-faint",
              )}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              {submitLabel}
              {dirtyAmount > 0 ? (
                <span className="font-medium opacity-80">
                  · {formatKrw(dirtyAmount)}원
                </span>
              ) : null}
            </button>
            {dirty.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  bidding.revertParts(entries.map((en) => en.part));
                }}
                className="inline-flex h-7 items-center gap-1 px-1.5 text-[11px] font-semibold text-content-soft transition-colors hover:text-content"
              >
                <RotateCcw className="h-3 w-3" aria-hidden />
                되돌리기
              </button>
            ) : null}
            {selected && cancelTarget ? (
              <button
                type="button"
                disabled={cancelPending}
                aria-live="polite"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirmingCancel) {
                    setConfirmingCancel(true);
                    return;
                  }
                  setConfirmingCancel(false);
                  bidding.cancelOne(selected.listing, selected.part);
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 border px-2.5 text-[11.5px] font-semibold transition-colors disabled:opacity-50",
                  confirmingCancel
                    ? "border-rose-500 bg-rose-500 text-white hover:bg-rose-600"
                    : "border-line bg-surface text-content-mid hover:border-rose-300 hover:text-rose-600",
                )}
              >
                {cancelPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : null}
                {confirmingCancel ? (
                  <>{selectedLabel(selected)} 취소 확인</>
                ) : (
                  <>
                    입찰 취소
                    <span className="font-medium text-content-faint">·</span>
                    <span className="font-semibold text-content">
                      {selectedLabel(selected)}
                    </span>
                    <span className="font-bold tabular-nums text-content">
                      {formatKrw(cancelTarget.bidPrice)}
                    </span>
                  </>
                )}
              </button>
            ) : null}
          </>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ───────────────────────── 우측 결과 열 · 낙찰 n/총 · 총 낙찰대금 · 내 낙찰대금 ───────────────────────── */

export function SheetResultCells({ summary }: { summary: PartsSummary }) {
  const participated = summary.myBidCount > 0;
  return (
    <>
      <td
        className={cn(SHEET_CELL, SHEET_GROUP_START, "px-1 pl-2 text-center")}
      >
        <b className="font-bold text-content">{summary.wonCount}</b>
        <span className="font-medium text-content-faint">/{summary.total}</span>
      </td>
      <td
        className={cn(
          SHEET_CELL,
          "px-1.5 text-right font-semibold text-content",
        )}
      >
        {summary.wonAmount > 0 ? (
          <WonAmount value={summary.wonAmount} />
        ) : (
          <span className="text-content-ghost">-</span>
        )}
      </td>
      <td className={cn(SHEET_CELL, "px-1.5 pr-3 text-right font-bold")}>
        {summary.myWonAmount > 0 ? (
          <span className="text-content">
            <WonAmount value={summary.myWonAmount} />
          </span>
        ) : summary.myOpenCount > 0 ? (
          <span className="text-[11px] font-medium text-content">
            진행중 {summary.myOpenCount}
          </span>
        ) : participated ? (
          <span className="text-[11px] font-medium text-rose-500">
            미낙찰 {summary.myBidCount}
          </span>
        ) : (
          <span className="text-content-ghost">—</span>
        )}
      </td>
    </>
  );
}

/**
 * 낙찰대금 · 「원」은 한 단계 작고 흐리게.
 * 열 전체가 같은 단위를 200번 되풀이하므로 숫자만 또렷하게 남긴다 (등지방두께 `mm` 와 같은 규칙).
 */
function WonAmount({ value }: { value: number }) {
  return (
    <>
      {formatKrw(value)}
      <span className="pl-px text-[11px] font-medium text-content-faint">
        원
      </span>
    </>
  );
}

/** 푸터 우측 소계 · `내 입찰 3/20 · 184.2kg` */
export function SheetBatchSubtotal({ summary }: { summary: PartsSummary }) {
  return (
    <>
      내 입찰 <b className="font-bold text-content">{summary.myBidCount}</b>
      <span className="text-content-faint">/{summary.total}</span>
      <span className="mx-1.5 text-content-ghost">·</span>
      {summary.totalWeight.toFixed(1)}
      <span className="text-content-faint">kg</span>
    </>
  );
}
