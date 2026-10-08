"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { usePersistedView } from "@/hooks/usePersistedView";
import {
  applyStagePlacement,
  STAGE_PLACEMENT_DEFAULT,
  type PaneOrder,
  type StagePlacement,
  type StageSlot,
} from "@/features/live-auction/hooks/useRoomLayout";

/** 좌우로 놓이는 두 열 · `side` 는 사진과 개체정보를 담은 왼쪽 열 */
export type HistoryColumn = "side" | "table";

/**
 * 왼쪽 열 안에 위아래로 쌓이는 두 판 · 배송지시 왼쪽 열과 같은 짜임이다.
 *
 * 높이는 개체정보가 px 로 쥐고 사진이 남는 세로를 전부 가져간다. 둘 다 px 로 잡으면
 * 창을 줄였을 때 합이 맞지 않고, 사진은 늘어난 만큼 고기가 커지는 유일한 판이라
 * 남는 자리를 받을 쪽으로 맞다.
 *
 * 캘린더는 여기 있다가 빠졌다. 세 행을 쌓으니 날짜·사진·개체정보 중 어느 것도 제
 * 크기를 못 가졌고, 날짜는 **고르고 나면 더 볼 일이 없는데** 늘 400px 가까이 깔고
 * 앉아 있었다. 지금은 표 머리줄의 날짜 단추가 눌렸을 때만 펼친다
 * (`HistoryDatePicker`).
 */
export type HistorySidePane = "photo" | "info";

/**
 * 왼쪽 열 너비 한계.
 *
 * 최소 320 은 사진 위 판정 각인(268)이 안 잘리는 폭이다 — 사진은 좁아지면 작아질
 * 뿐이지만 각인은 넘친 만큼 잘려 값 하나가 통째로 없어진다 (배송지시 그림판과 같은
 * 셈). 최대 720 은 넘겨 봐야 사진이 세로가 모자라 가로로만 늘어나는 지점.
 */
export const SIDE_MIN_WIDTH = 320;
export const SIDE_MAX_WIDTH = 720;
export const SIDE_DEFAULT_WIDTH = 400;

/**
 * 표 열이 양보하지 않는 폭 · 왼쪽 열을 넓힐 때 여기서 멈춘다.
 *
 * 표 자체의 바닥은 920(아홉 칸이 안 잘리는 폭)이지만 그건 **표**의 바닥이지 **판**의
 * 바닥이 아니다. 560 아래로는 가로로 미는 것조차 한 화면에 두세 칸밖에 안 보여
 * 훑는 일이 안 된다.
 */
export const TABLE_MIN_WIDTH = 560;

/**
 * 개체정보 카드 높이 한계 · 배송지시와 같은 다섯 줄을 담는다.
 *
 * 기본 188 은 머리 32 + 다섯 줄(줄 높이 ~20, 사이 8) + 위아래 여백 20 + 테두리 2 —
 * 구르지 않고 다 보이는 높이다. 최소 72 는 두 줄만 보이고 나머지는 안에서 구르는 지점으로,
 * 사진을 크게 보고 싶은 날 접어 두는 자리다.
 *
 * **천장은 없다.** 올릴 수 있는 데까지는 사진이 제 바닥(`PHOTO_MIN_HEIGHT`)에 닿는
 * 지점이 정한다 — 배송지시와 같은 셈이다. 전에 320 으로 막아 두었더니 사진이 거기서
 * 멈춰, 같은 창 높이에서 배송지시보다 사진이 덜 줄었다. 개체정보를 길게 펴 두고
 * 사진은 썸네일만큼만 두는 날이 있고, 그 자리를 막을 까닭이 없다.
 */
export const INFO_MIN_HEIGHT = 72;
export const INFO_DEFAULT_HEIGHT = 188;

/** 사진 판 최소 높이 · 개체정보를 키울 때 이만큼은 남긴다 (배송지시 그림판과 같은 값) */
export const PHOTO_MIN_HEIGHT = 200;

const SIDE_PANES: HistorySidePane[] = ["photo", "info"];

/**
 * 담아 둔 차례를 쓸 수 있는 꼴로 추린다 · 모르는 판은 버리고 빠진 판은 끼운다.
 *
 * 왼쪽 열은 두 행 → 세 행 → 다시 두 행으로 바뀌었다. 그때그때 쓰던 사람의 브라우저에
 * 담긴 차례를 그대로 받으면, 빠진 판은 **아예 안 그려지고**(차례에 없으면 늘어놓을
 * 자리도 없다) 없어진 판은 빈 자리를 차지한다.
 */
function normalizeSideOrder(raw: unknown): HistorySidePane[] {
  const kept: HistorySidePane[] = [];
  for (const pane of Array.isArray(raw) ? raw : []) {
    if (SIDE_PANES.includes(pane) && !kept.includes(pane)) kept.push(pane);
  }
  return [...kept, ...SIDE_PANES.filter((p) => !kept.includes(p))];
}

const clampSideWidth = (px: number) =>
  Math.min(SIDE_MAX_WIDTH, Math.max(SIDE_MIN_WIDTH, Math.round(px)));

/**
 * 사이드 레일이 고르는 세 화면 · 같은 날을 세 각도에서 본다.
 *
 *  - `history` **경매결과** · 그날 내가 건 것이 어떻게 됐나 (부위당 한 줄)
 *  - `bids` **입찰내역** · 그날 내가 무슨 일을 했나 (넣음·고침·취소가 저마다 한 줄)
 *  - `sheet` **상장표** · 그날 나온 것 전부
 *
 * 날짜는 셋이 함께 쓰고 보는 각도만 갈린다.
 *
 * 한 화면에 위아래로 쌓아 두었을 때는 아래 상장표가 늘 접힌 채였다. 스무 두가 넘는
 * 개체 비교표라 펴는 순간 화면 서너 배를 먹는데, 위 표를 보려면 그만큼 거슬러
 * 올라와야 했다. 셋 다 폭도 높이도 통째로 쓰고 싶어 하는 표라 한 화면에 같이
 * 세울 수가 없다.
 *
 * 담긴 값이 `history` 인 것은 예전 이름(경매내역)의 자국이다. 바꾸면 쓰던 사람의
 * 브라우저에 남은 값이 어느 화면도 가리키지 않게 되어 그대로 둔다.
 */
export const HISTORY_VIEWS = ["history", "bids", "sheet"] as const;

export type HistoryView = (typeof HISTORY_VIEWS)[number];

/** 머리 메뉴가 주소로 집어 준 이름이 아직 있는 것인가 (`usePersistedView`) */
const isHistoryView = (value: unknown): value is HistoryView =>
  HISTORY_VIEWS.includes(value as HistoryView);

interface HistoryPrefsState {
  view: HistoryView;
  setView: (view: HistoryView) => void;

  /**
   * 사진 위 판정 각인의 자리와 배율.
   *
   * 경매장·배송지시와 따로 담는다. 세 무대가 크기부터 달라서, 넓은 상세 방에서
   * 구석에 밀어 둔 각인이 400px 짜리 이 사진판에서는 단면 한복판을 덮는다.
   */
  stage: Record<StageSlot, StagePlacement>;
  setStagePlacement: (slot: StageSlot, patch: Partial<StagePlacement>) => void;
  resetStagePlacement: (slot: StageSlot) => void;

  /**
   * 세 판의 크기와 차례 · 경매장 상세 방(`useRoomLayout`)과 같은 짜임이다.
   *
   * 크기(px)와 차례(배열)를 따로 둔다. 자리를 바꿨다고 잡아 둔 폭이 초기화되면,
   * 잠깐 보려고 옮긴 사람이 눈금을 처음부터 다시 맞춰야 한다.
   *
   * 날짜를 바꿀 때마다 풀리면 한 달을 훑는 동안 서른 번 다시 맞춰야 하므로 화면
   * 바깥에 둔다.
   */
  sideWidth: number;
  infoHeight: number;
  sideOrder: HistorySidePane[];
  columnOrder: PaneOrder<HistoryColumn>;
  setSideWidth: (px: number) => void;
  resetSideWidth: () => void;
  setInfoHeight: (px: number, max: number) => void;
  resetInfoHeight: () => void;
  setSideOrder: (next: HistorySidePane[]) => void;
  swapColumnOrder: () => void;
}

export const useHistoryPrefs = create<HistoryPrefsState>()(
  persist(
    (set) => ({
      view: "history",
      setView: (view) => set({ view }),

      stage: STAGE_PLACEMENT_DEFAULT,
      setStagePlacement: (slot, patch) =>
        set((s) => ({
          stage: {
            ...s.stage,
            [slot]: applyStagePlacement(
              s.stage[slot] ?? STAGE_PLACEMENT_DEFAULT[slot],
              patch,
            ),
          },
        })),
      resetStagePlacement: (slot) =>
        set((s) => ({
          stage: { ...s.stage, [slot]: STAGE_PLACEMENT_DEFAULT[slot] },
        })),

      sideWidth: SIDE_DEFAULT_WIDTH,
      infoHeight: INFO_DEFAULT_HEIGHT,
      sideOrder: ["photo", "info"],
      columnOrder: ["side", "table"],
      setSideWidth: (px) => set({ sideWidth: clampSideWidth(px) }),
      resetSideWidth: () => set({ sideWidth: SIDE_DEFAULT_WIDTH }),
      /* 바닥은 못 박혀 있고 천장은 그때그때 사진이 정한다 (배송지시와 같은 셈) */
      setInfoHeight: (px, max) =>
        set({
          infoHeight: Math.min(
            Math.max(INFO_MIN_HEIGHT, Math.round(px)),
            Math.max(INFO_MIN_HEIGHT, max),
          ),
        }),
      resetInfoHeight: () => set({ infoHeight: INFO_DEFAULT_HEIGHT }),
      setSideOrder: (next) => set({ sideOrder: next }),
      swapColumnOrder: () =>
        set((s) => ({ columnOrder: [s.columnOrder[1], s.columnOrder[0]] })),
    }),
    {
      name: "history-prefs",
      storage: createJSONStorage(() => localStorage),
      /*
       * 왼쪽 열 행 수가 바뀔 때마다 올린다 (`normalizeSideOrder`).
       * v3 · 개체정보가 다섯 줄로 바뀌어 담아 둔 높이를 버린다 · 늘려 둔 만큼 아래가 빈다.
       */
      version: 3,
      migrate: (persisted, version) => {
        const prev = { ...(persisted as Partial<HistoryPrefsState>) };
        if (version < 3) delete prev.infoHeight;
        return { ...prev, sideOrder: normalizeSideOrder(prev.sideOrder) };
      },
      /*
       * 고른 화면이 곧 「어떤 표를 그리느냐」 라 바로 되살리면 안 된다. 서버가 그린
       * 경매내역과 담아 둔 상장표가 어긋나 하이드레이션이 깨진다. 잡아 둔 열 폭과
       * 판 차례도 마찬가지로 격자를 바꾼다. 사이드 메뉴 저장소
       * (`createSideDockStore`)가 같은 까닭으로 같은 수를 쓴다.
       */
      skipHydration: true,
    },
  ),
);

/* effect 안에서 쓰는 것들 · 모듈 바깥에 세워 둬야 매 그림마다 안 바뀐다 */
const rehydrate = () => useHistoryPrefs.persist.rehydrate();
const setView = (view: HistoryView) => useHistoryPrefs.setState({ view });

/**
 * 저장값 되살리기 · `skipHydration` 이라 이걸 부르지 않으면 늘 경매내역으로 뜬다.
 *
 * 머리 메뉴가 `?view=bids` 로 집어 주면 되살린 뒤에 그걸 얹는다 (`usePersistedView`).
 */
export function useHistoryPrefsHydration() {
  usePersistedView({ rehydrate, setView, isView: isHistoryView });
}
