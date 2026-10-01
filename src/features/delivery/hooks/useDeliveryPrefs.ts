"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaneOrder } from "@/features/live-auction/hooks/useRoomLayout";

/** 묶는 기준 · 부위별이 기본 · 배정 규칙이 대개 「등심은 어디」 꼴이라 */
export type DeliveryGroupBy = "part" | "entity" | "partner";

/** 좌우로 놓이는 두 열 · `pane` 은 사진·상세, `table` 은 배정 표 */
export type DeliveryColumn = "pane" | "table";

/*
 * 고정 열 합이 890 이다 (접수번호 100 · 상장업체 88 · 부위 84 · 등급 72 · 중량 56 ·
 * 단가 78 · 금액 88 · 거래처 156 · 대표 64 · 연락처 104). 주소가 남는 폭을 가져가므로
 * 기본값은 거기에 주소 290 을 더한 값이고, 최소값은 주소가 110 은 남게 잡았다 —
 * 「경기 성남시 분당구」 까지는 보여야 어느 동네인지 알아본다.
 */
export const DELIVERY_TABLE_WIDTH_DEFAULT = 1180;
export const DELIVERY_TABLE_MIN_WIDTH = 1000;
/** 왼쪽 판이 사진을 4:3 으로 세울 수 있는 최소 폭 · 이보다 좁히면 사진이 뭉개진다 */
export const DELIVERY_PANE_MIN_WIDTH = 280;

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

  tableWidth: number;
  setTableWidth: (px: number) => void;
  resetTableWidth: () => void;

  /** 두 열을 늘어놓은 차례 · 손잡이를 끌어 맞바꾼다 (경매장 상세 방과 같은 틀) */
  columnOrder: PaneOrder<DeliveryColumn>;
  swapColumnOrder: () => void;
}

export const useDeliveryPrefs = create<DeliveryPrefsState>()(
  persist(
    (set) => ({
      groupBy: "part",
      setGroupBy: (groupBy) => set({ groupBy }),

      tableWidth: DELIVERY_TABLE_WIDTH_DEFAULT,
      setTableWidth: (px) =>
        set({ tableWidth: Math.max(DELIVERY_TABLE_MIN_WIDTH, px) }),
      resetTableWidth: () => set({ tableWidth: DELIVERY_TABLE_WIDTH_DEFAULT }),

      columnOrder: ["pane", "table"],
      swapColumnOrder: () =>
        set((s) => ({ columnOrder: [s.columnOrder[1], s.columnOrder[0]] })),
    }),
    { name: "delivery-prefs", version: 3 },
  ),
);
