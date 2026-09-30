"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLiveListings, type LiveListingsResponse } from "../api";

export interface UseLiveListingsParams {
  /**
   * 공판장 필터 (레거시). Phase 1 통합 이후 서버는 이 값을 무시하지만,
   * 하위 호환을 위해 파라미터는 유지한다.
   */
  slaughterHouse?: string;
  listingDate?: string;
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * 오늘(또는 지정일) 승인/경매/마감 상장을 조회.
 * `/api/listings/live?listingDate=...`
 *
 * Phase 1 통합 이후 공판장 필터는 서버에서 무시된다.
 */
export function useLiveListings({
  slaughterHouse,
  listingDate,
  enabled = true,
  refetchInterval,
}: UseLiveListingsParams = {}) {
  return useQuery<LiveListingsResponse>({
    queryKey: [
      "live-auction",
      "listings",
      slaughterHouse ?? "all",
      listingDate ?? "today",
    ],
    queryFn: () => fetchLiveListings({ slaughterHouse, listingDate }),
    enabled,
    refetchInterval: refetchInterval ?? 5_000,
    staleTime: 2_000,
  });
}
