"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Download, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssignmentInfo } from "@/features/delivery/types";
import { formatKrw, formatWon } from "@/features/live-auction/lib/masking";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { CompactFilterPill } from "@/features/live-auction/components/CompactFilterPill";
import { SortHeaderButton } from "@/features/live-auction/components/SortHeaderButton";
import { ListingPartGradeStack } from "@/features/live-auction/components/ListingPartGradeStack";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  STATUS_LABEL,
  groupRowsByRound,
  summarizeRows,
  toTimeHms,
  type DailyRow,
} from "../lib/dailyRows";
import {
  cycleHistorySort,
  sortDailyRows,
  toAriaSort,
  type HistorySort,
  type HistorySortKey,
} from "../lib/historySort";
import { downloadHistoryXlsx } from "../lib/exportHistoryRows";
import { StatusBadge } from "./ResultBadge";

const STATUS_FILTER_OPTIONS = ["진행중", "낙찰", "미낙찰"] as const;

/** 필터 pill 고정 폭 · `미낙찰`(가장 긴 값) + chevron 이 들어가는 최소 */
const FILTER_PILL_CLASS = "w-[84px] shrink-0";

/** 컬럼 수 · 빈 행/스켈레톤 colSpan 용 */
const COLUMN_COUNT = 8;

const HEAD_CELL = "whitespace-nowrap border-b border-line py-2.5 -tracking-[0.01em]";
/** 숫자 컬럼 셀 · 우측 정렬 */
const NUM_CELL = "whitespace-nowrap px-3 py-2 text-right align-middle tabular-nums";

/** 행 배경 · 상태 배지와 두 겹으로 읽히도록 미낙찰·진행중만 틴트 */
const ROW_TONE: Record<DailyRow["status"], string> = {
  won: "hover:bg-slate-50/70",
  lost: "bg-rose-50/40 hover:bg-rose-50/70",
  active: "bg-sky-50/40 hover:bg-sky-50/70",
};

export interface DailyHistoryTableProps {
  /** yyyy-MM-dd · null 이면 일자 미선택 */
  selectedDate: string | null;
  /** 선택일 행 (필터 전) */
  rows: DailyRow[];
  /** 이 달 전체 행 · 월 엑셀 내보내기용 */
  monthRows: DailyRow[];
  /** 캘린더가 보고 있는 달 (yyyy-MM) */
  monthLabel: string;
  assignments: Record<string, AssignmentInfo>;
  isLoading: boolean;
  onOpenDetail: (row: DailyRow) => void;
  className?: string;
}

/**
 * 선택 일자의 경매내역 테이블.
 *
 * - 상태 배지 컬럼(진행중·낙찰·미낙찰 항상 표시) + 행 틴트(진행중 sky · 미낙찰 rose)
 * - 상장정보는 경매장 테이블의 `ListingPartGradeStack` 재사용 · 회차별 그룹 헤더 · 모든 컬럼 % 폭
 * - 헤더 정렬 · 상태·회차 필터 + 통합 검색 · 합계 행 · 엑셀 내보내기
 * - 부모가 높이를 주면(좌측 레일과 동일) 테이블 영역만 내부 스크롤
 */
export function DailyHistoryTable({
  selectedDate,
  rows,
  monthRows,
  monthLabel,
  assignments,
  isLoading,
  onOpenDetail,
  className,
}: DailyHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<HistorySort | null>(null);

  useEffect(() => {
    setStatusFilter("");
    setRoundFilter("");
    setQuery("");
  }, [selectedDate]);

  const roundOptions = useMemo(() => {
    const set = new Set<number>();
    for (const row of rows) {
      if (row.roundNo != null) set.add(row.roundNo);
    }
    return Array.from(set)
      .sort((a, b) => a - b)
      .map((n) => `${n}차`);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (statusFilter && STATUS_LABEL[row.status] !== statusFilter) return false;
      if (roundFilter) {
        const rowRound = row.roundNo != null ? `${row.roundNo}차` : "";
        if (rowRound !== roundFilter) return false;
      }
      if (!q) return true;
      const haystack = [
        row.listingNo,
        row.partName,
        formatGradeLabel(row.grade, row.marblingScore),
        row.companyName,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return sortDailyRows(filtered, sort);
  }, [rows, statusFilter, roundFilter, query, sort]);

  const groups = useMemo(() => groupRowsByRound(filteredRows), [filteredRows]);
  const summary = useMemo(() => summarizeRows(filteredRows), [filteredRows]);

  const hasActiveFilter =
    statusFilter !== "" || roundFilter !== "" || query.trim() !== "";
  const resetFilters = () => {
    setStatusFilter("");
    setRoundFilter("");
    setQuery("");
  };
  const toggleSort = (key: HistorySortKey) =>
    setSort((prev) => cycleHistorySort(prev, key));

  const dateTitle = selectedDate
    ? format(new Date(selectedDate), "yyyy.MM.dd (EEE)", { locale: ko })
    : "일자 선택";

  return (
    <div className={cn("flex flex-col border border-line bg-surface", className)}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-extrabold tabular-nums text-content">
            {dateTitle}
          </span>
          <span className="text-[11px] text-content-faint">·</span>
          <span className="text-[11px] tabular-nums text-content-soft">
            총 {filteredRows.length}
            {hasActiveFilter ? (
              <span className="text-content-faint"> / {rows.length}</span>
            ) : null}
            건
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] tabular-nums">
          <SummaryPill label="진행중" value={`${summary.activeCount}건`} tone="active" />
          <SummaryPill label="낙찰" value={`${summary.wonCount}건`} tone="won" />
          <SummaryPill label="미낙찰" value={`${summary.lostCount}건`} tone="lost" />
          <SummaryPill
            label="낙찰금액"
            value={summary.wonAmount > 0 ? formatWon(summary.wonAmount) : "-"}
            tone="amount"
          />
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-slate-50/50 px-4 py-2">
        {/* 값(진행중 · 1차)만으로 필터 종류가 드러나므로 선택 후 라벨 숨김 · 폭 고정으로 선택 시 레이아웃 흔들림 방지 */}
        <CompactFilterPill
          label="상태"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTER_OPTIONS}
          valueOnlyWhenActive
          className={FILTER_PILL_CLASS}
        />
        <CompactFilterPill
          label="회차"
          value={roundFilter}
          onChange={setRoundFilter}
          options={roundOptions}
          valueOnlyWhenActive
          className={FILTER_PILL_CLASS}
        />
        <SearchInput value={query} onChange={setQuery} />
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2 text-[11px] font-medium text-content-soft transition-colors hover:border-line hover:text-content-mid"
          >
            초기화
          </button>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <span className="whitespace-nowrap text-[10.5px] font-medium tabular-nums text-content-faint">
            단위 : 원/kg
            <span className="mx-1 text-content-ghost">·</span>
            총 금액은 원
          </span>
          <ExportMenu
            dayLabel={selectedDate}
            dayRows={filteredRows}
            monthLabel={monthLabel}
            monthRows={monthRows}
            assignments={assignments}
          />
        </div>
      </div>

      {/* 부모가 높이를 고정하면 이 영역만 스크롤 · thead/tfoot 은 고정 */}
      <div className="min-h-0 flex-1 overflow-auto">
        {/* 좁은 화면에서는 % 폭이 무너지지 않도록 최소폭 · 래퍼가 가로 스크롤 */}
        <table className="w-full min-w-[760px] table-fixed text-[12px]">
          {/*
           * 열 순서 = 상태 → 무엇을 → 얼마나 → 얼마에 → 누구에게 → 언제.
           * 모든 컬럼을 % 로 잡아 남는 폭이 한 컬럼에 몰리지 않고 균등하게 분배되도록 한다.
           * 880px 기준 ≈ 62 / 238 / 79 / 97 / 97 / 106 / 106 / 97px.
           */}
          <colgroup>
            <col className="w-[7%]" />
            <col className="w-[27%]" />
            <col className="w-[9%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-surface-muted text-[11.5px] font-semibold text-content-soft">
            <tr>
              <th className={cn(HEAD_CELL, "px-2 text-center")}>상태</th>
              <th
                className={cn(HEAD_CELL, "px-3 text-left")}
                aria-sort={toAriaSort(sort, "listingNo")}
              >
                <SortHeaderButton
                  label="상장정보"
                  active={sort?.key === "listingNo" ? sort.dir : null}
                  onClick={() => toggleSort("listingNo")}
                />
              </th>
              <th
                className={cn(HEAD_CELL, "px-3 text-right")}
                aria-sort={toAriaSort(sort, "weight")}
              >
                <SortHeaderButton
                  label="중량"
                  align="right"
                  active={sort?.key === "weight" ? sort.dir : null}
                  onClick={() => toggleSort("weight")}
                />
              </th>
              <th
                className={cn(HEAD_CELL, "px-3 text-right")}
                aria-sort={toAriaSort(sort, "minPrice")}
              >
                <SortHeaderButton
                  label="최저단가"
                  align="right"
                  active={sort?.key === "minPrice" ? sort.dir : null}
                  onClick={() => toggleSort("minPrice")}
                />
              </th>
              <th
                className={cn(HEAD_CELL, "px-3 text-right")}
                aria-sort={toAriaSort(sort, "myBid")}
              >
                <SortHeaderButton
                  label="내 입찰가"
                  align="right"
                  active={sort?.key === "myBid" ? sort.dir : null}
                  onClick={() => toggleSort("myBid")}
                />
              </th>
              <th className={cn(HEAD_CELL, "px-3 text-right")}>총 금액</th>
              <th className={cn(HEAD_CELL, "px-3 text-center")}>거래처</th>
              <th className={cn(HEAD_CELL, "px-3 text-right")}>입찰시간</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows colSpan={COLUMN_COUNT} rows={4} />
            ) : filteredRows.length === 0 ? (
              <EmptyRow
                colSpan={COLUMN_COUNT}
                message={
                  hasActiveFilter
                    ? "필터 조건에 해당하는 내역이 없습니다."
                    : "선택한 일자의 경매이력이 없습니다."
                }
              />
            ) : (
              groups.map((group) => (
                <Fragment key={group.roundNo ?? "none"}>
                  <RoundGroupHeader
                    roundNo={group.roundNo}
                    rows={group.rows}
                    hidden={groups.length === 1 && group.roundNo == null}
                  />
                  {group.rows.map((row) => (
                    <DailyRowView
                      key={row.id}
                      row={row}
                      assignment={assignments[row.partId] ?? null}
                      onOpenDetail={() => onOpenDetail(row)}
                    />
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
          {!isLoading && filteredRows.length > 0 ? (
            <tfoot className="sticky bottom-0 z-10 bg-surface-muted text-[12px]">
              <tr>
                <td
                  colSpan={2}
                  className="border-t border-line px-3 py-2 text-left font-semibold text-content-mid"
                >
                  합계
                  <span className="ml-1.5 text-[11px] font-medium tabular-nums text-content-faint">
                    낙찰·진행중 {summary.wonCount + summary.activeCount}건
                  </span>
                </td>
                <td className="border-t border-line px-3 py-2 text-right tabular-nums">
                  <WeightValue weight={summary.committedWeight} muted={false} />
                </td>
                <td className="border-t border-line" />
                <td className="border-t border-line" />
                <td className="border-t border-line px-3 py-2 text-right font-extrabold tabular-nums text-content">
                  {summary.committedAmount > 0
                    ? formatKrw(summary.committedAmount)
                    : "-"}
                </td>
                <td className="border-t border-line" />
                <td className="border-t border-line" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}

/**
 * 회차 그룹 헤더 · `1차 · 25건 · 낙찰 25 · 미낙찰 0 · 16,773,418원`.
 * 회차 정보가 전혀 없는 날(그룹 하나 · roundNo null)에는 그리지 않는다.
 */
function RoundGroupHeader({
  roundNo,
  rows,
  hidden,
}: {
  roundNo: number | null;
  rows: DailyRow[];
  hidden: boolean;
}) {
  if (hidden) return null;
  const s = summarizeRows(rows);
  return (
    <tr className="bg-slate-50/80">
      <td
        colSpan={COLUMN_COUNT}
        className="border-y border-line px-4 py-1.5"
      >
        <div className="flex items-center gap-2 text-[11px] tabular-nums">
          <span className="text-[12px] font-extrabold text-content">
            {roundNo != null ? `${roundNo}차` : "회차 미지정"}
          </span>
          <span className="text-content-ghost">·</span>
          <span className="font-semibold text-content-mid">{rows.length}건</span>
          <span className="text-content-ghost">·</span>
          <span className="text-content-soft">
            낙찰 <b className="font-bold text-sky-700">{s.wonCount}</b>
          </span>
          <span className="text-content-soft">
            미낙찰 <b className="font-bold text-content-mid">{s.lostCount}</b>
          </span>
          {s.activeCount > 0 ? (
            <span className="text-content-soft">
              진행중 <b className="font-bold text-content">{s.activeCount}</b>
            </span>
          ) : null}
          {s.wonAmount > 0 ? (
            <>
              <span className="text-content-ghost">·</span>
              <span className="font-bold text-content">{formatWon(s.wonAmount)}</span>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function DailyRowView({
  row,
  assignment,
  onOpenDetail,
}: {
  row: DailyRow;
  assignment: AssignmentInfo | null;
  onOpenDetail: () => void;
}) {
  const gradeLabel = formatGradeLabel(row.grade, row.marblingScore);
  const isActive = row.status === "active";
  const isWon = row.status === "won";
  const isLost = row.status === "lost";

  return (
    <tr
      onClick={onOpenDetail}
      className={cn(
        "cursor-pointer border-b border-line-soft transition-colors",
        ROW_TONE[row.status],
      )}
    >
      {/* 상태 · 세 상태 모두 항상 배지 · 폭 통일 · 가운데 */}
      <td className="px-2 py-2 text-center align-middle">
        <StatusBadge status={row.status} />
      </td>

      {/* 상장정보 · 경매장 테이블과 같은 스택 (번호 muted / 등급 · 부위 · 업체) */}
      <td className="px-3 py-2 align-middle">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
          className="block w-full min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <ListingPartGradeStack
            displayNo={row.listingNo || row.entityListingNo}
            companyName={row.companyName}
            partName={row.partName}
            gradeLabel={gradeLabel}
            muted={isLost}
          />
        </button>
      </td>

      {/* 중량 · 숫자 bold + kg muted */}
      <td className={cn(NUM_CELL)}>
        <WeightValue weight={row.weight} muted={isLost} />
      </td>

      {/* 최저단가 · medium · 기준값이라 한 단계 낮게 */}
      <td className={cn(NUM_CELL, "font-medium text-content-soft")}>
        {row.minPrice > 0 ? formatKrw(row.minPrice) : "-"}
      </td>

      {/* 내 입찰가 · semibold · 미낙찰이면 낙찰가 보조 */}
      <td className={cn(NUM_CELL, "leading-tight")}>
        <span
          className={cn(
            "block font-semibold",
            isLost ? "text-content-soft" : "text-content",
          )}
        >
          {formatKrw(row.myBid)}
        </span>
        {isLost && row.winningBid != null && row.winningBid > 0 ? (
          <span className="mt-0.5 block text-[10.5px] font-medium text-content-faint">
            낙찰 {formatKrw(row.winningBid)}
          </span>
        ) : null}
      </td>

      {/* 총 금액 · bold · 유일한 sky 강조 */}
      <td
        className={cn(
          NUM_CELL,
          "font-bold",
          isWon ? "text-sky-700" : isActive ? "text-content" : "text-content-ghost",
        )}
      >
        {isLost ? "-" : formatKrw(row.totalAmount)}
      </td>

      <td className="px-3 py-2 text-center align-middle">
        <PartnerCell assignment={assignment} eligible={isWon} />
      </td>

      {/* 입찰시간 · HH:mm:ss · 날짜는 테이블 제목이 말한다 · 엑셀에는 풀 타임스탬프 */}
      <td className="whitespace-nowrap px-3 py-2 text-right align-middle text-[11px] tabular-nums text-content-faint">
        {toTimeHms(row.time)}
      </td>
    </tr>
  );
}

/** 중량 · 숫자와 단위를 분리해 숫자만 굵게 · 값 없으면 "-" */
function WeightValue({ weight, muted }: { weight: number; muted: boolean }) {
  if (!Number.isFinite(weight) || weight <= 0) {
    return <span className="text-content-ghost">-</span>;
  }
  return (
    <span className="inline-flex items-baseline tabular-nums">
      <span className={cn("font-bold", muted ? "text-content-soft" : "text-content")}>
        {weight.toFixed(1)}
      </span>
      <span className="pl-0.5 text-[10.5px] font-medium text-content-faint">kg</span>
    </span>
  );
}

/**
 * 거래처 셀.
 * - 배정됨: 이름 + 거래처번호
 * - 낙찰인데 미배정: `미배정` 배지
 * - 진행중·미낙찰: 배정 대상이 아니므로 "-"
 */
function PartnerCell({
  assignment,
  eligible,
}: {
  assignment: AssignmentInfo | null;
  eligible: boolean;
}) {
  if (assignment) {
    return (
      <div className="flex min-w-0 flex-col items-center leading-tight">
        <span className="max-w-full truncate text-[12px] font-bold text-content">
          {assignment.partnerName || "-"}
        </span>
        {assignment.partnerNo ? (
          <span className="max-w-full truncate text-[10.5px] tabular-nums text-content-faint">
            {assignment.partnerNo}
          </span>
        ) : null}
      </div>
    );
  }
  if (eligible) {
    return (
      <span className="inline-flex h-5 items-center bg-surface-accent px-1.5 text-[10px] font-bold leading-none text-content-soft">
        미배정
      </span>
    );
  }
  return <span className="text-[11px] text-content-ghost">-</span>;
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative inline-flex h-7 items-center">
      <Search
        className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-content-faint"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="상장번호 · 부위 · 등급 · 업체"
        aria-label="경매내역 검색"
        className="h-7 w-[180px] rounded-md border border-line bg-surface pl-7 pr-6 text-[11.5px] text-content placeholder:text-content-faint focus:border-sky-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="검색어 지우기"
          className="absolute right-1.5 inline-flex h-4 w-4 items-center justify-center text-content-faint hover:text-content-mid"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </label>
  );
}

/**
 * 엑셀 내보내기 · 선택일 / 이 달 두 범위.
 */
function ExportMenu({
  dayLabel,
  dayRows,
  monthLabel,
  monthRows,
  assignments,
}: {
  dayLabel: string | null;
  dayRows: DailyRow[];
  monthLabel: string;
  monthRows: DailyRow[];
  assignments: Record<string, AssignmentInfo>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (rows: DailyRow[], fileLabel: string) => {
    if (busy || rows.length === 0) return;
    setBusy(true);
    try {
      await downloadHistoryXlsx({ rows, assignments, fileLabel });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const dayDisabled = !dayLabel || dayRows.length === 0;
  const monthDisabled = monthRows.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={dayDisabled && monthDisabled}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[11px] font-semibold text-content-mid transition-colors hover:border-line hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          엑셀 다운로드
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-[224px] rounded-md p-1">
        <ExportOption
          title={dayLabel ? `선택일 · ${dayLabel.replace(/-/g, ".")}` : "선택일"}
          count={dayRows.length}
          disabled={dayDisabled || busy}
          onClick={() => run(dayRows, dayLabel ?? "")}
        />
        <ExportOption
          title={`이 달 · ${monthLabel.replace("-", ".")}`}
          count={monthRows.length}
          disabled={monthDisabled || busy}
          onClick={() => run(monthRows, monthLabel)}
        />
      </PopoverContent>
    </Popover>
  );
}

function ExportOption({
  title,
  count,
  disabled,
  onClick,
}: {
  title: string;
  count: number;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-[12px] transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="font-semibold text-content">{title}</span>
      <span className="text-[11px] tabular-nums text-content-faint">{count}건</span>
    </button>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "active" | "won" | "lost" | "amount";
}) {
  const dotClass =
    tone === "active"
      ? "bg-inverse"
      : tone === "won"
        ? "bg-sky-500"
        : tone === "lost"
          ? "bg-rose-300"
          : "bg-inverse";
  const valueColor =
    tone === "won"
      ? "text-sky-700"
      : tone === "amount"
        ? "text-content"
        : tone === "lost"
          ? "text-content-soft"
          : "text-content";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2", dotClass)} aria-hidden />
      <span className="text-content-soft">{label}</span>
      <span className={cn("font-bold", valueColor)}>{value}</span>
    </span>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-16 text-center text-[13px] text-content-faint"
      >
        {message}
      </td>
    </tr>
  );
}

function SkeletonRows({ colSpan, rows }: { colSpan: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-line-soft">
          <td colSpan={colSpan} className="px-3 py-3">
            <div className="h-4 w-full animate-pulse bg-surface-accent" />
          </td>
        </tr>
      ))}
    </>
  );
}
