"use client";

import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentProps,
} from "overlayscrollbars-react";
import { forwardRef, type ComponentRef } from "react";

import { cn } from "@/lib/utils";

/**
 * 컨텐츠 위 부유하는 overlay 스크롤바 · Upbit / Notion 과 동일 UX.
 *
 * 왜 JS 라이브러리인가:
 * - Chrome 121 (2024-01) 부터 `overflow: overlay` 완전 제거
 * - 순수 CSS 로는 스크롤바를 컨텐츠 위에 부유시킬 수 없음
 * - OverlayScrollbars 는 native scroll 을 그대로 쓰고 스크롤바만 커스텀 → 성능/접근성 손상 X
 *
 * autoHide:
 * - "leave"  : 커서 벗어나면 fade-out (default 채택)
 * - "scroll" : 스크롤 중에만 노출 (macOS auto-hide 감성)
 * - "move"   : 컨테이너 위 마우스 이동 시 노출
 * - "never"  : 항상 노출
 */
type OverlayScrollProps = OverlayScrollbarsComponentProps & {
  autoHide?: "leave" | "scroll" | "move" | "never";
  /** 숨기까지 기다리는 시간(ms) · 0 이면 커서가 벗어나는 즉시 */
  autoHideDelay?: number;
};

export const OverlayScroll = forwardRef<
  ComponentRef<typeof OverlayScrollbarsComponent>,
  OverlayScrollProps
>(function OverlayScroll(
  {
    className,
    options,
    autoHide = "leave",
    autoHideDelay = 500,
    children,
    ...rest
  },
  ref,
) {
  // OverlayScrollbars 의 options 은 `false` 일 수 있어 optional chain 후 spread.
  // 기본값만 넘겨도 동작하지만, 상위에서 override 여지를 남기기 위해 merge.
  const passedOptions =
    options && typeof options === "object" ? options : undefined;

  return (
    <OverlayScrollbarsComponent
      ref={ref}
      className={cn("overlay-scroll", className)}
      /*
       * `...passedOptions` 를 먼저 편다. 뒤에 두면 위에서 애써 합쳐 둔 `scrollbars`
       * 를 통째로 덮어써서, 넘긴 쪽이 한 항목만 바꾸려 해도 theme·autoHide 까지 날아간다.
       */
      options={{
        ...passedOptions,
        scrollbars: {
          theme: "os-theme-dark",
          autoHide,
          autoHideDelay,
          autoHideSuspend: true,
          clickScroll: true,
          ...passedOptions?.scrollbars,
        },
        overflow: {
          x: "hidden",
          y: "scroll",
          ...passedOptions?.overflow,
        },
      }}
      defer
      {...rest}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
});
