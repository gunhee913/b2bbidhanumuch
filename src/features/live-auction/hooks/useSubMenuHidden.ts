"use client";

import { useEffect, useRef, useState } from "react";

/** 서브메뉴 재노출 임계값 · 이 이하 scrollY 에서만 노출 */
const REVEAL_TOP_THRESHOLD = 8;

/**
 * `RoundStickyBar` 서브메뉴 숨김 여부를 스크롤 위치로 판정하는 shared 훅.
 *
 * `true`  · 숨김 (페이지 최상단이 아님)
 * `false` · 노출 (페이지 최상단)
 *
 * 좌측 사이드바 · 우측 플로팅 카드 · 우측 상세 패널이 서브메뉴 숨김에 맞춰
 * 위로 붙어 올라가도록 하려면 이 훅으로 hidden 상태를 구독한 뒤
 * top 값을 조건부 (`hidden ? "top-[80px]" : "top-[128px]"`) 로 지정한다.
 */
export function useSubMenuHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    const evaluate = () => {
      setHidden(window.scrollY >= REVEAL_TOP_THRESHOLD);
      tickingRef.current = false;
    };

    evaluate();

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(evaluate);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}
