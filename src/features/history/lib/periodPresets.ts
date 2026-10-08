import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type PeriodPresetKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "year";

export interface PeriodPreset {
  key: PeriodPresetKey;
  label: string;
  range: () => { start: string; end: string };
}

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * 자주 쓰는 기간 · 좁은 쪽에서 넓은 쪽으로.
 *
 * 오늘 → 전일 → 이번주 → 지난주 → 이번달 → 지난달 → 올해. 아침에 어제치 뒷정리를
 * 먼저 하는 날이 많아 「전일」 이 「오늘」 바로 옆에 선다 — 그래야 손이 간다.
 *
 * 고르개 컴포넌트 바깥에 둔 건 같은 목록을 두 군데가 쓰기 때문이다. 경매내역·
 * 배송지시는 한 줄짜리 띠(`PeriodFilter`)로, 시세·통계의 시세 표는 머리에 접어 둔
 * 쪽지(`PeriodRangePicker`)로 보인다. 생김새는 달라도 고를 수 있는 기간은 하나다.
 */
export const PERIOD_PRESETS: readonly PeriodPreset[] = [
  {
    key: "today",
    label: "오늘",
    range: () => {
      const today = fmt(new Date());
      return { start: today, end: today };
    },
  },
  {
    key: "yesterday",
    label: "전일",
    range: () => {
      const day = fmt(subDays(new Date(), 1));
      return { start: day, end: day };
    },
  },
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

/** 지금 잡힌 기간이 어떤 프리셋과 맞아떨어지는가 · 아니면 null (직접 고른 기간) */
export function detectActivePreset(
  startDate: string,
  endDate: string,
): PeriodPresetKey | null {
  for (const preset of PERIOD_PRESETS) {
    const { start, end } = preset.range();
    if (start === startDate && end === endDate) return preset.key;
  }
  return null;
}

/**
 * 기간을 짧게 적는다 · 같은 해면 뒤쪽 연도를 지운다 (`2026.09.26 ~ 10.02`).
 *
 * 연도를 두 번 적으면 스물두 글자다. 표 머리에 그만한 자리가 없고, 같은 해라는 건
 * 앞에 한 번 적힌 것으로 이미 말했다. 해를 넘기는 기간에서만 둘 다 적는다.
 */
export function formatPeriodLabel(startDate: string, endDate: string): string {
  const start = startDate.replace(/-/g, ".");
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const end = (sameYear ? endDate.slice(5) : endDate).replace(/-/g, ".");
  return `${start} ~ ${end}`;
}
