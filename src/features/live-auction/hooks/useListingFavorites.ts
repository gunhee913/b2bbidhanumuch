"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * PC 실시간 경매 페이지 전용 관심(즐겨찾기) 스토어.
 *
 * 저장 대상: `cattle_listings.id` (UUID)
 *
 * NOTE: 기존 `useBidStore.favorites` 는 모바일 앱의 상장번호(YYMMDD-XXX) 포맷과
 *       서버 API 규칙에 종속되어 있어 UUID 를 함께 담을 경우 대시 개수로
 *       listing/part 를 구분하는 로직과 충돌한다. 따라서 별도 스토어로 분리한다.
 */
interface ListingFavoritesState {
  favoriteIds: string[];
  toggle: (listingId: string) => void;
  isFavorite: (listingId: string) => boolean;
  clear: () => void;
}

export const useListingFavorites = create<ListingFavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      toggle: (listingId) => {
        set((state) => {
          const has = state.favoriteIds.includes(listingId);
          return {
            favoriteIds: has
              ? state.favoriteIds.filter((id) => id !== listingId)
              : [...state.favoriteIds, listingId],
          };
        });
      },
      isFavorite: (listingId) => get().favoriteIds.includes(listingId),
      clear: () => set({ favoriteIds: [] }),
    }),
    {
      name: "live-auction-favorites-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
