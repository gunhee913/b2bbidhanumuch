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
  /** 이 입찰이 걸린 회차 번호 · 결과 행의 `n회차` · 회차 미연결 데이터는 null */
  roundNo?: number | null;
}

/**
 * 비공개 입찰 · 부위별 최고가(=마감 후 낙찰가) 요약.
 *
 * 진행 중 회차에서는 서버가 매참인·비로그인에게 **null** 로 내려준다.
 * 회차 마감(rank 확정) 후에만 가격·시각·내 소유 여부가 채워진다.
 * 관리자/출품업체 뷰에서는 진행 중에도 채워진다 (운영·검수 목적).
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
   * 진행 중 회차에서는 비공개 입찰 정책상 관리자/출품업체 외 `null`.
   * 회차 마감 후에는 낙찰 정보로 공개된다.
   */
  highestBid: LivePartBid | null;
  /**
   * 최고가 요약 · 진행 중에는 관리자/출품업체 외 `null` (비공개 입찰).
   * 마감 후에는 낙찰가로 채워진다.
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
  /** 등급판정확인서 스캔본 존재 여부 · 파일은 `fetchListingCerts` 로 지연 로드 */
  hasGradeCert: boolean;
  /** 도축검사증명서 스캔본 존재 여부 */
  hasSlaughterCert: boolean;
  status: "approved" | "auction" | "closed" | "completed";
  companyId: string;
  companyName: string;
  companyNo?: string;
  companyCeo?: string;
  parts: LivePart[];
}

/** 증명서 스캔본 · `{fileName, fileData(스토리지 URL 또는 data URL), fileType}` */
export interface ListingCertificate {
  fileName: string;
  fileData: string;
  fileType: string;
}

export interface ListingCertsResponse {
  gradeCert: ListingCertificate | null;
  slaughterCert: ListingCertificate | null;
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

/** 증명서 스캔본 지연 로드 · 상세 패널 개체정보 탭이 열릴 때만 */
export async function fetchListingCerts(
  listingId: string,
): Promise<ListingCertsResponse> {
  return await getJson<ListingCertsResponse>(
    `/api/listings/${encodeURIComponent(listingId)}/certs`,
  );
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
  if (params.slaughterHouse)
    search.set("slaughter_house", params.slaughterHouse);
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
  /** 평균 중량 kg · 중량이 적힌 건만 */
  weight: number | null;
  /** 평균 낙찰대금 원 (단가 × 중량) · 분모는 중량이 적힌 건수 */
  amount: number | null;
  /** 낙찰 건수 */
  count: number;
  /** 상장 건수 (마감된 상장 기준) · 낙찰률 = count / listed */
  listed: number;
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
