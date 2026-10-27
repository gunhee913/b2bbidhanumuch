import { format, startOfMonth, subDays } from 'date-fns';

export interface DateRange {
  start: string;
  end: string;
}

export type PeriodPreset = 'today' | 'week' | 'month' | 'thisMonth';

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '최근 7일' },
  { value: 'month', label: '최근 30일' },
  { value: 'thisMonth', label: '이번 달' },
];

export const DEFAULT_PRESET: PeriodPreset = 'week';

const toIso = (date: Date) => format(date, 'yyyy-MM-dd');

export const rangeForPreset = (preset: PeriodPreset, today = new Date()): DateRange => {
  const end = toIso(today);
  switch (preset) {
    case 'today':
      return { start: end, end };
    case 'week':
      return { start: toIso(subDays(today, 6)), end };
    case 'month':
      return { start: toIso(subDays(today, 29)), end };
    case 'thisMonth':
      return { start: toIso(startOfMonth(today)), end };
  }
};

/** 입력한 기간과 똑같은 프리셋이 있으면 그 값 · 없으면 null (직접 입력한 기간) */
export const presetForRange = (range: DateRange, today = new Date()): PeriodPreset | null =>
  PERIOD_PRESETS.find(({ value }) => {
    const candidate = rangeForPreset(value, today);
    return candidate.start === range.start && candidate.end === range.end;
  })?.value ?? null;

export const isValidRange = ({ start, end }: DateRange) => Boolean(start) && Boolean(end) && start <= end;
