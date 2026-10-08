import { parseGrade } from "@/features/live-auction/lib/grade";
import type { SheetEntity } from "./sheetEntity";

export type SheetSortKey =
  | "listingNo"
  | "grade"
  | "breed"
  | "gender"
  | "monthAge"
  | "companyName"
  | "marblingScore"
  | "meatColor"
  | "fatColor"
  | "texture"
  | "maturity"
  | "backFat"
  | "eyeMuscle";

export type SortDirection = "asc" | "desc";

/**
 * 머리글로 고른 정렬 · `null` 이 「원래대로」 다.
 *
 * 원래 차례는 접수번호 순이다 — 현장 상장표 · 경매결과 · 배송지시와 같은 차례라
 * 부르는 번호로 줄을 찾는다.
 */
export interface SheetSort {
  key: SheetSortKey;
  direction: SortDirection;
}

/**
 * 열 갈래 · 처음 눌렀을 때 방향과 말풍선 글귀가 갈래를 따른다.
 *
 *  - `order` 접수번호 · 큰 번호부터 — 작은 번호부터는 원래 차례와 같아 따로 두지 않는다
 *  - `text`  축종 · 성별 · 업체 · 가나다순부터
 *  - `rank`  등급 · 숫자 · 높은 것부터 — 근내지방 9 · 등심면적이 큰 개체를 찾으려고 누른다
 */
type SortKind = "order" | "text" | "rank";

const FIRST_DIRECTION: Record<SortKind, SortDirection> = {
  order: "desc",
  text: "asc",
  rank: "desc",
};

const DIRECTION_LABEL: Record<SortKind, Record<SortDirection, string>> = {
  order: { asc: "번호 순", desc: "번호 역순" },
  text: { asc: "가나다순", desc: "가나다 역순" },
  rank: { desc: "높은 순", asc: "낮은 순" },
};

type SortValue = string | number | null;

const QUALITY_ORDER = ["3", "2", "1", "1+", "1++"];
const YIELD_ORDER = ["C", "B", "A"];

/**
 * 등급을 한 줄 숫자로 · 클수록 좋은 고기 · 육질 > 근내지방도 > 육량 차례로 가른다.
 *
 * 근내지방도를 육량보다 앞에 두는 건 등급 탭(`1++(9)` · `1++(8)` …)과 같은 줄을 서기
 * 위해서다 — `1++B(9)` 가 `1++A(8)` 보다 위에 선다. 등급 글자에 괄호가 없으면
 * `marbling_score` 칸을 본다 (`parseGrade` 참고).
 */
export function gradeRank(
  grade: string,
  marblingScore: number | null,
): number | null {
  const parsed = parseGrade(grade);
  if (!parsed) return null;
  const quality = QUALITY_ORDER.indexOf(parsed.quality);
  const marbling = parsed.marbling ?? marblingScore ?? 0;
  const yieldRank = parsed.yieldGrade
    ? YIELD_ORDER.indexOf(parsed.yieldGrade) + 1
    : 0;
  return quality * 100 + marbling * 10 + yieldRank;
}

const textOrNull = (value: string) => value || null;

const SORT_COLUMNS: Record<
  SheetSortKey,
  { kind: SortKind; valueOf: (entity: SheetEntity) => SortValue }
> = {
  listingNo: { kind: "order", valueOf: (e) => textOrNull(e.listingNo) },
  grade: { kind: "rank", valueOf: (e) => gradeRank(e.grade, e.marblingScore) },
  breed: { kind: "text", valueOf: (e) => textOrNull(e.breed) },
  gender: { kind: "text", valueOf: (e) => textOrNull(e.gender) },
  monthAge: { kind: "rank", valueOf: (e) => e.monthAge },
  companyName: { kind: "text", valueOf: (e) => textOrNull(e.companyName) },
  marblingScore: { kind: "rank", valueOf: (e) => e.marblingScore },
  meatColor: { kind: "rank", valueOf: (e) => e.meatColor },
  fatColor: { kind: "rank", valueOf: (e) => e.fatColor },
  texture: { kind: "rank", valueOf: (e) => e.texture },
  maturity: { kind: "rank", valueOf: (e) => e.maturity },
  backFat: { kind: "rank", valueOf: (e) => e.backFat },
  eyeMuscle: { kind: "rank", valueOf: (e) => e.eyeMuscle },
};

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "ko", { numeric: true });
}

const ORIGINAL_ORDER: SheetSort = { key: "listingNo", direction: "asc" };

const compareListingNo = (a: SheetEntity, b: SheetEntity) =>
  compareValues(a.listingNo, b.listingNo);

/**
 * 정렬한 새 배열 · 원본은 건드리지 않는다.
 *
 * 빈 값은 방향과 상관없이 늘 맨 아래다 — 뒤집을 때마다 「-」 줄이 위로 몰려 오면
 * 정작 보려던 값이 한 화면 아래로 밀린다. 값이 같으면 접수번호 차례로 세워,
 * 같은 등급끼리는 현장에서 부르는 순서가 그대로 남는다.
 */
export function sortSheetEntities(
  entities: readonly SheetEntity[],
  sort: SheetSort | null,
): SheetEntity[] {
  const { key, direction } = sort ?? ORIGINAL_ORDER;
  const { valueOf } = SORT_COLUMNS[key];
  const sign = direction === "asc" ? 1 : -1;
  return entities
    .map((entity) => ({ entity, value: valueOf(entity) }))
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        if (a.value === b.value) return compareListingNo(a.entity, b.entity);
        return a.value === null ? 1 : -1;
      }
      return (
        sign * compareValues(a.value, b.value) ||
        compareListingNo(a.entity, b.entity)
      );
    })
    .map(({ entity }) => entity);
}

const flip = (direction: SortDirection): SortDirection =>
  direction === "asc" ? "desc" : "asc";

/** 원래 차례와 같은 줄이면 `null` 로 접는다 · 「접수번호 작은 순」 이 둘로 갈리지 않게 */
const toSheetSort = (
  key: SheetSortKey,
  direction: SortDirection,
): SheetSort | null =>
  key === ORIGINAL_ORDER.key && direction === ORIGINAL_ORDER.direction
    ? null
    : { key, direction };

/**
 * 머리글을 눌렀을 때 · 첫 방향 → 반대 방향 → 원래대로, 세 번이면 제자리다.
 * 접수번호는 첫 방향(큰 번호부터)을 뒤집으면 곧 원래대로라 두 번이면 돌아온다.
 */
export function nextSheetSort(
  current: SheetSort | null,
  key: SheetSortKey,
): SheetSort | null {
  const first = FIRST_DIRECTION[SORT_COLUMNS[key].kind];
  if (current?.key !== key) return toSheetSort(key, first);
  if (current.direction === first) return toSheetSort(key, flip(first));
  return null;
}

/** `등급 높은 순` · `상장업체 가나다순` · 말풍선에 쓴다 */
export function describeSheetSort(label: string, sort: SheetSort): string {
  return `${label} ${DIRECTION_LABEL[SORT_COLUMNS[sort.key].kind][sort.direction]}`;
}
