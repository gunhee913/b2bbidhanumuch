"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 끝에 닿았다고 볼 여유 · 소수점 폭 때문에 1px 쯤은 늘 남는다 */
const EPSILON = 2;

export interface ScrollEdges {
  /** 왼쪽(위)으로 더 있다 */
  atStart: boolean;
  /** 오른쪽(아래)으로 더 있다 */
  atEnd: boolean;
}

/**
 * 구르는 판의 양 끝에 가려진 것이 있는지 · 그늘을 켜고 끄는 데 쓴다.
 *
 * 막대를 지운 자리에는 「더 있다」 를 말할 것이 남아야 한다. 늘 켜 두는 그늘은
 * 가려진 게 없을 때도 잘린 것처럼 보이므로, 실제로 넘칠 때만 그쪽 끝에 켠다.
 *
 * 내용이 바뀌거나(부위 수) 판이 좁아질 때(눈금) 다시 재야 하는데, 스크롤 이벤트는
 * 그 둘 중 어느 것도 알려 주지 않는다. 그래서 판과 내용 **양쪽**을 재는 눈을 둔다.
 */
export function useScrollEdges<T extends HTMLElement>() {
  const [edges, setEdges] = useState<ScrollEdges>({
    atStart: false,
    atEnd: false,
  });
  const nodeRef = useRef<T | null>(null);

  const measure = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges((prev) => {
      const next = {
        atStart: el.scrollLeft > EPSILON,
        atEnd: max > EPSILON && el.scrollLeft < max - EPSILON,
      };
      return prev.atStart === next.atStart && prev.atEnd === next.atEnd
        ? prev
        : next;
    });
  }, []);

  const ref = useCallback(
    (el: T | null) => {
      nodeRef.current = el;
      if (el) measure();
    },
    [measure],
  );

  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    /* 판이 좁아지는 것과 내용이 늘어나는 것을 함께 본다 */
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  return { ref, ...edges };
}
