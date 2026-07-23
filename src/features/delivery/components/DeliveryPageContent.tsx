"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format, subDays } from "date-fns";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import { LoginGateCard } from "@/features/main/components/LoginGateCard";
import { useRealtimeDelivery } from "@/hooks/useRealtimeDelivery";
import { useWinningParts } from "../hooks/useWinningParts";
import {
  useDeliveryAssignments,
  useSaveAssignments,
} from "../hooks/useDeliveryAssignments";
import { useDealerPartners } from "../hooks/useDealerPartners";
import type { AssignmentInfo } from "../types";
import {
  DeliveryHeader,
  type DeliveryStatusFilter,
} from "./DeliveryHeader";
import { DeliverySummary } from "./DeliverySummary";
import { DeliveryTable } from "./DeliveryTable";
import { SaveBar } from "./SaveBar";

const initialPeriod = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
  return { startDate: weekAgo, endDate: today };
};

/**
 * `/delivery` 배송지시 페이지 본문.
 *
 * - 로그인한 딜러의 낙찰 부위 조회 + 거래처 배정 편집
 * - dirty 상태 로컬 관리 · 상단 SaveBar 로 일괄 저장
 * - Realtime 배정 변경 시 자동 갱신
 */
export function DeliveryPageContent() {
  const { data: session, status } = useSession();
  const dealerId =
    session?.dealer?.id ?? session?.employee?.dealerId ?? null;
  const dealerName =
    session?.dealer?.name ?? session?.employee?.name ?? "중도매인";
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState(initialPeriod);
  const [searchPeriod, setSearchPeriod] = useState(period);
  const [statusFilter, setStatusFilter] =
    useState<DeliveryStatusFilter>("all");

  const partsQuery = useWinningParts({
    dealerId,
    startDate: searchPeriod.startDate,
    endDate: searchPeriod.endDate,
  });
  const assignmentsQuery = useDeliveryAssignments();
  const partnersQuery = useDealerPartners(dealerId);
  const saveMutation = useSaveAssignments();

  const [dirty, setDirty] = useState<Record<string, string | null>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useRealtimeDelivery({
    onAssignmentChange: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-assignments"] });
    },
    enabled: !!dealerId,
  });

  const parts = useMemo(
    () => partsQuery.data?.winningParts ?? [],
    [partsQuery.data],
  );
  const savedAssignments = useMemo<Record<string, AssignmentInfo>>(
    () => assignmentsQuery.data?.assignments ?? {},
    [assignmentsQuery.data],
  );
  const partners = partnersQuery.data?.partners ?? [];

  const filteredParts = useMemo(() => {
    if (statusFilter === "all") return parts;
    return parts.filter((p) => {
      const assigned = !!savedAssignments[p.partId];
      return statusFilter === "assigned" ? assigned : !assigned;
    });
  }, [parts, savedAssignments, statusFilter]);

  const summary = useMemo(() => {
    let assigned = 0;
    let totalAmount = 0;
    for (const p of parts) {
      if (savedAssignments[p.partId]) assigned++;
      totalAmount += p.bidAmount;
    }
    return {
      totalCount: parts.length,
      assignedCount: assigned,
      unassignedCount: parts.length - assigned,
      totalAmount,
    };
  }, [parts, savedAssignments]);

  const dirtyCount = Object.keys(dirty).length;

  const handleSearch = useCallback(() => {
    setSearchPeriod(period);
  }, [period]);

  const handleChangeStatus = useCallback((next: DeliveryStatusFilter) => {
    setStatusFilter(next);
  }, []);

  const handleChangePartner = useCallback(
    (partId: string, partnerId: string | null) => {
      setDirty((prev) => {
        const next = { ...prev };
        if (partnerId === null) delete next[partId];
        else next[partId] = partnerId;
        return next;
      });
    },
    [],
  );

  const handleReset = useCallback(() => {
    setDirty({});
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (dirtyCount === 0) return;
    setSaveError(null);
    try {
      await saveMutation.mutateAsync({
        assignments: dirty,
        assignedBy: dealerName,
      });
      setDirty({});
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "저장에 실패했습니다.",
      );
    }
  }, [dirty, dirtyCount, saveMutation, dealerName]);

  useEffect(() => {
    setDirty({});
    setSaveError(null);
  }, [dealerId, searchPeriod.startDate, searchPeriod.endDate]);

  const isAuthReady = status !== "loading";
  const showGate = isAuthReady && !dealerId;

  if (!isAuthReady) {
    return (
      <>
        <MainHeader />
        <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1240px] bg-slate-50/40 px-8 py-16">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-6 h-64 animate-pulse rounded bg-slate-100" />
        </main>
        <MainFooter />
      </>
    );
  }

  if (showGate) {
    return (
      <>
        <MainHeader />
        <main className="min-h-[calc(100vh-64px)] bg-slate-50/40">
          <div className="mx-auto w-full max-w-[1240px] px-8 py-12">
            <LoginGateCard pageLabel="배송지시" requireDealer />
          </div>
        </main>
        <MainFooter />
      </>
    );
  }

  const isLoading =
    partsQuery.isLoading ||
    assignmentsQuery.isLoading ||
    partnersQuery.isLoading;

  const fetchError =
    partsQuery.error?.message ||
    assignmentsQuery.error?.message ||
    partnersQuery.error?.message ||
    null;

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-64px)] bg-slate-50/40">
        <DeliveryHeader
          startDate={period.startDate}
          endDate={period.endDate}
          onChangePeriod={setPeriod}
          onSearch={handleSearch}
          statusFilter={statusFilter}
          onChangeStatus={handleChangeStatus}
        />
        <div className="mx-auto w-full max-w-[1240px] px-8 py-6">
          <SaveBar
            dirtyCount={dirtyCount}
            submitting={saveMutation.isPending}
            onSave={handleSave}
            onReset={handleReset}
            error={saveError}
          />

          {fetchError ? (
            <div className="mb-3 border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">
              {fetchError}
            </div>
          ) : null}

          <DeliverySummary
            totalCount={summary.totalCount}
            assignedCount={summary.assignedCount}
            unassignedCount={summary.unassignedCount}
            totalAmount={summary.totalAmount}
            isLoading={isLoading}
          />

          <div className="mt-4">
            <DeliveryTable
              parts={filteredParts}
              partners={partners}
              savedAssignments={savedAssignments}
              dirtyAssignments={dirty}
              onChange={handleChangePartner}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
      <MainFooter />
    </>
  );
}
