"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { usePaneResize } from "../hooks/usePaneResize";
import {
  CHART_DEFAULT_HEIGHT,
  CHART_MAX_HEIGHT,
  CHART_MIN_HEIGHT,
} from "../hooks/useRoomLayout";

/** 방향키 한 번에 옮기는 높이 · Shift 를 누르면 네 배 */
const KEY_STEP = 16;

/**
 * 1열 안에서 사진과 시세 사이 눈금 · 가로 방향이라는 것 말고는 `RoomSplitter` 와 같다.
 *
 * 크기를 쥐는 쪽은 언제나 시세다. 사진은 남는 높이를 전부 가져가므로 둘 다 px 로 잡으면
 * 창을 줄였을 때 합이 맞지 않는다. 그래서 눈금이 시세 위에 있느냐 아래에 있느냐에 따라
 * 끄는 방향의 부호만 뒤집는다 — 손은 언제나 「가까운 판을 민다」로 읽힌다.
 */
export function RoomStackSplitter({
  chartHeight,
  chartBelow,
  maxHeight,
  onResize,
  onNudge,
  onReset,
}: {
  chartHeight: number;
  /** 눈금 아래에 시세가 있으면 참 · 사진이 위일 때다 */
  chartBelow: boolean;
  /** 지금 창 높이에서 실제로 허용되는 최대 */
  maxHeight: number;
  onResize: (px: number) => void;
  /** 방향키용 · 지금 높이 기준 증감이라 연타해도 값이 밀리지 않는다 */
  onNudge: (delta: number) => void;
  onReset: () => void;
}) {
  const { dragging, handlers } = usePaneResize({
    size: chartHeight,
    axis: "y",
    direction: chartBelow ? -1 : 1,
    onResize,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
      // 눈금을 위로 올리면 위 판이 줄고 아래 판이 는다 · 값을 쥔 쪽은 언제나 시세다
      const up = chartBelow ? step : -step;
      if (e.key === "ArrowUp") onNudge(up);
      else if (e.key === "ArrowDown") onNudge(-up);
      else if (e.key === "Home" || e.key === "Enter") onReset();
      else return;
      // 방향키는 방 전체에서 개체 이동이라 눈금을 잡은 동안에는 가로채야 한다
      e.preventDefault();
      e.stopPropagation();
    },
    [chartBelow, onNudge, onReset],
  );

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="사진과 시세 사이 높이"
      aria-valuenow={chartHeight}
      aria-valuemin={CHART_MIN_HEIGHT}
      aria-valuemax={Math.min(CHART_MAX_HEIGHT, maxHeight)}
      tabIndex={0}
      title={`끌어서 높이 조절 · 두 번 누르면 ${CHART_DEFAULT_HEIGHT}px 로`}
      {...handlers}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className={cn(
        // 두 판 사이 8px 틈을 그대로 손잡이로 쓰고, 잡는 자리만 위아래 4px 씩 넓힌다
        "group relative h-2 shrink-0 cursor-row-resize touch-none select-none",
        "before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
        "focus-visible:outline-none",
      )}
    >
      {/* 알약 손잡이 · 이유는 `RoomSplitter` 에 적어 두었다 */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-[3px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full",
          "transition-[background-color,opacity] duration-150",
          dragging
            ? "bg-content-soft"
            : "bg-content-ghost opacity-70 group-hover:bg-content-faint group-hover:opacity-100 group-focus-visible:bg-content-faint group-focus-visible:opacity-100",
        )}
      />
    </div>
  );
}
