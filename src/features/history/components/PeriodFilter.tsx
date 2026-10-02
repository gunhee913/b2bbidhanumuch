"use client";

import { cn } from "@/lib/utils";
import {
  detectActivePreset,
  PERIOD_PRESETS,
  type PeriodPreset,
} from "../lib/periodPresets";

export interface PeriodFilterProps {
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
  onSearch?: () => void;
  className?: string;
}

/**
 * 조회 기간 필터.
 *
 * 레이아웃 · 좌→우 한 줄:
 * [조회기간 라벨] [프리셋] [| 구분선] [시작일 ~ 종료일] [조회]
 *
 * - 프리셋 클릭 시 자동으로 dates 갱신 + onSearch 트리거
 * - 직접 date 를 수정한 경우에만 [조회] 버튼으로 명시적 조회
 */
export function PeriodFilter({
  startDate,
  endDate,
  onChange,
  onSearch,
  className,
}: PeriodFilterProps) {
  const activePreset = detectActivePreset(startDate, endDate);

  const applyPreset = (preset: PeriodPreset) => {
    const { start, end } = preset.range();
    onChange({ startDate: start, endDate: end });
    onSearch?.();
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border border-line bg-surface px-3 py-2",
        className,
      )}
    >
      <span className="text-[11px] font-semibold text-content-soft">
        조회기간
      </span>

      <div className="flex items-center gap-1">
        {PERIOD_PRESETS.map((p) => {
          const isActive = activePreset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              className={cn(
                "inline-flex h-7 items-center border px-2.5 text-[11px] font-semibold transition-colors",
                isActive
                  ? "border-inverse bg-inverse text-inverse-content"
                  : "border-line bg-surface text-content-mid hover:border-content-ghost hover:text-content",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <span className="mx-1 h-4 w-px bg-surface-strong" aria-hidden />

      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange({ startDate: e.target.value, endDate })}
        className="h-7 border border-line bg-surface px-2 text-[12px] tabular-nums text-content-mid outline-none focus:border-focus"
      />
      <span className="text-[12px] text-content-faint">~</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange({ startDate, endDate: e.target.value })}
        className="h-7 border border-line bg-surface px-2 text-[12px] tabular-nums text-content-mid outline-none focus:border-focus"
      />
      {onSearch ? (
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex h-7 items-center bg-inverse px-3 text-[11px] font-bold text-inverse-content transition-opacity hover:opacity-90"
        >
          조회
        </button>
      ) : null}
    </div>
  );
}
