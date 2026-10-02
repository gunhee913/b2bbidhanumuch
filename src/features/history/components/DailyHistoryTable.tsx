"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import type { AssignmentInfo } from "@/features/delivery/types";
import { formatKrw } from "@/features/live-auction/lib/masking";
import {
  formatGradeLabel,
  matchesGradeFilter,
} from "@/features/live-auction/lib/grade";
import { SortHeaderButton } from "@/features/live-auction/components/SortHeaderButton";
import { CompactFilterPill } from "@/features/live-auction/components/CompactFilterPill";
import { GradeFilterTabs } from "@/features/live-auction/components/SheetFilterBar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { filterTabs, SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
  STATUS_LABEL,
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
import { CHIP_BASE } from "@/features/live-auction/components/PartResultRow";
import { PART_ROW_ATTR } from "../hooks/useHistoryKeys";
import { StatusBadge } from "./ResultBadge";
import {
  EmptyRow,
  Measured,
  ResetFiltersButton,
  SearchInput,
  SkeletonRows,
  WeightValue,
} from "./TableParts";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";

const STATUS_TABS = filterTabs(["진행중", "낙찰", "미낙찰"]);

/** 컬럼 수 · 빈 행/스켈레톤 colSpan 용 */
const COLUMN_COUNT = 12;

/**
 * 칸 밀도 · 배송지시 표와 같은 값 (여백 `px-2 py-1` · 줄 높이 36 + 선 1 = 37).
 *
 * **높이를 못 박는 까닭.** 배송지시는 줄마다 거래처 고르는 상자(`h-7` 28px)가 서
 * 있어 줄이 그 높이로 선다. 여기엔 그런 상자가 없어 그냥 두면 글자 줄 높이(19)
 * 만큼만 서서 28px 이 된다 — 여백이 같아도 줄은 9px 좁다. 같은 사람이 같은 날
 * 오가는 표인데 한쪽만 빽빽하면 눈이 매번 다시 적응해야 한다.
 *
 * 전에는 반대로 성겼다. `px-3 py-2` 에 상장정보가 두 줄 스택이라 한 줄이 50px —
 * 배송지시의 한 배 반이었다. 그 스택은 열로 쪼갰다 (접수번호 · 등급 · 부위 · 업체).
 * 세로로 훑는 표에서 스택은 등급 하나를 비교하려 해도 눈이 지그재그로 가야 한다.
 */
const ROW_H = "h-9";
/**
 * 머리글은 값보다 약하게 · 경매장 상장표(`SHEET_HEAD`)와 같은 규칙이다.
 *
 * 굵기를 th 에 직접 건다 — 브라우저 기본 `th { font-weight: bold }` 는 thead 상속을
 * 이긴다. 굵은 쪽이 데이터여야 표가 또렷하게 읽힌다.
 */
const HEAD_CELL =
  "whitespace-nowrap border-b border-line py-1.5 font-medium -tracking-[0.01em]";
/** 낙찰 ↔ 배송 경계 · 배송지시 표가 같은 자리에 같은 선을 긋는다 */
const GROUP_START = "border-l border-l-line pl-3";

/**
 * 열마다 제 값이 안 잘리는 폭 (px) · 이 합의 비율로 환산해 쓴다.
 *
 * 경매장 부위표(`SheetParts`)가 쓰는 방식이다. px 로 못 박고 한 칸에 남는 폭을
 * 몰아주면 그 칸만 협곡이 되고(「건화」 두 글자가 220px 을 깔고 앉는다), 눈대중으로
 * % 를 적으면 넓힐 때 일곱 자짜리 등급 칸이 숫자 칸보다 커진다. 자연 폭의 비율로
 * 두면 어느 폭에서도 칸들이 **같은 비로** 늘고 줄어 열두 칸의 사이가 고르다.
 *
 * 각 값은 여백 16 을 포함한다 — 접수번호 `260929-101-01` 86+16, 등급 `1++A(9)` 48+16.
 *
 * 돈 칸 넷은 꼬리에 붙은 「원」(10.5px) 만큼 13 씩 넓다. 그 13 은 잘려도 되는 두 칸
 * (업체 · 거래처 · 둘 다 `truncate`)에서 꿔 왔다 — 표 전체 바닥이 넓어지면 판 안에서
 * 가로로 미는 지점이 그만큼 당겨진다.
 */
const COLUMN_WIDTHS = [
  62, // 상태 · 배지 46 · 글자가 아니라 안 늘어난다
  106, // 접수번호
  66, // 등급
  78, // 부위
  92, // 업체 · 잘려도 되는 칸
  66, // 중량
  83, // 최저단가 · `128,000원`
  91, // 내 입찰가
  120, // 낙찰단가 · 밀린 줄엔 `109,400원 +2,000` 둘이 선다
  98, // 총 낙찰대금 · `1,234,567원`
  96, // 거래처 · 잘려도 되는 칸
  62, // 입찰시간 · `text-[11px]` 이라 안 늘어난다
];
const TABLE_BASE_WIDTH = COLUMN_WIDTHS.reduce((sum, w) => sum + w, 0);
const TEXT_CELL = cn(ROW_H, "whitespace-nowrap px-2 py-1 align-middle");
/** 숫자 컬럼 셀 · 우측 정렬 */
const NUM_CELL = cn(
  ROW_H,
  "whitespace-nowrap px-2 py-1 text-right align-middle tabular-nums",
);

/** 행 배경 · 상태 배지와 두 겹으로 읽히도록 미낙찰·진행중만 틴트 */
const ROW_TONE: Record<DailyRow["status"], string> = {
  won: "hover:bg-surface-muted",
  lost: "bg-lost-surface/50 hover:bg-lost-surface",
  active: "bg-won-surface/50 hover:bg-won-surface",
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
  /** 왼쪽 두 판이 비추고 있는 부위 (260720-101-01) · 그 줄을 밝힌다 */
  focusedPartNo: string | null;
  /** 머리줄 맨 앞 일자 조회 · 세 화면이 같은 것을 쓴다 (`HistoryDatePicker`) */
  dateControl: ReactNode;
  /** 줄을 눌렀다 · 사진판이 그 개체로 간다 */
  onSelectRow: (row: DailyRow) => void;
  /** 머리글 오른쪽 · 판을 옮기는 손잡이가 들어온다 */
  headerAction?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 선택 일자의 경매내역 테이블.
 *
 * - 상태 배지 컬럼(진행중·낙찰·미낙찰 항상 표시) + 행 틴트
 * - 한 줄 = 한 부위 · 회차별 그룹 헤더 · 모든 컬럼 % 폭 (배송지시 표와 같은 밀도)
 * - 헤더 정렬 · 상태·회차 필터 + 통합 검색 · 합계 행 · 엑셀 내보내기
 * - 부모가 높이를 주면(좌측 열과 동일) 테이블 영역만 내부 스크롤
 *
 * 줄을 누르면 왼쪽 사진판이 그 개체로 간다 — 그게 전부다 (경매장 부위표·배송지시
 * 표와 같은 손놀림). 어디를 눌러도 다른 화면으로 넘어가지 않는다. 하루 수십 줄을
 * 위아래로 훑는 표에서 줄을 짚는 일이 화면 전환이 되면 둘러보는 일 자체가 안 된다.
 */
export function DailyHistoryTable({
  selectedDate,
  rows,
  monthRows,
  monthLabel,
  assignments,
  isLoading,
  focusedPartNo,
  onSelectRow,
  dateControl,
  headerAction,
  className,
  style,
  ref,
}: DailyHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<HistorySort | null>(null);

  useEffect(() => {
    setStatusFilter("");
    setGradeFilter("");
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
      if (statusFilter && STATUS_LABEL[row.status] !== statusFilter)
        return false;
      if (!matchesGradeFilter(gradeFilter, row.grade, row.marblingScore))
        return false;
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
  }, [rows, statusFilter, gradeFilter, roundFilter, query, sort]);

  const summary = useMemo(() => summarizeRows(filteredRows), [filteredRows]);

  const hasActiveFilter =
    statusFilter !== "" ||
    gradeFilter !== "" ||
    roundFilter !== "" ||
    query.trim() !== "";
  const resetFilters = () => {
    setStatusFilter("");
    setGradeFilter("");
    setRoundFilter("");
    setQuery("");
  };
  const toggleSort = (key: HistorySortKey) =>
    setSort((prev) => cycleHistorySort(prev, key));

  return (
    <div
      ref={ref}
      style={style}
      className={cn("flex flex-col", SURFACE_SHELL_CLASS, className)}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 pl-2.5 pr-3">
        <div className="flex items-center gap-2">
          {dateControl}
          <span className="text-[11px] text-content-faint">·</span>
          <span className="text-[11px] tabular-nums text-content-soft">
            총 {filteredRows.length}
            {hasActiveFilter ? (
              <span className="text-content-faint"> / {rows.length}</span>
            ) : null}
            건
          </span>
        </div>

        {/* 머리글 여백보다 한 칸 바깥으로 · 글자 줄과 아이콘의 광학 끝선을 맞춘다 */}
        {headerAction ? (
          <div className="-mr-1 flex shrink-0 items-center">{headerAction}</div>
        ) : null}
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface-muted px-4 py-2">
        <SegmentedTabs
          label="상태"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_TABS}
          toggleable
        />
        <GradeFilterTabs value={gradeFilter} onChange={setGradeFilter} />
        {/*
         * 회차는 접어 둔다 · 날마다 하나에서 셋 사이로 변하는 데다, 고르는 일이
         * 상태·등급보다 드물다. 늘 펴 두면 거르개 줄에서 제일 안 쓰는 것이 제일
         * 넓은 자리를 차지한다 (경매장이 업체를 접어 두는 것과 같은 셈).
         */}
        {roundOptions.length > 1 ? (
          <CompactFilterPill
            label="회차"
            value={roundFilter}
            onChange={setRoundFilter}
            options={roundOptions}
            valueOnlyWhenActive
          />
        ) : null}
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="상장번호 · 부위 · 등급 · 업체"
          label="경매결과 검색"
        />
        {hasActiveFilter ? <ResetFiltersButton onClick={resetFilters} /> : null}

        <div className="ml-auto flex items-center">
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
      <TableScroll>
        {/* 좁은 화면에서는 % 폭이 무너지지 않도록 최소폭 · 래퍼가 가로 스크롤 */}
        {/*
         * 열 순서 = 상태 → 무엇을 → 얼마나 → 얼마에 → 누구에게 → 언제.
         * 바닥은 열 자연 폭의 합이다 · 그 아래로는 표가 제 판 안에서 가로로 민다
         * (판의 바닥 `TABLE_MIN_WIDTH` 560 은 따로 있다).
         */}
        <table
          style={{ minWidth: TABLE_BASE_WIDTH }}
          className="w-full table-fixed text-[13px] font-semibold text-content"
        >
          <colgroup>
            {COLUMN_WIDTHS.map((width, i) => (
              <col
                key={i}
                style={{ width: `${(width / TABLE_BASE_WIDTH) * 100}%` }}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-surface-muted text-[12px] font-medium text-content-faint">
            <tr>
              <th className={cn(HEAD_CELL, "px-2 text-center")}>상태</th>
              <th
                className={cn(HEAD_CELL, "px-2 text-left")}
                aria-sort={toAriaSort(sort, "listingNo")}
              >
                <SortHeaderButton
                  label="접수번호"
                  active={sort?.key === "listingNo" ? sort.dir : null}
                  onClick={() => toggleSort("listingNo")}
                />
              </th>
              <th className={cn(HEAD_CELL, "px-2 text-left")}>등급</th>
              <th className={cn(HEAD_CELL, "px-2 text-left")}>부위</th>
              <th className={cn(HEAD_CELL, "px-2 text-left")}>업체</th>
              <th
                className={cn(HEAD_CELL, "px-2 text-right")}
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
                className={cn(HEAD_CELL, "px-2 text-right")}
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
                className={cn(HEAD_CELL, "px-2 text-right")}
                aria-sort={toAriaSort(sort, "myBid")}
              >
                <SortHeaderButton
                  label="내 입찰가"
                  align="right"
                  active={sort?.key === "myBid" ? sort.dir : null}
                  onClick={() => toggleSort("myBid")}
                />
              </th>
              <th
                className={cn(HEAD_CELL, "px-2 text-right")}
                aria-sort={toAriaSort(sort, "winningBid")}
              >
                <SortHeaderButton
                  label="낙찰단가"
                  align="right"
                  active={sort?.key === "winningBid" ? sort.dir : null}
                  onClick={() => toggleSort("winningBid")}
                />
              </th>
              <th className={cn(HEAD_CELL, "px-2 text-right")}>총 낙찰대금</th>
              <th className={cn(HEAD_CELL, GROUP_START, "pr-2 text-center")}>
                거래처
              </th>
              <th className={cn(HEAD_CELL, "px-2 text-right")}>입찰시간</th>
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
              filteredRows.map((row) => (
                <DailyRowView
                  key={row.id}
                  row={row}
                  assignment={assignments[row.partId] ?? null}
                  isSelected={row.listingNo === focusedPartNo}
                  onSelect={() => onSelectRow(row)}
                />
              ))
            )}
          </tbody>
          {!isLoading && filteredRows.length > 0 ? (
            <tfoot className="sticky bottom-0 z-10 bg-surface-muted">
              <tr>
                {/* 상태 + 접수번호 + 등급 + 부위 + 업체 다섯 칸을 「합계」 가 쓴다 */}
                <td
                  colSpan={5}
                  className={cn(
                    ROW_H,
                    "border-t border-line px-2 py-1 text-left font-semibold text-content-mid",
                  )}
                >
                  합계
                  <span className="ml-1.5 text-[11px] font-medium tabular-nums text-content-faint">
                    낙찰·진행중 {summary.wonCount + summary.activeCount}건
                  </span>
                </td>
                <td
                  className={cn(
                    ROW_H,
                    "border-t border-line px-2 py-1 text-right tabular-nums",
                  )}
                >
                  <WeightValue weight={summary.committedWeight} muted={false} />
                </td>
                <td className="border-t border-line" />
                <td className="border-t border-line" />
                <td className="border-t border-line" />
                <td className="border-t border-line px-2 py-1 text-right tabular-nums">
                  <Measured
                    value={formatKrw(summary.committedAmount)}
                    unit="원"
                    className="font-extrabold text-content"
                  />
                </td>
                <td className={cn("border-t border-line", GROUP_START)} />
                <td className="border-t border-line" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </TableScroll>
    </div>
  );
}

function DailyRowView({
  row,
  assignment,
  isSelected,
  onSelect,
}: {
  row: DailyRow;
  assignment: AssignmentInfo | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const gradeLabel = formatGradeLabel(row.grade, row.marblingScore);
  const isActive = row.status === "active";
  const isWon = row.status === "won";
  const isLost = row.status === "lost";

  return (
    <tr
      {...{ [PART_ROW_ATTR]: row.listingNo }}
      onClick={onSelect}
      aria-selected={isSelected}
      className={cn(
        "cursor-pointer border-b border-line-soft transition-colors",
        ROW_TONE[row.status],
        /* 짚은 줄은 결과 틴트를 덮는다 · 경매장 부위표와 같다 (`getRowBgClass`) */
        isSelected && "bg-surface-accent hover:bg-surface-accent",
      )}
    >
      {/* 상태 · 세 상태 모두 항상 배지 · 폭 통일 · 가운데 */}
      <td className={cn(TEXT_CELL, "text-center")}>
        <StatusBadge status={row.status} />
      </td>

      {/* 접수번호 · 부위까지 붙은 전체 번호 · 줄의 이름표라 가장 또렷하게 (경매장 상장표와 같다) */}
      <td
        className={cn(
          TEXT_CELL,
          "font-bold tabular-nums -tracking-[0.02em]",
          isLost ? "text-content-mid" : "text-content",
        )}
      >
        {row.listingNo || row.entityListingNo}
      </td>

      {/* 등급 · 줄마다 같은 자리에 오는 닻이라 굵게 */}
      <td
        className={cn(
          TEXT_CELL,
          "font-semibold tabular-nums -tracking-[0.01em]",
          isLost ? "text-content-mid" : "text-content",
        )}
      >
        {gradeLabel}
      </td>

      {/* 부위 */}
      <td
        className={cn(
          TEXT_CELL,
          "truncate",
          isLost ? "text-content-soft" : "text-content-mid",
        )}
        title={row.partName}
      >
        {row.partName}
      </td>

      {/* 업체 · 같은 날 되풀이되는 값이라 한 단계 묻힌다 */}
      <td
        className={cn(
          TEXT_CELL,
          "truncate font-medium",
          isLost ? "text-content-ghost" : "text-content-faint",
        )}
        title={row.companyName}
      >
        {row.companyName || "-"}
      </td>

      {/* 중량 · 숫자 bold + kg muted */}
      <td className={cn(NUM_CELL)}>
        <WeightValue weight={row.weight} muted={isLost} />
      </td>

      {/* 최저단가 · medium · 기준값이라 한 단계 낮게 */}
      <td className={NUM_CELL}>
        <Measured
          value={formatKrw(row.minPrice)}
          unit="원"
          className="font-medium text-content-soft"
        />
      </td>

      {/* 내 입찰가 · 내가 부른 값 */}
      <td className={NUM_CELL}>
        <Measured
          value={formatKrw(row.myBid)}
          unit="원"
          className={cn(
            "font-semibold",
            isLost ? "text-content-soft" : "text-content",
          )}
        />
      </td>

      {/* 낙찰단가 · 이 부위가 실제로 떨어진 값 */}
      <td className={cn(NUM_CELL)}>
        <WinningPriceValue row={row} />
      </td>

      {/*
       * 총 낙찰대금 · 밀린 줄은 낼 돈이 없어 `-`.
       *
       * 색을 쓰지 않는다. 먹은 줄을 `won`(파랑)으로 띄워 봤는데, 이 열에서 숫자가 찍히는
       * 줄은 거의 다 먹은 줄이라 열의 7할이 파래졌다 — 가리키려고 쓴 색이 아무것도
       * 가리키지 못했다. 먹었는지 밀렸는지는 맨 앞 상태 배지가 이미 말한다
       * (경매장 상장표도 낙찰대금 열에는 색을 두지 않는다).
       */}
      <td className={NUM_CELL}>
        <Measured
          value={isLost ? "-" : formatKrw(row.totalAmount)}
          unit="원"
          className="font-bold text-content"
        />
      </td>

      <td
        className={cn(TEXT_CELL, GROUP_START, "truncate text-center")}
        title={assignment?.partnerName || undefined}
      >
        <PartnerCell assignment={assignment} eligible={isWon} />
      </td>

      {/* 입찰시간 · HH:mm:ss · 날짜는 표 제목이 말한다 · 엑셀에는 풀 타임스탬프 */}
      <td
        className={cn(NUM_CELL, "text-[11px] font-medium text-content-faint")}
      >
        {toTimeHms(row.time)}
      </td>
    </tr>
  );
}

/**
 * 낙찰단가 · 이 부위가 실제로 떨어진 값.
 *
 * 한때 「내 입찰가」 칸 밑에 작은 글씨로 붙어 있었는데, 그러면 밀린 줄에서만 보여
 * 열을 세로로 훑을 수가 없었다. 되짚어 보는 화면에서 가장 자주 하는 일이 「얼마에
 * 떨어졌나」 를 줄줄이 내려 읽는 것이라 제 열이 있어야 한다.
 *
 * 먹은 줄에는 내가 부른 값과 같은 수가 찍힌다 — 같은 값을 두 번 쓰는 셈이라 한 단계
 * 낮춰 둔다. 밀린 줄에는 밑에 모자랐던 만큼을 적는다. 그게 이 화면이 답하는 것이다:
 * 「얼마를 더 불렀어야 했나」.
 */
function WinningPriceValue({ row }: { row: DailyRow }) {
  const price = row.winningBid;
  if (price == null || price <= 0) {
    return <span className="text-content-ghost">-</span>;
  }
  if (row.status !== "lost") {
    return (
      <Measured
        value={formatKrw(price)}
        unit="원"
        className="font-medium text-content-soft"
      />
    );
  }
  /*
   * 모자랐던 만큼을 옆에 붙인다 · 전에는 아랫줄에 깔았다. 열두 칸 가운데 한 칸이
   * 두 줄이면 나머지 열한 칸이 모두 그 높이를 따라가 표 전체가 두 배로 성겨진다.
   */
  const shortfall = price - row.myBid;
  return (
    <>
      <Measured
        value={formatKrw(price)}
        unit="원"
        className="font-semibold text-content-mid"
      />
      {shortfall > 0 ? (
        <span className="pl-1 text-[10.5px] font-semibold text-lost">
          +{formatKrw(shortfall)}
        </span>
      ) : null}
    </>
  );
}

/**
 * 거래처 셀.
 * - 배정됨: 이름 + 거래처번호 · 한 줄에 나란히 (줄을 한 줄 높이로 묶어 둔 표다)
 * - 낙찰인데 미배정: `미배정` 배지 · 상태 배지와 같은 18px
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
      <>
        <span className="font-bold text-content">
          {assignment.partnerName || "-"}
        </span>
        {assignment.partnerNo ? (
          <span className="pl-1 text-[10.5px] tabular-nums text-content-faint">
            {assignment.partnerNo}
          </span>
        ) : null}
      </>
    );
  }
  if (eligible) {
    return (
      <span
        className={cn(
          CHIP_BASE,
          "bg-surface-accent align-middle text-content-soft",
        )}
      >
        미배정
      </span>
    );
  }
  return <span className="text-[11px] text-content-ghost">-</span>;
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
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[224px] rounded-md p-1"
      >
        <ExportOption
          title={
            dayLabel ? `선택일 · ${dayLabel.replace(/-/g, ".")}` : "선택일"
          }
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
      <span className="text-[11px] tabular-nums text-content-faint">
        {count}건
      </span>
    </button>
  );
}
