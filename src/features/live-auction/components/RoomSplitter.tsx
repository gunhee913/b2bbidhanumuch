"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  TABLE_DEFAULT_WIDTH,
  TABLE_MAX_WIDTH,
  TABLE_MIN_WIDTH,
} from "../hooks/useRoomLayout";

/** 방향키 한 번에 옮기는 폭 · Shift 를 누르면 네 배 */
const KEY_STEP = 16;

/**
 * 1열(사진·시세)과 2열(표) 사이 눈금.
 *
 * 열 사이 8px 틈을 그대로 손잡이로 쓴다 — 여기에 폭을 더 주면 두 판이 그만큼 좁아지고,
 * 8px 는 포인터로 잡기에 좁지만 좌우 4px 씩 넘겨 잡도록 늘려 실제로는 16px 로 집힌다.
 *
 * 평소에는 아무것도 그리지 않는다. 양옆 카드가 이미 제 테두리를 갖고 있어, 그 사이에 선을
 * 하나 더 세우면 나란한 선이 셋이 되고 가운데 것이 어디에도 붙지 않은 군더더기로 읽힌다.
 * 손이 닿을 때만 짧은 알약 손잡이를 띄운다 — 잡을 수 있다는 사실은 그때 알면 된다.
 *
 * 표가 오른쪽이라 눈금을 오른쪽으로 밀면 표가 좁아진다 — 그래서 `시작폭 - 이동량`.
 */
export function RoomSplitter({
  tableWidth,
  maxWidth,
  onResize,
  onNudge,
  onReset,
}: {
  tableWidth: number;
  /** 지금 화면에서 실제로 허용되는 최대 · 사이드 도크를 펴면 이 값이 줄어든다 */
  maxWidth: number;
  onResize: (px: number) => void;
  /** 방향키용 · 지금 너비 기준 증감이라 연타해도 값이 밀리지 않는다 */
  onNudge: (delta: number) => void;
  onReset: () => void;
}) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  /** 끄는 동안에는 포인터가 손잡이를 벗어나도 계속 보여야 한다 (hover 로는 부족하다) */
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = { startX: e.clientX, startWidth: tableWidth };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      // 끄는 동안 글자가 잡히거나 커서가 판마다 바뀌면 눈금을 놓친 것처럼 보인다
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [tableWidth],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      onResize(drag.startWidth - (e.clientX - drag.startX));
    },
    [onResize],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
      if (e.key === "ArrowLeft") onNudge(step);
      else if (e.key === "ArrowRight") onNudge(-step);
      else if (e.key === "Home" || e.key === "Enter") onReset();
      else return;
      // 방향키는 방 전체에서 개체 이동이라 눈금을 잡은 동안에는 가로채야 한다
      e.preventDefault();
      e.stopPropagation();
    },
    [onNudge, onReset],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="사진·시세와 표 사이 너비"
      aria-valuenow={tableWidth}
      aria-valuemin={TABLE_MIN_WIDTH}
      aria-valuemax={Math.min(TABLE_MAX_WIDTH, maxWidth)}
      tabIndex={0}
      title={`끌어서 너비 조절 · 두 번 누르면 ${TABLE_DEFAULT_WIDTH}px 로`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative cursor-col-resize touch-none select-none",
        // 틈은 8px 이지만 잡는 자리는 좌우로 4px 씩 넓힌다
        "before:absolute before:-inset-x-1 before:inset-y-0 before:content-['']",
        "focus-visible:outline-none",
      )}
    >
      {/*
       * 알약 손잡이 · 세로 가운데 72px.
       *
       * 길이가 곧 안내다. 짧으면 「점 하나」로 보여 여기를 잡아 끌 수 있다는 게 읽히지
       * 않으므로, 잡히는 자리를 길이로 보여 준다. 평소에도 옅게 띄워 두고 손이 닿으면
       * 또렷해진다 — 아예 숨기면 있는 줄 모르고, 늘 진하면 양옆 카드 테두리와 나란한
       * 선이 셋이 된다.
       *
       * `transition-all` 을 쓰면 안 된다 — 끄는 동안 열 폭이 계속 바뀌어 `left: 50%` 가
       * 매 프레임 갱신되는데, 그 위치까지 애니메이션 대상이 되면 손잡이가 손을 뒤따라오고
       * 그때마다 색 전환이 처음부터 다시 시작해 끝내 또렷해지지 않는다.
       */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-[72px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full",
          "transition-[background-color,opacity] duration-150",
          dragging
            ? "bg-content-soft"
            : "bg-content-ghost opacity-70 group-hover:bg-content-faint group-hover:opacity-100 group-focus-visible:bg-content-faint group-focus-visible:opacity-100",
        )}
      />
    </div>
  );
}
