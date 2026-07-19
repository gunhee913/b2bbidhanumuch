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
