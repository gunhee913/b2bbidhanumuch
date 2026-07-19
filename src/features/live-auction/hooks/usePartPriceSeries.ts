"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPartPriceSeries,
  type PartPriceSeriesResponse,
} from "../api";

export interface UsePartPriceSeriesParams {
  partName: string;
  grade: string;
  days?: number;
  enabled?: boolean;
}

/**
 * 부위 + 등급 조합의 최근 N일 일별 낙찰 시세 시계열 조회.
 * 미니차트/스파크라인에 사용.
 */
export function usePartPriceSeries({
  partName,
  grade,
  days = 7,
  enabled = true,
}: UsePartPriceSeriesParams) {
  return useQuery<PartPriceSeriesResponse>({
    queryKey: ["live-auction", "part-price-series", partName, grade, days],
    queryFn: () => fetchPartPriceSeries({ partName, grade, days }),
    enabled: enabled && !!partName && !!grade,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
