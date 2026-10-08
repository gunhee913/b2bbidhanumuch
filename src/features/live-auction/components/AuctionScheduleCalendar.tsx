"use client";

import { useMemo } from "react";
import { addMonths, format, isSameMonth, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AuctionDay } from "@/features/auction-days/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 주 수가 달마다 달라져 패널 아래가 들썩이지 않도록 6주 고정 */
const WEEKS = 6;

/** 날짜 밑 글자 · 아직 안 정한 날은 아무것도 적지 않는다 */
const DAY_LABEL: Record<AuctionDay["status"], string | null> = {
  open: "개장",
  closed: "휴일",
  unset: null,
};

export interface AuctionScheduleCalendarProps {
  /** yyyy-MM-dd · 지금 보고 있는 경매일 */
  listingDate: string;
  /** 보고 있는 달의 1일 */
  anchor: Date;
  onAnchorChange: (next: Date) => void;
  /** 그 달의 일정 · 아래 일자별 표와 같은 응답을 나눠 쓴다 */
  days: AuctionDay[];
  isLoading?: boolean;
  selected: string;
  onSelect: (date: string) => void;
}

/**
 * 경매 일정 달력 · 어느 날에 장이 서는지를 한 달 단위로.
 *
 * 날짜 밑에 「개장」 · 「휴일」 을 글자로 적는다. 점과 줄로 말하면 무엇이 무엇인지 한 번
 * 배워야 읽혔다. 관리자가 아직 안 채운 날은 빈칸이다 — 「미정」 을 적어 두면 달 대부분이
 * 그 글자로 덮여 정작 개장일이 묻힌다.
 */
export function AuctionScheduleCalendar({
  listingDate,
  anchor,
  onAnchorChange,
  days,
  isLoading,
  selected,
  onSelect,
}: AuctionScheduleCalendarProps) {
  const byDate = useMemo(() => {
    const map = new Map<string, AuctionDay>();
    days.forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);

  const cells = useMemo(() => buildMonthGrid(anchor), [anchor]);

  return (
    <section className="px-2" aria-label="경매 일정">
      <header className="flex items-center justify-between px-2 pb-1">
        <MonthStepButton
          label="이전 달"
          icon={ChevronLeft}
          onClick={() => onAnchorChange(addMonths(anchor, -1))}
        />
        <span className="text-[12px] font-bold tabular-nums text-content">
          {format(anchor, "yyyy년 M월", { locale: ko })}
        </span>
        <MonthStepButton
          label="다음 달"
          icon={ChevronRight}
          onClick={() => onAnchorChange(addMonths(anchor, 1))}
        />
      </header>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            className={cn(
              "py-1 text-center text-[10px] font-semibold",
              i === 0 ? "text-rise/70" : "text-content-faint",
            )}
          >
            {w}
          </span>
        ))}

        {cells.map((day, i) => {
          if (!day) return <span key={`pad-${i}`} aria-hidden />;
          const key = format(day, "yyyy-MM-dd");
          const entry = byDate.get(key) ?? null;
          return (
            <DayCell
              key={key}
              day={day}
              entry={entry}
              isToday={key === listingDate}
              isSelected={key === selected}
              onClick={() => onSelect(key)}
            />
          );
        })}
      </div>

      {/* 자리를 늘 차지해 달을 넘길 때 아래 내용이 위아래로 튀지 않게 한다 */}
      <p className="h-4 px-2 text-[10px] font-medium text-content-faint">
        {isLoading ? "일정 불러오는 중" : null}
      </p>
    </section>
  );
}

function MonthStepButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof ChevronLeft;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-content-faint transition-colors hover:bg-surface-accent hover:text-content"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * 날짜 한 칸 · 숫자 밑에 개장/휴일 한 마디.
 *
 * 두수는 적지 않는다 — 칸 폭이 40px 남짓이라 글자와 숫자가 한 칸에서 다툰다. 그날
 * 몇 두가 나오는지는 달력 밑 상장두수 표가 말한다. 휴일 사유는 올렸을 때 뜬다.
 */
function DayCell({
  day,
  entry,
  isToday,
  isSelected,
  onClick,
}: {
  day: Date;
  entry: AuctionDay | null;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = entry?.status ?? "unset";
  const label = DAY_LABEL[status];
  const isOpen = status === "open";
  const isClosed = status === "closed";
  const isSunday = day.getDay() === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected}
      aria-label={label ? `${day.getDate()}일 ${label}` : `${day.getDate()}일`}
      title={entry?.note ?? undefined}
      className="group flex h-[38px] flex-col items-center justify-center gap-0.5"
    >
      <span
        className={cn(
          "inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11.5px] tabular-nums transition-colors",
          isSelected
            ? "bg-inverse font-bold text-inverse-content"
            : cn(
                "group-hover:bg-surface-accent",
                isToday && "ring-1 ring-inset ring-content-faint",
                isOpen
                  ? "font-bold text-content"
                  : isClosed
                    ? "font-medium text-content-ghost"
                    : isSunday
                      ? "font-medium text-rise/60"
                      : "font-medium text-content-faint",
              ),
        )}
      >
        {day.getDate()}
      </span>
      <span
        aria-hidden
        className={cn(
          "h-3 text-[10px] font-semibold leading-3",
          isOpen ? "text-content-mid" : "text-rise/70",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function startOfMonthOf(iso: string): Date {
  const d = parse(iso, "yyyy-MM-dd", new Date());
  const base = Number.isNaN(d.getTime()) ? new Date() : d;
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

/** 앞뒤 빈 칸을 `null` 로 채운 6주 그리드 · 다른 달 날짜는 그리지 않는다 */
export function buildMonthGrid(anchor: Date): (Date | null)[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const pad = first.getDay();
  return Array.from({ length: WEEKS * 7 }, (_, i) => {
    const day = new Date(anchor.getFullYear(), anchor.getMonth(), i - pad + 1);
    return isSameMonth(day, anchor) ? day : null;
  });
}
