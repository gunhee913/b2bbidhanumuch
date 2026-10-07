"use client";

import { useMemo, useState } from "react";
import { TableScroll } from "@/components/ui/table-scroll";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";
import { useInsightPrefs } from "../hooks/useInsightPrefs";
import { useMarketKeys } from "../hooks/useMarketKeys";
import { MarketSeriesPane } from "./MarketSeriesPane";

/**
 * 읽기 좋은 한 열의 천장.
 *
 * 창이 넓어진 만큼 차트를 늘려 봐야 같은 선이 옆으로 늘어날 뿐이고, 아래 일자별
 * 표는 일곱 열이 다 서고 나면 남는 폭을 글자 사이에 흘린다. 1100 을 넘기면 둘 다
 * 그 지경이라 거기서 멈추고 가운데에 세운다.
 */
const COLUMN_MAX_WIDTH = 1100;

/**
 * 시세 화면 · 위에 시세 차트, 아래에 그 등급의 일자별 시세.
 *
 * 예전엔 왼쪽에 「부위별 시세」 표가 나란히 섰다. 한 기간을 등급으로 가른 표였는데,
 * 오른쪽 차트·일자별 표와 견줄 수 있는 값이 아니라 (쪽은 기간 평균, 쪽은 날짜별
 * 추세) 실제로는 부위와 등급을 고르는 노릇만 하고 있었다. 그 일을 차트 머리가 직접
 * 받으면 — 부위는 제목 자리의 쪽지, 등급은 둘째 줄의 탭 — 같은 생김새의 일곱 열짜리
 * 표가 한 화면에 둘 설 까닭이 없어진다.
 *
 * 조회기간 고르개도 함께 내려갔다. 차트와 일자별 표는 둘 다 730일치를 받아 제 기간
 * 토글(1M·3M·6M·1Y·전체)로 잘라 보므로, 기간을 정하던 상대가 표뿐이었다.
 *
 * **아래로 흐른다.** 두 판이 창 높이를 눈금으로 나눠 갖던 것을 접었다. 나눠 가지면
 * 일자별 표가 늘 대여섯 줄에서 끊기는데, 그 표는 날을 **여럿 포개 놓고 견주라고**
 * 있는 것이라 끊긴 만큼 쓸모가 깎인다. 차트는 제 높이를 갖고 표는 끝까지 펴 둔 뒤,
 * 미는 일은 화면 바깥이 맡는다.
 */
export function MarketRoom() {
  const parts = useMemo(() => getPartGroupOrder(), []);
  const [selectedPart, setSelectedPart] = useState<string>(
    () => parts[0] ?? "등심",
  );

  const yieldUnified = useInsightPrefs((s) => s.yieldUnified);
  const setYieldUnified = useInsightPrefs((s) => s.setYieldUnified);
  const chartOnly = useInsightPrefs((s) => s.chartOnly);

  useMarketKeys({ parts, selectedPart, onSelectPart: setSelectedPart });

  const pane = (
    <MarketSeriesPane
      className="mx-auto w-full"
      style={{ maxWidth: COLUMN_MAX_WIDTH }}
      parts={parts}
      partName={selectedPart}
      onSelectPart={setSelectedPart}
      yieldUnified={yieldUnified}
      onYieldUnifiedChange={setYieldUnified}
    />
  );

  /* 차트만 띄운 동안에는 흐를 것이 없다 · 창 높이에 맞춰 캔버스가 늘어나야 한다 */
  if (chartOnly) {
    return <div className="flex min-h-0 flex-1 flex-col">{pane}</div>;
  }

  return <TableScroll>{pane}</TableScroll>;
}
