"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * 입찰에 한 일 한 가지 · 넣음 · 고침 · 취소 · 관리자 조작.
 *
 * 「지금 얼마를 걸고 있나」 가 아니라 **「무슨 일이 있었나」** 다. 그래서 한 부위에
 * 여러 줄이 설 수 있다 — 10:27 에 92,000 으로 넣고, 10:29 에 94,000 으로 고치고,
 * 10:31 에 뺐으면 세 줄이다. 경매결과 화면이 부위당 한 줄인 것과 반대다.
 */
export type BidHistoryKind =
  "placed" | "updated" | "cancelled" | "admin_update" | "admin_delete";

export interface BidHistoryEntry {
  id: string;
  /** 어느 입찰에 일어난 일인가 · 취소돼 사라진 입찰이면 지금은 없는 id */
  bidId: string | null;
  kind: BidHistoryKind;
  /** 일어난 시각 (ISO) */
  at: string;
  /** 고치기 전 값 · 처음 넣은 줄에는 없다 */
  oldPrice: number | null;
  newPrice: number | null;
  oldAmount: number | null;
  newAmount: number | null;
  /** 관리자가 한 일이면 그 이름 · 중도매인이 제 손으로 한 것은 null */
  performedBy: string | null;
  /** 이 입찰이 지금도 걸려 있나 · 뺀 줄과 눈으로 갈라야 한다 */
  alive: boolean;
  /** 회차가 마감돼 순위가 확정됐나 */
  settled: boolean;

  partId: string;
  partNo: number | null;
  partName: string;
  weight: number;
  minPrice: number;
  listingId: string;
  /** 개체 상장번호 (260720-101) · 사진판이 개체를 찾을 때 */
  entityListingNo: string;
  /** 부위까지 포함한 번호 (260720-101-01) */
  listingNo: string;
  listingDate: string;
  grade: string;
  marblingScore: number | null;
  companyName: string;
}

/**
 * 그날 내가 입찰에 한 일 전부 · 일어난 차례대로.
 *
 * 경매결과(`buildDailyRows`)와 **같은 날을 본다**. 거기서 10-02 를 보다 입찰내역으로
 * 넘어가면 같은 날의 다른 각도다 — 「무엇이 남았나」 와 「무엇을 했나」.
 */
export function useBidHistory(dateStr: string | null) {
  return useQuery({
    queryKey: ["bid-history", dateStr],
    enabled: !!dateStr,
    staleTime: 30_000,
    queryFn: async (): Promise<BidHistoryEntry[]> => {
      const res = await fetch(
        `/api/bids/history?date=${encodeURIComponent(dateStr!)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "입찰내역을 불러오지 못했습니다.");
      }
      const body = (await res.json()) as { entries: BidHistoryEntry[] };
      return body.entries ?? [];
    },
  });
}
