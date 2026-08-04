/**
 * 관전자에게 노출하면 안 되는 값(입찰가/낙찰가/낙찰자)을 마스킹하는 유틸.
 *
 * 마스킹 규칙 (계획 문서 참고):
 * - 관전(비로그인 또는 권한 없음): bidPrice / bidAmount / winningDealerId → `-` 또는 `***`
 * - 로그인 & 권한 있는 중도매인: 실 값 노출
 * - weight / partName / grade / marblingScore / minPrice 등은 항상 공개
 */

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
export const MASK_TOKEN = "***";

export function formatWon(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${NUMBER_FORMATTER.format(Math.round(value))}원`;
}

/**
 * 단위 접미어 없이 원화 숫자만 포맷 · 헤더에 단위가 이미 명시된 테이블 셀 용도.
 * 예: 35168 → "35,168" · null/0/음수 → "-"
 */
export function formatKrw(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (!Number.isFinite(value) || value <= 0) return "-";
  return NUMBER_FORMATTER.format(Math.round(value));
}

export function formatWonPerKg(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined) return "-";
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${NUMBER_FORMATTER.format(Math.round(value))}원/kg`;
}

export function formatWeightKg(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined) return "-";
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toFixed(1)}kg`;
}

export function maskWonPerKg(
  value: number | null | undefined,
  canRead: boolean,
): string {
  if (!canRead) return MASK_TOKEN;
  return formatWonPerKg(value);
}

/**
 * 단위 접미어 없는 마스킹 포맷 · 컬럼 헤더에 단위가 명시된 테이블 셀 용도.
 * canRead=false → MASK_TOKEN · true → 콤마 포맷 숫자만.
 */
export function maskKrw(
  value: number | null | undefined,
  canRead: boolean,
): string {
  if (!canRead) return MASK_TOKEN;
  return formatKrw(value);
}

export function maskWon(
  value: number | null | undefined,
  canRead: boolean,
): string {
  if (!canRead) return MASK_TOKEN;
  return formatWon(value);
}

export function maskString(
  value: string | null | undefined,
  canRead: boolean,
): string {
  if (!canRead) return MASK_TOKEN;
  if (!value) return "-";
  return value;
}
