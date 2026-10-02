"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PaneOrder } from "@/features/live-auction/hooks/useRoomLayout";

/**
 * 사이드 레일이 고르는 화면 · 같은 조회기간을 네 각도에서 본다.
 *
 *  - `market`   **시세**     · 시장이 얼마에 거래됐나 (부위×등급 표 + 그 부위 시계열)
 *  - `myWins`   **낙찰분석** · 그중 내가 딴 것은 어떤 것들인가
 *  - `partners` **거래처**   · 딴 것을 어디로 보냈나
 *  - `traits`   **형질통계** · 등급·근내지방도·육량이 값과 어떻게 맞물리나
 *
 * 기간은 넷이 함께 쓰고 보는 각도만 갈린다 (경매내역이 날짜를 함께 쓰는 것과 같다).
 */
export type InsightView = "market" | "myWins" | "partners" | "traits";

/** 시세 방의 두 판 · 좌우로 놓이고 자리를 맞바꿀 수 있다 */
export type InsightColumn = "table" | "chart";

/**
 * 표 판의 폭 한계 · px 를 쥐는 쪽은 표다.
 *
 * 차트가 아니라 표가 쥐는 건 둘이 폭을 쓰는 방식이 달라서다. 표는 여섯 열이 안
 * 잘리는 바닥이 있고 그 위로는 넓어져 봐야 글자 사이만 벌어지지만, 차트는 받은
 * 만큼 더 긴 기간을 그려 낸다 — 남는 폭은 차트 쪽에 주는 것이 늘 이득이다.
 *
 * 최소 600 은 일곱 열(576)에 테두리 둘과 여유 22 를 더한 폭이다. 여유는 막대 자리가
 * 아니다 — 막대는 내용 위에 뜬다(`TableScroll`). 그 막대가 맨 오른쪽 「평균 낙찰대금」
 * 숫자 위에 내려앉지 않을 만큼만 비워 둔 것이다. 최대 1000 은 넘겨 봐야 열 간격만
 * 벌어지는 지점 (경매장 상장표와 같은 값).
 */
export const TABLE_MIN_WIDTH = 600;
export const TABLE_MAX_WIDTH = 1000;
export const TABLE_DEFAULT_WIDTH = 700;

/** 차트 판이 양보하지 않는 폭 · 기간·집계 토글이 아랫줄로 안 꺾이는 폭 */
export const CHART_MIN_WIDTH = 520;

/**
 * 오른쪽 열에 쌓인 두 판 중 **일자별 표**가 px 를 쥔다.
 *
 * 차트가 아니라 표가 쥐는 건 남는 높이를 누가 써야 더 이득인가의 문제다. 표는 몇
 * 줄을 보이느냐가 전부라 일정 높이를 넘기면 더 받아도 그만이지만, 차트는 받은 만큼
 * 세로축이 펴져 같은 등락이 더 또렷해진다.
 *
 * 최소 108 은 머리줄 + 두 줄이 서는 바닥, 최대 480 은 넘겨 봐야 차트만 눌리는 지점.
 */
export const DAILY_MIN_HEIGHT = 108;
export const DAILY_MAX_HEIGHT = 480;
export const DAILY_DEFAULT_HEIGHT = 208;

/** 차트가 양보하지 않는 높이 · 캔버스가 띠로 뭉개지지 않는 바닥 */
export const CHART_MIN_HEIGHT = 240;

/** 전체보기로 키운 판 · `"none"` 이면 둘이 눈금을 사이에 두고 나눠 갖는다 */
export type InsightFocus = "none" | "chart" | "daily";

interface InsightPrefsState {
  view: InsightView;
  setView: (view: InsightView) => void;

  /**
   * 시세 방 두 판의 폭과 차례 · 경매내역 두 열(`useHistoryPrefs`)과 같은 짜임이다.
   *
   * 화면을 갈아탈 때마다 풀리면 시세로 돌아올 때마다 눈금을 다시 맞춰야 하므로
   * 화면 바깥에 둔다.
   */
  tableWidth: number;
  columnOrder: PaneOrder<InsightColumn>;
  setTableWidth: (px: number) => void;
  resetTableWidth: () => void;
  swapColumnOrder: () => void;

  /**
   * 육량등급(A·B·C)을 한 줄로 합쳐 볼지 · 기본은 갈라 둔다.
   *
   * 같은 1++(9) 라도 A 와 C 는 단가가 갈리는데, 합쳐 둔 값만 보면 그 차이가
   * 평균 하나에 묻힌다. 육질만 견주고 싶은 날은 눌러서 합친다.
   *
   * 화면 바깥에 담는 건 이것이 「무엇을 보느냐」 가 아니라 「어떻게 보느냐」 라서다
   * — 기간을 바꾸거나 부위를 넘길 때마다 원래대로 돌아가면 매번 다시 눌러야 한다.
   */
  yieldUnified: boolean;
  setYieldUnified: (unified: boolean) => void;

  /**
   * 낙찰이 없던 등급 줄을 감출지 · 기본은 보인다.
   *
   * 표는 일곱 등급(갈라 보면 스물한 줄)을 늘 세운다 — 줄 자리가 부위마다 같아야
   * 방향키로 훑으며 차트를 볼 수 있고, 「이 부위 1++(9) 는 이번 기간에 없었다」 도
   * 봐야 하는 사실이라서다. 다만 값 있는 줄만 추려 견주고 싶은 때가 따로 있어
   * 감추는 길을 열어 둔다.
   */
  hideEmptyRows: boolean;
  setHideEmptyRows: (hide: boolean) => void;

  /** 차트와 일자별 표가 나눠 갖는 높이 · px 를 쥐는 쪽은 표다 */
  dailyHeight: number;
  setDailyHeight: (px: number, max: number) => void;
  resetDailyHeight: () => void;

  /** 전체보기 · 같은 것을 다시 누르면 풀린다 (남은 판의 단추가 곧 되돌리기다) */
  focus: InsightFocus;
  toggleFocus: (target: Exclude<InsightFocus, "none">) => void;
}

const clampTableWidth = (px: number) =>
  Math.min(TABLE_MAX_WIDTH, Math.max(TABLE_MIN_WIDTH, Math.round(px)));

/** 창이 낮으면 상한이 `max` 로 더 내려온다 · 열 높이는 창 크기에 달려 있다 */
const clampDailyHeight = (px: number, max: number) =>
  Math.min(
    Math.max(DAILY_MIN_HEIGHT, Math.min(DAILY_MAX_HEIGHT, max)),
    Math.max(DAILY_MIN_HEIGHT, Math.round(px)),
  );

export const useInsightPrefs = create<InsightPrefsState>()(
  persist(
    (set) => ({
      view: "market",
      setView: (view) => set({ view }),

      tableWidth: TABLE_DEFAULT_WIDTH,
      columnOrder: ["table", "chart"],
      setTableWidth: (px) => set({ tableWidth: clampTableWidth(px) }),
      resetTableWidth: () => set({ tableWidth: TABLE_DEFAULT_WIDTH }),
      swapColumnOrder: () =>
        set((s) => ({ columnOrder: [s.columnOrder[1], s.columnOrder[0]] })),

      yieldUnified: false,
      setYieldUnified: (yieldUnified) => set({ yieldUnified }),

      hideEmptyRows: false,
      setHideEmptyRows: (hideEmptyRows) => set({ hideEmptyRows }),

      dailyHeight: DAILY_DEFAULT_HEIGHT,
      setDailyHeight: (px, max) =>
        set({ dailyHeight: clampDailyHeight(px, max) }),
      resetDailyHeight: () => set({ dailyHeight: DAILY_DEFAULT_HEIGHT }),

      focus: "none",
      toggleFocus: (target) =>
        set((s) => ({ focus: s.focus === target ? "none" : target })),
    }),
    {
      name: "insight-prefs",
      storage: createJSONStorage(() => localStorage),
      /*
       * 고른 화면이 곧 「무엇을 그리느냐」 라 바로 되살리면 안 된다. 서버가 그린
       * 시세와 담아 둔 낙찰분석이 어긋나 하이드레이션이 깨진다. 잡아 둔 판 폭과
       * 차례도 마찬가지로 격자를 바꾼다 (경매내역 `useHistoryPrefs` 와 같은 수).
       */
      skipHydration: true,
    },
  ),
);

/** 저장값 되살리기 · `skipHydration` 이라 이걸 부르지 않으면 늘 시세로 뜬다 */
export function useInsightPrefsHydration() {
  useEffect(() => {
    void useInsightPrefs.persist.rehydrate();
  }, []);
}
