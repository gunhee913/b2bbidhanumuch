import type { LivePart } from "../api";

/** 부위 묶음(개체 · 부위 그룹) 결과 요약 · 상장표 우측 결과 열과 푸터 소계가 쓴다 */
export interface PartsSummary {
  total: number;
  myBidCount: number;
  totalWeight: number;
  settledCount: number;
  /** 낙찰 확정 부위 수 · Σ 낙찰대금 */
  wonCount: number;
  wonAmount: number;
  /** 내가 낙찰한 부위의 Σ 낙찰대금 · 마감 전 낙찰자 없는 부위에 걸린 내 입찰 수 */
  myWonAmount: number;
  myOpenCount: number;
}

export function isPartSettled(part: LivePart): boolean {
  return part.allBids.some((b) => b.rank != null);
}

/** 입찰 대금 · 서버 bidAmount 우선, 없으면 단가 × 중량 */
export function amountOf(
  bid: { bidAmount?: number | null; bidPrice: number },
  weight: number | null,
): number {
  if (bid.bidAmount && bid.bidAmount > 0) return bid.bidAmount;
  if (bid.bidPrice > 0 && weight && weight > 0)
    return Math.round(bid.bidPrice * weight);
  return 0;
}

export function summarizeParts(
  parts: readonly LivePart[],
  dealerId: string | null,
): PartsSummary {
  return parts.reduce<PartsSummary>(
    (acc, p) => {
      const settled = isPartSettled(p);
      const winning = p.allBids.find((b) => b.isWinning);
      const mine = dealerId
        ? p.allBids.find((b) => b.dealerId === dealerId)
        : undefined;
      return {
        total: acc.total + 1,
        myBidCount: acc.myBidCount + (mine ? 1 : 0),
        totalWeight: acc.totalWeight + (p.weight ?? 0),
        settledCount: acc.settledCount + (settled ? 1 : 0),
        wonCount: acc.wonCount + (winning ? 1 : 0),
        wonAmount: acc.wonAmount + (winning ? amountOf(winning, p.weight) : 0),
        myWonAmount:
          acc.myWonAmount + (mine?.isWinning ? amountOf(mine, p.weight) : 0),
        myOpenCount:
          acc.myOpenCount +
          (mine && !mine.isWinning && !settled && !winning ? 1 : 0),
      };
    },
    {
      total: 0,
      myBidCount: 0,
      totalWeight: 0,
      settledCount: 0,
      wonCount: 0,
      wonAmount: 0,
      myWonAmount: 0,
      myOpenCount: 0,
    },
  );
}
