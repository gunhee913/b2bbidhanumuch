"use client";

import { useEffect, useRef } from "react";
import { isFieldFocused } from "@/features/live-auction/lib/keyboard";

/** 짚은 줄을 찾아 끌어오는 데 쓰는 표식 · 시세 표의 `<tr>` 이 단다 */
export const MARKET_ROW_ATTR = "data-market-row";
/** 짚은 부위 칸을 끌어오는 표식 · 탭 줄이 한 줄이라 옆으로 굴러 있을 수 있다 */
export const MARKET_PART_ATTR = "data-market-part";

export interface MarketKeysOptions {
  /** 머리의 부위 탭 · 보이는 차례대로 */
  parts: readonly string[];
  selectedPart: string | null;
  onSelectPart: (part: string) => void;
  /** 지금 부위의 등급 줄 열쇠 · 보이는 차례대로 */
  rowKeys: readonly string[];
  selectedRowKey: string | null;
  onSelectRow: (key: string) => void;
}

/**
 * 시세 방 키보드 길 · ←→ 로 부위를 넘기고 ↑↓ 로 그 부위의 등급 줄을 짚는다.
 *
 * 가로가 큰 걸음, 세로가 잔걸음인 건 경매내역(←→ 날 · ↑↓ 줄)과 같은 손놀림이다.
 * 거기서 ←→ 가 날짜였던 자리를 여기서는 부위가 받는다 — 이 화면의 기준 축은 기간이
 * 아니라 부위라서다. 기간은 둘(시작·끝)이라 한 걸음으로 밀 수 있는 것이 아니다.
 *
 * 화면 생김새와도 맞는다. 부위는 머리에 가로로 늘어선 탭이고 등급은 세로로 쌓인
 * 줄이라, 누르는 방향이 곧 움직이는 방향이다.
 *
 * **가로채지 않는 자리.** 글 쓰는 칸과 열린 대화상자 안에서는 비킨다 — 거기서는
 * 방향키가 이미 제 뜻을 갖고 있다. 눈금(`RoomSplitter`)은 아예 포커스를 안 받아
 * 폭 조절이 방향키를 가져갈 일이 없다.
 */
export function useMarketKeys({
  parts,
  selectedPart,
  onSelectPart,
  rowKeys,
  selectedRowKey,
  onSelectRow,
}: MarketKeysOptions) {
  /*
   * 최신 값을 통 하나에 담아 두고 듣는 쪽은 한 번만 건다. 의존성에 넣으면 부위나
   * 줄이 바뀔 때마다 듣는 이를 떼었다 다시 거는데, 그 틈에 눌린 키가 사라진다.
   */
  const ref = useRef({
    parts,
    selectedPart,
    onSelectPart,
    rowKeys,
    selectedRowKey,
    onSelectRow,
  });
  ref.current = {
    parts,
    selectedPart,
    onSelectPart,
    rowKeys,
    selectedRowKey,
    onSelectRow,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isFieldFocused(document.activeElement)) return;
      if (document.querySelector("[role=dialog]")) return;

      const {
        parts,
        selectedPart,
        onSelectPart,
        rowKeys,
        selectedRowKey,
        onSelectRow,
      } = ref.current;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (parts.length === 0) return;
        e.preventDefault();
        const next = step(parts, selectedPart, e.key === "ArrowLeft" ? -1 : 1);
        if (!next || next === selectedPart) return;
        onSelectPart(next);
        scrollIntoView(MARKET_PART_ATTR, next, "inline");
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (rowKeys.length === 0) return;
        e.preventDefault();
        const next = step(
          rowKeys,
          selectedRowKey,
          e.key === "ArrowUp" ? -1 : 1,
        );
        if (!next || next === selectedRowKey) return;
        onSelectRow(next);
        scrollIntoView(MARKET_ROW_ATTR, next, "block");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * 짚은 것을 보이는 데까지 끌어온다 · 세로는 표 줄, 가로는 부위 탭.
 *
 * `nearest` 라 이미 보이는 것은 흔들지 않는다 — 가운데로 당기면 한 칸 움직일 때마다
 * 표와 탭 줄이 함께 출렁인다. 그리기가 끝난 뒤에 찾아야 하므로 한 프레임 미룬다.
 */
function scrollIntoView(attr: string, value: string, axis: "block" | "inline") {
  requestAnimationFrame(() => {
    document
      .querySelector(`[${attr}="${CSS.escape(value)}"]`)
      ?.scrollIntoView(
        axis === "inline"
          ? { inline: "nearest", block: "nearest" }
          : { block: "nearest" },
      );
  });
}

/** 한 칸 옆 · 끝에서는 멈춘다 (맴돌지 않는다 · 어디가 끝인지 손으로 알아야 한다) */
function step(
  items: readonly string[],
  current: string | null,
  dir: 1 | -1,
): string | null {
  /* 짚은 데가 없으면(거르개가 걸러 냈거나 빈 표였으면) 첫 칸부터 */
  const at = current ? items.indexOf(current) : -1;
  if (at < 0) return items[0] ?? null;
  return items[Math.min(Math.max(at + dir, 0), items.length - 1)] ?? null;
}
