"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchListings } from "@/features/listings/api";
import type { CattleListing, CattlePart, ListingStatus } from "@/features/listings/types";

/** `/api/listings?includeParts=true` 가 딜러 권한으로 돌려주는 부위 · 낙찰 확정 시에만 `highestBid` */
export interface DailyListingPart extends CattlePart {
  hasWinner: boolean;
  highestBid: { bidPrice: number; bidAmount: number; dealerNo: string } | null;
  myBid: {
    bidId: string;
    bidPrice: number;
    bidAmount: number;
    isWinning: boolean;
  } | null;
}

export interface DailyListing extends Omit<CattleListing, "parts"> {
  /** 상장된(포함) 부위만 · 부위번호 순 */
  parts: DailyListingPart[];
  /** 제외 부위까지 포함한 전체 부위 수 · `부위: 20/20` 표기용 */
  partTotal: number;
}

/** 딜러에게 보이는 상장 상태 · 대기·취소는 제외 */
const VISIBLE_STATUSES: ReadonlySet<ListingStatus> = new Set([
  "approved",
  "auction",
  "completed",
  "closed",
]);

/**
 * 선택일의 부분육 상장내역 (개체 + 부위 + 낙찰가 + 내 입찰).
 * 날짜가 바뀔 때만 fetch · 결과는 상장번호 오름차순 · 제외 부위(`isIncluded=false`) 는 뺀다.
 */
export function useDailyListings(dateStr: string | null) {
  return useQuery({
    queryKey: ["history-daily-listings", dateStr],
    enabled: !!dateStr,
    staleTime: 60_000,
    queryFn: async (): Promise<DailyListing[]> => {
      const rows = (await fetchListings({
        listingDateFrom: dateStr!,
        listingDateTo: dateStr!,
        includeParts: true,
      })) as unknown as (Omit<CattleListing, "parts"> & { parts?: DailyListingPart[] })[];

      return rows
        .filter((l) => VISIBLE_STATUSES.has(l.status))
        .map(
          (l): DailyListing => ({
            ...l,
            partTotal: (l.parts ?? []).length,
            parts: (l.parts ?? [])
              .filter((p) => p.isIncluded)
              .sort((a, b) => a.partNo - b.partNo),
          }),
        )
        .sort((a, b) => a.listingNo.localeCompare(b.listingNo, "ko-KR", { numeric: true }));
    },
  });
}
