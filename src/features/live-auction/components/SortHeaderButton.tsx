"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PartSortDir } from "../lib/partSort";

/**
 * 정렬 가능한 테이블 헤더 · 텍스트 + 화살표.
 * 비활성은 hover 시에만 ↕ 가 옅게 나타나고, 활성이면 방향 화살표가 진하게 남는다.
 * `aria-sort` 는 감싸는 <th> 에 둔다.
 *
 * `align="right"` 면 화살표를 라벨 왼쪽에 두어 라벨의 우측 끝이 숫자 값의 우측 끝과 일치한다.
 */
export function SortHeaderButton({
  label,
  active,
  onClick,
  align = "left",
}: {
  label: string;
  active: PartSortDir | null;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const Icon =
    active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} 정렬`}
      className={cn(
        "group/sort inline-flex items-center gap-0.5 -tracking-[0.01em] transition-colors hover:text-content",
        align === "right" && "flex-row-reverse",
        active ? "text-content" : "text-content-soft",
      )}
    >
      {label}
      <Icon
        className={cn(
          "h-3 w-3 shrink-0 transition-opacity",
          active ? "opacity-100" : "opacity-0 group-hover/sort:opacity-60",
        )}
        strokeWidth={2.25}
        aria-hidden
      />
    </button>
  );
}
