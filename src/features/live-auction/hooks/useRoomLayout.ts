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

interface RoomLayoutState {
  focus: RoomFocus;
  /** 2열(표) 너비 px · 1열은 남는 폭을 전부 가져간다 */
  tableWidth: number;
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
}

const clampWidth = (px: number) =>
  Math.min(TABLE_MAX_WIDTH, Math.max(TABLE_MIN_WIDTH, Math.round(px)));

/**
 * 상세 방 레이아웃 · 어느 판을 키웠는지와 좌우 나눔 위치.
 *
 * 세로(어느 판이 높이를 갖나)와 가로(열 나눔)를 따로 둔다. 확대 버튼이 열 너비까지
 * 건드리면 "사진을 눌렀는데 표가 왜 줄지" 가 되고, 손으로 잡아 옮긴 자리를 덮어써 버린다.
 * 너비는 눈금을 잡은 사람 것이다.
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
      toggleFocus: (target) =>
        set({ focus: get().focus === target ? "none" : target }),
      setTableWidth: (px) => set({ tableWidth: clampWidth(px) }),
      nudgeTableWidth: (delta, max) =>
        set((state) => ({
          tableWidth: Math.min(max, clampWidth(state.tableWidth + delta)),
        })),
      resetTableWidth: () => set({ tableWidth: TABLE_DEFAULT_WIDTH }),
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
