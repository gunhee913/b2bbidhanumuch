"use client";

import { useEffect } from "react";
import type { CriticalTier } from "../lib/deadline";
import { isDeadlineTier } from "../lib/deadline";

/**
 * 마감 임박(60초 이하) 동안 브라우저 탭 제목에 남은 시간을 붙인다.
 * 다른 탭에 가 있어도 `(00:45) 2회차 마감 임박` 이 보이도록 · 벗어나면 원래 제목 복구.
 * 도킹바·카드가 같은 값으로 함께 호출해도 결과가 같아 충돌하지 않는다.
 */
export function useDeadlineTitle(
  active: boolean,
  tier: CriticalTier,
  formatted: string,
  roundNo: number | null | undefined,
) {
  const show = active && isDeadlineTier(tier);
  useEffect(() => {
    if (!show || typeof document === "undefined") return;
    const original = document.title.replace(/^\(\d{1,2}:\d{2}\)\s.*?·\s/, "");
    document.title = `(${formatted}) ${roundNo ?? ""}회차 마감 임박 · ${original}`;
    return () => {
      document.title = original;
    };
  }, [show, formatted, roundNo]);
}
