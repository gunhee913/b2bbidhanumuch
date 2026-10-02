"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import {
  detectActivePreset,
  formatPeriodLabel,
  PERIOD_PRESETS,
} from "@/features/history/lib/periodPresets";

export interface PeriodRangePickerProps {
  /** 손에 쥔 기간 · 아직 조회하지 않았을 수 있다 */
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
  onSearch: () => void;
  className?: string;
}

const DATE_INPUT_CLASS =
  "h-7 min-w-0 flex-1 border border-line bg-surface px-2 text-[12px] tabular-nums text-content-mid outline-none focus:border-focus";

/**
 * 표 머리에 접어 둔 조회기간 · 쓸 때만 펼친다.
 *
 * 전에는 페이지 맨 위에 한 줄짜리 띠로 서 있었다. 그 자리에서는 아래 두 판 **모두**
 * 를 거느리는 것으로 읽히는데, 실제로 이 기간이 정하는 건 왼쪽 표뿐이다 — 오른쪽
 * 차트는 제 기간 토글(1M·3M·6M·1Y·전체)로 몇 달 치 흐름을 그린다. 「전일」 을
 * 눌렀는데 차트가 반 년을 그대로 그리고 있으면 둘 중 하나는 거짓말로 보인다.
 *
 * 그래서 거느리는 판 안으로 들여놓았다. 자리가 좁아 띠를 그대로 옮길 수는 없는데,
 * 기간은 **고르고 나면 다시 볼 일이 적은 값**이라 접어 두기 알맞다 (경매내역 일자
 * 고르개와 같은 셈 · `HistoryDatePicker`). 단추에는 지금 기간을 늘 적어 둔다.
 */
export function PeriodRangePicker({
  startDate,
  endDate,
  onChange,
  onSearch,
  className,
}: PeriodRangePickerProps) {
  const [open, setOpen] = useState(false);
  const activePreset = detectActivePreset(startDate, endDate);

  const applyPreset = (key: string) => {
    const preset = PERIOD_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const { start, end } = preset.range();
    onChange({ startDate: start, endDate: end });
    onSearch();
    setOpen(false);
  };

  const search = () => {
    onSearch();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="조회기간"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[12px] font-semibold tabular-nums text-content-mid transition-colors hover:bg-surface-muted data-[state=open]:bg-surface-muted",
            className,
          )}
        >
          <CalendarDays
            className="h-3.5 w-3.5 text-content-faint"
            aria-hidden
          />
          {formatPeriodLabel(startDate, endDate)}
        </button>
      </PopoverTrigger>

      {/* 쪽지가 제 테두리를 그리므로 팝오버 기본 껍데기는 벗긴다 (두 겹이 된다) */}
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <div
          className={cn(
            "flex w-[272px] flex-col gap-2 p-2 shadow-xl",
            SURFACE_SHELL_CLASS,
          )}
        >
          {/*
           * 프리셋은 네 칸 × 두 줄 · 좁은 쪽지에서는 한 줄로 늘어놓는 것보다
           * 격자가 낫다. 눌러야 할 칸의 자리가 늘 같아 손이 외운다.
           */}
          <div className="grid grid-cols-4 gap-1">
            {PERIOD_PRESETS.map((preset) => {
              const active = activePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPreset(preset.key)}
                  className={cn(
                    "inline-flex h-7 items-center justify-center rounded-[5px] border text-[11px] font-semibold transition-colors",
                    active
                      ? "border-inverse bg-inverse text-inverse-content"
                      : "border-line bg-surface text-content-mid hover:border-content-ghost hover:text-content",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={startDate}
              aria-label="시작일"
              onChange={(e) => onChange({ startDate: e.target.value, endDate })}
              className={DATE_INPUT_CLASS}
            />
            <span className="shrink-0 text-[12px] text-content-faint">~</span>
            <input
              type="date"
              value={endDate}
              aria-label="종료일"
              onChange={(e) => onChange({ startDate, endDate: e.target.value })}
              className={DATE_INPUT_CLASS}
            />
          </div>

          {/*
           * 프리셋은 누르는 즉시 조회하지만 날짜를 직접 고친 것은 이 단추로 못 박는다 —
           * 연·월·일을 한 칸씩 고치는 동안 표가 세 번 다시 그려지지 않게.
           */}
          <button
            type="button"
            onClick={search}
            className="inline-flex h-7 items-center justify-center bg-inverse text-[11px] font-bold text-inverse-content transition-opacity hover:opacity-90"
          >
            조회
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
