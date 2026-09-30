"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface DailyBriefingState {
  /** 사이드 메뉴를 자동으로 열어 준 마지막 경매일 (yyyy-MM-dd) */
  briefedDate: string | null;
  markBriefed: (date: string) => void;
}

/**
 * 오늘의 상장 브리핑을 이미 띄웠는지 · 경매일 단위로 기억한다.
 *
 * 들어올 때마다 열면 하루에도 몇 번씩 경매장을 드나드는 사람에게는 그냥 치워야 할 판이
 * 되고, 한 번 닫으면 영영 안 열리게 하면 정작 매일 아침 알고 싶은 것을 놓친다. 그래서
 * 「그날 한 번」 으로 둔다 — 날짜가 바뀌면 저장값이 안 맞으니 저절로 다시 열린다.
 */
export const useDailyBriefing = create<DailyBriefingState>()(
  persist(
    (set) => ({
      briefedDate: null,
      markBriefed: (date) => set({ briefedDate: date }),
    }),
    {
      name: "live-auction-daily-briefing",
      storage: createJSONStorage(() => localStorage),
      /* 서버 렌더에는 저장값이 없다 · 되살린 뒤에 판단해야 메뉴가 헛되이 한 번 열리지 않는다 */
      skipHydration: true,
    },
  ),
);
