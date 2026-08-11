"use client";

import { Clock, Gavel } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { RoundInfo } from "@/features/main/api";
import type { RoundSchedule } from "@/features/round-schedules/types";
import { useCountdown } from "../hooks/useCountdown";
import { cn } from "@/lib/utils";

export interface RoundFloatingCardProps {
  currentRound: RoundInfo | null;
  lastClosedRound: RoundInfo | null;
  /** 오늘 예정된 전체 회차 시간표 (병합된 하단 리스트) */
  schedules: RoundSchedule[];
  /** 회차 상태 매칭용 · closed 여부 판단 */
  allRounds: RoundInfo[];
  /** yyyy-MM-dd · 헤더 우측 라벨 */
  date: string;
  /** 시간표 로딩 상태 */
  isSchedulesLoading?: boolean;
}

/**
 * 경매 시간 카드 · 카운트다운 링 + 회차 시간표 통합.
 *
 * 이전에는 카운트다운(`RoundFloatingCard`) 과 시간표(`RoundScheduleList`) 를
 * 두 카드로 분리했으나, 사용자 요청에 따라 "경매 시간" 이라는 단일 카드로 병합.
 *
 * 구성 (위 → 아래):
 * 1. 헤더 · 타이틀 "경매 시간" + 날짜 라벨
 * 2. 현재 회차 카운트다운 (진행 중일 때만) · 원형 progress ring
 *    또는 대기 상태 placeholder
 * 3. divider
 * 4. 오늘 전체 회차 시간표 (완료/진행중/예정 3-state)
 */
export function RoundFloatingCard({
  currentRound,
  lastClosedRound,
  schedules,
  allRounds,
  date,
  isSchedulesLoading,
}: RoundFloatingCardProps) {
  const isOpen = currentRound?.status === "open";
  const { formatted, progress, isExpired, remainingMs } = useCountdown({
    startedAt: currentRound?.started_at ?? null,
    durationMin: currentRound?.round_duration_min ?? null,
    enabled: isOpen,
  });

  const isLive = isOpen && !isExpired;
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

  // Critical zone · 30초 이하 rose + pulse · 60초 이하 amber
  const criticalTier: "normal" | "warning" | "critical" =
    remainingSec <= 30
      ? "critical"
      : remainingSec <= 60
        ? "warning"
        : "normal";

  return (
    <div className="pointer-events-auto w-[236px] rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
      {/* 헤더 · 타이틀 + 날짜 · 병합 이후 date 는 여기서만 노출 */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-[13px] font-bold tracking-tight text-slate-900">
          경매 시간
        </span>
        <span className="text-[10.5px] font-medium tabular-nums text-slate-400">
          {formatHeaderDate(date)}
        </span>
      </div>

      <div className="h-px w-full bg-slate-100" />

      {/* 현재 회차 카운트다운 · 진행 중일 때만 · 대기 상태에도 최소 정보 표시 */}
      <div className="px-4 pt-4 pb-4">
        {isLive ? (
          <div className="flex flex-col items-center gap-2">
            <ProgressRing
              progress={progress}
              tier={criticalTier}
              size={112}
              strokeWidth={7}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {currentRound?.round_no ?? "-"}회차
                </span>
                <CountdownDigits formatted={formatted} tier={criticalTier} />
              </div>
            </ProgressRing>
          </div>
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
            {lastClosedRound?.ended_at ? (
              <p className="text-[10.5px] font-medium tabular-nums text-slate-400">
                최근 마감 · {lastClosedRound.round_no}회차 ·{" "}
                {format(new Date(lastClosedRound.ended_at), "HH:mm")}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="h-px w-full bg-slate-100" />

      {/*
       * 오늘 예정 회차 시간표.
       *
       * max-h 380px · 각 row ≈ 28px 기준 최대 12행 표시 후 스크롤.
       * 실무 상 하루 8회차 이내가 일반적이므로 대부분 스크롤 없이 전부 노출.
       * 그 이상은 얇은 native scrollbar 로 자연스럽게 처리.
       */}
      <div className="max-h-[380px] overflow-y-auto px-2 py-2 scrollbar-thin">
        <ScheduleSection
          schedules={schedules}
          allRounds={allRounds}
          currentRound={currentRound}
          isLoading={isSchedulesLoading}
        />
      </div>
    </div>
  );
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

type CriticalTier = "normal" | "warning" | "critical";

/**
 * 원형 진행바 · SVG stroke-dasharray 로 progress 시각화.
 * transition duration 1000ms · useCountdown 이 1초마다 tick 하므로 부드럽게 감소.
 */
function ProgressRing({
  progress,
  tier,
  size = 96,
  strokeWidth = 6,
  children,
}: {
  progress: number;
  tier: CriticalTier;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  const strokeColor =
    tier === "critical"
      ? "#e11d48" // rose-600
      : tier === "warning"
        ? "#d97706" // amber-600
        : "#0284c7"; // sky-600

  return (
    <div
      className={cn(
        "relative",
        tier === "critical" && "animate-pulse-soft",
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition:
              "stroke-dashoffset 1000ms linear, stroke 400ms ease-in-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function CountdownDigits({
  formatted,
  tier,
}: {
  formatted: string;
  tier: CriticalTier;
}) {
  const color =
    tier === "critical"
      ? "text-rose-600"
      : tier === "warning"
        ? "text-amber-700"
        : "text-slate-900";

  return (
    <div
      className={cn(
        "text-[22px] font-bold leading-none tabular-nums -tracking-[0.02em] transition-colors duration-300",
        color,
      )}
      aria-live="polite"
    >
      {formatted}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Schedule list (기존 `RoundScheduleList` 를 하위 섹션으로 흡수)
// ─────────────────────────────────────────────────────────────

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

function ScheduleSection({
  schedules,
  allRounds,
  currentRound,
  isLoading,
}: {
  schedules: RoundSchedule[];
  allRounds: RoundInfo[];
  currentRound: RoundInfo | null;
  isLoading?: boolean;
}) {
  const closedRoundNos = new Set(
    allRounds.filter((r) => r.status === "closed").map((r) => r.round_no),
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

  if (isLoading && !hasData) {
    return (
      <p className="px-2 py-6 text-center text-[11.5px] text-slate-400">
        불러오는 중...
      </p>
    );
  }

  if (!hasData) {
    return (
      <p className="px-2 py-6 text-center text-[11.5px] text-slate-400">
        등록된 예정 시간표가 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {rows.map((row) => (
        <ScheduleRow key={row.key} row={row} />
      ))}
    </ul>
  );
}

/**
 * 스케줄 행 · Status 뱃지 + 동일 사이즈 텍스트.
 *
 * 이전 (v1) : 완료 = 회색 + strikethrough · 진행 = sky bold + bg · 예정 = 기본
 *  → 4중 시각 시그널 (아이콘+색+굵기+선긋기+배경) 로 노이즈
 *  → strikethrough 는 특히 tabular 숫자 (08:20~08:30) 가독성 급락
 *
 * 이후 (v2) : Status 뱃지 (종료/진행/예정) prefix + 나머지 텍스트 동일 spec
 *  → 상태는 뱃지 하나로만 인지 · 텍스트는 순수 정보
 *  → Notion/Linear/Asana 표준 컨벤션
 *  → live row 만 배경 sky-50 유지 (컨텍스트 앵커)
 */
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
      <StatusBadge status={row.status} />
      <span
        className={cn(
          "w-10 shrink-0 text-[11.5px] font-semibold tabular-nums",
          isCompleted ? "text-slate-400 line-through" : "text-slate-800",
        )}
      >
        {row.roundNo}회차
      </span>
      <span
        className={cn(
          "ml-auto text-[11.5px] font-medium tabular-nums",
          isCompleted ? "text-slate-400 line-through" : "text-slate-700",
        )}
      >
        {row.plannedStart} <span className="text-slate-300">~</span>{" "}
        {row.plannedEnd}
      </span>
    </li>
  );
}

/**
 * 회차 상태 뱃지 · 2자 라벨 (종료/진행/예정) · 동일 폭 (w-8) 로 세로 정렬.
 *
 * 톤:
 * - 종료 · slate-100 bg / slate-500 text · 완료된 metadata (subdued)
 * - 진행 · sky-600 bg / white text        · 현재 진행 (강조)
 * - 예정 · slate-50 bg / slate-400 text  · 미래 (base)
 *
 * 세로 정렬: 3-state 모두 w-8 h-4 로 뱃지 폭 고정 → 회차번호/시간 컬럼이 rows 간 완벽 정렬.
 */
function StatusBadge({ status }: { status: RowStatus }) {
  const label =
    status === "completed" ? "종료" : status === "live" ? "진행" : "예정";
  const toneClass =
    status === "completed"
      ? "bg-slate-100 text-slate-500"
      : status === "live"
        ? "bg-sky-600 text-white"
        : "bg-slate-50 text-slate-400";

  return (
    <span
      className={cn(
        "inline-flex h-4 w-8 shrink-0 items-center justify-center rounded text-[9.5px] font-bold tracking-tight",
        toneClass,
      )}
    >
      {label}
    </span>
  );
}
