/** 마감 임박 구간(초) · 60초 이하 주의 · 30초 이하 직전 */
export const DEADLINE_WARNING_SEC = 60;
export const DEADLINE_CRITICAL_SEC = 30;

/** `idle` 은 대기 상태(다음 회차 카운트다운) · 눈에 띄지 않는 톤 */
export type CriticalTier = "idle" | "normal" | "warning" | "critical";

export function getDeadlineTier(remainingSec: number): CriticalTier {
  if (remainingSec <= DEADLINE_CRITICAL_SEC) return "critical";
  if (remainingSec <= DEADLINE_WARNING_SEC) return "warning";
  return "normal";
}

export function isDeadlineTier(
  tier: CriticalTier,
): tier is "warning" | "critical" {
  return tier === "warning" || tier === "critical";
}
