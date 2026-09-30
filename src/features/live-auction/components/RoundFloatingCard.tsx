"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import type { RoundInfo } from "@/features/main/api";
import type { RoundSchedule } from "@/features/round-schedules/types";
import { cn } from "@/lib/utils";
import type { LiveListing } from "../api";
import {
  RoundCountdownDial,
  toHmm,
  type RoundPhase,
} from "./RoundCountdownDial";
import {
  RoundResultSection,
  type RoundResultState,
} from "./RoundResultSection";

export interface RoundFloatingCardProps {
  /** 접힌 레일의 카드와 같은 계산을 쓰도록 바깥에서 한 번만 구해 넘긴다 */
  phase: RoundPhase;
  currentRound: RoundInfo | null;
  /** 오늘 예정된 전체 회차 시간표 */
  schedules: RoundSchedule[];
  /** 회차 상태 매칭용 · closed 여부 판단 */
  allRounds: RoundInfo[];
  /** yyyy-MM-dd · 지금 보고 있는 경매일 */
  date: string;
  /** 시간표 로딩 상태 */
  isSchedulesLoading?: boolean;
  /** 회차별 결과 집계 대상 · 지금 공판장의 오늘 상장 */
  listings: LiveListing[];
  /** 개체 → 걸린 회차 번호 */
  roundListingMap: Record<string, number[]>;
}

/**
 * 경매 시간 패널 · 오늘 안쪽의 시간만 다룬다 (링 + 오늘 회차 시간표).
 * 어느 날에 장이 서는지는 옆 탭(경매 일정)이 맡는다 — 지금 몇 분 남았는지와
 * 다음 주 목요일에 장이 서는지는 서로 쓰는 때가 달라서 한 화면에 겹쳐 두면 둘 다 산만해진다.
 *
 * 마감 임박 딱지는 두지 않는다. 링과 숫자가 이미 붉어지는데 그 위에 「마감 임박」 글자까지
 * 얹으면 같은 말을 두 번 하는 셈이고, 정작 봐야 할 남은 초에서 눈이 분산된다.
 */
export function RoundFloatingCard({
  phase,
  currentRound,
  schedules,
  allRounds,
  date,
  isSchedulesLoading,
  listings,
  roundListingMap,
}: RoundFloatingCardProps) {
  /*
   * 고른 회차는 직접 누르기 전까지 비워 둔다. 그래야 회차가 하나 마감될 때마다
   * 기본 선택이 저절로 최신 결과로 따라가고, 접수번호를 옮겨 다시 마운트돼도
   * 「방금 끝난 회차」 라는 같은 자리로 돌아온다.
   */
  const [picked, setPicked] = useState<number | null>(null);
  const latestClosed = useMemo(() => {
    const closed = allRounds
      .filter((r) => r.status === "closed")
      .map((r) => r.round_no);
    return closed.length > 0 ? Math.max(...closed) : null;
  }, [allRounds]);

  const selectedRound = picked ?? latestClosed;
  const resultState: RoundResultState =
    selectedRound == null
      ? "none"
      : allRounds.find((r) => r.round_no === selectedRound)?.status === "closed"
        ? "closed"
        : "pending";

  return (
    <motion.div
      className="pointer-events-auto w-full rounded-xl"
      animate={{ opacity: phase.openFlash ? [1, 0.55, 1] : 1 }}
      transition={{ duration: phase.openFlash ? 1.2 : 0.2, ease: "easeInOut" }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-[13px] font-bold tracking-tight text-content">
          경매 시간
        </span>
        <span className="text-[10.5px] font-medium tabular-nums text-content-faint">
          {formatHeaderDate(date)}
        </span>
      </div>

      <div className="flex justify-center px-4 pb-5 pt-3">
        <RoundCountdownDial phase={phase} />
      </div>

      <div className="px-2 pb-2">
        <ScheduleSection
          schedules={schedules}
          allRounds={allRounds}
          currentRound={currentRound}
          isLoading={isSchedulesLoading}
          selectedRound={selectedRound}
          onSelectRound={setPicked}
        />
      </div>

      <RoundResultSection
        roundNo={selectedRound}
        state={resultState}
        listings={listings}
        roundListingMap={roundListingMap}
      />
    </motion.div>
  );
}

function formatHeaderDate(iso: string): string {
  const d = parse(iso, "yyyy-MM-dd", new Date());
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "M.d (EEEEE)", { locale: ko });
}

// ─────────────────────────────────────────────────────────────
// 오늘 회차 시간표
// ─────────────────────────────────────────────────────────────

type RowStatus = "completed" | "live" | "upcoming";

interface EnrichedRow {
  key: string;
  roundNo: number;
  plannedStart: string;
  plannedEnd: string;
  status: RowStatus;
}

function ScheduleSection({
  schedules,
  allRounds,
  currentRound,
  isLoading,
  selectedRound,
  onSelectRound,
}: {
  schedules: RoundSchedule[];
  allRounds: RoundInfo[];
  currentRound: RoundInfo | null;
  isLoading?: boolean;
  selectedRound: number | null;
  onSelectRound: (roundNo: number) => void;
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

  if (rows.length === 0) {
    return (
      <p className="px-2 py-4 text-[11.5px] text-content-faint">
        {isLoading ? "불러오는 중..." : "등록된 예정 시간표가 없습니다."}
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {rows.map((row) => (
        <ScheduleRow
          key={row.key}
          row={row}
          selected={row.roundNo === selectedRound}
          onSelect={() => onSelectRound(row.roundNo)}
        />
      ))}
    </ul>
  );
}

/**
 * 시간표 한 줄 · 겸 아래 결과 섹션의 회차 선택기.
 *
 * 바탕은 「고른 줄」, 왼쪽 눈금은 「진행 중인 줄」 하나씩만 맡는다. 둘 다 바탕으로 말하면
 * 진행 중인 회차를 고른 순간 두 의미가 한 칸에서 겹쳐 어느 쪽인지 알 수 없게 된다.
 * 예전에는 바탕에 sky-50 을 직접 박아 뒀는데, 다크에서 흰 띠 위에 흰 글자가 얹혀
 * 명암비가 1.03 까지 떨어졌다 — 사실상 안 보이는 줄이었다. 바탕은 토큰으로만 쓴다.
 *
 * 끝난 줄에 취소선은 긋지 않는다. 08:20~08:30 처럼 숫자가 이어지는 자리에서 선이 획을
 * 가로질러 읽는 속도가 눈에 띄게 떨어진다 — 흐린 글자와 「종료」 뱃지로 충분하다.
 */
function ScheduleRow({
  row,
  selected,
  onSelect,
}: {
  row: EnrichedRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const isCompleted = row.status === "completed";
  const isLive = row.status === "live";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-500",
          selected ? "bg-surface-accent" : "hover:bg-surface-muted",
        )}
      >
        {isLive ? (
          <motion.span
            layoutId="round-schedule-live-bar"
            className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-inverse"
            aria-hidden
          />
        ) : null}
        <StatusBadge status={row.status} />
        <span
          className={cn(
            "w-10 shrink-0 text-left text-[11.5px] tabular-nums",
            isCompleted
              ? "font-medium text-content-soft"
              : isLive
                ? "font-bold text-content"
                : "font-semibold text-content-mid",
          )}
        >
          {row.roundNo}회차
        </span>
        <span
          className={cn(
            "ml-auto text-[11.5px] tabular-nums",
            isCompleted
              ? "font-medium text-content-soft"
              : isLive
                ? "font-bold text-content"
                : "font-medium text-content-soft",
          )}
        >
          {row.plannedStart} <span className="text-content-ghost">~</span>{" "}
          {row.plannedEnd}
        </span>
      </button>
    </li>
  );
}

/**
 * 회차 상태 뱃지 · 2자 라벨 · 폭을 w-8 로 고정해 회차·시간 열이 줄마다 딱 맞는다.
 *
 * 상태가 실제로 바뀔 때만 튀어오른다. 마운트에도 튀게 두면 접수번호를 옮길 때마다
 * (사이드 메뉴가 페이지 안에 있어 통째로 다시 마운트된다) 뱃지가 전부 한 번씩 뛴다.
 */
function StatusBadge({ status }: { status: RowStatus }) {
  const seen = useRef(status);
  useEffect(() => {
    seen.current = status;
  }, [status]);
  const changed = seen.current !== status;

  const label =
    status === "completed" ? "종료" : status === "live" ? "진행" : "예정";
  const toneClass =
    status === "completed"
      ? "bg-surface-accent text-content-soft"
      : status === "live"
        ? "bg-inverse text-inverse-content"
        : "bg-surface-muted text-content-soft";

  return (
    <motion.span
      key={status}
      initial={changed ? { scale: 0.7, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className={cn(
        "inline-flex h-4 w-8 shrink-0 items-center justify-center rounded text-[9.5px] font-bold tracking-tight",
        toneClass,
      )}
    >
      {label}
    </motion.span>
  );
}
