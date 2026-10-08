"use client";

import { useState, type FormEvent } from "react";
import { useInterval } from "react-use";
import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  parse,
} from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
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
  type PeriodPreset,
  type PeriodPresetKey,
} from "@/features/history/lib/periodPresets";
import {
  DELIVERY_DEADLINE_ENABLED,
  DELIVERY_DEADLINE_LABEL,
  deliveryDeadline,
} from "../lib/deadline";

const ISO = "yyyy-MM-dd";

const STEP_BUTTON_CLASS =
  "inline-flex h-7 w-6 shrink-0 items-center justify-center text-content-faint transition-colors hover:text-content";

const DATE_INPUT_CLASS =
  "h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-[12px] tabular-nums text-content-mid outline-none focus:border-focus";

/**
 * 빠른 선택 자리 · 윗줄은 「이번」, 아랫줄은 「지난」 · 같은 단위가 세로로 선다.
 *
 * 목록 차례대로 네 칸에 흘려 넣으면 둘째 줄 끝이 아무 까닭 없이 빈다. 단위로 세우면
 * 빈 칸이 「올해」 밑 한 자리로 정해지고, 「지난주는 이번주 바로 밑」 이라 손이 외운다.
 */
const PRESET_GRID: readonly (PeriodPresetKey | null)[] = [
  "today",
  "thisWeek",
  "thisMonth",
  "year",
  "yesterday",
  "lastWeek",
  "lastMonth",
  null,
];
const presetByKey = new Map<PeriodPresetKey, PeriodPreset>(
  PERIOD_PRESETS.map((p) => [p.key, p]),
);

/** 남은 시간이 이 아래로 떨어지면 색을 바꾼다 · 한 시간이면 쉰 건은 마저 끝낼 수 있다 */
const DEADLINE_SOON_MINUTES = 60;

export interface Period {
  startDate: string;
  endDate: string;
}

export interface DeliveryPeriodPickerProps extends Period {
  /** 고르는 즉시 조회한다 · 화살표·빠른 선택·직접 입력 모두 */
  onChange: (next: Period) => void;
}

const toDate = (iso: string) => parse(iso, ISO, new Date());

/** 잡힌 기간만큼 앞뒤로 민다 · 하루면 하루, 이번주면 한 주 */
function shiftPeriod({ startDate, endDate }: Period, dir: 1 | -1): Period {
  const start = toDate(startDate);
  const end = toDate(endDate);
  const span = (differenceInCalendarDays(end, start) + 1) * dir;
  return {
    startDate: format(addDays(start, span), ISO),
    endDate: format(addDays(end, span), ISO),
  };
}

function periodLabel({ startDate, endDate }: Period): string {
  if (startDate !== endDate) return formatPeriodLabel(startDate, endDate);
  return format(toDate(startDate), "yyyy.MM.dd (EEE)", { locale: ko });
}

/**
 * 배송지시 조회기간 · 표 머리줄 맨 앞의 `‹ 2026.10.08 (목) ›`.
 *
 * 따로 한 줄을 깔고 있던 기간 띠를 접어 넣었다. 배송지시는 거의 늘 「오늘 하루」 를
 * 보내는 일이라 일곱 개 기간 단추와 날짜 칸 둘이 늘 펼쳐져 있을 까닭이 없었고, 그
 * 줄이 먹던 높이만큼 사진과 표가 짧았다. 경매내역(`HistoryDatePicker`)과 같은 자리
 * 같은 꼴이라 두 화면을 오가도 날짜를 찾는 눈이 그대로다.
 *
 * 화살표는 **잡힌 기간만큼** 민다 — 하루를 보고 있으면 하루, 「이번주」 면 지난주로.
 * 이번주·이번달 같은 기간과 직접 입력은 날짜를 눌러 펴는 쪽지에 있다.
 */
export function DeliveryPeriodPicker({
  startDate,
  endDate,
  onChange,
}: DeliveryPeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const period = { startDate, endDate };
  const single = startDate === endDate;

  const pick = (next: Period) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => onChange(shiftPeriod(period, -1))}
        className={STEP_BUTTON_CLASS}
        aria-label={single ? "하루 전" : "이전 기간"}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-extrabold tabular-nums text-content transition-colors hover:bg-surface-muted data-[state=open]:bg-surface-muted"
            aria-label="조회기간 선택"
          >
            <CalendarDays
              className="h-3.5 w-3.5 text-content-faint"
              aria-hidden
            />
            {periodLabel(period)}
          </button>
        </PopoverTrigger>
        {/* 쪽지가 제 테두리를 그리므로 팝오버 기본 껍데기는 벗긴다 (두 겹이 된다) */}
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-auto border-0 bg-transparent p-0 shadow-none"
        >
          <PeriodMenu period={period} onPick={pick} />
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => onChange(shiftPeriod(period, 1))}
        className={STEP_BUTTON_CLASS}
        aria-label={single ? "하루 뒤" : "다음 기간"}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {DELIVERY_DEADLINE_ENABLED ? <DeadlineChip endDate={endDate} /> : null}
    </span>
  );
}

/**
 * 펼친 쪽지 · 위는 빠른 선택, 가름선 아래는 직접 입력. 제목은 달지 않는다 — 단추와
 * 날짜 칸은 생김새가 이미 다르고, 가름선 하나면 두 덩어리로 읽힌다.
 *
 * 고른 기간은 바탕만 짙게 둔다. 체크 표시까지 달면 두 글자짜리 단추에서 표시가 글자만큼
 * 자리를 먹는다.
 *
 * 직접 입력은 「조회」(또는 Enter)를 눌러야 넘어간다. 날짜 칸은 한 자리씩 바뀌므로 칠
 * 때마다 조회하면 2026-1 → 2026-10 사이에 엉뚱한 날을 한 번씩 부른다. 가장 드물게 쓰는
 * 단추라 쪽지에서 가장 튀지 않게 무채색으로 둔다.
 */
function PeriodMenu({
  period,
  onPick,
}: {
  period: Period;
  onPick: (next: Period) => void;
}) {
  const [draft, setDraft] = useState(period);
  const activePreset = detectActivePreset(period.startDate, period.endDate);
  const canSubmit = !!draft.startDate && !!draft.endDate;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    /* 앞뒤를 거꾸로 넣었으면 바로잡아 준다 · 막아 세우는 것보다 낫다 */
    const [startDate, endDate] = [draft.startDate, draft.endDate].sort();
    onPick({ startDate, endDate });
  };

  return (
    <div className={cn("w-[296px] p-1.5 shadow-xl", SURFACE_SHELL_CLASS)}>
      <div className="grid grid-cols-4 gap-0.5">
        {PRESET_GRID.map((key, i) => {
          const preset = key ? presetByKey.get(key) : null;
          if (!preset) return <span key={`gap-${i}`} aria-hidden />;
          const picked = preset.key === activePreset;
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={picked}
              onClick={() => {
                const { start, end } = preset.range();
                onPick({ startDate: start, endDate: end });
              }}
              className={cn(
                "h-8 min-w-0 rounded-md text-[12px] transition-colors",
                picked
                  ? "bg-surface-accent font-bold text-content"
                  : "font-medium text-content-mid hover:bg-surface-muted",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={submit}
        className="mt-1.5 border-t border-line-soft px-0.5 pb-0.5 pt-2"
      >
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="시작일"
            value={draft.startDate}
            onChange={(e) =>
              setDraft((d) => ({ ...d, startDate: e.target.value }))
            }
            className={DATE_INPUT_CLASS}
          />
          <span className="text-[12px] text-content-faint">~</span>
          <input
            type="date"
            aria-label="종료일"
            value={draft.endDate}
            onChange={(e) =>
              setDraft((d) => ({ ...d, endDate: e.target.value }))
            }
            className={DATE_INPUT_CLASS}
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1.5 inline-flex h-8 w-full items-center justify-center rounded-md bg-surface-accent text-[12px] font-bold text-content transition-colors hover:bg-surface-strong disabled:opacity-40"
        >
          조회
        </button>
      </form>
    </div>
  );
}

/**
 * 머리줄에 적을 마감 문구 · 보고 있는 기간의 **마지막 날**을 기준으로 삼는다.
 *
 * 기간을 넓게 잡으면 앞쪽 날은 이미 잠겨 있고 마지막 날만 살아 있다. 살아 있는 쪽을
 * 말해 줘야 「아직 고칠 수 있나」 에 답이 된다 — 첫날로 재면 늘 「마감됨」 이다.
 */
function deadlineState(endDate: string, now: Date) {
  const deadline = deliveryDeadline(endDate);
  if (!deadline)
    return { tone: "open" as const, text: `${DELIVERY_DEADLINE_LABEL} 마감` };

  const left = differenceInMinutes(deadline, now);
  if (left < 0) {
    return {
      tone: "closed" as const,
      text: `${format(deadline, "M/d")} 마감됨`,
    };
  }
  if (left <= DEADLINE_SOON_MINUTES) {
    return { tone: "soon" as const, text: `마감 ${left}분 전` };
  }
  return {
    tone: "open" as const,
    text: `${format(deadline, "M/d")} ${DELIVERY_DEADLINE_LABEL} 마감`,
  };
}

/**
 * 마감을 늘 띄워 둔다 · 막힌 뒤에 알면 늦다.
 *
 * 오늘치가 열려 있는 동안에는 남은 시간을, 지난 날짜만 보고 있으면 「마감됨」 을
 * 적는다. 같은 자리에 같은 문장이 있어야 「어, 오늘은 왜 다르지」 가 눈에 띈다.
 */
function DeadlineChip({ endDate }: { endDate: string }) {
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), 60_000);
  const { tone, text } = deadlineState(endDate, now);

  return (
    <span
      title={`배송지는 상장일 ${DELIVERY_DEADLINE_LABEL} 까지 고칠 수 있습니다 · 그 뒤 수정은 관리자에게 요청해 주세요`}
      className={cn(
        "ml-1 inline-flex h-7 shrink-0 items-center gap-1.5 px-1 text-[11px] font-semibold tabular-nums",
        tone === "open" && "text-content-faint",
        tone === "soon" && "text-pending",
        tone === "closed" && "text-content-ghost",
      )}
    >
      <Clock className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      {text}
    </span>
  );
}
