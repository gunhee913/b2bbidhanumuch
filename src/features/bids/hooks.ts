'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyBids } from './api';
import { Bid, MyBidItem } from './types';
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
export function useMyBidsWithStatus(dealerId: string | null) {
  const { data: bids, isLoading, error, refetch } = useMyBids(dealerId);
  
  const myBidItems: MyBidItem[] = (bids || []).map((bid) => {
    const part = bid.cattle_parts;
    const listing = part?.cattle_listings;
    
    return {
      id: bid.id,
      listingNo: part?.listing_part_no || '',
      entityListingNo: listing?.listing_no || '',
      partName: part?.part_name || '',
      grade: listing?.grade || '',
      gender: listing?.gender || '',
      weight: part?.weight || 0,
      minPrice: part?.min_price || 0,
      myBid: bid.bid_price,
      totalAmount: bid.bid_amount,
      status: 'bidded' as const,
      time: format(new Date(bid.created_at), 'yy.MM.dd HH:mm'),
      partId: bid.part_id,
      dealerId: bid.dealer_id,
    };
  });
  
  return {
    data: myBidItems,
    isLoading,
    error,
    refetch,
  };
}
