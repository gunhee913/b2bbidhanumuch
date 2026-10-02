"use client";

import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SideDockRailItemProps {
  icon: ComponentType<LucideProps>;
  label: string;
  active: boolean;
  onClick?: () => void;
  /**
   * 누를 수 있는 칸인가 · 기본은 참.
   *
   * 거짓이면 같은 모양으로 서되 단추가 아니다. 회차 칸이 경매장 바깥에서는 열 패널이
   * 없어 보여 주기만 하는데, 모양을 따로 그리면 네 화면에서 같은 자리 같은 크기가
   * 어긋난다 — 레일은 손이 기억하는 자리라 그게 제일 거슬린다.
   */
  interactive?: boolean;
  badge?: number;
  labelClassName?: string;
  /** 아이콘 상자를 덮어쓴다 · 마감 임박처럼 칸 전체가 말해야 할 때 (`cn` 이 뒤를 이긴다) */
  iconClassName?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * 레일 한 칸 · 42×58 · 32px 아이콘 상자 + 12px 라벨.
 *
 * 경매장과 배송지시가 같은 칸을 쓴다. 두 화면을 오가는 사람에게 같은 자리의 같은
 * 크기가 다르게 생겼으면 매번 눈이 다시 자리를 잡는다 — 레일은 내용이 아니라 손이
 * 기억하는 자리라 특히 그렇다.
 */
export function SideDockRailItem({
  icon: Icon,
  label,
  active,
  onClick,
  interactive = true,
  badge,
  labelClassName,
  iconClassName,
  onMouseEnter,
  onMouseLeave,
}: SideDockRailItemProps) {
  const Tag = interactive ? "button" : "div";
  return (
    <Tag
      {...(interactive
        ? { type: "button" as const, onClick, "aria-pressed": active }
        : {})}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      /*
       * 브라우저가 그리는 파란 고리는 쓰지 않는다 · 42×58 칸을 통째로 두르는 바람에
       * 레일에 느닷없이 파란 네모가 하나 생긴 것처럼 보였다. 대신 손을 올린 것과 같은
       * 표시를 아이콘 상자에만 준다 — 자판으로 짚은 사람도 어디에 있는지는 알아야 한다.
       */
      className="group flex h-[58px] w-[42px] flex-col items-center justify-center gap-1 focus:outline-none focus-visible:outline-none"
    >
      <span
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-surface-strong text-content"
            : "text-content-soft group-hover:bg-surface-accent group-hover:text-content group-focus-visible:bg-surface-accent group-focus-visible:text-content",
          iconClassName,
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none tabular-nums text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "whitespace-nowrap text-[12px] font-medium leading-none tabular-nums",
          active ? "text-content" : "text-content-faint",
          labelClassName,
        )}
      >
        {label}
      </span>
    </Tag>
  );
}
