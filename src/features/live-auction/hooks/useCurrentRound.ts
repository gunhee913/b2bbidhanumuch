"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCurrentRound } from "../api";
import type { CurrentRoundResponse } from "@/features/main/api";

/**
 * 지정 날짜(기본: 오늘)의 현재 회차 조회.
 * `/api/auctions/rounds/current` 는 공판장 필드 없이 세션 단위로 관리되므로
 * 이 훅은 공판장과 무관하게 공통 회차 정보를 반환한다.
 */
export function useCurrentRound(date?: string) {
  return useQuery<CurrentRoundResponse>({
    queryKey: ["live-auction", "current-round", date ?? "today"],
    queryFn: () => fetchCurrentRound(date),
    refetchInterval: 5_000,
    staleTime: 1_000,
  });
}
