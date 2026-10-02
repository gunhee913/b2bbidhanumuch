"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRealtimeBids } from "@/hooks/useRealtimeBids";
import { useRealtimeAuctions } from "@/hooks/useRealtimeAuctions";
import { useRoundSchedule } from "@/features/round-schedules/hooks/useRoundSchedule";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import { useLiveListings } from "./useLiveListings";
import { useCurrentRound } from "./useCurrentRound";
import { useRoundCloseNotifier } from "./useRoundCloseNotifier";
import { useSheetBidding } from "./useSheetBidding";
import { useSideDock } from "./useSideDock";
import { buildPartResult, buildRoundLookup } from "../lib/partResult";
import type { LiveListing, LivePart } from "../api";

const LIVE_QUERY_KEYS = [
  ["live-auction", "current-round"],
  ["auction", "live-summary"],
  ["live-auction", "listings"],
  ["live-auction", "my-bids"],
] as const;

/**
 * 경매장 공용 상태 · 상장표(`LiveAuctionRoom`)와 상세 화면(`AuctionDetailRoom`)이 함께 쓴다.
 *
 * 실시간 구독 · 회차 자동 마감 · 회차 시작/마감 토스트 · 입찰 가능 판정 · 인라인 입찰 핸들을
 * 한 곳에 둔다. 어느 화면에 있든 회차는 제때 닫히고, 입찰 규칙은 같아야 한다.
 */
export function useAuctionRoom() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const { house, dealerHouse } = useCurrentHouse();

  const isAuthenticated = status === "authenticated" && !!session;
  const dealerId = session?.dealer?.id || session?.employee?.dealerId || null;
  const isDealer = session?.user?.userType === "dealer_user" && !!dealerId;
  const listingDate = format(new Date(), "yyyy-MM-dd");

  const { data: listingsData, isLoading: listingsLoading } = useLiveListings({
    listingDate,
  });
  const { data: roundData } = useCurrentRound(listingDate);
  const { data: scheduleData, isLoading: scheduleLoading } =
    useRoundSchedule(listingDate);

  /** 현재 공판장 상장만 · 공판장을 모르면 전체 */
  const listings = useMemo(() => {
    const all = listingsData?.listings ?? [];
    if (!house) return all;
    return all.filter((l) => l.slaughterHouse === house.name);
  }, [listingsData, house]);

  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const openSideDockTab = useSideDock((state) => state.openTab);

  const invalidateLive = useCallback(() => {
    LIVE_QUERY_KEYS.forEach((queryKey) =>
      queryClient.invalidateQueries({ queryKey: [...queryKey] }),
    );
  }, [queryClient]);

  /**
   * 비공개 입찰 · realtime 은 "변경 신호" 로만 사용.
   * 타 매참인의 입찰 내용은 어떤 형태로도 알림/표시하지 않는다.
   */
  const handleBidChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["live-auction", "listings"] });
    queryClient.invalidateQueries({ queryKey: ["live-auction", "my-bids"] });
  }, [queryClient]);

  useRealtimeBids({ onBidChange: handleBidChange });
  useRealtimeAuctions({ onAuctionChange: invalidateLive });

  const currentRound = roundData?.currentRound ?? null;

  /**
   * 회차 카운트다운 만료 시 자동 마감 트리거.
   * `/api/auctions/{id}/close` 는 `close_round` RPC 로 rank / is_winning 을 세팅한다.
   */
  const closingRoundIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !currentRound?.id ||
      currentRound.status !== "open" ||
      !currentRound.started_at ||
      !currentRound.round_duration_min
    ) {
      return;
    }

    const roundId = currentRound.id;
    const endTimeMs =
      new Date(currentRound.started_at).getTime() +
      currentRound.round_duration_min * 60 * 1000;

    const triggerClose = async () => {
      if (closingRoundIdRef.current === roundId) return;
      closingRoundIdRef.current = roundId;
      try {
        await fetch(`/api/auctions/${roundId}/close`, { method: "POST" });
      } catch (err) {
        console.error("[useAuctionRoom] 자동 마감 실패:", err);
        closingRoundIdRef.current = null;
        return;
      }
      invalidateLive();
    };

    const tick = () => {
      if (Date.now() >= endTimeMs) triggerClose();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    currentRound?.id,
    currentRound?.status,
    currentRound?.started_at,
    currentRound?.round_duration_min,
    invalidateLive,
  ]);

  /**
   * 회차 시작 토스트 · 첫 로드 시 이미 열려 있던 회차에는 알리지 않는다 (데이터 도착 이후의 *전환* 만).
   *
   * 마감은 여기서 알리지 않는다 — `useRoundCloseNotifier` 가 같은 순간에 낙찰 건수와
   * 「내 입찰 보기」 까지 담은 영수증을 띄운다. 둘 다 띄우면 「3회차 마감」 한 줄이 먼저
   * 뜨고 몇 초 뒤 같은 말을 하는 영수증이 그 위에 또 쌓인다.
   */
  const roundSignalRef = useRef<{
    id: string | null;
    status: string | null;
    roundNo: number | null;
  } | null>(null);
  useEffect(() => {
    if (roundData === undefined) return;
    const prev = roundSignalRef.current;
    const next = {
      id: currentRound?.id ?? null,
      status: currentRound?.status ?? null,
      roundNo: currentRound?.round_no ?? null,
    };
    roundSignalRef.current = next;
    if (!prev) return;

    const prevOpen = prev.status === "open";
    const nextOpen = next.status === "open";
    if (nextOpen && (!prevOpen || prev.id !== next.id)) {
      toast(`${next.roundNo}회차 경매 시작`);
    }
  }, [
    roundData,
    currentRound?.id,
    currentRound?.status,
    currentRound?.round_no,
  ]);

  const currentRoundListingIds = useMemo(() => {
    const set = new Set<string>();
    const map = roundData?.roundListingMap ?? {};
    const currentRoundNo = roundData?.currentRound?.round_no ?? null;
    Object.entries(map).forEach(([listingId, roundNos]) => {
      if (currentRoundNo != null && roundNos.includes(currentRoundNo)) {
        set.add(listingId);
      }
    });
    return set;
  }, [roundData]);

  /** 개체 단위 입찰 불가 사유 · 없으면 undefined */
  const getBlockReason = useCallback(
    (listing: LiveListing): string | undefined => {
      if (listing.status === "closed" || listing.status === "completed") {
        return "경매가 마감된 개체입니다.";
      }
      if (dealerHouse && listing.slaughterHouse !== dealerHouse.name) {
        return `소속 공판장(${dealerHouse.fullName}) 상장만 입찰할 수 있습니다.`;
      }
      if (!currentRound || currentRound.status !== "open") {
        return "현재 진행 중인 회차가 없습니다.";
      }
      if (!currentRoundListingIds.has(listing.id)) {
        return "이번 회차에 배정되지 않은 개체입니다.";
      }
      return undefined;
    },
    [currentRound, currentRoundListingIds, dealerHouse],
  );

  /** 회차 배정 정보를 함께 봐야 「유찰 확정」과 「다음 회차 대기」가 갈린다 */
  const roundLookup = useMemo(
    () =>
      buildRoundLookup(
        roundData?.allRounds ?? [],
        roundData?.roundListingMap ?? {},
        (scheduleData?.schedules ?? []).map((s) => s.roundNo),
      ),
    [roundData, scheduleData],
  );

  const getPartResult = useCallback(
    (listing: LiveListing, part: LivePart) =>
      buildPartResult(part, listing, dealerId, roundLookup),
    [dealerId, roundLookup],
  );

  const showMyBids = useCallback(
    () => openSideDockTab("myBids"),
    [openSideDockTab],
  );
  const showMyBidsForRound = useCallback(
    (roundId: string) => openSideDockTab("myBids", { roundId }),
    [openSideDockTab],
  );
  const requestLogin = useCallback(() => setLoginPromptOpen(true), []);

  const sheetBidding = useSheetBidding({
    dealerId: isDealer ? dealerId : null,
    auctionId: currentRound?.status === "open" ? currentRound.id : null,
    getBlockReason,
    onRequestLogin: requestLogin,
    onOpenMyBids: showMyBids,
  });

  useRoundCloseNotifier({
    allRounds: roundData?.allRounds ?? [],
    dealerId: isDealer ? dealerId : null,
    listingDate,
    onOpenMyBids: showMyBidsForRound,
  });

  return {
    house,
    dealerHouse,
    isAuthenticated,
    isDealer,
    dealerId,
    listingDate,
    listings,
    listingsLoading,
    roundData,
    currentRound,
    scheduleData,
    scheduleLoading,
    currentRoundListingIds,
    getBlockReason,
    getPartResult,
    sheetBidding,
    loginPromptOpen,
    setLoginPromptOpen,
    requestLogin,
    showMyBids,
  };
}

export type AuctionRoom = ReturnType<typeof useAuctionRoom>;
