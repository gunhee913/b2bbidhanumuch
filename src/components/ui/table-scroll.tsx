"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "./overlay-scroll";

export interface TableScrollProps {
  children: ReactNode;
  className?: string;
}

/**
 * 표 판의 구르는 속 · 막대가 내용 **위에 떠 있다가** 손이 떠나면 사라진다.
 *
 * 네이티브 막대는 넘치는 순간 판에서 10px 을 떼어 간다. 표 판이 예닐곱 개 깔린 화면에서는
 * 그만큼 세로줄이 그어지는데, 그 줄은 열 경계와 굵기도 색도 비슷해 자료의 일부처럼
 * 읽히면서 정작 아무것도 말하지 않는다. 막대 색만 지우는 방법도 있지만 그러면 떼어 간
 * 10px 은 빈 띠로 남는다 — 오른쪽 끝 숫자가 판 끝에서 한 칸 들어가 멈춘다.
 *
 * 그래서 경매장 상장표(`LiveListingSheet`)가 쓰는 짜임을 그대로 쓴다. 폭은 표가 다 쓰고,
 * 막대는 손이 올라와 있는 동안만 그 위에 떴다 사라진다.
 *
 * 가로도 함께 연다 — 표들이 열 자연 폭의 합(`minWidth`)을 바닥으로 깔고 있어서, 판을
 * 그 아래로 좁히면 표가 제 판 안에서 옆으로 밀려야 한다.
 */
export function TableScroll({ children, className }: TableScrollProps) {
  return (
    <OverlayScroll
      /* 머뭇거림 없이 바로 거둔다 · 상장표와 같은 값 */
      autoHideDelay={0}
      options={{ overflow: { x: "scroll", y: "scroll" } }}
      className={cn("min-h-0 flex-1", className)}
    >
      {children}
    </OverlayScroll>
  );
}
