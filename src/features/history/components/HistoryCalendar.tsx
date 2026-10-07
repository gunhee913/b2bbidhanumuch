"use client";

import { useMemo, type CSSProperties, type Ref } from "react";
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
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { computeHeatLevel, HEAT_STYLE, type HeatLevel } from "../lib/heatLevel";

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
const hasParticipation = (
  stat: CalendarDayStat | undefined,
): stat is CalendarDayStat =>
  !!stat && stat.wonCount + stat.lostCount + stat.activeCount > 0;

export interface HistoryCalendarProps {
  cursor: Date;
  onChangeCursor: (next: Date) => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  stats: Record<string, CalendarDayStat>;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 월간 캘린더 · 일자별 낙찰건수/낙찰금액 시각화.
 *
 * 디자인 방향:
 * - 셀 배경: `inverse` 투명도 다섯 단계 히트맵 (금액 강도)
 * - 요일 구분: 색이 아니라 밝기로 · 토·일은 한 단계 흐리게 (장이 안 서는 날)
 * - 미낙찰 · "낙찰" 라벨 등 부가 정보 제거 → 카운트 + 금액만 노출
 * - 선택 강조: 짙은 셀은 `inverse-content`, 옅은 셀은 `content` 테두리
 * - 셀 안에는 만 단위 금액만 · 건수·미낙찰·진행중·회차 상세는 hover 카드(`DayHoverCard`)
 *
 * 표 머리줄의 날짜 단추가 펼친다 (`HistoryDatePicker`). 왼쪽 열에 한 행으로 박혀
 * 있던 것을 거기로 옮겼다 — 날짜는 고르고 나면 더 볼 일이 없는데 늘 자리를 깔고
 * 앉아 있었다.
 *
 * 높이는 칸 바닥(44px)이 정한다. 다섯 줄인 달은 다섯 줄만큼만 서고 여섯 줄인 달은
 * 한 줄 더 선다 — 펼친 자리라 남는 세로를 나눠 가질 바깥이 없다.
 */
export function HistoryCalendar({
  cursor,
  onChangeCursor,
  selectedDate,
  onSelectDate,
  stats,
  className,
  style,
  ref,
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

  /** 이 달이 몇 줄인가 · 다섯 줄인 달에서 여섯 줄짜리 자리를 잡으면 아래가 빈다 */
  const weekCount = gridDays.length / 7;

  return (
    <div
      ref={ref}
      style={style}
      className={cn("flex flex-col", SURFACE_SHELL_CLASS, className)}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
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
            className="ml-1 inline-flex h-8 items-center border border-line bg-surface px-3 text-[11px] font-bold text-content-mid transition-colors hover:border-content-ghost hover:bg-surface-muted hover:text-content"
          >
            오늘
          </button>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-[repeat(7,minmax(0,1fr))] border-b border-line bg-surface-muted">
        {WEEK_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "px-2 py-2 text-center text-[11px] font-semibold tracking-wider",
              /*
               * 토·일을 빨강·파랑으로 칠하지 않는다. 이 화면에서 그 두 색은 이미
               * 미낙찰·낙찰이라 머리줄에까지 쓰면 요일이 결과처럼 읽힌다.
               * 주말은 한 단계 흐리게만 둔다 — 어차피 장이 안 서는 날이다.
               */
              i === 0 || i === 6 ? "text-content-faint" : "text-content-soft",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 줄 수를 박아 두지 않으면 다섯 줄인 달에서 여섯째 줄 자리가 빈다 */}
      <div
        className="grid min-h-0 flex-1 grid-cols-[repeat(7,minmax(0,1fr))]"
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {gridDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const stat = stats[key];
          const inMonth = isSameMonth(day, cursor);
          const isSelected = selectedDate === key;

          const heatLevel: HeatLevel = inMonth
            ? computeHeatLevel(stat?.wonAmount ?? 0, wonAmountMax)
            : 0;
          const heat = HEAT_STYLE[heatLevel];
          const hasData =
            inMonth && stat && stat.wonCount > 0 && stat.wonAmount > 0;

          const dayNumberColor = inMonth
            ? "text-content"
            : "text-content-ghost";

          const cell = (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={cn(
                /* 날짜 한 줄 + 금액 한 줄이 여유 있게 들어가는 바닥 */
                "relative flex min-h-[44px] min-w-0 flex-col items-stretch overflow-hidden border-b border-r border-line-soft px-1.5 pb-1 pt-1 text-left transition-colors",
                heat.bg,
                heat.hover,
                !inMonth && "bg-surface-muted",
                isSelected &&
                  "z-10 outline outline-[1.5px] -outline-offset-[1.5px] outline-content",
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
                    className="h-1.5 w-1.5 rounded-full bg-focus"
                    aria-label="오늘"
                  />
                ) : null}
              </div>

              {/* 우하단 · 낙찰금액만 · 건수 등 상세는 hover 카드 */}
              {hasData ? (
                <span className="mt-auto self-end whitespace-nowrap text-[11px] font-extrabold leading-none tabular-nums -tracking-[0.02em] text-content">
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
                className={cn(
                  SURFACE_SHELL_CLASS,
                  "p-0 text-content shadow-xl",
                )}
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
        <HoverStat label="낙찰" value={`${stat.wonCount}건`} dot="bg-won" />
        <HoverStat label="미낙찰" value={`${stat.lostCount}건`} dot="bg-lost" />
        {stat.activeCount > 0 ? (
          <HoverStat
            label="진행중"
            value={`${stat.activeCount}건`}
            dot="bg-inverse"
          />
        ) : null}
      </dl>

      {stat.wonAmount > 0 ? (
        <div className="mt-2 flex items-baseline justify-between border-t border-line-soft pt-2">
          <span className="text-[10.5px] font-medium text-content-faint">
            낙찰금액
          </span>
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
