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
  computeEntityProgress,
  groupPartsByEntity,
  summarizeDirty,
} from "../lib/groupByEntity";
import { DeliveryHeader } from "./DeliveryHeader";
import { DeliveryProgress } from "./DeliveryProgress";
import { DeliveryEntityList } from "./DeliveryEntityList";
import { SaveBar } from "./SaveBar";

const initialPeriod = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
  return { startDate: weekAgo, endDate: today };
};

/**
 * `/delivery` 배송지시 페이지 본문.
 *
 * - 로그인한 딜러의 낙찰 부위를 개체(상장) 단위로 묶어 보여주고 거래처 배정을 편집
 * - dirty 상태 로컬 관리 · 상단 SaveBar 로 일괄 저장 (저장 전 거래처별 요약 노출)
 * - Realtime 배정 변경 시 자동 갱신
 */
export function DeliveryPageContent() {
  const { data: session, status } = useSession();
  const dealerId = session?.dealer?.id ?? session?.employee?.dealerId ?? null;
  const dealerName = session?.dealer?.name ?? session?.employee?.name ?? "중도매인";
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState(initialPeriod);
  const [searchPeriod, setSearchPeriod] = useState(period);
  const [partFilter, setPartFilter] = useState("");
  const [hideDone, setHideDone] = useState(false);

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

  const parts = useMemo(() => partsQuery.data?.winningParts ?? [], [partsQuery.data]);
  const savedAssignments = useMemo<Record<string, AssignmentInfo>>(
    () => assignmentsQuery.data?.assignments ?? {},
    [assignmentsQuery.data],
  );
  const partners = useMemo(() => partnersQuery.data?.partners ?? [], [partnersQuery.data]);

  const partOptions = useMemo(
    () => Array.from(new Set(parts.map((p) => p.partName))).sort((a, b) => a.localeCompare(b, "ko-KR")),
    [parts],
  );

  const progress = useMemo(() => {
    const entities = groupPartsByEntity(parts);
    let entityDone = 0;
    let partSaved = 0;
    let partPending = 0;
    let totalAmount = 0;
    let totalWeight = 0;
    for (const e of entities) {
      const p = computeEntityProgress(e, savedAssignments, dirty);
      if (p.done) entityDone++;
      partSaved += p.saved;
      partPending += p.pending;
      totalAmount += e.totalAmount;
      totalWeight += e.totalWeight;
    }
    return {
      entityTotal: entities.length,
      entityDone,
      partTotal: parts.length,
      partSaved,
      partPending,
      totalAmount,
      totalWeight,
    };
  }, [parts, savedAssignments, dirty]);

  const dirtyCount = Object.keys(dirty).length;
  const dirtySummary = useMemo(
    () =>
      summarizeDirty(dirty, parts, (id) => partners.find((p) => p.id === id)?.name ?? "거래처"),
    [dirty, parts, partners],
  );

  const handleSearch = useCallback(() => {
    setSearchPeriod(period);
  }, [period]);

  const handleChangePartner = useCallback((partId: string, partnerId: string | null) => {
    setDirty((prev) => {
      const next = { ...prev };
      if (partnerId === null) delete next[partId];
      else next[partId] = partnerId;
      return next;
    });
  }, []);

  const handleApplyAll = useCallback((partIds: string[], partnerId: string) => {
    setDirty((prev) => {
      const next = { ...prev };
      for (const id of partIds) next[id] = partnerId;
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setDirty({});
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (dirtyCount === 0) return;
    setSaveError(null);
    try {
      await saveMutation.mutateAsync({ assignments: dirty, assignedBy: dealerName });
      setDirty({});
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    }
  }, [dirty, dirtyCount, saveMutation, dealerName]);

  const handleRefresh = useCallback(() => {
    partsQuery.refetch();
    assignmentsQuery.refetch();
  }, [partsQuery, assignmentsQuery]);

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
        <main className="mx-auto min-h-[calc(100vh-48px)] w-full max-w-[1360px] min-[1700px]:max-w-[1600px] bg-canvas px-8 py-16">
          <div className="h-6 w-32 animate-pulse rounded bg-surface-accent" />
          <div className="mt-6 h-64 animate-pulse rounded bg-surface-accent" />
        </main>
        <MainFooter />
      </>
    );
  }

  if (showGate) {
    return (
      <>
        <MainHeader />
        <main className="min-h-[calc(100vh-48px)] bg-canvas">
          <div className="mx-auto w-full max-w-[1360px] min-[1700px]:max-w-[1600px] px-8 py-12">
            <LoginGateCard pageLabel="배송지시" requireDealer />
          </div>
        </main>
        <MainFooter />
      </>
    );
  }

  const isLoading = partsQuery.isLoading || assignmentsQuery.isLoading || partnersQuery.isLoading;
  const isRefreshing = partsQuery.isFetching || assignmentsQuery.isFetching;

  const fetchError =
    partsQuery.error?.message || assignmentsQuery.error?.message || partnersQuery.error?.message || null;

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-48px)] bg-canvas">
        <DeliveryHeader
          startDate={period.startDate}
          endDate={period.endDate}
          onChangePeriod={setPeriod}
          onSearch={handleSearch}
          partOptions={partOptions}
          partFilter={partFilter}
          onPartFilterChange={setPartFilter}
          hideDone={hideDone}
          onHideDoneChange={setHideDone}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
        <div className="mx-auto w-full max-w-[1360px] min-[1700px]:max-w-[1600px] px-8 py-6">
          <SaveBar
            dirtyCount={dirtyCount}
            summary={dirtySummary}
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

          <DeliveryProgress {...progress} isLoading={isLoading} />

          <div className="mt-5">
            <DeliveryEntityList
              parts={parts}
              partners={partners}
              savedAssignments={savedAssignments}
              dirtyAssignments={dirty}
              partFilter={partFilter}
              hideDone={hideDone}
              isLoading={isLoading}
              onChangePart={handleChangePartner}
              onApplyAll={handleApplyAll}
            />
          </div>
        </div>
      </main>
      <MainFooter />
    </>
  );
}
