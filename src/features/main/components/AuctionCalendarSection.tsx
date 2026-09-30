"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  fetchAuctionCalendar,
  fetchAuctionDayStats,
  type AuctionDayGradeStat,
} from "@/features/main/api";
import { cn } from "@/lib/utils";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const GENDER_TABS = [
  { value: "all", label: "전체" },
  { value: "거세", label: "거세" },
  { value: "암", label: "암" },
] as const;

type GenderFilter = (typeof GENDER_TABS)[number]["value"];

function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function toMonthKey(d: Date): string {
  return format(d, "yyyy-MM");
}

/** 월 그리드는 항상 6주(42셀)로 고정하여 월마다 캘린더 높이가 달라지는 것을 방지 */
const TOTAL_CALENDAR_CELLS = 42;

function buildMonthGrid(anchor: Date): (Date | null)[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < TOTAL_CALENDAR_CELLS; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      cells.push(null);
    } else {
      cells.push(new Date(year, month, dayNum));
    }
  }
  return cells;
}

/** 등급 매트릭스 기본 골격 - 데이터가 아직 없을 때도 매트릭스 형태를 유지하기 위함 */
const GRADE_ROWS_FALLBACK: AuctionDayGradeStat[] = [
  { grade: "1++(9)", A: 0, B: 0, C: 0, total: 0 },
  { grade: "1++(8)", A: 0, B: 0, C: 0, total: 0 },
  { grade: "1++(7)", A: 0, B: 0, C: 0, total: 0 },
  { grade: "1+", A: 0, B: 0, C: 0, total: 0 },
  { grade: "1", A: 0, B: 0, C: 0, total: 0 },
  { grade: "2", A: 0, B: 0, C: 0, total: 0 },
  { grade: "3", A: 0, B: 0, C: 0, total: 0 },
];

export function AuctionCalendarSection() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [anchorMonth, setAnchorMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");

  const monthKey = toMonthKey(anchorMonth);
  const dateKey = toDateKey(selectedDate);

  const calendarQuery = useQuery({
    queryKey: ["main", "auction-calendar", monthKey, "all"],
    queryFn: () => fetchAuctionCalendar(monthKey),
    staleTime: 60_000,
  });

  const dayStatsQuery = useQuery({
    queryKey: [
      "main",
      "auction-day-stats",
      dateKey,
      "all",
      genderFilter,
    ],
    queryFn: () =>
      fetchAuctionDayStats(
        dateKey,
        undefined,
        genderFilter === "all" ? undefined : genderFilter,
      ),
    staleTime: 60_000,
  });

  const dayCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (calendarQuery.data?.days ?? []).forEach((d) =>
      map.set(d.date, d.totalListings),
    );
    return map;
  }, [calendarQuery.data]);

  const gridCells = useMemo(
    () => buildMonthGrid(anchorMonth),
    [anchorMonth],
  );

  const handlePrevMonth = () => {
    setAnchorMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };
  const handleNextMonth = () => {
    setAnchorMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const monthLabel = `${anchorMonth.getFullYear()}년 ${anchorMonth.getMonth() + 1}월`;

  const byGrade = dayStatsQuery.data?.byGrade ?? [];
  const totalCount = dayStatsQuery.data?.totalListings ?? 0;
  const selectedDayLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${WEEKDAY_LABELS[selectedDate.getDay()]})`;

  return (
    <section id="calendar" className="bg-surface-muted py-14">
      <div className="mx-auto max-w-[1360px] min-[1700px]:max-w-[1600px] px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-content">경매 캘린더</h2>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <CalendarView
            monthLabel={monthLabel}
            gridCells={gridCells}
            dayCountMap={dayCountMap}
            selectedDate={selectedDate}
            today={today}
            isLoading={calendarQuery.isLoading}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          <DetailPanel
            selectedDayLabel={selectedDayLabel}
            totalCount={totalCount}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            byGrade={byGrade.length > 0 ? byGrade : GRADE_ROWS_FALLBACK}
          />
        </div>
      </div>
    </section>
  );
}

interface CalendarViewProps {
  monthLabel: string;
  gridCells: (Date | null)[];
  dayCountMap: Map<string, number>;
  selectedDate: Date;
  today: Date;
  isLoading: boolean;
  onSelectDate: (d: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function CalendarView({
  monthLabel,
  gridCells,
  dayCountMap,
  selectedDate,
  today,
  isLoading,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarViewProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-content">{monthLabel}</h3>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded-md p-1.5 text-content-soft transition-colors hover:bg-surface-accent hover:text-content-mid"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-md p-1.5 text-content-soft transition-colors hover:bg-surface-accent hover:text-content-mid"
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-1 text-center text-[11px] font-semibold",
              i === 0 && "text-rose-500",
              i === 6 && "text-sky-500",
              i !== 0 && i !== 6 && "text-content-faint",
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {gridCells.map((cell, idx) => {
          if (!cell) return <div key={idx} className="h-16" />;

          const cellKey = toDateKey(cell);
          const count = dayCountMap.get(cellKey);
          const isSelected = toDateKey(selectedDate) === cellKey;
          const isToday = toDateKey(today) === cellKey;
          const isFuture = cell.getTime() > today.getTime();
          const dayOfWeek = cell.getDay();

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(cell)}
              className={cn(
                "flex h-16 flex-col items-start justify-between rounded-lg border p-1.5 text-left transition-all",
                isSelected
                  ? "border-sky-500 bg-sky-50 ring-2 ring-sky-100"
                  : "border-line-soft hover:border-line hover:bg-surface-muted",
                isFuture && !isSelected && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold",
                  isSelected && "text-sky-700",
                  !isSelected && dayOfWeek === 0 && "text-rose-500",
                  !isSelected && dayOfWeek === 6 && "text-sky-500",
                  !isSelected && dayOfWeek !== 0 && dayOfWeek !== 6 && "text-content-mid",
                  isToday &&
                    !isSelected &&
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-inverse px-1 text-inverse-content",
                )}
              >
                {cell.getDate()}
              </span>
              {count !== undefined && count > 0 ? (
                <span
                  className={cn(
                    "self-end text-[11px] font-semibold tabular-nums",
                    isSelected ? "text-sky-700" : "text-content-mid",
                  )}
                >
                  {NUMBER_FORMATTER.format(count)}두
                </span>
              ) : isLoading ? (
                <span className="self-end text-[10px] text-content-ghost">…</span>
              ) : (
                <span className="self-end text-[10px] text-content-ghost">-</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DetailPanelProps {
  selectedDayLabel: string;
  totalCount: number;
  genderFilter: GenderFilter;
  setGenderFilter: (v: GenderFilter) => void;
  byGrade: AuctionDayGradeStat[];
}

function DetailPanel({
  selectedDayLabel,
  totalCount,
  genderFilter,
  setGenderFilter,
  byGrade,
}: DetailPanelProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-start justify-between border-b border-line-soft px-6 py-4">
        <div>
          <div className="text-base font-bold text-content">
            {selectedDayLabel}
          </div>
          <div className="mt-0.5 text-xs text-content-soft">
            전체 공판장
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-medium text-content-soft">
            총 상장 두수
          </div>
          <div className="mt-0.5 flex items-baseline justify-end gap-1">
            <span className="text-2xl font-bold text-content tabular-nums">
              {NUMBER_FORMATTER.format(totalCount)}
            </span>
            <span className="text-xs text-content-soft">두</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-3">
        <span className="text-xs font-medium text-content-soft">
          등급별 상장 두수
        </span>
        <div className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5">
          {GENDER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setGenderFilter(tab.value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                genderFilter === tab.value
                  ? "bg-surface text-content shadow-sm"
                  : "text-content-soft hover:text-content-mid",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 border-t border-line-soft">
        <GradeMatrixTable data={byGrade} />
      </div>
    </div>
  );
}

interface GradeMatrixTableProps {
  data: AuctionDayGradeStat[];
}

function GradeMatrixTable({ data }: GradeMatrixTableProps) {
  const columnTotals = data.reduce(
    (acc, row) => ({
      A: acc.A + row.A,
      B: acc.B + row.B,
      C: acc.C + row.C,
      total: acc.total + row.total,
    }),
    { A: 0, B: 0, C: 0, total: 0 },
  );

  return (
    <table className="w-full table-fixed text-sm">
      <colgroup>
        <col className="w-[32%]" />
        <col className="w-[17%]" />
        <col className="w-[17%]" />
        <col className="w-[17%]" />
        <col className="w-[17%]" />
      </colgroup>
      <thead className="bg-surface-muted text-xs font-semibold text-content-soft">
        <tr>
          <th className="border-b border-line-soft px-4 py-2.5 text-left">
            등급
          </th>
          <th className="border-b border-line-soft px-4 py-2.5 text-center">
            A
          </th>
          <th className="border-b border-line-soft px-4 py-2.5 text-center">
            B
          </th>
          <th className="border-b border-line-soft px-4 py-2.5 text-center">
            C
          </th>
          <th className="border-b border-line-soft bg-surface-accent px-4 py-2.5 text-center text-content-mid">
            합계
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line-soft">
        {data.map((row) => (
          <tr key={row.grade} className="hover:bg-surface-muted">
            <td className="px-4 py-2.5 text-left font-semibold text-content">
              {row.grade}
            </td>
            <MatrixCell value={row.A} />
            <MatrixCell value={row.B} />
            <MatrixCell value={row.C} />
            <td className="bg-slate-50/60 px-4 py-2.5 text-center tabular-nums font-semibold text-content">
              {row.total > 0 ? NUMBER_FORMATTER.format(row.total) : (
                <span className="text-content-ghost">-</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-line bg-surface-muted">
          <td className="px-4 py-2.5 text-left text-sm font-bold text-content">
            합계
          </td>
          <MatrixCell value={columnTotals.A} bold />
          <MatrixCell value={columnTotals.B} bold />
          <MatrixCell value={columnTotals.C} bold />
          <td className="bg-sky-50 px-4 py-2.5 text-center tabular-nums text-sm font-bold text-sky-700">
            {columnTotals.total > 0 ? (
              NUMBER_FORMATTER.format(columnTotals.total)
            ) : (
              <span className="text-content-ghost">-</span>
            )}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function MatrixCell({ value, bold = false }: { value: number; bold?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-2.5 text-center tabular-nums",
        bold ? "text-sm font-bold text-content" : "text-content-mid",
      )}
    >
      {value > 0 ? NUMBER_FORMATTER.format(value) : (
        <span className="text-content-ghost">-</span>
      )}
    </td>
  );
}

