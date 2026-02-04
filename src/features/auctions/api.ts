// 경매 및 입찰 API 함수

import type {
  Auction,
  AuctionFilter,
  AuctionRow,
  Bid,
  BidFilter,
  BidRow,
  CreateAuctionInput,
  CreateBidInput,
  UpdateAuctionInput,
  toFrontendAuction,
  toFrontendBid,
} from './types';

// =============================================
// 경매 API
// =============================================

// 경매 목록 조회
export async function fetchAuctions(filter?: AuctionFilter) {
  const params = new URLSearchParams();
  if (filter?.status) params.append('status', filter.status);
  if (filter?.auctionDateFrom) params.append('auctionDateFrom', filter.auctionDateFrom);
  if (filter?.auctionDateTo) params.append('auctionDateTo', filter.auctionDateTo);

  const res = await fetch(`/api/auctions?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '경매 목록 조회 실패');
  }
  return res.json();
}

// 경매 상세 조회
export async function fetchAuction(id: string) {
  const res = await fetch(`/api/auctions/${id}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '경매 조회 실패');
  }
  return res.json();
}

// 경매 생성
export async function createAuction(input: CreateAuctionInput) {
  const res = await fetch('/api/auctions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '경매 생성 실패');
  }
  return res.json();
}

// 경매 수정
export async function updateAuction(id: string, input: UpdateAuctionInput) {
  const res = await fetch(`/api/auctions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '경매 수정 실패');
  }
  return res.json();
}

// 경매 삭제
export async function deleteAuction(id: string) {
  const res = await fetch(`/api/auctions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '경매 삭제 실패');
  }
  return res.json();
}

// 경매 시작
export async function openAuction(id: string) {
  const res = await fetch(`/api/auctions/${id}/open`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '경매 시작 실패');
  }
  return res.json();
}

// 경매 마감
export async function closeAuction(id: string) {
  const res = await fetch(`/api/auctions/${id}/close`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '경매 마감 실패');
  }
  return res.json();
}

// =============================================
// 경매-상장 API
// =============================================

// 경매에 포함된 상장 조회
export async function fetchAuctionListings(auctionId: string) {
  const res = await fetch(`/api/auctions/${auctionId}/listings`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '상장 목록 조회 실패');
  }
  return res.json();
}

// 경매에 상장 추가
export async function addAuctionListings(auctionId: string, listingIds: string[]) {
  const res = await fetch(`/api/auctions/${auctionId}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '상장 추가 실패');
  }
  return res.json();
}

// 경매에서 상장 제거
export async function removeAuctionListing(auctionId: string, listingId: string) {
  const res = await fetch(`/api/auctions/${auctionId}/listings?listingId=${listingId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '상장 제거 실패');
  }
  return res.json();
}

// =============================================
// 입찰 API
// =============================================

// 입찰 목록 조회
export async function fetchBids(filter?: BidFilter) {
  const params = new URLSearchParams();
  if (filter?.auctionId) params.append('auctionId', filter.auctionId);
  if (filter?.partId) params.append('partId', filter.partId);
  if (filter?.dealerId) params.append('dealerId', filter.dealerId);
  if (filter?.isWinning !== undefined) params.append('isWinning', String(filter.isWinning));

  const res = await fetch(`/api/bids?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '입찰 목록 조회 실패');
  }
  return res.json();
}

// 입찰 등록
export async function createBid(input: CreateBidInput) {
  const res = await fetch('/api/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '입찰 등록 실패');
  }
  return res.json();
}

// 실시간 입찰 현황 조회
export async function fetchLiveBids(auctionId: string) {
  const res = await fetch(`/api/bids/live?auctionId=${auctionId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '입찰 현황 조회 실패');
  }
  return res.json();
}

// 오늘 날짜의 진행중인 경매 조회
export async function fetchTodayOpenAuction() {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch(`/api/auctions?auctionDate=${today}&status=open`);
  if (!res.ok) {
    return null;
  }
  const auctions = await res.json();
  return auctions.length > 0 ? auctions[0] : null;
}
