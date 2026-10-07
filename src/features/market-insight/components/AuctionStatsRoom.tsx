"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { endOfMonth, endOfYear, format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { useMyAuctionResults } from "@/features/bids/hooks";
import { useDeliveryAssignments } from "@/features/delivery/hooks/useDeliveryAssignments";
import {
  buildDayStats,
  buildMonthsOfYear,
  buildYearStats,
  latestBucketWith,
  latestDateWith,
} from "../lib/dailyStats";
import {
  buildPartnerOptions,
  filterByPartner,
  PARTNER_ALL,
} from "../lib/partnerFilter";
import { StatsCalendar } from "./StatsCalendar";
import { PeriodBarChart } from "./PeriodBarChart";
import { PeriodBreakdown } from "./PeriodBreakdown";
import { TableFilterPicker } from "./TableFilterPicker";

/**
 * 읽기 좋은 한 열의 천장 · 시세 방(`MarketRoom`)과 같은 값.
 *
 * 창이 넓어진 만큼 늘려 봐야 캘린더는 칸 안 여백만 벌어지고 도넛은 범례와 그림
 * 사이가 멀어진다. 1100 에서 멈추고 가운데 세운다 — 레일을 오가며 본문이 같은
 * 자리에 서야 눈이 매번 다시 자리를 안 잡는다.
 */
const COLUMN_MAX_WIDTH = 1100;

/** 위에서 고르는 묶는 단위 · 아래 판은 셋 다 같은 것이 선다 */
type StatsUnit = "day" | "month" | "year";

const UNIT_TABS = [
  { value: "day", label: "일자별" },
  { value: "month", label: "월별" },
  { value: "year", label: "년도별" },
];

/**
 * 막대 한 칸의 너비 (px) · 단위마다 다르다.
 *
 * 해는 몇 칸 안 되므로 넓게 세운다. 달과 같은 폭으로 두면 1100px 판 한가운데
 * 성냥개비 두 개가 서 있는 꼴이 된다.
 */
const SLOT_WIDTH: Record<"month" | "year", number> = { month: 76, year: 132 };

/**
 * 경매통계 화면 · 위에서 구간을 고르고 아래에서 그 구간을 뜯어본다.
 *
 * 위는 단위에 따라 갈린다. **일자별은 캘린더**로 깔아 「이 달 어느 날 많이 먹었나」
 * 를 보이고, **월별은 막대**로 세워 「저번 달보다 많이 샀나」 를 보인다. 달을 달력처럼
 * 깔아 봐야 칸에 적을 것이 금액 하나뿐이고, 달력의 쓸모였던 요일이 달 단위에서는
 * 아무 뜻이 없다.
 *
 * 아래(`PeriodBreakdown`)는 둘이 똑같다. 묻는 것이 「이 구간을 무엇으로 채웠나」 로
 * 같아서, 위에서 자른 줄만 그대로 내려보내면 된다.
 *
 * 짜임을 시세 방과 같게 뒀다. 가운데 한 열에 판을 위아래로 쌓고 미는 일은 화면
 * 바깥(`TableScroll`)이 맡는다 — 캘린더는 달에 따라 다섯 줄과 여섯 줄을 오가고 그
 * 아래 도넛은 높이가 고정이라, 창 높이를 눈금으로 나눠 가질 짜임이 아니다.
 *
 * 한때 옆에 낙찰분석이 따로 있었다. 「기간을 한 덩어리로 놓고 쪼개기」 를 하던
 * 화면인데, 여기에 월·해 탭이 생기면서 같은 일을 두 곳에서 하게 됐다 — 같은 질문에
 * 두 화면을 두면 어느 쪽 숫자가 맞는지부터 대조하게 되므로 저쪽을 걷어냈다.
 */
export function AuctionStatsRoom() {
  const { data: session } = useSession();
  const dealerId = session?.dealer?.id ?? session?.employee?.dealerId ?? null;
  const { data: results, isLoading } = useMyAuctionResults(dealerId);
  const { data: assignmentsData } = useDeliveryAssignments();

  const [unit, setUnit] = useState<StatsUnit>("day");
  const [partner, setPartner] = useState(PARTNER_ALL);

  const assignments = useMemo(
    () => assignmentsData?.assignments ?? {},
    [assignmentsData],
  );
  const partnerOptions = useMemo(
    () => buildPartnerOptions(results ?? [], assignments),
    [results, assignments],
  );

  /*
   * 거래처는 **방 전체**에 건다 — 캘린더도 막대도 아래 판도 모두 추린 것만 센다.
   *
   * 아래 표에만 걸면 「하누하누로 간 물량이 달마다 어떻게 변했나」 를 못 본다. 위
   * 그림이 전체를 그리는 동안 아래만 거래처 하나를 말하면, 막대 높이와 표의 합이
   * 안 맞아 둘 중 어느 쪽이 거짓인지부터 따지게 된다.
   */
  const scoped = useMemo(
    () => filterByPartner(results ?? [], partner, assignments),
    [results, partner, assignments],
  );

  const dayStats = useMemo(() => buildDayStats(scoped), [scoped]);
  const yearStats = useMemo(() => buildYearStats(scoped), [scoped]);

  /*
   * 처음 열 때는 가장 최근에 딴 날(달)에 선다. 오늘로 세우면 장이 안 선 날에 걸려
   * 아래 도넛 셋이 모두 빈 채로 뜨는데, 그러면 이 화면이 무엇을 보여 주는 자리인지
   * 한 번도 안 보이고 지나간다.
   *
   * `null` 로 둔 첫 상태를 자료가 오면 한 번 메운다 — 받는 동안에는 세울 날이 없다.
   */
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [pickedYear, setPickedYear] = useState<string | null>(null);
  const [monthYearPick, setMonthYearPick] = useState<string | null>(null);
  const [cursorPick, setCursorPick] = useState<Date | null>(null);

  const selectedDate = pickedDate ?? latestDateWith(dayStats);
  const selectedYear = pickedYear ?? latestBucketWith(yearStats);
  const cursor =
    cursorPick ?? (selectedDate ? parseISO(selectedDate) : new Date());

  /* 월별 탭이 펴 놓은 해 · 열두 칸을 늘 채우므로 해를 하나 정해 둬야 한다 */
  const monthYear =
    monthYearPick ??
    latestBucketWith(yearStats) ??
    String(new Date().getFullYear());
  const monthStats = useMemo(
    () => buildMonthsOfYear(scoped, monthYear),
    [scoped, monthYear],
  );
  const selectedMonth = pickedMonth ?? latestBucketWith(monthStats);

  const selectDate = (next: string) => {
    setPickedDate(next);
    setCursorPick(parseISO(next));
  };

  /* 해를 옮기면 고른 달을 놓는다 · 안 놓으면 2025 막대 아래에 2026 자료가 깔린다 */
  const changeMonthYear = (next: string) => {
    setMonthYearPick(next);
    setPickedMonth(null);
  };

  /*
   * 거래처를 바꾸면 집어 둔 구간을 모두 놓는다.
   *
   * 안 놓으면 그 거래처가 아무것도 안 받은 날에 그대로 서서 「입찰 내역이 없습니다」
   * 가 뜬다 — 거래처를 잘못 고른 것처럼 보이지만 실은 날짜가 남아 있을 뿐이다.
   * 놓아 두면 아래 `latest…` 들이 그 거래처가 마지막으로 받은 구간을 다시 잡는다.
   */
  const changePartner = (next: string) => {
    setPartner(next);
    setPickedDate(null);
    setPickedMonth(null);
    setPickedYear(null);
    setMonthYearPick(null);
    setCursorPick(null);
  };

  /**
   * 고른 구간 하나로 추린 것 · 아래 판은 단위를 모른 채 이것만 받는다.
   *
   * 「평균가 대비」 를 재는 창은 구간 끝에 건다. 줄마다 제 날짜로 창을 따로 잡는
   * 쪽이 정확하지만 한 해치면 창을 삼백 번 잡아야 하고, 그러고도 한 해를 통으로
   * 보는 눈에는 줄끼리 다른 잣대로 잰 값이 섞여 들어온다.
   */
  const period = useMemo(() => {
    const rows = scoped;
    if (unit === "year") {
      if (!selectedYear) return null;
      return {
        label: `${selectedYear}년`,
        anchorDate: format(
          endOfYear(parseISO(`${selectedYear}-01-01`)),
          "yyyy-MM-dd",
        ),
        rows: rows.filter((r) => r.listingDate?.startsWith(selectedYear)),
      };
    }
    if (unit === "month") {
      if (!selectedMonth) return null;
      return {
        label: format(parseISO(`${selectedMonth}-01`), "yyyy년 M월", {
          locale: ko,
        }),
        anchorDate: format(
          endOfMonth(parseISO(`${selectedMonth}-01`)),
          "yyyy-MM-dd",
        ),
        rows: rows.filter((r) => r.listingDate?.startsWith(selectedMonth)),
      };
    }
    if (!selectedDate) return null;
    return {
      label: format(parseISO(selectedDate), "yyyy.MM.dd (EEE)", { locale: ko }),
      anchorDate: selectedDate,
      rows: rows.filter((r) => r.listingDate === selectedDate),
    };
  }, [scoped, unit, selectedDate, selectedMonth, selectedYear]);

  if (!dealerId) {
    return (
      <Notice>중도매인으로 로그인하면 내 경매 통계를 볼 수 있습니다.</Notice>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "mx-auto h-[520px] w-full animate-pulse",
          SURFACE_SHELL_CLASS,
        )}
        style={{ maxWidth: COLUMN_MAX_WIDTH }}
      />
    );
  }

  return (
    <TableScroll>
      <div
        className="mx-auto flex w-full flex-col gap-2"
        style={{ maxWidth: COLUMN_MAX_WIDTH }}
      >
        {/*
         * 묶는 단위는 왼쪽, 거래처는 오른쪽 끝. 둘 다 아래를 통째로 바꾸는 손잡이라
         * 한 줄에 세우되, 성격이 달라 양 끝으로 갈라 둔다 — 단위는 **어떻게 자를까**
         * 고 거래처는 **무엇만 볼까** 다.
         */}
        <div className="flex items-center justify-between gap-3">
          <SegmentedTabs
            label="묶는 단위"
            value={unit}
            options={UNIT_TABS}
            onChange={(v) => setUnit(v as StatsUnit)}
          />
          <TableFilterPicker
            label="거래처"
            value={partner}
            options={partnerOptions.names}
            counts={partnerOptions.counts}
            onChange={changePartner}
            align="end"
            width={176}
          />
        </div>

        {unit === "day" ? (
          <StatsCalendar
            cursor={cursor}
            onChangeCursor={setCursorPick}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
            stats={dayStats}
          />
        ) : unit === "month" ? (
          <PeriodBarChart
            title="월별 낙찰금액"
            nav={
              <YearNav
                year={monthYear}
                years={yearStats.map((y) => y.key)}
                onChange={changeMonthYear}
                now={{
                  label: "이번 달",
                  onJump: () => {
                    setMonthYearPick(format(new Date(), "yyyy"));
                    setPickedMonth(format(new Date(), "yyyy-MM"));
                  },
                }}
              />
            }
            buckets={monthStats}
            selectedKey={selectedMonth}
            onSelect={setPickedMonth}
            slotWidth={SLOT_WIDTH.month}
            /* 해가 바뀌는 칸에만 연도를 적는다 · 모든 칸에 적으면 글자가 겹친다 */
            labelOf={(key) => {
              const [y, m] = key.split("-");
              return m === "01" ? `${y.slice(2)}.01` : `${Number(m)}월`;
            }}
            titleOf={(key) => key.replace("-", ".")}
          />
        ) : (
          <PeriodBarChart
            title="년도별 낙찰금액"
            nav={
              <NowButton
                label="올해"
                onClick={() => setPickedYear(format(new Date(), "yyyy"))}
              />
            }
            buckets={yearStats}
            selectedKey={selectedYear}
            onSelect={setPickedYear}
            slotWidth={SLOT_WIDTH.year}
            labelOf={(key) => `${key}년`}
            titleOf={(key) => `${key}년`}
          />
        )}

        <PeriodBreakdown
          label={period?.label ?? null}
          anchorDate={period?.anchorDate ?? null}
          results={period?.rows ?? []}
          /* 거래처를 고른 순간 미낙찰은 남을 수가 없다 · `partnerFilter` 머리말 */
          wonOnly={partner !== PARTNER_ALL}
          emptyHint={
            unit === "day"
              ? "캘린더에서 날짜를 고르면 그날의 구성이 열립니다."
              : "막대를 고르면 그 구간의 구성이 열립니다."
          }
        />
      </div>
    </TableScroll>
  );
}

/**
 * 월별 막대가 펴 놓을 해 고르개 · 캘린더의 달 넘기개와 같은 꼴.
 *
 * 자료가 있는 해의 범위 밖으로는 못 간다. 빈 해로 넘어가 봐야 막대 열두 칸이 모두
 * 비어 「고를 것이 없는 화면」 만 나오는데, 그 끝이 어디인지는 아무도 모르므로
 * 되돌아올 길을 눈으로 찾아야 한다.
 */
function YearNav({
  year,
  years,
  onChange,
  now,
}: {
  year: string;
  /** 자료가 있는 해 · 오름차순 */
  years: string[];
  onChange: (next: string) => void;
  /** 오늘로 뛰는 단추 · 캘린더의 「오늘」 과 같은 자리 */
  now: { label: string; onJump: () => void };
}) {
  const at = years.indexOf(year);
  const prev = at > 0 ? years[at - 1] : null;
  const next = at >= 0 && at < years.length - 1 ? years[at + 1] : null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <YearNavButton
        label="이전 해"
        to={prev}
        onChange={onChange}
        icon={<ChevronLeft className="h-3.5 w-3.5" />}
      />
      <span className="min-w-[52px] text-center text-[13px] font-extrabold tabular-nums text-content">
        {year}
      </span>
      <YearNavButton
        label="다음 해"
        to={next}
        onChange={onChange}
        icon={<ChevronRight className="h-3.5 w-3.5" />}
      />
      <NowButton label={now.label} onClick={now.onJump} className="ml-1" />
    </div>
  );
}

/** 지금으로 뛰는 단추 · 캘린더의 「오늘」 과 생김새를 맞춘다 */
function NowButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center border border-line bg-surface px-2.5 text-[11px] font-bold text-content-mid transition-colors hover:bg-surface-muted hover:text-content",
        className,
      )}
    >
      {label}
    </button>
  );
}

function YearNavButton({
  label,
  to,
  onChange,
  icon,
}: {
  label: string;
  /** 갈 곳이 없으면 `null` · 자리는 지키고 누를 수만 없게 둔다 */
  to: string | null;
  onChange: (next: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!to}
      onClick={() => to && onChange(to)}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center border border-line transition-colors",
        to
          ? "bg-surface text-content-soft hover:bg-surface-muted hover:text-content"
          : "cursor-default bg-surface-muted text-content-ghost",
      )}
    >
      {icon}
    </button>
  );
}

/** 그릴 것이 없을 때의 한 판 */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-24 text-center text-[13px] text-content-faint",
        SURFACE_SHELL_CLASS,
      )}
      style={{ maxWidth: COLUMN_MAX_WIDTH }}
    >
      {children}
    </div>
  );
}
