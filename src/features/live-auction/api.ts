import type { CurrentRoundResponse } from "@/features/main/api";

export type RoundStatus = "scheduled" | "open" | "closed" | "cancelled";

export interface LiveListingSummary {
  slaughterHouse: string;
  listingCount: number;
  approvedCount: number;
  auctionCount: number;
  closedCount: number;
  totalParts: number;
  winningParts: number;
  currentRound: {
    id: string;
    roundNo: number;
    status: RoundStatus;
    startedAt: string | null;
    endedAt: string | null;
    roundDurationMin: number | null;
  } | null;
}

export interface LiveSummaryResponse {
  date: string;
  summaries: LiveListingSummary[];
}

export interface LivePartBid {
  id: string;
  dealerId: string;
  dealerNo: string;
  dealerName: string;
  bidPrice: number;
  bidAmount: number;
  bidAt: string | null;
  rank: number | null;
  isWinning: boolean;
  /** 현재 최고가 여부 · 오픈 최고가 경매에서 O(1) 조회용. */
  isTopBid?: boolean;
}

/**
 * 오픈 최고가 경매 · 부위별 현재 최고가.
 *
 * 진행 중 회차에서 딜러 뷰에 노출되는 최소 정보(가격 + 시각 + 내 소유 여부).
 * 매참인 신원(`dealerNo`/`dealerName`)은 회차 마감 후에만 `highestBid` /
 * `allBids` 를 통해 공개된다.
 */
export interface LivePartTopBid {
  bidPrice: number;
  bidAt: string | null;
  isMine: boolean;
}

export interface LivePart {
  id: string;
  partNo: number;
  partName: string;
  listingPartNo: string;
  weight: number | null;
  minPrice: number | null;
  bidCount: number;
  /**
   * 최고 입찰 상세 (매참인 정보 포함).
   * 딜러 뷰의 진행 중 회차에서는 매참인 익명성 정책상 `null` 로 마스킹된다.
   * 회차 마감 후 또는 관리자/출품업체 뷰에서만 노출.
   */
  highestBid: LivePartBid | null;
  /**
   * 오픈 최고가 · 진행 중 회차에서도 모든 매참인이 볼 수 있는 최고가.
   * 매참인 신원은 포함하지 않는다.
   */
  topBid: LivePartTopBid | null;
  allBids: LivePartBid[];
  /**
   * 결과 회차 · 확정된 경매 회차 번호 (1, 2, 3 ...).
   * 낙찰된 부위는 낙찰 회차, 유찰이지만 내 입찰이 있으면 내 입찰 회차,
   * 그 외에는 null. 실경매(진행중) 컨텍스트에서는 항상 null.
   */
  roundNo?: number | null;
}

export interface LiveListing {
  id: string;
  listingNo: string;
  listingDate: string;
  breed: string;
  gender: string;
  grade: string;
  marblingScore: number | null;
  slaughterHouse: string;
  slaughterDate: string | null;
  slaughterNo: string | null;
  monthAge: number | null;
  traceNo: string | null;
  carcassWeight: number | null;
  unitPrice: number | null;
  backFat: number | null;
  eyeMuscle: number | null;
  meatColor: number | null;
  fatColor: number | null;
  texture: number | null;
  maturity: number | null;
  processDate: string | null;
  processWeight: number | null;
  images: string[];
  status: "approved" | "auction" | "closed" | "completed";
  companyId: string;
  companyName: string;
  companyNo?: string;
  companyCeo?: string;
  parts: LivePart[];
}

export interface LiveListingsResponse {
  listings: LiveListing[];
  stats: {
    totalListings: number;
    totalParts: number;
    partsWithBids: number;
    partsWithoutBids: number;
    totalBidAmount: number;
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `요청 실패: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchLiveSummary(
  date?: string,
): Promise<LiveSummaryResponse> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const qs = params.toString();
  return await getJson<LiveSummaryResponse>(
    `/api/auction/live-summary${qs ? `?${qs}` : ""}`,
  );
}

export interface FetchLiveListingsParams {
  slaughterHouse?: string;
  listingDate?: string;
}

export async function fetchLiveListings(
  params: FetchLiveListingsParams = {},
): Promise<LiveListingsResponse> {
  const search = new URLSearchParams();
  if (params.slaughterHouse) search.set("slaughter_house", params.slaughterHouse);
  if (params.listingDate) search.set("listingDate", params.listingDate);
  const qs = search.toString();
  return await getJson<LiveListingsResponse>(
    `/api/listings/live${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchCurrentRound(
  date?: string,
): Promise<CurrentRoundResponse> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  return await getJson<CurrentRoundResponse>(
    `/api/auctions/rounds/current${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

export async function fetchActiveAuctionDate(): Promise<string> {
  const data = await getJson<{ date: string }>("/api/active-auction-date");
  return data.date;
}

export interface PartPriceSeriesPoint {
  date: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface PartPriceSeriesResponse {
  series: PartPriceSeriesPoint[];
  partName: string;
  grade: string;
  days: number;
}

export interface FetchPartPriceSeriesParams {
  partName: string;
  grade: string;
  /** 육량 등급 필터 (A/B/C). 미지정 시 전체 육량 합산. */
  yieldGrade?: "A" | "B" | "C" | null;
  /** 조회 일수 (max 90). */
  days?: number;
}

export async function fetchPartPriceSeries(
  params: FetchPartPriceSeriesParams,
): Promise<PartPriceSeriesResponse> {
  const search = new URLSearchParams({
    partName: params.partName,
    grade: params.grade,
  });
  if (params.days) search.set("days", String(params.days));
  if (params.yieldGrade) search.set("yield", params.yieldGrade);
  return await getJson<PartPriceSeriesResponse>(
    `/api/market/part-price-series?${search.toString()}`,
  );
}

/**
 * 부위별 입찰내역 (Bid History) · 타임라인 + 통계.
 *
 * 딜러 시점: 본인은 "나", 다른 딜러는 익명 라벨 (딜러 A/B/C, first_bid_at 순).
 * 관리자/출품업체 시점: 딜러 실명 + dealer_no 노출.
 *
 * `wasTopAtTime` 은 이 입찰이 등록될 당시 최고가였는지 여부 (running max 판정).
 */
export interface BidHistoryEntry {
  id: string;
  dealerLabel: string;
  /** 딜러 뷰에서는 null (마스킹) · 관리자/출품업체 뷰에서만 노출 */
  dealerNo: string | null;
  dealerName: string | null;
  isMine: boolean;
  bidPrice: number;
  bidAmount: number;
  bidAt: string;
  /** 등록 당시 최고가였는가 (경신 이벤트 판정) */
  wasTopAtTime: boolean;
  /** 현재 시점에서 최고가인가 */
  isCurrentTop: boolean;
}

export interface BidHistoryResponse {
  partId: string;
  partName: string;
  listingNo: string;
  listingPartNo: string | null;
  grade: string;
  marblingScore: number | null;
  weight: number | null;
  minPrice: number | null;
  stats: {
    totalBids: number;
    totalDealers: number;
    /** 최고가가 갱신된 횟수 (초기 입찰 포함) */
    topBidUpdates: number;
  };
  currentTop: {
    bidPrice: number;
    bidAt: string;
    isMine: boolean;
  } | null;
  /** 최신순 (created_at DESC) 정렬된 타임라인 */
  history: BidHistoryEntry[];
}

export async function fetchBidHistory(
  partId: string,
): Promise<BidHistoryResponse> {
  return await getJson<BidHistoryResponse>(
    `/api/bids/part/${encodeURIComponent(partId)}/history`,
  );
}
