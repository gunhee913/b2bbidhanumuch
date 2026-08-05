"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  copyRoundSchedules,
  deleteRoundSchedules,
  fetchAdminRoundSchedules,
  upsertRoundSchedules,
} from "../api";

export function useAdminRoundSchedule(
  slaughterHouse: string | null,
  date: string | null,
) {
  return useQuery({
    queryKey: ["admin", "round-schedules", slaughterHouse, date],
    queryFn: () =>
      fetchAdminRoundSchedules(slaughterHouse ?? "", date ?? ""),
    enabled: Boolean(slaughterHouse && date),
    staleTime: 0,
  });
}

export function useUpsertRoundSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertRoundSchedules,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: [
          "admin",
          "round-schedules",
          variables.slaughterHouse,
          variables.auctionDate,
        ],
      });
      qc.invalidateQueries({
        queryKey: [
          "round-schedules",
          variables.slaughterHouse,
          variables.auctionDate,
        ],
      });
    },
  });
}

export function useDeleteRoundSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { slaughterHouse: string; date: string }) =>
      deleteRoundSchedules(params.slaughterHouse, params.date),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: [
          "admin",
          "round-schedules",
          variables.slaughterHouse,
          variables.date,
        ],
      });
      qc.invalidateQueries({
        queryKey: [
          "round-schedules",
          variables.slaughterHouse,
          variables.date,
        ],
      });
    },
  });
}

export function useCopyRoundSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: copyRoundSchedules,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: [
          "admin",
          "round-schedules",
          variables.slaughterHouse,
          variables.toDate,
        ],
      });
    },
  });
}
