"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { usePersistedView } from "@/hooks/usePersistedView";

/**
 * 사이드 레일이 고르는 화면 · 같은 자료를 두 각도에서 본다.
 *
 *  - `market` **시세**     · 시장이 얼마에 거래됐나 (부위별 시계열 + 일자별 표)
 *  - `stats`  **경매통계** · 일자·월·해를 하나 집어 그 구간만 본다
 *
 * 낙찰분석(`myWins`)·형질통계(`traits`)·거래처(`partners`) 셋은 걷어냈다. 앞의 둘은
 * 경매통계가 월·해 탭을 들면서 같은 일을 하게 됐고 — 같은 질문에 두 화면을 두면 어느
 * 쪽 숫자가 맞는지부터 대조하게 된다 — 거래처는 통계 안의 한 축으로 들어갔다. 「딴
 * 것을 어디로 보냈나」 는 제 화면이 필요한 질문이 아니라 날·달·해를 보는 눈에 끼우는
 * 거름망이라, 경매통계 머리의 거래처 고르개가 됐다.
 *
 * 남은 둘 다 제 머리에 기간 고르개를 들고 있어 조회기간 띠는 아예 없앴다. 시세는
 * 730일치를 받아 1M·3M·1Y 로 잘라 보고, 경매통계는 달력과 막대가 곧 기간이다.
 */
export const INSIGHT_VIEWS = ["market", "stats"] as const;

export type InsightView = (typeof INSIGHT_VIEWS)[number];

/**
 * 담아 둔 화면 이름이 아직 있는 것인가.
 *
 * 화면 이름이 바뀌면 브라우저에 남은 옛 이름이 어느 가지에도 안 걸려 본문이 통째로
 * 빈 채로 뜬다 — 레일은 멀쩡히 서 있는데 가운데만 비어서, 고장인지 자료가 없는
 * 것인지 구별이 안 된다. 되살릴 때 한 번 거른다.
 */
const isInsightView = (value: unknown): value is InsightView =>
  INSIGHT_VIEWS.includes(value as InsightView);

interface InsightPrefsState {
  view: InsightView;
  setView: (view: InsightView) => void;

  /**
   * 육량등급(A·B·C)을 한 줄로 합쳐 볼지 · 기본은 갈라 둔다.
   *
   * 같은 1++(9) 라도 A 와 C 는 단가가 갈리는데, 합쳐 둔 값만 보면 그 차이가
   * 평균 하나에 묻힌다. 육질만 견주고 싶은 날은 눌러서 합친다.
   *
   * 화면 바깥에 담는 건 이것이 「무엇을 보느냐」 가 아니라 「어떻게 보느냐」 라서다
   * — 부위를 넘길 때마다 원래대로 돌아가면 매번 다시 눌러야 한다.
   */
  yieldUnified: boolean;
  setYieldUnified: (unified: boolean) => void;

  /**
   * 차트만 띄워 창 높이를 다 쓴다 · 아래 일자별 표는 접힌다.
   *
   * 표 쪽에는 같은 단추가 없다. 차트를 키우는 건 「선을 더 펴서 본다」 는 뜻이라
   * 키운 만큼 더 읽히지만, 표는 키워 봐야 같은 줄이 더 보일 뿐이고 그건 아래로
   * 미는 것으로 이미 된다.
   */
  chartOnly: boolean;
  toggleChartOnly: () => void;
}

export const useInsightPrefs = create<InsightPrefsState>()(
  persist(
    (set) => ({
      view: "market",
      setView: (view) => set({ view }),

      yieldUnified: false,
      setYieldUnified: (yieldUnified) => set({ yieldUnified }),

      chartOnly: false,
      toggleChartOnly: () => set((s) => ({ chartOnly: !s.chartOnly })),
    }),
    {
      name: "insight-prefs",
      storage: createJSONStorage(() => localStorage),
      /*
       * 고른 화면이 곧 「무엇을 그리느냐」 라 바로 되살리면 안 된다. 서버가 그린
       * 시세와 담아 둔 경매통계가 어긋나 하이드레이션이 깨진다. 전체보기도 마찬가지로
       * 판 하나를 통째로 접는다 (경매내역 `useHistoryPrefs` 와 같은 수).
       */
      skipHydration: true,
      merge: (persisted, current) => {
        const next = {
          ...current,
          ...(persisted as Partial<InsightPrefsState>),
        };
        return isInsightView(next.view) ? next : { ...next, view: "market" };
      },
    },
  ),
);

/* effect 안에서 쓰는 것들 · 모듈 바깥에 세워 둬야 매 그림마다 안 바뀐다 */
const rehydrate = () => useInsightPrefs.persist.rehydrate();
const setView = (view: InsightView) => useInsightPrefs.setState({ view });

/**
 * 저장값 되살리기 · `skipHydration` 이라 이걸 부르지 않으면 늘 시세로 뜬다.
 *
 * 머리 메뉴가 `?view=stats` 로 집어 주면 되살린 뒤에 그걸 얹는다 (`usePersistedView`).
 */
export function useInsightPrefsHydration() {
  usePersistedView({ rehydrate, setView, isView: isInsightView });
}
