import type { DailyRow } from "./dailyRows";

export type HistorySortKey = "listingNo" | "weight" | "minPrice" | "myBid";
export type HistorySortDir = "asc" | "desc";
export interface HistorySort {
  key: HistorySortKey;
  dir: HistorySortDir;
}

/** 헤더 클릭 순환 · 없음 → 오름 → 내림 → 없음 (다른 컬럼을 누르면 그 컬럼 오름부터) */
export function cycleHistorySort(
  prev: HistorySort | null,
  key: HistorySortKey,
): HistorySort | null {
  if (!prev || prev.key !== key) return { key, dir: "asc" };
  if (prev.dir === "asc") return { key, dir: "desc" };
  return null;
}

const LISTING_NO_COLLATOR = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

/** 값 없는(0 이하) 숫자는 방향과 무관하게 뒤로 · 같은 값은 원래 순서 유지 */
export function sortDailyRows(
  rows: readonly DailyRow[],
  sort: HistorySort | null,
): DailyRow[] {
  if (!sort) return [...rows];
  const sign = sort.dir === "asc" ? 1 : -1;
  if (sort.key === "listingNo") {
    return [...rows].sort(
      (a, b) => LISTING_NO_COLLATOR.compare(a.listingNo, b.listingNo) * sign,
    );
  }
  const key = sort.key;
  return [...rows].sort((a, b) => {
    const av = a[key] > 0 ? a[key] : null;
    const bv = b[key] > 0 ? b[key] : null;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * sign;
  });
}

export function toAriaSort(
  sort: HistorySort | null,
  key: HistorySortKey,
): "ascending" | "descending" | "none" {
  if (!sort || sort.key !== key) return "none";
  return sort.dir === "asc" ? "ascending" : "descending";
}
