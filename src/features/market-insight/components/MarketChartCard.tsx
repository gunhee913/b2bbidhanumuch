"use client";

import { useMemo, useState } from "react";
import { PartMarketChart } from "@/features/live-auction/components/PartMarketChart";
import { getPartGroupOrder } from "@/features/live-auction/lib/partGrouping";
import { CompactFilterPill } from "@/features/live-auction/components/CompactFilterPill";

/**
 * 시세·동향 상단 차트 카드.
 *
 * `PartMarketChart` 를 그대로 사용하되, 헤더 좌측 slot(`headerLeft`) 에 부위 필터 pill 을
 * 주입해 부위 title 과 filter 를 하나의 행으로 통합.
 */
export function MarketChartCard() {
  const partGroups = useMemo(() => getPartGroupOrder(), []);
  const [selectedPart, setSelectedPart] = useState<string>(
    partGroups[0] ?? "등심",
  );

  return (
    <PartMarketChart
      partName={selectedPart}
      listing={null}
      height={520}
      headerLeft={
        <CompactFilterPill
          label="부위"
          value={selectedPart}
          onChange={(v) => {
            if (v) setSelectedPart(v);
          }}
          options={partGroups}
          allowAll={false}
        />
      }
    />
  );
}
