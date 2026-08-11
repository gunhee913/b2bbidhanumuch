"use client";

import { useEffect, useRef, useState } from "react";

export type PriceFlashDirection = "up" | "down" | null;

/**
 * 값 변화 감지 → 짧은 flash pulse 트리거 훅.
 *
 * 사용처: 오픈 최고가 (topBid.bidPrice) 실시간 갱신 시 row 강조.
 * - null → 값 : flash 없음 (initial mount)
 * - 값 → 다른 값 : "up"/"down" flash · 지정 duration 후 자동 해제
 *
 * Upbit/Bithumb 시세판 표준 UX · 사용자가 "라이브"임을 인지하게 함.
 */
export function usePriceFlash(
  value: number | null | undefined,
  durationMs = 900,
): PriceFlashDirection {
  const [flash, setFlash] = useState<PriceFlashDirection>(null);
  const prevRef = useRef<number | null | undefined>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevRef.current;

    if (
      prev != null &&
      value != null &&
      Number.isFinite(prev) &&
      Number.isFinite(value) &&
      prev !== value
    ) {
      const direction: PriceFlashDirection = value > prev ? "up" : "down";
      setFlash(direction);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFlash(null), durationMs);
    }

    prevRef.current = value;

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, durationMs]);

  return flash;
}
