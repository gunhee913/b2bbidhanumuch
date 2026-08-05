export type RoundStatus = "scheduled" | "open" | "closed" | "cancelled";

export interface RoundInfo {
  id: string;
  round_no: number;
  status: RoundStatus;
  started_at: string | null;
  ended_at: string | null;
  session_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  round_duration_min: number | null;
  started_by?: string | null;
  ended_by?: string | null;
}

export interface CurrentRoundResponse {
  currentRound:
    | (RoundInfo & { listings?: unknown[] })
    | null;
  lastClosedRound: RoundInfo | null;
  allRounds: RoundInfo[];
  totalRounds: number;
  roundListingMap: Record<string, number[]>;
}

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  target: "all" | "dealer" | "company";
  createdAt: string;
}

export interface LiveSettlementItem {
  id: string;
  settledAt: string | null;
  slaughterHouse: string;
  companyName: string;
  breed: string;
  gender: string;
  partName: string;
  weight: number;
  bidPrice: number;
  bidAmount: number;
  grade: string;
}

export interface CompanyInfo {
  id: string;
  name: string | null;
  representative: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  businessNumber: string | null;
  ecommerceNumber: string | null;
  address: string | null;
  businessHours: string | null;
  updatedAt: string | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`요청 실패: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchActiveAuctionDate(): Promise<string> {
  const data = await getJson<{ date: string }>("/api/active-auction-date");
  return data.date;
}

export async function fetchCurrentRound(
  date: string,
): Promise<CurrentRoundResponse> {
  const params = new URLSearchParams({ date });
  return await getJson<CurrentRoundResponse>(
    `/api/auctions/rounds/current?${params.toString()}`,
  );
}

export async function fetchNotices(limit = 6): Promise<NoticeItem[]> {
  const params = new URLSearchParams({ target: "all", limit: String(limit) });
  return await getJson<NoticeItem[]>(`/api/notices?${params.toString()}`);
}

export async function fetchCompanyInfo(): Promise<CompanyInfo> {
  return await getJson<CompanyInfo>("/api/company-info");
}

export async function fetchLiveSettlements(
  limit = 20,
): Promise<LiveSettlementItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const data = await getJson<{ records: LiveSettlementItem[] }>(
    `/api/main/live-settlements?${params.toString()}`,
  );
  return data.records;
}

export interface AuctionCalendarDay {
  date: string;
  totalListings: number;
}

export interface AuctionCalendarResponse {
  month: string;
  days: AuctionCalendarDay[];
}

export async function fetchAuctionCalendar(
  month: string,
  slaughterHouse?: string,
): Promise<AuctionCalendarResponse> {
  const params = new URLSearchParams({ month });
  if (slaughterHouse) params.set("slaughter_house", slaughterHouse);
  return await getJson<AuctionCalendarResponse>(
    `/api/main/auction-calendar?${params.toString()}`,
  );
}

export interface AuctionDayGradeStat {
  grade: string;
  A: number;
  B: number;
  C: number;
  total: number;
}

export interface AuctionDayStatsResponse {
  date: string;
  slaughterHouse: string | null;
  gender: string | null;
  totalListings: number;
  byGrade: AuctionDayGradeStat[];
}

export async function fetchAuctionDayStats(
  date: string,
  slaughterHouse?: string,
  gender?: string,
): Promise<AuctionDayStatsResponse> {
  const params = new URLSearchParams({ date });
  if (slaughterHouse) params.set("slaughter_house", slaughterHouse);
  if (gender) params.set("gender", gender);
  return await getJson<AuctionDayStatsResponse>(
    `/api/main/auction-day-stats?${params.toString()}`,
  );
}

export type RankingPeriod = "day" | "week" | "month";

export interface RankingBidRow {
  partName: string;
  grade: string;
  companyName: string;
  slaughterHouse: string;
  weight: number;
  bidPrice: number;
  bidAmount: number;
}

export interface RankingPartStat {
  partName: string;
  listingCount: number;
  winningCount: number;
  /** 0~1 사이의 소수. UI에서 % 로 환산해 노출 */
  winningRate: number;
  totalAmount: number;
}

export interface AuctionRankingsResponse {
  period: RankingPeriod;
  range: { start: string; end: string };
  /** 지정 기간에 데이터가 없어 최근 낙찰 시점으로 fallback 되었는지 여부 */
  isFallback: boolean;
  /** 실 데이터가 전혀 없어 미리보기용 샘플 데이터가 반환되었는지 여부 */
  isMock: boolean;
  byAmount: RankingBidRow[];
  byPart: RankingPartStat[];
}

export async function fetchAuctionRankings(
  period: RankingPeriod,
  slaughterHouse?: string,
): Promise<AuctionRankingsResponse> {
  const params = new URLSearchParams({ period });
  if (slaughterHouse) params.set("slaughter_house", slaughterHouse);
  return await getJson<AuctionRankingsResponse>(
    `/api/main/auction-rankings?${params.toString()}`,
  );
}
