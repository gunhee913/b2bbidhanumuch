"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchMarketPartGradePrices,
  type MarketPartGradePricesResponse,
} from "../api";

export interface UseMarketPartGradePricesParams {
  startDate: string;
  endDate: string;
}

/**
 * `/api/market/part-grade-prices` React Query 래퍼.
 *
 * 조회기간 하나로 부위·등급·육량을 통째로 받는다. 부위 탭을 넘기거나 육량등급을
 * 통합해도 다시 다녀오지 않는다 — 가르고 합치는 일은 받아 둔 합으로 화면에서 한다.
 */
export function useMarketPartGradePrices(
  params: UseMarketPartGradePricesParams,
) {
  return useQuery<MarketPartGradePricesResponse>({
    queryKey: [
      "market-insight",
      "part-grade-prices",
      params.startDate,
      params.endDate,
    ],
    queryFn: () => fetchMarketPartGradePrices(params),
    staleTime: 30_000,
  });
}
