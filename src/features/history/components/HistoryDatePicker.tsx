"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HistoryCalendar, type CalendarDayStat } from "./HistoryCalendar";

const STEP_BUTTON_CLASS =
  "inline-flex h-7 w-6 shrink-0 items-center justify-center text-content-faint transition-colors hover:text-content disabled:cursor-not-allowed disabled:opacity-30";

export interface HistoryDatePickerProps {
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  /** 하루 앞뒤로 · 방향키(`useHistoryKeys`)와 같은 길을 쓴다 */
  onStepDate: (days: number) => void;
  cursor: Date;
  onChangeCursor: (next: Date) => void;
  /** 일자별 낙찰건수·금액 · 펼친 달력의 히트맵이 쓴다 */
  stats: Record<string, CalendarDayStat>;
  className?: string;
}

/**
 * 표 머리줄의 일자 조회 · `‹ 2026.10.02 (금) ›` 와 펼치는 달력.
 *
 * 달력은 왼쪽 열에 한 행으로 박혀 있었다. 날짜는 **고르고 나면 더 볼 일이 없는데**
 * 늘 400px 가까이 깔고 앉아, 정작 오래 들여다볼 사진과 개체정보가 그만큼 좁았다.
 * 셋을 쌓으니 어느 것도 제 크기를 못 가졌다.
 *
 * 그래서 쓸 때만 펼친다. 하루씩 넘기는 건 화살표로 — 그게 가장 잦은 손놀림이고
 * 달력을 열 까닭이 없다. 달을 건너뛰거나 「많이 먹은 날」 을 찾는 건 달력을 펴야
 * 하는 일이라 거기 그대로 둔다 (히트맵·hover 카드 모두 살아 있다). 화살표가 하는
 * 일은 ←→ 방향키도 그대로 한다 (`useHistoryKeys`).
 *
 * 세 화면(경매결과·입찰내역·상장표)이 이 하나를 같이 쓴다. 같은 날을 보는 세 각도라
 * 날짜를 고르는 자리가 화면마다 다르면 넘어갈 때마다 눈이 다시 자리를 잡는다.
 */
export function HistoryDatePicker({
  selectedDate,
  onSelectDate,
  onStepDate,
  cursor,
  onChangeCursor,
  stats,
  className,
}: HistoryDatePickerProps) {
  const [open, setOpen] = useState(false);

  const label = selectedDate
    ? format(new Date(selectedDate), "yyyy.MM.dd (EEE)", { locale: ko })
    : "일자 선택";

  return (
    <span className={cn("flex items-center", className)}>
      <button
        type="button"
        onClick={() => onStepDate(-1)}
        disabled={!selectedDate}
        className={STEP_BUTTON_CLASS}
        aria-label="하루 전"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-extrabold tabular-nums text-content transition-colors hover:bg-surface-muted data-[state=open]:bg-surface-muted"
            aria-label="일자 선택"
          >
            <CalendarDays
              className="h-3.5 w-3.5 text-content-faint"
              aria-hidden
            />
            {label}
          </button>
        </PopoverTrigger>
        {/*
         * 달력이 제 테두리와 바탕을 그리므로(`SURFACE_SHELL_CLASS`) 팝오버 기본
         * 껍데기는 벗긴다 — 그대로 두면 테두리가 두 겹으로 겹친다.
         */}
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-auto border-0 bg-transparent p-0 shadow-none"
        >
          <HistoryCalendar
            cursor={cursor}
            onChangeCursor={onChangeCursor}
            selectedDate={selectedDate}
            onSelectDate={(dateStr) => {
              onSelectDate(dateStr);
              setOpen(false);
            }}
            stats={stats}
            className="w-[344px] shadow-xl"
          />
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => onStepDate(1)}
        disabled={!selectedDate}
        className={STEP_BUTTON_CLASS}
        aria-label="하루 뒤"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </span>
  );
}
