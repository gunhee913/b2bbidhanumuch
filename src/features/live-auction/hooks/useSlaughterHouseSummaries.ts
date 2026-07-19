"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLiveSummary, type LiveSummaryResponse } from "../api";

/**
 * 랜딩 페이지의 4개 공판장 카드에 표시할 오늘 요약 데이터.
 * 회차 상태를 실시간에 가깝게 반영하기 위해 10초 폴링.
 */
export function useSlaughterHouseSummaries(date?: string) {
  return useQuery<LiveSummaryResponse>({
    queryKey: ["auction", "live-summary", date ?? "today"],
    queryFn: () => fetchLiveSummary(date),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
