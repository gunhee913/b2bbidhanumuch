import { format } from "date-fns";
import type { DailyListing, DailyListingPart } from "../hooks/useDailyListings";

/** 부위 행 상태 · 내 낙찰 / 내 미낙찰 / 타인 낙찰 / 유찰 / 진행중 */
export type PartRowState = "mineWon" | "mineLost" | "otherWon" | "unsold" | "open";

export function getPartRowState(part: DailyListingPart, settled: boolean): PartRowState {
  if (part.myBid?.isWinning) return "mineWon";
  if (part.hasWinner) return part.myBid ? "mineLost" : "otherWon";
  return settled ? "unsold" : "open";
}

/** 상장이 `auction` 상태로 남아 있어도 경매일이 지났으면 낙찰 없는 부위는 유찰 */
export function isListingSettled(listing: DailyListing): boolean {
  return (
    listing.status === "completed" ||
    listing.status === "closed" ||
    listing.listingDate < format(new Date(), "yyyy-MM-dd")
  );
}

export interface PartsSummary {
  total: number;
  wonCount: number;
  myBidCount: number;
  myWonCount: number;
  /** Σ 낙찰단가 × 중량 · 낙찰 확정 부위만 */
  wonAmount: number;
  /** 내가 낙찰한 부위의 Σ 낙찰대금 */
  myWonAmount: number;
}

/** bidAmount 가 비어 있으면 단가 × 중량으로 계산 */
function amountOf(
  amount: number | null | undefined,
  price: number | null | undefined,
  weight: number | null,
): number {
  if (amount && amount > 0) return amount;
  if (price && price > 0 && weight && weight > 0) return Math.round(price * weight);
  return 0;
}

export function summarizeParts(parts: readonly DailyListingPart[]): PartsSummary {
  const s: PartsSummary = {
    total: parts.length,
    wonCount: 0,
    myBidCount: 0,
    myWonCount: 0,
    wonAmount: 0,
    myWonAmount: 0,
  };
  for (const p of parts) {
    if (p.hasWinner) {
      s.wonCount++;
      s.wonAmount += amountOf(p.highestBid?.bidAmount, p.highestBid?.bidPrice, p.weight);
    }
    if (p.myBid) {
      s.myBidCount++;
      if (p.myBid.isWinning) {
        s.myWonCount++;
        s.myWonAmount += amountOf(p.myBid.bidAmount, p.myBid.bidPrice, p.weight);
      }
    }
  }
  return s;
}

export function summarizeListings(listings: readonly DailyListing[]) {
  return listings.reduce(
    (acc, l) => {
      const s = summarizeParts(l.parts);
      acc.partCount += s.total;
      acc.wonCount += s.wonCount;
      acc.myWonCount += s.myWonCount;
      return acc;
    },
    { partCount: 0, wonCount: 0, myWonCount: 0 },
  );
}

/** 부위를 컬럼 수만큼 순서대로 잘라 나눈다 · 20개 → 7 / 7 / 6 */
export function splitParts<T>(items: readonly T[], columns: number): T[][] {
  const size = Math.ceil(items.length / columns);
  return Array.from({ length: columns }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

/** 배열을 n개씩 묶는다 · 인쇄 페이지 나누기 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function partNoLabel(part: DailyListingPart, listingNo: string): string {
  return part.listingPartNo || `${listingNo}-${String(part.partNo).padStart(2, "0")}`;
}

export function dash(v: string | number | null | undefined): string | number {
  return v === null || v === undefined || v === "" ? "-" : v;
}

/** 소수 1자리 고정 · `33kg` / `10.1kg` 섞이지 않게 */
export function formatWeight(weight: number | null): string {
  if (!weight || weight <= 0) return "-";
  return `${weight.toFixed(1)}kg`;
}

/** "2026-01-15" → "26.01.15" */
export function shortDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1].slice(2)}.${m[2]}.${m[3]}` : iso;
}
