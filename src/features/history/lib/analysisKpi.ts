import type { AuctionResult } from "@/features/bids/types";

export interface AnalysisKpi {
  total: number;
  wonCount: number;
  lostCount: number;
  wonAmount: number;
  wonWeight: number;
  avgWinPrice: number;
  maxWinPrice: number;
  winRate: number;
  participatedDayCount: number;
  dailyAvgWonAmount: number;
}

/**
 * 딜러 성과 KPI · 참여 · 낙찰 · 단가 · 규모 종합.
 * 입력은 이미 기간 필터가 적용된 결과 목록.
 */
export function computeAnalysisKpi(results: readonly AuctionResult[]): AnalysisKpi {
  let wonCount = 0;
  let lostCount = 0;
  let wonAmount = 0;
  let wonWeight = 0;
  let wonPriceSum = 0;
  let wonPriceN = 0;
  let maxWinPrice = 0;
  const participatedDates = new Set<string>();
  const wonDates = new Set<string>();

  for (const r of results) {
    if (r.listingDate) participatedDates.add(r.listingDate);
    if (r.result === "won") {
      wonCount++;
      wonAmount += r.totalAmount;
      wonWeight += r.weight;
      const price = r.winningBid ?? r.myBid;
      if (price > 0) {
        wonPriceSum += price;
        wonPriceN++;
        if (price > maxWinPrice) maxWinPrice = price;
      }
      if (r.listingDate) wonDates.add(r.listingDate);
    } else {
      lostCount++;
    }
  }

  const total = wonCount + lostCount;
  return {
    total,
    wonCount,
    lostCount,
    wonAmount,
    wonWeight,
    avgWinPrice: wonPriceN > 0 ? Math.round(wonPriceSum / wonPriceN) : 0,
    maxWinPrice,
    winRate: total > 0 ? Math.round((wonCount / total) * 100) : 0,
    participatedDayCount: participatedDates.size,
    dailyAvgWonAmount:
      wonDates.size > 0 ? Math.round(wonAmount / wonDates.size) : 0,
  };
}

/** `listingDate` 가 [start, end] (yyyy-MM-dd, inclusive) 안에 있는 결과만 · 날짜 없는 행은 제외 */
export function filterResultsByRange(
  results: readonly AuctionResult[],
  start: string,
  end: string,
): AuctionResult[] {
  return results.filter(
    (r) => !!r.listingDate && r.listingDate >= start && r.listingDate <= end,
  );
}
