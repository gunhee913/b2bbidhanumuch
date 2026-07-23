"use client";

import { useQuery } from "@tanstack/react-query";
import type { PartnersResponse } from "../types";

/**
 * 로그인한 딜러가 담당하는 거래처 목록 (`dealer1_id/2/3` 로 필터).
 * `/api/partners?dealerId=&status=active`
 */
export function useDealerPartners(dealerId: string | null) {
  return useQuery<PartnersResponse, Error>({
    queryKey: ["dealer-partners", dealerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dealerId) params.set("dealerId", dealerId);
      params.set("status", "active");
      const res = await fetch(`/api/partners?${params.toString()}`);
      if (!res.ok) {
        throw new Error("거래처 목록을 불러오는 중 오류가 발생했습니다.");
      }
      return res.json();
    },
    enabled: !!dealerId,
  });
}
