"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchLiveListings,
  type LiveListingsResponse,
} from "../api";

export interface UseLiveListingsParams {
  slaughterHouse: string;
  listingDate?: string;
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * 특정 공판장의 오늘(또는 지정일) 승인/경매/마감 상장을 조회.
 * `/api/listings/live?slaughter_house=...&listingDate=...`
 */
export function useLiveListings({
  slaughterHouse,
  listingDate,
  enabled = true,
  refetchInterval,
}: UseLiveListingsParams) {
  return useQuery<LiveListingsResponse>({
    queryKey: [
      "live-auction",
      "listings",
      slaughterHouse,
      listingDate ?? "today",
    ],
    queryFn: () =>
      fetchLiveListings({ slaughterHouse, listingDate }),
    enabled: enabled && !!slaughterHouse,
    refetchInterval: refetchInterval ?? 5_000,
    staleTime: 2_000,
  });
}
