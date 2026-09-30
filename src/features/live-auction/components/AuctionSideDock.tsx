"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  History,
  ImageOff,
  Moon,
  Sun,
  Timer,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBidStore } from "@/stores/bidStore";
import type { RoundSchedule } from "@/features/round-schedules/types";
import type { RoundInfo } from "@/features/main/api";
import type { LiveListing } from "../api";
import { useDeadlineTitle } from "../hooks/useDeadlineTitle";
import { useMyBids } from "../hooks/useMyBids";
import { useRoundPeek } from "../hooks/useRoundPeek";
import {
  SIDE_DOCK_WIDE_QUERY,
  useSideDock,
  type SideDockTab,
} from "../hooks/useSideDock";
import { formatGradeLabel } from "../lib/grade";
import { AuctionSchedulePanel } from "./AuctionSchedulePanel";
import { MyBidsDrawer } from "./MyBidsDrawer";
import { useRoundPhase, type RoundPhase } from "./RoundCountdownDial";
import { RoundFloatingCard } from "./RoundFloatingCard";
import { RoundPeekCard } from "./RoundPeekCard";

interface AuctionSideDockProps {
  currentRound: RoundInfo | null;
  lastClosedRound: RoundInfo | null;
  schedules: RoundSchedule[];
  allRounds: RoundInfo[];
  listingDate: string;
  isSchedulesLoading?: boolean;
  dealerId: string | null;
  listings: LiveListing[];
  onNavigateListing: (listingId: string) => void;
}

/**
 * 경매장 오른쪽 사이드 메뉴 · 56px 아이콘 레일 + 304px 패널 (토스증권 우측 메뉴 구성).
 *
 * 헤더까지 화면 높이 전체를 차지하고, 본문 위에 덮지 않는다 — 페이지 오른쪽 여백(`useSideDockInsetClass`)으로
 * 자리를 비워 두고 펼치면 그 여백이 넓어져 표가 그만큼 좁아진다. 패널은 페이지와 같은 바탕에 칸막이 없이 둔다.
 * 패널 내용은 접혀 있어도 계속 마운트해 둔다 · 내 입찰 탭·필터 상태와 마감 임박 탭 제목 알림이 끊기지 않게.
 */
export function AuctionSideDock({
  currentRound,
  lastClosedRound,
  schedules,
  allRounds,
  listingDate,
  isSchedulesLoading,
  dealerId,
  listings,
  onNavigateListing,
}: AuctionSideDockProps) {
  const open = useSideDock((s) => s.open);
  const tab = useSideDock((s) => s.tab);
  const myBidsRoundId = useSideDock((s) => s.myBidsRoundId);
  const toggleTab = useSideDock((s) => s.toggleTab);
  const openTab = useSideDock((s) => s.openTab);
  const setOpen = useSideDock((s) => s.setOpen);
  const applyDefaultOpen = useSideDock((s) => s.applyDefaultOpen);

  // 저장값을 되살린 뒤, 한 번도 직접 고른 적이 없으면 표가 줄어도 넉넉한 넓은 화면만 펼친 채로 시작
  useEffect(() => {
    void Promise.resolve(useSideDock.persist.rehydrate()).then(() => {
      applyDefaultOpen(window.matchMedia(SIDE_DOCK_WIDE_QUERY).matches);
    });
  }, [applyDefaultOpen]);

  /*
   * 회차 상태는 여기서 한 번만 구해 패널·레일·튀어나오는 카드가 나눠 쓴다.
   * 셋이 각자 1초 타이머를 돌리면 같은 순간에도 초가 어긋나 보일 수 있다.
   */
  const phase = useRoundPhase({
    currentRound,
    lastClosedRound,
    schedules,
    allRounds,
    date: listingDate,
  });
  useDeadlineTitle(
    phase.kind === "live",
    phase.tier,
    phase.formatted,
    currentRound?.round_no,
  );

  const { peeking, hideNow } = useRoundPeek(phase, !open);
  const [hovering, setHovering] = useState(false);
  const peekOpen = !open && (peeking || hovering);
  const leaveRail = useCallback(() => {
    setHovering(false);
    hideNow();
  }, [hideNow]);

  return (
    <>
      <aside
        id="auction-side-panel"
        aria-label="경매장 사이드 메뉴"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-14 z-[45] flex w-[304px] flex-col border-l border-line-soft bg-canvas transition-[transform,visibility] duration-200 ease-out",
          open ? "visible translate-x-0" : "invisible translate-x-[360px]",
        )}
      >
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto py-1",
            tab !== "round" && "hidden",
          )}
        >
          <RoundFloatingCard
            phase={phase}
            currentRound={currentRound}
            schedules={schedules}
            allRounds={allRounds}
            date={listingDate}
            isSchedulesLoading={isSchedulesLoading}
          />
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto py-1",
            tab !== "schedule" && "hidden",
          )}
        >
          <AuctionSchedulePanel listingDate={listingDate} />
        </div>

        <div className={cn("min-h-0 flex-1", tab !== "myBids" && "hidden")}>
          <MyBidsDrawer
            embedded
            open
            onClose={() => setOpen(false)}
            dealerId={dealerId}
            listingDate={listingDate}
            allRounds={allRounds}
            initialRoundFilter={myBidsRoundId}
            onNavigateListing={onNavigateListing}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            tab !== "recent" && "hidden",
          )}
        >
          <RecentListingsPanel
            listings={listings}
            onNavigateListing={onNavigateListing}
          />
        </div>
      </aside>

      <nav
        aria-label="사이드 메뉴"
        className={cn(
          "fixed inset-y-0 right-0 z-[46] flex w-14 flex-col items-center gap-1 bg-canvas",
          !open && "border-l border-line-soft",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="auction-side-panel"
          aria-label={open ? "사이드 메뉴 접기" : "사이드 메뉴 펼치기"}
          title={open ? "접기" : "펼치기"}
          className="my-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-faint transition-colors hover:bg-surface-accent hover:text-content"
        >
          {open ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
        <RoundRailItem
          phase={phase}
          active={open && tab === "round"}
          onClick={() => toggleTab("round")}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={leaveRail}
        />
        <RailItem
          icon={CalendarDays}
          label="일정"
          active={open && tab === "schedule"}
          onClick={() => toggleTab("schedule")}
        />
        <MyBidsRailItem
          dealerId={dealerId}
          listingDate={listingDate}
          active={open && tab === "myBids"}
          onClick={() => toggleTab("myBids")}
        />
        <RailItem
          icon={History}
          label="최근 본"
          active={open && tab === "recent"}
          onClick={() => toggleTab("recent")}
        />

        <ThemeRailButton />
      </nav>

      <RoundPeekCard
        phase={phase}
        open={peekOpen}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={leaveRail}
        onClick={() => openTab("round")}
      />
    </>
  );
}

/**
 * 명암 전환 · 레일 맨 아래 · 경매장은 고기 사진 옆에서 색을 재는 화면이라 어두운 바탕을 쓰고 싶어 하는
 * 사람과 밝은 표를 쓰고 싶어 하는 사람이 갈린다. 취향이 아니라 작업 방식의 문제라 토글로 둔다.
 *
 * 상태는 `bidStore.isDarkMode` 한 곳에 있고 `DarkModeSync` 가 next-themes 로 흘려보낸다.
 */
function ThemeRailButton() {
  const isDarkMode = useBidStore((s) => s.isDarkMode);
  const setIsDarkMode = useBidStore((s) => s.setIsDarkMode);
  const label = isDarkMode ? "밝은 화면으로" : "어두운 화면으로";

  return (
    <button
      type="button"
      onClick={() => setIsDarkMode(!isDarkMode)}
      aria-pressed={isDarkMode}
      aria-label={label}
      title={label}
      className="group mb-3 mt-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-faint transition-colors hover:bg-surface-accent hover:text-content"
    >
      {isDarkMode ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
      )}
    </button>
  );
}

/**
 * 오른쪽 여백 · 레일(56)은 늘 비워 두고, 패널이 펴져 있으면 패널(304)만큼 더 비운다.
 * 페이지 껍데기(header + main + footer)에 붙여야 헤더까지 함께 물러난다.
 *
 * 여백만큼 최소 폭도 같이 키운다. 본문에는 가장 넓은 표(부위별 상장표 1259)에
 * 섹션 여백을 더한 1312 를 늘 남겨야 하고, 여백을 여기서 깎으면 표 오른쪽 끝
 * (내 낙찰대금)이 도크 밑으로 밀려 잘린다 — 모자라면 본문을 줄이는 대신
 * 페이지를 가로로 넘긴다. 최소 폭 = 1312 + 여백 (접힘 56 → 1368 · 펼침 360 → 1672).
 */
export function useSideDockInsetClass() {
  const open = useSideDock((s) => s.open);
  return cn(
    "transition-[padding] duration-200 ease-out",
    open ? "min-w-[1672px] pr-[360px]" : "min-w-[1368px] pr-14",
  );
}

interface RailItemProps {
  icon: ComponentType<LucideProps>;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  labelClassName?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/** 레일 한 칸 · 42×58 · 32px 아이콘 상자 + 12px 라벨 */
function RailItem({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  labelClassName,
  onMouseEnter,
  onMouseLeave,
}: RailItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-pressed={active}
      className="group flex h-[58px] w-[42px] flex-col items-center justify-center gap-1"
    >
      <span
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-surface-strong text-content"
            : "text-content-soft group-hover:bg-surface-accent group-hover:text-content",
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none tabular-nums text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "whitespace-nowrap text-[12px] font-medium leading-none tabular-nums",
          active ? "text-content" : "text-content-faint",
          labelClassName,
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** 회차 · 진행 중이면 라벨 자리에 남은 시간 · 접혀 있어도 마감까지 얼마인지 보인다 */
function RoundRailItem({
  phase,
  active,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  phase: RoundPhase;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const isLive = phase.kind === "live";
  return (
    <RailItem
      icon={Timer}
      label={isLive ? phase.formatted : "회차"}
      active={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      labelClassName={cn(
        isLive && "font-semibold",
        isLive && phase.tier === "warning" && "text-orange-500",
        isLive && phase.tier === "critical" && "text-rose-500",
      )}
    />
  );
}

/** 내 입찰 · 아직 마감 전인 입찰 건수를 배지로 */
function MyBidsRailItem({
  dealerId,
  listingDate,
  active,
  onClick,
}: {
  dealerId: string | null;
  listingDate: string;
  active: boolean;
  onClick: () => void;
}) {
  const { data: bids = [] } = useMyBids(dealerId, listingDate);
  const pendingCount = bids.filter((b) => b.rank == null).length;
  return (
    <RailItem
      icon={ClipboardList}
      label="내 입찰"
      active={active}
      onClick={onClick}
      badge={pendingCount}
    />
  );
}

/** 최근 본 개체 · 뷰어로 열었거나 선택한 개체 · 오늘 상장에 남아 있는 것만 */
function RecentListingsPanel({
  listings,
  onNavigateListing,
}: {
  listings: LiveListing[];
  onNavigateListing: (listingId: string) => void;
}) {
  const recent = useSideDock((s) => s.recent);
  const clearRecent = useSideDock((s) => s.clearRecent);

  const rows = useMemo(() => {
    const byId = new Map(listings.map((l) => [l.id, l]));
    return recent.flatMap((r) => {
      const listing = byId.get(r.listingId);
      return listing ? [{ listing, viewedAt: r.viewedAt }] : [];
    });
  }, [recent, listings]);

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <h2 className="text-[15px] font-bold text-content">최근 본 개체</h2>
        {rows.length > 0 ? (
          <button
            type="button"
            onClick={clearRecent}
            className="text-[12px] font-medium text-content-faint transition-colors hover:text-content"
          >
            지우기
          </button>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
          <p className="text-[13px] font-semibold text-content-mid">
            아직 본 개체가 없어요
          </p>
          <p className="text-[12px] text-content-faint">
            상장표에서 개체를 열면 여기에 쌓여요
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-2">
          {rows.map(({ listing, viewedAt }) => (
            <li key={listing.id}>
              <button
                type="button"
                onClick={() => onNavigateListing(listing.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-accent"
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-accent">
                  {listing.images[0] ? (
                    <Image
                      src={listing.images[0]}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <ImageOff className="absolute inset-0 m-auto h-4 w-4 text-content-ghost" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-semibold tabular-nums text-content">
                      {listing.listingNo}
                    </span>
                    <span className="text-[12px] font-medium text-content-soft">
                      {formatGradeLabel(listing.grade, listing.marblingScore)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-content-faint">
                    {listing.companyName}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-content-ghost">
                  {formatDistanceToNowStrict(viewedAt, {
                    locale: ko,
                    addSuffix: true,
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
