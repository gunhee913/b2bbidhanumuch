/**
 * 등급 문자열 자르기 · 「1++A(9)」 한 토막에 세 가지가 붙어 있다.
 *
 * 육질(1++·1+·1·2·3) · 육량(A·B·C) · 근내지방도(7·8·9). 무엇을 묶고 무엇을 가를지는
 * 보는 자리마다 다르다 — 도넛은 육량을 묶어야 조각이 읽히고, 평균단가는 육량을 갈라야
 * 값이 선다. 그래서 자르는 손만 여기 모아 두고 고르는 것은 화면이 한다.
 *
 * 지금은 경매통계(도넛·상세표)와 경매내역이 함께 쓴다. 두 화면이 같은 등급을 서로
 * 다르게 자르면 한쪽의 「1++(9)」 가 다른 것을 가리키게 된다.
 */

/** 등급을 읽는 데 필요한 것만 · 결과 행을 통째로 끌어오지 않는다 */
export interface GradeSource {
  grade: string;
  marblingScore: number | null;
}

/**
 * 도넛·순위 목록이 쓰는 육질등급 차례 · 육량(A·B·C)은 묶인 꼴.
 */
export const GRADE_BUCKETS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1++",
  "1+",
  "1",
  "2",
  "3",
];

/**
 * grade 문자열 파싱 · quality / yield / marbling 로 분해.
 * 지원 포맷:
 * - "1++A(9)" · quality=1++, yield=A, marbling=9
 * - "1+B"     · quality=1+, yield=B
 * - "2"       · quality=2 (yield 없음)
 */
export function parseGradeParts(
  grade: string,
  fallbackMarbling: number | null | undefined,
): { quality: string; yieldG: string; marbling: number | null } | null {
  const match = grade.match(/^(1\+\+|1\+|1|2|3)([A-C])?/);
  if (!match) return null;
  const quality = match[1];
  const yieldG = match[2] ?? "";
  const inline = grade.match(/\((\d)\)/);
  const marbling = inline
    ? Number(inline[1])
    : ((fallbackMarbling ?? null) as number | null);
  return { quality, yieldG, marbling };
}

/**
 * 육량을 묶은 등급 키 · 1++ 만 근내지방도로 셋으로 갈린다.
 * 예: "1++A(9)" → "1++(9)", "1+B" → "1+"
 */
export function toFineGrade(r: GradeSource): string {
  const g = (r.grade || "").trim();
  if (!g) return "기타";
  const parsed = parseGradeParts(g, r.marblingScore);
  if (!parsed) return "기타";
  const { quality, marbling } = parsed;
  if (
    quality === "1++" &&
    marbling &&
    (marbling === 9 || marbling === 8 || marbling === 7)
  ) {
    return `1++(${marbling})`;
  }
  return quality;
}

/**
 * 육량까지 가른 등급 키.
 * 예: "1++A(9)", "1++B(9)", "1+A", "2C"
 */
export function toFullGrade(r: GradeSource): string {
  const g = (r.grade || "").trim();
  if (!g) return "기타";
  const parsed = parseGradeParts(g, r.marblingScore);
  if (!parsed) return "기타";
  const { quality, yieldG, marbling } = parsed;
  if (
    quality === "1++" &&
    marbling &&
    (marbling === 9 || marbling === 8 || marbling === 7)
  ) {
    return `${quality}${yieldG}(${marbling})`;
  }
  return `${quality}${yieldG}`;
}

/**
 * 등급 정렬용 점수.
 * 육질(1++ > 1+ > 1 > 2 > 3) → 근내지방도(9/8/7/기타) → 육량(A > B > C) 차례.
 */
export function gradeScore(grade: string): number {
  const match = grade.match(/^(1\+\+|1\+|1|2|3)([A-C])?(?:\((\d)\))?/);
  if (!match) return -1;
  const quality = match[1];
  const yieldG = match[2] || "";
  const marbling = match[3] ? Number(match[3]) : 0;
  const qualityRank =
    (
      { "1++": 100, "1+": 90, "1": 80, "2": 70, "3": 60 } as Record<
        string,
        number
      >
    )[quality] ?? 0;
  const yieldRank =
    ({ A: 3, B: 2, C: 1 } as Record<string, number>)[yieldG] ?? 0;
  return qualityRank * 10000 + marbling * 100 + yieldRank;
}

/**
 * 육량등급 묶기 · A/B/C 를 등급 문자열에서 뗀다.
 * 예: "1++A(9)" → "1++(9)", "1+B" → "1+", "2A" → "2"
 */
export function stripYieldGrade(grade: string): string {
  return grade.replace(/(1\+\+|1\+|1|2|3)([A-C])/, "$1");
}
