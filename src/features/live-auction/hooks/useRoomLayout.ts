"use client";

import { useEffect } from "react";
import { omit } from "es-toolkit";
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

/**
 * 사진 위에 얹는 겹 · 끌어다 놓은 자리.
 *
 * **px 가 아니라 비율로 담는 이유.** 저장할 값은 「무대 어디쯤」 이지 「왼쪽에서 몇 px」
 * 가 아니다. px 로 담으면 분할선을 당기거나 사진 판을 키우는 순간 무대가 줄어 겹이
 * 바깥으로 나가고, 그 뒤로는 되돌릴 과녁조차 사라진다.
 *
 * 분모는 무대 크기가 아니라 **겹이 움직일 수 있는 범위**(무대 - 겹)다. 무대로 나누면
 * 오른쪽 끝(x=1)이 겹의 왼쪽 모서리를 무대 오른쪽 끝에 놓는 뜻이 되어 통째로 밖으로
 * 나간다. 범위로 나누면 0 은 왼쪽에 딱 붙은 자리, 1 은 오른쪽에 딱 붙은 자리라
 * 0~1 안에 있는 한 겹은 늘 무대 안에 온전히 들어온다.
 */
export interface StagePos {
  x: number;
  y: number;
}

/** 사진 위에 얹는 겹 · 판정 각인과 메모 쪽지 */
export type StageSlot = "stamp" | "note";

export interface StagePlacement {
  pos: StagePos;
  scale: number;
}

/**
 * 겹 배율 한계.
 *
 * 최소 0.8 은 각인 라벨이 7.6px 이 되는 지점 — 더 줄이면 「등지방두께」 가 글자인지
 * 얼룩인지 분간이 안 된다. 최대 2.2 는 넘겨 봐야 사진을 반 넘게 덮어 겹을 띄운 뜻이
 * 사라지는 지점. 무대가 좁으면 상한이 「무대에 들어가는 배율」 로 더 내려온다
 * (그리는 쪽에서 잰다).
 */
export const STAGE_SCALE_MIN = 0.8;
export const STAGE_SCALE_MAX = 2.2;

/**
 * 처음 자리 · 둘이 겹치지 않게 반대 모서리에서 시작한다.
 *
 * 각인이 아래인 건 사진 단면이 가운데에 있어 아래 모서리가 가장 자주 비기 때문이고,
 * 메모가 위인 건 남은 모서리가 거기라서다. 둘 다 아래에서 시작하면 처음 켠 사람이
 * 겹친 상자 둘을 떼어 놓는 일부터 해야 한다.
 */
export const STAGE_PLACEMENT_DEFAULT: Record<StageSlot, StagePlacement> = {
  stamp: { pos: { x: 0, y: 1 }, scale: 1 },
  note: { pos: { x: 0, y: 0 }, scale: 1 },
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * 겹 한 칸 갱신 · 자리는 0~1 안에, 배율은 한계 안에 가둔다.
 *
 * 저장소 밖에 둔 건 배송지시가 같은 겹을 제 저장소에 담기 때문이다 (`StagePlacementScope`).
 * 가두는 규칙이 둘로 갈리면 한쪽에서만 겹이 무대 밖으로 나간다.
 */
export function applyStagePlacement(
  prev: StagePlacement,
  patch: Partial<StagePlacement>,
): StagePlacement {
  return {
    pos: patch.pos
      ? { x: clamp01(patch.pos.x), y: clamp01(patch.pos.y) }
      : prev.pos,
    scale:
      patch.scale == null
        ? prev.scale
        : Math.min(STAGE_SCALE_MAX, Math.max(STAGE_SCALE_MIN, patch.scale)),
  };
}

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
  /**
   * 마감된 부위를 표에서 감춘다 · 남는 건 지금 입찰할 수 있는 행뿐.
   *
   * 크기·차례와 함께 두는 이유는 같다. 회차가 도는 동안 개체를 200두 넘기는데,
   * 개체마다 다시 켜야 하면 켜지 않게 된다.
   */
  hideSettled: boolean;
  /**
   * 등급·업체 거르개 · 고정축을 옮겨도 그대로 남는다.
   *
   * 방 바깥에 두는 까닭은 크기·차례와 같다. 상세 방은 ←/→ 를 누를 때마다 주소가
   * 바뀌어 통째로 다시 서는데, 거르개를 방 안에 두면 1++(9)만 보려고 걸어 놓은 것이
   * 옆 부위로 넘어가는 순간 풀린다 — 열 부위를 훑는 동안 열 번 다시 걸어야 한다.
   *
   * 다만 이것만은 저장하지 않는다(`partialize`). 크기나 차례와 달리 거르개는 「지금
   * 무엇을 찾는 중인가」 라서, 내일 들어왔을 때도 켜져 있으면 상장이 반쯤 사라진
   * 화면을 까닭 모른 채 보게 된다.
   */
  gradeFilter: string;
  companyFilter: string;
  /**
   * 끌어다 놓은 겹의 자리와 크기 · 사진마다 비는 곳이 달라 사람이 정한다.
   *
   * 크기·차례와 같은 칸에 두는 이유도 같다. 개체를 넘길 때마다 처음 자리로 돌아가면
   * 고기가 거기 있는 사진에서는 매번 다시 끌어야 한다.
   */
  stage: Record<StageSlot, StagePlacement>;
  /** 같은 판을 또 누르면 원래대로 · 서로 배타적이라 한쪽을 켜면 다른 쪽은 꺼진다 */
  toggleFocus: (target: Exclude<RoomFocus, "none">) => void;
  /** 끌기가 끝날 때 한 번만 부른다 · 옮기는 내내 부르면 localStorage 를 매 프레임 쓴다 */
  setStagePlacement: (slot: StageSlot, patch: Partial<StagePlacement>) => void;
  /** 자리와 크기를 함께 되돌린다 · 「처음으로」 가 둘로 나뉘면 한쪽만 틀어진 채 남는다 */
  resetStagePlacement: (slot: StageSlot) => void;
  setTableWidth: (px: number) => void;
  resetTableWidth: () => void;
  setChartHeight: (px: number, max: number) => void;
  resetChartHeight: () => void;
  swapStackOrder: () => void;
  swapColumnOrder: () => void;
  toggleHideSettled: () => void;
  setGradeFilter: (v: string) => void;
  setCompanyFilter: (v: string) => void;
  resetFilters: () => void;
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
      hideSettled: false,
      gradeFilter: "",
      companyFilter: "",
      stage: STAGE_PLACEMENT_DEFAULT,
      toggleFocus: (target) =>
        set({ focus: get().focus === target ? "none" : target }),
      setStagePlacement: (slot, patch) =>
        set((state) => ({
          stage: {
            ...state.stage,
            [slot]: applyStagePlacement(
              state.stage[slot] ?? STAGE_PLACEMENT_DEFAULT[slot],
              patch,
            ),
          },
        })),
      resetStagePlacement: (slot) =>
        set((state) => ({
          stage: { ...state.stage, [slot]: STAGE_PLACEMENT_DEFAULT[slot] },
        })),
      setTableWidth: (px) => set({ tableWidth: clampWidth(px) }),
      resetTableWidth: () => set({ tableWidth: TABLE_DEFAULT_WIDTH }),
      setChartHeight: (px, max) => set({ chartHeight: clampHeight(px, max) }),
      resetChartHeight: () => set({ chartHeight: CHART_DEFAULT_HEIGHT }),
      swapStackOrder: () =>
        set((state) => ({
          stackOrder: [state.stackOrder[1], state.stackOrder[0]],
        })),
      swapColumnOrder: () =>
        set((state) => ({
          columnOrder: [state.columnOrder[1], state.columnOrder[0]],
        })),
      toggleHideSettled: () =>
        set((state) => ({ hideSettled: !state.hideSettled })),
      setGradeFilter: (v) => set({ gradeFilter: v }),
      setCompanyFilter: (v) => set({ companyFilter: v }),
      resetFilters: () => set({ gradeFilter: "", companyFilter: "" }),
    }),
    {
      name: "live-auction-room-layout",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      /* 거르개는 이 창에서만 산다 · 까닭은 `gradeFilter` 쪽에 적어 뒀다 */
      partialize: (state) => omit(state, ["gradeFilter", "companyFilter"]),
    },
  ),
);

/** 마운트 뒤 저장값 복원 · 상세 방에서 한 번만 부른다 */
export function useRoomLayoutHydration() {
  useEffect(() => {
    void useRoomLayout.persist.rehydrate();
  }, []);
}
