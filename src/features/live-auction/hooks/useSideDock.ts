"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SideDockTab =
  | "round"
  | "schedule"
  | "myBids"
  | "favorites"
  | "notes"
  | "recent"
  | "shortcuts";

export interface RecentListing {
  listingId: string;
  listingNo: string;
  /** epoch ms */
  viewedAt: number;
}

/** 최근 본 개체 보관 한도 · 하루 상장이 200두 안팎이라 한 화면 스크롤로 훑을 만큼만 */
const RECENT_LIMIT = 30;

/**
 * 관심 패널 두 칸(개체·부위)이 각각 지켜야 할 최소 높이 · 제목줄 + 한 줄.
 * 한 칸을 끝까지 접을 수 있게 두면 나머지 한 칸만 남아, 둘로 나눈 뜻이 사라진다.
 */
export const FAV_SECTION_MIN_HEIGHT = 96;
/** 위 칸 기본 높이 · 제목줄 + 개체 네 줄 · 나머지는 부위가 가져간다 */
export const FAV_TOP_DEFAULT_HEIGHT = 268;

interface SideDockState {
  open: boolean;
  tab: SideDockTab;
  /** 사용자가 한 번이라도 직접 펴거나 접었는지 · 아니면 첫 진입 때 화면 폭으로 기본값을 정한다 */
  hasChosen: boolean;
  /** 내 입찰 탭을 특정 회차로 걸러 열 때 · 회차 행·마감 토스트에서 들어온다 */
  myBidsRoundId: string | null;
  /**
   * 내 입찰에서 **직접** 열고 닫은 회차만 담는다 · 손대지 않은 회차는 제 기본값을
   * 따른다 (진행 중은 펴고, 마감은 접고).
   *
   * 패널이 제 안에 들고 있지 않고 여기 둔 이유는 개체를 옮길 때마다 방이 다시
   * 그려지면서 패널 상태가 통째로 날아가기 때문이다 — 101 에서 102 로 넘어가면
   * 펴 둔 회차가 도로 접혔다. 저장소에는 남기지 않는다(`partialize` 밖) · 회차
   * id 는 그날치라 디스크에 쌓아 봐야 다음 날 아무것도 못 가리킨다.
   */
  myBidsOpenRounds: Record<string, boolean>;
  setMyBidsRoundOpen: (roundId: string, open: boolean) => void;
  recent: RecentListing[];
  /**
   * 관심 패널 위 칸(개체) 높이 px · 아래 칸(부위)은 남는 만큼 가져간다.
   *
   * 크기를 쥐는 쪽을 하나로 정해 둬야 창 높이가 바뀔 때 합이 어긋나지 않는다 —
   * 방 안 눈금이 시세 높이만 쥐는 것과 같은 이유다.
   */
  favTopHeight: number;
  /** 아이콘 클릭 · 이미 열린 그 탭이면 접고, 아니면 그 탭으로 편다 */
  toggleTab: (tab: SideDockTab) => void;
  /** 토글 없이 항상 편다 · 토스트 액션처럼 "보여 줘" 가 분명한 경로 */
  openTab: (tab: SideDockTab, opts?: { roundId?: string | null }) => void;
  setOpen: (open: boolean) => void;
  applyDefaultOpen: (open: boolean) => void;
  pushRecent: (entry: Omit<RecentListing, "viewedAt">) => void;
  clearRecent: () => void;
  /** 위 칸 높이 · 아래 칸 몫은 끄는 쪽에서 재서 넘긴다 */
  setFavTopHeight: (px: number) => void;
  resetFavTopHeight: () => void;
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
      myBidsOpenRounds: {},
      setMyBidsRoundOpen: (roundId, open) =>
        set((s) => ({
          myBidsOpenRounds: { ...s.myBidsOpenRounds, [roundId]: open },
        })),
      recent: [],
      favTopHeight: FAV_TOP_DEFAULT_HEIGHT,
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
      setFavTopHeight: (px) =>
        set({ favTopHeight: Math.max(FAV_SECTION_MIN_HEIGHT, Math.round(px)) }),
      resetFavTopHeight: () => set({ favTopHeight: FAV_TOP_DEFAULT_HEIGHT }),
    }),
    {
      name: "live-auction-side-dock",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ open, tab, hasChosen, recent, favTopHeight }) => ({
        open,
        tab,
        hasChosen,
        recent,
        favTopHeight,
      }),
    },
  ),
);

/** 처음 들어올 때 패널을 펴 두는 폭 · 상장표 최소 폭(≈1200)에 레일·패널(360)과 좌우 여백을 더한 값 */
export const SIDE_DOCK_WIDE_QUERY = "(min-width: 1700px)";
