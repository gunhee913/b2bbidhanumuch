"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchLiveSummary, type LiveListingSummary } from "@/features/live-auction/api";
import { fetchRoundSchedules } from "@/features/round-schedules/api";
import type { RoundSchedule } from "@/features/round-schedules/types";
import { HOUSE_META, type HouseMeta } from "../constants";

/** 공판장 카드에 보이는 오늘 상태 */
export type HouseStatusKind = "live" | "upcoming" | "closed" | "off";

export interface HouseStatus {
  meta: HouseMeta;
  kind: HouseStatusKind;
  /** live · 진행 중 회차 번호 */
  roundNo: number | null;
  /** upcoming · 다음 회차 시작 시각 `HH:mm` */
  nextStart: string | null;
  listingCount: number;
  totalParts: number;
  winningParts: number;
}

const REFRESH_MS = 15_000;

/**
 * 4개 공판장의 오늘 상태 · 라이브 요약(상장·회차) + 회차 예정표(다음 시작 시각).
 * 카드가 정적 토글이 아니라 "지금 어디가 열려 있나" 를 말해 주도록.
 */
export function useHouseStatus() {
  const today = format(new Date(), "yyyy-MM-dd");

  const summaryQuery = useQuery({
    queryKey: ["entry", "live-summary", today],
    queryFn: () => fetchLiveSummary(today),
    staleTime: 5_000,
    refetchInterval: REFRESH_MS,
  });

  const scheduleQueries = useQueries({
    queries: HOUSE_META.map((h) => ({
      queryKey: ["round-schedules", h.name, today],
      queryFn: () => fetchRoundSchedules(today, h.name),
      staleTime: 30_000,
      refetchInterval: REFRESH_MS,
    })),
    combine: (results) => ({
      schedules: results.map((r) => r.data?.schedules ?? []),
      isLoading: results.some((r) => r.isLoading),
    }),
  });

  const statuses = useMemo<HouseStatus[]>(() => {
    const now = new Date();
    const summaryByHouse = new Map<string, LiveListingSummary>(
      (summaryQuery.data?.summaries ?? []).map((s) => [s.slaughterHouse, s]),
    );
    return HOUSE_META.map((meta, idx) =>
      buildStatus(meta, summaryByHouse.get(meta.name) ?? null, scheduleQueries.schedules[idx], now),
    );
  }, [summaryQuery.data, scheduleQueries.schedules]);

  return {
    statuses,
    isLoading: summaryQuery.isLoading || scheduleQueries.isLoading,
    liveCount: statuses.filter((s) => s.kind === "live").length,
    // 사이드바 "상장 N건" 과 같은 단위(부위 건수)
    totalListings: statuses.reduce((sum, s) => sum + s.totalParts, 0),
  };
}

function buildStatus(
  meta: HouseMeta,
  summary: LiveListingSummary | null,
  schedules: RoundSchedule[],
  now: Date,
): HouseStatus {
  const base = {
    meta,
    listingCount: summary?.listingCount ?? 0,
    totalParts: summary?.totalParts ?? 0,
    winningParts: summary?.winningParts ?? 0,
  };

  if (summary?.currentRound?.status === "open") {
    return { ...base, kind: "live", roundNo: summary.currentRound.roundNo, nextStart: null };
  }

  const nextStart = findNextStart(schedules, now);
  if (nextStart) {
    return { ...base, kind: "upcoming", roundNo: null, nextStart };
  }

  const hadAuction = base.listingCount > 0 || schedules.length > 0;
  return { ...base, kind: hadAuction ? "closed" : "off", roundNo: null, nextStart: null };
}

/** 예정표에서 아직 시작 전인 가장 이른 회차의 시작 시각 · `HH:mm` · 없으면 null */
function findNextStart(schedules: RoundSchedule[], now: Date): string | null {
  const nowHm = format(now, "HH:mm");
  const upcoming = schedules
    .map((s) => s.plannedStart.slice(0, 5))
    .filter((hm) => hm > nowHm)
    .sort();
  return upcoming[0] ?? null;
}
