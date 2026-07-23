"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { HistoryHeader, type HistoryTab } from "./HistoryHeader";
import { HistoryCalendarPanel } from "./HistoryCalendarPanel";
import { AuctionAnalysisPanel } from "./AuctionAnalysisPanel";
import { PartnerAnalysisPanel } from "./PartnerAnalysisPanel";

function parseTab(value: string | null): HistoryTab {
  if (value === "analysis" || value === "partner") return value;
  return "history";
}

/**
 * `/history` 경매내역 페이지 본문.
 *
 * - 3 탭: `history` (캘린더 + 일자별 이력) · `analysis` (경매 분석) · `partner` (거래처 분석)
 * - URL `?tab=` 로 딥링크 · 탭 변경 시 URL sync
 * - 세션 dealerId 로 훅 활성화 · 미로그인 → 게이트 카드
 * - Realtime bids 로 진행중 데이터 자동 갱신
 */
export function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<HistoryTab>(() =>
    parseTab(searchParams.get("tab")),
  );

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

  useEffect(() => {
    const next = parseTab(searchParams.get("tab"));
    setTab(next);
  }, [searchParams]);

  const handleChangeTab = useCallback(
    (next: HistoryTab) => {
      setTab(next);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", next);
      router.replace(`/history?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const isAuthReady = status !== "loading";
  const showGate = isAuthReady && !dealerId;

  const isLoading = activeLoading || resultsLoading;

  const content = useMemo(() => {
    if (!isAuthReady) {
      return (
        <div className="mx-auto w-full max-w-[1240px] px-8 py-16">
          <div className="h-6 w-32 animate-pulse bg-slate-100" />
          <div className="mt-6 h-64 animate-pulse bg-slate-100" />
        </div>
      );
    }
    if (showGate) {
      return (
        <div className="mx-auto w-full max-w-[1240px] px-8 py-12">
          <LoginGateCard pageLabel="경매내역" />
        </div>
      );
    }

    return (
      <>
        <HistoryHeader activeTab={tab} onChangeTab={handleChangeTab} />
        <div className="mx-auto w-full max-w-[1240px] px-8 py-6">
          {tab === "history" ? (
            <HistoryCalendarPanel
              activeBids={activeBids ?? []}
              results={results ?? []}
              assignments={assignments}
              isLoading={isLoading}
              onChanged={refetchActive}
            />
          ) : tab === "analysis" ? (
            <AuctionAnalysisPanel
              results={results ?? []}
              isLoading={resultsLoading}
            />
          ) : (
            <PartnerAnalysisPanel dealerId={dealerId} />
          )}
        </div>
      </>
    );
  }, [
    isAuthReady,
    showGate,
    tab,
    handleChangeTab,
    activeBids,
    results,
    assignments,
    isLoading,
    resultsLoading,
    refetchActive,
    dealerId,
  ]);

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-64px)] bg-slate-50/40">{content}</main>
      <MainFooter />
    </>
  );
}
