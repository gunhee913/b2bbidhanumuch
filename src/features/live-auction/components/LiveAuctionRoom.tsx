"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLiveListings } from "../hooks/useLiveListings";
import { useCurrentRound } from "../hooks/useCurrentRound";
import { cn } from "@/lib/utils";
import { useRealtimeBids } from "@/hooks/useRealtimeBids";
import { useRealtimeAuctions } from "@/hooks/useRealtimeAuctions";
import { toast } from "sonner";
import { RoundFloatingCard } from "./RoundFloatingCard";
import { useRoundSchedule } from "@/features/round-schedules/hooks/useRoundSchedule";
import {
  MyBidsDrawer,
  MyBidsTrigger,
} from "./MyBidsDrawer";
import { ListingSidebar, type ListingViewMode } from "./ListingSidebar";
import { IndividualPartsCard } from "./IndividualPartsCard";
import { PartSidebar } from "./PartSidebar";
import { PartListingTable } from "./PartListingTable";
import { PartDetailPanel, type DetailTab } from "./PartDetailPanel";
import { PartMarketChart } from "./PartMarketChart";
import { LoginGateOverlay } from "./LoginGateOverlay";
import { BulkBidPanel } from "./BulkBidPanel";
import { useBulkBid } from "../hooks/useBulkBid";
import { groupPartsByName } from "../lib/partGrouping";
import { parseQualityGrade } from "../lib/grade";
import type { LivePart, LiveListing } from "../api";

/** 등급 필터 매칭 · `1++(9)` 는 marbling 매칭, 나머지는 quality 등호 */
function matchesBulkGrade(
  filter: string,
  grade: string | null,
  marblingScore: number | null,
): boolean {
  if (!filter) return true;
  const quality = parseQualityGrade(grade ?? "");
  const marblingMatch = filter.match(/^1\+\+\((\d)\)$/);
  if (marblingMatch) {
    return quality === "1++" && marblingScore === Number(marblingMatch[1]);
  }
  return quality === filter;
}

/** 육량 필터 매칭 · grade 문자열 끝 A/B/C 를 추출해 비교 */
function matchesBulkYield(filter: string, grade: string | null): boolean {
  if (!filter) return true;
  const m = (grade ?? "").match(/[ABC]$/);
  return (m?.[0] ?? "A") === filter;
}

/**
 * 실시간 경매 통합 뷰.
 *
 * Phase 1 통합 이후 공판장 슬러그/권한 게이팅은 제거되었고,
 * 로그인한 매참인은 모든 상장에 대해 입찰 가능하다.
 */
export function LiveAuctionRoom() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const isAuthenticated = status === "authenticated" && !!session;
  const dealerId =
    session?.dealer?.id || session?.employee?.dealerId || null;
  const isDealer =
    session?.user?.userType === "dealer_user" && !!dealerId;

  const stickyTopClass = "top-[80px]";
  const sidebarHeightClass = "h-[calc(100vh-64px-32px)]";
  const detailMaxHeightClass = "max-h-[calc(100vh-80px-16px)]";
  const floatingTopClass = "top-20";

  /**
   * `/history` 등 외부에서 특정 개체를 미리 선택하고 진입할 때 사용.
   * 예: `/auction/live?listing=260722-401`
   */
  const initialListingNo = searchParams.get("listing");
  /** 진입 시 딱 한 번만 파라미터를 소비하도록 하는 가드 (사용자 조작으로 덮이지 않게) */
  const consumedInitialListingNoRef = useRef(false);

  const { data: listingsData, isLoading: listingsLoading } = useLiveListings({
    listingDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: roundData } = useCurrentRound(format(new Date(), "yyyy-MM-dd"));

  const { data: scheduleData, isLoading: scheduleLoading } = useRoundSchedule(
    format(new Date(), "yyyy-MM-dd"),
  );

  const listings = listingsData?.listings ?? [];

  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null,
  );
  // 부위별 뷰 전용 선택 상태
  const [selectedPartGroup, setSelectedPartGroup] = useState<string | null>(
    null,
  );
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [viewMode, setViewMode] = useState<ListingViewMode>("part");
  const [gradeFilter, setGradeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  // 일괄입찰 대상 필터 (등급/육량)
  const [bulkGradeFilter, setBulkGradeFilter] = useState("");
  const [bulkYieldFilter, setBulkYieldFilter] = useState("");
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [myBidsOpen, setMyBidsOpen] = useState(false);
  const [myBidsInitialRound, setMyBidsInitialRound] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (listings.length === 0) return;

    // `?listing=<listing_no>` 지정 시 최초 1회 우선 적용 · 못 찾으면 첫 번째 상장으로 fallback
    if (initialListingNo && !consumedInitialListingNoRef.current) {
      const target = listings.find((l) => l.listingNo === initialListingNo);
      consumedInitialListingNoRef.current = true;
      if (target) {
        setSelectedListingId(target.id);
        setViewMode("individual");
        setSelectedPartId(null);
        setDetailTab("info");
        return;
      }
    }

    if (!selectedListingId) {
      setSelectedListingId(listings[0].id);
    }
  }, [listings, selectedListingId, initialListingNo]);

  // 부위별 뷰: 부위 그룹 계산 + 상태 자동 초기화
  const partGroups = useMemo(() => groupPartsByName(listings), [listings]);

  // 업체 필터 옵션 · 개체별 사이드바와 동일하게 상장 companyName 유니크 집합
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.companyName) set.add(l.companyName);
    });
    return Array.from(set).sort();
  }, [listings]);

  /**
   * 부위별 뷰 · 등급/업체 필터를 적용한 그룹 목록.
   *
   * - 각 그룹의 items 를 개별 필터링 → count 재계산 → 빈 그룹 제거
   * - Sidebar 카운트(경매건수/낙찰건수) · 중앙 `PartListingTable` 이 모두
   *   filteredPartGroups 를 기준으로 렌더링돼 필터 결과가 일관되게 반영됨
   * - gradeFilter/companyFilter 는 개체별 뷰와 공유되는 state 라
   *   뷰 전환 시 자연스럽게 필터가 유지됨
   */
  const filteredPartGroups = useMemo(() => {
    if (!gradeFilter && !companyFilter) return partGroups;
    return partGroups
      .map((g) => {
        const items = g.items.filter(({ listing }) => {
          if (
            gradeFilter &&
            !matchesBulkGrade(gradeFilter, listing.grade, listing.marblingScore)
          ) {
            return false;
          }
          if (companyFilter && listing.companyName !== companyFilter) {
            return false;
          }
          return true;
        });
        return { group: g.group, count: items.length, items };
      })
      .filter((g) => g.count > 0);
  }, [partGroups, gradeFilter, companyFilter]);

  const totalPartCount = useMemo(
    () => filteredPartGroups.reduce((sum, g) => sum + g.count, 0),
    [filteredPartGroups],
  );

  const activePartGroup = useMemo(
    () =>
      filteredPartGroups.find((g) => g.group === selectedPartGroup) ??
      filteredPartGroups[0] ??
      null,
    [filteredPartGroups, selectedPartGroup],
  );

  // 부위 그룹이 정해지면 그 안의 첫 개체 자동 선택
  useEffect(() => {
    if (viewMode !== "part") return;
    if (!activePartGroup) return;

    // 선택된 partId 가 현재 그룹 안에 있으면 유지, 아니면 첫 항목으로
    const exists = activePartGroup.items.some(
      (i) => i.part.id === selectedPartId,
    );
    if (!exists) {
      const first = activePartGroup.items[0];
      if (first) {
        setSelectedPartId(first.part.id);
        setSelectedListingId(first.listing.id);
      }
    }
  }, [viewMode, activePartGroup, selectedPartId]);

  // viewMode 부위별 진입 시 · 필터로 선택 그룹이 사라진 경우 · 첫 그룹으로 자동 이동
  useEffect(() => {
    if (viewMode !== "part") return;
    if (filteredPartGroups.length === 0) return;
    const exists = filteredPartGroups.some((g) => g.group === selectedPartGroup);
    if (!exists) {
      setSelectedPartGroup(filteredPartGroups[0].group);
    }
  }, [viewMode, selectedPartGroup, filteredPartGroups]);

  // 개체별/관심 뷰 · 개체가 바뀌면 첫 부위 자동 선택
  useEffect(() => {
    if (viewMode === "part") return;
    const listing = listings.find((l) => l.id === selectedListingId) ?? null;
    if (!listing) {
      if (selectedPartId !== null) setSelectedPartId(null);
      return;
    }
    const exists = listing.parts.some((p) => p.id === selectedPartId);
    if (!exists) {
      setSelectedPartId(listing.parts[0]?.id ?? null);
    }
  }, [viewMode, listings, selectedListingId, selectedPartId]);

  /**
   * 오픈 최고가 정책 · realtime "역전당함" 감지.
   *
   * 서버가 반환한 topBid/isMine 상태를 기반으로 내가 1위인 partId 집합을 유지하고,
   * realtime bid 이벤트에서 새 최고가 dealer 가 내가 아닐 때 알림을 띄운다.
   * 상세 정보(입찰가 등) 는 refetch 후 반영된다.
   */
  const myTopPartsRef = useRef<Set<string>>(new Set());
  const partNameByIdRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const nextMyTop = new Set<string>();
    const nextNames = new Map<string, string>();
    for (const listing of listings) {
      for (const part of listing.parts) {
        nextNames.set(part.id, `${listing.listingNo} ${part.partName}`);
        if (part.topBid?.isMine) nextMyTop.add(part.id);
      }
    }
    myTopPartsRef.current = nextMyTop;
    partNameByIdRef.current = nextNames;
  }, [listings]);

  const handleBidChange = useCallback(
    (payload?: { partId: string; dealerId: string; isTopBid?: boolean }) => {
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "listings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "my-bids"],
      });

      if (!payload || !dealerId) return;
      if (!payload.isTopBid) return;
      if (payload.dealerId === dealerId) return;
      if (!myTopPartsRef.current.has(payload.partId)) return;

      const label =
        partNameByIdRef.current.get(payload.partId) ?? "선택 부위";
      // 중복 알림 방지 · 같은 partId 는 다음 갱신까지 한 번만 알림
      myTopPartsRef.current.delete(payload.partId);
      toast.error("타 매참인이 최고가를 갱신했습니다", {
        description: `${label} · 1위 자리에서 밀렸습니다. 최고가 확인 후 재입찰해 주세요.`,
        duration: 6000,
      });
    },
    [queryClient, dealerId],
  );

  useRealtimeBids({ onBidChange: handleBidChange });
  useRealtimeAuctions({
    onAuctionChange: () => {
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "current-round"],
      });
      queryClient.invalidateQueries({
        queryKey: ["auction", "live-summary"],
      });
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "listings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "my-bids"],
      });
    },
  });

  /**
   * 회차 카운트다운 만료 시 자동 마감 트리거.
   * `/api/auctions/{id}/close` 는 `close_round` RPC 를 호출해
   * bids.rank / is_winning 을 세팅하고 auction.status='closed' 로 이동시킨다.
   * 클라이언트 사이드 트리거 (기존 mobile / admin 페이지와 동일 패턴).
   */
  const closingRoundIdRef = useRef<string | null>(null);
  const currentRound = roundData?.currentRound ?? null;

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
    const startedAtMs = new Date(currentRound.started_at).getTime();
    const durationMs = currentRound.round_duration_min * 60 * 1000;
    const endTimeMs = startedAtMs + durationMs;

    const triggerClose = async () => {
      if (closingRoundIdRef.current === roundId) return;
      closingRoundIdRef.current = roundId;
      try {
        await fetch(`/api/auctions/${roundId}/close`, { method: "POST" });
      } catch (err) {
        console.error("[LiveAuctionRoom] 자동 마감 실패:", err);
        closingRoundIdRef.current = null;
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "current-round"],
      });
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "listings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "my-bids"],
      });
      queryClient.invalidateQueries({
        queryKey: ["auction", "live-summary"],
      });
    };

    const tick = () => {
      if (Date.now() >= endTimeMs) {
        triggerClose();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    currentRound?.id,
    currentRound?.status,
    currentRound?.started_at,
    currentRound?.round_duration_min,
    queryClient,
  ]);

  const listingDate = format(new Date(), "yyyy-MM-dd");

  const selectedListing = useMemo(
    () => listings.find((l) => l.id === selectedListingId) ?? null,
    [listings, selectedListingId],
  );

  // 부위별 뷰 · 선택된 부위 인스턴스 (개체 안에서 lookup)
  const selectedPart = useMemo(() => {
    if (!selectedListing || !selectedPartId) return null;
    return selectedListing.parts.find((p) => p.id === selectedPartId) ?? null;
  }, [selectedListing, selectedPartId]);

  const handleSelectPartRow = (listingId: string, partId: string) => {
    setSelectedListingId(listingId);
    setSelectedPartId(partId);
    // bulk 탭 유지 · 그 외에는 개체정보 탭으로 유도 (부위별 뷰의 기존 UX)
    if (detailTab !== "bulk") setDetailTab("info");
  };

  const handleBidRequest = (listingId: string, partId: string) => {
    setSelectedListingId(listingId);
    setSelectedPartId(partId);
    setDetailTab("bid");
  };

  // ────────────────────────────────────────────────────────────────
  // 일괄입찰 통합
  // 컨텍스트 · 개체별 = 선택된 listingId · 부위별 = 선택된 partGroup
  // ────────────────────────────────────────────────────────────────
  const bulkContextKey =
    viewMode === "part"
      ? activePartGroup?.group ?? null
      : selectedListingId;

  const bulkBid = useBulkBid(bulkContextKey);

  /** 편집 가능(미체결) 부위 목록 · 뷰별로 다르게 조립 · 필터 적용 전 */
  const bulkRawCandidates = useMemo(() => {
    if (viewMode === "part") {
      if (!activePartGroup) return [] as { listing: LiveListing; part: LivePart }[];
      return activePartGroup.items.filter(
        ({ part }) => !part.allBids.some((b) => b.rank != null),
      );
    }
    if (!selectedListing) return [] as { listing: LiveListing; part: LivePart }[];
    return selectedListing.parts
      .filter((p) => !p.allBids.some((b) => b.rank != null))
      .map((part) => ({ listing: selectedListing, part }));
  }, [viewMode, activePartGroup, selectedListing]);

  /** 등급/육량 필터를 적용한 최종 후보 */
  const bulkCandidates = useMemo(() => {
    if (!bulkGradeFilter && !bulkYieldFilter) return bulkRawCandidates;
    return bulkRawCandidates.filter(({ listing }) => {
      if (
        !matchesBulkGrade(
          bulkGradeFilter,
          listing.grade,
          listing.marblingScore,
        )
      ) {
        return false;
      }
      if (!matchesBulkYield(bulkYieldFilter, listing.grade)) return false;
      return true;
    });
  }, [bulkRawCandidates, bulkGradeFilter, bulkYieldFilter]);

  /** part.id → minPrice · 최저단가 대비 프리셋 계산에 사용 */
  const bulkMinPriceByPart = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const { part } of bulkCandidates) {
      map.set(part.id, part.minPrice ?? null);
    }
    return map;
  }, [bulkCandidates]);

  /** 선택된 부위의 중량/예상금액 집계 */
  const bulkSummary = useMemo(() => {
    let weight = 0;
    let amount = 0;
    for (const { part } of bulkCandidates) {
      if (!bulkBid.selectedPartIds.has(part.id)) continue;
      const w = part.weight ?? 0;
      const p = bulkBid.pricesByPartId.get(part.id) ?? 0;
      weight += w;
      if (p > 0) amount += Math.round(w * p);
    }
    return { weight, amount };
  }, [bulkCandidates, bulkBid.selectedPartIds, bulkBid.pricesByPartId]);

  // 컨텍스트(개체/부위그룹) 이동 시 대상 필터 초기화
  useEffect(() => {
    setBulkGradeFilter("");
    setBulkYieldFilter("");
  }, [bulkContextKey]);

  // bulk 탭 진입 · 컨텍스트 이동 · 필터 변경 시:
  // - 미입찰 후보만 자동 선택 (재입찰은 수동 체크 opt-in)
  // - 이미 내 입찰이 있는 부위는 현재 bidPrice 를 input 폼에 프리필 (참고/재입찰 편의)
  useEffect(() => {
    if (detailTab !== "bulk") return;
    const autoSelectIds: string[] = [];
    const prefillPrices = new Map<string, number>();
    for (const { part } of bulkCandidates) {
      if (!dealerId) {
        autoSelectIds.push(part.id);
        continue;
      }
      const myBid = part.allBids.find((b) => b.dealerId === dealerId);
      if (myBid) {
        prefillPrices.set(part.id, myBid.bidPrice);
      } else {
        autoSelectIds.push(part.id);
      }
    }
    bulkBid.setSelected(autoSelectIds);
    if (prefillPrices.size > 0) bulkBid.initializePrices(prefillPrices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailTab, bulkContextKey, bulkGradeFilter, bulkYieldFilter, bulkCandidates.length, dealerId]);

  const handleBulkApplyPlus = (delta: number) => {
    bulkBid.applyMinPricePlus(delta, bulkMinPriceByPart);
  };

  const handleBulkSubmit = async () => {
    if (!isAuthenticated || !isDealer) {
      setLoginPromptOpen(true);
      return;
    }
    if (!dealerId) return;
    if (bulkBid.readySubmitItems.length === 0) return;
    try {
      const result = await bulkBid.submitAsync({
        dealerId,
        auctionId: currentRound?.id ?? null,
        items: bulkBid.readySubmitItems,
      });
      // 하나라도 성공했다면 개별 입찰 탭으로 자연스럽게 복귀.
      // 실패만 있는 경우엔 사용자가 원인을 확인/재시도할 수 있도록 일괄입찰 탭에 그대로 둔다.
      if (result.successful.length > 0) {
        setDetailTab("bid");
      }
    } catch {
      // 오류 UI 는 BulkBidPanel 의 lastError 를 통해 노출됨.
    }
  };

  const bulkDisabledReason = useMemo(() => {
    if (!isAuthenticated || !isDealer) {
      return "로그인 후 이용해 주세요.";
    }
    if (!currentRound || currentRound.status !== "open") {
      return "현재 진행 중인 회차가 없습니다.";
    }
    if (bulkCandidates.length === 0) {
      return "일괄입찰 가능한 부위가 없습니다.";
    }
    return undefined;
  }, [
    isAuthenticated,
    isDealer,
    currentRound,
    bulkCandidates.length,
  ]);

  const isBulkMode = detailTab === "bulk";

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

  const { canBid, disabledReason } = useMemo(() => {
    const listing = selectedListing;

    if (!listing) return { canBid: false, disabledReason: undefined };

    if (listing.status === "closed" || listing.status === "completed") {
      return { canBid: false, disabledReason: "경매가 마감된 개체입니다." };
    }

    if (!currentRound || currentRound.status !== "open") {
      return {
        canBid: false,
        disabledReason: "현재 진행 중인 회차가 없습니다.",
      };
    }

    if (!currentRoundListingIds.has(listing.id)) {
      return {
        canBid: false,
        disabledReason: "이번 회차에 배정되지 않은 개체입니다.",
      };
    }

    return { canBid: true, disabledReason: undefined };
  }, [selectedListing, currentRound, currentRoundListingIds]);

  return (
    <>
      {/* 오른쪽 사이드 컬럼 · 회차 카드 + 나의 입찰 트리거 stack */}
      <div
        className={cn(
          "pointer-events-none fixed right-8 z-30 flex flex-col gap-3",
          floatingTopClass,
        )}
      >
        <RoundFloatingCard
          currentRound={roundData?.currentRound ?? null}
          lastClosedRound={roundData?.lastClosedRound ?? null}
          schedules={scheduleData?.schedules ?? []}
          allRounds={roundData?.allRounds ?? []}
          date={listingDate}
          isSchedulesLoading={scheduleLoading}
        />
        <MyBidsTrigger
          dealerId={dealerId}
          listingDate={listingDate}
          allRounds={roundData?.allRounds ?? []}
          onOpen={(roundId) => {
            setMyBidsInitialRound(roundId);
            setMyBidsOpen(true);
          }}
        />
      </div>

      <MyBidsDrawer
        open={myBidsOpen}
        onClose={() => setMyBidsOpen(false)}
        dealerId={dealerId}
        listingDate={listingDate}
        allRounds={roundData?.allRounds ?? []}
        initialRoundFilter={myBidsInitialRound}
        onNavigateListing={(listingId) => {
          setViewMode("individual");
          setSelectedListingId(listingId);
          setSelectedPartId(null);
          setDetailTab("bid");
        }}
      />

      {viewMode === "part" ? (
        <div className="mx-auto grid max-w-[1240px] grid-cols-[340px_minmax(0,1fr)_340px] items-start gap-x-3 gap-y-4 px-8 py-4">
          {/* 좌: 부위 사이드 · row-span-2 로 상단 차트/하단 컨텐츠 두 행을 세로 관통 */}
          <div
            className={cn(
              "sticky row-span-2 min-h-[600px]",
              stickyTopClass,
              sidebarHeightClass,
            )}
          >
            <PartSidebar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              groups={filteredPartGroups}
              selectedGroup={activePartGroup?.group ?? null}
              onSelect={setSelectedPartGroup}
              isLoading={listingsLoading}
              totalPartCount={totalPartCount}
              gradeFilter={gradeFilter}
              companyFilter={companyFilter}
              onGradeChange={setGradeFilter}
              onCompanyChange={setCompanyFilter}
              companyOptions={companyOptions}
            />
          </div>

          {/* 상단 (row 1) · 시세 차트가 중+우 컬럼을 가로로 관통 (빗썸 스타일) */}
          <div className="col-span-2">
            <PartMarketChart
              partName={selectedPart?.partName ?? activePartGroup?.group ?? null}
              listing={selectedListing}
            />
          </div>

          {/* 하단 중 (row 2) · 부위 리스트 테이블 */}
          <div>
            <PartListingTable
              group={activePartGroup}
              selectedListingId={selectedListingId}
              selectedPartId={selectedPartId}
              onSelect={handleSelectPartRow}
              onBidRequest={handleBidRequest}
              dealerId={dealerId}
              canReadBids={isAuthenticated && isDealer}
              isLoading={listingsLoading}
              bulkMode={isBulkMode}
              bulkSelected={bulkBid.selectedPartIds}
              bulkPrices={bulkBid.pricesByPartId}
              onBulkToggle={bulkBid.toggleSelect}
              onBulkPriceChange={bulkBid.setPrice}
            />
          </div>

          {/* 하단 우 (row 2) · 컴팩트 상세 (sticky · 내부 스크롤은 PartDetailPanel 이 담당) */}
          <div
            className={cn(
              "sticky overflow-hidden",
              stickyTopClass,
              detailMaxHeightClass,
            )}
          >
            <PartDetailPanel
              listing={selectedListing}
              part={selectedPart}
              allListings={listings}
              dealerId={dealerId}
              isLoggedIn={isAuthenticated && isDealer}
              isAuthorized
              canBid={canBid}
              disabledReason={disabledReason}
              onRequestLogin={() => setLoginPromptOpen(true)}
              onRequestPermission={() => setLoginPromptOpen(true)}
              tab={detailTab}
              onTabChange={setDetailTab}
              hideMarketPanel
              bulkContent={
                <BulkBidPanel
                  selectedCount={bulkBid.selectedPartIds.size}
                  totalCandidates={bulkCandidates.length}
                  totalWeight={bulkSummary.weight}
                  totalAmount={bulkSummary.amount}
                  readyCount={bulkBid.readySubmitItems.length}
                  onApplyPlus={handleBulkApplyPlus}
                  onResetPrices={bulkBid.resetPrices}
                  showFilters
                  gradeFilter={bulkGradeFilter}
                  yieldFilter={bulkYieldFilter}
                  onGradeChange={setBulkGradeFilter}
                  onYieldChange={setBulkYieldFilter}
                  onSubmit={handleBulkSubmit}
                  isSubmitting={bulkBid.isSubmitting}
                  disabled={!!bulkDisabledReason}
                  disabledReason={bulkDisabledReason}
                  lastResult={bulkBid.lastResult}
                  lastError={bulkBid.lastError}
                  onDismissResult={bulkBid.resetResult}
                />
              }
            />
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1240px] grid-cols-[340px_minmax(0,1fr)_340px] items-start gap-x-3 gap-y-6 px-8 py-4">
          {/* 좌: 개체 사이드바 · row-span-2 */}
          <div
            className={cn(
              "sticky row-span-2 min-h-[600px]",
              stickyTopClass,
              sidebarHeightClass,
            )}
          >
            <ListingSidebar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              listings={listings}
              selectedListingId={selectedListingId}
              onSelect={(id) => {
                setSelectedListingId(id);
                setDetailTab("info");
              }}
              currentRoundListingIds={currentRoundListingIds}
              gradeFilter={gradeFilter}
              companyFilter={companyFilter}
              onGradeChange={setGradeFilter}
              onCompanyChange={setCompanyFilter}
              isLoading={listingsLoading}
            />
          </div>

          {/* 상단 (row 1) · 시세 차트가 중+우 컬럼을 가로로 관통 */}
          <div className="col-span-2">
            <PartMarketChart
              partName={selectedPart?.partName ?? selectedListing?.parts[0]?.partName ?? null}
              listing={selectedListing}
            />
          </div>

          {/* 하단 중 (row 2) · 선택 개체의 부위 리스트 · 부위 행 클릭은 입찰하기 탭으로 유도 */}
          <div>
            <IndividualPartsCard
              listing={selectedListing}
              dealerId={dealerId}
              isLoggedIn={isAuthenticated && isDealer}
              isAuthorized
              selectedPartId={selectedPartId}
              onSelectPart={(partId) => {
                setSelectedPartId(partId);
                // bulk 탭 유지 · 그 외에는 입찰하기 탭으로 유도
                if (detailTab !== "bulk") setDetailTab("bid");
              }}
              onBidRequest={(partId) => {
                setSelectedPartId(partId);
                setDetailTab("bid");
              }}
              isLoading={listingsLoading}
              bulkMode={isBulkMode}
              bulkSelected={bulkBid.selectedPartIds}
              bulkPrices={bulkBid.pricesByPartId}
              onBulkToggle={bulkBid.toggleSelect}
              onBulkPriceChange={bulkBid.setPrice}
            />
          </div>

          {/* 하단 우 (row 2) · 컴팩트 상세 (sticky · 내부 스크롤은 PartDetailPanel 이 담당) */}
          <div
            className={cn(
              "sticky overflow-hidden",
              stickyTopClass,
              detailMaxHeightClass,
            )}
          >
            <PartDetailPanel
              listing={selectedListing}
              part={selectedPart}
              allListings={listings}
              dealerId={dealerId}
              isLoggedIn={isAuthenticated && isDealer}
              isAuthorized
              canBid={canBid}
              disabledReason={disabledReason}
              onRequestLogin={() => setLoginPromptOpen(true)}
              onRequestPermission={() => setLoginPromptOpen(true)}
              tab={detailTab}
              onTabChange={setDetailTab}
              hideMarketPanel
              bulkContent={
                <BulkBidPanel
                  selectedCount={bulkBid.selectedPartIds.size}
                  totalCandidates={bulkCandidates.length}
                  totalWeight={bulkSummary.weight}
                  totalAmount={bulkSummary.amount}
                  readyCount={bulkBid.readySubmitItems.length}
                  onApplyPlus={handleBulkApplyPlus}
                  onResetPrices={bulkBid.resetPrices}
                  showFilters={false}
                  gradeFilter={bulkGradeFilter}
                  yieldFilter={bulkYieldFilter}
                  onGradeChange={setBulkGradeFilter}
                  onYieldChange={setBulkYieldFilter}
                  onSubmit={handleBulkSubmit}
                  isSubmitting={bulkBid.isSubmitting}
                  disabled={!!bulkDisabledReason}
                  disabledReason={bulkDisabledReason}
                  lastResult={bulkBid.lastResult}
                  lastError={bulkBid.lastError}
                  onDismissResult={bulkBid.resetResult}
                />
              }
            />
          </div>
        </div>
      )}

      <LoginGateOverlay
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
      />
    </>
  );
}
