"use client";

import { useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import type { AuctionResult, MyBidItem } from "@/features/bids/types";
import type { AssignmentInfo } from "@/features/delivery/types";
import { HistoryCalendar, type CalendarDayStat } from "./HistoryCalendar";
import { DailyHistoryTable } from "./DailyHistoryTable";
import { MonthKpiCard } from "./MonthKpiCard";
import { DailyListingsSection, type ListingFocus } from "./DailyListingsSection";
import {
  activeBidDateStr,
  buildDailyRows,
  parsePartNo,
  type DailyRow,
} from "../lib/dailyRows";
import { computeAnalysisKpi, filterResultsByRange } from "../lib/analysisKpi";

export interface HistoryCalendarPanelProps {
  activeBids: MyBidItem[];
  results: AuctionResult[];
  /** partId → 배정 거래처 정보 · `/api/delivery/assignments` 응답 */
  assignments: Record<string, AssignmentInfo>;
  isLoading: boolean;
  onChanged: () => void;
}

/**
 * `/history` 본문 · 캘린더의 달을 단일 기준 축으로 삼는다.
 *
 * - 좌 400px 레일: 미니 캘린더 → 이 달 KPI (2×2) · 이 높이가 행 높이
 * - 우: 선택일 경매내역 테이블 · 좌측과 같은 높이로 고정, 넘치면 내부 스크롤
 * - 아래 풀폭: 선택일 부분육 상장내역 (그날 나온 개체 전체 + 낙찰가) · 개체별 접이식
 * - 내 낙찰 분석은 `/insight` 로 이동
 */
export function HistoryCalendarPanel({
  activeBids,
  results,
  assignments,
  isLoading,
}: HistoryCalendarPanelProps) {
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [focus, setFocus] = useState<ListingFocus | null>(null);

  const monthRange = useMemo(
    () => ({
      start: format(startOfMonth(cursor), "yyyy-MM-dd"),
      end: format(endOfMonth(cursor), "yyyy-MM-dd"),
      label: format(cursor, "yyyy-MM"),
    }),
    [cursor],
  );

  const monthResults = useMemo(
    () => filterResultsByRange(results, monthRange.start, monthRange.end),
    [results, monthRange.start, monthRange.end],
  );
  const monthKpi = useMemo(() => computeAnalysisKpi(monthResults), [monthResults]);

  const dailyStats = useMemo<Record<string, CalendarDayStat>>(
    () => buildDailyStats(results, activeBids),
    [results, activeBids],
  );

  /** 이 달 낙찰분 중 거래처 미배정 */
  const unassignedCount = useMemo(
    () =>
      monthResults.filter((r) => r.result === "won" && !assignments[r.partId])
        .length,
    [monthResults, assignments],
  );

  const dailyRows = useMemo<DailyRow[]>(
    () =>
      selectedDate
        ? buildDailyRows(activeBids, results, (d) => d === selectedDate)
        : [],
    [activeBids, results, selectedDate],
  );

  const monthRows = useMemo<DailyRow[]>(
    () =>
      buildDailyRows(
        activeBids,
        results,
        (d) => d >= monthRange.start && d <= monthRange.end,
      ),
    [activeBids, results, monthRange.start, monthRange.end],
  );

  return (
    <div className="grid gap-4">
      {/*
       * 행 높이는 좌측 레일이 정한다 · 우측 테이블은 absolute 로 행 높이 계산에서 빠지고
       * 그 높이 안에서 내부 스크롤 (thead/tfoot sticky).
       */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <HistoryCalendar
            cursor={cursor}
            onChangeCursor={setCursor}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            stats={dailyStats}
          />
          <MonthKpiCard
            monthLabel={format(cursor, "yyyy.MM")}
            isLoading={isLoading}
            kpi={monthKpi}
            unassignedCount={unassignedCount}
          />
        </aside>

        <div className="min-h-[480px] lg:relative lg:min-h-0">
          <DailyHistoryTable
            className="lg:absolute lg:inset-0"
            selectedDate={selectedDate}
            rows={dailyRows}
            monthRows={monthRows}
            monthLabel={monthRange.label}
            assignments={assignments}
            isLoading={isLoading}
            onOpenDetail={(row) =>
              setFocus((prev) => ({
                listingNo: row.entityListingNo,
                partNo: parsePartNo(row.listingNo),
                seq: (prev?.seq ?? 0) + 1,
              }))
            }
          />
        </div>
      </div>

      <DailyListingsSection selectedDate={selectedDate} focus={focus} />
    </div>
  );
}

/**
 * 캘린더 셀 통계 · 결과(낙찰/미낙찰) + 진행중 입찰 + 참여 회차 수를 날짜별로 집계.
 */
function buildDailyStats(
  results: readonly AuctionResult[],
  activeBids: readonly MyBidItem[],
): Record<string, CalendarDayStat> {
  const map: Record<string, CalendarDayStat> = {};
  const rounds: Record<string, Set<number>> = {};

  const ensure = (key: string) => {
    if (!map[key]) {
      map[key] = {
        dateStr: key,
        wonCount: 0,
        lostCount: 0,
        wonAmount: 0,
        activeCount: 0,
        roundCount: 0,
      };
      rounds[key] = new Set();
    }
    return map[key];
  };

  for (const r of results) {
    const key = r.listingDate || "";
    if (!key) continue;
    const stat = ensure(key);
    if (r.result === "won") {
      stat.wonCount++;
      stat.wonAmount += r.totalAmount;
    } else {
      stat.lostCount++;
    }
    if (r.roundNo != null) rounds[key].add(r.roundNo);
  }

  for (const bid of activeBids) {
    const key = activeBidDateStr(bid);
    if (!key) continue;
    const stat = ensure(key);
    stat.activeCount++;
    if (bid.roundNo != null) rounds[key].add(bid.roundNo);
  }

  for (const key of Object.keys(map)) {
    map[key].roundCount = rounds[key].size;
  }
  return map;
}
