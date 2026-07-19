"use client";

import { useEffect, useState } from "react";

export interface UseCountdownParams {
  /** ISO 시각. 이 시각으로부터 durationMin 분 이후가 종료 시각. */
  startedAt: string | null;
  /** 라운드 지속 분. */
  durationMin: number | null;
  /** 계산 활성화 여부. false 면 항상 0 을 반환. */
  enabled?: boolean;
}

export interface CountdownResult {
  /** 남은 밀리초 (음수면 0으로 clamp). */
  remainingMs: number;
  /** mm:ss 형식 문자열. */
  formatted: string;
  /** 초과 종료 여부. */
  isExpired: boolean;
  /** 총 지속 시간 대비 진행률 0~1. */
  progress: number;
}

function formatMMSS(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 회차 종료까지 남은 시간을 1초 tick 으로 갱신.
 * `startedAt + durationMin*60_000` 을 종료 시각으로 사용.
 */
export function useCountdown({
  startedAt,
  durationMin,
  enabled = true,
}: UseCountdownParams): CountdownResult {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled || !startedAt || !durationMin) {
    return {
      remainingMs: 0,
      formatted: "--:--",
      isExpired: false,
      progress: 0,
    };
  }

  const startMs = new Date(startedAt).getTime();
  const totalMs = durationMin * 60_000;
  const endMs = startMs + totalMs;
  const rawRemaining = endMs - now;
  const remainingMs = Math.max(0, rawRemaining);
  const elapsed = Math.min(totalMs, Math.max(0, now - startMs));
  const progress = totalMs > 0 ? elapsed / totalMs : 0;

  return {
    remainingMs,
    formatted: formatMMSS(remainingMs),
    isExpired: rawRemaining <= 0,
    progress,
  };
}
