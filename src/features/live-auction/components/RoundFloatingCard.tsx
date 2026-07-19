"use client";

import { Clock, Gavel } from "lucide-react";
import { format } from "date-fns";
import type { RoundInfo } from "@/features/main/api";
import {
  slugToShort,
  type SlaughterHouseSlug,
} from "@/constants/slaughterHouseSlugs";
import { useCountdown } from "../hooks/useCountdown";
import { cn } from "@/lib/utils";

export interface RoundFloatingCardProps {
  activeSlug: SlaughterHouseSlug;
  currentRound: RoundInfo | null;
  lastClosedRound: RoundInfo | null;
}

/**
 * 회차 상태 카드 (오른쪽 사이드 컬럼에서 사용).
 * fixed 포지셔닝은 부모 (LiveAuctionRoom) 에서 관리한다.
 */
export function RoundFloatingCard({
  activeSlug,
  currentRound,
  lastClosedRound,
}: RoundFloatingCardProps) {
  const isOpen = currentRound?.status === "open";
  const { formatted, progress, isExpired } = useCountdown({
    startedAt: currentRound?.started_at ?? null,
    durationMin: currentRound?.round_duration_min ?? null,
    enabled: isOpen,
  });

  const isLive = isOpen && !isExpired;
  const shortName = slugToShort(activeSlug);

  return (
    <div className="pointer-events-auto relative w-[200px] rounded-2xl bg-white p-5 shadow-xl shadow-slate-300/40 ring-1 ring-slate-100">
      <StatusBadge isLive={isLive} hasClosedRound={!!lastClosedRound} />

      <div className="mt-3 text-center">
        <h3 className="text-[15px] font-bold leading-[1.35] text-slate-900">
          {isLive ? (
            <>
              {currentRound?.round_no}회차
              <br />
              <span className="text-slate-500">진행 중</span>
            </>
          ) : lastClosedRound ? (
            <>
              다음 회차
              <br />
              <span className="text-slate-500">준비 중</span>
            </>
          ) : (
            <>
              경매 시작
              <br />
              <span className="text-slate-500">대기 중</span>
            </>
          )}
        </h3>
      </div>

      <div className="mt-4 flex h-[96px] items-center justify-center">
        {isLive ? (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              남은 시간
            </span>
            <span className="text-[28px] font-bold leading-none tabular-nums text-sky-600">
              {formatted}
            </span>
            <div className="mt-1 h-1 w-[132px] overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progress > 0.85 ? "bg-red-500" : "bg-sky-500",
                )}
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-400 to-slate-600 shadow-lg shadow-slate-200/60">
            {lastClosedRound ? (
              <Clock className="h-10 w-10 text-white" strokeWidth={2} />
            ) : (
              <Gavel className="h-10 w-10 text-white" strokeWidth={2} />
            )}
          </div>
        )}
      </div>

      <div className="my-3 h-px w-full bg-slate-200" />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500">공판장</span>
          <span className="text-[13px] font-bold tracking-tight text-slate-900">
            {shortName}
          </span>
        </div>
        {lastClosedRound ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">
              최근 마감
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-slate-700">
              {lastClosedRound.round_no}회차 ·{" "}
              {lastClosedRound.ended_at
                ? format(new Date(lastClosedRound.ended_at), "HH:mm")
                : "-"}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({
  isLive,
  hasClosedRound,
}: {
  isLive: boolean;
  hasClosedRound: boolean;
}) {
  if (isLive) {
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
          </span>
          Live
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
        {hasClosedRound ? "Waiting" : "Standby"}
      </span>
    </div>
  );
}
