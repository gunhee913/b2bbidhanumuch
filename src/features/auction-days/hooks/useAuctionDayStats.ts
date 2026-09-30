"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuctionDayStats } from "@/features/main/api";

/**
 * 하루치 등급 매트릭스 (1++ 는 근내지방도 9/8/7 로 나뉘고 육량 A/B/C 열).
 *
 * `/api/main/auction-day-stats` 를 그대로 쓴다 — 메인 화면 달력이 이미 같은 표를
 * 그리고 있어서, 경매장에서 따로 집계를 만들면 두 화면의 두수가 어긋날 수 있다.
 */
export function useAuctionDayStats(
  date: string | null,
  slaughterHouse?: string | null,
) {
  return useQuery({
    queryKey: ["auction-day-stats", slaughterHouse ?? null, date],
    queryFn: () => fetchAuctionDayStats(date!, slaughterHouse ?? undefined),
    enabled: !!date,
    staleTime: 5 * 60_000,
  });
}
