"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * 화면마다 하나씩 두는 사이드 메뉴 상태 공장.
 *
 * 저장소를 공장으로 찍는 까닭은 zustand 저장소가 모듈 하나에 하나뿐이기 때문이다.
 * 경매장과 배송지시가 같은 저장소를 쓰면 경매장에서 「관심」 을 펴 둔 채 배송으로
 * 넘어갔을 때 거기 없는 탭을 가리키게 된다 — 화면마다 탭 목록이 다르니 기억도 따로다.
 *
 * 반대로 **펴고 접은 상태**까지 따로 두는 건 일부러다. 두 화면은 표 폭이 달라서,
 * 경매장에서 넉넉해 펴 두었던 것이 배송지시에서는 표를 자르는 일이 생긴다.
 */
export interface SideDockState<K extends string> {
  open: boolean;
  tab: K;
  /** 한 번이라도 직접 펴거나 접었는지 · 아니면 첫 진입 때 화면 폭으로 정한다 */
  hasChosen: boolean;
  toggleTab: (tab: K) => void;
  openTab: (tab: K) => void;
  setOpen: (open: boolean) => void;
  applyDefaultOpen: (open: boolean) => void;
}

/** 이보다 넓으면 처음부터 펴 둔다 · 표를 깎지 않고도 패널이 들어가는 폭 */
export const SIDE_DOCK_WIDE_QUERY = "(min-width: 1700px)";

export function createSideDockStore<K extends string>({
  name,
  defaultTab,
}: {
  /** localStorage 열쇠 · 화면마다 다르게 */
  name: string;
  defaultTab: K;
}) {
  return create<SideDockState<K>>()(
    persist(
      (set) => ({
        open: false,
        tab: defaultTab,
        hasChosen: false,

        /* 같은 탭을 다시 누르면 접는다 · 레일이 곧 여닫이다 */
        toggleTab: (tab) =>
          set((s) =>
            s.open && s.tab === tab
              ? { open: false, hasChosen: true }
              : { open: true, tab, hasChosen: true },
          ),
        openTab: (tab) => set({ open: true, tab, hasChosen: true }),
        setOpen: (open) => set({ open, hasChosen: true }),

        /* 직접 고른 적이 있으면 그 뜻이 화면 폭보다 우선이다 */
        applyDefaultOpen: (open) => set((s) => (s.hasChosen ? {} : { open })),
      }),
      {
        name,
        storage: createJSONStorage(() => localStorage),
        /*
         * 서버와 첫 그림을 맞추려고 되살리기를 미룬다. 바로 되살리면 저장된 「펼침」 이
         * 서버가 그린 「접힘」 과 어긋나 하이드레이션이 깨진다.
         */
        skipHydration: true,
        partialize: ({ open, tab, hasChosen }) => ({ open, tab, hasChosen }),
      },
    ),
  );
}
