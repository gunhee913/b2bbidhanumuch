"use client";

import { useCallback, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  CANVAS_BG_CLASS,
  PAGE_GUTTER_CLASS,
} from "@/features/live-auction/constants/surface";
import { MainHeader } from "@/features/main/components/MainHeader";
import { LoginGateCard } from "@/features/main/components/LoginGateCard";
import { useRealtimeBids } from "@/hooks/useRealtimeBids";
import { useRealtimeDelivery } from "@/hooks/useRealtimeDelivery";
import {
  useMyAuctionResults,
  useMyBidsWithStatus,
} from "@/features/bids/hooks";
import { useDeliveryAssignments } from "@/features/delivery/hooks/useDeliveryAssignments";
import { useQueryClient } from "@tanstack/react-query";
import { useHistoryPrefsHydration } from "../hooks/useHistoryPrefs";
import { HistoryCalendarPanel } from "./HistoryCalendarPanel";
import { HistorySideRail, historyShellClass } from "./HistorySideRail";

/**
 * `/history` 경매내역 페이지 본문.
 *
 * - 사이드 레일이 세 화면을 고른다 (`HistorySideRail`) · 경매결과 / 입찰내역 / 상장표
 * - 세션 dealerId 로 훅 활성화 · 미로그인 → 게이트 카드
 * - Realtime bids 로 진행중 데이터 자동 갱신
 */
export function HistoryPageContent() {
  useHistoryPrefsHydration();
  const { data: session, status } = useSession();
  const dealerId = session?.dealer?.id ?? session?.employee?.dealerId ?? null;

  const {
    data: activeBids,
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useMyBidsWithStatus(dealerId);
  const { data: results, isLoading: resultsLoading } =
    useMyAuctionResults(dealerId);
  const { data: assignmentsData } = useDeliveryAssignments();
  const assignments = assignmentsData?.assignments ?? {};

  const queryClient = useQueryClient();

  const handleBidChange = useCallback(() => {
    refetchActive();
  }, [refetchActive]);

  useRealtimeBids({
    onBidChange: handleBidChange,
    enabled: !!dealerId,
  });
  useRealtimeDelivery({
    onAssignmentChange: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-assignments"] });
    },
    enabled: !!dealerId,
  });

  const isAuthReady = status !== "loading";
  const showGate = isAuthReady && !dealerId;
  const isLoading = activeLoading || resultsLoading;

  if (!isAuthReady) {
    return (
      <Shell>
        <div className="h-6 w-32 animate-pulse bg-surface-accent" />
        <div className="mt-2 h-64 animate-pulse bg-surface-accent" />
      </Shell>
    );
  }

  if (showGate) {
    return (
      <Shell>
        <LoginGateCard pageLabel="경매내역" />
      </Shell>
    );
  }

  return (
    <Shell>
      <HistoryCalendarPanel
        activeBids={activeBids ?? []}
        results={results ?? []}
        assignments={assignments}
        isLoading={isLoading}
      />
    </Shell>
  );
}

/**
 * 페이지 껍데기 · 경매장·배송지시와 같은 폭·같은 좌우 여백·같은 캔버스.
 *
 * 예전엔 1360(넓은 화면 1600)에서 멈췄다. 두 화면을 오가는 사람에게 본문이 시작하는
 * 자리가 페이지마다 다르면 매번 눈이 다시 자리를 잡는데, 여기만 안쪽으로 200px 넘게
 * 들어와 있어 경매장에서 넘어오면 화면이 한 번 좁아졌다.
 *
 * **세로도 한 화면에 가둔다**(`lg` 이상). 캘린더에서 날을 고르면 왼쪽 사진과 오른쪽
 * 표가 그 자리에서 바뀌는 짜임이라, 창이 통째로 구르면 날을 고르러 올라갈 때마다
 * 보던 줄을 잃는다. 구르는 건 표 안쪽과 상장표 안쪽뿐이다 (경매장·배송지시와 같다).
 *
 * 그래서 바닥글이 없다 — 가둔 높이에 넣을 자리가 없고, 넣으면 사진판이 그만큼
 * 깎인다. 좁은 화면(`lg` 미만)에서는 두 열이 위아래로 쌓이므로 가두지 않는다.
 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        className={cn("lg:h-screen lg:overflow-hidden", historyShellClass())}
      >
        <MainHeader fluid />
        <main
          className={cn(
            "flex min-h-[calc(100vh-48px)] flex-col gap-2 lg:h-[calc(100vh-48px)] lg:min-h-0 lg:overflow-hidden",
            PAGE_GUTTER_CLASS,
            CANVAS_BG_CLASS,
          )}
        >
          {children}
        </main>
      </div>
      <HistorySideRail />
    </>
  );
}
