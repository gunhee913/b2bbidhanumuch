"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-xs overflow-hidden rounded-md bg-slate-900 px-2 py-1 text-[11.5px] font-semibold text-white shadow-lg",
        "-tracking-[0.01em]",
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * TruncatedText · 잘렸을 때만 tooltip 노출하는 편의 컴포넌트.
 *
 * 원리: 렌더 후 element.scrollWidth > element.clientWidth 검사.
 * ResizeObserver 로 폭 변경 시 재검사 (사이드바 리사이즈 · 뷰포트 변경 대응).
 *
 * `<TooltipProvider>` 로 감싼 subtree 안에서 사용해야 함 (app root providers 에 있음).
 *
 * 사용 예:
 * ```tsx
 * <TruncatedText className="truncate text-[12px]" value="아주긴업체명주식회사">
 *   아주긴업체명주식회사
 * </TruncatedText>
 * ```
 */
function TruncatedText({
  value,
  className,
  children,
  side = "top",
}: {
  value: string;
  className?: string;
  children?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setIsTruncated(el.scrollWidth > el.clientWidth + 1);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value]);

  const content = children ?? value;

  if (!isTruncated) {
    return (
      <span ref={ref} className={className}>
        {content}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span ref={ref} className={className}>
          {content}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side}>{value}</TooltipContent>
    </Tooltip>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TruncatedText,
};
