"use client";

import { Check } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { RoundInfo } from "@/features/main/api";
import type { RoundSchedule } from "@/features/round-schedules/types";
import { cn } from "@/lib/utils";

export interface RoundScheduleListProps {
  schedules: RoundSchedule[];
  currentRound: RoundInfo | null;
  allRounds: RoundInfo[];
  /** yyyy-MM-dd · 헤더 우측 라벨 · schedules 의 auctionDate 대신 명시적으로 전달 */
  date: string;
  isLoading?: boolean;
}

function formatHeaderDate(iso: string): string {
  try {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, "M.d (EEEEE)", { locale: ko });
  } catch {
    return iso;
  }
}

type RowStatus = "completed" | "live" | "upcoming";

interface EnrichedRow {
  key: string;
  roundNo: number;
  plannedStart: string;
  plannedEnd: string;
  status: RowStatus;
}

function toHmm(time: string): string {
  if (!time) return "--:--";
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time.slice(0, 5);
  return time;
}

/**
 * 공판장·오늘 날짜의 회차 예정 시간표.
 * 실행 상태(auctions)와 매칭해 완료/진행중/예정 3-state 로 시각화.
 */
export function RoundScheduleList({
  schedules,
  currentRound,
  allRounds,
  date,
  isLoading,
}: RoundScheduleListProps) {
  const closedRoundNos = new Set(
    allRounds
      .filter((r) => r.status === "closed")
      .map((r) => r.round_no),
  );
  const openRoundNo =
    currentRound?.status === "open" ? currentRound.round_no : null;

  const rows: EnrichedRow[] = schedules.map((s) => {
    let status: RowStatus = "upcoming";
    if (openRoundNo === s.roundNo) status = "live";
    else if (closedRoundNos.has(s.roundNo)) status = "completed";
    return {
      key: s.id,
      roundNo: s.roundNo,
      plannedStart: toHmm(s.plannedStart),
      plannedEnd: toHmm(s.plannedEnd),
      status,
    };
  });

  const hasData = rows.length > 0;

  return (
    <div className="pointer-events-auto w-[236px] rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-bold tracking-tight text-slate-900">
          예정 시간표
        </span>
        <span className="text-[10.5px] font-medium tabular-nums text-slate-400">
          {formatHeaderDate(date)}
        </span>
      </div>
      <div className="h-px w-full bg-slate-100" />

      <div className="max-h-[280px] overflow-y-auto px-2 py-2">
        {isLoading && !hasData ? (
          <p className="px-2 py-6 text-center text-[11.5px] text-slate-400">
            불러오는 중...
          </p>
        ) : !hasData ? (
          <p className="px-2 py-6 text-center text-[11.5px] text-slate-400">
            등록된 예정 시간표가 없습니다.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map((row) => (
              <ScheduleRow key={row.key} row={row} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ScheduleRow({ row }: { row: EnrichedRow }) {
  const isCompleted = row.status === "completed";
  const isLive = row.status === "live";

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
        isLive && "bg-sky-50",
      )}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {isCompleted ? (
          <Check className="h-3 w-3 text-slate-400" strokeWidth={2.5} />
        ) : isLive ? (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
          </span>
        ) : (
          <span className="h-1 w-1 rounded-full bg-slate-300" />
        )}
      </span>
      <span
        className={cn(
          "w-10 shrink-0 text-[11.5px] font-semibold tabular-nums",
          isCompleted && "text-slate-400 line-through",
          isLive && "text-sky-700",
          !isCompleted && !isLive && "text-slate-700",
        )}
      >
        {row.roundNo}회차
      </span>
      <span
        className={cn(
          "ml-auto text-[11.5px] tabular-nums",
          isCompleted && "text-slate-400 line-through",
          isLive && "font-bold text-sky-700",
          !isCompleted && !isLive && "font-medium text-slate-600",
        )}
      >
        {row.plannedStart} <span className="text-slate-300">→</span>{" "}
        {row.plannedEnd}
      </span>
    </li>
  );
}
