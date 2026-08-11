"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRoundSchedules } from "../api";

/**
 * 통합 회차 예정 시간표 조회.
 *
 * Phase 1 이전에는 공판장 단위로 스케줄을 조회했지만, 통합 이후에는
 * 공판장 구분 없이 해당 일자의 스케줄을 회차 번호 기준으로 dedupe 해서
 * 하나의 시간표로 노출한다.
 *
 * `slaughterHouse` 를 주면 기존 방식대로 특정 공판장 스케줄만 반환한다
 * (관리자 페이지 등 하위 호환용).
 */
export function useRoundSchedule(
  date: string | null,
  slaughterHouse?: string | null,
) {
  return useQuery({
    queryKey: ["round-schedules", slaughterHouse ?? "all", date],
    queryFn: () => fetchRoundSchedules(date ?? "", slaughterHouse ?? undefined),
    enabled: Boolean(date),
    /*
     * admin 이 회차를 추가/삭제한 뒤 즉시 반영되도록 짧게 유지.
     * admin 화면에서는 `useAdminRoundSchedule` 이 partial-key invalidate 를 트리거하지만
     * 다른 세션/브라우저에서 변경한 경우엔 이 주기가 실질 갱신 주기가 됨.
     */
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
