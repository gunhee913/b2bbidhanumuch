import type { LivePart } from "../api";

export type PartSortKey = "listingPartNo" | "weight" | "minPrice";
export type PartSortDir = "asc" | "desc";
/** 정렬 상태 · 키 집합은 표마다 다르다 (부위 표는 등급·부위도 정렬한다) */
export interface SortState<K extends string = PartSortKey> {
  key: K;
  dir: PartSortDir;
}
export type PartSort = SortState<PartSortKey>;

/** 헤더 클릭 순환 · 없음 → 오름 → 내림 → 없음 (다른 컬럼을 누르면 그 컬럼 오름부터) */
export function cyclePartSort<K extends string>(
  prev: SortState<K> | null,
  key: K,
): SortState<K> | null {
  if (!prev || prev.key !== key) return { key, dir: "asc" };
  if (prev.dir === "asc") return { key, dir: "desc" };
  return null;
}

/** 상장번호(`260918-101-01`) · 숫자 구간을 수치로 비교해 `-2` 가 `-10` 앞에 온다 */
const LISTING_NO_COLLATOR = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

/** 값 없는 행은 방향과 무관하게 뒤로 · 같은 값은 원래 순서 유지(stable) */
export function sortByPart<T>(
  items: readonly T[],
  sort: PartSort | null,
  getPart: (item: T) => Pick<LivePart, PartSortKey>,
): T[] {
  if (!sort) return [...items];
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = getPart(a)[sort.key];
    const bv = getPart(b)[sort.key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" || typeof bv === "string") {
      return LISTING_NO_COLLATOR.compare(String(av), String(bv)) * sign;
    }
    return (av - bv) * sign;
  });
}

export function toAriaSort<K extends string>(
  sort: SortState<K> | null,
  key: K,
): "ascending" | "descending" | "none" {
  if (!sort || sort.key !== key) return "none";
  return sort.dir === "asc" ? "ascending" : "descending";
}
