/**
 * `/insight` 시세·동향 페이지에서 사용하는 API 클라이언트.
 *
 * `/api/market/part-grade-prices` · 부위 × 등급 세부 요약
 */

export interface MarketPartGradeRow {
  partName: string;
  grade: string; // "1++(9)" | "1++(8)" | "1++(7)" | "1+" | "1" | "2" | "3"
  minWeight: number;
  maxWeight: number;
  avgWeight: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  minAmount: number;
  maxAmount: number;
  avgAmount: number;
  count: number;
}

export interface MarketPartGradePricesResponse {
  startDate: string;
  endDate: string;
  grade: string;
  rows: MarketPartGradeRow[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `요청 실패: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchMarketPartGradePrices(params: {
  startDate: string;
  endDate: string;
  grade?: string | null;
}): Promise<MarketPartGradePricesResponse> {
  const qs = new URLSearchParams();
  qs.set("startDate", params.startDate);
  qs.set("endDate", params.endDate);
  if (params.grade) qs.set("grade", params.grade);
  return await getJson<MarketPartGradePricesResponse>(
    `/api/market/part-grade-prices?${qs.toString()}`,
  );
}
