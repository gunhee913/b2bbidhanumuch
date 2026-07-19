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
