'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyBids } from './api';
import { Bid, MyBidItem, AuctionResult } from './types';
import { format } from 'date-fns';

// 나의 입찰 목록 조회 훅
export function useMyBids(dealerId: string | null) {
  return useQuery<Bid[], Error>({
    queryKey: ['my-bids', dealerId],
    queryFn: () => fetchMyBids(dealerId!),
    enabled: !!dealerId,
    refetchInterval: 5000,
  });
}

// 나의 입찰 목록 (비공개 입찰: 순위/최고가 없음)
// 진행중인 입찰만 반환 (listing이 active + 아직 낙찰 결정 안 된 건)
export function useMyBidsWithStatus(dealerId: string | null) {
  const { data: bids, isLoading, error, refetch } = useMyBids(dealerId);
  
  const activeBids = (bids || []).filter((bid) => {
    const status = bid.cattle_parts?.cattle_listings?.status;
    const isActive = status === 'approved' || status === 'auction';
    const hasWinner = !!bid.cattle_parts?.winning_dealer_id;
    return isActive && !bid.is_winning && !hasWinner;
  });

  const myBidItems: MyBidItem[] = activeBids.map((bid) => {
    const part = bid.cattle_parts;
    const listing = part?.cattle_listings;

    return {
      id: bid.id,
      listingNo: part?.listing_part_no || '',
      entityListingNo: listing?.listing_no || '',
      partName: part?.part_name || '',
      grade: listing?.grade || '',
      marblingScore: listing?.marbling_score ?? null,
      gender: listing?.gender || '',
      weight: part?.weight || 0,
      minPrice: part?.min_price || 0,
      myBid: bid.bid_price,
      totalAmount: bid.bid_amount,
      status: 'bidded' as const,
      time: format(new Date(bid.created_at), 'yy.MM.dd HH:mm:ss'),
      partId: bid.part_id,
      dealerId: bid.dealer_id,
      companyName: listing?.companies?.name || '',
      slaughterHouse: listing?.slaughter_house || '',
    };
  });
  
  return {
    data: myBidItems,
    isLoading,
    error,
    refetch,
  };
}

// 나의 경매 결과 (낙찰 결정된 입찰 + completed/closed 상장의 입찰)
export function useMyAuctionResults(dealerId: string | null) {
  const { data: bids, isLoading, error, refetch } = useMyBids(dealerId);

  const completedBids = (bids || []).filter((bid) => {
    const status = bid.cattle_parts?.cattle_listings?.status;
    const isSettled = status === 'completed' || status === 'closed';
    const hasWinner = !!bid.cattle_parts?.winning_dealer_id;
    return isSettled || bid.is_winning || hasWinner;
  });

  const results: AuctionResult[] = completedBids.map((bid) => {
    const part = bid.cattle_parts;
    const listing = part?.cattle_listings;
    const isWon = bid.is_winning || part?.winning_dealer_id === bid.dealer_id;

    return {
      id: bid.id,
      listingNo: part?.listing_part_no || '',
      entityListingNo: listing?.listing_no || '',
      partName: part?.part_name || '',
      grade: listing?.grade || '',
      marblingScore: listing?.marbling_score ?? null,
      gender: listing?.gender || '',
      weight: part?.weight || 0,
      minPrice: part?.min_price || 0,
      myBid: bid.bid_price,
      winningBid: part?.bid_price || null,
      totalAmount: bid.bid_amount,
      result: isWon ? 'won' as const : 'lost' as const,
      listingDate: listing?.listing_date || '',
      closedAt: listing?.closed_at || null,
      time: format(new Date(bid.created_at), 'yy.MM.dd HH:mm:ss'),
      partId: bid.part_id,
      companyName: listing?.companies?.name || '',
      slaughterHouse: listing?.slaughter_house || '',
      roundNo: bid.auctions?.round_no ?? null,
    };
  });

  return {
    data: results,
    isLoading,
    error,
    refetch,
  };
}
