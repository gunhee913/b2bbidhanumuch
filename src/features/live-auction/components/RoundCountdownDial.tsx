"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon } from "lucide-react";
import { format } from "date-fns";
import type { RoundInfo } from "@/features/main/api";
import type { RoundSchedule } from "@/features/round-schedules/types";
import { cn } from "@/lib/utils";
import { useCountdown, useCountdownTo } from "../hooks/useCountdown";
import { getDeadlineTier, type CriticalTier } from "../lib/deadline";

/** 대기 링이 채워지기 시작하는 시점 · 다음 회차 시작 10분 전부터 0 → 100% */
const IDLE_RING_WINDOW_MS = 10 * 60_000;
/** 회차 마감 직후 "n회차 마감" 체크 상태를 보여주는 시간 */
const CLOSED_FLASH_MS = 1600;
/** 회차 시작 직후 카드 표면 flash 지속 */
const OPEN_FLASH_MS = 1200;

export type RoundPhaseKind = "live" | "closed" | "idle" | "none";

export interface RoundPhase {
  kind: RoundPhaseKind;
  tier: CriticalTier;
  /** live 는 마감까지 · idle 은 다음 회차 시작까지 */
  formatted: string;
  progress: number;
  roundNo: number | null;
  /** live 일 때 마감까지 남은 초 · 그 밖엔 0 */
  remainingSec: number;
  /** 마지막 10초 · 숫자를 한 단계 키운다 */
  emphasize: boolean;
  justClosedRoundNo: number | null;
  /** 예정 시각이 지났는데 아직 안 열림 (운영 지연) */
  isOverdue: boolean;
  /** idle 에서 다음 회차 예정 시각 `HH:mm` */
  plannedStart: string | null;
  /** 회차가 막 열렸다 · 카드 표면 flash */
  openFlash: boolean;
  /** 오늘 경매가 끝났을 때 마지막 마감 안내 */
  lastClosedLabel: string | null;
}

export interface UseRoundPhaseParams {
  currentRound: RoundInfo | null;
  lastClosedRound: RoundInfo | null;
  schedules: RoundSchedule[];
  allRounds: RoundInfo[];
  /** yyyy-MM-dd · 예정 시각을 오늘 기준 ms 로 바꾸는 데 쓴다 */
  date: string;
}

/**
 * 경매 시간의 지금 상태 한 덩어리.
 *
 * 링을 그리는 곳이 둘(펼친 패널 · 접힌 레일에서 튀어나오는 카드)이라, 같은 계산을 두 벌
 * 두면 한쪽만 고치는 사고가 난다. 상태 판정을 여기 모으고 그리는 쪽은 받아 쓰기만 한다.
 */
export function useRoundPhase({
  currentRound,
  lastClosedRound,
  schedules,
  allRounds,
  date,
}: UseRoundPhaseParams): RoundPhase {
  const isOpen = currentRound?.status === "open";
  const { formatted, progress, isExpired, remainingMs } = useCountdown({
    startedAt: currentRound?.started_at ?? null,
    durationMin: currentRound?.round_duration_min ?? null,
    enabled: isOpen,
  });
  const isLive = isOpen && !isExpired;
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const tier = getDeadlineTier(remainingSec);

  const nextSchedule = useMemo(
    () => findNextSchedule(schedules, allRounds, currentRound),
    [schedules, allRounds, currentRound],
  );
  const nextStartMs = nextSchedule
    ? toTodayMs(date, nextSchedule.plannedStart)
    : null;
  const idle = useCountdownTo(nextStartMs, !isLive);
  const isOverdue = nextStartMs != null && idle.remainingMs === 0;
  const idleProgress =
    nextStartMs == null
      ? 0
      : 1 - Math.min(1, idle.remainingMs / IDLE_RING_WINDOW_MS);

  const { openFlash, justClosedRoundNo } = useRoundTransition(
    isLive,
    currentRound?.round_no ?? null,
  );

  const kind: RoundPhaseKind = isLive
    ? "live"
    : justClosedRoundNo != null
      ? "closed"
      : nextSchedule
        ? "idle"
        : "none";

  return {
    kind,
    tier: isLive ? tier : "idle",
    formatted: isLive ? formatted : idle.formatted,
    progress: isLive ? progress : idleProgress,
    roundNo: isLive
      ? (currentRound?.round_no ?? null)
      : (nextSchedule?.roundNo ?? null),
    remainingSec: isLive ? remainingSec : 0,
    emphasize: isLive && remainingSec <= 10,
    justClosedRoundNo,
    isOverdue,
    plannedStart: nextSchedule ? toHmm(nextSchedule.plannedStart) : null,
    openFlash,
    lastClosedLabel: lastClosedRound?.ended_at
      ? `마지막 마감 · ${lastClosedRound.round_no}회차 · ${format(new Date(lastClosedRound.ended_at), "HH:mm")}`
      : lastClosedRound
        ? "오늘 경매 종료"
        : null,
  };
}

/** 열림/마감 순간에만 잠깐 켜지는 신호 · 마운트만으로는 켜지지 않는다 */
function useRoundTransition(isLive: boolean, roundNo: number | null) {
  const wasLiveRef = useRef(isLive);
  const liveRoundNoRef = useRef<number | null>(null);
  const [openFlash, setOpenFlash] = useState(false);
  const [justClosedRoundNo, setJustClosedRoundNo] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (isLive) liveRoundNoRef.current = roundNo;
    const wasLive = wasLiveRef.current;
    wasLiveRef.current = isLive;

    // cleanup 에서 상태도 되돌려 deps 가 연달아 바뀌어도 flash 가 켜진 채 남지 않게
    if (!wasLive && isLive) {
      setOpenFlash(true);
      const id = setTimeout(() => setOpenFlash(false), OPEN_FLASH_MS);
      return () => {
        clearTimeout(id);
        setOpenFlash(false);
      };
    }
    if (wasLive && !isLive) {
      setJustClosedRoundNo(liveRoundNoRef.current);
      const id = setTimeout(() => setJustClosedRoundNo(null), CLOSED_FLASH_MS);
      return () => {
        clearTimeout(id);
        setJustClosedRoundNo(null);
      };
    }
  }, [isLive, roundNo]);

  return { openFlash, justClosedRoundNo };
}

/**
 * 링 하나가 상태에 따라 변신한다 (요소를 갈아 끼우지 않고 연속성 유지).
 * live 남은 시간 · closed 마감 체크 · idle 다음 회차까지 · none 오늘 경매 없음.
 */
export function RoundCountdownDial({
  phase,
  size = 112,
}: {
  phase: RoundPhase;
  size?: number;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={phase.kind}
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {phase.kind === "live" ? (
          <ProgressRing progress={phase.progress} tier={phase.tier} size={size}>
            <div className="flex flex-col items-center gap-0.5">
              <DialCaption>{phase.roundNo ?? "-"}회차</DialCaption>
              <CountdownDigits
                formatted={phase.formatted}
                tier={phase.tier}
                emphasize={phase.emphasize}
              />
            </div>
          </ProgressRing>
        ) : phase.kind === "closed" ? (
          <ProgressRing progress={1} tier="normal" size={size}>
            <div className="flex flex-col items-center gap-1">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-inverse text-inverse-content"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </motion.span>
              <span className="text-[11.5px] font-bold text-content-mid">
                {phase.justClosedRoundNo}회차 마감
              </span>
            </div>
          </ProgressRing>
        ) : phase.kind === "idle" ? (
          <ProgressRing progress={phase.progress} tier="idle" size={size}>
            <div className="flex flex-col items-center gap-0.5">
              <DialCaption>
                {phase.roundNo}회차 {phase.isOverdue ? "대기" : "시작까지"}
              </DialCaption>
              {phase.isOverdue ? (
                <span className="text-[12px] font-bold tabular-nums text-content-soft">
                  예정 {phase.plannedStart}
                </span>
              ) : (
                <CountdownDigits formatted={phase.formatted} tier="idle" />
              )}
            </div>
          </ProgressRing>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted">
              <Moon className="h-5 w-5 text-content-faint" strokeWidth={1.75} />
            </div>
            <p className="text-[12.5px] font-semibold text-content-mid">
              {phase.lastClosedLabel ? "오늘 경매 종료" : "예정된 회차 없음"}
            </p>
            {phase.lastClosedLabel ? (
              <p className="text-[10.5px] font-medium tabular-nums text-content-faint">
                {phase.lastClosedLabel}
              </p>
            ) : null}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function DialCaption({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-content-faint">
      {children}
    </span>
  );
}

/**
 * 원형 진행바 · `stroke-dasharray` 로 진도를 그린다.
 * 1초마다 tick 하므로 전환은 1000ms linear 로 맞춰 끊김 없이 줄어든다.
 *
 * 색은 반드시 토큰(`stroke-inverse` 등)으로만 쓴다. 예전엔 먹색·연회색 hex 를 직접 박아
 * 뒀는데, 다크에서 트랙만 하얗게 뜨고 정작 봐야 할 진행선이 검정이라 바탕에 묻혔다.
 *
 * 마감 경고는 링까지 물들이지 않고 마지막 30초에만 붉힌다. 1분 남았다고 주황 링을
 * 두르면 화면에서 제일 큰 물체가 통째로 색을 갈아입어, 정작 30초에 한 번 더 조여야 할
 * 때 올릴 단계가 남지 않는다. 60초 구간은 숫자만 붉히는 것으로 충분하다.
 */
export function ProgressRing({
  progress,
  tier,
  size = 96,
  strokeWidth = 7,
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

  const strokeClass =
    tier === "critical"
      ? "stroke-rise"
      : tier === "idle"
        ? "stroke-content-ghost"
        : "stroke-inverse";

  return (
    <div
      className={cn("relative", tier === "critical" && "animate-pulse-soft")}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          className="stroke-surface-strong"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className={cn("transition-colors duration-500", strokeClass)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1000ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export function CountdownDigits({
  formatted,
  tier,
  emphasize = false,
}: {
  formatted: string;
  tier: CriticalTier;
  /** 마지막 10초 · 숫자를 한 단계 키움 */
  emphasize?: boolean;
}) {
  // 경고는 한 가지 색(시세 빨강)으로만 · 주황·장미를 섞으면 단계가 아니라 그냥 알록달록해진다
  const color =
    tier === "critical" || tier === "warning"
      ? "text-rise"
      : tier === "idle"
        ? "text-content-mid"
        : "text-content";

  return (
    <div
      className={cn(
        "font-bold leading-none tabular-nums -tracking-[0.02em] transition-all duration-300",
        emphasize ? "text-[26px]" : "text-[22px]",
        color,
      )}
      aria-live="polite"
    >
      {formatted}
    </div>
  );
}

/**
 * 다음 회차 · 열리지도(open) 닫히지도(closed) 않은 시간표 중 plannedStart 가 가장 빠른 것.
 * 예정 시각이 이미 지났어도(운영 지연) 다음 후보로 유지 → "시작 대기" 로 표시.
 */
function findNextSchedule(
  schedules: RoundSchedule[],
  allRounds: RoundInfo[],
  currentRound: RoundInfo | null,
): RoundSchedule | null {
  const settled = new Set(
    allRounds.filter((r) => r.status === "closed").map((r) => r.round_no),
  );
  if (currentRound?.status === "open") settled.add(currentRound.round_no);
  const pending = schedules
    .filter((s) => !settled.has(s.roundNo))
    .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
  return pending[0] ?? null;
}

/** `yyyy-MM-dd` + `HH:mm[:ss]` → 로컬 ms · 파싱 실패 시 null */
function toTodayMs(date: string, time: string): number | null {
  const hhmm = toHmm(time);
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const ms = new Date(`${date}T${hhmm}:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function toHmm(time: string): string {
  if (!time) return "--:--";
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time.slice(0, 5);
  return time;
}
