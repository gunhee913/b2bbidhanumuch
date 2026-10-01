"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMeasure } from "react-use";
import { cn } from "@/lib/utils";
import { AuctionSideDock } from "./AuctionSideDock";
import { LiveListingSheet } from "./LiveListingSheet";
import { SURFACE_SHELL_CLASS } from "../constants/surface";
import { LoginGateOverlay } from "./LoginGateOverlay";
import { SUMMARY_PANEL_MIN_ROOM } from "./SheetSummaryPanel";
import { useAuctionRoom } from "../hooks/useAuctionRoom";
import { useAuctionFavorites } from "../hooks/useAuctionFavorites";
import { HOUSE_QUERY_KEY, HOUSE_STORAGE_KEY } from "@/features/entry/constants";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import { listingDetailHref } from "../lib/listingHref";
import { clearFromSheet, markFromSheet } from "../lib/detailNavigation";

/** 예전 「상장표(부위별)」 · 「부위별」 뷰 · 지금은 개체/부위 상세가 맡는다 */
const VIEW_QUERY_KEY = "view";

/**
 * 요약을 못 세울 만큼 좁을 때의 본문 폭 · 표 하나만 놓이는 경우라 여기서 끊는다.
 *
 * 요약이 설 만큼 넓어지면 상한을 풀고 바깥 틀(`AUCTION_SHELL_CLASS`, 2120)에 맡긴다.
 * 예전에는 여기서 1660 으로 끊고 남는 폭을 오른쪽에 버렸는데, 2560 화면에서 844px 이
 * 그냥 비었다. 끊는 자리는 한 군데여야 하고, 그 자리는 도크까지 함께 품는 바깥 틀이다.
 */
const ROOM_CONTAINER_CLASS = "max-w-[1360px]";
/** 상장표 섹션 좌우 여백 · 사이드 메뉴를 편 1728 화면에서 표+요약이 들어가는 값 */
const SHEET_PADDING_X = 24;

/**
 * 실시간 경매 · 상장표(개체별) 한 장.
 *
 * 들여다보고 입찰하는 일은 상세 화면 둘이 맡는다 — 개체 하나를 세우는
 * `/auction/live/listing/[listingNo]`, 부위 하나를 세우는 `/auction/live/part/[부위]`.
 * 상장표 행을 누르거나 `?listing=` 딥링크로 들어오면 개체 상세로 보낸다.
 *
 * 공판장 · 중도매인은 소속 공판장에 고정된다("음성은 음성만 입찰").
 *  - 소속이 지정된 중도매인 → 화면·목록·입찰 모두 소속 공판장 기준 · URL 이 다르면 소속으로 바꿔 놓는다
 *  - 소속 미지정(관리자 지정 전) · 비로그인 → `?house=` 기준으로 열람
 *  - 서버(/api/bids · place_bid RPC)에서도 같은 검사를 하므로 UI 는 안내 역할
 */
export function LiveAuctionRoom() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dealerHouse, urlHouse } = useCurrentHouse();
  const {
    house,
    dealerId,
    listingDate,
    listings,
    listingsLoading,
    roundData,
    currentRound,
    scheduleData,
    scheduleLoading,
    loginPromptOpen,
    setLoginPromptOpen,
  } = useAuctionRoom();

  // 소속 공판장이 있는데 URL 이 다른 공판장이면 소속으로 정정 (북마크·타 공판장 링크 진입)
  useEffect(() => {
    if (!dealerHouse || urlHouse?.key === dealerHouse.key) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HOUSE_STORAGE_KEY, dealerHouse.key);
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set(HOUSE_QUERY_KEY, dealerHouse.key);
    router.replace(`/auction/live?${next.toString()}`);
  }, [dealerHouse, urlHouse, searchParams, router]);

  /**
   * 예전 딥링크 `?listing=260722-401&part=03` · 개체 페이지로 넘긴다.
   * 경매내역·북마크에 남은 주소가 깨지지 않게 한다.
   */
  const legacyListingNo = searchParams.get("listing");
  const legacyPart = searchParams.get("part");
  useEffect(() => {
    if (!legacyListingNo) return;
    router.replace(
      listingDetailHref(legacyListingNo, {
        houseKey: searchParams.get(HOUSE_QUERY_KEY),
        part: legacyPart,
      }),
    );
  }, [legacyListingNo, legacyPart, searchParams, router]);

  useEffect(() => {
    clearFromSheet();
  }, []);

  /**
   * 요약 패널을 세울 자리가 있는지 · 사이드 메뉴를 펴면 본문이 그만큼 좁아진다.
   * 섹션이 아니라 본문 전체 폭을 재야 한다 — 섹션 폭은 아래 컨테이너 상한에 걸려 있어
   * 그걸로 판단하면 "좁아서 접음 → 접었으니 좁음" 으로 맞물린다.
   */
  const [roomRef, { width: roomWidth }] = useMeasure<HTMLDivElement>();
  const showSummary = roomWidth - SHEET_PADDING_X * 2 >= SUMMARY_PANEL_MIN_ROOM;
  const sheetGridClass = cn("px-6 py-3", !showSummary && ROOM_CONTAINER_CLASS);

  /**
   * 예전 뷰 주소 정리 · `?view=part` `?view=partSheet` 는 이제 없는 화면이다.
   * 부위별은 부위 상세가 맡지만 어느 부위인지는 주소에 없어 상장표로 떨군다.
   */
  const legacyView = searchParams.get(VIEW_QUERY_KEY);
  useEffect(() => {
    if (!legacyView) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete(VIEW_QUERY_KEY);
    const qs = next.toString();
    router.replace(`/auction/live${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [legacyView, searchParams, router]);

  const [gradeFilter, setGradeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  /*
   * 관심은 딜러 단위로 공유된다 · 로그인 전에는 담을 곳이 없으니 로그인부터 받는다.
   * 이 화면에서 찍는 건 개체(접수번호)뿐이지만, 사이드 메뉴의 부위 목록에서 빼는 것도
   * 같은 손잡이를 탄다 — 그래서 접수번호가 아니라 그냥 `id` 를 받는다.
   */
  const favorites = useAuctionFavorites(listingDate);
  const toggleFavorite = useCallback(
    (id: string) => {
      if (!dealerId) {
        setLoginPromptOpen(true);
        return;
      }
      favorites.toggle(id);
    },
    [dealerId, favorites, setLoginPromptOpen],
  );

  /** 개체 상세로 · 상장표에서 왔다는 표식을 남겨 뒤로가기가 표로 돌아오게 한다 */
  const openListing = useCallback(
    (listingId: string, partNo?: number | null) => {
      const listing = listings.find((l) => l.id === listingId);
      if (!listing) return;
      markFromSheet();
      router.push(
        listingDetailHref(listing.listingNo, {
          houseKey: house?.key ?? null,
          part: partNo != null ? String(partNo).padStart(2, "0") : null,
        }),
      );
    },
    [listings, house, router],
  );

  // 업체 필터 옵션 · 상장 companyName 유니크 집합
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.companyName) set.add(l.companyName);
    });
    return Array.from(set).sort();
  }, [listings]);

  return (
    <div ref={roomRef}>
      <AuctionSideDock
        currentRound={currentRound}
        lastClosedRound={roundData?.lastClosedRound ?? null}
        schedules={scheduleData?.schedules ?? []}
        allRounds={roundData?.allRounds ?? []}
        listingDate={listingDate}
        isSchedulesLoading={scheduleLoading}
        dealerId={dealerId}
        listings={listings}
        roundListingMap={roundData?.roundListingMap ?? {}}
        briefOnEnter
        onNavigateListing={(listingId) => openListing(listingId)}
        favoriteIds={favorites.ids}
        onToggleFavorite={toggleFavorite}
      />

      {/* 상장표 · 필터 · 표 · 요약이 칸막이 없는 한 섹션 */}
      <div className={sheetGridClass}>
        {/* 윗변은 필터 줄이 긋는다 · 화면 위에 멈춰 선 뒤에도 카드가 닫혀 보이려면 그래야 한다 */}
        <section
          className={cn("flex min-w-0 flex-col", SURFACE_SHELL_CLASS, "border-t-0")}
        >
          {/* 개체 = 1행 · 행을 누르면 개체 상세로 */}
          <LiveListingSheet
            listings={listings}
            isLoading={listingsLoading}
            dealerId={dealerId}
            onOpenListing={(id) => openListing(id)}
            gradeFilter={gradeFilter}
            companyFilter={companyFilter}
            onGradeChange={setGradeFilter}
            onCompanyChange={setCompanyFilter}
            companyOptions={companyOptions}
            canShowSummary={showSummary}
            favoriteIds={favorites.ids}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      </div>

      <LoginGateOverlay
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
      />
    </div>
  );
}
