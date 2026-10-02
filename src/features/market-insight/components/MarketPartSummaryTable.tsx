"use client";

import { useMemo, type CSSProperties, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useScrollEdges } from "@/hooks/useScrollEdges";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { CHART_PALETTES } from "@/features/live-auction/components/PartMarketChart";
import { YieldUnifyToggle } from "@/features/live-auction/components/YieldUnifyToggle";
import { formatKrw } from "@/features/live-auction/lib/masking";
import {
  EmptyRow,
  Measured,
  SkeletonRows,
} from "@/features/history/components/TableParts";
import { MARKET_PART_ATTR, MARKET_ROW_ATTR } from "../hooks/useMarketKeys";
import type { MarketRow } from "../lib/marketRows";
import { PeriodRangePicker } from "./PeriodRangePicker";

export interface MarketPeriodControl {
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
  onSearch: () => void;
}

export interface MarketPartSummaryTableProps {
  period: MarketPeriodControl;

  parts: readonly string[];
  selectedPart: string | null;
  onSelectPart: (part: string) => void;

  rows: readonly MarketRow[];
  selectedRowKey: string | null;
  onSelectRow: (key: string) => void;

  yieldUnified: boolean;
  onYieldUnifiedChange: (unified: boolean) => void;
  /** 「낙찰 없음 숨김」 · 감출 줄 수를 세는 쪽이 방이라 단추째 받는다 */
  hideToggle?: ReactNode;

  isLoading: boolean;
  isError: boolean;

  /* ── 판 껍데기 · 눈금과 자리바꿈이 쥐는 값 ── */
  ref?: Ref<HTMLElement>;
  style?: CSSProperties;
  className?: string;
  headerAction?: ReactNode;
}

const HEAD_CELL =
  "whitespace-nowrap border-b border-line px-2 py-1.5 font-medium -tracking-[0.01em]";
const CELL = "whitespace-nowrap px-2 py-2 align-middle tabular-nums";

/**
 * 등급 · 낙찰건수 · 중량 · 평균단가 · 최고단가 · 최저단가 · 평균 낙찰대금.
 *
 * 합이 `TABLE_MIN_WIDTH` 안에 들어온다 — 눈금을 끝까지 좁혀도 가로로 구르지 않는다.
 * 테두리 2px 과 세로 스크롤바 10px 이 폭에서 먼저 빠져나가므로, 바닥값을 열 합과
 * 똑같이 잡으면 자료가 길어져 스크롤바가 서는 순간 표가 잘린다.
 */
const COLUMN_WIDTHS = [70, 68, 70, 88, 88, 88, 104];
const TOTAL_WIDTH = COLUMN_WIDTHS.reduce((a, b) => a + b, 0);

/**
 * 한 부위의 등급별 시세 · 부위는 머리의 탭이 고른다.
 *
 * 예전엔 열일곱 부위 × 일곱 등급을 한 표에 세로로 쌓았다. 백 줄이 넘는 표에서
 * 등심과 채끝을 견주려면 스무 줄을 사이에 두고 눈이 오르내려야 했고, 부위마다 줄
 * 수가 달라 그 거리도 매번 달랐다. 부위를 탭으로 빼면 같은 자리에서 같은 모양의
 * 표가 갈아 끼워진다 — 값만 바뀌니 차이가 바로 읽힌다.
 *
 * 등급은 육질과 육량을 한 칸에 붙여 적는다 (`1++A(9)`). 둘을 나눠 두면 표가 한 칸
 * 넓어지는 대신 「1++(9) 의 A」 를 눈이 두 번에 나눠 읽어야 하는데, 등급표·경매장·
 * 경매내역이 모두 붙여 쓰는 꼴이라 여기만 갈라 둘 까닭이 없다.
 *
 * 조회기간이 이 판 머리에 있는 건 그것이 **이 표만** 정하기 때문이다. 오른쪽 차트는
 * 제 기간 토글로 몇 달 치 흐름을 그린다.
 */
export function MarketPartSummaryTable({
  period,
  parts,
  selectedPart,
  onSelectPart,
  rows,
  selectedRowKey,
  onSelectRow,
  yieldUnified,
  onYieldUnifiedChange,
  hideToggle,
  isLoading,
  isError,
  ref,
  style,
  className,
  headerAction,
}: MarketPartSummaryTableProps) {
  const theme = useAppTheme();
  const palette = CHART_PALETTES[theme];
  const tabScroll = useScrollEdges<HTMLDivElement>();

  const partTabs = useMemo(
    () =>
      parts.map((part) => ({
        value: part,
        label: part,
        /* 방향키가 짚은 칸을 끌어올 수 있게 표식을 단다 (`useMarketKeys`) */
        attrs: { [MARKET_PART_ATTR]: part },
      })),
    [parts],
  );

  const totalCount = useMemo(
    () => rows.reduce((s, r) => s + r.count, 0),
    [rows],
  );

  return (
    <section
      ref={ref}
      style={style}
      className={cn("flex min-h-0 flex-col", SURFACE_SHELL_CLASS, className)}
    >
      <header className="flex shrink-0 items-center gap-1.5 border-b border-line-soft px-2 py-1.5">
        <h2 className="shrink-0 text-[13px] font-bold text-content">
          부위별 시세
        </h2>
        <PeriodRangePicker
          startDate={period.startDate}
          endDate={period.endDate}
          onChange={period.onChange}
          onSearch={period.onSearch}
        />
        <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-content-faint">
          {totalCount.toLocaleString("ko-KR")}건
        </span>
        {/* 차트 범례 줄의 같은 단추와 한 몸 · 어느 쪽을 눌러도 양쪽이 같이 움직인다 */}
        <YieldUnifyToggle
          className="ml-auto"
          checked={yieldUnified}
          onChange={onYieldUnifiedChange}
          heroColor={palette.heroLine}
          mutedColor={palette.crosshair}
        />
        {hideToggle}
        {headerAction ? (
          <div className="flex shrink-0 items-center">{headerAction}</div>
        ) : null}
      </header>

      {/*
       * 부위 탭 · **늘 한 줄**이고 좁으면 옆으로 구른다.
       *
       * 접어 내리면 판 폭에 따라 한 줄이었다 두 줄이었다 하는데, 그때마다 아래 표
       * 전체가 28px 씩 오르내린다. 눈금을 잡고 폭을 맞추는 동안 표가 들썩이는 셈이다.
       *
       * 막대는 안 그린다 (`no-scrollbar`). 막대가 서면 띠 높이가 또 8px 늘어 결국
       * 같은 들썩임이 되고, 열일곱 칸이 한 줄에 다 설 때조차 띠 아래에 회색 줄 하나가
       * 남는다. 가려진 칸이 있다는 건 양 끝 **그늘**이 말하고, 거기까지 가는 길은
       * 방향키가 맡는다 (`useMarketKeys` 가 짚은 칸을 끌어다 준다).
       */}
      <div className="relative shrink-0 border-b border-line">
        <div
          ref={tabScroll.ref}
          className="no-scrollbar overflow-x-auto px-2 py-1.5"
        >
          <SegmentedTabs
            label="부위"
            value={selectedPart ?? ""}
            options={partTabs}
            onChange={onSelectPart}
            dense
            className="min-w-max"
          />
        </div>
        <ScrollShade side="left" show={tabScroll.atStart} />
        <ScrollShade side="right" show={tabScroll.atEnd} />
      </div>

      {/* 구르는 건 여기 안쪽뿐 · 머리줄과 탭은 늘 제자리에 선다 */}
      <TableScroll>
        <table
          style={{ minWidth: TOTAL_WIDTH }}
          className="w-full table-fixed text-[13px] font-semibold text-content"
        >
          <colgroup>
            {COLUMN_WIDTHS.map((width, i) => (
              <col
                key={i}
                style={{ width: `${(width / TOTAL_WIDTH) * 100}%` }}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-surface-muted text-[12px] font-medium text-content-faint">
            <tr>
              <th className={cn(HEAD_CELL, "text-left")}>등급</th>
              <th className={cn(HEAD_CELL, "text-right")}>낙찰건수</th>
              <th className={cn(HEAD_CELL, "text-right")}>중량</th>
              <th className={cn(HEAD_CELL, "text-right")}>평균단가</th>
              <th className={cn(HEAD_CELL, "text-right")}>최고단가</th>
              <th className={cn(HEAD_CELL, "text-right")}>최저단가</th>
              <th className={cn(HEAD_CELL, "text-right")}>평균 낙찰대금</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows colSpan={COLUMN_WIDTHS.length} rows={8} />
            ) : isError ? (
              <EmptyRow
                colSpan={COLUMN_WIDTHS.length}
                message="시세를 불러오지 못했습니다."
              />
            ) : (
              rows.map((row) => (
                <SummaryRow
                  key={row.key}
                  row={row}
                  selected={row.key === selectedRowKey}
                  onSelect={onSelectRow}
                />
              ))
            )}
          </tbody>
        </table>
      </TableScroll>
    </section>
  );
}

/**
 * 구르는 띠 끝의 그늘 · 가려진 칸이 있을 때만 켠다.
 *
 * 막대를 지운 자리를 메운다. 늘 켜 두면 다 보이는 때에도 잘린 것처럼 보이므로 그쪽에
 * 더 있을 때만 켠다 — 그늘이 있으면 밀어 볼 것이 있다는 뜻이다.
 *
 * 손은 안 받는다 (`pointer-events-none`) · 그늘 밑에 반쯤 걸친 칸도 눌려야 한다.
 */
function ScrollShade({
  side,
  show,
}: {
  side: "left" | "right";
  show: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 w-8 transition-opacity duration-150",
        side === "left"
          ? "left-0 bg-gradient-to-r from-surface to-transparent"
          : "right-0 bg-gradient-to-l from-surface to-transparent",
        show ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

function SummaryRow({
  row,
  selected,
  onSelect,
}: {
  row: MarketRow;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  /*
   * 낙찰이 없던 등급 · 줄은 그대로 두고 글자만 물린다. 지우면 부위마다 줄 자리가
   * 어긋나고, 똑같이 진하게 두면 「-」 일곱 줄이 값 있는 줄을 덮는다.
   */
  const empty = row.count === 0;
  return (
    <tr
      {...{ [MARKET_ROW_ATTR]: row.key }}
      onClick={() => onSelect(row.key)}
      aria-selected={selected}
      className={cn(
        "cursor-pointer border-b border-line-soft transition-colors",
        selected
          ? "bg-surface-accent hover:bg-surface-accent"
          : "hover:bg-surface-muted",
      )}
    >
      <td
        className={cn(CELL, "text-left", empty ? "text-content-faint" : null)}
      >
        {row.label}
      </td>
      {empty ? (
        /* 「-」 일곱 칸 대신 한 마디 · 빈 줄이 값 있는 줄을 덮지 않게 */
        <td className={cn(CELL, "text-left text-content-ghost")} colSpan={6}>
          낙찰 없음
        </td>
      ) : (
        <>
          <td className={cn(CELL, "text-right text-content-mid")}>
            <Measured value={row.count.toLocaleString("ko-KR")} unit="건" />
          </td>
          <td className={cn(CELL, "text-right")}>
            <Measured
              value={row.avgWeight > 0 ? row.avgWeight.toFixed(1) : "-"}
              unit="kg"
              className="font-bold"
            />
          </td>
          <td className={cn(CELL, "text-right")}>
            <Measured
              value={formatKrw(row.avgPrice)}
              unit="원"
              className="font-bold"
            />
          </td>
          {/* 양 끝은 평균보다 한 톤 물린다 · 주인공은 가운데 평균단가다 */}
          <td className={cn(CELL, "text-right text-content-mid")}>
            <Measured value={formatKrw(row.maxPrice)} unit="원" />
          </td>
          <td className={cn(CELL, "text-right text-content-mid")}>
            <Measured value={formatKrw(row.minPrice)} unit="원" />
          </td>
          <td className={cn(CELL, "text-right")}>
            <Measured
              value={row.avgAmount > 0 ? formatKrw(row.avgAmount) : "-"}
              unit="원"
              className="font-bold"
            />
          </td>
        </>
      )}
    </tr>
  );
}
