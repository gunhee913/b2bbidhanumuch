"use client";

import { useEffect, useRef } from "react";
import { isFieldFocused } from "@/features/live-auction/lib/keyboard";

export interface MarketKeysOptions {
  /** 고를 수 있는 부위 · 쪽지에 선 차례대로 */
  parts: readonly string[];
  selectedPart: string | null;
  onSelectPart: (part: string) => void;
}

/**
 * 시세 화면 키보드 길 · ←→ 로 부위를 넘긴다.
 *
 * 부위 고르개가 접힌 쪽지(`PartPicker`)라 부위를 하나씩 훑어보려면 열고·고르고·
 * 닫기를 열일곱 번 해야 한다. 그런데 「어느 부위가 지금 싼가」 는 바로 그렇게
 * 훑어야 나오는 답이다 — 쪽지는 목적지를 아는 손을 위한 것이고, 방향키는 목적지를
 * 찾는 손을 위한 것이라 둘 다 있어야 한다.
 *
 * 등급은 받지 않는다. 그쪽은 차트 범례가 쥐고 있고, 거기엔 켜고 끄는 선이 여럿이라
 * 한 걸음씩 미는 축으로 눌러 담을 수가 없다.
 *
 * **가로채지 않는 자리.** 글 쓰는 칸과 열린 대화상자 안에서는 비킨다 — 거기서는
 * 방향키가 이미 제 뜻을 갖고 있다 (부위 쪽지도 열려 있는 동안은 대화상자다).
 */
export function useMarketKeys({
  parts,
  selectedPart,
  onSelectPart,
}: MarketKeysOptions) {
  /*
   * 최신 값을 통 하나에 담아 두고 듣는 쪽은 한 번만 건다. 의존성에 넣으면 부위가
   * 바뀔 때마다 듣는 이를 떼었다 다시 거는데, 그 틈에 눌린 키가 사라진다.
   */
  const ref = useRef({ parts, selectedPart, onSelectPart });
  ref.current = { parts, selectedPart, onSelectPart };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isFieldFocused(document.activeElement)) return;
      if (document.querySelector("[role=dialog]")) return;

      const { parts, selectedPart, onSelectPart } = ref.current;
      if (parts.length === 0) return;

      e.preventDefault();
      const next = step(parts, selectedPart, e.key === "ArrowLeft" ? -1 : 1);
      if (!next || next === selectedPart) return;
      onSelectPart(next);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** 한 칸 옆 · 끝에서는 멈춘다 (맴돌지 않는다 · 어디가 끝인지 손으로 알아야 한다) */
function step(
  items: readonly string[],
  current: string | null,
  dir: 1 | -1,
): string | null {
  const at = current ? items.indexOf(current) : -1;
  if (at < 0) return items[0] ?? null;
  return items[Math.min(Math.max(at + dir, 0), items.length - 1)] ?? null;
}
