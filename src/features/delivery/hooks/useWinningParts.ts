"use client";

import { useQuery } from "@tanstack/react-query";
import type { WinningPartsResponse } from "../types";

export interface UseWinningPartsOptions {
  dealerId: string | null;
  startDate: string;
  endDate: string;
}

/**
 * 로그인한 딜러가 낙찰받은 부위 목록.
 * `/api/delivery/winning-parts?dealerId=&startDate=&endDate=`
 */
export function useWinningParts({
  dealerId,
  startDate,
  endDate,
}: UseWinningPartsOptions) {
  return useQuery<WinningPartsResponse, Error>({
    queryKey: ["delivery-winning-parts", dealerId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dealerId) params.set("dealerId", dealerId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(
        `/api/delivery/winning-parts?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("낙찰 부위를 불러오는 중 오류가 발생했습니다.");
      }
      return res.json();
    },
    enabled: !!dealerId,
  });
}
