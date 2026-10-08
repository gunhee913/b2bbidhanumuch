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
} from "@/features/live-auction/constants/surface";
import { useRealtimeDelivery } from "@/hooks/useRealtimeDelivery";
import {
  useDeliveryDockHydration,
  useDeliveryShellClass,
} from "../hooks/useDeliveryDock";
import { useWinningParts } from "../hooks/useWinningParts";
import {
  useDeliveryAssignments,
  useSaveAssignments,
} from "../hooks/useDeliveryAssignments";
import { useDealerPartners } from "../hooks/useDealerPartners";
import type { AssignmentInfo } from "../types";
import { DeliveryPeriodPicker, type Period } from "./DeliveryPeriodPicker";
import { DeliveryRoom } from "./DeliveryRoom";

/*
 * 오늘 하루만 띄운다. 배송지시는 오늘 딴 것을 오늘 보내는 일이라, 지난주까지 끌고
 * 오면 이미 보낸 건이 표를 채워 오늘치를 찾아 내려가야 한다. 지난 것은 「이번주」 를
 * 눌러 보면 된다.
 */
const initialPeriod = (): Period => {
  const today = format(new Date(), "yyyy-MM-dd");
  return { startDate: today, endDate: today };
};

/**
 * `/delivery` 배송지시 페이지.
 *
 * 자료를 모아 `DeliveryRoom` 에 넘기는 일만 한다 — 화면 짜임은 거기 있다.
 * 조회기간은 따로 한 줄을 깔지 않고 표 머리줄 맨 앞에 접어 넣는다 (`DeliveryPeriodPicker`).
 * 본문을 한 화면 높이 안에 가두고 스크롤은 열마다 안에서 돈다.
 */
export function DeliveryPageContent() {
  useDeliveryDockHydration();
  const { data: session, status } = useSession();
  const dealerId = session?.dealer?.id ?? session?.employee?.dealerId ?? null;
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState(initialPeriod);
  const [saveError, setSaveError] = useState<string | null>(null);

  const partsQuery = useWinningParts({
    dealerId,
    startDate: period.startDate,
    endDate: period.endDate,
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
        /* 「누가 했나」 는 보내지 않는다 · 서버가 세션에서 꺼내 적는다 */
        await saveMutation.mutateAsync({ assignments: dirty });
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
        throw e;
      }
    },
    [saveMutation],
  );

  /*
   * 메모 목록에서 다른 날 메모를 눌렀을 때 · 그 하루로 갈아탄다.
   *
   * 기간을 넓히지 않고 **하루로 바꾸는** 건 메모 줄에 적힌 날짜가 곧 가는 곳이기
   * 때문이다. 「10-01」 을 눌렀는데 09-28~10-01 이 되면, 바뀐 화면이 누른 것과
   * 달라 보여 어디로 간 것인지 되짚어야 한다.
   */
  const handleRequestDate = useCallback((date: string) => {
    setPeriod({ startDate: date, endDate: date });
  }, []);

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
      <DeliveryRoom
        periodControl={
          <DeliveryPeriodPicker
            startDate={period.startDate}
            endDate={period.endDate}
            onChange={setPeriod}
          />
        }
        parts={parts}
        partners={partners}
        savedAssignments={savedAssignments}
        isLoading={isLoading}
        saving={saveMutation.isPending}
        saveError={fetchError ?? saveError}
        onSave={handleSave}
        resetKey={`${dealerId}|${period.startDate}|${period.endDate}`}
        onRequestDate={handleRequestDate}
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
 *
 * 창에는 스크롤을 두지 않는다(`h-screen overflow-hidden`). 창이 구르면 머리도 사이드
 * 메뉴도 같이 끌려가 「지금 어느 거래처 줄을 보던 중인가」 를 잡아 줄 것이 화면에서
 * 사라진다 — 구르는 건 표 안쪽뿐이다.
 */
function Shell({ children }: { children: ReactNode }) {
  /* 사이드 메뉴가 펴지면 이 여백이 넓어져 본문이 그만큼 좁아진다 (덮지 않는다) */
  const shellClass = useDeliveryShellClass();

  return (
    <div className={cn("h-screen overflow-hidden", shellClass)}>
      <MainHeader fluid />
      <main
        className={cn(
          "flex h-[calc(100vh-48px)] min-h-0 flex-col gap-2 overflow-hidden",
          PAGE_GUTTER_CLASS,
          CANVAS_BG_CLASS,
        )}
      >
        {children}
      </main>
    </div>
  );
}
