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
