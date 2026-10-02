"use client";

import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { useMeasure } from "react-use";
import { cn } from "@/lib/utils";
import { PartMarketChart } from "@/features/live-auction/components/PartMarketChart";
import { PaneFocusButton } from "@/features/live-auction/components/PaneFocusButton";
import { RoomStackSplitter } from "@/features/live-auction/components/RoomStackSplitter";
import type { YieldGrade } from "@/features/live-auction/lib/buildPartPriceSeries";
import {
  CHART_MIN_HEIGHT,
  DAILY_DEFAULT_HEIGHT,
  DAILY_MAX_HEIGHT,
  DAILY_MIN_HEIGHT,
  useInsightPrefs,
} from "../hooks/useInsightPrefs";
import { MarketDailyTable } from "./MarketDailyTable";

/** 차트와 일자별 표 사이 틈 · 이 자리를 눈금(`RoomStackSplitter`)이 그대로 쓴다 */
const STACK_SPLITTER_HEIGHT = 8;

export interface MarketSeriesPaneProps {
  /** 왼쪽 표에서 짚은 부위 · 없으면 차트가 빈 채로 선다 */
  partName: string | null;
  /** 짚은 줄의 등급 (`1++(9)` 꼴) · 차트의 기준 선이 된다 */
  grade: string | null;
  /** 짚은 줄의 육량등급 · 통합 중이면 null */
  yieldGrade: YieldGrade | null;
  /** 머리에 적을 등급 이름 (`1++A(9)`) */
  gradeLabel: string | null;
  /** 표와 함께 쥐는 「육량등급 통합」 · 어느 쪽을 눌러도 양쪽이 움직인다 */
  yieldUnified: boolean;
  onYieldUnifiedChange: (unified: boolean) => void;

  style?: CSSProperties;
  className?: string;
  headerAction?: ReactNode;
}

/**
 * 시세 방 오른쪽 열 · 위에 차트, 아래에 그 등급의 일자별 시세.
 *
 * 둘은 같은 자료를 두 말로 한다. 차트가 모양("두 달째 내리막")을, 표가 값("9월 30일
 * 네 건 95,550원")을 말한다. 입찰가를 정하는 순간에는 둘 다 필요한데, 차트만 있으면
 * 크로스헤어로 한 점씩 짚어 보는 수밖에 없고 그래서는 세 날을 견줄 수가 없다.
 *
 * 받아 오는 것은 한 번이다. 표가 차트와 **같은 질의 열쇠**를 쓰므로 (같은 부위·등급·
 * 육량·730일) 캐시를 그대로 나눠 쓴다 — 아래 표가 붙었다고 서버를 한 번 더 다녀오지
 * 않는다.
 *
 * 높이는 **일자별 표가 px 로** 쥐고 차트가 남는 만큼을 가져간다. 표는 몇 줄 보이느냐가
 * 전부라 어느 선부터는 더 받아도 그만이지만, 차트는 받은 만큼 세로축이 펴져 같은
 * 등락이 더 또렷해진다.
 *
 * 제 부위 고르개는 없다. 예전엔 머리에 부위 pill 이 있었는데, 표에도 부위가 있어 한
 * 가지를 두 군데서 고르는 꼴이었다 — 둘이 어긋나면 어느 쪽이 참인지 매번 확인해야 했다.
 */
export const MarketSeriesPane = forwardRef<
  HTMLDivElement,
  MarketSeriesPaneProps
>(function MarketSeriesPane(
  {
    partName,
    grade,
    yieldGrade,
    gradeLabel,
    yieldUnified,
    onYieldUnifiedChange,
    style,
    className,
    headerAction,
  },
  ref,
) {
  const dailyHeight = useInsightPrefs((s) => s.dailyHeight);
  const setDailyHeight = useInsightPrefs((s) => s.setDailyHeight);
  const resetDailyHeight = useInsightPrefs((s) => s.resetDailyHeight);
  const focus = useInsightPrefs((s) => s.focus);
  const toggleFocus = useInsightPrefs((s) => s.toggleFocus);

  /*
   * 잡아 둔 높이를 지금 창에 맞춰 깎는다 · 저장값은 건드리지 않아 창을 다시 키우면
   * 원래 자리로 돌아온다 (가로 눈금과 같은 셈).
   */
  const [colRef, { height: colHeight }] = useMeasure<HTMLDivElement>();
  const maxDailyHeight =
    colHeight > 0
      ? Math.max(
          DAILY_MIN_HEIGHT,
          Math.min(
            DAILY_MAX_HEIGHT,
            Math.round(colHeight) - CHART_MIN_HEIGHT - STACK_SPLITTER_HEIGHT,
          ),
        )
      : DAILY_MAX_HEIGHT;
  const effectiveDailyHeight = Math.min(dailyHeight, maxDailyHeight);

  /* 1열은 높이를 재는 쪽과 자리를 옮기는 쪽이 같은 노드를 봐야 한다 */
  const setRefs = (el: HTMLDivElement | null) => {
    colRef(el);
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  const chartFocused = focus === "chart";
  const dailyFocused = focus === "daily";

  return (
    <div ref={setRefs} style={style} className={cn("flex flex-col", className)}>
      {dailyFocused ? null : (
        <PartMarketChart
          partName={partName}
          listing={null}
          gradeOverride={grade}
          yieldOverride={yieldGrade}
          yieldUnified={yieldUnified}
          onYieldUnifiedChange={onYieldUnifiedChange}
          height="fill"
          className="min-h-0 flex-1"
          headerAction={
            <span className="flex items-center">
              <PaneFocusButton
                on={chartFocused}
                label="시세 차트"
                tone="card"
                onToggle={() => toggleFocus("chart")}
              />
              {headerAction}
            </span>
          }
        />
      )}

      {/* 한쪽을 키운 동안에는 나눌 것이 없으므로 눈금도 세우지 않는다 */}
      {focus === "none" ? (
        <RoomStackSplitter
          height={effectiveDailyHeight}
          sizedBelow
          defaultHeight={DAILY_DEFAULT_HEIGHT}
          label="차트와 일자별 시세 사이 높이"
          onResize={(px) => setDailyHeight(px, maxDailyHeight)}
          onReset={resetDailyHeight}
        />
      ) : null}

      {chartFocused ? null : (
        <MarketDailyTable
          partName={partName}
          grade={grade}
          yieldGrade={yieldGrade}
          gradeLabel={gradeLabel}
          style={dailyFocused ? undefined : { height: effectiveDailyHeight }}
          className={dailyFocused ? "min-h-0 flex-1" : "shrink-0"}
          headerAction={
            <PaneFocusButton
              on={dailyFocused}
              label="일자별 시세"
              tone="card"
              onToggle={() => toggleFocus("daily")}
            />
          }
        />
      )}
    </div>
  );
});
