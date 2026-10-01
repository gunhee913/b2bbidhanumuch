"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import Image from "next/image";
import { formatDistanceToNowStrict } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Star,
  History,
  ImageOff,
  Keyboard,
  Moon,
  Pencil,
  Sun,
  Timer,
  Trash2,
  type LucideProps,
} from "lucide-react";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { cn } from "@/lib/utils";
import { useBidStore } from "@/stores/bidStore";
import type { RoundSchedule } from "@/features/round-schedules/types";
import type { RoundInfo } from "@/features/main/api";
import type { LiveListing } from "../api";
import { isTypingInto } from "../lib/keyboard";
import { useDailyBriefing } from "../hooks/useDailyBriefing";
import { useDeadlineTitle } from "../hooks/useDeadlineTitle";
import { useAuctionNotes } from "../hooks/useAuctionNotes";
import { useMyBids } from "../hooks/useMyBids";
import { useRoundPeek } from "../hooks/useRoundPeek";
import { isDeadlineTier } from "../lib/deadline";
import { usePaneResize } from "../hooks/usePaneResize";
import {
  FAV_SECTION_MIN_HEIGHT,
  SIDE_DOCK_WIDE_QUERY,
  useSideDock,
  type SideDockTab,
} from "../hooks/useSideDock";
import { formatGradeLabel } from "../lib/grade";
import { AuctionSchedulePanel } from "./AuctionSchedulePanel";
import { GradeBriefPeekCard } from "./GradeBriefPeekCard";
import { MyBidsPanel } from "./MyBidsPanel";
import { useRoundPhase, type RoundPhase } from "./RoundCountdownDial";
import { RoundFloatingCard } from "./RoundFloatingCard";
import { RoundPeekCard } from "./RoundPeekCard";
import { BID_STEPS } from "../lib/bidKeys";
import { PAGE_SHELL_CLASS } from "../constants/surface";
import { buildShortcutGroups } from "../lib/shortcuts";
import { ShortcutTooltip } from "./ShortcutTooltip";

interface AuctionSideDockProps {
  currentRound: RoundInfo | null;
  lastClosedRound: RoundInfo | null;
  schedules: RoundSchedule[];
  allRounds: RoundInfo[];
  listingDate: string;
  isSchedulesLoading?: boolean;
  dealerId: string | null;
  listings: LiveListing[];
  /** 개체 → 걸린 회차 번호 · 회차별 결과에서 상장 수를 세는 기준 */
  roundListingMap: Record<string, number[]>;
  /** 들어오면 오늘의 상장 카드를 한 번 띄운다 · 상장표 화면에서만 */
  briefOnEnter?: boolean;
  /** `partNo` 를 주면 그 부위를 집어 놓고 연다 · 관심 부위 줄이 쓴다 */
  onNavigateListing: (listingId: string, partNo?: number | null) => void;
  /** 관심으로 찍은 것 · 개체는 접수번호, 부위는 UUID · 상장표·부위 표와 같은 목록을 본다 */
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
}

/**
 * 경매장 오른쪽 사이드 메뉴 · 56px 아이콘 레일 + 304px 패널 (토스증권 우측 메뉴 구성).
 *
 * 헤더까지 화면 높이 전체를 차지하고, 본문 위에 덮지 않는다 — 페이지 오른쪽 여백(`useAuctionShellClass`)으로
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
  roundListingMap,
  briefOnEnter,
  onNavigateListing,
  favoriteIds,
  onToggleFavorite,
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
   * `?` 로 단축키 목록 · 어디서든 통하는 관례라 따로 알려 줄 것이 없는 유일한 키다.
   * 한글 입력기를 켜도 `/` 자리는 그대로라(`RoomPicker` 가 이미 기대고 있다) 글자로 본다.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingInto(document.activeElement)) return;
      e.preventDefault();
      toggleTab("shortcuts");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTab]);

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
  const leaveRail = useCallback(() => {
    setHovering(false);
    hideNow();
  }, [hideNow]);

  const brief = useDailyBrief(briefOnEnter ? listingDate : null, open, openTab);
  /* 두 카드가 같은 레일에서 겹쳐 나오지 않게 · 오늘의 상장이 먼저다 */
  const peekOpen = !open && !brief.open && (peeking || hovering);

  return (
    /*
     * 도크를 담는 틀 · 화면 높이를 다 쓰되 가로로는 본문과 같은 상한(`PAGE_SHELL_CLASS`)에
     * 맞춰 가운데 선다. 안쪽 둘은 화면 끝이 아니라 이 틀의 오른쪽 끝에 붙으므로,
     * 넓은 화면에서도 표 바로 옆에 남는다.
     *
     * 틀 자체는 클릭을 받지 않는다 — 가운데가 뻥 뚫린 투명한 판이라 그대로 두면
     * 본문 전체를 덮어 아무것도 눌리지 않는다. `overflow-hidden` 은 접힌 패널이
     * 밀려나 있는 자리(+360)를 잘라 낸다 — 없으면 펼칠 때 패널이 틀 바깥 여백에서
     * 떠서 날아 들어온다.
     */
    <div
      className={cn(
        "pointer-events-none fixed inset-y-0 left-0 right-0 z-[45] overflow-hidden",
        PAGE_SHELL_CLASS,
      )}
    >
      <aside
        id="auction-side-panel"
        aria-label="경매장 사이드 메뉴"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "pointer-events-auto absolute inset-y-0 right-14 z-0 flex w-[304px] flex-col border-l border-line-soft bg-canvas transition-[transform,visibility] duration-200 ease-out",
          open ? "visible translate-x-0" : "invisible translate-x-[360px]",
        )}
      >
        <OverlayScroll
          autoHideDelay={0}
          className={cn("min-h-0 flex-1 py-1", tab !== "round" && "hidden")}
        >
          <RoundFloatingCard
            phase={phase}
            currentRound={currentRound}
            schedules={schedules}
            allRounds={allRounds}
            date={listingDate}
            isSchedulesLoading={isSchedulesLoading}
            listings={listings}
            roundListingMap={roundListingMap}
          />
        </OverlayScroll>

        <OverlayScroll
          autoHideDelay={0}
          className={cn("min-h-0 flex-1 py-1", tab !== "schedule" && "hidden")}
        >
          <AuctionSchedulePanel listingDate={listingDate} />
        </OverlayScroll>

        <div className={cn("min-h-0 flex-1", tab !== "myBids" && "hidden")}>
          <MyBidsPanel
            onClose={() => setOpen(false)}
            dealerId={dealerId}
            listingDate={listingDate}
            allRounds={allRounds}
            focusRoundId={myBidsRoundId}
            onNavigateListing={onNavigateListing}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            tab !== "favorites" && "hidden",
          )}
        >
          <FavoritesPanel
            listings={listings}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            onNavigateListing={onNavigateListing}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            tab !== "notes" && "hidden",
          )}
        >
          <NotesPanel
            listings={listings}
            listingDate={listingDate}
            onNavigateListing={onNavigateListing}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            tab !== "shortcuts" && "hidden",
          )}
        >
          <ShortcutsPanel />
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
          "pointer-events-auto absolute inset-y-0 right-0 z-10 flex w-14 flex-col items-center gap-1 bg-canvas",
          !open && "border-l border-line-soft",
        )}
      >
        <ShortcutTooltip label={open ? "접기" : "펼치기"} side="left">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="auction-side-panel"
            aria-label={open ? "사이드 메뉴 접기" : "사이드 메뉴 펼치기"}
            className="my-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-faint transition-colors hover:bg-surface-accent hover:text-content"
          >
            {open ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </ShortcutTooltip>
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
          icon={Star}
          label="관심"
          active={open && tab === "favorites"}
          onClick={() => toggleTab("favorites")}
        />
        <RailItem
          icon={Pencil}
          label="메모"
          active={open && tab === "notes"}
          onClick={() => toggleTab("notes")}
        />
        <RailItem
          icon={History}
          label="최근 본"
          active={open && tab === "recent"}
          onClick={() => toggleTab("recent")}
        />

        {/*
         * 아래 두 개는 오늘의 자료가 아니라 내 설정이다 · 사이 선 하나로 갈라 둔다.
         * `mt-auto` 를 이 무리 머리에 걸어야 둘이 함께 바닥에 붙는다 — 테마 버튼에
         * 걸어 두면 그것만 내려가고 단축키는 위 목록 꼬리에 남는다.
         */}
        <div className="mt-auto flex flex-col items-center gap-1 pt-2">
          <span className="mb-1 h-px w-5 bg-line" aria-hidden />
          <RailItem
            icon={Keyboard}
            label="단축키"
            active={open && tab === "shortcuts"}
            onClick={() => toggleTab("shortcuts")}
          />
          <ThemeRailButton />
        </div>
      </nav>

      <RoundPeekCard
        phase={phase}
        open={peekOpen}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={leaveRail}
        onClick={() => openTab("round")}
      />

      <GradeBriefPeekCard
        date={listingDate}
        open={brief.open}
        onClose={brief.close}
      />
    </div>
  );
}

/**
 * 오늘의 상장 브리핑 · 그날 한 번.
 *
 * 사이드 메뉴가 이미 펼쳐져 있으면 카드를 띄우지 않는다 — 레일 옆자리가 곧 패널 자리라
 * 패널 위에 카드가 겹친다. 대신 일정 탭으로 넘겨 주면 같은 표가 패널 안에서 보인다.
 */
function useDailyBrief(
  date: string | null,
  dockOpen: boolean,
  openTab: (tab: SideDockTab) => void,
) {
  const briefedDate = useDailyBriefing((s) => s.briefedDate);
  const markBriefed = useDailyBriefing((s) => s.markBriefed);
  const [hydrated, setHydrated] = useState(false);
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    void Promise.resolve(useDailyBriefing.persist.rehydrate()).then(() =>
      setHydrated(true),
    );
  }, []);

  useEffect(() => {
    if (!hydrated || !date || briefedDate === date) return;
    markBriefed(date);
    if (dockOpen) openTab("schedule");
    else setShowing(true);
    // 브리핑은 들어온 그 순간 한 번만 · 이후 메뉴를 접었다 펴도 다시 뜨지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, date, briefedDate]);

  /* 카드를 띄운 뒤 메뉴를 펼치면 패널과 겹치므로 그때는 카드를 거둔다 */
  const open = showing && !dockOpen;
  const close = useCallback(() => setShowing(false), []);
  return { open, close };
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
      className="group mb-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-faint transition-colors hover:bg-surface-accent hover:text-content"
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
 * 본문은 이 틀 안에서 **왼쪽에 붙어 있다**. 그래서 도크를 여닫으면 본문이 오른쪽에서
 * 줄었다 늘 뿐, 통째로 옆으로 미끄러지지 않는다 — 표를 읽는 중에 가로로 밀리는 것이
 * 폭이 조금 줄어드는 것보다 훨씬 거슬린다.
 *
 * 여백만큼 최소 폭도 같이 키운다. 본문에는 가장 넓은 표(부위별 상장표 1259)에
 * 섹션 여백을 더한 1312 를 늘 남겨야 하고, 여백을 여기서 깎으면 표 오른쪽 끝
 * (내 낙찰대금)이 도크 밑으로 밀려 잘린다 — 모자라면 본문을 줄이는 대신
 * 페이지를 가로로 넘긴다. 최소 폭 = 1312 + 여백 (접힘 56 → 1368 · 펼침 360 → 1672).
 */
export function useAuctionShellClass() {
  const open = useSideDock((s) => s.open);
  return cn(
    PAGE_SHELL_CLASS,
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
  /** 아이콘 상자를 덮어쓴다 · 마감 임박처럼 칸 전체가 말해야 할 때 (`cn` 이 뒤를 이긴다) */
  iconClassName?: string;
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
  iconClassName,
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
          iconClassName,
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

/**
 * 회차 · 진행 중이면 라벨 자리에 남은 시간 · 접혀 있어도 마감까지 얼마인지 보인다.
 *
 * 세는 동안에는 이 칸이 레일에서 제일 또렷해야 한다. 접어 두면 화면에 남는 건 이 42px
 * 뿐이고, 그때 알아야 하는 건 「몇 초 남았나」 하나다. 그런데 평소 라벨색(`content-faint`)을
 * 그대로 쓰고 있어서, 정작 세는 동안이 일정·최근 본과 똑같이 흐렸다.
 *
 * 단계 색은 카드(`CountdownDigits`)가 정한 규칙을 그대로 따른다 — 주의·직전을 시세 빨강
 * 하나로 묶고 그 전까지는 본문색. 여기서만 주황·장미로 갈라 놓았더니 같은 시간을 두 화면이
 * 다른 색으로 말하고 있었다.
 *
 * 마지막 30초에는 글자만으로 부족해 아이콘 상자까지 물들이고 숨을 쉰다. 12px 글자 하나가
 * 색을 바꾸는 것보다 32px 덩어리가 통째로 변하는 편이 곁눈으로 잡힌다.
 */
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
  const urgent = isLive && isDeadlineTier(phase.tier);
  return (
    <RailItem
      icon={Timer}
      label={isLive ? phase.formatted : "회차"}
      active={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      labelClassName={cn(
        isLive && "text-[13px] font-bold",
        isLive && (urgent ? "text-rise" : "text-content"),
      )}
      iconClassName={cn(
        urgent && "bg-rise/10 text-rise",
        isLive && phase.tier === "critical" && "animate-pulse-soft",
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

/**
 * 관심 · 위 칸은 개체, 아래 칸은 부위. 사이 눈금을 끌어 몫을 나눈다.
 *
 * 둘을 한 목록에 섞지 않은 건 고르는 결이 다르기 때문이다. 개체는 「이 소를 볼까」 고,
 * 부위는 「이 등심을 얼마에 넣을까」 다. 섞어 놓으면 접수번호 하나에 부위 여섯이 딸려
 * 붙어 개체가 묻힌다. 나눠 두면 각자 제 순서(접수번호 순)로 줄을 서고, 어느 쪽을 더
 * 보는 날이냐에 따라 눈금만 옮기면 된다.
 *
 * 목록은 딜러 단위로 공유되고 상장일이 바뀌면 그날 것만 남는다. 양쪽 다 오늘 상장에
 * 실제로 있는 것만 걸러 쓴다 — 담아 둔 뒤 상장이 내려가면 열 곳이 없는 줄이 된다.
 */
function FavoritesPanel({
  listings,
  favoriteIds,
  onToggleFavorite,
  onNavigateListing,
}: {
  listings: LiveListing[];
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
  onNavigateListing: (listingId: string, partNo?: number | null) => void;
}) {
  const topHeight = useSideDock((s) => s.favTopHeight);
  const setTopHeight = useSideDock((s) => s.setFavTopHeight);
  const resetTopHeight = useSideDock((s) => s.resetFavTopHeight);
  const splitRef = useRef<HTMLDivElement>(null);

  /* 차례는 찍은 순서가 아니라 접수번호 순이다. 찍은 순서로 두면 같은 개체가 상장표에서는
     위쪽, 여기서는 아래쪽에 있어 두 목록을 번갈아 볼 때 눈이 자꾸 길을 잃는다. */
  const listingRows = useMemo(
    () =>
      listings
        .filter((l) => favoriteIds.has(l.listingNo))
        .sort((a, b) => a.listingNo.localeCompare(b.listingNo)),
    [listings, favoriteIds],
  );

  const partRows = useMemo(
    () =>
      listings
        .flatMap((listing) =>
          listing.parts
            .filter((part) => favoriteIds.has(part.id))
            .map((part) => ({ listing, part })),
        )
        .sort(
          (a, b) =>
            a.listing.listingNo.localeCompare(b.listing.listingNo) ||
            a.part.partNo - b.part.partNo,
        ),
    [listings, favoriteIds],
  );

  /* 끌어 온 px 를 그대로 믿지 않는다 · 아래 칸 몫은 지금 패널 높이를 재야 나온다 */
  const resize = useCallback(
    (px: number) => {
      const total = splitRef.current?.clientHeight ?? 0;
      const ceiling = total
        ? total - FAV_SECTION_MIN_HEIGHT
        : Number.POSITIVE_INFINITY;
      setTopHeight(Math.min(px, ceiling));
    },
    [setTopHeight],
  );

  return (
    <div ref={splitRef} className="flex min-h-0 flex-1 flex-col">
      <section
        /*
         * 창을 줄이면 저장해 둔 px 가 패널보다 커질 수 있다. 그때 아래 칸이 0 이 되지
         * 않게 CSS 가 먼저 막는다 — 다시 늘리면 원래 높이로 돌아온다.
         */
        style={{
          height: topHeight,
          maxHeight: `calc(100% - ${FAV_SECTION_MIN_HEIGHT}px)`,
        }}
        className="flex min-h-0 shrink-0 flex-col"
      >
        <PanelSectionHead label="개체" count={listingRows.length} unit="두" />
        {listingRows.length === 0 ? (
          <PanelEmpty text="상장표 접수번호 옆 별을 누르면 모여요" />
        ) : (
          <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
            <ul className="px-2 pb-1">
              {listingRows.map((listing) => (
                <li key={listing.id}>
                  <FavoriteRow
                    image={listing.images[0] ?? null}
                    title={
                      <>
                        <span className="text-[13px] font-semibold tabular-nums text-content">
                          {listing.listingNo}
                        </span>
                        <span className="text-[12px] font-medium text-content-soft">
                          {formatGradeLabel(
                            listing.grade,
                            listing.marblingScore,
                          )}
                        </span>
                      </>
                    }
                    subtitle={listing.companyName}
                    onOpen={() => onNavigateListing(listing.id)}
                    onRemove={() => onToggleFavorite(listing.listingNo)}
                    removeLabel={`${listing.listingNo} 관심에서 빼기`}
                  />
                </li>
              ))}
            </ul>
          </OverlayScroll>
        )}
      </section>

      <FavoriteSplitHandle
        height={topHeight}
        onResize={resize}
        onReset={resetTopHeight}
      />

      <section className="flex min-h-0 flex-1 flex-col">
        <PanelSectionHead label="부위" count={partRows.length} unit="개" />
        {partRows.length === 0 ? (
          <PanelEmpty text="부위 표 맨 앞 별을 누르면 모여요" />
        ) : (
          <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
            <ul className="px-2 pb-1">
              {partRows.map(({ listing, part }) => (
                <li key={part.id}>
                  <FavoriteRow
                    image={listing.images[0] ?? null}
                    title={
                      <>
                        <span className="truncate text-[13px] font-semibold text-content">
                          {part.partName}
                        </span>
                        <span className="shrink-0 text-[12px] font-medium tabular-nums text-content-soft">
                          {listing.listingNo}
                        </span>
                      </>
                    }
                    subtitle={[
                      formatGradeLabel(listing.grade, listing.marblingScore),
                      part.weight ? `${part.weight.toFixed(1)}kg` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    /* 개체까지만 가지 않고 그 부위를 집어 놓고 연다 */
                    onOpen={() => onNavigateListing(listing.id, part.partNo)}
                    onRemove={() => onToggleFavorite(part.id)}
                    removeLabel={`${listing.listingNo} ${part.partName} 관심에서 빼기`}
                  />
                </li>
              ))}
            </ul>
          </OverlayScroll>
        )}
      </section>
    </div>
  );
}

/**
 * 단축키 목록 · 말풍선과 칸 `title` 에 흩어져 있던 키를 한자리에 모은다.
 *
 * 가운데 띄우는 창이 아니라 옆 판으로 연 건, 이게 표를 보면서 익히는 물건이기
 * 때문이다. 창으로 띄우면 「이 키가 무엇을 움직이는지」 를 보여 줄 바로 그 표를 가린다.
 * 옆 판은 아무것도 덮지 않아서, 목록을 펴 둔 채로 키를 눌러 보며 익힐 수 있다.
 */
function ShortcutsPanel() {
  const bidStep = useBidStore((s) => s.bidStep);
  const groups = useMemo(() => buildShortcutGroups(bidStep), [bidStep]);
  const [editingStep, setEditingStep] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelSectionHead label="단축키" count={0} unit="" />
      <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
        <div className="px-4 pb-3">
          {groups.map((group) => (
            <section key={group.id} className="pb-3 pt-1.5">
              <h3 className="mb-1.5 text-[12px] font-bold text-content">
                {group.title}
              </h3>
              <ul>
                {/* 뜻이 아니라 키로 가른다 · 눈금에 따라 뜻이 「1,000원」 으로 겹친다 */}
                {group.rows.map((row) => (
                  <li key={row.keys.join("+")}>
                    <div className="flex items-center justify-between gap-2 py-[3px]">
                      <span className="flex min-w-0 flex-1 items-center gap-1">
                        <span className="truncate text-[12px] text-content-mid">
                          {row.label}
                        </span>
                        {row.editsStep ? (
                          <button
                            type="button"
                            onClick={() => setEditingStep((v) => !v)}
                            aria-expanded={editingStep}
                            aria-label="올리고 내릴 금액 바꾸기"
                            title="올리고 내릴 금액"
                            className={cn(
                              "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors",
                              editingStep
                                ? "bg-surface-strong text-content"
                                : "text-content-ghost hover:bg-surface-accent hover:text-content",
                            )}
                          >
                            <Pencil className="h-2.5 w-2.5" aria-hidden />
                          </button>
                        ) : null}
                      </span>
                      {/* 키는 오른끝에 세로로 맞춘다 · 훑을 때 눈이 한 줄로 내려간다 */}
                      <span className="flex shrink-0 items-center gap-1">
                        {row.keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded-[4px] bg-surface-strong px-1.5 py-0.5 text-[10.5px] font-medium leading-[14px] text-content-mid"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </div>
                    {row.editsStep && editingStep ? <BidStepPicker /> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </OverlayScroll>
    </div>
  );
}

/**
 * ↑↓ 와 +/- 가 한 번에 움직일 금액 · 연필을 눌러야 펴진다.
 *
 * 늘 펴 두지 않는 건 이게 한 번 정하고 마는 값이기 때문이다. 목록은 키를 찾으러
 * 여는 자리인데, 그 한가운데 늘 눌러야 할 것처럼 생긴 네모 넷이 놓이면 찾는 눈을
 * 매번 붙잡는다. 대신 설정 화면으로 멀리 보내지도 않는다 — 연필은 금액이 적힌 바로
 * 그 글자 옆에 있고, 눌러서 고르면 그 글자가 제자리에서 바뀐다. 고치는 것과 고쳐지는
 * 것이 같은 자리라 무엇을 건드리는 단추인지 따로 설명할 것이 없다.
 *
 * Alt(1원)·Shift(1,000원)는 고를 수 없다 — 사다리 양 끝을 못 박아 둬야 눈금을
 * 어디에 두든 잘게·내 눈금·크게 셋이 손에 남는다(`BID_STEPS`).
 */
function BidStepPicker() {
  const bidStep = useBidStore((s) => s.bidStep);
  const setBidStep = useBidStore((s) => s.setBidStep);

  return (
    <div
      role="radiogroup"
      aria-label="올리고 내릴 금액"
      className="my-1 inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-muted p-0.5"
    >
      {BID_STEPS.map((step) => {
        const active = step === bidStep;
        return (
          <button
            key={step}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setBidStep(step)}
            className={cn(
              "rounded-[5px] px-2 text-[11px] font-semibold leading-6 tabular-nums transition-colors",
              active
                ? "bg-surface text-content shadow-sm ring-1 ring-line"
                : "text-content-soft hover:text-content",
            )}
          >
            {step.toLocaleString("ko-KR")}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 메모 패널 · 오늘 남긴 말을 한자리에 모은다.
 *
 * 관심과 달리 칸을 나누지 않는다. 관심은 개체와 부위가 섞이면 「두 마리」 와 「두 덩이」
 * 가 한 숫자로 세어져 갈라 뒀지만, 메모는 지금 부위에만 붙고 세는 것도 「남긴 말 몇
 * 개」 하나뿐이다. 개체 메모가 생기면 그때 같은 식으로 나누면 된다.
 *
 * 줄에서 굵은 것이 관심과 뒤집혀 있다. 관심 목록은 「무엇을 담았나」 가 물음이라 대상이
 * 굵지만, 메모는 대상이 아니라 적어 둔 말을 보려고 여는 목록이다. 어느 부위 것인지는
 * 그 말을 짚고 나서 확인한다.
 *
 * 오늘 상장에 없는 것은 거른다 — 메모를 남긴 뒤 상장이 내려가면 열 곳이 없는 줄이 된다.
 */
function NotesPanel({
  listings,
  listingDate,
  onNavigateListing,
}: {
  listings: LiveListing[];
  listingDate: string | null;
  onNavigateListing: (listingId: string, partNo?: number | null) => void;
}) {
  const notes = useAuctionNotes(listingDate);

  /* 차례는 관심과 같은 접수번호 순 · 두 목록을 번갈아 볼 때 눈이 길을 잃지 않게 */
  const rows = useMemo(() => {
    const bodyOf = new Map(
      notes.rows
        .filter((n) => n.targetType === "part")
        .map((n) => [n.targetId, n.body]),
    );
    if (bodyOf.size === 0) return [];
    return listings
      .flatMap((listing) =>
        listing.parts
          .filter((part) => bodyOf.has(part.id))
          .map((part) => ({ listing, part, body: bodyOf.get(part.id)! })),
      )
      .sort(
        (a, b) =>
          a.listing.listingNo.localeCompare(b.listing.listingNo) ||
          a.part.partNo - b.part.partNo,
      );
  }, [notes.rows, listings]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelSectionHead label="메모" count={rows.length} unit="개" />
      {rows.length === 0 ? (
        <PanelEmpty text="사진 왼쪽 위 「메모」를 누르면 모여요" />
      ) : (
        <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
          <ul className="px-2 pb-1">
            {rows.map(({ listing, part, body }) => (
              <li key={part.id}>
                <div className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-accent">
                  <button
                    type="button"
                    onClick={() => onNavigateListing(listing.id, part.partNo)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-accent">
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
                      {/* 적어 둔 말이 먼저 · 두 줄까지만 보이고 나머지는 열어서 본다 */}
                      <span className="line-clamp-2 text-[12.5px] leading-[1.45] text-content">
                        {body}
                      </span>
                      <span className="mt-1 flex items-baseline gap-1.5 text-[11.5px] text-content-faint">
                        <span className="min-w-0 truncate font-medium">
                          {part.partName}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {listing.listingNo}
                        </span>
                      </span>
                    </span>
                  </button>
                  {/* 지운 자리에서 바로 뺀다 · 빼러 사진까지 돌아가게 하지 않는다 */}
                  <button
                    type="button"
                    onClick={() => notes.save("part", part.id, "")}
                    aria-label={`${part.partName} ${listing.listingNo} 메모 지우기`}
                    title="메모 지우기"
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-content-ghost transition-colors hover:bg-surface-strong hover:text-lost active:scale-[0.9]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </OverlayScroll>
      )}
    </div>
  );
}

function PanelSectionHead({
  label,
  count,
  unit,
}: {
  label: string;
  count: number;
  unit: string;
}) {
  return (
    <header className="flex shrink-0 items-baseline justify-between gap-2 px-4 pb-1.5 pt-2.5">
      <h2 className="text-[13px] font-bold text-content">{label}</h2>
      {count > 0 ? (
        <span className="text-[12px] font-medium tabular-nums text-content-faint">
          {count}
          {unit}
        </span>
      ) : null}
    </header>
  );
}

/** 빈 칸은 한 줄로만 · 두 칸이 높이를 나눠 쓰는 자리라 안내가 길면 목록보다 커진다 */
function PanelEmpty({ text }: { text: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-5 text-center">
      <p className="text-[12px] text-content-faint">{text}</p>
    </div>
  );
}

/** 관심 목록 한 줄 · 눌러서 개체로 가고, 오른쪽 별로 뺀다 (개체·부위가 같은 껍데기를 쓴다) */
function FavoriteRow({
  image,
  title,
  subtitle,
  onOpen,
  onRemove,
  removeLabel,
}: {
  image: string | null;
  title: ReactNode;
  subtitle: string;
  onOpen: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-accent">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-accent">
          {image ? (
            <Image
              src={image}
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
          <span className="flex items-baseline gap-1.5">{title}</span>
          <span className="mt-0.5 block truncate text-[12px] text-content-faint">
            {subtitle}
          </span>
        </span>
      </button>
      {/* 담은 자리에서 바로 뺀다 · 빼러 표까지 돌아가게 하지 않는다 */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        title="관심에서 빼기"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fav transition-colors hover:bg-surface-strong active:scale-[0.9]"
      >
        <Star className="h-4 w-4 fill-current" aria-hidden />
      </button>
    </div>
  );
}

/**
 * 개체와 부위 사이 눈금 · 방 안 눈금(`RoomStackSplitter`)과 같은 손놀림, 304px 판용.
 *
 * 저 둘과 달리 실선을 함께 둔다. 방에서는 판끼리 테두리가 있어 틈만으로 경계가 읽히지만
 * 여기는 같은 바탕에 목록 두 개가 이어져 있어, 선이 없으면 끌 수 있다는 것 이전에
 * 나뉘어 있다는 것부터 안 보인다.
 */
function FavoriteSplitHandle({
  height,
  onResize,
  onReset,
}: {
  height: number;
  onResize: (px: number) => void;
  onReset: () => void;
}) {
  const { dragging, handlers } = usePaneResize({
    size: height,
    axis: "y",
    direction: 1,
    onResize,
  });

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="개체와 부위 사이 높이"
      title="끌어서 높이 조절 · 두 번 누르면 처음으로"
      {...handlers}
      onDoubleClick={onReset}
      className={cn(
        "group relative mx-3 h-2 shrink-0 cursor-row-resize touch-none select-none",
        // 8px 틈이 그대로 손잡이다 · 잡는 자리만 위아래 3px 씩 넓힌다
        "before:absolute before:-inset-y-[3px] before:inset-x-0 before:content-['']",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-soft"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-[3px] w-9 -translate-x-1/2 -translate-y-1/2 rounded-full",
          "transition-[background-color,opacity] duration-150",
          dragging
            ? "bg-content-soft"
            : "bg-content-ghost opacity-70 group-hover:bg-content-faint group-hover:opacity-100",
        )}
      />
    </div>
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
        <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
          <ul className="px-2">
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
        </OverlayScroll>
      )}
    </>
  );
}
