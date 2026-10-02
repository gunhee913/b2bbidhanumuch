"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useMeasure } from "react-use";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";
import { CHART_PALETTES } from "@/features/live-auction/components/PartMarketChart";
import { PaneGripHandle } from "@/features/live-auction/components/PaneGripHandle";
import { RoomSplitter } from "@/features/live-auction/components/RoomSplitter";
import { usePaneReorder } from "@/features/live-auction/hooks/usePaneReorder";
import type { PaneOrder } from "@/features/live-auction/hooks/useRoomLayout";
import type { YieldGrade } from "@/features/live-auction/lib/buildPartPriceSeries";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";
import {
  CHART_MIN_WIDTH,
  TABLE_DEFAULT_WIDTH,
  TABLE_MAX_WIDTH,
  TABLE_MIN_WIDTH,
  useInsightPrefs,
  type InsightColumn,
} from "../hooks/useInsightPrefs";
import { useMarketKeys } from "../hooks/useMarketKeys";
import { useMarketPartGradePrices } from "../hooks/useMarketPartGradePrices";
import { buildMarketRows, orderedParts } from "../lib/marketRows";
import {
  MarketPartSummaryTable,
  type MarketPeriodControl,
} from "./MarketPartSummaryTable";
import { MarketSeriesPane } from "./MarketSeriesPane";
import { HideEmptyRowsToggle } from "./HideEmptyRowsToggle";

/** 두 판 사이 틈 · 이 자리를 눈금(`RoomSplitter`)이 그대로 쓴다 */
const SPLITTER_WIDTH = 8;

export interface MarketRoomProps {
  /** 조회가 끝난 기간 · 자료를 받아 오는 기준 */
  startDate: string;
  endDate: string;
  /** 손에 쥔 기간과 그것을 고치는 길 · 표 머리의 고르개가 쥔다 */
  period: MarketPeriodControl;
}

/**
 * 시세 방 · 왼쪽 부위별 등급 시세, 오른쪽 그 부위의 시세 흐름.
 *
 * 둘은 한 가지를 두 각도에서 본다 — 표는 「조회기간에 얼마였나」 를 숫자로, 차트는
 * 「그 값이 추세 대비 어디인가」 를 선으로 말한다. 예전엔 위아래로 쌓여 있어 차트
 * 520px 때문에 표를 보려면 차트가 화면 밖으로 나갔다. 비교가 전부인 화면인데 정작
 * 두 짝을 같이 못 봤다.
 *
 * 자료는 한 번만 받는다. 부위 탭을 넘기거나 육량등급을 통합해도 서버를 다시 다녀
 * 오지 않는다 — 받아 둔 합을 가르고 더하는 일이라 화면에서 끝난다.
 */
export function MarketRoom({ startDate, endDate, period }: MarketRoomProps) {
  const { data, isLoading, isError } = useMarketPartGradePrices({
    startDate,
    endDate,
  });

  const yieldUnified = useInsightPrefs((s) => s.yieldUnified);
  const setYieldUnified = useInsightPrefs((s) => s.setYieldUnified);
  const hideEmptyRows = useInsightPrefs((s) => s.hideEmptyRows);
  const setHideEmptyRows = useInsightPrefs((s) => s.setHideEmptyRows);
  const palette = CHART_PALETTES[useAppTheme()];

  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const parts = useMemo(
    () => orderedParts(data?.rows ?? [], getPartGroupOrder()),
    [data],
  );

  const allRows = useMemo(
    () =>
      selectedPart
        ? buildMarketRows(data?.rows ?? [], selectedPart, yieldUnified)
        : [],
    [data, selectedPart, yieldUnified],
  );

  const emptyCount = useMemo(
    () => allRows.filter((r) => r.count === 0).length,
    [allRows],
  );

  const rows = useMemo(
    () => (hideEmptyRows ? allRows.filter((r) => r.count > 0) : allRows),
    [allRows, hideEmptyRows],
  );

  const rowKeys = useMemo(() => rows.map((r) => r.key), [rows]);

  /*
   * 짚은 것이 사라지면 첫 칸으로 내려 앉는다.
   *
   * 기간을 바꾸면 부위 탭이 통째로 갈리고, 육량등급을 통합하면 줄 열쇠가 바뀐다.
   * 그대로 두면 차트는 이제 표에 없는 부위를 그리고 있고, 표에는 짚힌 줄이 하나도
   * 없어 「아무것도 안 고른 것」 처럼 보인다 — 그런데 오른쪽에는 뭔가 그려져 있다.
   */
  useEffect(() => {
    setSelectedPart((prev) =>
      prev && parts.includes(prev) ? prev : (parts[0] ?? null),
    );
  }, [parts]);

  useEffect(() => {
    setSelectedRowKey((prev) =>
      prev && rowKeys.includes(prev) ? prev : (rowKeys[0] ?? null),
    );
  }, [rowKeys]);

  useMarketKeys({
    parts,
    selectedPart,
    onSelectPart: setSelectedPart,
    rowKeys,
    selectedRowKey,
    onSelectRow: setSelectedRowKey,
  });

  /** 차트가 그릴 선 · 짚은 줄의 육질 + 육량 (통합 중이면 육량은 없다) */
  const selectedRow = rows.find((r) => r.key === selectedRowKey) ?? null;

  /* ── 판 크기와 차례 ──────────────────────────────────── */

  const tableWidth = useInsightPrefs((s) => s.tableWidth);
  const setTableWidth = useInsightPrefs((s) => s.setTableWidth);
  const resetTableWidth = useInsightPrefs((s) => s.resetTableWidth);
  const columnOrder = useInsightPrefs((s) => s.columnOrder);
  const swapColumnOrder = useInsightPrefs((s) => s.swapColumnOrder);

  const column = usePaneReorder<InsightColumn>({
    axis: "x",
    order: columnOrder,
    gap: SPLITTER_WIDTH,
    onSwap: swapColumnOrder,
  });

  /*
   * 잡아 둔 폭을 지금 화면에 맞춰 깎는다 · 저장값은 건드리지 않아 창을 다시 넓히면
   * 원래 자리로 돌아온다 (경매내역 두 열과 같은 셈).
   */
  const [gridRef, { width: gridWidth }] = useMeasure<HTMLDivElement>();
  const maxTableWidth =
    gridWidth > 0
      ? Math.max(
          TABLE_MIN_WIDTH,
          Math.min(
            TABLE_MAX_WIDTH,
            Math.floor(gridWidth) - CHART_MIN_WIDTH - SPLITTER_WIDTH,
          ),
        )
      : TABLE_MAX_WIDTH;
  const effectiveTableWidth = Math.min(tableWidth, maxTableWidth);

  /** 끄는 판은 떠오르고 밀려나는 판만 부드럽게 비킨다 (경매내역 두 열과 같다) */
  const paneClass = (pane: InsightColumn) =>
    cn(
      "min-h-0 min-w-0",
      column.dragging === pane &&
        "relative z-30 shadow-2xl ring-1 ring-content-soft",
      column.dragging &&
        column.dragging !== pane &&
        "transition-transform duration-200",
    );

  const tablePane = (
    <MarketPartSummaryTable
      key="table"
      ref={column.registerPane("table")}
      period={period}
      parts={parts}
      selectedPart={selectedPart}
      onSelectPart={setSelectedPart}
      rows={rows}
      selectedRowKey={selectedRowKey}
      onSelectRow={setSelectedRowKey}
      yieldUnified={yieldUnified}
      onYieldUnifiedChange={setYieldUnified}
      hideToggle={
        <HideEmptyRowsToggle
          checked={hideEmptyRows}
          onChange={setHideEmptyRows}
          hiddenCount={emptyCount}
          heroColor={palette.heroLine}
          mutedColor={palette.crosshair}
        />
      }
      isLoading={isLoading}
      isError={isError}
      style={column.paneStyle("table")}
      className={paneClass("table")}
      headerAction={
        <PaneGripHandle
          label="표"
          axis="x"
          tone="card"
          dragging={column.dragging === "table"}
          {...column.handleProps("table")}
        />
      }
    />
  );

  const chartPane = (
    <MarketSeriesPane
      key="chart"
      ref={column.registerPane("chart")}
      partName={selectedPart}
      grade={selectedRow?.grade ?? null}
      yieldGrade={(selectedRow?.yieldGrade as YieldGrade | null) ?? null}
      gradeLabel={selectedRow?.label ?? null}
      yieldUnified={yieldUnified}
      onYieldUnifiedChange={setYieldUnified}
      style={column.paneStyle("chart")}
      className={paneClass("chart")}
      headerAction={
        <PaneGripHandle
          label="차트"
          axis="x"
          tone="card"
          dragging={column.dragging === "chart"}
          {...column.handleProps("chart")}
        />
      }
    />
  );

  return (
    <div
      ref={gridRef}
      style={
        {
          "--market-cols": gridColumns(columnOrder, effectiveTableWidth),
        } as CSSProperties
      }
      className={cn(
        "grid min-h-0 flex-1 [grid-template-columns:var(--market-cols)]",
        /* 판을 끄는 동안 `translate` 가 가로 스크롤을 만들지 않게 잠시 잘라 둔다 */
        column.dragging && "overflow-hidden",
      )}
    >
      {orderPanes(
        columnOrder,
        { table: tablePane, chart: chartPane },
        <RoomSplitter
          key="market-splitter"
          size={effectiveTableWidth}
          sizedOnLeft={columnOrder[0] === "table"}
          defaultSize={TABLE_DEFAULT_WIDTH}
          label="표와 차트 사이 너비"
          onResize={(px) => setTableWidth(Math.min(px, maxTableWidth))}
          onReset={resetTableWidth}
        />,
      )}
    </div>
  );
}

/**
 * 받은 차례대로 두 판을 늘어놓고 사이에 눈금을 끼운다 · 경매내역·상세 방과 같다.
 *
 * 순서마다 JSX 를 한 벌씩 써 두면 한쪽만 고치는 실수가 나고, `key` 를 쥔 같은 판이
 * 자리만 바뀌어야 리액트가 상태를 이어 받는다 (차트가 처음부터 다시 그려지지 않는다).
 */
function orderPanes(
  order: PaneOrder<InsightColumn>,
  panes: Record<InsightColumn, ReactNode>,
  splitter: ReactNode,
): ReactNode[] {
  return [panes[order[0]], splitter, panes[order[1]]];
}

/** 판 트랙 · 표는 잡아 둔 px, 차트는 남는 폭 전부 */
function gridColumns(order: PaneOrder<InsightColumn>, tableWidth: number) {
  const track = (col: InsightColumn) =>
    col === "table" ? `${tableWidth}px` : `minmax(${CHART_MIN_WIDTH}px,1fr)`;
  return `${track(order[0])} ${SPLITTER_WIDTH}px ${track(order[1])}`;
}
