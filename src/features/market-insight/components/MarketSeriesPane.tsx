"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { PartMarketChart } from "@/features/live-auction/components/PartMarketChart";
import { PaneFocusButton } from "@/features/live-auction/components/PaneFocusButton";
import type { YieldGrade } from "@/features/live-auction/lib/buildPartPriceSeries";
import {
  formatGradeWithYield,
  GRADE_FILTER_OPTIONS,
} from "@/features/live-auction/lib/grade";
import { useInsightPrefs } from "../hooks/useInsightPrefs";
import { GradeTabs } from "./GradeTabs";
import { MarketDailyTable } from "./MarketDailyTable";
import { PartPicker } from "./PartPicker";

/**
 * 차트가 잡아 두는 높이 · 아래 표와 함께 설 때.
 *
 * 창 높이를 나눠 갖던 것을 px 로 못 박았다. 이제 화면이 아래로 흐르므로 「남는
 * 높이」 라는 것이 없다 — 누군가는 숫자를 들고 있어야 하는데, 받은 만큼 세로축이
 * 펴지는 쪽은 차트다. 420 은 등락이 띠로 뭉개지지 않으면서 아래 표의 첫 서너 줄이
 * 같은 화면에 걸리는 높이다.
 */
const CHART_HEIGHT = 420;

export interface MarketSeriesPaneProps {
  /** 고를 수 있는 부위 · 머리의 쪽지가 세운다 */
  parts: readonly string[];
  partName: string | null;
  onSelectPart: (part: string) => void;
  /** 화면 바깥에 담아 둔 「육량등급 통합」 · 화면을 갈아타도 풀리지 않는다 */
  yieldUnified: boolean;
  onYieldUnifiedChange: (unified: boolean) => void;

  style?: CSSProperties;
  className?: string;
}

/**
 * 시세 화면 · 위에 차트, 아래에 그 등급의 일자별 시세.
 *
 * 둘은 같은 자료를 두 말로 한다. 차트가 모양("두 달째 내리막")을, 표가 값("9월 30일
 * 네 건 95,550원")을 말한다. 입찰가를 정하는 순간에는 둘 다 필요한데, 차트만 있으면
 * 크로스헤어로 한 점씩 짚어 보는 수밖에 없고 그래서는 세 날을 견줄 수가 없다.
 *
 * 받아 오는 것은 한 번이다. 표가 차트와 **같은 질의 열쇠**를 쓰므로 (같은 부위·등급·
 * 육량·730일) 캐시를 그대로 나눠 쓴다 — 아래 표가 붙었다고 서버를 한 번 더 다녀오지
 * 않는다.
 *
 * **고르개는 셋 다 차트 머리에 있다.** 부위는 제목 자리의 쪽지(`PartPicker`),
 * 등급은 둘째 줄 오른쪽의 탭(`GradeTabs`), 기간·집계는 첫째 줄 오른쪽이다. 셋 중
 * 앞의 둘을 이 컴포넌트가 쥐는 건 아래 표가 같은 값을 봐야 하기 때문이다 — 차트
 * 안에 두면 표가 그 선택을 알 길이 없어 위아래가 다른 등급을 그린다.
 *
 * 둘 사이에 눈금이 없다. 화면이 아래로 흐르므로 나눠 가질 높이라는 것이 없고,
 * 아래로 밀면 표가 끝까지 따라 나온다 — 높이를 잡아 주던 까닭 자체가 사라졌다.
 */
export function MarketSeriesPane({
  parts,
  partName,
  onSelectPart,
  yieldUnified,
  onYieldUnifiedChange,
  style,
  className,
}: MarketSeriesPaneProps) {
  const chartOnly = useInsightPrefs((s) => s.chartOnly);
  const toggleChartOnly = useInsightPrefs((s) => s.toggleChartOnly);

  /*
   * 등급을 차트가 아니라 여기가 쥔다 · 차트와 아래 표가 같은 값을 보고 그려야 한다.
   * 차트에는 `gradeOverride`/`yieldOverride` 로 내려보내고, 차트 제 범례는 넘겨받은
   * 고르개가 대신한다 (`gradeControl`).
   */
  const [grade, setGrade] = useState<string>(GRADE_FILTER_OPTIONS[0]);
  const [yieldGrade, setYieldGrade] = useState<YieldGrade>("A");

  /** 합쳐 보는 중이면 육량은 없는 값이다 (A·B·C 를 한 줄로 친 것) */
  const appliedYield = yieldUnified ? null : yieldGrade;

  return (
    <div
      style={style}
      className={cn(
        "flex min-h-0 flex-col gap-2",
        /* 차트만 띄운 동안에는 이 열이 창 높이를 다 받아야 캔버스가 늘어난다 */
        chartOnly && "flex-1",
        className,
      )}
    >
      <PartMarketChart
        partName={partName}
        listing={null}
        gradeOverride={grade}
        yieldOverride={yieldGrade}
        yieldUnified={yieldUnified}
        onYieldUnifiedChange={onYieldUnifiedChange}
        height={chartOnly ? "fill" : CHART_HEIGHT}
        className={chartOnly ? "min-h-0 flex-1" : "shrink-0"}
        partSlot={
          <PartPicker parts={parts} value={partName} onChange={onSelectPart} />
        }
        gradeControl={
          <GradeTabs
            grade={grade}
            onGradeChange={setGrade}
            yieldGrade={yieldGrade}
            onYieldChange={setYieldGrade}
            yieldUnified={yieldUnified}
          />
        }
        headerAction={
          <PaneFocusButton
            on={chartOnly}
            label="시세 차트"
            tone="card"
            onToggle={toggleChartOnly}
          />
        }
      />

      {/*
       * 표에는 전체보기가 없다. 차트를 키우는 것은 「선을 더 펴서 본다」 는 뜻이라
       * 키운 만큼 더 읽히지만, 표는 키워 봐야 같은 줄이 더 보일 뿐인데 그건 아래로
       * 미는 것으로 이미 된다.
       */}
      {chartOnly ? null : (
        <MarketDailyTable
          partName={partName}
          grade={grade}
          yieldGrade={appliedYield}
          gradeLabel={formatGradeWithYield(grade, appliedYield)}
        />
      )}
    </div>
  );
}
