'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyBids, fetchHighestBidsForParts } from './api';
import { Bid, MyBidItem } from './types';
import { format } from 'date-fns';

// 나의 입찰 목록 조회 훅
export function useMyBids(dealerId: string | null) {
  return useQuery<Bid[], Error>({
    queryKey: ['my-bids', dealerId],
    queryFn: () => fetchMyBids(dealerId!),
    enabled: !!dealerId,
    refetchInterval: 5000, // 5초마다 갱신
  });
}

// 나의 입찰 목록 + 최고가 상태 포함
export function useMyBidsWithStatus(dealerId: string | null) {
  const { data: bids, isLoading, error, refetch } = useMyBids(dealerId);
  
  // 내 입찰에 해당하는 부위 ID 목록
  const partIds = bids?.map(b => b.part_id) || [];
  
  // 각 부위의 최고 입찰가 조회
  const { data: highestBids } = useQuery({
    queryKey: ['highest-bids', partIds.join(',')],
    queryFn: () => fetchHighestBidsForParts(partIds),
    enabled: partIds.length > 0,
    refetchInterval: 5000,
  });
  
  // 프론트엔드용 데이터로 변환
  const myBidItems: MyBidItem[] = (bids || []).map((bid) => {
    const part = bid.cattle_parts;
    const listing = part?.cattle_listings;
    const highestBid = highestBids?.[bid.part_id] || bid.bid_price;
    
    // 상태 결정
    let status: 'highest' | 'secondHighest' | 'outbid' = 'outbid';
    if (bid.bid_price >= highestBid) {
      status = 'highest';
    } else if (bid.bid_price >= highestBid * 0.95) {
      // 최고가의 95% 이상이면 차순위로 표시
      status = 'secondHighest';
    }
    
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
      highestBid,
      totalAmount: bid.bid_amount,
      status,
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
