"use client";

import { cn } from "@/lib/utils";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { formatTraceNo } from "@/features/live-auction/components/ListingInfoSection";
import type { DailyListing, DailyListingPart } from "../hooks/useDailyListings";
import {
  chunk,
  dash,
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
  (PAGE_H_MM - PAGE_HEAD_H_MM - BLOCK_GAP_MM * (ENTITIES_PER_PAGE - 1)) /
    ENTITIES_PER_PAGE,
); // 57mm

const PART_COLUMNS = 3;

/**
 * 부분육 상장내역 인쇄 시트 · 화면에서는 숨기고(`hidden print:block`) 인쇄 중에만 보인다.
 *
 * - 장 단위로 고정 높이 · 3두/장 · 마지막 장만 break 없음 (빈 장 방지)
 * - 개체 블록: 개체 정보 1줄 표 (헤더+값) → 부위 표 3분할 (7·7·6 · 빈 칸 `-`)
 * - 사진·펼침 UI 는 인쇄에서 제외
 * - 열 구성·이름·단위는 화면 상장표(`DailyListingsSection`)와 같다 — 보던 종이와 보던
 *   화면이 다르면 숫자를 대조할 때마다 열을 다시 찾아야 한다. 다른 것은 두 가지뿐이다:
 *   상장번호가 부위명 밑줄이 아니라 제 열을 갖고(장 높이가 못 박혀 두 줄을 못 쓴다),
 *   결과를 칩이 아니라 글자로 적는다(바탕을 칠하면 흑백 인쇄에서 회색 띠가 된다).
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
                  개체 {listings.length}두 · 부위 {totals.partCount} · 낙찰{" "}
                  {totals.wonCount}
                  {totals.myWonCount > 0
                    ? ` · 내 낙찰 ${totals.myWonCount}`
                    : ""}
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
const INFO_CELL =
  "whitespace-nowrap px-1 py-[0.9mm] text-center text-[9.5px] tabular-nums text-content";

function EntityBlock({ listing }: { listing: DailyListing }) {
  const settled = isListingSettled(listing);
  const s = summarizeParts(listing.parts, settled);
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
            <th className={cn(INFO_HEAD, "w-[3.6%] border-l border-line")}>
              근내
            </th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>육색</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>지방색</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>조직</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>성숙</th>
            <th className={cn(INFO_HEAD, "w-[3.6%]")}>등지방</th>
            <th className={cn(INFO_HEAD, "w-[4.4%]")}>등심면적</th>
            <th
              className={cn(
                INFO_HEAD,
                "w-[10%] border-l border-line text-left",
              )}
            >
              이력번호
            </th>
            <th className={cn(INFO_HEAD, "w-[9%] text-left")}>
              도축장 · 도축일
            </th>
            <th className={cn(INFO_HEAD, "text-left")}>상장업체</th>
            <th className={cn(INFO_HEAD, "w-[5%] border-l border-line")}>
              낙찰
            </th>
            <th className={cn(INFO_HEAD, "w-[7.5%] text-right")}>
              총 낙찰대금
            </th>
            <th className={cn(INFO_HEAD, "w-[7.5%] text-right")}>
              내 낙찰대금
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              className={cn(
                INFO_CELL,
                "text-left font-bold -tracking-[0.02em] text-content",
              )}
            >
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
            <td className={cn(INFO_CELL, "truncate text-left")}>
              {listing.companyName || "-"}
            </td>
            <td className={cn(INFO_CELL, "border-l border-line")}>
              <b className="font-bold">{s.wonCount}</b>
              <span className="text-content-soft">/{s.total}</span>
            </td>
            <td className={cn(INFO_CELL, "text-right")}>
              <Measured
                value={formatKrw(s.wonAmount)}
                unit="원"
                className="font-semibold"
              />
            </td>
            <td className={cn(INFO_CELL, "text-right")}>
              <Measured
                value={formatKrw(s.myWonAmount)}
                unit="원"
                className="font-bold"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <PartsColumns
        parts={listing.parts}
        listingNo={listing.listingNo}
        settled={settled}
      />
    </div>
  );
}

/* ───────────────────────── 부위 표 · 3분할 ───────────────────────── */

const PART_HEAD =
  "whitespace-nowrap border-b border-line bg-surface-accent px-1 py-[0.6mm] text-[8.5px] font-semibold text-content-mid";
const PART_CELL = "whitespace-nowrap px-1 py-[0.55mm] text-[9px] tabular-nums";

/**
 * 결과 · 「나에게」 어떤 결과인지를 말한다 (화면 결과 칩 `CHIP_LABEL` 과 같은 말).
 *
 * 종이에는 칩을 찍지 않는다. 바탕을 칠하면 흑백 인쇄에서 회색 띠가 되고, 색으로
 * 찍어도 한 장에 스무 줄씩 세 블록이라 토너만 먹는다. 굵기로 세 단을 두면 「내 낙찰」
 * 이 훑어서 보인다 — 종이에서 가장 먼저 세는 것이 그것이다.
 */
const RESULT_LABEL: Record<PartRowState, string> = {
  mineWon: "내 낙찰",
  mineLost: "미낙찰",
  otherWon: "낙찰",
  unsold: "유찰",
  open: "대기",
};
const RESULT_TONE: Record<PartRowState, string> = {
  mineWon: "font-bold text-content",
  mineLost: "font-semibold text-content-mid",
  otherWon: "text-content-mid",
  unsold: "text-content-faint",
  open: "text-content-faint",
};

/** 결과 · 상장번호 · 부위 · 중량 · 최저단가 · 낙찰가 · 낙찰대금 */
const PART_TABLE_COLUMNS = 7;
const PART_COLUMN_WIDTHS = ["13%", "19%", "15%", "9%", "14%", "14%", "16%"];

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
            {PART_COLUMN_WIDTHS.map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className={cn(PART_HEAD, "text-center")}>결과</th>
              <th className={cn(PART_HEAD, "text-left")}>상장번호</th>
              <th className={cn(PART_HEAD, "text-left")}>부위</th>
              <th className={cn(PART_HEAD, "text-right")}>중량</th>
              <th className={cn(PART_HEAD, "text-right")}>최저단가</th>
              <th className={cn(PART_HEAD, "text-right")}>낙찰가</th>
              <th className={cn(PART_HEAD, "text-right")}>낙찰대금</th>
            </tr>
          </thead>
          <tbody>
            {column.map((part) => (
              <PartRow
                key={part.id}
                part={part}
                listingNo={listingNo}
                state={getPartRowState(part, settled)}
              />
            ))}
            {Array.from({ length: rowsPerColumn - column.length }).map(
              (_, i) => (
                <tr
                  key={`pad-${i}`}
                  className="border-b border-line last:border-b-0"
                >
                  {Array.from({ length: PART_TABLE_COLUMNS }).map((_, j) => (
                    <td
                      key={j}
                      className={cn(PART_CELL, "text-right text-content-ghost")}
                    >
                      {j === 0 ? null : "-"}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function PartRow({
  part,
  listingNo,
  state,
}: {
  part: DailyListingPart;
  listingNo: string;
  state: PartRowState;
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
    <tr className="border-b border-line last:border-b-0">
      <td className={cn(PART_CELL, "text-center", RESULT_TONE[state])}>
        {RESULT_LABEL[state]}
      </td>
      <td
        className={cn(
          PART_CELL,
          "text-left -tracking-[0.02em] text-content-mid",
        )}
      >
        {partNoLabel(part, listingNo)}
      </td>
      <td
        className={cn(
          PART_CELL,
          "truncate text-left font-semibold text-content",
        )}
      >
        {part.partName}
      </td>
      <td className={cn(PART_CELL, "text-right text-content-mid")}>
        <Measured
          value={part.weight && part.weight > 0 ? part.weight.toFixed(1) : "-"}
          unit="kg"
        />
      </td>
      <td className={cn(PART_CELL, "text-right text-content-mid")}>
        <Measured value={formatKrw(part.minPrice)} unit="원" />
      </td>
      <td className={cn(PART_CELL, "text-right text-content-mid")}>
        {sold ? (
          <Measured value={formatKrw(wonPrice)} unit="원" />
        ) : (
          <span className="text-content-ghost">-</span>
        )}
      </td>
      <td className={cn(PART_CELL, "text-right")}>
        {sold ? (
          <Measured
            value={formatKrw(wonAmount)}
            unit="원"
            className="font-semibold text-content"
          />
        ) : (
          <span className="text-content-ghost">-</span>
        )}
      </td>
    </tr>
  );
}

/**
 * 숫자 + 단위 · 화면 표(`TableParts` 의 `Measured`)와 같은 규칙, 치수만 종이에 맞췄다.
 * 값이 없으면 단위를 뺀다 — 「-원」 은 0원처럼 읽힌다.
 */
function Measured({
  value,
  unit,
  className,
}: {
  value: string;
  unit: string;
  className?: string;
}) {
  if (value === "-") return <span className="text-content-ghost">-</span>;
  return (
    <>
      <span className={className}>{value}</span>
      <span className="pl-[0.3mm] text-[7.5px] text-content-soft">{unit}</span>
    </>
  );
}
