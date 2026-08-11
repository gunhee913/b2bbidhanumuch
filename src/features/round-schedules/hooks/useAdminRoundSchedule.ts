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

/**
 * 캐시 무효화 정책:
 * 프론트 `useRoundSchedule` 는 slaughterHouse 지정 없이 `["round-schedules", "all", date]`
 * 로 조회하는 반면, admin 은 특정 도축장으로 저장한다.
 *
 * 정확한 도축장 key 만 invalidate 하면 통합 조회 key ("all") 는 stale 인 상태로 남아
 * 사용자가 프론트에서 admin 변경 결과를 즉시 볼 수 없다.
 *
 * → partial key `["round-schedules"]` 로 invalidate 해 통합/개별 모두 갱신.
 *   admin key 는 `["admin", "round-schedules", ...]` 로 prefix 가 다르므로 별도 invalidate.
 */
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
      qc.invalidateQueries({ queryKey: ["round-schedules"] });
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
      qc.invalidateQueries({ queryKey: ["round-schedules"] });
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
      qc.invalidateQueries({ queryKey: ["round-schedules"] });
    },
  });
}
