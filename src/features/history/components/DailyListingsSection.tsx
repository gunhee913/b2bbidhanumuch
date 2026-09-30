"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowUpRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import {
  listingDetailHref,
  liveRoomHref,
} from "@/features/live-auction/lib/listingHref";
import {
  EntitySheetTable,
  SheetEntityCaption,
  SHEET_CELL,
  SHEET_GROUP_START,
  type SheetSummaryColumn,
} from "@/features/listings/components/EntitySheetTable";
import { fromDailyListing, type SheetFocus } from "@/features/listings/lib/sheetEntity";
import {
  useDailyListings,
  type DailyListingPart,
} from "../hooks/useDailyListings";
import {
  formatWeight,
  getPartRowState,
  isListingSettled,
  partNoLabel,
  splitParts,
  summarizeListings,
  summarizeParts,
  type PartRowState,
} from "../lib/dailyListings";
import { DailyListingsPrintSheet } from "./DailyListingsPrintSheet";

/** 위 경매내역 테이블에서 행을 눌렀을 때 · 해당 개체를 펼치고 부위 행을 잠깐 강조 */
export type ListingFocus = SheetFocus;

export interface DailyListingsSectionProps {
  /** yyyy-MM-dd · null 이면 일자 미선택 */
  selectedDate: string | null;
  focus: ListingFocus | null;
}

/** 인쇄 중 body 에 붙는 클래스 · globals.css `@media print` 에서 이 섹션만 남긴다 */
const PRINT_BODY_CLASS = "print-daily-listings";

/** 우측 결과 열 · 낙찰 n/총 · 총 낙찰대금 · 내 낙찰대금 */
const SUMMARY_COLUMNS: SheetSummaryColumn[] = [
  { label: "낙찰", align: "center", groupStart: true, widthClass: "w-[4.5%]" },
  { label: "총 낙찰대금", align: "right", widthClass: "w-[7.5%]" },
  { label: "내 낙찰대금", align: "right", widthClass: "w-[7.5%]", headClass: "pr-3" },
];

/**
 * 선택일의 부분육 상장내역 · 개체 비교표(`EntitySheetTable`) + 행 펼침.
 *
 * - 표 본체(개체 행 · 등급판정 열 · 사진 뷰어 · 초점 스크롤)는 경매장 상장표와 공용 컴포넌트
 * - 이 화면이 주입하는 것: 결과 열(낙찰 n/총 · 총 낙찰대금 · 내 낙찰대금) + 펼침 영역(부위 표 3분할)
 * - 부위 표에 `내 입찰가` 열 분리 · 낙찰 부위 sky 틴트 + sky 값 · 진 부위 rose 틴트 + rose 값 · 유찰 `-`
 * - 소속 공판장이 있으면 그 공판장 상장만
 * - 오늘 날짜면 헤더에 `경매장 상장표에서 입찰하기` · 부위 행 클릭 → 그 부위가 선택된 개체 페이지로 이동
 *   (입찰은 회차·마감·실시간 안전장치가 있는 경매장에서만)
 * - 인쇄하기 · `DailyListingsPrintSheet` 를 마운트해 이 섹션만 A4 가로 · 3두/장 고정 배치로 출력
 */
export function DailyListingsSection({
  selectedDate,
  focus,
}: DailyListingsSectionProps) {
  const { house } = useCurrentHouse();
  const router = useRouter();
  const query = useDailyListings(selectedDate);

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  /** 경매장 상장표 딥링크 · 오늘 날짜에만 · 공판장은 현재 컨텍스트 유지 */
  const liveHref = (listingNo?: string, partNo?: number | null) => {
    const houseKey = house?.key ?? null;
    if (!listingNo) return liveRoomHref(houseKey);
    return listingDetailHref(listingNo, {
      houseKey,
      part: partNo != null ? String(partNo).padStart(2, "0") : null,
    });
  };

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
    setExpanded((prev) => (prev.has(target.id) ? prev : new Set(prev).add(target.id)));
  }, [focus, listings]);

  const totals = useMemo(() => summarizeListings(listings), [listings]);
  const entities = useMemo(() => listings.map(fromDailyListing), [listings]);
  const listingById = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

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
    <section data-print-root className="border border-line bg-surface print:border-0">
      {printing ? (
        <DailyListingsPrintSheet dateTitle={dateTitle} listings={listings} totals={totals} />
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 print:hidden">
        <div className="flex items-baseline gap-3">
          <span className="text-[13px] font-extrabold tabular-nums text-content">
            {dateTitle} 상장내역
          </span>
          {!query.isLoading && listings.length > 0 ? (
            <span className="text-[11px] tabular-nums text-content-soft">
              개체 <b className="font-bold text-content-mid">{listings.length}</b>두
              <span className="mx-1.5 text-content-ghost">·</span>
              부위 <b className="font-bold text-content-mid">{totals.partCount}</b>
              <span className="mx-1.5 text-content-ghost">·</span>
              낙찰 <b className="font-bold text-sky-700">{totals.wonCount}</b>
              {totals.myWonCount > 0 ? (
                <>
                  <span className="mx-1.5 text-content-ghost">·</span>
                  내 낙찰 <b className="font-bold text-content">{totals.myWonCount}</b>
                </>
              ) : null}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isToday && listings.length > 0 ? (
            <Link
              href={liveHref()}
              className="print-hidden inline-flex h-7 items-center gap-1 rounded-md bg-inverse px-2.5 text-[11px] font-bold text-inverse-content transition-colors hover:bg-slate-700"
            >
              경매장 상장표에서 입찰하기
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
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
        <div className="px-4 py-14 text-center text-[13px] text-content-faint">캘린더에서 일자를 선택하세요.</div>
      ) : (
        <EntitySheetTable
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
            const parts = listing?.parts ?? [];
            const s = summarizeParts(parts);
            const participated = s.myBidCount > 0;
            // 마감 전 · 낙찰자 없는 부위에 걸린 내 입찰 = 아직 진행 중 (미낙찰 아님)
            const settled = listing ? isListingSettled(listing) : true;
            const myOpenCount = settled ? 0 : parts.filter((p) => p.myBid && !p.hasWinner).length;
            return (
              <>
                <td className={cn(SHEET_CELL, SHEET_GROUP_START, "text-center")}>
                  <b className="font-bold text-content">{s.wonCount}</b>
                  <span className="font-medium text-content-faint">/{s.total}</span>
                </td>
                <td className={cn(SHEET_CELL, "text-right font-semibold text-content")}>
                  {s.wonAmount > 0 ? formatKrw(s.wonAmount) : <span className="text-content-ghost">-</span>}
                </td>
                <td className={cn(SHEET_CELL, "pr-3 text-right font-bold")}>
                  {s.myWonAmount > 0 ? (
                    <span className="text-sky-700">{formatKrw(s.myWonAmount)}</span>
                  ) : myOpenCount > 0 ? (
                    <span className="text-[11px] font-medium text-sky-600">진행중 {myOpenCount}</span>
                  ) : participated ? (
                    <span className="text-[11px] font-medium text-rose-500">미낙찰 {s.myBidCount}</span>
                  ) : (
                    <span className="text-content-ghost">—</span>
                  )}
                </td>
              </>
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
                  onPartClick={
                    isToday
                      ? (part) => router.push(liveHref(listing.listingNo, part.partNo))
                      : undefined
                  }
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

const ROW_TONE: Record<PartRowState, string> = {
  mineWon: "bg-sky-50/80",
  mineLost: "bg-rose-50/60",
  otherWon: "",
  unsold: "",
  open: "",
};

const PART_COLUMNS = 3;
/** 부위 표 열 수 · 상장번호 · 부위 · 중량 · 최저가격 · 낙찰가격 · 내 입찰가 */
const PART_TABLE_COLUMNS = 6;
const PART_HEAD =
  "whitespace-nowrap border-b border-line bg-surface-muted px-1.5 py-1.5 text-center text-[11px] font-semibold text-content-soft";
const PART_CELL = "whitespace-nowrap px-1.5 py-[7px] text-center align-middle tabular-nums";

function PartsColumns({
  parts,
  listingNo,
  settled,
  flashPartNo,
  onPartClick,
}: {
  parts: DailyListingPart[];
  listingNo: string;
  settled: boolean;
  flashPartNo: number | null;
  /** 오늘 날짜 · 부위 행 클릭 → 경매장 상장표로 (없으면 클릭 불가) */
  onPartClick?: (part: DailyListingPart) => void;
}) {
  const chunks = splitParts(parts, PART_COLUMNS);
  const rowsPerColumn = chunks[0]?.length ?? 0;

  return (
    <div className="grid gap-3 lg:grid-cols-3 print:grid-cols-3">
      {chunks.map((chunk, ci) => (
        <div key={ci} className="overflow-x-auto border border-line bg-surface">
          <table className="w-full table-fixed text-[12px]">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[15%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={PART_HEAD}>상장번호</th>
                <th className={PART_HEAD}>부위</th>
                <th className={PART_HEAD}>중량</th>
                <th className={PART_HEAD}>최저가격</th>
                <th className={PART_HEAD}>낙찰가격</th>
                <th className={PART_HEAD}>내 입찰가</th>
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
                  onClick={onPartClick ? () => onPartClick(part) : undefined}
                />
              ))}
              {/* 컬럼 높이 맞추기 · 빈 행 */}
              {Array.from({ length: rowsPerColumn - chunk.length }).map((_, i) => (
                <tr key={`pad-${i}`} className="border-b border-line-soft last:border-b-0">
                  {Array.from({ length: PART_TABLE_COLUMNS }).map((_, j) => (
                    <td key={j} className={cn(PART_CELL, "text-content-ghost")}>
                      -
                    </td>
                  ))}
                </tr>
              ))}
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
  onClick,
}: {
  part: DailyListingPart;
  listingNo: string;
  state: PartRowState;
  flash: boolean;
  onClick?: () => void;
}) {
  const won = state === "mineWon" || state === "mineLost" || state === "otherWon";

  return (
    <tr
      onClick={onClick}
      title={onClick ? "경매장 상장표에서 이 부위 입찰하기" : undefined}
      className={cn(
        "border-b border-line-soft transition-colors last:border-b-0",
        ROW_TONE[state],
        flash && "bg-amber-100/80",
        onClick && "cursor-pointer hover:bg-sky-50/70",
      )}
    >
      <td className={cn(PART_CELL, "text-[11.5px] -tracking-[0.02em] text-content-mid")}>
        {partNoLabel(part, listingNo)}
      </td>
      <td className={cn(PART_CELL, "font-semibold text-content")}>{part.partName}</td>
      <td className={cn(PART_CELL, "text-content-mid")}>{formatWeight(part.weight)}</td>
      <td className={cn(PART_CELL, "text-content-mid")}>{formatKrw(part.minPrice)}</td>
      <td
        className={cn(
          PART_CELL,
          won ? "font-semibold text-content" : "text-content-ghost",
        )}
      >
        {won ? formatKrw(part.highestBid?.bidPrice) : "-"}
      </td>
      {/* 내 입찰가 · 낙찰이면 sky · 졌으면 rose · 미입찰 `-` */}
      <td
        className={cn(
          PART_CELL,
          state === "mineWon"
            ? "font-bold text-sky-700"
            : state === "mineLost"
              ? "font-semibold text-rose-600"
              : "text-content-ghost",
        )}
      >
        {part.myBid ? formatKrw(part.myBid.bidPrice) : "-"}
      </td>
    </tr>
  );
}
