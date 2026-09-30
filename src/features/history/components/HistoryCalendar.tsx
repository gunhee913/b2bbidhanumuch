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
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const KRW_FORMATTER = new Intl.NumberFormat("ko-KR");
const formatKrw = (value: number) => `${KRW_FORMATTER.format(value)}원`;

/**
 * 셀용 축약 금액 · 1만 이상은 만 단위 반올림 (`16,773,418` → `1,677만`).
 * 좌측 400px 레일의 57px 셀에 들어가야 하므로 5~6자로 제한 · 풀 금액은 title 툴팁.
 */
const formatCompactKrw = (value: number) =>
  value >= 10_000
    ? `${KRW_FORMATTER.format(Math.round(value / 10_000))}만`
    : KRW_FORMATTER.format(value);

/**
 * 낙찰금액 강도 히트맵 · 4단계 slate 톤.
 * 배경 강도가 올라갈수록 텍스트는 dark → light 로 전환하여 대비 확보.
 */
type HeatLevel = 0 | 1 | 2 | 3 | 4;

const HEAT_STYLE: Record<
  HeatLevel,
  { bg: string; hover: string; text: string }
> = {
  0: {
    bg: "bg-surface",
    hover: "hover:bg-surface-muted",
    text: "text-content",
  },
  1: {
    bg: "bg-surface-accent",
    hover: "hover:bg-surface-strong",
    text: "text-content",
  },
  2: {
    bg: "bg-slate-300",
    hover: "hover:bg-slate-400",
    text: "text-content",
  },
  3: {
    bg: "bg-slate-500",
    hover: "hover:bg-slate-600",
    text: "text-white",
  },
  4: {
    bg: "bg-inverse",
    hover: "hover:bg-inverse",
    text: "text-white",
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
  /** 진행중 입찰 수 · 오늘만 0 이 아닐 수 있다 */
  activeCount: number;
  /** 그날 참여한 회차 수 */
  roundCount: number;
}

/** 셀 hover 카드를 띄울지 · 낙찰/미낙찰/진행중 중 하나라도 있으면 참여한 날 */
const hasParticipation = (stat: CalendarDayStat | undefined): stat is CalendarDayStat =>
  !!stat && stat.wonCount + stat.lostCount + stat.activeCount > 0;

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
 * - 좌측 400px 레일용 미니 캘린더 · 셀 52px · 셀 안에는 만 단위 금액만
 * - 건수·미낙찰·진행중·회차 등 상세는 hover 카드(`DayHoverCard`)로
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

  /** 히트맵 기준값 · 이 달 최대 일별 낙찰금액 */
  const wonAmountMax = useMemo(() => {
    let max = 0;
    for (const day of gridDays) {
      if (!isSameMonth(day, cursor)) continue;
      const s = stats[format(day, "yyyy-MM-dd")];
      if (s && s.wonAmount > max) max = s.wonAmount;
    }
    return max;
  }, [gridDays, cursor, stats]);

  return (
    <div className="border border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeCursor(subMonths(cursor, 1))}
            className="inline-flex h-8 w-8 items-center justify-center border border-line bg-surface text-content-soft transition-colors hover:border-line hover:text-content"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[64px] text-center text-[14px] font-extrabold tabular-nums text-content">
            {format(cursor, "yyyy.MM")}
          </span>
          <button
            type="button"
            onClick={() => onChangeCursor(addMonths(cursor, 1))}
            className="inline-flex h-8 w-8 items-center justify-center border border-line bg-surface text-content-soft transition-colors hover:border-line hover:text-content"
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
            className="ml-1 inline-flex h-8 items-center border border-line bg-surface px-3 text-[11px] font-bold text-content-mid transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
          >
            오늘
          </button>
        </div>
      </header>

      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] border-b border-line bg-slate-50/60">
        {WEEK_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "px-2 py-2 text-center text-[11px] font-semibold tracking-wider",
              i === 0
                ? "text-rose-400"
                : i === 6
                  ? "text-sky-500"
                  : "text-content-soft",
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
            ? computeHeatLevel(stat?.wonAmount ?? 0, wonAmountMax)
            : 0;
          const heat = HEAT_STYLE[heatLevel];
          const isDarkCell = heatLevel >= 3;
          const hasData =
            inMonth && stat && stat.wonCount > 0 && stat.wonAmount > 0;

          const dayNumberColor = !inMonth
            ? "text-content-ghost"
            : isDarkCell
              ? "text-white"
              : "text-content";

          const cell = (
            <button
              key={key}
              type="button"
              onClick={() =>
                onSelectDate(selectedDate === key ? null : key)
              }
              className={cn(
                "relative flex h-[52px] min-w-0 flex-col items-stretch overflow-hidden border-b border-r border-line-soft px-1.5 pb-1 pt-1 text-left transition-colors",
                heat.bg,
                heat.hover,
                !inMonth && "bg-slate-50/30",
                isSelected && [
                  "z-10 outline outline-[1.5px] -outline-offset-[1.5px]",
                  isDarkCell ? "outline-white" : "outline-slate-900",
                ],
              )}
              aria-pressed={isSelected}
              aria-label={
                hasData
                  ? `${format(day, "M월 d일")} · 낙찰 ${stat.wonCount}건 · ${formatKrw(stat.wonAmount)}`
                  : format(day, "M월 d일")
              }
            >
              {/* 상단 · 날짜 번호 + today 뱃지 */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11.5px] font-bold tabular-nums leading-none",
                    dayNumberColor,
                  )}
                >
                  {day.getDate()}
                </span>
                {isToday(day) ? (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isDarkCell ? "bg-surface" : "bg-sky-500",
                    )}
                    aria-label="오늘"
                  />
                ) : null}
              </div>

              {/* 우하단 · 낙찰금액만 · 건수 등 상세는 hover 카드 */}
              {hasData ? (
                <span
                  className={cn(
                    "mt-auto self-end whitespace-nowrap text-[11px] font-extrabold tabular-nums leading-none -tracking-[0.02em]",
                    heat.text,
                  )}
                >
                  {formatCompactKrw(stat.wonAmount)}
                </span>
              ) : null}
            </button>
          );

          if (!inMonth || !hasParticipation(stat)) return cell;

          return (
            <Tooltip key={key} delayDuration={150}>
              <TooltipTrigger asChild>{cell}</TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="rounded-md border border-line bg-surface p-0 text-content shadow-xl"
              >
                <DayHoverCard day={day} stat={stat} />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 셀 hover 카드 · `9.17 (목)` / 낙찰 · 미낙찰 · 진행중 · 회차 / 낙찰금액 풀 숫자.
 * 셀에서 뺀 건수 정보를 여기서 전부 보여준다.
 */
function DayHoverCard({ day, stat }: { day: Date; stat: CalendarDayStat }) {
  return (
    <div className="min-w-[168px] px-3 py-2.5 text-left -tracking-[0.01em]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-extrabold tabular-nums text-content">
          {format(day, "M.d (EEE)", { locale: ko })}
        </span>
        {stat.roundCount > 0 ? (
          <span className="text-[10.5px] font-medium tabular-nums text-content-faint">
            {stat.roundCount}회차
          </span>
        ) : null}
      </div>

      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11.5px] tabular-nums">
        <HoverStat label="낙찰" value={`${stat.wonCount}건`} dot="bg-sky-500" />
        <HoverStat label="미낙찰" value={`${stat.lostCount}건`} dot="bg-rose-300" />
        {stat.activeCount > 0 ? (
          <HoverStat label="진행중" value={`${stat.activeCount}건`} dot="bg-inverse" />
        ) : null}
      </dl>

      {stat.wonAmount > 0 ? (
        <div className="mt-2 flex items-baseline justify-between border-t border-line-soft pt-2">
          <span className="text-[10.5px] font-medium text-content-faint">낙찰금액</span>
          <span className="text-[12.5px] font-extrabold tabular-nums text-content">
            {formatKrw(stat.wonAmount)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function HoverStat({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot: string;
}) {
  return (
    <>
      <dt className="flex items-center gap-1.5 font-medium text-content-soft">
        <span className={cn("h-1.5 w-1.5 shrink-0", dot)} aria-hidden />
        {label}
      </dt>
      <dd className="text-right font-bold text-content">{value}</dd>
    </>
  );
}
