"use client";

import { useEffect, useRef } from "react";
import { isFieldFocused } from "@/features/live-auction/lib/keyboard";

/** 배정을 지우는 키 · 숫자 자리는 1~9 라 0 이 비어 있다 */
export const PARTNER_CLEAR_KEY = "0";

/**
 * 숫자 키로 커서가 짚은 줄에 거래처를 꽂는다 · `1`~`9` 는 고정해 둔 거래처, `0` 은 해제.
 *
 * 등급 단축키(`useGradeHotkeys`)와 같은 틀이다. 자판 자리(`e.code`)를 먼저 보는 것도
 * 같은 까닭 — 한글 자판에서도 숫자줄은 숫자를 낸다.
 *
 * 글 쓰는 칸에서는 비킨다. 거래처 선택기 안 검색창이 열려 있을 때 `1` 이 배정으로
 * 새면, 이름을 치려던 사람이 엉뚱한 곳으로 물건을 보내게 된다.
 */
export function usePartnerHotkeys({
  enabled,
  onPick,
}: {
  enabled: boolean;
  /** `slot` 은 0-based (키 `1` → 0) · 해제면 null */
  onPick: (slot: number | null) => void;
}) {
  const ref = useRef({ enabled, onPick });
  ref.current = { enabled, onPick };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const { enabled, onPick } = ref.current;
      if (!enabled) return;
      if (isFieldFocused(document.activeElement)) return;

      const bySeat = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
      const digit = bySeat ? bySeat[1] : /^[0-9]$/.test(e.key) ? e.key : null;
      if (digit === null) return;

      e.preventDefault();
      onPick(digit === PARTNER_CLEAR_KEY ? null : Number(digit) - 1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
