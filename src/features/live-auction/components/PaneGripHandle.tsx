"use client";

import { GripHorizontal, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 판을 잡아 옮기는 손잡이 · 사진 · 시세 · 표가 각자 제 머리에 하나씩 단다.
 *
 * 확대 버튼 바로 옆에 붙는다. `tone` 은 얹히는 바탕 — 사진은 먹색 위, 나머지는 카드
 * 위라 같은 회색을 쓸 수 없다 (`FocusButton` 과 같은 규칙).
 *
 * 점의 방향이 곧 갈 수 있는 길이다. 위아래로 옮기는 판은 가로로 누운 점을, 좌우로
 * 옮기는 판은 세로로 선 점을 단다 — 잡기 전에 어디로 갈지 읽힌다.
 *
 * `<button>` 이 아니라 `<div role="button">` 이다. 버튼은 포인터를 붙잡아 끄는 동안
 * 브라우저가 기본 끌기(고스트 이미지)를 걸고, 놓는 자리에서 클릭까지 한 번 쳐 버린다.
 */
export function PaneGripHandle({
  label,
  axis,
  tone,
  dragging,
  className,
  ...handlers
}: {
  label: string;
  /** 이 판이 갈 수 있는 방향 */
  axis: "x" | "y";
  tone: "dark" | "card";
  dragging: boolean;
  className?: string;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}) {
  const Icon = axis === "x" ? GripVertical : GripHorizontal;
  const way = axis === "x" ? "좌우" : "위아래";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label} 위치 옮기기`}
      title={`끌어서 ${way} 자리 바꾸기 · 방향키로도 된다`}
      {...handlers}
      className={cn(
        "inline-flex h-7 w-6 shrink-0 touch-none select-none items-center justify-center rounded-[3px] transition-colors",
        dragging ? "cursor-grabbing" : "cursor-grab",
        tone === "dark"
          ? "text-white/45 hover:bg-white/15 hover:text-white/85 focus-visible:bg-white/15"
          : "text-content-soft hover:bg-surface-strong hover:text-content focus-visible:bg-surface-strong",
        "focus-visible:outline-none",
        dragging &&
          (tone === "dark"
            ? "bg-white/20 text-white"
            : "bg-surface-strong text-content"),
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
    </div>
  );
}
