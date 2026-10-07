export interface PartGradePriceRow {
  /** 좌·우를 합친 대분류 이름 (`등심`) */
  partName: string;
  /** `1++(9)` · `1+` · `2` … · 육질등급 (근내지방도가 붙을 수 있다) */
  grade: string;
  /** `A` · `B` · `C` · 등급 글자에 안 적혀 있던 것은 `null` */
  yieldGrade: string | null;
  count: number;
  weightSum: number;
  weightCount: number;
  /** 원/kg 합 · 평균은 받는 쪽이 `priceSum / count` 로 낸다 */
  priceSum: number;
  priceMin: number;
  priceMax: number;
  amountSum: number;
}

export interface PartGradePricesResponse {
  startDate: string;
  endDate: string;
  rows: PartGradePriceRow[];
}

/**
 * 부위 × 등급 시장 낙찰 시세 요약 · 한 번에 모든 부위를 받는다.
 *
 * 일자별 시세(`fetchPartPriceSeries`)는 부위와 등급을 하나씩 받아 한 조합에 한 번씩
 * 다녀와야 한다. 경매통계는 하루에 부위가 열아홉까지 나와 그 길로는 스무 번을 다녀온다.
 *
 * **평균이 아니라 합이 온다.** 육량(A·B·C)을 묶으려면 합이 있어야 한다 — 건수가 다른
 * 평균의 평균은 평균이 아니다.
 */
export async function fetchPartGradePrices(params: {
  startDate: string;
  endDate: string;
}): Promise<PartGradePricesResponse> {
  const query = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const res = await fetch(`/api/market/part-grade-prices?${query}`);
  if (!res.ok) throw new Error("부위·등급 시세를 불러오지 못했습니다.");
  return res.json();
}
