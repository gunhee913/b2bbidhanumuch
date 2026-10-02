"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssignmentsResponse } from "../types";

/**
 * 부위별 거래처 배정 정보. `part_id` → `AssignmentInfo` 맵.
 * 서버는 date 필터를 지원하지만, 딜러 페이지에서는 자기 낙찰 부위만 조회하므로
 * 전체 조회 후 클라이언트에서 partId 로 참조한다.
 */
export function useDeliveryAssignments() {
  return useQuery<AssignmentsResponse, Error>({
    queryKey: ["delivery-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/delivery/assignments");
      if (!res.ok) {
        throw new Error("거래처 배정 정보를 불러오는 중 오류가 발생했습니다.");
      }
      return res.json();
    },
    refetchInterval: 10_000,
  });
}

export interface SaveAssignmentsPayload {
  assignments: Record<string, string | null>;
  /**
   * 관리자가 마감(상장일 13:30) 뒤에 고칠 때 남기는 까닭.
   *
   * 「누가 했나」 는 더 보내지 않는다 — 서버가 세션에서 꺼내 적는다. 화면이 적어
   * 보내면 아무 이름이나 들어올 수 있었다.
   */
  overrideReason?: string;
}

export function useSaveAssignments() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, SaveAssignmentsPayload>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/delivery/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "저장에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-assignments"] });
    },
  });
}
