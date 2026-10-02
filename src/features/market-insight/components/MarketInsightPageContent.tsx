"use client";

import { useCallback, useState, type ReactNode } from "react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { MainHeader } from "@/features/main/components/MainHeader";
import {
  CANVAS_BG_CLASS,
  PAGE_GUTTER_CLASS,
} from "@/features/live-auction/constants/surface";
import { PeriodFilter } from "@/features/history/components/PeriodFilter";
import {
  useInsightPrefs,
  useInsightPrefsHydration,
} from "../hooks/useInsightPrefs";
import { InsightSideRail, insightShellClass } from "./InsightSideRail";
import { MarketRoom } from "./MarketRoom";
import { MyWinsView } from "./MyWinsView";
import { InsightPlaceholderView } from "./InsightPlaceholderView";

const initialPeriod = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
  return { startDate: weekAgo, endDate: today };
};

/**
 * `/insight` 분석·통계 PC 페이지 본문.
 *
 * 사이드 레일이 네 화면을 고른다 (`InsightSideRail`) · 시세 / 낙찰분석 / 거래처 /
 * 형질통계. 기간은 넷이 함께 쓴다 — 각도를 바꿀 때마다 다시 잡아야 하면 같은 기간을
 * 네 번 입력하는 일이 된다.
 *
 * **고르개가 서는 자리는 화면마다 다르다.** 시세 말고 셋은 판이 하나뿐이라 맨 위
 * 띠가 곧 그 판의 머리다. 시세는 표와 차트 두 판이 나란히 선 자리인데, 기간이
 * 정하는 건 왼쪽 표뿐이고 차트는 제 기간 토글로 몇 달 치 흐름을 그린다 — 맨 위에
 * 두면 둘 다 거느리는 것으로 읽혀 「전일」 을 눌렀는데 차트가 반 년을 그대로 그리는
 * 꼴이 된다. 그래서 시세에서는 고르개가 표 머리 안으로 들어간다.
 *
 * 기간은 draft(period) / applied(searchPeriod) 2단이다. 프리셋을 누르면 바로
 * 반영하고, 날짜를 직접 고친 것은 [조회] 로 못 박는다 — 날짜 칸을 한 글자씩 고치는
 * 동안 표가 네 번 다시 그려지지 않게.
 */
export function MarketInsightPageContent() {
  useInsightPrefsHydration();
  const view = useInsightPrefs((s) => s.view);

  const [period, setPeriod] = useState(initialPeriod);
  const [searchPeriod, setSearchPeriod] = useState(period);

  const handleSearch = useCallback(() => {
    setSearchPeriod(period);
  }, [period]);

  return (
    <Shell>
      {view === "market" ? null : (
        <PeriodFilter
          startDate={period.startDate}
          endDate={period.endDate}
          onChange={setPeriod}
          onSearch={handleSearch}
          className="shrink-0"
        />
      )}

      {view === "market" ? (
        <MarketRoom
          startDate={searchPeriod.startDate}
          endDate={searchPeriod.endDate}
          period={{
            startDate: period.startDate,
            endDate: period.endDate,
            onChange: setPeriod,
            onSearch: handleSearch,
          }}
        />
      ) : null}

      {/*
       * 시세 말고 셋은 세로로 긴 내용이라 제 판 안에서 구른다 — 창은 한 화면에
       * 묶여 있다 (경매내역 상장표와 같은 셈).
       */}
      {view === "myWins" ? (
        <Scroller>
          <MyWinsView
            startDate={searchPeriod.startDate}
            endDate={searchPeriod.endDate}
          />
        </Scroller>
      ) : null}

      {view === "partners" ? (
        <Scroller>
          <InsightPlaceholderView
            title="거래처 분석"
            summary="딴 것을 어디로 보냈는지 거래처 쪽에서 되짚는 자리입니다."
            items={[
              "거래처별 물량·금액·부위 쏠림",
              "기간별 추이 · 늘어난 곳과 끊긴 곳",
              "배송지시에서 아직 안 정한 것",
            ]}
          />
        </Scroller>
      ) : null}

      {view === "traits" ? (
        <Scroller>
          <InsightPlaceholderView
            title="형질 통계"
            summary="등급·근내지방도·육량이 값과 어떻게 맞물리는지 보는 자리입니다."
            items={[
              "육질등급 × 근내지방도 단가 분포",
              "육량등급(A·B·C)별 중량·단가",
              "도축장·출하월에 따른 형질 차이",
            ]}
          />
        </Scroller>
      ) : null}
    </Shell>
  );
}

/** 세로로 긴 화면이 쓰는 구르는 자리 · 바깥 높이는 창에 묶여 있다 */
function Scroller({ children }: { children: ReactNode }) {
  return <TableScroll>{children}</TableScroll>;
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
