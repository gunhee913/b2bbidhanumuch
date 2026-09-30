"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAuctionCalendarMonth, saveAuctionDays } from "../api";

const KEY = "auction-calendar-month";

/**
 * 한 달치 경매 달력 (개장 여부 + 회차 수 + 상장 두수).
 *
 * 지난 달은 이미 끝난 사실이고 이번 달도 하루 단위로만 바뀐다. 회차 시간표(15초)처럼
 * 자주 캐물으면 달을 앞뒤로 넘길 때마다 네트워크만 늘어난다.
 */
export function useAuctionCalendarMonth(
  month: string,
  slaughterHouse?: string | null,
) {
  return useQuery({
    queryKey: [KEY, slaughterHouse ?? "all", month],
    queryFn: () => fetchAuctionCalendarMonth(month, slaughterHouse),
    enabled: Boolean(month),
    staleTime: 5 * 60_000,
  });
}

export function useSaveAuctionDays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveAuctionDays,
    // 공판장 키가 달라도 같은 달이면 같이 갱신 대상 · 부분 키로 싹 무효화
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}
