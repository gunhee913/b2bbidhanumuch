import type { RoundInfo } from "@/features/main/api";
import type { LiveListing, LivePart } from "../api";

/**
 * 부위 한 칸의 경매 결과 상태.
 *
 *  - `won` · 내가 낙찰       `lost` · 입찰했으나 밀림
 *  - `noBid` · 남이 낙찰 · 나는 미참여
 *  - `passed` · 입찰 0건으로 유찰 확정 (남은 회차 없음)
 *  - `waiting` · 이번 회차 입찰 0건 · 다음 회차에 다시 상장
 */
export type PartOutcome = "won" | "lost" | "noBid" | "passed" | "waiting";

export interface PartResult {
  outcome: PartOutcome;
  /** 결과가 확정된 회차 · 모르면 null (회차 미연결 구 데이터) */
  roundNo: number | null;
  /** `waiting` 일 때 다시 상장될 회차 */
  nextRoundNo: number | null;
  /** `waiting` 이고 그 회차가 이미 열려 있으면 「진행 중」, 아니면 「대기」 */
  nextRoundOpen: boolean;
  dealerNo: string | null;
  price: number | null;
  amount: number | null;
  /** 낙찰자가 없을 때 「입찰 없음」과 「낙찰자 없음」을 가른다 */
  hadBids: boolean;
}

/** 회차 판정에 필요한 것만 · `useCurrentRound` · `useRoundSchedule` 응답에서 만든다 */
export interface RoundLookup {
  /** 개체가 배정된 회차 중 이미 마감된 마지막 회차 · 없으면 null */
  lastClosedOf: (listingId: string) => number | null;
  /**
   * 아직 마감되지 않은 다음 회차 · 유찰분이 다시 상장될 자리.
   *
   * `auctions` 행은 회차를 열 때 생기므로 예정 회차는 스케줄에만 있다.
   * 따라서 「다음 회차가 남았는가」는 스케줄 기준으로 판단한다.
   */
  nextPending: { roundNo: number; open: boolean } | null;
}

export function buildRoundLookup(
  allRounds: RoundInfo[],
  roundListingMap: Record<string, number[]>,
  scheduledRoundNos: number[],
): RoundLookup {
  const closedNos = new Set(
    allRounds.filter((r) => r.status === "closed").map((r) => r.round_no),
  );
  const openNo = allRounds.find((r) => r.status === "open")?.round_no ?? null;
  const nextNo = [
    ...new Set([...scheduledRoundNos, ...(openNo ? [openNo] : [])]),
  ]
    .sort((a, b) => a - b)
    .find((no) => !closedNos.has(no));

  return {
    lastClosedOf: (listingId) => {
      const closed = (roundListingMap[listingId] ?? []).filter((no) =>
        closedNos.has(no),
      );
      return closed.length > 0 ? Math.max(...closed) : null;
    },
    nextPending:
      nextNo == null ? null : { roundNo: nextNo, open: nextNo === openNo },
  };
}

/**
 * 표에 결과를 적을 단계인가.
 * 다음 회차가 열려 다시 입찰 중인 부위는 제외한다 · 회차 전체가 진행 중이라
 * 「진행」 을 행마다 반복해 봤자 정보가 되지 않는다.
 */
export function hasVisibleResult(
  result: PartResult | null,
): result is PartResult {
  if (!result) return false;
  return !(result.outcome === "waiting" && result.nextRoundOpen);
}

/** 낙찰자가 정해진 결과 · 낙찰가 · 총대금이 있다 */
export function isSoldResult(result: PartResult | null): result is PartResult {
  return (
    result != null &&
    (result.outcome === "won" ||
      result.outcome === "lost" ||
      result.outcome === "noBid")
  );
}

/**
 * 결과가 나온 부위는 모두 결과 띠를 받는다.
 * 낙찰 안 된 부위도 같은 높이를 가져야 3열 미니표에서 행이 가로로 줄 맞춰진다.
 */
export function hasResultRow(result: PartResult | null): result is PartResult {
  return result != null;
}

/**
 * 입찰 칸을 비워 둘 상태인가 · 유찰 확정이거나 다음 회차를 기다리는 중.
 *
 * 상태는 결과 띠의 칩(`유찰` · `대기`)이 말하므로 입찰 칸은 `-` 로 비운다.
 * 다음 회차가 이미 열려 있으면 다시 입찰 대상이므로 입력칸을 그대로 둔다.
 */
export function isBidIdle(result: PartResult | null): boolean {
  if (!result) return false;
  if (result.outcome === "passed") return true;
  return result.outcome === "waiting" && !result.nextRoundOpen;
}

function amountOf(
  bid: { bidAmount?: number | null; bidPrice: number },
  weight: number | null,
): number | null {
  if (bid.bidAmount && bid.bidAmount > 0) return bid.bidAmount;
  if (bid.bidPrice > 0 && weight && weight > 0)
    return Math.round(bid.bidPrice * weight);
  return null;
}

/**
 * 부위의 경매 결과 · 아직 결과를 말할 수 없으면 null (진행 중 · 첫 회차 시작 전).
 *
 * 순위(rank)가 매겨졌으면 그 회차의 결과를, 입찰이 0건이면 마감된 회차가 있는지 보고
 * 유찰(남은 회차 없음) / 대기(다음 회차에 다시 상장) 를 구분한다.
 */
export function buildPartResult(
  part: LivePart,
  listing: LiveListing,
  dealerId: string | null,
  rounds: RoundLookup,
): PartResult | null {
  const settled = part.allBids.some((b) => b.rank != null);
  const winner = part.allBids.find((b) => b.isWinning) ?? null;
  const mine = dealerId
    ? (part.allBids.find((b) => b.dealerId === dealerId) ?? null)
    : null;

  if (settled) {
    const source = winner ?? mine ?? part.allBids[0];
    const outcome: PartOutcome = mine?.isWinning
      ? "won"
      : winner
        ? mine
          ? "lost"
          : "noBid"
        : "passed";
    return {
      outcome,
      roundNo: source?.roundNo ?? mine?.roundNo ?? null,
      nextRoundNo: null,
      nextRoundOpen: false,
      dealerNo: winner?.dealerNo || null,
      price: winner?.bidPrice ?? null,
      amount: winner ? amountOf(winner, part.weight) : null,
      hadBids: part.allBids.length > 0,
    };
  }

  // 입찰 0건 · 마감된 회차가 하나도 없으면 아직 결과를 말할 단계가 아니다
  const lastClosed = rounds.lastClosedOf(listing.id);
  if (lastClosed == null) return null;

  const entityClosed =
    listing.status === "closed" || listing.status === "completed";
  const next = entityClosed ? null : rounds.nextPending;

  return {
    outcome: next ? "waiting" : "passed",
    roundNo: lastClosed,
    nextRoundNo: next?.roundNo ?? null,
    nextRoundOpen: !!next?.open,
    dealerNo: null,
    price: null,
    amount: null,
    hadBids: false,
  };
}
