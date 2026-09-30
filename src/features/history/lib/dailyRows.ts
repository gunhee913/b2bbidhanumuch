import type { AuctionResult, MyBidItem } from "@/features/bids/types";

export type DailyRowStatus = "active" | "won" | "lost";

/**
 * 경매내역 테이블 한 행 · 진행중 입찰과 확정 결과를 같은 모양으로 정규화.
 * `winningBid` 는 결과 행에서만 의미가 있다 (진행중은 null).
 */
export interface DailyRow {
  id: string;
  status: DailyRowStatus;
  /** cattle_parts.id · 거래처 배정 조회용 */
  partId: string;
  /** yyyy-MM-dd */
  dateStr: string;
  /** 원본 시각 문자열 ("yy.MM.dd HH:mm:ss") */
  time: string;
  slaughterHouse: string;
  companyName: string;
  /** 개체 상장번호 (예: 260720-101) · 라우팅용 */
  entityListingNo: string;
  /** 부위번호까지 포함된 전체 상장번호 (예: 260720-101-01) */
  listingNo: string;
  partName: string;
  grade: string;
  marblingScore: number | null;
  weight: number;
  minPrice: number;
  myBid: number;
  winningBid: number | null;
  totalAmount: number;
  roundNo: number | null;
}

export const STATUS_LABEL: Record<DailyRowStatus, string> = {
  active: "진행중",
  won: "낙찰",
  lost: "미낙찰",
};

/** `MyBidItem.time` ("yy.MM.dd HH:mm:ss") → "yyyy-MM-dd" */
export function activeBidDateStr(bid: MyBidItem): string {
  const match = bid.time.match(/^(\d{2})\.(\d{2})\.(\d{2})/);
  if (!match) return "";
  return `20${match[1]}-${match[2]}-${match[3]}`;
}

/** "yy.MM.dd HH:mm:ss" → "HH:mm" · 날짜는 선택일과 중복이므로 시각만 */
export function toTimeHm(time: string): string {
  const m = time.match(/(\d{2}):(\d{2})(?::\d{2})?\s*$/);
  return m ? `${m[1]}:${m[2]}` : time;
}

/** "yy.MM.dd HH:mm:ss" → "HH:mm:ss" · 테이블 제목이 날짜를 말하므로 시각(초 포함)만 */
export function toTimeHms(time: string): string {
  const m = time.match(/(\d{2}:\d{2}(?::\d{2})?)\s*$/);
  return m ? m[1] : time;
}

/** `listingNo` (예: `260720-101-01`) 에서 부위 번호(마지막 2자리) 를 추출 */
export function parsePartNo(listingNo: string): number | null {
  const m = listingNo.match(/-(\d{2})$/);
  return m ? Number(m[1]) : null;
}

function fromActiveBid(bid: MyBidItem, dateStr: string): DailyRow {
  return {
    id: `active-${bid.id}`,
    status: "active",
    partId: bid.partId,
    dateStr,
    time: bid.time,
    slaughterHouse: bid.slaughterHouse,
    companyName: bid.companyName,
    entityListingNo: bid.entityListingNo,
    listingNo: bid.listingNo,
    partName: bid.partName,
    grade: bid.grade,
    marblingScore: bid.marblingScore,
    weight: bid.weight,
    minPrice: bid.minPrice,
    myBid: bid.myBid,
    winningBid: null,
    totalAmount: bid.totalAmount,
    roundNo: bid.roundNo,
  };
}

function fromResult(r: AuctionResult): DailyRow {
  return {
    id: `result-${r.id}`,
    status: r.result,
    partId: r.partId,
    dateStr: r.listingDate,
    time: r.time,
    slaughterHouse: r.slaughterHouse,
    companyName: r.companyName,
    entityListingNo: r.entityListingNo,
    listingNo: r.listingNo,
    partName: r.partName,
    grade: r.grade,
    marblingScore: r.marblingScore,
    weight: r.weight,
    minPrice: r.minPrice,
    myBid: r.myBid,
    winningBid: r.winningBid,
    totalAmount: r.totalAmount,
    roundNo: r.roundNo,
  };
}

const LISTING_NO_COLLATOR = new Intl.Collator("ko-KR", { numeric: true });

/**
 * 진행중 입찰 + 결과를 하나의 행 목록으로 · `includeDate` 를 통과하는 날짜만.
 * 기본 정렬은 상장번호 오름차순 (같은 개체의 부위가 인접).
 */
export function buildDailyRows(
  activeBids: readonly MyBidItem[],
  results: readonly AuctionResult[],
  includeDate: (dateStr: string) => boolean,
): DailyRow[] {
  const active = activeBids.flatMap((b) => {
    const d = activeBidDateStr(b);
    return d && includeDate(d) ? [fromActiveBid(b, d)] : [];
  });
  const settled = results
    .filter((r) => !!r.listingDate && includeDate(r.listingDate))
    .map(fromResult);
  return [...active, ...settled].sort((a, b) =>
    LISTING_NO_COLLATOR.compare(a.listingNo, b.listingNo),
  );
}

export interface DailySummary {
  activeCount: number;
  wonCount: number;
  lostCount: number;
  /** 낙찰 확정 금액 합 */
  wonAmount: number;
  /** 낙찰 + 진행중 금액 합 · 합계 행용 */
  committedAmount: number;
  /** 낙찰 + 진행중 중량 합 · 합계 행용 */
  committedWeight: number;
}

export function summarizeRows(rows: readonly DailyRow[]): DailySummary {
  const s: DailySummary = {
    activeCount: 0,
    wonCount: 0,
    lostCount: 0,
    wonAmount: 0,
    committedAmount: 0,
    committedWeight: 0,
  };
  for (const row of rows) {
    if (row.status === "active") {
      s.activeCount++;
      s.committedAmount += row.totalAmount;
      s.committedWeight += row.weight;
    } else if (row.status === "won") {
      s.wonCount++;
      s.wonAmount += row.totalAmount;
      s.committedAmount += row.totalAmount;
      s.committedWeight += row.weight;
    } else {
      s.lostCount++;
    }
  }
  return s;
}

/** 회차별 그룹 · 회차 오름차순, 회차 없는 행은 맨 뒤 · 그룹 안 순서는 입력 순서 유지 */
export function groupRowsByRound(
  rows: readonly DailyRow[],
): { roundNo: number | null; rows: DailyRow[] }[] {
  const map = new Map<number | null, DailyRow[]>();
  for (const row of rows) {
    const list = map.get(row.roundNo);
    if (list) list.push(row);
    else map.set(row.roundNo, [row]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === b) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return a - b;
    })
    .map(([roundNo, list]) => ({ roundNo, rows: list }));
}
