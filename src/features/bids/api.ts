import { Bid } from './types';

// 나의 입찰 목록 조회
export async function fetchMyBids(dealerId: string): Promise<Bid[]> {
  const response = await fetch(`/api/bids?dealerId=${dealerId}`);
  
  if (!response.ok) {
    throw new Error('입찰 목록을 불러오는 중 오류가 발생했습니다.');
  }
  
  return response.json();
}

// 특정 부위의 모든 입찰 조회 (최고가 확인용)
export async function fetchBidsByPartId(partId: string): Promise<Bid[]> {
  const response = await fetch(`/api/bids?partId=${partId}`);
  
  if (!response.ok) {
    throw new Error('입찰 목록을 불러오는 중 오류가 발생했습니다.');
  }
  
  return response.json();
}

// 여러 부위의 최고 입찰가 조회
export async function fetchHighestBidsForParts(partIds: string[]): Promise<Record<string, number>> {
  if (partIds.length === 0) return {};
  
  const response = await fetch(`/api/bids/highest?partIds=${partIds.join(',')}`);
  
  if (!response.ok) {
    throw new Error('최고 입찰가를 불러오는 중 오류가 발생했습니다.');
  }
  
  return response.json();
}
