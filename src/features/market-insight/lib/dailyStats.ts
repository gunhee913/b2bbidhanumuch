import type { AuctionResult } from "@/features/bids/types";
import type { DistItem } from "../components/DonutCard";
import { GRADE_BUCKETS, toFineGrade } from "@/features/history/lib/gradeKey";

/**
 * 경매통계 집계 · 날 하나를 단위로 센다.
 *
 * 캘린더는 달을 깔아 「어느 날 많이 먹었나」 를 보이고, 그 날을 누르면 도넛 셋이
 * 「그날을 무엇으로 채웠나」 를 편다. 둘 다 같은 자료(`useMyAuctionResults`)에서
 * 나오므로 자르는 손을 한곳에 둔다.
 */

/** 날 하나 · 캘린더 칸이 읽는 값 */
export interface DayStat {
  /** `yyyy-MM-dd` */
  dateStr: string;
  wonCount: number;
  lostCount: number;
  wonAmount: number;
}

/**
 * 도넛에 세우는 조각 수 천장 · 「기타」 를 포함한다.
 *
 * 카드 본문이 도넛 지름(140px)에 묶여 있어 범례가 여섯 줄을 넘으면 넘친다. 그보다
 * 앞서, 조각이 열이 넘으면 무채색 사다리 일곱 단이 돌아 같은 색이 두 번 나오고
 * 1~2% 짜리 실오라기가 테두리에 묻혀 도넛이 그림 노릇을 못 한다.
 *
 * 꼬리는 「기타」 하나로 묶고 원래 조각은 `children` 에 담는다 — 범례의 「기타」 에
 * 손을 올리면 거기서 편다. 도려내는 것이 아니라 한 겹 접어 두는 것이다.
 */
const DIST_MAX_SLICES = 6;

/** 일자별로 묶는다 · 날짜가 없는 행은 어느 칸에도 못 놓으므로 버린다 */
export function buildDayStats(
  results: readonly AuctionResult[],
): Record<string, DayStat> {
  const map: Record<string, DayStat> = {};
  for (const r of results) {
    if (!r.listingDate) continue;
    const stat = (map[r.listingDate] ??= {
      dateStr: r.listingDate,
      wonCount: 0,
      lostCount: 0,
      wonAmount: 0,
    });
    if (r.result === "won") {
      stat.wonCount += 1;
      stat.wonAmount += r.totalAmount;
    } else {
      stat.lostCount += 1;
    }
  }
  return map;
}

/** 구간 하나 · 막대 한 칸이 읽는 값 (`yyyy-MM` 또는 `yyyy`) */
export interface BucketStat {
  key: string;
  wonCount: number;
  lostCount: number;
  wonAmount: number;
}

/**
 * 날짜를 구간 열쇠로 묶고 **빈 구간도 칸으로 세운다.**
 *
 * 있는 달만 늘어세우면 4월과 6월이 나란히 서서 5월이 안 보인다 — 쉰 달인지 아예
 * 없던 달인지 구분이 안 되고, 막대 사이 거리가 시간 거리와 어긋나 추이가 거짓으로
 * 읽힌다. 처음 구간부터 마지막 구간까지 한 칸씩 깔고 빈 구간은 값 0 으로 둔다.
 *
 * 열쇠가 글자로 정렬되는 꼴(`2026-03` · `2026`)이라 다음 칸을 세는 일만 밖에서
 * 받는다 — 달은 12 에서 해를 넘기고 해는 그냥 하나를 더한다.
 */
function bucketize(
  results: readonly AuctionResult[],
  keyOf: (dateStr: string) => string,
  nextKey: (key: string) => string,
  /** 자료가 여기 못 미쳐도 여기까지는 칸을 깐다 · 「올해」 로 뛸 자리를 남긴다 */
  extendTo?: string,
): BucketStat[] {
  const map = new Map<string, BucketStat>();
  for (const r of results) {
    if (!r.listingDate) continue;
    const key = keyOf(r.listingDate);
    const stat = map.get(key) ?? {
      key,
      wonCount: 0,
      lostCount: 0,
      wonAmount: 0,
    };
    if (r.result === "won") {
      stat.wonCount += 1;
      stat.wonAmount += r.totalAmount;
    } else {
      stat.lostCount += 1;
    }
    map.set(key, stat);
  }
  if (map.size === 0) return [];

  const present = [...map.keys()].sort();
  const latest = present[present.length - 1];
  const last = extendTo && extendTo > latest ? extendTo : latest;
  const out: BucketStat[] = [];
  for (let key = present[0]; ; key = nextKey(key)) {
    out.push(map.get(key) ?? { key, wonCount: 0, lostCount: 0, wonAmount: 0 });
    if (key === last) break;
  }
  return out;
}

export const buildMonthStats = (results: readonly AuctionResult[]) =>
  bucketize(
    results,
    (d) => d.slice(0, 7),
    (key) => {
      const [y, m] = key.split("-").map(Number);
      return m === 12
        ? `${y + 1}-01`
        : `${y}-${String(m + 1).padStart(2, "0")}`;
    },
  );

/**
 * 해마다 한 칸 · **올해까지는 자료가 없어도 칸을 깐다.**
 *
 * 「올해」 단추가 설 자리를 위해서다. 자료가 재작년에 멈춘 사람이 올해로 뛰면
 * 갈 칸이 없어 단추가 죽는데, 캘린더의 「오늘」 은 장이 안 선 날에도 가 준다 —
 * 세 탭이 같은 약속을 써야 한다.
 */
export const buildYearStats = (results: readonly AuctionResult[]) =>
  bucketize(
    results,
    (d) => d.slice(0, 4),
    (key) => String(Number(key) + 1),
    String(new Date().getFullYear()),
  );

/**
 * 한 해를 **열두 칸으로 꽉 채워** 돌려준다 · 거래가 없던 달도 빈 칸으로.
 *
 * `buildMonthStats` 는 자료가 있는 첫 달부터 마지막 달까지만 깐다. 그 길로는 2월에
 * 시작해 10월에 멈춘 해가 아홉 칸짜리 그림이 되는데, 보는 쪽에서는 그게 「1월에는
 * 안 샀다」 인지 「아직 1월 자료가 안 들어왔다」 인지 알 수가 없다. 한 해를 보는
 * 자리라면 열두 칸이 다 서 있어야 빈 달도 하나의 사실로 읽힌다.
 *
 * 칸 수가 해마다 같아지는 덤도 있다 — 해를 넘겨도 막대 굵기와 자리가 안 움직여,
 * 두 해를 번갈아 보며 같은 달끼리 견줄 수 있다.
 */
export function buildMonthsOfYear(
  results: readonly AuctionResult[],
  year: string,
): BucketStat[] {
  const inYear = results.filter((r) => r.listingDate?.startsWith(year));
  const found = new Map(buildMonthStats(inYear).map((b) => [b.key, b]));
  return Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return found.get(key) ?? { key, wonCount: 0, lostCount: 0, wonAmount: 0 };
  });
}

/** 낙찰이 있던 구간 중 가장 늦은 것 · 화면을 열 때 세울 자리 */
export function latestBucketWith(
  buckets: readonly BucketStat[],
): string | null {
  for (let i = buckets.length - 1; i >= 0; i -= 1) {
    if (buckets[i].wonCount > 0) return buckets[i].key;
  }
  return null;
}

/** 자료가 있는 날 중 가장 늦은 날 · 화면을 열 때 세울 자리 */
export function latestDateWith(stats: Record<string, DayStat>): string | null {
  const keys = Object.keys(stats).filter((k) => stats[k].wonCount > 0);
  if (keys.length === 0) return null;
  return keys.reduce((max, k) => (k > max ? k : max), keys[0]);
}

/**
 * 도넛 분포 · **금액 기준**.
 *
 * 건수가 아니라 금액으로 세는 건 이 자리에 오는 까닭이 「내 돈이 어디로 갔나」 라서다.
 * 건수로 셋에 하나인 부위가 금액으로는 스물에 하나일 수 있다. 건수도 같이 들고 다니며
 * 범례와 말풍선에 적는다.
 */
export function buildAmountDist(
  dayResults: readonly AuctionResult[],
  keyOf: (r: AuctionResult) => string,
  preferredOrder?: readonly string[],
): DistItem[] {
  const map = new Map<string, { count: number; amount: number }>();
  let total = 0;
  for (const r of dayResults) {
    if (r.result !== "won") continue;
    const key = keyOf(r);
    const cur = map.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += r.totalAmount;
    map.set(key, cur);
    total += r.totalAmount;
  }
  if (total === 0) return [];

  const pctOf = (amount: number) => Math.round((amount / total) * 100);
  const rows: DistItem[] = Array.from(map.entries()).map(([name, b]) => ({
    name,
    count: b.count,
    amount: b.amount,
    pct: pctOf(b.amount),
  }));
  const byAmount = (a: DistItem, b: DistItem) => b.amount - a.amount;

  /*
   * 보이는 차례와 남기는 기준을 따로 둔다.
   *
   * 무엇을 남길지는 늘 금액이 정하지만(큰 조각이 남아야 한다), 늘어서는 차례는
   * 축에 따라 다르다. 등급은 제 차례가 있어 크기순으로 흩트리면 1++(9) 아래에
   * 2 가 오고 그 아래 1+ 가 오는 목록이 된다 — 등급표를 아는 눈이 매번 멈춘다.
   */
  const orderIndex = (name: string) => {
    if (!preferredOrder) return 0;
    const at = preferredOrder.indexOf(name);
    return at === -1 ? preferredOrder.length : at;
  };
  const inDisplayOrder = (items: DistItem[]) =>
    preferredOrder
      ? [...items].sort(
          (a, b) => orderIndex(a.name) - orderIndex(b.name) || byAmount(a, b),
        )
      : [...items].sort(byAmount);

  /* 꼭 천장만큼이면 묶지 않는다 · 한 조각짜리 「기타」 는 접은 것이 아니라 가린 것이다 */
  if (rows.length <= DIST_MAX_SLICES) return inDisplayOrder(rows);

  const ranked = [...rows].sort(byAmount);
  return [
    ...inDisplayOrder(ranked.slice(0, DIST_MAX_SLICES - 1)),
    lump(ranked.slice(DIST_MAX_SLICES - 1), pctOf),
  ];
}

/** 꼬리를 「기타」 하나로 · 원래 조각들은 `children` 에 담아 말풍선에서 편다 */
function lump(items: DistItem[], pctOf: (amount: number) => number): DistItem {
  const amount = items.reduce((sum, e) => sum + e.amount, 0);
  return {
    name: "기타",
    count: items.reduce((sum, e) => sum + e.count, 0),
    amount,
    pct: pctOf(amount),
    children: [...items].sort((a, b) => b.amount - a.amount),
  };
}

/**
 * 낙찰률 도넛 · 여기만 **건수 기준**이다.
 *
 * 비율을 금액으로 내면 분모가 미낙찰 쪽에 없다 — 못 딴 건에는 내가 낸 값만 있고
 * 거래액이 없어서다. 그래서 조각 크기를 건수로 두고(`amount` 칸에 건수를 담는다)
 * 카드에 `unit="count"` 를 준다.
 */
export function buildWinRateDist(
  dayResults: readonly AuctionResult[],
): DistItem[] {
  const total = dayResults.length;
  if (total === 0) return [];
  const won = dayResults.filter((r) => r.result === "won").length;
  const lost = total - won;
  const toSlice = (name: string, count: number): DistItem => ({
    name,
    count,
    amount: count,
    pct: Math.round((count / total) * 100),
  });
  return [
    ...(won > 0 ? [toSlice("낙찰", won)] : []),
    ...(lost > 0 ? [toSlice("미낙찰", lost)] : []),
  ];
}

/** 등급 축 · 육량(A·B·C)은 묶는다 · 하루치에서 스물넉 조각은 도넛이 안 읽힌다 */
export const gradeAxis = toFineGrade;
export const GRADE_ORDER = GRADE_BUCKETS;

/** 부위 축 */
export const partAxis = (r: AuctionResult) => r.partName || "기타";

/**
 * 「비싸게 샀다」 고 보는 선 (%) · 같은 부위·등급 평균 위로 이만큼 넘어가면.
 *
 * 평균 언저리는 늘 오르내린다. 한 묶음이 두어 건인 날이 많아 ±2% 쯤은 표본이
 * 흔들린 자국이지 내가 더 쓴 것이 아니다. 선을 그 바깥에 둬야 걸리는 줄이 뜻을
 * 갖는다.
 */
export const OVER_AVERAGE_PCT = 5;

/**
 * 같은 부위·등급의 최근 한 달 시장 평균단가 대비 몇 % 위/아래에서 땄나.
 *
 * **같은 물건끼리 견주는 값이라 부위를 섞어도 흔들리지 않는다.** 합산 평균단가를
 * 못 쓰던 까닭(부위마다 kg 값이 배로 갈린다)이 여기엔 없다 — 안심은 안심의 평균과,
 * 사태는 사태의 평균과 견준 뒤 그 비율만 모으기 때문이다.
 *
 * 견줄 평균이 없거나(그 묶음이 이 창에 안 잡혔거나) 표본이 혼자뿐이면 잴 것이 없다.
 */
export function overAveragePct(
  r: AuctionResult,
  average: { avg: number; count: number } | undefined,
  minSample: number,
): number | null {
  const price = r.winningBid ?? r.myBid;
  if (!average || average.count < minSample || average.avg <= 0 || price <= 0) {
    return null;
  }
  return ((price - average.avg) / average.avg) * 100;
}

/** 미낙찰 한 건에서 모자랐던 단가 · 낙찰가가 안 적혔으면 잴 것이 없다 */
export function missedBy(r: AuctionResult): number | null {
  if (r.winningBid === null || r.winningBid <= 0 || r.myBid <= 0) return null;
  return r.winningBid - r.myBid;
}
