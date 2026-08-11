"use client";

import { useQuery } from "@tanstack/react-query";

export interface MyBidEntry {
  id: string;
  bidPrice: number;
  bidAmount: number;
  rank: number | null;
  isWinning: boolean;
  /** 오픈 최고가 · 진행 중 회차에서 내가 현재 1위 여부. 마감 후엔 is_winning 사용. */
  isTopBid: boolean;
  createdAt: string | null;
  auctionId: string | null;
  partId: string | null;
  part: {
    id: string;
    partNo: number;
    partName: string;
    listingPartNo: string;
    weight: number | null;
    minPrice: number | null;
    bidPrice: number | null;
    winningDealerId: string | null;
  } | null;
  listing: {
    id: string;
    listingNo: string;
    listingDate: string;
    grade: string;
    gender: string;
    status: "approved" | "auction" | "closed" | "completed";
    closedAt: string | null;
    marblingScore: number | null;
  } | null;
}

interface RawApiBid {
  id: string;
  auction_id: string | null;
  part_id: string | null;
  dealer_id: string;
  bid_price: number;
  bid_amount: number;
  rank: number | null;
  is_winning: boolean;
  is_top_bid?: boolean;
  created_at: string;
  cattle_parts?: {
    id: string;
    part_no: number;
    part_name: string;
    listing_id: string;
    weight: number | null;
    min_price: number | null;
    bid_price: number | null;
    winning_dealer_id: string | null;
    listing_part_no: string;
    cattle_listings?: {
      id: string;
      listing_no: string;
      listing_date: string;
      grade: string;
      gender: string;
      status: "approved" | "auction" | "closed" | "completed";
      closed_at: string | null;
      marbling_score: number | null;
    };
  };
}

function toMyBidEntry(raw: RawApiBid): MyBidEntry {
  const part = raw.cattle_parts;
  const listing = part?.cattle_listings;
  return {
    id: raw.id,
    bidPrice: raw.bid_price,
    bidAmount: raw.bid_amount,
    rank: raw.rank,
    isWinning: raw.is_winning,
    isTopBid: !!raw.is_top_bid,
    createdAt: raw.created_at ?? null,
    auctionId: raw.auction_id,
    partId: raw.part_id,
    part: part
      ? {
          id: part.id,
          partNo: part.part_no,
          partName: part.part_name,
          listingPartNo: part.listing_part_no,
          weight: part.weight,
          minPrice: part.min_price,
          bidPrice: part.bid_price,
          winningDealerId: part.winning_dealer_id,
        }
      : null,
    listing: listing
      ? {
          id: listing.id,
          listingNo: listing.listing_no,
          listingDate: listing.listing_date,
          grade: listing.grade,
          gender: listing.gender,
          status: listing.status,
          closedAt: listing.closed_at,
          marblingScore: listing.marbling_score,
        }
      : null,
  };
}

async function fetchMyBids(
  dealerId: string,
  listingDate: string,
): Promise<MyBidEntry[]> {
  const res = await fetch(`/api/bids?dealerId=${dealerId}`);
  if (!res.ok) {
    throw new Error("입찰 내역을 불러올 수 없습니다.");
  }
  const data = (await res.json()) as RawApiBid[];
  return data
    .map(toMyBidEntry)
    .filter((b) => b.listing?.listingDate === listingDate);
}

/**
 * 로그인한 딜러의 오늘자 입찰 내역.
 * 회차/공판장 필터 없이 오늘 상장의 내 입찰만 조회.
 */
export function useMyBids(dealerId: string | null, listingDate: string) {
  return useQuery<MyBidEntry[]>({
    queryKey: ["live-auction", "my-bids", dealerId, listingDate],
    queryFn: () => fetchMyBids(dealerId!, listingDate),
    enabled: !!dealerId,
    refetchInterval: 5_000,
    staleTime: 2_000,
  });
}
