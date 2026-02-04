// 경매 및 입찰 관련 타입 정의

// =============================================
// DB Row 타입
// =============================================

// 경매 테이블 Row
export interface AuctionRow {
  id: string;
  auction_date: string;
  auction_no: string;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  status: AuctionStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// 입찰 테이블 Row
export interface BidRow {
  id: string;
  auction_id: string;
  part_id: string;
  dealer_id: string;
  bid_price: number;
  bid_amount: number;
  rank: number | null;
  is_winning: boolean;
  created_at: string;
}

// 경매-상장 연결 Row
export interface AuctionListingRow {
  id: string;
  auction_id: string;
  listing_id: string;
  display_order: number;
  created_at: string;
}

// =============================================
// 프론트엔드 타입
// =============================================

// 경매 상태
export type AuctionStatus = 'scheduled' | 'open' | 'closed' | 'cancelled';

// 경매
export interface Auction {
  id: string;
  auctionDate: string;
  auctionNo: string;
  title: string | null;
  startTime: string | null;
  endTime: string | null;
  status: AuctionStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  // JOIN 시 포함
  listingCount?: number;
  bidCount?: number;
}

// 입찰
export interface Bid {
  id: string;
  auctionId: string;
  partId: string;
  dealerId: string;
  bidPrice: number;
  bidAmount: number;
  rank: number | null;
  isWinning: boolean;
  createdAt: string;
  // JOIN 시 포함
  dealerName?: string;
  partName?: string;
  listingNo?: string;
}

// 경매-상장 연결
export interface AuctionListing {
  id: string;
  auctionId: string;
  listingId: string;
  displayOrder: number;
  createdAt: string;
}

// =============================================
// 입력 타입
// =============================================

// 경매 생성
export interface CreateAuctionInput {
  auctionDate: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  listingIds?: string[]; // 포함할 상장 ID 목록
}

// 경매 수정
export interface UpdateAuctionInput {
  title?: string;
  startTime?: string;
  endTime?: string;
  status?: AuctionStatus;
}

// 입찰 생성
export interface CreateBidInput {
  auctionId: string;
  partId: string;
  dealerId: string;
  bidPrice: number;
  weight: number; // bid_amount 계산용
}

// =============================================
// 필터 타입
// =============================================

// 경매 필터
export interface AuctionFilter {
  status?: AuctionStatus;
  auctionDateFrom?: string;
  auctionDateTo?: string;
}

// 입찰 필터
export interface BidFilter {
  auctionId?: string;
  partId?: string;
  dealerId?: string;
  isWinning?: boolean;
}

// =============================================
// 변환 함수
// =============================================

export function toFrontendAuction(row: AuctionRow): Auction {
  return {
    id: row.id,
    auctionDate: row.auction_date,
    auctionNo: row.auction_no,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export function toFrontendBid(row: BidRow): Bid {
  return {
    id: row.id,
    auctionId: row.auction_id,
    partId: row.part_id,
    dealerId: row.dealer_id,
    bidPrice: row.bid_price,
    bidAmount: row.bid_amount,
    rank: row.rank,
    isWinning: row.is_winning,
    createdAt: row.created_at,
  };
}

// =============================================
// 상수
// =============================================

export const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
  scheduled: '예정',
  open: '진행중',
  closed: '마감',
  cancelled: '취소',
};

export const AUCTION_STATUS_COLORS: Record<AuctionStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};
