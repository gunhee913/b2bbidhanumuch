"use client";

import { cn } from "@/lib/utils";
import { usePaneResize } from "../hooks/usePaneResize";
import { CHART_DEFAULT_HEIGHT } from "../hooks/useRoomLayout";

/**
 * 위아래로 쌓인 두 판 사이 눈금 · 가로 방향이라는 것 말고는 `RoomSplitter` 와 같다.
 *
 * 크기를 쥐는 쪽은 둘 중 높이가 px 로 정해진 판이다. 나머지 하나가 남는 높이를 전부
 * 가져가므로 둘 다 px 로 잡으면 창을 줄였을 때 합이 맞지 않는다. 그래서 그 판이 눈금
 * 위에 있느냐 아래에 있느냐에 따라 끄는 방향의 부호만 뒤집는다 — 손은 언제나 「가까운
 * 판을 민다」로 읽힌다.
 *
 * 상세 방에서는 시세가, 배송지시 개체 판에서는 개체정보가 그 px 쪽이다.
 */
export function RoomStackSplitter({
  height,
  sizedBelow,
  defaultHeight = CHART_DEFAULT_HEIGHT,
  label = "사진과 시세 사이 높이",
  onResize,
  onReset,
}: {
  /** 높이를 px 로 쥔 판의 지금 높이 */
  height: number;
  /** 눈금 아래에 그 판이 있으면 참 */
  sizedBelow: boolean;
  /** 두 번 눌렀을 때 돌아갈 높이 · 방마다 기본값이 달라 안내 문구도 따라간다 */
  defaultHeight?: number;
  label?: string;
  onResize: (px: number) => void;
  onReset: () => void;
}) {
  const { dragging, handlers } = usePaneResize({
    size: height,
    axis: "y",
    direction: sizedBelow ? -1 : 1,
    onResize,
  });

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      title={`끌어서 높이 조절 · 두 번 누르면 ${defaultHeight}px 로`}
      {...handlers}
      onDoubleClick={onReset}
      className={cn(
        // 두 판 사이 8px 틈을 그대로 손잡이로 쓰고, 잡는 자리만 위아래 4px 씩 넓힌다
        "group relative h-2 shrink-0 cursor-row-resize touch-none select-none",
        "before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
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
            : "bg-content-ghost opacity-70 group-hover:bg-content-faint group-hover:opacity-100",
        )}
      />
    </div>
  );
}
