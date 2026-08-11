"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBidHistory, type BidHistoryResponse } from "../api";

/**
 * 부위별 입찰내역 · Modal 오픈 시 lazy fetch.
 *
 * 진행 중 회차는 실시간성이 중요하므로 3초 refetch, 마감 후엔 stale 유지.
 * `enabled` 는 partId 존재 여부로 제어 (Modal open 시 partId 를 넘겨 트리거).
 */
export function useBidHistory(
  partId: string | null,
  options: { isLive?: boolean } = {},
) {
  const { isLive = true } = options;
  return useQuery<BidHistoryResponse>({
    queryKey: ["live-auction", "bid-history", partId],
    queryFn: () => fetchBidHistory(partId!),
    enabled: !!partId,
    refetchInterval: isLive ? 3_000 : false,
    staleTime: isLive ? 1_000 : 60_000,
  });
}
