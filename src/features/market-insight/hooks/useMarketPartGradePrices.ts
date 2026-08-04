"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchMarketPartGradePrices,
  type MarketPartGradePricesResponse,
} from "../api";

export interface UseMarketPartGradePricesParams {
  startDate: string;
  endDate: string;
  grade?: string | null;
}

/**
 * `/api/market/part-grade-prices` React Query 래퍼.
 * 부위 × 등급 세부 요약 조회. 30초 staleTime.
 */
export function useMarketPartGradePrices(params: UseMarketPartGradePricesParams) {
  return useQuery<MarketPartGradePricesResponse>({
    queryKey: [
      "market-insight",
      "part-grade-prices",
      params.startDate,
      params.endDate,
      params.grade ?? "all",
    ],
    queryFn: () => fetchMarketPartGradePrices(params),
    staleTime: 30_000,
  });
}
