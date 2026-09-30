"use client";

import { cn } from "@/lib/utils";
import type { HouseStatus } from "../hooks/useHouseStatus";

/**
 * 공판장 오늘 상태 칩 · 참고 앱의 ON/OFF 토글 대신 "지금 무슨 상태인지" 를 말로.
 * live 만 sky · 예정은 slate · 마감/휴장은 칩 없음.
 */
export function HouseStatusChip({
  status,
  className,
}: {
  status: HouseStatus;
  className?: string;
}) {
  const base =
    "inline-flex h-5 items-center gap-1.5 rounded-[2px] px-1.5 text-[11px] font-semibold leading-none tabular-nums";

  if (status.kind === "live") {
    return (
      <span className={cn(base, "bg-sky-50 text-sky-700", className)}>
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-600" />
        </span>
        {status.roundNo}회차 진행중
      </span>
    );
  }
  if (status.kind === "upcoming") {
    return (
      <span className={cn(base, "bg-slate-100 text-slate-700", className)}>
        {status.nextStart} 시작
      </span>
    );
  }
  // closed / off 는 칩을 두지 않는다 · 상장·낙찰 건수(또는 "오늘 상장 없음") 가 이미 상태를 말한다
  return null;
}
