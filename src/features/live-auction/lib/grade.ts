/**
 * 등급 라벨 조합 유틸.
 *
 * - `grade` 가 이미 `(N)` 을 포함하면 그대로 반환
 * - 1++ 등급이면 marblingScore 를 괄호로 덧붙임 (예: `1++A(9)`)
 * - 그 외는 grade 그대로 (`1+A`, `2A` 등)
 */
export function formatGradeLabel(
  grade: string | null | undefined,
  marblingScore: number | null | undefined,
): string {
  if (!grade) return "-";
  if (grade.includes("(")) return grade;
  if (grade.startsWith("1++") && marblingScore) {
    return `${grade}(${marblingScore})`;
  }
  return grade;
}

/** 등급 문자열에서 육질등급(1++, 1+, 1, 2, 3) 만 추출 */
export function parseQualityGrade(grade: string | null | undefined): string {
  if (!grade) return "";
  const match = grade.match(/^(1\+\+|1\+|1|2|3)/);
  return match?.[1] ?? "";
}

export type YieldGradeLetter = "A" | "B" | "C";

export interface ParsedGrade {
  /** 육질등급 · `1++` `1+` `1` `2` `3` */
  quality: string;
  /** 육량등급 · 등급 글자에 안 적혀 있으면 null */
  yieldGrade: YieldGradeLetter | null;
  /** 근내지방도 · 등급 글자에 괄호로 붙어 있을 때만 (없으면 `marbling_score` 칸을 본다) */
  marbling: number | null;
}

/**
 * 등급 한 덩이를 셋으로 가른다 · `1++A(9)` → 1++ · A · 9.
 *
 * 한 칸에 셋이 들어 있고 뒤 둘은 있을 때도 없을 때도 있다 — `1++` · `1++(9)` ·
 * `1++A` · `1++A(9)` 가 모두 실제로 담긴다 (`20260204_002_update_grade_format`
 * 이후로 근내지방도를 붙여 쓰기 시작했는데 그 전 자료가 그대로 남아 있다).
 *
 * 그래서 꼬리에서 `[ABC]` 를 찾으면 안 된다. `1++A(9)` 는 `)` 로 끝나 육량을
 * 놓치고, 놓친 자리는 조용히 「A」 로 메워져 B·C 물량이 A 더미에 섞인다.
 */
export function parseGrade(
  grade: string | null | undefined,
): ParsedGrade | null {
  const match = (grade ?? "")
    .trim()
    .match(/^(1\+\+|1\+|1|2|3)([ABC])?(?:\((\d)\))?/);
  if (!match) return null;
  return {
    quality: match[1],
    yieldGrade: (match[2] as YieldGradeLetter | undefined) ?? null,
    marbling: match[3] ? Number(match[3]) : null,
  };
}

/**
 * 등급 열쇠에 육량을 끼워 넣어 사람이 보는 꼴로 · `1++(9)` + `A` → `1++A(9)`.
 *
 * `parseGrade` 의 반대 방향이다. 육량은 육질 바로 뒤, 근내지방도 괄호 **앞**에
 * 붙는다 — `1++(9)A` 가 아니라 `1++A(9)` 다. 등급표에 적힌 차례가 그렇고,
 * 경매장·경매내역에 이미 그 꼴로 나가 있어 다르게 쓰면 같은 고기가 두 이름을 갖는다.
 *
 * 육량이 없으면(통합했거나 등급 글자에 안 적혀 있으면) 열쇠를 그대로 돌려준다.
 */
export function formatGradeWithYield(
  grade: string,
  yieldGrade: string | null,
): string {
  if (!yieldGrade) return grade;
  const match = grade.match(/^(1\+\+|1\+|1|2|3)(\(\d\))?$/);
  if (!match) return `${grade}${yieldGrade}`;
  return `${match[1]}${yieldGrade}${match[2] ?? ""}`;
}

/** 사이드바·상장표 공용 등급 필터 옵션 · `1++` 는 근내지방도로 세분 */
export const GRADE_FILTER_OPTIONS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;

/** 거르지 않음 · 사다리 맨 위 9 에서 한참 떨어뜨려 「푸는 키」 로 따로 둔다 */
export const GRADE_CLEAR_KEY = "0";

/**
 * 등급 ↔ 숫자키 · 9 에서 시작해 목록 차례대로 한 칸씩 내려온다.
 *
 * `1++(9)`·`(8)`·`(7)` 은 숫자가 곧 근내지방도라 외울 것이 없고, 그 아래는 그 줄을
 * 그대로 이어 받아 `1+`=6 · `1`=5 · `2`=4 · `3`=3 이 된다. 숫자가 높을수록 좋은
 * 고기라는 한 방향이라, 칩 이름을 몰라도 손이 어느 쪽으로 갈지는 안다.
 *
 * 자리를 박아 두지 않고 `GRADE_FILTER_OPTIONS` 에서 끌어낸다 — 등급이 하나 늘면
 * 사다리도 같이 늘어야지, 두 곳을 맞춰 고치게 두면 언젠가 어긋난다. 0 이하로
 * 내려가는 칸은 버린다(0 은 전체 몫이고 음수는 키가 아니다).
 */
export const GRADE_HOTKEYS: ReadonlyArray<{ key: string; value: string }> =
  GRADE_FILTER_OPTIONS.map((value, i) => ({
    key: String(9 - i),
    value,
  })).filter(({ key }) => Number(key) > 0);

const GRADE_BY_KEY = new Map(GRADE_HOTKEYS.map((h) => [h.key, h.value]));
const KEY_BY_GRADE = new Map(GRADE_HOTKEYS.map((h) => [h.value, h.key]));

/** 누른 숫자가 거는 등급 · `0` 은 전체(빈 값), 짝 없는 숫자는 `null` 로 흘려보낸다 */
export function gradeForHotkey(key: string): string | null {
  if (key === GRADE_CLEAR_KEY) return "";
  return GRADE_BY_KEY.get(key) ?? null;
}

/** 이 등급을 거는 숫자 · 칩 말풍선이 제 키를 적을 때 쓴다 */
export function hotkeyForGrade(value: string): string {
  return value ? (KEY_BY_GRADE.get(value) ?? "") : GRADE_CLEAR_KEY;
}

/**
 * `grade` + `marblingScore` → 시세 차트 등급 키 (`1++A`, 9 → `1++(9)`).
 * `GRADE_FILTER_OPTIONS` 와 같은 값 집합이라 필터 드롭다운과 그대로 맞물린다.
 */
export function toGradeSeriesKey(
  grade: string | null | undefined,
  marblingScore: number | null | undefined,
): string | null {
  const quality = parseQualityGrade(grade);
  if (!quality) return null;
  if (quality === "1++" && marblingScore) return `1++(${marblingScore})`;
  return quality;
}

/**
 * 등급 필터 값 매칭 · `1++(9)` 는 육질 1++ + 근내지방도 9, 그 외는 육질등급 등호.
 * 빈 필터는 항상 통과.
 */
export function matchesGradeFilter(
  filter: string,
  grade: string | null | undefined,
  marblingScore: number | null | undefined,
): boolean {
  if (!filter) return true;
  const quality = parseQualityGrade(grade ?? "");
  const marblingMatch = filter.match(/^1\+\+\((\d)\)$/);
  if (marblingMatch) {
    return quality === "1++" && marblingScore === Number(marblingMatch[1]);
  }
  return quality === filter;
}
