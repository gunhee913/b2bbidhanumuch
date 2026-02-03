import {
  Auction,
  Bid,
  CreateAuctionInput,
  UpdateAuctionInput,
  CreateBidInput,
  AuctionFilter,
} from './types';

const API_BASE = '/api/auctions';

// 경매 목록 조회
export async function fetchAuctions(filter?: AuctionFilter): Promise<Auction[]> {
  const params = new URLSearchParams();
  
  if (filter?.status) params.append('status', filter.status);
  if (filter?.auctionDateFrom) params.append('auctionDateFrom', filter.auctionDateFrom);
  if (filter?.auctionDateTo) params.append('auctionDateTo', filter.auctionDateTo);

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '경매 목록 조회 실패');
  }

  return response.json();
}

// 경매 상세 조회
export async function fetchAuction(id: string): Promise<Auction & { listings: unknown[]; bids: Bid[] }> {
  const response = await fetch(`${API_BASE}/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '경매 조회 실패');
  }

  return response.json();
}

// 경매 생성
export async function createAuction(input: CreateAuctionInput): Promise<Auction> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '경매 생성 실패');
  }

  return response.json();
}

// 경매 수정
export async function updateAuction(id: string, input: UpdateAuctionInput): Promise<Auction> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '경매 수정 실패');
  }

  return response.json();
}

// 경매 삭제
export async function deleteAuction(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '경매 삭제 실패');
  }
}

// 경매 시작
export async function openAuction(id: string): Promise<Auction> {
  const response = await fetch(`${API_BASE}/${id}/open`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '경매 시작 실패');
  }

  return response.json();
}

// 경매 마감
export async function closeAuction(id: string): Promise<Auction> {
  const response = await fetch(`${API_BASE}/${id}/close`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '경매 마감 실패');
  }

  return response.json();
}

// 입찰 목록 조회
export async function fetchBids(
  auctionId: string,
  options?: { partId?: string; dealerId?: string }
): Promise<Bid[]> {
  const params = new URLSearchParams();
  if (options?.partId) params.append('partId', options.partId);
  if (options?.dealerId) params.append('dealerId', options.dealerId);

  const url = params.toString()
    ? `${API_BASE}/${auctionId}/bids?${params}`
    : `${API_BASE}/${auctionId}/bids`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '입찰 목록 조회 실패');
  }

  return response.json();
}

// 입찰 등록
export async function createBid(input: CreateBidInput): Promise<Bid> {
  const response = await fetch(`${API_BASE}/${input.auctionId}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '입찰 등록 실패');
  }

  return response.json();
}
