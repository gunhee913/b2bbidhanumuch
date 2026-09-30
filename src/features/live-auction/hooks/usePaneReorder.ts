"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";

interface DragState<P> {
  pane: P;
  /** 잡은 순간의 포인터 위치 · 축에 따라 clientX 또는 clientY */
  start: number;
  /** 잡은 판의 크기 · 이웃을 밀어 낼 거리 */
  ownSize: number;
  /** 이웃 판 크기의 절반 · 이만큼 넘기면 자리가 바뀐다 */
  threshold: number;
  /** 이웃이 뒤(아래·오른쪽)에 있으면 1 · 그쪽으로 끌어야 바뀐다 */
  toward: 1 | -1;
}

/**
 * 손잡이를 잡아 나란한 두 판의 자리를 맞바꾼다 · 세로로 쌓인 판과 좌우로 놓인 열이 같이 쓴다.
 *
 * 판이 둘뿐이라 「어디에 떨어뜨릴까」를 고를 일이 없다. 이웃을 절반 넘게 지나쳤는가,
 * 그 하나만 보면 된다 — 끄는 동안 이웃이 미리 비켜서 결과를 보여 주고, 손을 떼는
 * 순간에만 실제 순서를 바꾼다. 끌던 중에 바꾸면 내가 잡은 판이 손 밑에서 뛴다.
 *
 * 축은 부르는 쪽이 정하고 여기서는 손놀림만 쥔다 — 어느 좌표를 읽고 어느 방향키를
 * 받을지만 달라질 뿐, 「절반을 넘겼나」는 가로든 세로든 같은 물음이다.
 */
export function usePaneReorder<P extends string>({
  axis,
  order,
  gap,
  onSwap,
}: {
  axis: "x" | "y";
  /** 지금 그려지는 차례 · 자리를 바꾸면 뒤집혀 들어온다 */
  order: readonly [P, P];
  /** 두 판 사이 틈 px · 이웃을 얼마나 밀어 낼지에 들어간다 */
  gap: number;
  onSwap: () => void;
}) {
  const els = useRef(new Map<P, HTMLElement | null>());
  const refs = useRef(new Map<P, (el: HTMLElement | null) => void>());
  const dragRef = useRef<DragState<P> | null>(null);
  /** 그리기용 상태와 짝이 되는 값 · 손을 뗄 때 최신 값을 즉시 읽어야 한다 */
  const offsetRef = useRef(0);
  const [drag, setDrag] = useState<DragState<P> | null>(null);
  const [offset, setOffset] = useState(0);

  /*
   * 판마다 ref 콜백을 한 번 만들어 쥐고 있는다. 매 렌더 새로 만들면 리액트가 그때마다
   * null 을 한 번 넣었다 다시 꽂는데, 끄는 동안에는 프레임마다 렌더가 돌아 헛일이 된다.
   */
  const registerPane = useCallback((pane: P) => {
    let ref = refs.current.get(pane);
    if (!ref) {
      ref = (el: HTMLElement | null) => {
        els.current.set(pane, el);
      };
      refs.current.set(pane, ref);
    }
    return ref;
  }, []);

  const readPoint = useCallback(
    (e: React.PointerEvent<HTMLElement>) =>
      axis === "x" ? e.clientX : e.clientY,
    [axis],
  );

  const measure = useCallback(
    (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return axis === "x"
        ? { head: rect.left, size: rect.width }
        : { head: rect.top, size: rect.height };
    },
    [axis],
  );

  const handlePointerDown = useCallback(
    (pane: P) => (e: React.PointerEvent<HTMLElement>) => {
      const own = els.current.get(pane);
      const other = els.current.get(order[0] === pane ? order[1] : order[0]);
      if (!own || !other) return;
      const ownBox = measure(own);
      const otherBox = measure(other);
      const next: DragState<P> = {
        pane,
        start: readPoint(e),
        ownSize: ownBox.size,
        threshold: otherBox.size / 2,
        toward: otherBox.head > ownBox.head ? 1 : -1,
      };
      dragRef.current = next;
      offsetRef.current = 0;
      setDrag(next);
      setOffset(0);
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    [order, measure, readPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const state = dragRef.current;
      if (!state) return;
      // 판이 화면 밖으로 날아가지 않게 · 갈 수 있는 곳은 이웃 자리 하나뿐이다
      const reach = state.threshold * 2 + gap;
      const raw = readPoint(e) - state.start;
      offsetRef.current = Math.max(-reach, Math.min(reach, raw));
      setOffset(offsetRef.current);
    },
    [gap, readPoint],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const state = dragRef.current;
      if (!state) return;
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const moved = offsetRef.current;
      offsetRef.current = 0;
      /*
       * 세 가지를 한 번에 바꾼다 — 끌기 종료 · 밀어 둔 거리 되돌리기 · 실제 순서.
       * 리액트가 한 렌더로 묶어 주므로, 자리가 바뀌는 순간 두 판 모두 전환이 꺼진
       * 채로 제자리에 놓인다. 나눠 부르면 한 프레임 동안 옛 자리로 되돌아갔다 온다.
       */
      setDrag(null);
      setOffset(0);
      if (moved * state.toward > state.threshold) onSwap();
    },
    [onSwap],
  );

  const handleKeyDown = useCallback(
    (pane: P) => (e: React.KeyboardEvent<HTMLElement>) => {
      const toHead = axis === "x" ? "ArrowLeft" : "ArrowUp";
      const toTail = axis === "x" ? "ArrowRight" : "ArrowDown";
      if (e.key !== toHead && e.key !== toTail) return;
      e.preventDefault();
      // 방향키는 방 전체에서 개체 이동이라 손잡이를 쥔 동안에는 가로채야 한다
      e.stopPropagation();
      if ((e.key === toHead) !== (order[0] === pane)) onSwap();
    },
    [axis, order, onSwap],
  );

  /** 끄는 동안 자리가 바뀐 모습을 미리 보여 준다 */
  const willSwap = drag != null && offset * drag.toward > drag.threshold;

  const paneStyle = useCallback(
    (pane: P): CSSProperties | undefined => {
      if (!drag) return undefined;
      const px =
        drag.pane === pane
          ? offset
          : willSwap
            ? -drag.toward * (drag.ownSize + gap)
            : 0;
      return {
        transform: axis === "x" ? `translateX(${px}px)` : `translateY(${px}px)`,
      };
    },
    [drag, offset, willSwap, gap, axis],
  );

  return {
    dragging: drag?.pane ?? null,
    registerPane,
    paneStyle,
    handleProps: (pane: P) => ({
      onPointerDown: handlePointerDown(pane),
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown: handleKeyDown(pane),
    }),
  };
}
