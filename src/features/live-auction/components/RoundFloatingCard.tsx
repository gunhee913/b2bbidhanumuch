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
 * 회차 상태 카드 (오른쪽 사이드 컬럼) · Trader Console 톤.
 *
 * 레이아웃 (위 → 아래):
 * - 헤더 · 공판장명 + 상태 chip (LIVE/대기)
 * - 카운트다운 (진행 중) 또는 대기 아이콘 (대기)
 * - 진행바 + 진행률(%)
 * - 시작/종료 시각 meta strip (진행 중)
 * - 최근 마감 (대기 상태)
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
  const progressPct = Math.min(100, Math.round(progress * 100));
  const isCritical = progress > 0.85;

  const startedAt = currentRound?.started_at
    ? new Date(currentRound.started_at)
    : null;
  const endedAt =
    startedAt && currentRound?.round_duration_min
      ? new Date(startedAt.getTime() + currentRound.round_duration_min * 60_000)
      : null;

  return (
    <div className="pointer-events-auto w-[236px] rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
      {/* 헤더 · 공판장 + 상태 chip */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-[13px] font-bold tracking-tight text-slate-900">
          {shortName}공판장
        </span>
        {isLive ? (
          <LiveChip roundNo={currentRound?.round_no ?? null} />
        ) : lastClosedRound ? (
          <StatusChip label="대기" tone="slate" />
        ) : (
          <StatusChip label="준비" tone="slate" />
        )}
      </div>

      <div className="h-px w-full bg-slate-100" />

      {/* 본문 · 카운트다운 또는 대기 아이콘 */}
      <div className="px-4 pt-4 pb-3">
        {isLive ? (
          <>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                남은 시간
              </p>
              <p
                className={cn(
                  "mt-1.5 text-[30px] font-bold leading-none tabular-nums transition-colors",
                  isCritical ? "text-red-600" : "text-sky-600",
                )}
                aria-live="polite"
              >
                {formatted}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCritical ? "bg-red-500" : "bg-sky-500",
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span
                className={cn(
                  "w-8 shrink-0 text-right text-[10px] font-semibold tabular-nums",
                  isCritical ? "text-red-600" : "text-slate-500",
                )}
              >
                {progressPct}%
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
              {lastClosedRound ? (
                <Clock className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
              ) : (
                <Gavel className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
              )}
            </div>
            <p className="text-[12.5px] font-semibold text-slate-600">
              {lastClosedRound ? "다음 회차 준비 중" : "경매 시작 대기"}
            </p>
          </div>
        )}
      </div>

      {/* 하단 meta · 시작/종료 시각 (라이브) 또는 최근 마감 (대기) */}
      {isLive && startedAt ? (
        <>
          <div className="h-px w-full bg-slate-100" />
          <div className="flex items-center justify-between px-4 py-2.5 text-[11px]">
            <MetaItem label="시작" time={format(startedAt, "HH:mm")} />
            <span className="h-3 w-px bg-slate-200" aria-hidden />
            <MetaItem
              label="종료"
              time={endedAt ? format(endedAt, "HH:mm") : "--:--"}
            />
          </div>
        </>
      ) : lastClosedRound ? (
        <>
          <div className="h-px w-full bg-slate-100" />
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] font-medium text-slate-400">
              최근 마감
            </span>
            <span className="text-[11.5px] font-semibold tabular-nums text-slate-700">
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

function LiveChip({ roundNo }: { roundNo: number | null }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2 py-0.5 text-[10.5px] font-bold tracking-tight text-sky-700 ring-1 ring-inset ring-sky-200"
      aria-label={`${roundNo ?? "-"}회차 진행 중`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
      </span>
      <span className="tabular-nums">{roundNo ?? "-"}</span>회차 LIVE
    </span>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "slate";
}) {
  const toneClass =
    tone === "slate"
      ? "bg-slate-50 text-slate-500 ring-slate-200"
      : "bg-slate-50 text-slate-500 ring-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
        toneClass,
      )}
    >
      {label}
    </span>
  );
}

function MetaItem({ label, time }: { label: string; time: string }) {
  return (
    <span className="flex flex-1 items-baseline justify-center gap-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-700">{time}</span>
    </span>
  );
}
