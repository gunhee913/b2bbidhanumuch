import type { LiveListing, LivePart, LivePartBid } from "../api";
import { GRADE_FILTER_OPTIONS, toGradeSeriesKey } from "./grade";

/** 낙찰·상장 집계 한 칸 · 회차 전체 · 부위 · 등급이 모두 같은 모양을 쓴다 */
export interface RoundResultCell {
  /** 그 회차에 오른 부위 수 */
  offered: number;
  /** 그 회차에 팔린 부위 수 */
  won: number;
  /** 낙찰 총액 (원) */
  amount: number;
  /** 낙찰분 중량 합 (kg) · 평균 단가의 분모 */
  weight: number;
}

export interface RoundGradeRow extends RoundResultCell {
  /** `1++(9)` · `1+` · `2` 처럼 시세 차트와 같은 등급 키 */
  grade: string;
}

export interface RoundPartRow extends RoundResultCell {
  partName: string;
  /** 상장표와 같은 순서로 세우기 위한 부위 번호 */
  partNo: number;
  grades: RoundGradeRow[];
}

export interface RoundResult {
  roundNo: number;
  total: RoundResultCell;
  parts: RoundPartRow[];
}

/** 낙찰 총액 ÷ 낙찰 중량 · 잴 수 없으면 null */
export function avgPerKg(cell: RoundResultCell): number | null {
  if (cell.weight <= 0 || cell.amount <= 0) return null;
  return Math.round(cell.amount / cell.weight);
}

/** 낙찰률 0~1 · 상장이 없으면 null */
export function wonRate(cell: RoundResultCell): number | null {
  if (cell.offered <= 0) return null;
  return cell.won / cell.offered;
}

/**
 * 회차 한 번의 경매 결과 · 부위를 바깥 축, 등급을 안쪽 축으로 묶는다.
 *
 * 등급만으로 묶은 평균 단가는 시세가 아니라 부위 구성비다. 실제로 1++A 가 51,554원/kg,
 * 1+A 가 103,100원/kg 으로 뒤집혀 나온 적이 있는데, 1+A 쪽 낙찰이 비싼 부위 한 건뿐이고
 * 1++A 에는 우둔·사태가 섞여 있었을 뿐이다. 그래서 등급은 부위 안에서만 비교한다.
 *
 * 회차별 상장 수는 `roundListingMap`(개체가 걸린 회차 목록)에서 앞 회차 낙찰분을 빼서 구한다.
 * 안 팔린 부위만 다음 회차로 넘어가므로 이 뺄셈이 곧 그 회차의 상장 목록이다.
 *
 * 마감된 회차에만 쓴다. 진행 중에는 비공개 입찰 정책상 매참인에게 `isWinning` 이
 * 내려오지 않아 낙찰이 0건으로 보인다.
 */
export function buildRoundResult(
  roundNo: number,
  listings: LiveListing[],
  roundListingMap: Record<string, number[]>,
): RoundResult {
  const soldRound = buildSoldRoundMap(listings);
  const total = emptyCell();
  const byPart = new Map<string, RoundPartRow>();

  listings.forEach((listing) => {
    if (!(roundListingMap[listing.id] ?? []).includes(roundNo)) return;
    const gradeKey =
      toGradeSeriesKey(listing.grade, listing.marblingScore) ??
      listing.grade ??
      "-";

    listing.parts.forEach((part) => {
      const sold = soldRound.get(part.id);
      if (sold != null && sold < roundNo) return;

      const partRow = ensurePartRow(byPart, part);
      const gradeRow = ensureGradeRow(partRow, gradeKey);
      const win = sold === roundNo ? findWinningBid(part) : null;
      const amount = win ? amountOf(win, part.weight) : 0;
      const weight = win ? (part.weight ?? 0) : 0;

      accumulate(total, win != null, amount, weight);
      accumulate(partRow, win != null, amount, weight);
      accumulate(gradeRow, win != null, amount, weight);
    });
  });

  const parts = [...byPart.values()].sort((a, b) => a.partNo - b.partNo);
  parts.forEach((p) => p.grades.sort(byGradeRank));

  return { roundNo, total, parts };
}

/** 부위가 몇 회차에 팔렸는지 · 앞 회차에 이미 나간 부위를 걸러내는 데 쓴다 */
function buildSoldRoundMap(listings: LiveListing[]): Map<string, number> {
  const map = new Map<string, number>();
  listings.forEach((listing) =>
    listing.parts.forEach((part) => {
      const win = findWinningBid(part);
      if (win?.roundNo != null) map.set(part.id, win.roundNo);
    }),
  );
  return map;
}

function findWinningBid(part: LivePart): LivePartBid | null {
  return part.allBids.find((b) => b.isWinning) ?? null;
}

/** 서버가 총대금을 안 채워 준 옛 입찰은 단가 × 중량으로 되살린다 */
function amountOf(bid: LivePartBid, weight: number | null): number {
  if (bid.bidAmount && bid.bidAmount > 0) return bid.bidAmount;
  if (bid.bidPrice > 0 && weight && weight > 0) {
    return Math.round(bid.bidPrice * weight);
  }
  return 0;
}

function emptyCell(): RoundResultCell {
  return { offered: 0, won: 0, amount: 0, weight: 0 };
}

function accumulate(
  cell: RoundResultCell,
  won: boolean,
  amount: number,
  weight: number,
): void {
  cell.offered += 1;
  if (!won) return;
  cell.won += 1;
  cell.amount += amount;
  cell.weight += weight;
}

function ensurePartRow(
  byPart: Map<string, RoundPartRow>,
  part: LivePart,
): RoundPartRow {
  const existing = byPart.get(part.partName);
  if (existing) return existing;
  const created: RoundPartRow = {
    ...emptyCell(),
    partName: part.partName,
    partNo: part.partNo,
    grades: [],
  };
  byPart.set(part.partName, created);
  return created;
}

function ensureGradeRow(part: RoundPartRow, grade: string): RoundGradeRow {
  const existing = part.grades.find((g) => g.grade === grade);
  if (existing) return existing;
  const created: RoundGradeRow = { ...emptyCell(), grade };
  part.grades.push(created);
  return created;
}

/** 시세 차트와 같은 등급 순서 · 목록에 없는 값은 뒤로 */
function byGradeRank(a: RoundGradeRow, b: RoundGradeRow): number {
  const rank = (g: string) => {
    const i = GRADE_FILTER_OPTIONS.indexOf(
      g as (typeof GRADE_FILTER_OPTIONS)[number],
    );
    return i === -1 ? GRADE_FILTER_OPTIONS.length : i;
  };
  return rank(a.grade) - rank(b.grade) || a.grade.localeCompare(b.grade);
}
