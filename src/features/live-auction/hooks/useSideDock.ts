"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SideDockTab = "round" | "schedule" | "myBids" | "recent";

export interface RecentListing {
  listingId: string;
  listingNo: string;
  /** epoch ms */
  viewedAt: number;
}

/** 최근 본 개체 보관 한도 · 하루 상장이 200두 안팎이라 한 화면 스크롤로 훑을 만큼만 */
const RECENT_LIMIT = 30;

interface SideDockState {
  open: boolean;
  tab: SideDockTab;
  /** 사용자가 한 번이라도 직접 펴거나 접었는지 · 아니면 첫 진입 때 화면 폭으로 기본값을 정한다 */
  hasChosen: boolean;
  /** 내 입찰 탭을 특정 회차로 걸러 열 때 · 회차 행·마감 토스트에서 들어온다 */
  myBidsRoundId: string | null;
  recent: RecentListing[];
  /** 아이콘 클릭 · 이미 열린 그 탭이면 접고, 아니면 그 탭으로 편다 */
  toggleTab: (tab: SideDockTab) => void;
  /** 토글 없이 항상 편다 · 토스트 액션처럼 "보여 줘" 가 분명한 경로 */
  openTab: (tab: SideDockTab, opts?: { roundId?: string | null }) => void;
  setOpen: (open: boolean) => void;
  applyDefaultOpen: (open: boolean) => void;
  pushRecent: (entry: Omit<RecentListing, "viewedAt">) => void;
  clearRecent: () => void;
}

/**
 * 경매장 오른쪽 사이드 메뉴 상태 · 펼침/접힘 · 마지막 탭 · 최근 본 개체.
 *
 * 새로고침해도 그대로여야 하므로 localStorage 에 둔다. `skipHydration` 으로 첫 렌더는
 * 서버와 같은 기본값(접힘)으로 그리고 마운트 뒤에 되살린다 — 페이지 바깥 여백이 이 값에
 * 달려 있어서, 서버와 클라이언트 첫 렌더가 다르면 하이드레이션 경고가 난다.
 */
export const useSideDock = create<SideDockState>()(
  persist(
    (set, get) => ({
      open: false,
      tab: "round",
      hasChosen: false,
      myBidsRoundId: null,
      recent: [],
      toggleTab: (tab) => {
        const { open, tab: current } = get();
        if (open && current === tab) {
          set({ open: false, hasChosen: true });
          return;
        }
        set({
          open: true,
          tab,
          hasChosen: true,
          ...(tab === "myBids" ? { myBidsRoundId: null } : {}),
        });
      },
      openTab: (tab, opts) =>
        set({
          open: true,
          tab,
          hasChosen: true,
          ...(tab === "myBids" ? { myBidsRoundId: opts?.roundId ?? null } : {}),
        }),
      setOpen: (open) => set({ open, hasChosen: true }),
      applyDefaultOpen: (open) => {
        if (get().hasChosen) return;
        set({ open });
      },
      pushRecent: ({ listingId, listingNo }) => {
        const rest = get().recent.filter((r) => r.listingId !== listingId);
        set({
          recent: [
            { listingId, listingNo, viewedAt: Date.now() },
            ...rest,
          ].slice(0, RECENT_LIMIT),
        });
      },
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: "live-auction-side-dock",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ open, tab, hasChosen, recent }) => ({
        open,
        tab,
        hasChosen,
        recent,
      }),
    },
  ),
);

/** 처음 들어올 때 패널을 펴 두는 폭 · 상장표 최소 폭(≈1200)에 레일·패널(360)과 좌우 여백을 더한 값 */
export const SIDE_DOCK_WIDE_QUERY = "(min-width: 1700px)";
