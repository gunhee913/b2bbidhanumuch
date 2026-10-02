"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowUpRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import { liveRoomHref } from "@/features/live-auction/lib/listingHref";
import { ResultChip } from "@/features/live-auction/components/PartResultRow";
import type { PartOutcome } from "@/features/live-auction/lib/partResult";
import {
  EntitySheetTable,
  SheetEntityCaption,
  SheetResultCells,
  SHEET_PART_CELL,
  SHEET_PART_HEAD,
  type SheetSummaryColumn,
} from "@/features/listings/components/EntitySheetTable";
import {
  fromDailyListing,
  type SheetFocus,
} from "@/features/listings/lib/sheetEntity";
import {
  useDailyListings,
  type DailyListingPart,
} from "../hooks/useDailyListings";
import {
  getPartRowState,
  isListingSettled,
  partNoLabel,
  splitParts,
  summarizeListings,
  summarizeParts,
  type PartRowState,
} from "../lib/dailyListings";
import { Measured } from "./TableParts";
import { DailyListingsPrintSheet } from "./DailyListingsPrintSheet";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";

/** 위 경매내역 테이블에서 행을 눌렀을 때 · 해당 개체를 펼치고 부위 행을 잠깐 강조 */
export type ListingFocus = SheetFocus;

export interface DailyListingsSectionProps {
  /** yyyy-MM-dd · null 이면 일자 미선택 */
  selectedDate: string | null;
  focus: ListingFocus | null;
  /**
   * 머리줄 맨 앞 일자 조회 (`HistoryDatePicker`).
   *
   * 경매결과·입찰내역과 **같은 것**을 받는다. 셋은 같은 날을 다른 각도에서 보는
   * 화면이라, 날을 고르는 자리가 화면마다 다르면 넘어갈 때마다 눈이 다시 자리를
   * 잡는다. 전에는 여기만 하루 앞뒤 단추를 따로 들고 있었다.
   */
  dateControl: ReactNode;
}

/** 인쇄 중 body 에 붙는 클래스 · globals.css `@media print` 에서 이 섹션만 남긴다 */
const PRINT_BODY_CLASS = "print-daily-listings";

/**
 * 우측 결과 열 · 낙찰 n/총 · 총 낙찰대금 · 내 낙찰대금.
 * 경매장 상장표(`LiveListingSheet`)와 **같은 비율**이다 — 같은 표의 같은 열이다.
 */
const SUMMARY_COLUMNS: SheetSummaryColumn[] = [
  { label: "낙찰", align: "center", groupStart: true, widthClass: "w-[4.5%]" },
  { label: "총 낙찰대금", align: "right", widthClass: "w-[10.6%]" },
  {
    label: "내 낙찰대금",
    align: "right",
    widthClass: "w-[11%]",
    headClass: "pr-3",
  },
];

/**
 * 선택일의 부분육 상장내역 · 개체 비교표(`EntitySheetTable`) + 행 펼침.
 *
 * 표 본체(개체 행 · 등급판정 열 · 사진 뷰어 · 초점 스크롤)도, 오른쪽 결과 세 칸
 * (`SheetResultCells`)도 경매장 상장표와 **같은 것**이다. 같은 날 같은 개체를 보는
 * 표라 열 구성도 밀도도 갈라질 까닭이 없다 — `compact` 로 두는 것까지 같다. 이 화면만
 * 가진 것은 펼침 영역(부위 표 3분할) 하나다. 거기엔 낙찰 부위 sky 틴트 · 진 부위 rose
 * 틴트가 붙고, `내 입찰가` 와 `낙찰가` 가 각자 열을 갖는다.
 *
 * 소속 공판장이 있으면 그 공판장 상장만 보인다.
 *
 * **여기서는 아무 데로도 보내지 않는다.** 한때 오늘 날짜면 부위 줄을 누를 때 그 부위가
 * 선택된 경매장 개체 페이지로 넘어갔는데, 펼쳐서 스무 부위를 견주는 중에 값을 짚으려던
 * 손이 화면을 통째로 갈아 치웠다. 되짚어 보는 화면이니 보는 일만 한다 — 입찰하러 가는
 * 길은 머리줄의 「경매장 상장표에서 입찰하기」 하나로 충분하다.
 *
 * 인쇄하기 · `DailyListingsPrintSheet` 를 마운트해 이 섹션만 A4 가로 · 3두/장 고정 배치로 출력.
 */
export function DailyListingsSection({
  selectedDate,
  focus,
  dateControl,
}: DailyListingsSectionProps) {
  const { house } = useCurrentHouse();
  const query = useDailyListings(selectedDate);

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  /** 경매장 상장표 딥링크 · 오늘 날짜에만 · 공판장은 현재 컨텍스트 유지 */
  const liveHref = () => liveRoomHref(house?.key ?? null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  /** 인쇄 중 · 인쇄 시트(`DailyListingsPrintSheet`)를 마운트하고 끝나면 내린다 */
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    setExpanded(new Set());
  }, [selectedDate]);

  const listings = useMemo(() => {
    const all = query.data ?? [];
    return house ? all.filter((l) => l.slaughterHouse === house.name) : all;
  }, [query.data, house]);

  // 위 테이블에서 넘어온 초점 · 개체 펼치기 (스크롤/강조는 행이 담당)
  useEffect(() => {
    if (!focus) return;
    const target = listings.find((l) => l.listingNo === focus.listingNo);
    if (!target) return;
    setExpanded((prev) =>
      prev.has(target.id) ? prev : new Set(prev).add(target.id),
    );
  }, [focus, listings]);

  const totals = useMemo(() => summarizeListings(listings), [listings]);
  const entities = useMemo(() => listings.map(fromDailyListing), [listings]);
  const listingById = useMemo(
    () => new Map(listings.map((l) => [l.id, l])),
    [listings],
  );

  const toggleOne = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 인쇄 · 시트를 먼저 마운트하고 두 프레임 기다려 렌더가 끝난 상태로 print 다이얼로그를 띄운다
  const handlePrint = () => setPrinting(true);

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add(PRINT_BODY_CLASS);
    // 용지 방향은 이 섹션을 인쇄할 때만 · 다른 화면의 @page 와 충돌하지 않게 인쇄 동안만 주입
    const pageStyle = document.createElement("style");
    pageStyle.textContent = "@page { size: A4 landscape; margin: 10mm; }";
    document.head.appendChild(pageStyle);
    const restore = () => {
      document.body.classList.remove(PRINT_BODY_CLASS);
      pageStyle.remove();
      setPrinting(false);
    };
    window.addEventListener("afterprint", restore, { once: true });
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", restore);
    };
  }, [printing]);

  const dateTitle = selectedDate
    ? format(new Date(selectedDate), "M.d (EEE)", { locale: ko })
    : "일자 선택";

  return (
    <section
      data-print-root
      className={cn(SURFACE_SHELL_CLASS, "print:border-0")}
    >
      {printing ? (
        <DailyListingsPrintSheet
          dateTitle={dateTitle}
          listings={listings}
          totals={totals}
        />
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 print:hidden">
        <div className="flex items-baseline gap-3">
          <span className="self-center">{dateControl}</span>
          <span className="text-[13px] font-extrabold tabular-nums text-content">
            상장내역
          </span>
          {!query.isLoading && listings.length > 0 ? (
            <span className="text-[11px] tabular-nums text-content-soft">
              개체{" "}
              <b className="font-bold text-content-mid">{listings.length}</b>두
              <span className="mx-1.5 text-content-ghost">·</span>
              부위{" "}
              <b className="font-bold text-content-mid">{totals.partCount}</b>
              <span className="mx-1.5 text-content-ghost">·</span>
              낙찰 <b className="font-bold text-won">{totals.wonCount}</b>
              {totals.myWonCount > 0 ? (
                <>
                  <span className="mx-1.5 text-content-ghost">·</span>내 낙찰{" "}
                  <b className="font-bold text-content">{totals.myWonCount}</b>
                </>
              ) : null}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isToday && listings.length > 0 ? (
            <Link
              href={liveHref()}
              className="print-hidden inline-flex h-7 items-center gap-1 rounded-md bg-inverse px-2.5 text-[11px] font-bold text-inverse-content transition-colors hover:bg-inverse/85"
            >
              경매장에서 입찰하기
              <ArrowUpRight
                className="h-3.5 w-3.5"
                strokeWidth={2.25}
                aria-hidden
              />
            </Link>
          ) : null}
          {listings.length > 0 ? (
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing}
              className="print-hidden inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[11px] font-semibold text-content-mid transition-colors hover:border-line hover:text-content disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              인쇄하기
            </button>
          ) : null}
        </div>
      </header>

      {!query.isLoading && !selectedDate ? (
        <div className="px-4 py-14 text-center text-[13px] text-content-faint">
          캘린더에서 일자를 선택하세요.
        </div>
      ) : (
        <EntitySheetTable
          compact
          className="print:hidden"
          entities={entities}
          expanded={expanded}
          onToggle={toggleOne}
          focus={focus}
          isLoading={query.isLoading}
          emptyMessage="선택한 일자에 상장된 개체가 없습니다."
          summaryColumns={SUMMARY_COLUMNS}
          renderSummary={(entity) => {
            const listing = listingById.get(entity.id);
            if (!listing) return null;
            return (
              <SheetResultCells
                summary={summarizeParts(
                  listing.parts,
                  isListingSettled(listing),
                )}
              />
            );
          }}
          renderExpanded={(entity, { flashPartNo }) => {
            const listing = listingById.get(entity.id);
            if (!listing) return null;
            return (
              <>
                <SheetEntityCaption entity={entity} />
                <PartsColumns
                  parts={listing.parts}
                  listingNo={listing.listingNo}
                  settled={isListingSettled(listing)}
                  flashPartNo={flashPartNo}
                />
              </>
            );
          }}
        />
      )}
    </section>
  );
}

/* ───────────────────────── 부위 표 · 3분할 ───────────────────────── */

const PART_COLUMNS = 3;
/** 부위 표 열 수 · 부위(+상장번호) · 중량 · 최저단가 | 결과 · 낙찰가 · 낙찰대금 */
const PART_TABLE_COLUMNS = 6;
/**
 * 열마다 제 값이 안 잘리는 폭 (px) · 이 합의 비율로 환산해 쓴다.
 *
 * 결과 칩(「내 낙찰」 네 글자)이 맨 앞, 그다음이 상장번호 열세 자(10px)를 품은 부위
 * 칸이다. 돈 칸 셋은 꼬리 「원」 만큼 넓다.
 */
const PART_COLUMN_WIDTHS = [56, 88, 52, 70, 64, 84];
const PART_TABLE_WIDTH = PART_COLUMN_WIDTHS.reduce((sum, w) => sum + w, 0);
/** 세로선에 닿는 쪽만 여백을 넓힌다 · 표 좌우 테두리 (경매장 `PART_GUTTERS` 와 같은 규칙) */
const PART_GUTTERS = cn(
  "[&_td:first-child]:pl-2 [&_th:first-child]:pl-2",
  "[&_td:last-child]:pr-3 [&_th:last-child]:pr-3",
);
/**
 * 2열이 두 줄(부위명 14 + 상장번호 11)이라 그 높이로 선다 · 채움 행도 같이 못 박는다.
 * 안 그러면 부위 수가 3으로 안 나뉘는 개체에서 세 열의 바닥이 어긋난다.
 */
const PART_ROW_HEIGHT = "h-[37px]";

/** 줄 상태 → 결과 칩 · 「나에게」 어떤 결과인지를 말한다 (`CHIP_LABEL`) */
const OUTCOME: Record<PartRowState, PartOutcome> = {
  mineWon: "won",
  mineLost: "lost",
  otherWon: "noBid",
  unsold: "passed",
  open: "waiting",
};

/**
 * 펼침 영역 부위 미니표 · 경매장 부위표(`SheetPartGrid`)와 같은 짜임.
 *
 * 결과가 맨 앞에 선다. 되짚어 보는 화면에서 스무 줄을 훑으며 먼저 세는 건 「뭘
 * 땄나」 라, 그 답이 눈이 처음 닿는 자리에 있어야 한다 (경매장은 입찰 중이라 그 칸이
 * 뒤에 있다 — 거기선 먼저 보는 것이 「얼마에 걸까」 다).
 *
 * 머리줄은 한 가지 색이다. 결과 구역만 한 톤 진하게 깔아 봤는데, 여섯 칸짜리 표를
 * 둘로 가르는 띠가 세 열에 나란히 서니 표가 여섯 조각으로 보였다.
 *
 * **내 입찰가 열은 두지 않는다.** 되짚어 보는 화면에서 이미 끝난 내 호가는 결과
 * 칩에 녹아 있다 — 내 낙찰이면 낙찰가가 곧 내가 부른 값이고, 미낙찰이면 「얼마를
 * 더 불렀어야 했나」 는 경매결과 표의 낙찰단가 칸이 모자란 만큼까지 적어 준다.
 * 스무 줄짜리 미니표에 열 하나를 더 두는 값만큼 하지 못했다.
 *
 * **줄과 숫자에는 색을 쓰지 않는다.** 전에는 내 낙찰 줄에 파란 바탕을 깔고 값까지
 * 파랗게 뒀는데, 스무 부위에 다 입찰한 날이면 표의 절반이 파래져 가리키는 일을
 * 못 했다. 색을 가진 건 결과 칩 하나뿐이고, 그 안에서만 내 낙찰(파랑)과 미낙찰
 * (빨강)이 갈린다 — 경매장 결과 칩이 쓰는 그 약속이다 (`CHIP_TONE`).
 */
function PartsColumns({
  parts,
  listingNo,
  settled,
  flashPartNo,
}: {
  parts: DailyListingPart[];
  listingNo: string;
  settled: boolean;
  flashPartNo: number | null;
}) {
  const chunks = splitParts(parts, PART_COLUMNS);
  const rowsPerColumn = chunks[0]?.length ?? 0;

  return (
    <div className="grid gap-2 lg:grid-cols-3 print:grid-cols-3">
      {chunks.map((chunk, ci) => (
        <div key={ci} className={cn(SURFACE_SHELL_CLASS, "overflow-hidden")}>
          <table
            className={cn(
              "w-full table-fixed text-[13px] font-semibold text-content",
              PART_GUTTERS,
            )}
          >
            <colgroup>
              {PART_COLUMN_WIDTHS.map((width, i) => (
                <col
                  key={i}
                  style={{ width: `${(width / PART_TABLE_WIDTH) * 100}%` }}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className={cn(SHEET_PART_HEAD, "text-center")}>결과</th>
                <th className={cn(SHEET_PART_HEAD, "text-left")}>부위</th>
                <th className={cn(SHEET_PART_HEAD, "text-right")}>중량</th>
                <th className={cn(SHEET_PART_HEAD, "text-right")}>최저단가</th>
                <th className={cn(SHEET_PART_HEAD, "text-right")}>낙찰가</th>
                <th className={cn(SHEET_PART_HEAD, "text-right")}>낙찰대금</th>
              </tr>
            </thead>
            <tbody>
              {chunk.map((part) => (
                <PartRow
                  key={part.id}
                  part={part}
                  listingNo={listingNo}
                  state={getPartRowState(part, settled)}
                  flash={flashPartNo === part.partNo}
                />
              ))}
              {/* 컬럼 높이 맞추기 · 빈 행 */}
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
                    {Array.from({ length: PART_TABLE_COLUMNS }).map((_, j) => (
                      <td
                        key={j}
                        className={cn(
                          SHEET_PART_CELL,
                          "text-right text-content-ghost",
                        )}
                      >
                        {j === 0 ? null : "-"}
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

function PartRow({
  part,
  listingNo,
  state,
  flash,
}: {
  part: DailyListingPart;
  listingNo: string;
  state: PartRowState;
  flash: boolean;
}) {
  const sold =
    state === "mineWon" || state === "mineLost" || state === "otherWon";
  const wonPrice = part.highestBid?.bidPrice ?? null;
  const wonAmount =
    part.highestBid?.bidAmount && part.highestBid.bidAmount > 0
      ? part.highestBid.bidAmount
      : wonPrice && part.weight
        ? Math.round(wonPrice * part.weight)
        : null;

  return (
    <tr
      className={cn(
        PART_ROW_HEIGHT,
        "border-b border-line-soft transition-colors last:border-b-0",
        /* 위 표에서 눌러 넘어온 줄만 잠깐 밝힌다 · 결과를 말하는 색이 아니다 */
        flash && "bg-focus/25",
      )}
    >
      <td className={cn(SHEET_PART_CELL, "text-center")}>
        <ResultChip outcome={OUTCOME[state]} />
      </td>
      {/* 부위명 위 · 상장번호 아래 · 경매장 개체축(`PART_ROW_AXIS`)과 같은 두 줄 */}
      <td
        className={cn(SHEET_PART_CELL, "text-left")}
        title={`${part.partName} · ${partNoLabel(part, listingNo)}`}
      >
        <span className="block truncate text-[12px] font-semibold leading-[14px] text-content">
          {part.partName}
        </span>
        <span className="block truncate text-[10px] leading-[11px] -tracking-[0.02em] text-content-faint">
          {partNoLabel(part, listingNo)}
        </span>
      </td>
      <td className={cn(SHEET_PART_CELL, "text-right text-content-mid")}>
        <Measured
          value={part.weight && part.weight > 0 ? part.weight.toFixed(1) : "-"}
          unit="kg"
        />
      </td>
      <td className={cn(SHEET_PART_CELL, "text-right text-content-mid")}>
        <Measured value={formatKrw(part.minPrice)} unit="원" />
      </td>
      <td className={cn(SHEET_PART_CELL, "text-right text-content-mid")}>
        {sold ? (
          <Measured value={formatKrw(wonPrice)} unit="원" />
        ) : (
          <span className="text-content-ghost">-</span>
        )}
      </td>
      <td className={cn(SHEET_PART_CELL, "text-right")}>
        {sold ? (
          <Measured
            value={formatKrw(wonAmount)}
            unit="원"
            className="text-content"
          />
        ) : (
          <span className="text-content-ghost">-</span>
        )}
      </td>
    </tr>
  );
}
