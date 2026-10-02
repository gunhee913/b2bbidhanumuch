"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";

/** 끌기 시작할 때 재어 둔 한 판의 자리 */
interface PaneBox {
  head: number;
  size: number;
  center: number;
}

interface DragState<P> {
  pane: P;
  from: number;
  /** 잡은 순간의 포인터 위치 · 축에 따라 clientX 또는 clientY */
  start: number;
  boxes: PaneBox[];
  /** 끌 수 있는 범위 · 줄 맨 앞과 맨 뒤를 넘어가지 않게 */
  min: number;
  max: number;
}

/** 지금 손 위치면 몇 번째 자리에 놓이나 · 잡은 판의 한가운데로 잰다 */
function targetIndex<P>(state: DragState<P>, px: number): number {
  const center = state.boxes[state.from].center + px;
  let to = state.from;
  while (to + 1 < state.boxes.length && center > state.boxes[to + 1].center)
    to++;
  while (to - 1 >= 0 && center < state.boxes[to - 1].center) to--;
  return to;
}

/** 배열에서 하나를 뽑아 다른 자리에 꽂는다 */
function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * 손잡이를 잡아 **여럿** 늘어선 판의 차례를 바꾼다.
 *
 * 두 판짜리(`usePaneReorder`)와 묻는 것이 다르다. 거기서는 「이웃을 절반 넘게
 * 지나쳤나」 하나만 보면 됐다 — 갈 수 있는 곳이 이웃 자리 하나뿐이니까. 셋이
 * 되는 순간 그 물음으로는 모자라서, 잡은 판의 **한가운데가 지금 누구를 넘었나**
 * 를 본다. 두 칸을 한 번에 건너뛰어도 그대로 따라온다.
 *
 * 끄는 동안 실제 차례는 그대로 두고 `translate` 로 결과만 미리 보여 준다. 끌던
 * 중에 바꾸면 내가 잡은 판이 손 밑에서 뛴다 (두 판짜리와 같은 까닭).
 *
 * 자리는 끌기 시작할 때 한 번만 잰다. 끄는 내내 다시 재면 미리 비켜선 이웃의
 * 새 자리가 다음 프레임의 과녁이 되어, 손을 조금만 움직여도 판들이 서로를 쫓아
 * 떨린다.
 */
export function usePaneListReorder<P extends string>({
  axis,
  order,
  gap,
  onReorder,
}: {
  axis: "x" | "y";
  /** 지금 그려지는 차례 · 바꾸면 새 차례로 들어온다 */
  order: readonly P[];
  /** 판 사이 틈 px · 이웃을 얼마나 밀어 낼지에 들어간다 */
  gap: number;
  onReorder: (next: P[]) => void;
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

  const handlePointerDown = useCallback(
    (pane: P) => (e: React.PointerEvent<HTMLElement>) => {
      const from = order.indexOf(pane);
      if (from < 0) return;

      const boxes: PaneBox[] = [];
      for (const key of order) {
        const el = els.current.get(key);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const head = axis === "x" ? rect.left : rect.top;
        const size = axis === "x" ? rect.width : rect.height;
        boxes.push({ head, size, center: head + size / 2 });
      }

      const first = boxes[0];
      const last = boxes[boxes.length - 1];
      const own = boxes[from];
      const next: DragState<P> = {
        pane,
        from,
        start: readPoint(e),
        boxes,
        min: first.head - own.head,
        max: last.head + last.size - (own.head + own.size),
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
    [order, axis, readPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const state = dragRef.current;
      if (!state) return;
      const raw = readPoint(e) - state.start;
      offsetRef.current = Math.max(state.min, Math.min(state.max, raw));
      setOffset(offsetRef.current);
    },
    [readPoint],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const state = dragRef.current;
      if (!state) return;
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const to = targetIndex(state, offsetRef.current);
      offsetRef.current = 0;
      /*
       * 세 가지를 한 번에 바꾼다 — 끌기 종료 · 밀어 둔 거리 되돌리기 · 실제 차례.
       * 리액트가 한 렌더로 묶어 주므로, 자리가 바뀌는 순간 모든 판이 전환이 꺼진
       * 채로 제자리에 놓인다. 나눠 부르면 한 프레임 동안 옛 자리로 되돌아갔다 온다.
       */
      setDrag(null);
      setOffset(0);
      if (to !== state.from) onReorder(move(order, state.from, to));
    },
    [order, onReorder],
  );

  const paneStyle = useCallback(
    (pane: P): CSSProperties | undefined => {
      if (!drag) return undefined;
      const at = order.indexOf(pane);
      if (at < 0) return undefined;
      if (pane === drag.pane) {
        return {
          transform:
            axis === "x"
              ? `translateX(${offset}px)`
              : `translateY(${offset}px)`,
        };
      }
      /*
       * 비켜서는 거리는 **잡은 판의 크기**다. 판마다 크기가 달라도 빈자리는 늘
       * 잡은 판이 남긴 만큼이라, 이웃 제 크기로 밀면 틈이 벌어지거나 겹친다.
       */
      const to = targetIndex(drag, offset);
      const shift = drag.boxes[drag.from].size + gap;
      let px = 0;
      if (to > drag.from && at > drag.from && at <= to) px = -shift;
      else if (to < drag.from && at >= to && at < drag.from) px = shift;
      return {
        transform: axis === "x" ? `translateX(${px}px)` : `translateY(${px}px)`,
      };
    },
    [drag, offset, order, gap, axis],
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
    }),
  };
}
