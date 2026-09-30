"use client";

import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 동작 + 단축키 말풍선 · 토스증권 사이드바 말풍선을 따른다.
 *
 * 한 줄에 동작은 흰 굵은 글씨, 단축키는 상자 없이 흐린 글자로만 붙인다. 키캡 상자를
 * 그리면 말풍선 안에서 단축키가 동작보다 먼저 보인다 — 읽는 순서는 「무엇을」 이 먼저다.
 * 바탕은 순흑이 아니라 한 단계 뜬 먹색 + 얇은 테두리라 다크 화면 위에서도 판으로 읽힌다.
 */
export function ShortcutTooltip({
  label,
  shortcut,
  title,
  side = "bottom",
  delayDuration,
  children,
}: {
  label: string;
  /** 없으면 동작 이름만 띄운다 */
  shortcut?: string;
  /** 넘어갈 개체처럼 동작을 받쳐 주는 값 · 동작과 단축키 사이에 옅게 끼운다 */
  title?: string | null;
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
  children: ReactNode;
}) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#2a2a2f] px-2.5 py-1.5 text-[12.5px] font-bold text-white"
      >
        <span>{label}</span>
        {title ? (
          <span className="font-medium tabular-nums text-white/45">{title}</span>
        ) : null}
        {shortcut ? (
          <span className="font-medium text-white/60">{shortcut}</span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
