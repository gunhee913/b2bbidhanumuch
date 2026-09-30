"use client";

import { useCallback, useRef, useState } from "react";

/**
 * 눈금을 끌어 판 하나의 크기를 바꾸는 손놀림.
 *
 * 가로·세로 눈금이 같은 일을 한다 — 포인터를 붙잡고, 커서를 바꾸고, 글자가 잡히지 않게
 * 막고, 놓을 때 되돌린다. 다른 것은 어느 축을 읽느냐와 부호뿐이라 여기 한 번만 적는다.
 */
export function usePaneResize({
  size,
  axis,
  direction,
  onResize,
}: {
  /** 끌기 시작하는 순간의 판 크기 px */
  size: number;
  axis: "x" | "y";
  /** 포인터를 양(+)의 방향으로 옮겼을 때 판이 커지면 1 · 눈금 반대편에 판이 있으면 -1 */
  direction: 1 | -1;
  onResize: (px: number) => void;
}) {
  const dragRef = useRef<{ start: number; startSize: number } | null>(null);
  /** 끄는 동안에는 포인터가 손잡이를 벗어나도 계속 보여야 한다 (hover 로는 부족하다) */
  const [dragging, setDragging] = useState(false);
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = {
        start: axis === "x" ? e.clientX : e.clientY,
        startSize: size,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      // 끄는 동안 글자가 잡히거나 커서가 판마다 바뀌면 눈금을 놓친 것처럼 보인다
      document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [size, axis],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const point = axis === "x" ? e.clientX : e.clientY;
      onResize(drag.startSize + direction * (point - drag.start));
    },
    [onResize, direction, axis],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
