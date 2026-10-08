"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MainHeader } from "@/features/main/components/MainHeader";
import {
  CANVAS_BG_CLASS,
  PAGE_GUTTER_CLASS,
} from "@/features/live-auction/constants/surface";
import {
  useInsightPrefs,
  useInsightPrefsHydration,
} from "../hooks/useInsightPrefs";
import { InsightSideRail, insightShellClass } from "./InsightSideRail";
import { MarketRoom } from "./MarketRoom";
import { AuctionStatsRoom } from "./AuctionStatsRoom";

/**
 * `/insight` 시세·통계 PC 페이지 본문.
 *
 * 사이드 레일이 두 화면을 고른다 (`InsightSideRail`) · 시세 / 경매통계.
 *
 * **머리에 기간 띠가 없다.** 남은 둘이 제 기간 고르개를 들고 있어서다 — 시세는
 * 730일치를 받아 제 토글(1M·3M·6M·1Y·전체)로 자르고, 경매통계는 캘린더와 막대가 곧
 * 기간이다. 위에 띠를 두면 아무것도 안 거는 장치가 하나 서 있게 된다. 「전일」 을
 * 눌렀는데 차트는 반 년을 그대로 그리는 꼴이다.
 *
 * 띠를 쓰던 것은 걷어낸 낙찰분석·거래처·형질통계 셋이었다.
 */
export function MarketInsightPageContent() {
  useInsightPrefsHydration();
  const view = useInsightPrefs((s) => s.view);

  return (
    <Shell>
      {view === "market" ? <MarketRoom /> : null}

      {/* 경매통계는 시세와 같이 제 판에 `TableScroll` 을 들고 있다 */}
      {view === "stats" ? <AuctionStatsRoom /> : null}
    </Shell>
  );
}

/**
 * 페이지 껍데기 · 경매장·경매내역·배송지시와 같은 폭·같은 좌우 여백·같은 캔버스.
 *
 * 예전엔 1360(넓은 화면 1600)에서 멈추고 좌우 여백이 `px-8` 이었다. 머리 메뉴로 네
 * 화면을 오가는데 여기만 본문이 안쪽으로 들어와 있어, 경매장에서 넘어오면 화면이 한
 * 번 좁아졌다.
 *
 * **창에는 스크롤을 두지 않는다** (`h-screen overflow-hidden`). 시세 방이 표와
 * 차트를 눈금으로 나눠 갖는 짜임이라, 두 판이 나눌 높이가 먼저 정해져 있어야 한다 —
 * 아래로 흐르는 화면에는 눈금을 세울 바탕이 없다. 구르는 것은 판 안쪽뿐이다
 * (경매장·배송지시·경매내역과 같다).
 *
 * 그래서 바닥글이 없다 — 가둔 높이에 넣을 자리가 없고, 넣으면 차트가 그만큼 깎인다.
 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className={cn("h-screen overflow-hidden", insightShellClass())}>
        <MainHeader fluid />
        <main
          className={cn(
            "flex h-[calc(100vh-48px)] min-h-0 flex-col gap-2 overflow-hidden",
            PAGE_GUTTER_CLASS,
            CANVAS_BG_CLASS,
          )}
        >
          {children}
        </main>
      </div>
      <InsightSideRail />
    </>
  );
}
