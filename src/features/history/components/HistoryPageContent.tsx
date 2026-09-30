"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import { LoginGateCard } from "@/features/main/components/LoginGateCard";
import { useRealtimeBids } from "@/hooks/useRealtimeBids";
import { useRealtimeDelivery } from "@/hooks/useRealtimeDelivery";
import {
  useMyAuctionResults,
  useMyBidsWithStatus,
} from "@/features/bids/hooks";
import { useDeliveryAssignments } from "@/features/delivery/hooks/useDeliveryAssignments";
import { useQueryClient } from "@tanstack/react-query";
import { HistoryCalendarPanel } from "./HistoryCalendarPanel";

const CONTAINER_CLASS =
  "mx-auto w-full max-w-[1360px] min-[1700px]:max-w-[1600px] px-8";

/**
 * `/history` 경매내역 페이지 본문.
 *
 * - 단일 뷰: 캘린더(이 달 KPI) → 선택일 테이블 → 이 달 분석 (탭 없음)
 * - 세션 dealerId 로 훅 활성화 · 미로그인 → 게이트 카드
 * - Realtime bids 로 진행중 데이터 자동 갱신
 */
export function HistoryPageContent() {
  const { data: session, status } = useSession();
  const dealerId =
    session?.dealer?.id ?? session?.employee?.dealerId ?? null;

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

  const renderContent = () => {
    if (!isAuthReady) {
      return (
        <div className={`${CONTAINER_CLASS} py-16`}>
          <div className="h-6 w-32 animate-pulse bg-surface-accent" />
          <div className="mt-6 h-64 animate-pulse bg-surface-accent" />
        </div>
      );
    }
    if (showGate) {
      return (
        <div className={`${CONTAINER_CLASS} py-12`}>
          <LoginGateCard pageLabel="경매내역" />
        </div>
      );
    }
    return (
      <div className={`${CONTAINER_CLASS} py-6`}>
        <HistoryCalendarPanel
          activeBids={activeBids ?? []}
          results={results ?? []}
          assignments={assignments}
          isLoading={isLoading}
          onChanged={refetchActive}
        />
      </div>
    );
  };

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-48px)] bg-canvas">
        {renderContent()}
      </main>
      <MainFooter />
    </>
  );
}
