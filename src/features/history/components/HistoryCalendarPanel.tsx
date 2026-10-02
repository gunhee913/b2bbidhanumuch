"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useMeasure } from "react-use";
import { addDays, endOfMonth, format, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import type { AuctionResult, MyBidItem } from "@/features/bids/types";
import type { AssignmentInfo } from "@/features/delivery/types";
import { PaneGripHandle } from "@/features/live-auction/components/PaneGripHandle";
import { RoomSplitter } from "@/features/live-auction/components/RoomSplitter";
import { usePaneReorder } from "@/features/live-auction/hooks/usePaneReorder";
import type { PaneOrder } from "@/features/live-auction/hooks/useRoomLayout";
import { type CalendarDayStat } from "./HistoryCalendar";
import { HistoryDatePicker } from "./HistoryDatePicker";
import { DailyHistoryTable } from "./DailyHistoryTable";
import { BidHistoryTable } from "./BidHistoryTable";
import { HistorySidePanes } from "./HistorySidePanes";
import { DailyListingsSection } from "./DailyListingsSection";
import { useDailyListings } from "../hooks/useDailyListings";
import { useBidHistory } from "../hooks/useBidHistory";
import { useHistoryKeys } from "../hooks/useHistoryKeys";
import {
  useHistoryPrefs,
  SIDE_DEFAULT_WIDTH,
  SIDE_MAX_WIDTH,
  SIDE_MIN_WIDTH,
  TABLE_MIN_WIDTH,
  type HistoryColumn,
} from "../hooks/useHistoryPrefs";
import {
  activeBidDateStr,
  buildDailyRows,
  type DailyRow,
} from "../lib/dailyRows";

/** 두 열 사이 틈 · 이 자리를 눈금(`RoomSplitter`)이 그대로 쓴다 */
const SPLITTER_WIDTH = 8;

/**
 * 받은 차례대로 두 열을 늘어놓고 사이에 눈금을 끼운다 · 경매장 상세 방과 같은 짜임.
 *
 * 순서마다 JSX 를 한 벌씩 써 두면 한쪽만 고치는 실수가 나고, `key` 를 쥔 같은 판이
 * 자리만 바뀌어야 리액트가 상태를 이어 받는다 (사진이 처음 장으로 되감기지 않는다).
 */
function orderPanes<P extends string>(
  order: PaneOrder<P>,
  panes: Record<P, ReactNode>,
  splitter: ReactNode,
): ReactNode[] {
  return [panes[order[0]], splitter, panes[order[1]]];
}

/** 열 트랙 · 왼쪽 열은 잡아 둔 px, 표는 남는 폭 전부 */
function gridColumns(order: PaneOrder<HistoryColumn>, sideWidth: number) {
  const track = (col: HistoryColumn) =>
    col === "side" ? `${sideWidth}px` : `minmax(${TABLE_MIN_WIDTH}px,1fr)`;
  return `${track(order[0])} ${SPLITTER_WIDTH}px ${track(order[1])}`;
}

export interface HistoryCalendarPanelProps {
  activeBids: MyBidItem[];
  results: AuctionResult[];
  /** partId → 배정 거래처 정보 · `/api/delivery/assignments` 응답 */
  assignments: Record<string, AssignmentInfo>;
  isLoading: boolean;
}

/**
 * `/history` 본문 · 날짜 하나를 세 화면이 나눠 쓴다.
 *
 * - **경매결과**: 좌 두 행(사진·개체정보) · 우 그날 내가 건 것의 결말
 * - **입찰내역**: 같은 좌 두 행 · 우 그날 내가 한 일(넣음·고침·취소)
 * - **상장표**: 그날 나온 개체 전부 · 폭을 통째로 쓴다
 *
 * 셋을 한 화면에 쌓아 두었을 때는 아래가 늘 접힌 채였다. 스무 두가 넘는 비교표라
 * 펴는 순간 화면 서너 배를 먹고, 위 표로 돌아오려면 그만큼 거슬러 올라와야 했다.
 * 고르는 건 사이드 레일이 맡는다 (`HistorySideRail`).
 *
 * 날짜는 셋이 함께 쥔다 — 경매결과에서 10-02 를 보다 넘어가면 같은 날이 열린다.
 * 같은 날을 다른 각도에서 보는 것이지 다른 데로 가는 게 아니다. 고르는 자리도 셋이
 * 같다: 표 머리줄 맨 앞의 날짜 단추 하나다 (`HistoryDatePicker`). 왼쪽 열도
 * 경매결과와 입찰내역이 그대로 함께 쓴다 (`HistorySidePanes`).
 *
 * 판의 크기와 차례는 사람이 정한다 (`RoomSplitter`·`PaneGripHandle`) — 경매장 상세
 * 방과 같은 장치다. 사진을 크게 보며 표를 좁히는 날과 표를 넓게 펴는 날이 다르고,
 * 그걸 정해 줄 바른 기본값이 하나로 없다. 좁은 화면(`lg` 미만)에서는 눈금을 숨긴다
 * — 거기서는 판이 쌓여 페이지가 통째로 구른다.
 */
export function HistoryCalendarPanel({
  activeBids,
  results,
  assignments,
  isLoading,
}: HistoryCalendarPanelProps) {
  const view = useHistoryPrefs((s) => s.view);
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    format(new Date(), "yyyy-MM-dd"),
  );

  /**
   * 왼쪽 판이 비추는 개체 · 어느 표에서 짚었든 **개체 상장번호** 하나로 말한다.
   *
   * 줄 id 로 담지 않는 까닭은 두 표의 줄 id 가 서로 다른 말이기 때문이다 —
   * 경매결과는 부위 하나가 한 줄이고 입찰내역은 한 부위에 세 줄까지 선다. 레일로
   * 넘나들 때 보던 개체가 그대로 남으려면 둘이 같은 말을 쥐어야 한다.
   */
  const [focus, setFocus] = useState<{
    /** 개체 상장번호 (260720-101) · 사진과 개체정보가 이걸로 개체를 찾는다 */
    entityNo: string;
    /** 부위까지 붙은 번호 (260720-101-01) · 표에서 짚은 줄을 밝히는 열쇠 */
    partNo: string;
    label: string;
  } | null>(null);

  /* 날이 바뀌면 푼다 · 어제 줄을 오늘 사진 옆에 둘 수 없다 */
  useEffect(() => {
    setFocus(null);
  }, [selectedDate]);

  const monthRange = useMemo(
    () => ({
      start: format(startOfMonth(cursor), "yyyy-MM-dd"),
      end: format(endOfMonth(cursor), "yyyy-MM-dd"),
      label: format(cursor, "yyyy-MM"),
    }),
    [cursor],
  );

  const dailyStats = useMemo<Record<string, CalendarDayStat>>(
    () => buildDailyStats(results, activeBids),
    [results, activeBids],
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

  /**
   * 하루 앞뒤로 한 걸음 · 머리줄 화살표와 ←→ 방향키가 같은 길을 쓴다.
   *
   * 달을 넘어가면 커서도 같이 옮긴다 — 안 그러면 달력을 폈을 때 지난달이 펼쳐져
   * 고른 날이 어디에도 안 보인다.
   */
  const stepDate = useCallback((days: number) => {
    setSelectedDate((prev) => {
      if (!prev) return prev;
      const next = format(addDays(new Date(prev), days), "yyyy-MM-dd");
      setCursor(new Date(next));
      return next;
    });
  }, []);

  /* 입찰내역 · 세션으로 가려낸 내 자취 (`/api/bids/history`) */
  const bidHistory = useBidHistory(view === "bids" ? selectedDate : null);
  const bidEntries = useMemo(() => bidHistory.data ?? [], [bidHistory.data]);

  /*
   * 사진·개체정보에 쓸 자료 · 상장표 화면과 **같은 질의**라 화면을 오가도 다시
   * 받지 않는다 (`["history-daily-listings", 날짜]`).
   */
  const listingsQuery = useDailyListings(selectedDate);
  const focusedListing = useMemo(() => {
    if (!focus) return null;
    return (
      listingsQuery.data?.find((l) => l.listingNo === focus.entityNo) ?? null
    );
  }, [listingsQuery.data, focus]);

  /*
   * 들어오자마자 첫 줄을 짚는다 · 왼쪽 세 판이 빈 채로 뜨면 화면의 절반이 「무엇을
   * 해야 하는지」 를 말하지 않는다 (배송지시 커서와 같은 규칙).
   *
   * 보던 개체가 지금 표에 없으면(날을 옮겼거나 거르개가 바뀌었으면) 다시 첫 줄로
   * 내려앉는다. 짚은 데가 표 밖에 있으면 왼쪽과 오른쪽이 서로 다른 말을 한다.
   */
  const head = view === "bids" ? bidEntries[0] : dailyRows[0];
  const firstFocus = head
    ? {
        entityNo: head.entityListingNo,
        partNo: head.listingNo,
        label: `${head.partName} · ${head.listingNo}`,
      }
    : null;
  const focusInView =
    !!focus &&
    (view === "bids"
      ? bidEntries.some((e) => e.listingNo === focus.partNo)
      : dailyRows.some((r) => r.listingNo === focus.partNo));

  useEffect(() => {
    if (focusInView || !firstFocus) return;
    setFocus(firstFocus);
    /* 첫 줄이 바뀌는 때(날짜·화면 전환)만 다시 본다 · 짚은 줄이 살아 있으면 그대로 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusInView, firstFocus?.partNo]);

  /**
   * 방향키가 걸어 다닐 길 · 보이는 차례대로, 부위 하나에 한 걸음.
   *
   * 입찰내역은 한 부위에 줄이 셋까지 서지만 그 셋은 한 이야기라 묶는다. 줄마다
   * 멈추면 ↓ 를 눌러도 왼쪽 판이 그대로여서 아무 일도 안 난 것처럼 보인다.
   */
  const walk = useMemo(() => {
    const source = view === "bids" ? bidEntries : dailyRows;
    const seen = new Map<string, { entityNo: string; label: string }>();
    for (const r of source) {
      if (seen.has(r.listingNo)) continue;
      seen.set(r.listingNo, {
        entityNo: r.entityListingNo,
        label: `${r.partName} · ${r.listingNo}`,
      });
    }
    return seen;
  }, [view, bidEntries, dailyRows]);

  useHistoryKeys({
    partNos: useMemo(() => Array.from(walk.keys()), [walk]),
    focusedPartNo: focus?.partNo ?? null,
    onFocusPartNo: (partNo) => {
      const at = walk.get(partNo);
      if (at) setFocus({ partNo, ...at });
    },
    onStepDate: stepDate,
  });

  /* ── 열 크기와 차례 ──────────────────────────────────── */

  const sideWidth = useHistoryPrefs((s) => s.sideWidth);
  const setSideWidth = useHistoryPrefs((s) => s.setSideWidth);
  const resetSideWidth = useHistoryPrefs((s) => s.resetSideWidth);
  const columnOrder = useHistoryPrefs((s) => s.columnOrder);
  const swapColumnOrder = useHistoryPrefs((s) => s.swapColumnOrder);

  const column = usePaneReorder<HistoryColumn>({
    axis: "x",
    order: columnOrder,
    gap: SPLITTER_WIDTH,
    onSwap: swapColumnOrder,
  });

  /*
   * 잡아 둔 폭을 지금 화면에 맞춰 깎는다 · 저장값은 건드리지 않아 창을 다시 넓히면
   * 원래 자리로 돌아온다 (경매장 상세 방이 사이드 도크를 여닫을 때와 같은 셈).
   */
  const [gridRef, { width: gridWidth }] = useMeasure<HTMLDivElement>();
  const maxSideWidth =
    gridWidth > 0
      ? Math.max(
          SIDE_MIN_WIDTH,
          Math.min(
            SIDE_MAX_WIDTH,
            Math.floor(gridWidth) - TABLE_MIN_WIDTH - SPLITTER_WIDTH,
          ),
        )
      : SIDE_MAX_WIDTH;
  const effectiveSideWidth = Math.min(sideWidth, maxSideWidth);

  /** 세 화면이 같이 쓰는 일자 조회 · 표 머리줄 맨 앞에 선다 */
  const datePicker = (
    <HistoryDatePicker
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      onStepDate={stepDate}
      cursor={cursor}
      onChangeCursor={setCursor}
      stats={dailyStats}
    />
  );

  if (view === "sheet") {
    return (
      /* 상장표는 제 안에서 구른다 · 바깥(`main`)은 한 화면 높이에 묶여 있다 */
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
        <DailyListingsSection
          selectedDate={selectedDate}
          focus={null}
          dateControl={datePicker}
        />
      </div>
    );
  }

  const sideColumn = (
    <HistorySidePanes
      key="side"
      ref={column.registerPane("side")}
      listing={focusedListing}
      rowLabel={focus?.label ?? null}
      isLoading={listingsQuery.isLoading}
      style={column.paneStyle("side")}
      className={cn(
        "lg:min-h-0 lg:min-w-0",
        column.dragging === "side" &&
          "relative z-30 shadow-2xl ring-1 ring-content-soft",
        column.dragging &&
          column.dragging !== "side" &&
          "transition-transform duration-200",
      )}
    />
  );

  /** 표 판이 공통으로 쓰는 껍데기 값 · 두 표가 같은 자리에 같은 모양으로 선다 */
  const tableShell = {
    dateControl: datePicker,
    style: column.paneStyle("table"),
    className: cn(
      "lg:min-h-0 lg:min-w-0",
      column.dragging === "table" &&
        "relative z-30 shadow-2xl ring-1 ring-content-soft",
      column.dragging &&
        column.dragging !== "table" &&
        "transition-transform duration-200",
    ),
    headerAction: (
      <PaneGripHandle
        label="표"
        axis="x"
        tone="card"
        dragging={column.dragging === "table"}
        className="hidden lg:inline-flex"
        {...column.handleProps("table")}
      />
    ),
  };

  const tablePane =
    view === "bids" ? (
      <BidHistoryTable
        key="table"
        ref={column.registerPane("table")}
        selectedDate={selectedDate}
        entries={bidEntries}
        isLoading={bidHistory.isLoading}
        error={bidHistory.error?.message ?? null}
        focusedPartNo={focus?.partNo ?? null}
        onSelectRow={(e) =>
          setFocus({
            entityNo: e.entityListingNo,
            partNo: e.listingNo,
            label: `${e.partName} · ${e.listingNo}`,
          })
        }
        {...tableShell}
      />
    ) : (
      <DailyHistoryTable
        key="table"
        ref={column.registerPane("table")}
        selectedDate={selectedDate}
        rows={dailyRows}
        monthRows={monthRows}
        monthLabel={monthRange.label}
        assignments={assignments}
        isLoading={isLoading}
        focusedPartNo={focus?.partNo ?? null}
        onSelectRow={(row) =>
          setFocus({
            entityNo: row.entityListingNo,
            partNo: row.listingNo,
            label: `${row.partName} · ${row.listingNo}`,
          })
        }
        {...tableShell}
      />
    );

  /*
   * 좁은 화면에서는 두 열이 위아래로 쌓이고 8px 틈을 `gap` 이 만든다. 넓은 화면에서는
   * 격자로 서고 그 틈을 눈금이 가져간다 — `gap` 을 둔 채 사이에 눈금을 끼우면 틈이
   * 둘이 되어 8px 이 24px 로 벌어진다.
   *
   * 열 폭을 사용자 지정 속성으로 넘기는 건 `style` 에 직접 쓰면 좁은 화면에서도
   * 격자가 서기 때문이다. 변수는 어디서나 꽂히고 그걸 읽는 건 `lg:` 뿐이다.
   */
  return (
    <div
      ref={gridRef}
      style={
        {
          "--history-cols": gridColumns(columnOrder, effectiveSideWidth),
        } as CSSProperties
      }
      className={cn(
        "flex flex-col gap-2",
        "lg:grid lg:min-h-0 lg:flex-1 lg:gap-0 lg:[grid-template-columns:var(--history-cols)]",
        /* 열을 끄는 동안 `translate` 가 가로 스크롤을 만들지 않게 잠시 잘라 둔다 */
        column.dragging && "overflow-hidden",
      )}
    >
      {orderPanes(
        columnOrder,
        { side: sideColumn, table: tablePane },
        <div key="column-splitter" className="hidden lg:contents">
          <RoomSplitter
            size={effectiveSideWidth}
            sizedOnLeft={columnOrder[0] === "side"}
            defaultSize={SIDE_DEFAULT_WIDTH}
            label="왼쪽 판과 표 사이 너비"
            onResize={(px) => setSideWidth(Math.min(px, maxSideWidth))}
            onReset={resetSideWidth}
          />
        </div>,
      )}
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
