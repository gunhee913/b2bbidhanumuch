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
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import {
  computeHeatLevel,
  HEAT_STYLE,
  type HeatLevel,
} from "@/features/history/lib/heatLevel";
import { formatWon } from "@/features/live-auction/lib/masking";
import type { DayStat } from "../lib/dailyStats";

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export interface StatsCalendarProps {
  cursor: Date;
  onChangeCursor: (next: Date) => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  stats: Record<string, DayStat>;
}

/**
 * 경매통계 캘린더 · 한 달을 깔고 칸마다 낙찰건수와 낙찰금액을 적는다.
 *
 * 경매내역 쪽 캘린더(`HistoryCalendar`)와 색 사다리는 같이 쓰되(`heatLevel`) 칸은
 * 따로 짠다. 저쪽은 400px 레일에 들어가느라 칸이 44px 이라 금액 하나만 겨우 적고
 * 건수는 손을 올려야 나오는데, 여기는 한 열을 통째로 쓰는 1100px 라 칸이 150px 쯤
 * 된다 — 건수를 숨길 까닭이 없다.
 *
 * 칸을 누르면 아래 도넛이 그날로 갈린다. 그래서 「고른 날」 이 늘 하나 있어야 하고,
 * 처음 열 때는 가장 최근에 딴 날이 잡혀 있다 (`latestDateWith`).
 */
export function StatsCalendar({
  cursor,
  onChangeCursor,
  selectedDate,
  onSelectDate,
  stats,
}: StatsCalendarProps) {
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  /** 히트맵 기준 · 이 달의 최대 일별 낙찰금액 (달이 바뀌면 다시 잡힌다) */
  const monthMax = useMemo(() => {
    let max = 0;
    for (const day of gridDays) {
      if (!isSameMonth(day, cursor)) continue;
      const s = stats[format(day, "yyyy-MM-dd")];
      if (s && s.wonAmount > max) max = s.wonAmount;
    }
    return max;
  }, [gridDays, cursor, stats]);

  /** 이 달 합계 · 머리 오른쪽에 적는다 (칸을 다 더해 볼 일을 줄인다) */
  const monthTotal = useMemo(() => {
    let count = 0;
    let amount = 0;
    for (const day of gridDays) {
      if (!isSameMonth(day, cursor)) continue;
      const s = stats[format(day, "yyyy-MM-dd")];
      if (!s) continue;
      count += s.wonCount;
      amount += s.wonAmount;
    }
    return { count, amount };
  }, [gridDays, cursor, stats]);

  const weekCount = gridDays.length / 7;

  return (
    <section className={cn("flex flex-col", SURFACE_SHELL_CLASS)}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-1.5">
          <MonthNavButton
            label="이전 달"
            onClick={() => onChangeCursor(subMonths(cursor, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </MonthNavButton>
          <span className="min-w-[72px] text-center text-[14px] font-extrabold tabular-nums text-content">
            {format(cursor, "yyyy.MM")}
          </span>
          <MonthNavButton
            label="다음 달"
            onClick={() => onChangeCursor(addMonths(cursor, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </MonthNavButton>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              onChangeCursor(today);
              onSelectDate(format(today, "yyyy-MM-dd"));
            }}
            className="ml-1 inline-flex h-7 items-center border border-line bg-surface px-2.5 text-[11px] font-bold text-content-mid transition-colors hover:bg-surface-muted hover:text-content"
          >
            오늘
          </button>
        </div>

        <span className="text-[11.5px] tabular-nums text-content-faint">
          이 달 낙찰{" "}
          <span className="font-bold text-content">{monthTotal.count}건</span>
          {monthTotal.amount > 0 ? (
            <>
              {" · "}
              <span className="font-bold text-content">
                {formatWon(monthTotal.amount)}
              </span>
            </>
          ) : null}
        </span>
      </header>

      <div className="grid shrink-0 grid-cols-[repeat(7,minmax(0,1fr))] border-b border-line bg-surface-muted">
        {WEEK_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "px-2 py-1.5 text-center text-[11px] font-semibold tracking-wider",
              /* 주말은 색이 아니라 밝기로만 가른다 · 장이 안 서는 날이다 */
              i === 0 || i === 6 ? "text-content-faint" : "text-content-soft",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 줄 수를 박아 두지 않으면 다섯 줄인 달에서 여섯째 줄 자리가 빈다 */}
      <div
        className="grid grid-cols-[repeat(7,minmax(0,1fr))]"
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {gridDays.map((day) => (
          <DayCell
            key={format(day, "yyyy-MM-dd")}
            day={day}
            stat={stats[format(day, "yyyy-MM-dd")]}
            inMonth={isSameMonth(day, cursor)}
            monthMax={monthMax}
            selected={selectedDate === format(day, "yyyy-MM-dd")}
            onSelect={onSelectDate}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * 칸 하나 · 위에 날짜, 아래에 건수와 금액.
 *
 * 건수는 왼쪽에 흐리게, 금액은 오른쪽에 굵게. 둘을 같은 무게로 적으면 어느 쪽을
 * 먼저 읽을지 눈이 매번 고르게 되는데, 달을 훑을 때 집는 것은 거의 늘 금액이다.
 */
function DayCell({
  day,
  stat,
  inMonth,
  monthMax,
  selected,
  onSelect,
}: {
  day: Date;
  stat: DayStat | undefined;
  inMonth: boolean;
  monthMax: number;
  selected: boolean;
  onSelect: (dateStr: string) => void;
}) {
  const key = format(day, "yyyy-MM-dd");
  const heatLevel: HeatLevel = inMonth
    ? computeHeatLevel(stat?.wonAmount ?? 0, monthMax)
    : 0;
  const heat = HEAT_STYLE[heatLevel];
  const participated = inMonth && !!stat && stat.wonCount + stat.lostCount > 0;
  const hasWin = inMonth && !!stat && stat.wonCount > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(key)}
      aria-pressed={selected}
      aria-label={
        hasWin
          ? `${format(day, "M월 d일")} · 낙찰 ${stat!.wonCount}건 · ${formatWon(stat!.wonAmount)}`
          : format(day, "M월 d일")
      }
      title={
        participated
          ? `${format(day, "M.d")} · 낙찰 ${stat!.wonCount}건 · 미낙찰 ${stat!.lostCount}건${
              stat!.wonAmount > 0 ? ` · ${formatWon(stat!.wonAmount)}` : ""
            }`
          : undefined
      }
      className={cn(
        /* 날짜 한 줄 + 건수·금액 한 줄 · 1100px 에서 칸은 150px 쯤 된다 */
        "relative flex min-h-[62px] min-w-0 flex-col items-stretch gap-1 overflow-hidden border-b border-r border-line-soft px-2 pb-1.5 pt-1.5 text-left transition-colors",
        heat.bg,
        heat.hover,
        !inMonth && "bg-surface-muted",
        selected &&
          "z-10 outline outline-[1.5px] -outline-offset-[1.5px] outline-content",
      )}
    >
      <span className="flex items-center justify-between">
        <span
          className={cn(
            "text-[11.5px] font-bold tabular-nums leading-none",
            inMonth ? "text-content" : "text-content-ghost",
          )}
        >
          {day.getDate()}
        </span>
        {isToday(day) ? (
          <span
            className="h-1.5 w-1.5 rounded-full bg-focus"
            aria-label="오늘"
          />
        ) : null}
      </span>

      {hasWin ? (
        <span className="mt-auto flex items-baseline justify-between gap-1">
          <span className="shrink-0 text-[10.5px] font-medium tabular-nums leading-none text-content-soft">
            {stat!.wonCount}건
          </span>
          {/*
           * 원단위를 그대로 적는다. 한 열이 1100px 에 묶여 있어 칸 안쪽이 140px 인데,
           * 아홉 자리(`123,456,789원`)라도 84px 이라 건수와 나란히 서고도 남는다.
           * 만 단위로 줄이면 1,677만과 1,677.4만 이 같은 글자가 되어, 날끼리 견줄 때
           * 끝자리가 사라진 쪽을 보고 「같다」 고 읽게 된다.
           */}
          <span className="truncate text-[11.5px] font-extrabold tabular-nums leading-none -tracking-[0.02em] text-content">
            {formatWon(stat!.wonAmount)}
          </span>
        </span>
      ) : participated ? (
        /* 입찰은 했는데 하나도 못 딴 날 · 빈 칸과 갈라 둬야 「안 나간 날」 과 안 섞인다 */
        <span className="mt-auto text-[10.5px] font-medium tabular-nums leading-none text-content-faint">
          미낙찰 {stat!.lostCount}건
        </span>
      ) : null}
    </button>
  );
}

function MonthNavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center border border-line bg-surface text-content-soft transition-colors hover:bg-surface-muted hover:text-content"
    >
      {children}
    </button>
  );
}
