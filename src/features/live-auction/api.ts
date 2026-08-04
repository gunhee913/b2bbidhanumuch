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
}

export interface LivePart {
  id: string;
  partNo: number;
  partName: string;
  listingPartNo: string;
  weight: number | null;
  minPrice: number | null;
  bidCount: number;
  highestBid: LivePartBid | null;
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
