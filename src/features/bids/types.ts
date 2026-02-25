// 입찰 관련 타입 정의

export interface BidDealer {
  id: string;
  name: string;
}

export interface BidListing {
  id: string;
  listing_no: string;
  listing_date: string;
  grade: string;
  gender: string;
  status: string;
  closed_at: string | null;
  marbling_score: number | null;
}

export interface BidPart {
  id: string;
  part_no: number;
  part_name: string;
  listing_id: string;
  weight: number;
  min_price: number;
  bid_price: number | null;
  winning_dealer_id: string | null;
  listing_part_no: string;
  cattle_listings: BidListing;
}

export interface Bid {
  id: string;
  auction_id: string | null;
  listing_id: string | null;
  part_id: string;
  dealer_id: string;
  bid_price: number;
  bid_amount: number;
  rank: number | null;
  is_winning: boolean;
  created_at: string;
  dealers: BidDealer;
  cattle_parts: BidPart;
}

// 프론트엔드용 입찰 정보
export interface MyBidItem {
  id: string;
  listingNo: string;        // 상장번호 (부위 포함)
  entityListingNo: string;  // 개체 상장번호
  partName: string;
  grade: string;
  marblingScore: number | null;
  gender: string;
  weight: number;
  minPrice: number;
  myBid: number;
  totalAmount: number;
  status: 'bidded';
  time: string;
  partId: string;
  dealerId: string;
}

// 경매 결과
export interface AuctionResult {
  id: string;
  listingNo: string;
  entityListingNo: string;
  partName: string;
  grade: string;
  marblingScore: number | null;
  gender: string;
  weight: number;
  myBid: number;
  winningBid: number | null;
  totalAmount: number;
  result: 'won' | 'lost';
  listingDate: string;
  closedAt: string | null;
  time: string;
}
