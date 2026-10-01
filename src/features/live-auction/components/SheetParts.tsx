"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { ImageOff, Loader2, RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SHEET_CELL,
  SHEET_GROUP_START,
} from "@/features/listings/components/EntitySheetTable";
import type { LiveListing, LivePart } from "../api";
import type { useSheetBidding, SheetBidEntry } from "../hooks/useSheetBidding";
import { formatGradeLabel } from "../lib/grade";
import { extractSide, toPartGroupName } from "../lib/partGrouping";
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
import { MyBidChip, ResultChip } from "./PartResultRow";
import { CANCEL_CONFIRM_MS, SheetBidCell } from "./SheetBidCell";
import { SortHeaderButton } from "./SortHeaderButton";

export type SheetBidding = ReturnType<typeof useSheetBidding>;

/** 행 표식 · 값은 부위 id · 입찰칸(`BID_INPUT_ATTR`)과 달리 마감된 행에도 붙는다 */
const PART_ROW_ATTR = "data-part-row";
/** 지목돼 들어온 행을 밝히는 시간 · `tailwind.config.ts` 의 `row-land` 와 같아야 한다 */
export const ROW_LAND_MS = 1100;

/**
 * 그 부위의 행을 보이는 데까지 굴린다 · 찾았으면 `true`.
 *
 * `block: "nearest"` 라 이미 보이는 행은 건드리지 않는다. 늘 가운데로 세우면
 * 두 번째 줄을 눌렀을 때도 표가 통째로 움직여, 옮길 이유가 없는데 자리를 잃는다.
 */
export function scrollPartRowIntoView(partId: string): boolean {
  const row = document.querySelector(
    `[${PART_ROW_ATTR}="${CSS.escape(partId)}"]`,
  );
  if (!row) return false;
  row.scrollIntoView({ block: "nearest" });
  return true;
}

/**
 * 2열부터 끝까지의 폭 · 「실측 내용 폭 + 좌우 여백 8px」.
 *   결과 구분선·표 오른쪽 테두리에 닿는 열은 바깥쪽 여백이 12px (`PART_GUTTERS`) 이라 그만큼 넓다.
 * 비율로 환산해 쓰므로 표가 넓어져도 한 열만 벌어지지 않는다
 * (한 열만 auto 로 두면 그 열 혼자 늘어나 부위↔중량 사이가 뜬다).
 *
 * 1열 폭은 축이 정한다(`SheetRowAxis.headWidth`) — 개체축 행은 사진을 물고 있어 더 넓다.
 */
const TRAILING_COLUMN_WIDTHS = [48, 65, 65, 76, 37, 44, 64, 76] as const;
/**
 * 1열 맨 앞 관심 별이 먹는 폭 · 별(18) + 뒤 간격(8) − 테두리 여백에서 돌려받은(4).
 *
 * 이만큼을 **낙찰자와 낙찰가에서 꿔 왔다**(58→44 · 72→64). 표 전체 합을 그대로 두려고
 * 그랬다 — `table-fixed` 라 합이 늘면 나머지가 전부 같은 비율로 줄고, 그러면 폭이 제일
 * 빠듯한 「내 입찰가」 칸(입력칸 `min-w-[58px]`)이 표를 최소 폭으로 좁혔을 때 숫자를 문다.
 * 돈 넣는 칸이 별 하나 때문에 좁아지면 안 된다.
 *
 * 꿔 준 두 열은 여유가 있던 쪽이다. 낙찰자는 매참인 번호 네댓 자를 11px 로 찍고, 낙찰가는
 * kg 단가라 여섯 자를 넘지 않는다. 둘 다 마감 뒤에만 차는 열이라 입찰 중에는 아예 비어 있다.
 */
const FAV_SLOT_WIDTH = 22;
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
 *
 * 왼쪽만 12px 이 아니라 8px 이다. 이 여백은 글자가 테두리에 닿지 말라고 둔 것인데, 1열
 * 맨 앞에 온 건 글자가 아니라 관심 별이고 아이콘은 제 상자 안에 이미 여백을 물고 있다.
 * 12px 을 그대로 두면 별 왼쪽만 넓고 오른쪽(사진·부위명과의 사이)은 좁아, 별이 제 칸에
 * 선 게 아니라 사진에 붙은 장식처럼 보였다. 여기서 던 4px 은 별 뒤 간격이 받는다.
 */
const PART_GUTTERS = cn(
  "[&_td:first-child]:pl-2 [&_th:first-child]:pl-2",
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
  /** 1열 머리글 · ↑/↓ 가 옮기는 것이기도 하다 */
  headLabel: string;
  /** 고정해 둔 것 · ←/→ 가 옮긴다 · 행과 뒤집힌 짝이다 */
  pivotLabel: string;
  /** 1열 폭(px) · 나머지 열 폭과 합쳐 비율로 환산된다 */
  headWidth: number;
  renderHead: (entry: SheetBidEntry) => ReactNode;
  /** 마우스 올렸을 때 뜨는 전체 이름 */
  headTitle: (entry: SheetBidEntry) => string;
}

/** 개체 고정 · 행 = 부위 · 부위명 + 상장번호 두 줄 */
export const PART_ROW_AXIS: SheetRowAxis = {
  headLabel: "부위",
  pivotLabel: "개체",
  headWidth: 93 + FAV_SLOT_WIDTH,
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
 * 부위 고정 · 행 = 개체 · 사진 옆에 등급·업체(위) + 접수번호(아래).
 *
 * 부위가 고정이라 이 표에서 값을 가르는 건 고기의 질과 파는 곳이다. 접수번호는 어느
 * 줄인지 짚을 때만 쓰는 이름표라, 굵게 위에 두면 매번 등급을 찾아 한 줄 내려다봐야 한다.
 * 개체축(`PART_ROW_AXIS`)이 부위명을 위에 두는 것과 같은 규칙이다 — 위에는 고를 때 보는
 * 것, 아래에는 고르고 나서 확인하는 것.
 *
 * 좌/우는 접수번호 옆에 붙여 내린다. 같은 개체의 좌/우가 나란히 오는데 이때 윗줄
 * (등급·업체)이 완전히 같아서, 두 줄을 가르는 건 아랫줄 하나뿐이다.
 */
export const LISTING_ROW_AXIS: SheetRowAxis = {
  headLabel: "개체",
  pivotLabel: "부위",
  headWidth: 134 + FAV_SLOT_WIDTH,
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
        <span className="flex items-baseline gap-1 text-[12px] leading-[14px]">
          <span className="shrink-0 font-bold text-content">
            {formatGradeLabel(listing.grade, listing.marblingScore)}
          </span>
          {/* 업체명은 이 칸에서 유일하게 잘려도 되는 것 · 등급은 잘리면 다른 등급이 된다 */}
          {listing.companyName ? (
            <span className="min-w-0 truncate text-[11px] font-medium text-content-soft">
              {listing.companyName}
            </span>
          ) : null}
        </span>
        <span className="flex items-baseline gap-1 text-[10px] leading-[11px] -tracking-[0.02em] text-content-faint">
          <span className="truncate tabular-nums">{listing.listingNo}</span>
          {extractSide(part.partName) ? (
            <span className="shrink-0 font-bold text-content-soft">
              {extractSide(part.partName)}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  ),
};

/**
 * 고정축 없음 · 행 = 관심으로 찍어 둔 부위 · 사진 옆에 부위명·등급(위) + 접수번호·업체(아래).
 *
 * 다른 두 축은 한쪽이 고정이라 1열에서 그쪽을 적을 필요가 없었다 — 개체축은 부위명만,
 * 부위축은 등급과 접수번호만 적는다. 관심은 고정이 없다. 한 개체의 등심과 다른 개체의
 * 채끝이 나란히 서므로 부위명도 접수번호도 빠질 수 없고, 견주려면 등급까지 있어야 한다.
 *
 * 위아래 규칙은 두 축과 같다 — 위에는 고를 때 보는 것(부위·등급), 아래에는 고르고 나서
 * 짚는 것(접수번호·업체). 좌/우는 부위명 뒤에 붙인다, 같은 개체의 좌/우가 나란히 올 때
 * 두 줄을 가르는 게 그것뿐이다.
 */
export const FAVORITE_ROW_AXIS: SheetRowAxis = {
  headLabel: "관심 부위",
  pivotLabel: "관심",
  headWidth: 175 + FAV_SLOT_WIDTH,
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
        <span className="flex items-baseline gap-1 text-[12px] leading-[14px]">
          <span className="min-w-0 truncate font-semibold text-content">
            {toPartGroupName(part.partName)}
          </span>
          {extractSide(part.partName) ? (
            <span className="shrink-0 text-[11px] font-bold text-content-soft">
              {extractSide(part.partName)}
            </span>
          ) : null}
          <span className="shrink-0 font-bold text-content">
            {formatGradeLabel(listing.grade, listing.marblingScore)}
          </span>
        </span>
        <span className="flex items-baseline gap-1 text-[10px] leading-[11px] -tracking-[0.02em] text-content-faint">
          <span className="shrink-0 tabular-nums">{listing.listingNo}</span>
          {/* 업체명은 이 칸에서 유일하게 잘려도 되는 것 · 나머지는 잘리면 다른 값이 된다 */}
          {listing.companyName ? (
            <span className="min-w-0 truncate">{listing.companyName}</span>
          ) : null}
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
  /** 방금 바깥에서 지목돼 들어온 행 · 잠깐 밝혀 스무 줄 중 어느 줄인지 알린다 */
  landedPartId?: string | null;
  onSelectPart: (entry: SheetBidEntry) => void;
  bidding: SheetBidding;
  isBlocked: (entry: SheetBidEntry) => boolean;
  /** 결과 열(결과·낙찰자·낙찰가·경락대금) · null 이면 아직 결과를 말할 단계가 아니다 */
  getPartResult: (listing: LiveListing, part: LivePart) => PartResult | null;
  /** 관심으로 찍은 것 · 부위는 UUID 로 찍어 본다 (개체 접수번호가 섞여 있어도 무해하다) */
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (partId: string) => void;
  /** 그 부위에 남긴 메모 · 없으면 null · 1열 모서리 자국을 띄우는 데만 쓴다 */
  getNote: (partId: string) => string | null;
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
  landedPartId,
  onSelectPart,
  bidding,
  isBlocked,
  getPartResult,
  favoriteIds,
  onToggleFavorite,
  getNote,
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
            /* 입찰칸 막대가 잘리는 상자 · 셀이 이 경계를 재서 위아래를 고른다 */
            data-sheet-clip
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
                    landed={entry.part.id === landedPartId}
                    onClick={() => onSelectPart(entry)}
                    bidding={bidding}
                    disabled={isBlocked(entry)}
                    result={getPartResult(entry.listing, entry.part)}
                    favorited={favoriteIds.has(entry.part.id)}
                    onToggleFavorite={() => onToggleFavorite(entry.part.id)}
                    note={getNote(entry.part.id)}
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
  landed,
  onClick,
  bidding,
  disabled,
  result,
  favorited,
  onToggleFavorite,
  note,
}: {
  entry: SheetBidEntry;
  axis: SheetRowAxis;
  dealerId: string | null;
  canReadBids: boolean;
  isSelected: boolean;
  landed: boolean;
  onClick: () => void;
  bidding: SheetBidding;
  disabled: boolean;
  result: PartResult | null;
  favorited: boolean;
  onToggleFavorite: () => void;
  note: string | null;
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
      {...{ [PART_ROW_ATTR]: part.id }}
      onClick={onClick}
      aria-selected={isSelected}
      className={cn(
        PART_ROW_HEIGHT,
        "cursor-pointer border-b border-line-soft transition-colors last:border-b-0",
        getRowBgClass(rowState),
        landed && "animate-row-land",
      )}
    >
      <td
        title={axis.headTitle(entry)}
        className={cn(PART_CELL, "relative text-left")}
      >
        {/* 별 좌우 여백을 같게 · 왼쪽 8(`PART_GUTTERS`) + 오른쪽 8 이라 가운데 선다 */}
        <span className="flex items-center gap-2">
          <PartFavoriteStar
            on={favorited}
            label={axis.headTitle(entry)}
            onToggle={onToggleFavorite}
          />
          <span className="min-w-0 flex-1">{axis.renderHead(entry)}</span>
        </span>
        <NoteMark body={note} />
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
                /* 칸을 클릭하면 행 onClick 이 막히므로(stopPropagation) 여기서 고른다 */
                onFocus={onClick}
                rowLabel={axis.headLabel}
                pivotLabel={axis.pivotLabel}
                onCancel={() => bidding.cancelOne(listing, part)}
                canCancel={hasMyBid}
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
      <ResultCells result={result} hasMyBid={hasMyBid} />
    </tr>
  );
}

/**
 * 결과 · 낙찰자 · 낙찰가 · 경락대금 4열.
 * 진행 중(다음 회차 입찰 중 포함)엔 비운다 · 대기 · 유찰은 칩만 · 낙찰은 칩 + 숫자.
 * 내 결과만 색을 갖는다 · 내 낙찰 파랑 · 미낙찰 빨강 · 남의 결과는 무채색 (`CHIP_TONE` 참고).
 * 숫자는 굵기·톤을 한 단계 낮춘다 · 굵은 숫자는 입찰 구역의 「내 입찰가」 하나만 남겨 시선이 먼저 간다.
 */
/**
 * 부위 관심 별 · 1열 맨 앞.
 *
 * 상장표(`EntitySheetTable`)의 별과 같은 자리·같은 색이다. 개체를 찍던 손이 부위에서도
 * 같은 데를 찾게 하려는 것이라, 크기만 이 표의 행 높이(41px)에 맞춰 한 치수 줄였다.
 *
 * 행을 누르면 그 부위가 선택되고 입찰칸으로 초점이 간다. 별은 그 길을 타면 안 된다 —
 * 담아 두려고 눌렀는데 입력칸이 열리면 다음 키 입력이 엉뚱한 데로 들어간다.
 */
function PartFavoriteStar({
  on,
  label,
  onToggle,
}: {
  on: boolean;
  /** 부위명 · 상장번호 · 읽어 주는 이름에 그대로 쓴다 */
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${label} 관심`}
      title={on ? "관심에서 빼기" : "관심에 담기"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-colors",
        "active:scale-[0.9]",
        on
          ? "text-fav"
          : "text-content-ghost hover:bg-surface-accent hover:text-fav/70",
      )}
    >
      <Star
        className={cn("h-3.5 w-3.5", on && "fill-current")}
        strokeWidth={2.2}
        aria-hidden
      />
    </button>
  );
}

/**
 * 메모 자국 · 1열 칸 오른쪽 위 모서리.
 *
 * 삼각형 하나로 「여기 내가 남긴 말이 있다」 만 말하고, 내용은 올려야 나온다. 표계산
 * 프로그램이 메모 달린 칸에 붙이는 표시와 같은 약속이라 설명 없이도 읽힌다.
 *
 * 폭을 먹지 않는 게 핵심이다. 1열은 이미 별 하나를 들이려고 낙찰자·낙찰가에서 폭을
 * 꿔 온 칸이라 더 내줄 자리가 없다. 모서리에 얹으면 글자가 잘리는 건 맨 끝 몇 픽셀
 * 뿐인데, 거기는 어차피 `truncate` 가 먼저 자르는 자리다.
 *
 * 이름을 읽어 주지 않는다 — 같은 칸의 `title` 이 이미 부위와 접수번호를 말하고, 여기에
 * 메모 전문까지 겹쳐 읽어 주면 행 하나 지날 때마다 문장 둘을 듣는다.
 */
function NoteMark({ body }: { body: string | null }) {
  if (!body) return null;
  return (
    <span
      title={body}
      aria-hidden
      className="absolute right-0 top-0 h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-note"
    />
  );
}

function ResultCells({
  result,
  hasMyBid,
}: {
  result: PartResult | null;
  /** 진행 중이면서 서버에 들어간 내 입찰이 있는가 · 결과가 나오기 전까지만 */
  hasMyBid: boolean;
}) {
  const isSold = isSoldResult(result);

  return (
    <>
      <td className={cn(PART_CELL, RESULT_GROUP_START, "text-center")}>
        {hasVisibleResult(result) ? (
          <ResultChip outcome={result.outcome} />
        ) : hasMyBid ? (
          <MyBidChip />
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
