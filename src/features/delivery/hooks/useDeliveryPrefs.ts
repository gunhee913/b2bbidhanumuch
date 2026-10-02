"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GRADE_STAMP_WIDTH } from "@/features/live-auction/components/ListingViewerDialog";
import {
  applyStagePlacement,
  STAGE_PLACEMENT_DEFAULT,
  type PaneOrder,
  type StagePlacement,
  type StageSlot,
} from "@/features/live-auction/hooks/useRoomLayout";

/** 묶는 기준 · 부위별이 기본 · 배정 규칙이 대개 「등심은 어디」 꼴이라 */
export type DeliveryGroupBy = "part" | "entity" | "partner";

/** 좌우로 놓이는 두 열 · `pane` 은 사진·상세, `table` 은 배정 표 */
export type DeliveryColumn = "pane" | "table";

/** 개체 판 안에서 위아래로 쌓이는 두 판 */
export type DeliveryPaneRow = "stage" | "info";

/*
 * 폭은 **사진 판**이 쥐고 표가 남는 폭을 가져간다 — 상세 방과 반대다.
 *
 * 둘 중 하나는 px 를 쥐어야 하는데, 쥔 쪽은 창이 줄어도 그대로고 안 쥔 쪽이 그 몫을
 * 다 뒤집어쓴다. 여기서 표가 쥐고 있었더니 사이드 메뉴(304px)를 열 때마다 사진이
 * 통째로 그만큼 쪼그라들어, 고기를 보려고 연 판이 거래처를 찾는 동안 사라졌다.
 * 표는 줄어도 주소 칸만 좁아지지만 사진은 줄면 볼 수가 없다 — 쥐는 쪽은 사진이다.
 *
 * 기본값은 1920 화면에서 예전 배치와 같은 자리다 (표 1196 · 눈금 8 · 사진 612).
 */
export const DELIVERY_PANE_WIDTH_DEFAULT = 612;
/** 그림판이 사진 말고 먹는 폭 · 테두리 2 + 안 여백 24 + 썸네일 레일 64 + 틈 12 */
const STAGE_CHROME_WIDTH = 102;
/**
 * 사진 판 바닥 · **사진 위 판정 각인이 안 잘리는 폭**에서 거꾸로 셈한다.
 *
 * 예전엔 「사진이 뭉개지지 않는 폭」 이라며 280 으로 두었는데, 그 밑에서 먼저 사라지는
 * 건 사진이 아니라 각인 마지막 칸인 **등심면적**이었다. 각인은 접지 않아 무대 밖으로
 * 넘친 만큼 그대로 잘려 나간다. 사진은 좁아지면 작아질 뿐 읽을 것이 없어지지 않지만
 * 잘린 각인은 값 하나가 통째로 없어진다 — 바닥을 정하는 건 잃는 쪽이어야 한다.
 */
export const DELIVERY_PANE_MIN_WIDTH = GRADE_STAMP_WIDTH + STAGE_CHROME_WIDTH;
/**
 * 표 **판**의 바닥 · 표 자체의 바닥(`DELIVERY_TABLE_MIN_WIDTH`)과 다른 값이다.
 *
 * 표는 958 이 있어야 제 모습인데 판은 그보다 좁아도 된다 — 모자란 만큼 판 안에서
 * 가로로 민다. 그래서 판의 바닥을 정하는 건 표가 아니라 **밀리지 않는 머리줄**이다
 * (묶는 기준 163 · 미정만 51 · 건수 133 · 총액 82 · 손잡이 18 · 여백과 틈 64 = 511).
 *
 * 둘을 한 값으로 묶으면 페이지 최소 폭이 516 만큼 더 넓어지고, 그만큼 창이 작은
 * 기기에서는 화면 전체가 가로로 밀린다 — 머리도 사이드 메뉴도 같이 끌려간다.
 */
export const DELIVERY_TABLE_PANE_MIN_WIDTH = 520;

/*
 * 개체정보가 높이를 px 로 쥐고 그림판이 남는 높이를 가져간다 (`RoomStackSplitter` 참고).
 * 내용 높이가 거의 고정인 쪽이 px 를 쥐어야 창을 늘렸을 때 그 여유가 사진으로 간다.
 * 기본값은 머리줄 28 + 일곱 칸 띠 46 + 여섯 줄 174 를 담는 높이다.
 */
export const DELIVERY_INFO_HEIGHT_DEFAULT = 252;
/** 일곱 칸 띠와 두 줄은 남는 높이 · 이보다 낮으면 접어 두는 편이 낫다 */
export const DELIVERY_INFO_MIN_HEIGHT = 96;
/** 그림판 바닥 · 이보다 낮으면 썸네일 레일이 사진보다 길어진다 */
export const DELIVERY_STAGE_MIN_HEIGHT = 200;

/**
 * 배송지시 화면 설정 · 이 기기에서 보기 좋은 모양.
 *
 * 거래처 숫자 단축키는 여기 없다 (`usePartnerPins`). 「1번은 대한식당」 은 업소 공통
 * 약속이라 서버에 둬야 PC 를 바꿔도 같은 숫자가 같은 곳을 가리킨다. 반면 묶는 기준과
 * 표 폭은 화면 크기를 타는 취향이라 기기마다 다른 편이 맞다.
 */
interface DeliveryPrefsState {
  groupBy: DeliveryGroupBy;
  setGroupBy: (v: DeliveryGroupBy) => void;

  paneWidth: number;
  setPaneWidth: (px: number) => void;
  resetPaneWidth: () => void;

  /** 두 열을 늘어놓은 차례 · 손잡이를 끌어 맞바꾼다 (경매장 상세 방과 같은 틀) */
  columnOrder: PaneOrder<DeliveryColumn>;
  swapColumnOrder: () => void;

  /** 개체정보 판 높이 · 바닥은 여기서, 천장은 판이 제 높이를 알 때 부르는 쪽이 준다 */
  infoHeight: number;
  setInfoHeight: (px: number, max: number) => void;
  resetInfoHeight: () => void;

  paneRowOrder: PaneOrder<DeliveryPaneRow>;
  swapPaneRowOrder: () => void;

  /**
   * 사진 위 겹(판정 각인 · 메모 쪽지)의 자리와 배율.
   *
   * 경매장 상세 방과 따로 담는다. 두 무대가 크기부터 다르다 — 거기서 구석으로 밀어 둔
   * 쪽지가 절반 크기인 이 그림판에서는 사진 한복판을 덮는다.
   */
  stage: Record<StageSlot, StagePlacement>;
  setStagePlacement: (slot: StageSlot, patch: Partial<StagePlacement>) => void;
  resetStagePlacement: (slot: StageSlot) => void;
}

export const useDeliveryPrefs = create<DeliveryPrefsState>()(
  persist(
    (set) => ({
      groupBy: "part",
      setGroupBy: (groupBy) => set({ groupBy }),

      paneWidth: DELIVERY_PANE_WIDTH_DEFAULT,
      setPaneWidth: (px) =>
        set({ paneWidth: Math.max(DELIVERY_PANE_MIN_WIDTH, px) }),
      resetPaneWidth: () => set({ paneWidth: DELIVERY_PANE_WIDTH_DEFAULT }),

      columnOrder: ["pane", "table"],
      swapColumnOrder: () =>
        set((s) => ({ columnOrder: [s.columnOrder[1], s.columnOrder[0]] })),

      infoHeight: DELIVERY_INFO_HEIGHT_DEFAULT,
      setInfoHeight: (px, max) =>
        set({
          infoHeight: Math.min(
            Math.max(DELIVERY_INFO_MIN_HEIGHT, px),
            Math.max(DELIVERY_INFO_MIN_HEIGHT, max),
          ),
        }),
      resetInfoHeight: () => set({ infoHeight: DELIVERY_INFO_HEIGHT_DEFAULT }),

      paneRowOrder: ["stage", "info"],
      swapPaneRowOrder: () =>
        set((s) => ({ paneRowOrder: [s.paneRowOrder[1], s.paneRowOrder[0]] })),

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
    }),
    {
      name: "delivery-prefs",
      version: 6,
      /*
       * 없는 항목은 zustand 가 처음값으로 채운다 (기본 merge 가 얕은 덮어쓰기라).
       * 그래서 **더하기만** 한 번호는 받아 둔 것을 그대로 돌려주면 되고, 이름이
       * 바뀐 항목만 손으로 옮긴다.
       *
       * 이걸 비워 두면 안 된다. 번호만 올리고 옮기는 법을 주지 않으면 zustand 는
       * 「옮길 수 없다」며 담아 둔 것을 통째로 버려서, 잡아 둔 표 폭도 묶는 축도
       * 열 차례도 들어올 때마다 처음으로 돌아간다.
       *
       *   v3 · 1~9 거래처를 서버로 옮기며 `pinned` 를 뺐다 (`usePartnerPins`)
       *   v4 · 개체정보 높이와 위아래 차례
       *   v5 · 사진 위 겹(판정 각인 · 메모 쪽지)의 자리와 배율
       *   v6 · px 를 쥐는 쪽이 표에서 사진 판으로 넘어갔다 (`tableWidth` → `paneWidth`)
       */
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== "object") {
          return persisted as DeliveryPrefsState;
        }
        const next = { ...(persisted as Record<string, unknown>) };
        if (version < 3) {
          /* 서버로 옮기기 전 숫자 자리가 남아 있다 · 들고 있어 봐야 읽는 곳이 없다 */
          delete next.pinned;
        }
        if (version < 6) {
          /*
           * 잡아 두었던 표 폭은 버린다 · 사진 판 폭으로 옮겨 적을 수가 없다.
           * 「표 1196」 이 사진 몇 px 였는지는 그때 창이 얼마나 넓었느냐에 달렸는데,
           * 그 창 폭은 어디에도 안 남아 있다. 기본값에서 다시 잡는 편이 낫다.
           */
          delete next.tableWidth;
        }
        return next as unknown as DeliveryPrefsState;
      },
    },
  ),
);
