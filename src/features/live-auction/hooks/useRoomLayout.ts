"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** 1열에서 높이를 독차지하는 판 · `none` 이면 사진과 시세가 나눠 갖는다 */
export type RoomFocus = "none" | "photo" | "chart";

/**
 * 표 열 너비 한계.
 *
 * 최소 640 은 표 9칸 합(개체축 631) 바로 위 — 이 아래로 내리면 칸이 잘린다.
 * 최대 1000 은 넘겨 봐야 열 간격만 벌어져 읽기 나빠지는 지점.
 */
export const TABLE_MIN_WIDTH = 640;
export const TABLE_MAX_WIDTH = 1000;
export const TABLE_DEFAULT_WIDTH = 800;

/**
 * 시세 캔버스 높이 한계.
 *
 * 최소 132 는 하루 등락이 선으로 읽히는 하한 — 더 줄이면 봉이 뭉개져 차트가 아니라 띠가 된다.
 * 최대 520 은 넘겨 봐야 세로만 늘어나고 사진이 그만큼 죽는 지점.
 */
export const CHART_MIN_HEIGHT = 132;
export const CHART_MAX_HEIGHT = 520;
export const CHART_DEFAULT_HEIGHT = 216;

/** 1열 안에 위아래로 쌓이는 두 판 */
export type StackPane = "photo" | "chart";

/** 좌우로 놓이는 두 열 · `stack` 은 사진·시세를 담은 1열 */
export type RoomColumn = "stack" | "table";

/**
 * 자리 차례를 문자열 이름이 아니라 배열로 둔다.
 *
 * `"photo-first"` 같은 이름은 읽을 때마다 「그럼 두 번째는 뭐였지」를 되묻게 하고,
 * 가로·세로 두 벌을 따로 만들어야 한다. 차례 자체를 담으면 그리는 쪽은 받은 순서대로
 * 늘어놓기만 하면 되고, 자리 바꾸기는 뒤집기 한 번이다.
 */
export type PaneOrder<P> = readonly [P, P];

interface RoomLayoutState {
  focus: RoomFocus;
  /** 2열(표) 너비 px · 1열은 남는 폭을 전부 가져간다 */
  tableWidth: number;
  /** 시세 캔버스 높이 px · 사진은 1열에서 남는 높이를 전부 가져간다 */
  chartHeight: number;
  stackOrder: PaneOrder<StackPane>;
  columnOrder: PaneOrder<RoomColumn>;
  /** 같은 판을 또 누르면 원래대로 · 서로 배타적이라 한쪽을 켜면 다른 쪽은 꺼진다 */
  toggleFocus: (target: Exclude<RoomFocus, "none">) => void;
  setTableWidth: (px: number) => void;
  /**
   * 지금 너비에서 `delta` 만큼 · 방향키용.
   * 누르는 족족 직전 값에서 더해야 한다 — 바깥에서 읽은 값으로 계산하면 연타·키 반복 때
   * 같은 값을 여러 번 덮어써서 몇 칸을 눌러도 한 칸만 움직인다.
   */
  nudgeTableWidth: (delta: number, max: number) => void;
  resetTableWidth: () => void;
  setChartHeight: (px: number, max: number) => void;
  /** 지금 높이에서 `delta` 만큼 · 방향키용 · 이유는 `nudgeTableWidth` 와 같다 */
  nudgeChartHeight: (delta: number, max: number) => void;
  resetChartHeight: () => void;
  swapStackOrder: () => void;
  swapColumnOrder: () => void;
}

const clampWidth = (px: number) =>
  Math.min(TABLE_MAX_WIDTH, Math.max(TABLE_MIN_WIDTH, Math.round(px)));

/** 화면이 낮으면 상한이 `max` 로 더 내려온다 · 1열 높이는 창 크기에 따라 달라진다 */
const clampHeight = (px: number, max: number) =>
  Math.min(
    Math.max(CHART_MIN_HEIGHT, Math.min(CHART_MAX_HEIGHT, max)),
    Math.max(CHART_MIN_HEIGHT, Math.round(px)),
  );

/**
 * 상세 방 레이아웃 · 어느 판을 키웠는지 · 나눔 위치 · 판을 늘어놓은 차례.
 *
 * 세로(어느 판이 높이를 갖나)와 가로(열 나눔)를 따로 둔다. 확대 버튼이 열 너비까지
 * 건드리면 "사진을 눌렀는데 표가 왜 줄지" 가 되고, 손으로 잡아 옮긴 자리를 덮어써 버린다.
 * 너비는 눈금을 잡은 사람 것이다.
 *
 * 차례도 크기와 섞지 않는다. 자리를 바꿨다고 잡아 둔 폭·높이가 초기화되면, 잠깐 보려고
 * 옮긴 사람이 눈금을 처음부터 다시 맞춰야 한다.
 *
 * 개체를 넘길 때마다 풀리면 200두를 훑는 동안 매번 다시 맞춰야 하므로 방 바깥에 둔다.
 * 첫 렌더는 서버와 같은 기본값으로 그리고 마운트 뒤에 되살린다 — 이 값이 그리드 열 폭을
 * 바꾸기 때문에 하이드레이션이 어긋나면 안 된다.
 */
export const useRoomLayout = create<RoomLayoutState>()(
  persist(
    (set, get) => ({
      focus: "none",
      tableWidth: TABLE_DEFAULT_WIDTH,
      chartHeight: CHART_DEFAULT_HEIGHT,
      stackOrder: ["photo", "chart"],
      columnOrder: ["stack", "table"],
      toggleFocus: (target) =>
        set({ focus: get().focus === target ? "none" : target }),
      setTableWidth: (px) => set({ tableWidth: clampWidth(px) }),
      nudgeTableWidth: (delta, max) =>
        set((state) => ({
          tableWidth: Math.min(max, clampWidth(state.tableWidth + delta)),
        })),
      resetTableWidth: () => set({ tableWidth: TABLE_DEFAULT_WIDTH }),
      setChartHeight: (px, max) => set({ chartHeight: clampHeight(px, max) }),
      nudgeChartHeight: (delta, max) =>
        set((state) => ({
          chartHeight: clampHeight(state.chartHeight + delta, max),
        })),
      resetChartHeight: () => set({ chartHeight: CHART_DEFAULT_HEIGHT }),
      swapStackOrder: () =>
        set((state) => ({
          stackOrder: [state.stackOrder[1], state.stackOrder[0]],
        })),
      swapColumnOrder: () =>
        set((state) => ({
          columnOrder: [state.columnOrder[1], state.columnOrder[0]],
        })),
    }),
    {
      name: "live-auction-room-layout",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** 마운트 뒤 저장값 복원 · 상세 방에서 한 번만 부른다 */
export function useRoomLayoutHydration() {
  useEffect(() => {
    void useRoomLayout.persist.rehydrate();
  }, []);
}
