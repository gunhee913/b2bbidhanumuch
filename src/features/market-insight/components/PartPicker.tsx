"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";

export interface PartPickerProps {
  parts: readonly string[];
  value: string | null;
  onChange: (part: string) => void;
}

/**
 * 부위 고르개 · 차트 머리의 **제목 자리**를 그대로 쓴다.
 *
 * 전에는 왼쪽 표가 부위를 쥐고 있었다. 그 표가 사라진 자리에 고르개를 따로 세우면
 * 차트 머리에 부위명이, 그 위에 또 부위 고르개가 서서 같은 말이 두 번 적힌다.
 * 제목이 곧 고르개면 그런 일이 없다 — 지금 무엇을 보고 있는지가 곧 바꾸는 손잡이다.
 *
 * 열일곱 칸이라 탭이 아니라 쪽지다. 한 줄에 세우면 판 폭을 다 먹고도 모자라고,
 * 부위는 **한 번 고르면 한동안 안 바꾸는 값**이라 접어 두기 알맞다. 자주 넘겨 보는
 * 손은 ←→ 방향키가 따로 받는다 (`useMarketKeys`).
 *
 * 쪽지 안은 세 칸씩 격자다. 늘어놓으면 눌러야 할 칸이 목록 길이에 따라 오르내리는데,
 * 격자는 자리가 고정이라 손이 외운다 (기간 프리셋 격자와 같은 셈).
 */
export function PartPicker({ parts, value, onChange }: PartPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="부위"
          className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[13px] font-bold text-content transition-colors hover:bg-surface-muted data-[state=open]:bg-surface-muted"
        >
          {value ?? "부위"}
          <ChevronDown className="h-3.5 w-3.5 text-content-faint" aria-hidden />
        </button>
      </PopoverTrigger>

      {/* 쪽지가 제 테두리를 그리므로 팝오버 기본 껍데기는 벗긴다 (두 겹이 된다) */}
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <div
          className={cn(
            "grid w-[264px] grid-cols-3 gap-1 p-2 shadow-xl",
            SURFACE_SHELL_CLASS,
          )}
        >
          {parts.map((part) => {
            const active = part === value;
            return (
              <button
                key={part}
                type="button"
                onClick={() => {
                  onChange(part);
                  setOpen(false);
                }}
                className={cn(
                  "inline-flex h-7 items-center justify-center truncate rounded-[5px] border px-1 text-[11px] font-semibold transition-colors",
                  active
                    ? "border-inverse bg-inverse text-inverse-content"
                    : "border-line bg-surface text-content-mid hover:border-content-ghost hover:text-content",
                )}
              >
                {part}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
