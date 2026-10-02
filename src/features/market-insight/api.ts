/**
 * `/insight` 분석·통계 페이지에서 사용하는 API 클라이언트.
 *
 * `/api/market/part-grade-prices` · 부위 × 등급 세부 요약
 */

/**
 * 부위 × 육질등급 × 육량등급 한 덩이 · **평균이 아니라 합**이다.
 *
 * 「육량등급 통합」 을 누르면 A·B·C 세 줄이 한 줄로 합쳐지는데, 평균만 받아 두면
 * 셋을 다시 합칠 수가 없다 — 건수가 다른 평균의 평균은 평균이 아니다. 나누는 일은
 * 화면이 맡는다 (`buildMarketRows`).
 */
export interface MarketPartGradeRow {
  partName: string;
  /** 육량을 뺀 등급 열쇠 · "1++(9)" | "1++(8)" | "1++(7)" | "1+" | "1" | "2" | "3" */
  grade: string;
  /** "A" | "B" | "C" · 등급 글자에 안 적혀 있던 것은 null */
  yieldGrade: string | null;
  count: number;
  /** kg · 중량이 적힌 것만 더한다 */
  weightSum: number;
  /** 중량이 적힌 건수 · 평균을 내는 분모 (전체 건수와 다를 수 있다) */
  weightCount: number;
  /** 원/kg 합 */
  priceSum: number;
  /** 원/kg 최저 · 합칠 때는 더 작은 쪽을 고른다 */
  priceMin: number;
  /** 원/kg 최고 · 합칠 때는 더 큰 쪽을 고른다 */
  priceMax: number;
  /** 원 합 (단가 × 중량) */
  amountSum: number;
}

export interface MarketPartGradePricesResponse {
  startDate: string;
  endDate: string;
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
}): Promise<MarketPartGradePricesResponse> {
  const qs = new URLSearchParams();
  qs.set("startDate", params.startDate);
  qs.set("endDate", params.endDate);
  return await getJson<MarketPartGradePricesResponse>(
    `/api/market/part-grade-prices?${qs.toString()}`,
  );
}
