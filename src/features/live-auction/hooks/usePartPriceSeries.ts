"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPartPriceSeries,
  type PartPriceSeriesResponse,
} from "../api";

export interface UsePartPriceSeriesParams {
  partName: string;
  grade: string;
  /** 육량 등급 필터 (A/B/C). 미지정/null 이면 전체 육량 합산. */
  yieldGrade?: "A" | "B" | "C" | null;
  /** 조회 일수 (max 90). 기본 7. */
  days?: number;
  enabled?: boolean;
}

/**
 * 부위 + 등급 조합의 최근 N일 일별 낙찰 시세 시계열 조회.
 * 미니차트/스파크라인/큰 시세차트 공통으로 사용.
 */
export function usePartPriceSeries({
  partName,
  grade,
  yieldGrade = null,
  days = 7,
  enabled = true,
}: UsePartPriceSeriesParams) {
  return useQuery<PartPriceSeriesResponse>({
    queryKey: [
      "live-auction",
      "part-price-series",
      partName,
      grade,
      yieldGrade ?? "all",
      days,
    ],
    queryFn: () => fetchPartPriceSeries({ partName, grade, yieldGrade, days }),
    enabled: enabled && !!partName && !!grade,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
