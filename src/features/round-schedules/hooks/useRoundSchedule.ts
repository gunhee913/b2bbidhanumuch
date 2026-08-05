"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRoundSchedules } from "../api";

export function useRoundSchedule(
  slaughterHouse: string | null,
  date: string | null,
) {
  return useQuery({
    queryKey: ["round-schedules", slaughterHouse, date],
    queryFn: () => fetchRoundSchedules(slaughterHouse ?? "", date ?? ""),
    enabled: Boolean(slaughterHouse && date),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
