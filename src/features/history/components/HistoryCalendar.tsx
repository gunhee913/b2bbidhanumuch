"use client";

import { useMemo } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const KRW_FORMATTER = new Intl.NumberFormat("ko-KR");
const formatKrw = (value: number) => `${KRW_FORMATTER.format(value)}원`;

/**
 * 낙찰금액 강도 히트맵 · 4단계 slate 톤.
 * 배경 강도가 올라갈수록 텍스트는 dark → light 로 전환하여 대비 확보.
 */
type HeatLevel = 0 | 1 | 2 | 3 | 4;

const HEAT_STYLE: Record<
  HeatLevel,
  { bg: string; hover: string; text: string; subText: string }
> = {
  0: {
    bg: "bg-white",
    hover: "hover:bg-slate-50",
    text: "text-slate-900",
    subText: "text-slate-500",
  },
  1: {
    bg: "bg-slate-100",
    hover: "hover:bg-slate-200",
    text: "text-slate-900",
    subText: "text-slate-500",
  },
  2: {
    bg: "bg-slate-300",
    hover: "hover:bg-slate-400",
    text: "text-slate-900",
    subText: "text-slate-600",
  },
  3: {
    bg: "bg-slate-500",
    hover: "hover:bg-slate-600",
    text: "text-white",
    subText: "text-white/85",
  },
  4: {
    bg: "bg-slate-800",
    hover: "hover:bg-slate-900",
    text: "text-white",
    subText: "text-white/85",
  },
};

/** 현재 월의 최대 낙찰금액 대비 ratio 를 0~4 단계로 매핑 */
function computeHeatLevel(amount: number, monthMax: number): HeatLevel {
  if (amount <= 0 || monthMax <= 0) return 0;
  const ratio = amount / monthMax;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export interface CalendarDayStat {
  dateStr: string;
  wonCount: number;
  lostCount: number;
  wonAmount: number;
}

export interface HistoryCalendarProps {
  cursor: Date;
  onChangeCursor: (next: Date) => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
  stats: Record<string, CalendarDayStat>;
}

/**
 * 월간 캘린더 · 일자별 낙찰건수/낙찰금액 시각화.
 *
 * 디자인 방향:
 * - 셀 배경: slate 4단계 히트맵 (금액 강도)
 * - 요일 컬러: 헤더에만 (일/토), 셀 안 날짜는 무채색 통일
 * - 미낙찰 · "낙찰" 라벨 등 부가 정보 제거 → 카운트 + 금액만 노출
 * - 선택 강조: 다크셀 white, 라이트셀 slate-900 outline
 */
export function HistoryCalendar({
  cursor,
  onChangeCursor,
  selectedDate,
  onSelectDate,
  stats,
}: HistoryCalendarProps) {
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const monthSummary = useMemo(() => {
    let wonCount = 0;
    let lostCount = 0;
    let wonAmount = 0;
    let wonAmountMax = 0;
    for (const day of gridDays) {
      if (!isSameMonth(day, cursor)) continue;
      const key = format(day, "yyyy-MM-dd");
      const s = stats[key];
      if (!s) continue;
      wonCount += s.wonCount;
      lostCount += s.lostCount;
      wonAmount += s.wonAmount;
      if (s.wonAmount > wonAmountMax) wonAmountMax = s.wonAmount;
    }
    return { wonCount, lostCount, wonAmount, wonAmountMax };
  }, [gridDays, cursor, stats]);

  return (
    <div className="border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeCursor(subMonths(cursor, 1))}
            className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[15px] font-extrabold tabular-nums text-slate-900">
            {format(cursor, "yyyy.MM")}
          </span>
          <button
            type="button"
            onClick={() => onChangeCursor(addMonths(cursor, 1))}
            className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeCursor(new Date());
              onSelectDate(format(new Date(), "yyyy-MM-dd"));
            }}
            className="ml-1 inline-flex h-8 items-center border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
          >
            오늘
          </button>
        </div>

        <div className="flex items-center gap-5 text-[11px] tabular-nums">
          <SummaryItem
            label="낙찰"
            value={`${monthSummary.wonCount}건`}
            emphasis
          />
          <SummaryItem
            label="미낙찰"
            value={`${monthSummary.lostCount}건`}
          />
          <SummaryItem
            label="낙찰금액"
            value={
              monthSummary.wonAmount > 0
                ? formatKrw(monthSummary.wonAmount)
                : "-"
            }
            emphasis
          />
        </div>
      </header>

      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/60">
        {WEEK_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "px-2 py-2 text-center text-[11px] font-semibold tracking-wider",
              i === 0
                ? "text-rose-400"
                : i === 6
                  ? "text-sky-500"
                  : "text-slate-500",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))]">
        {gridDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const stat = stats[key];
          const inMonth = isSameMonth(day, cursor);
          const isSelected = selectedDate === key;

          const heatLevel: HeatLevel = inMonth
            ? computeHeatLevel(stat?.wonAmount ?? 0, monthSummary.wonAmountMax)
            : 0;
          const heat = HEAT_STYLE[heatLevel];
          const isDarkCell = heatLevel >= 3;
          const hasData =
            inMonth && stat && stat.wonCount > 0 && stat.wonAmount > 0;

          const dayNumberColor = !inMonth
            ? "text-slate-300"
            : isDarkCell
              ? "text-white"
              : "text-slate-800";

          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                onSelectDate(selectedDate === key ? null : key)
              }
              className={cn(
                "relative flex h-[104px] min-w-0 flex-col items-stretch overflow-hidden border-b border-r border-slate-100 px-2.5 pb-2 pt-2 text-left transition-colors",
                heat.bg,
                heat.hover,
                !inMonth && "bg-slate-50/30",
                isSelected && [
                  "z-10 outline outline-[1.5px] -outline-offset-[1.5px]",
                  isDarkCell ? "outline-white" : "outline-slate-900",
                ],
              )}
              aria-pressed={isSelected}
            >
              {/* 상단 · 날짜 번호 + today 뱃지 */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[12.5px] font-bold tabular-nums",
                    dayNumberColor,
                  )}
                >
                  {day.getDate()}
                </span>
                {isToday(day) ? (
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-wider",
                      isDarkCell ? "text-white/90" : "text-sky-600",
                    )}
                  >
                    today
                  </span>
                ) : null}
              </div>

              {/* 우하단 · 낙찰금액 (primary, 강조) + 건수 (secondary) */}
              {hasData ? (
                <div className="mt-auto flex flex-col items-end gap-1 leading-tight">
                  <span
                    className={cn(
                      "max-w-full truncate text-[14px] font-extrabold tabular-nums leading-none",
                      heat.text,
                    )}
                    title={formatKrw(stat.wonAmount)}
                  >
                    {formatKrw(stat.wonAmount)}
                  </span>
                  <span
                    className={cn(
                      "flex items-baseline gap-0.5 text-[11px] font-semibold tabular-nums leading-none",
                      heat.subText,
                    )}
                  >
                    <span>{stat.wonCount}</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isDarkCell ? "text-white/70" : "text-slate-400",
                      )}
                    >
                      건
                    </span>
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 헤더의 월 요약 지표.
 * 컬러 dot 을 제거하고 라벨:값 텍스트 만으로 간결하게 표현.
 */
function SummaryItem({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-slate-400">{label}</span>
      <span
        className={cn(
          "font-bold",
          emphasis ? "text-slate-900" : "text-slate-500",
        )}
      >
        {value}
      </span>
    </span>
  );
}
