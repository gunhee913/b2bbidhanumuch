"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MainHeader } from "@/features/main/components/MainHeader";
import { LoginGateCard } from "@/features/main/components/LoginGateCard";
import {
  CANVAS_BG_CLASS,
  PAGE_GUTTER_CLASS,
  PAGE_SHELL_CLASS,
  SURFACE_SHELL_CLASS,
} from "@/features/live-auction/constants/surface";
import { useRealtimeDelivery } from "@/hooks/useRealtimeDelivery";
import { useWinningParts } from "../hooks/useWinningParts";
import {
  useDeliveryAssignments,
  useSaveAssignments,
} from "../hooks/useDeliveryAssignments";
import { useDealerPartners } from "../hooks/useDealerPartners";
import type { AssignmentInfo } from "../types";
import { DeliveryHeader } from "./DeliveryHeader";
import { DeliveryRoom } from "./DeliveryRoom";

/*
 * 오늘 하루만 띄운다. 배송지시는 오늘 딴 것을 오늘 보내는 일이라, 지난주까지 끌고
 * 오면 이미 보낸 건이 표를 채워 오늘치를 찾아 내려가야 한다. 지난 것은 「이번주」 를
 * 눌러 보면 된다.
 */
const initialPeriod = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  return { startDate: today, endDate: today };
};

/**
 * `/delivery` 배송지시 페이지.
 *
 * 자료를 모아 `DeliveryRoom` 에 넘기는 일만 한다 — 화면 짜임은 거기 있다.
 * 머리(기간·새로고침)와 본문을 한 화면 높이 안에 가두고 스크롤은 열마다 안에서 돈다.
 */
export function DeliveryPageContent() {
  const { data: session, status } = useSession();
  const dealerId = session?.dealer?.id ?? session?.employee?.dealerId ?? null;
  const dealerName =
    session?.dealer?.name ?? session?.employee?.name ?? "중도매인";
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState(initialPeriod);
  const [searchPeriod, setSearchPeriod] = useState(period);
  const [saveError, setSaveError] = useState<string | null>(null);

  const partsQuery = useWinningParts({
    dealerId,
    startDate: searchPeriod.startDate,
    endDate: searchPeriod.endDate,
  });
  const assignmentsQuery = useDeliveryAssignments();
  const partnersQuery = useDealerPartners(dealerId);
  const saveMutation = useSaveAssignments();

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
  const partners = useMemo(
    () => partnersQuery.data?.partners ?? [],
    [partnersQuery.data],
  );

  const handleSave = useCallback(
    async (dirty: Record<string, string | null>) => {
      setSaveError(null);
      try {
        await saveMutation.mutateAsync({
          assignments: dirty,
          assignedBy: dealerName,
        });
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
        throw e;
      }
    },
    [saveMutation, dealerName],
  );

  const handleRefresh = useCallback(() => {
    partsQuery.refetch();
    assignmentsQuery.refetch();
  }, [partsQuery, assignmentsQuery]);

  const isAuthReady = status !== "loading";

  if (!isAuthReady) {
    return (
      <Shell>
        <div className="h-6 w-32 animate-pulse bg-surface-accent" />
        <div className="mt-3 h-64 animate-pulse bg-surface-accent" />
      </Shell>
    );
  }

  if (!dealerId) {
    return (
      <Shell>
        <LoginGateCard pageLabel="배송지시" requireDealer />
      </Shell>
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
    <Shell>
      {/* 머리는 제 카드 · 본문 두 판은 각자 카드로 서서 8px 틈을 눈금이 쓴다 */}
      <div className={cn("shrink-0", SURFACE_SHELL_CLASS)}>
        <DeliveryHeader
          startDate={period.startDate}
          endDate={period.endDate}
          onChangePeriod={setPeriod}
          onSearch={() => setSearchPeriod(period)}
          isRefreshing={partsQuery.isFetching || assignmentsQuery.isFetching}
          onRefresh={handleRefresh}
        />
      </div>
      <DeliveryRoom
        parts={parts}
        partners={partners}
        savedAssignments={savedAssignments}
        isLoading={isLoading}
        saving={saveMutation.isPending}
        saveError={fetchError ?? saveError}
        onSave={handleSave}
        resetKey={`${dealerId}|${searchPeriod.startDate}|${searchPeriod.endDate}`}
      />
    </Shell>
  );
}

/**
 * 페이지 껍데기 · 경매장과 같은 폭·같은 좌우 여백(`px-6`)·같은 캔버스.
 *
 * 다만 세로는 다르다. 경매장은 아래로 흐르는 읽는 화면이라 `min-h` 로 두고 바닥글을
 * 달지만, 여기는 저장 바가 늘 같은 자리에 있어야 하는 작업 화면이라 `h-` 로 못 박고
 * 스크롤은 열 안에서만 돈다. 바닥글도 없다 — 창을 조금만 줄여도 저장 바를 밀어낸다.
 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className={PAGE_SHELL_CLASS}>
      <MainHeader fluid />
      <main
        className={cn(
          "flex h-[calc(100vh-48px)] min-h-0 flex-col gap-2",
          PAGE_GUTTER_CLASS,
          CANVAS_BG_CLASS,
        )}
      >
        {children}
      </main>
    </div>
  );
}
