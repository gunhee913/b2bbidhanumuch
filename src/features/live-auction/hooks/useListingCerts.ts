"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchListingCerts } from "../api";

/**
 * 등급판정확인서 · 도축검사증명서 스캔본 지연 로드.
 * 리스트 API 는 유무 플래그만 주므로, 상세 패널이 해당 개체를 보여줄 때만 파일을 가져온다.
 * 승인 후 거의 바뀌지 않는 데이터라 staleTime 을 길게 둔다.
 */
export function useListingCerts(listingId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["live-auction", "listing-certs", listingId],
    queryFn: () => fetchListingCerts(listingId!),
    enabled: enabled && !!listingId,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
