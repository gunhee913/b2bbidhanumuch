"use client";

import { cn } from "@/lib/utils";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { formatTraceNo } from "@/features/live-auction/components/ListingInfoSection";
import type { DailyListing, DailyListingPart } from "../hooks/useDailyListings";
import {
  chunk,
  dash,
  formatWeight,
  getPartRowState,
  isListingSettled,
  partNoLabel,
  shortDate,
  splitParts,
  summarizeParts,
  type PartRowState,
} from "../lib/dailyListings";

export interface DailyListingsPrintSheetProps {
  dateTitle: string;
  listings: DailyListing[];
  totals: { partCount: number; wonCount: number; myWonCount: number };
}

/** 한 장(A4 가로 · 여백 10mm → 277 × 190mm)에 개체 3두 · 고정 높이라 장마다 같은 위치에 떨어진다 */
const ENTITIES_PER_PAGE = 3;
const PAGE_H_MM = 190;
const PAGE_HEAD_H_MM = 9;
const BLOCK_GAP_MM = 3;
const BLOCK_H_MM = Math.floor(
  (PAGE_H_MM - PAGE_HEAD_H_MM - BLOCK_GAP_MM * (ENTITIES_PER_PAGE - 1)) / ENTITIES_PER_PAGE,
); // 57mm

const PART_COLUMNS = 3;

/**
 * 부분육 상장내역 인쇄 시트 · 화면에서는 숨기고(`hidden print:block`) 인쇄 중에만 보인다.
 *
 * - 장 단위로 고정 높이 · 3두/장 · 마지막 장만 break 없음 (빈 장 방지)
 * - 개체 블록: 개체 정보 1줄 표 (헤더+값) → 부위 표 3분할 (7·7·6 · 빈 칸 `-`)
 * - 사진·펼침 UI 는 인쇄에서 제외 · 내 낙찰/미낙찰 틴트는 유지 (`print-color-adjust: exact`)
 */
export function DailyListingsPrintSheet({
  dateTitle,
  listings,
  totals,
}: DailyListingsPrintSheetProps) {
  const pages = chunk(listings, ENTITIES_PER_PAGE);

  return (
    <div className="hidden print:block [print-color-adjust:exact]">
      {pages.map((page, pi) => {
        const isLast = pi === pages.length - 1;
        return (
          <div
            key={pi}
            style={{
              height: `${PAGE_H_MM}mm`,
              breakAfter: isLast ? "auto" : "page",
            }}
            className="overflow-hidden"
          >
            {/* 장 헤더 · 날짜 · 요약 · 페이지 번호 */}
            <div
              style={{ height: `${PAGE_HEAD_H_MM}mm` }}
              className="flex items-center justify-between border-b border-line pb-1"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-extrabold tabular-nums text-content">
                  {dateTitle} 부분육 상장내역
                </span>
                <span className="text-[9.5px] tabular-nums text-content-soft">
                  개체 {listings.length}두 · 부위 {totals.partCount} · 낙찰 {totals.wonCount}
                  {totals.myWonCount > 0 ? ` · 내 낙찰 ${totals.myWonCount}` : ""}
                </span>
              </div>
              <span className="text-[9.5px] tabular-nums text-content-soft">
                {pi + 1} / {pages.length}
              </span>
            </div>

            {page.map((listing, bi) => (
              <div
                key={listing.id}
                style={{
                  height: `${BLOCK_H_MM}mm`,
                  marginTop: `${BLOCK_GAP_MM}mm`,
                  marginBottom: bi === page.length - 1 ? 0 : undefined,
                }}
                className="overflow-hidden"
              >
                <EntityBlock listing={listing} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── 개체 블록 ───────────────────────── */

const INFO_HEAD =
  "whitespace-nowrap border-b border-line bg-surface-accent px-1 py-[0.9mm] text-center text-[8.5px] font-semibold text-content-mid";
const INFO_CELL = "whitespace-nowrap px-1 py-[0.9mm] text-center text-[9.5px] tabular-nums text-content";

function EntityBlock({ listing }: { listing: DailyListing }) {
  const s = summarizeParts(listing.parts);
  const settled = isListingSettled(listing);
  const slaughter = [
    listing.slaughterHouse,
    listing.slaughterDate ? shortDate(listing.slaughterDate) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex h-full flex-col gap-[1.5mm]">
      <table className="w-full table-fixed border border-line">
        <thead>
          <tr>
            <th className={cn(INFO_HEAD, "w-[9%] text-left")}>접수번호</th>
            <th className={cn(INFO_HEAD, "w-[6.5%] text-left")}>등급</th>
            <th className={cn(INFO_HEAD, "w-[4%]")}>축종</th>
            <th className={cn(INFO_HEAD, "w-[4%]")}>성별</th>
            <th className={cn(INFO_HEAD, "w-[4%]")}>개월</th>
            <th className={cn(INFO_HEAD, "w-[5%]")}>도체중</th>
            <th className={cn(INFO_HEAD, "w-[3.6%] border-l border-line")}>근내</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>육색</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>지방색</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>조직</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>성숙</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>등지방</th>
            <th className={cn(INFO_HEAD, "w-[4.4%]")}>등심면적</th>
            <th className={cn(INFO_HEAD, "w-[10%] border-l border-line text-left")}>이력번호</th>
            <th className={cn(INFO_HEAD, "w-[9%] text-left")}>도축장 · 도축일</th>
            <th className={cn(INFO_HEAD, "text-left")}>상장업체</th>
            <th className={cn(INFO_HEAD, "w-[5%] border-l border-line")}>낙찰</th>
            <th className={cn(INFO_HEAD, "w-[7.5%] text-right")}>총 낙찰대금</th>
            <th className={cn(INFO_HEAD, "w-[7.5%] text-right")}>내 낙찰대금</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cn(INFO_CELL, "text-left font-bold -tracking-[0.02em] text-content")}>
              {listing.listingNo}
            </td>
            <td className={cn(INFO_CELL, "text-left font-semibold")}>
              {formatGradeLabel(listing.grade, listing.marblingScore)}
            </td>
            <td className={INFO_CELL}>{dash(listing.breed)}</td>
            <td className={INFO_CELL}>{dash(listing.gender)}</td>
            <td className={INFO_CELL}>{dash(listing.monthAge)}</td>
            <td className={INFO_CELL}>
              {listing.carcassWeight ? `${listing.carcassWeight}kg` : "-"}
            </td>
            <td className={cn(INFO_CELL, "border-l border-line font-semibold")}>
              {dash(listing.marblingScore)}
            </td>
            <td className={INFO_CELL}>{dash(listing.meatColor)}</td>
            <td className={INFO_CELL}>{dash(listing.fatColor)}</td>
            <td className={INFO_CELL}>{dash(listing.texture)}</td>
            <td className={INFO_CELL}>{dash(listing.maturity)}</td>
            <td className={INFO_CELL}>{dash(listing.backFat)}</td>
            <td className={INFO_CELL}>{dash(listing.eyeMuscle)}</td>
            <td className={cn(INFO_CELL, "border-l border-line text-left")}>
              {formatTraceNo(listing.traceNo)}
            </td>
            <td className={cn(INFO_CELL, "text-left")}>{slaughter || "-"}</td>
            <td className={cn(INFO_CELL, "truncate text-left")}>{listing.companyName || "-"}</td>
            <td className={cn(INFO_CELL, "border-l border-line")}>
              <b className="font-bold">{s.wonCount}</b>
              <span className="text-content-soft">/{s.total}</span>
            </td>
            <td className={cn(INFO_CELL, "text-right font-semibold")}>
              {s.wonAmount > 0 ? formatKrw(s.wonAmount) : "-"}
            </td>
            <td className={cn(INFO_CELL, "text-right font-bold")}>
              {s.myWonAmount > 0 ? formatKrw(s.myWonAmount) : "-"}
            </td>
          </tr>
        </tbody>
      </table>

      <PartsColumns parts={listing.parts} listingNo={listing.listingNo} settled={settled} />
    </div>
  );
}

/* ───────────────────────── 부위 표 · 3분할 ───────────────────────── */

const PART_HEAD =
  "whitespace-nowrap border-b border-line bg-surface-accent px-1 py-[0.6mm] text-center text-[8.5px] font-semibold text-content-mid";
const PART_CELL = "whitespace-nowrap px-1 py-[0.55mm] text-center text-[9px] tabular-nums";

const ROW_TONE: Record<PartRowState, string> = {
  mineWon: "bg-sky-50",
  mineLost: "bg-rose-50",
  otherWon: "",
  unsold: "",
  open: "",
};

function PartsColumns({
  parts,
  listingNo,
  settled,
}: {
  parts: DailyListingPart[];
  listingNo: string;
  settled: boolean;
}) {
  const chunks = splitParts(parts, PART_COLUMNS);
  const rowsPerColumn = chunks[0]?.length ?? 0;

  return (
    <div className="grid grid-cols-3 gap-[2mm]">
      {chunks.map((column, ci) => (
        <table key={ci} className="w-full table-fixed border border-line">
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
            {column.map((part) => {
              const state = getPartRowState(part, settled);
              const won = part.hasWinner;
              return (
                <tr
                  key={part.id}
                  className={cn("border-b border-line last:border-b-0", ROW_TONE[state])}
                >
                  <td className={cn(PART_CELL, "-tracking-[0.02em] text-content-mid")}>
                    {partNoLabel(part, listingNo)}
                  </td>
                  <td className={cn(PART_CELL, "font-semibold text-content")}>{part.partName}</td>
                  <td className={cn(PART_CELL, "text-content-mid")}>{formatWeight(part.weight)}</td>
                  <td className={cn(PART_CELL, "text-content-mid")}>{formatKrw(part.minPrice)}</td>
                  <td className={cn(PART_CELL, won ? "font-semibold text-content" : "text-content-faint")}>
                    {won ? formatKrw(part.highestBid?.bidPrice) : "-"}
                  </td>
                  <td
                    className={cn(
                      PART_CELL,
                      state === "mineWon"
                        ? "font-bold text-sky-700"
                        : state === "mineLost"
                          ? "font-semibold text-rose-600"
                          : "text-content-faint",
                    )}
                  >
                    {part.myBid ? formatKrw(part.myBid.bidPrice) : "-"}
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: rowsPerColumn - column.length }).map((_, i) => (
              <tr key={`pad-${i}`} className="border-b border-line last:border-b-0">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className={cn(PART_CELL, "text-content-ghost")}>
                    -
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}
