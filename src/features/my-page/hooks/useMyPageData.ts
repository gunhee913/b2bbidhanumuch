"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  clearNotifications,
  fetchDealerNotices,
  fetchMyDashboard,
  fetchMyNotifications,
  fetchMyTransactions,
  fetchNoticeDetail,
  fetchNotificationSettings,
  markAllNotificationsRead,
  markNotificationRead,
  patchNotificationSettings,
  type NotificationSettings,
} from "../api";
import { buildBalanceRows, summarizeBalance } from "../lib/balance";

const TODAY = () => format(new Date(), "yyyy-MM-dd");

/**
 * 마이페이지가 보는 사람 · 직원도 소속 중도매인의 것을 본다.
 *
 * 잔고·정산을 직원에게도 연다 — 사무실에서 입금 확인과 낙찰서 출력은 대개 직원 몫이다.
 */
export function useMyDealer() {
  const { data: session, status } = useSession();
  const dealer = session?.dealer ?? null;
  const employee = session?.employee ?? null;
  return {
    status,
    dealer,
    employee,
    dealerId: dealer?.id ?? employee?.dealerId ?? null,
    user: session?.user ?? null,
  };
}

/**
 * 거래내역 전부 · 한 번 받아 잔고 · 최근 거래 · 기간 표가 나눠 쓴다.
 *
 * 기간마다 다시 부르지 않는다. 한 중도매인의 거래는 많아야 수천 줄이고, 잔고는 어차피
 * 처음부터 끝까지 더해야 나오는 값이라 전부 받는 편이 단순하다.
 */
export function useMyTransactions(dealerId: string | null) {
  const query = useQuery({
    queryKey: ["my-transactions", dealerId],
    queryFn: () => fetchMyTransactions(dealerId!),
    enabled: !!dealerId,
    staleTime: 30_000,
  });
  const txs = query.data;
  const rows = useMemo(() => buildBalanceRows(txs ?? []), [txs]);
  const summary = useMemo(() => summarizeBalance(txs ?? [], TODAY()), [txs]);
  return { ...query, rows, summary };
}

export function useMyDashboard(
  dealerId: string | null,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ["my-dashboard", dealerId, startDate, endDate],
    queryFn: () => fetchMyDashboard(dealerId!, startDate, endDate),
    enabled: !!dealerId,
    staleTime: 60_000,
  });
}

const NOTIFICATION_SETTINGS_KEY = ["notification-settings"] as const;

const DEFAULT_SETTINGS: NotificationSettings = {
  listingUpload: true,
  auctionStart: true,
  auctionResult: true,
  balance: true,
};

/** 알림 설정 · 토글은 먼저 바꾸고 뒤에서 보낸다 (저장 단추 없음) */
export function useNotificationSettings(enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: NOTIFICATION_SETTINGS_KEY,
    queryFn: fetchNotificationSettings,
    enabled,
  });

  const mutation = useMutation({
    mutationFn: patchNotificationSettings,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_SETTINGS_KEY });
      const prev = queryClient.getQueryData<NotificationSettings>(
        NOTIFICATION_SETTINGS_KEY,
      );
      queryClient.setQueryData<NotificationSettings>(
        NOTIFICATION_SETTINGS_KEY,
        { ...(prev ?? DEFAULT_SETTINGS), ...patch },
      );
      return { prev };
    },
    onError: (_err, _patch, context) => {
      if (context?.prev)
        queryClient.setQueryData(NOTIFICATION_SETTINGS_KEY, context.prev);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_SETTINGS_KEY }),
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    toggle: (key: keyof NotificationSettings) =>
      mutation.mutate({ [key]: !(query.data ?? DEFAULT_SETTINGS)[key] }),
    saving: mutation.isPending,
  };
}

const NOTIFICATIONS_KEY = ["my-notifications"] as const;

export function useMyNotifications(enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchMyNotifications,
    enabled,
    staleTime: 15_000,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    /* 머리 종 배지도 같은 표를 본다 */
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-count"] });
  };

  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: refresh,
  });
  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: refresh,
  });
  const clear = useMutation({
    mutationFn: clearNotifications,
    onSuccess: refresh,
  });

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    read: (id: string) => read.mutate(id),
    readAll: () => readAll.mutate(),
    clear: () => clear.mutate(),
  };
}

export function useDealerNotices(limit = 5) {
  return useQuery({
    queryKey: ["dealer-notices", limit],
    queryFn: () => fetchDealerNotices(limit),
    staleTime: 5 * 60_000,
  });
}

export function useNoticeDetail(id: string | null) {
  return useQuery({
    /* 모바일 `/notice/[id]` 와 같은 열쇠 · 한쪽에서 읽어 둔 것을 다른 쪽이 바로 쓴다 */
    queryKey: ["notice-detail", id],
    queryFn: () => fetchNoticeDetail(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}
