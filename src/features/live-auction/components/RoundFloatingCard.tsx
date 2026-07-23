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
 * 회차 상태 카드 (오른쪽 사이드 컬럼).
 *
 * 레이아웃 (위 → 아래):
 * - 공판장 헤더 (라벨 + 이름 + Live 상태 도트)
 * - 회차 상태 문구 (예: "1회차 진행 중" / "다음 회차 준비 중")
 * - 카운트다운 (진행 중일 때만) 또는 대기 아이콘
 * - 진행바 (진행 중일 때만)
 * - 최근 마감 (대기 상태에서만)
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
    <div className="pointer-events-auto w-[220px] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60">
      {/* 헤더 · 공판장 · 라이브 도트 */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-medium text-slate-400">공판장</span>
          <span className="text-[13px] font-bold tracking-tight text-slate-900">
            {shortName}
          </span>
        </div>
        {isLive ? (
          <span className="relative flex h-1.5 w-1.5" aria-label="Live">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
          </span>
        ) : (
          <span
            className="h-1.5 w-1.5 rounded-full bg-slate-300"
            aria-label={lastClosedRound ? "Waiting" : "Standby"}
          />
        )}
      </div>

      <div className="my-3 h-px w-full bg-slate-100" />

      {/* 회차 상태 문구 */}
      <div className="text-center">
        {isLive ? (
          <p className="text-[14px] font-bold leading-tight text-slate-900">
            <span className="tabular-nums">{currentRound?.round_no}</span>회차{" "}
            <span className="text-slate-500">진행 중</span>
          </p>
        ) : lastClosedRound ? (
          <p className="text-[14px] font-bold leading-tight text-slate-500">
            다음 회차 준비 중
          </p>
        ) : (
          <p className="text-[14px] font-bold leading-tight text-slate-500">
            경매 시작 대기
          </p>
        )}
      </div>

      {/* 카운트다운 또는 대기 아이콘 */}
      <div className="mt-3">
        {isLive ? (
          <>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                남은 시간
              </p>
              <p className="mt-1 text-[28px] font-bold leading-none tabular-nums text-sky-600">
                {formatted}
              </p>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progress > 0.85 ? "bg-red-500" : "bg-sky-500",
                )}
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex justify-center py-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50">
              {lastClosedRound ? (
                <Clock className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
              ) : (
                <Gavel className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 최근 마감 · 대기 상태에서만 노출 */}
      {!isLive && lastClosedRound ? (
        <>
          <div className="my-3 h-px w-full bg-slate-100" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400">
              최근 마감
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-slate-700">
              {lastClosedRound.round_no}회차 ·{" "}
              {lastClosedRound.ended_at
                ? format(new Date(lastClosedRound.ended_at), "HH:mm")
                : "-"}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
