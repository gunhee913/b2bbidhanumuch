"use client";

import { useEffect, useRef } from "react";
import { isTypingInto } from "../lib/keyboard";

/**
 * ←/→ 로 사진·증명서 장을 넘긴다 · 상장표 요약(`SheetSummaryPanel`)과 배송지시
 * (`DeliveryFocusPane`)가 같은 것을 듣는다.
 *
 * 표의 ↑/↓ (`useSheetCursor`)와 같은 자리에서 듣되 가로만 맡는다. 글을 쓰는 중이거나
 * 라이트박스 같은 대화상자가 떠 있으면 그쪽 일이라 비켜 선다. 꾸밈키가 붙은 ←/→ 는
 * 다른 뜻(상세 방의 Shift+←/→ 개체 이동 · 브라우저 뒤로 가기)이라 손대지 않는다.
 *
 * `wrap` 이면 끝에서 더 누를 때 반대쪽 끝으로 돌고, 아니면 끝에서 멈춘다 — 상세 방이
 * 멈추는 쪽이라 거기와 나란히 보는 화면은 멈추는 쪽을 쓴다.
 */
export function useMediaArrowKeys(
  enabled: boolean,
  count: number,
  setIdx: (update: (prev: number) => number) => void,
  { wrap = false }: { wrap?: boolean } = {},
) {
  const ref = useRef({ enabled, count, wrap });
  ref.current = { enabled, count, wrap };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { enabled, count, wrap } = ref.current;
      if (!enabled || count < 2) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isTypingInto(document.activeElement)) return;
      if (document.querySelector("[aria-modal='true']")) return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      setIdx((prev) => {
        const at = Math.min(prev, count - 1);
        if (wrap) return (at + dir + count) % count;
        return Math.min(count - 1, Math.max(0, at + dir));
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIdx]);
}
