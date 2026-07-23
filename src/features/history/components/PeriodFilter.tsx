"use client";

import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
} from "date-fns";
import { cn } from "@/lib/utils";

export interface PeriodFilterProps {
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
  onSearch?: () => void;
  className?: string;
}

type PresetKey = "year" | "thisMonth" | "lastMonth" | "thisWeek" | "lastWeek";

interface Preset {
  key: PresetKey;
  label: string;
  range: () => { start: string; end: string };
}

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * 프리셋 기간 목록 · 자주 사용하는 기간을 원클릭으로 적용.
 * 순서: 이번주 → 지난주 → 이번달 → 지난달 → 올해 (좁은 범위 → 넓은 범위)
 */
const PRESETS: Preset[] = [
  {
    key: "thisWeek",
    label: "이번주",
    range: () => {
      const now = new Date();
      return {
        start: fmt(startOfWeek(now, { weekStartsOn: 1 })),
        end: fmt(endOfWeek(now, { weekStartsOn: 1 })),
      };
    },
  },
  {
    key: "lastWeek",
    label: "지난주",
    range: () => {
      const lastWeek = subWeeks(new Date(), 1);
      return {
        start: fmt(startOfWeek(lastWeek, { weekStartsOn: 1 })),
        end: fmt(endOfWeek(lastWeek, { weekStartsOn: 1 })),
      };
    },
  },
  {
    key: "thisMonth",
    label: "이번달",
    range: () => {
      const now = new Date();
      return { start: fmt(startOfMonth(now)), end: fmt(endOfMonth(now)) };
    },
  },
  {
    key: "lastMonth",
    label: "지난달",
    range: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: fmt(startOfMonth(lastMonth)),
        end: fmt(endOfMonth(lastMonth)),
      };
    },
  },
  {
    key: "year",
    label: "올해",
    range: () => {
      const now = new Date();
      return { start: fmt(startOfYear(now)), end: fmt(endOfYear(now)) };
    },
  },
];

/** 현재 dates 가 어떤 프리셋과 일치하는지 판별 */
function detectActivePreset(
  startDate: string,
  endDate: string,
): PresetKey | null {
  for (const preset of PRESETS) {
    const { start, end } = preset.range();
    if (start === startDate && end === endDate) return preset.key;
  }
  return null;
}

/**
 * 조회 기간 필터.
 *
 * 레이아웃 · 좌→우 한 줄:
 * [조회기간 라벨] [프리셋 5개] [| 구분선] [시작일 ~ 종료일] [조회]
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

  const applyPreset = (preset: Preset) => {
    const { start, end } = preset.range();
    onChange({ startDate: start, endDate: end });
    onSearch?.();
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border border-slate-200 bg-white px-3 py-2",
        className,
      )}
    >
      <span className="text-[11px] font-semibold text-slate-500">
        조회기간
      </span>

      <div className="flex items-center gap-1">
        {PRESETS.map((p) => {
          const isActive = activePreset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              className={cn(
                "inline-flex h-7 items-center border px-2.5 text-[11px] font-semibold transition-colors",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />

      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange({ startDate: e.target.value, endDate })}
        className="h-7 border border-slate-200 bg-white px-2 text-[12px] tabular-nums text-slate-700 outline-none focus:border-sky-500"
      />
      <span className="text-[12px] text-slate-400">~</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange({ startDate, endDate: e.target.value })}
        className="h-7 border border-slate-200 bg-white px-2 text-[12px] tabular-nums text-slate-700 outline-none focus:border-sky-500"
      />
      {onSearch ? (
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex h-7 items-center bg-slate-900 px-3 text-[11px] font-bold text-white transition-colors hover:bg-slate-800"
        >
          조회
        </button>
      ) : null}
    </div>
  );
}
