"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocalStorage, useMeasure } from "react-use";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  Maximize2,
  Minimize2,
  Square,
  SquareCheckBig,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing } from "../api";
import { useAuctionRoom } from "../hooks/useAuctionRoom";
import { useSideDock } from "../hooks/useSideDock";
import {
  useRoomLayout,
  useRoomLayoutHydration,
  CHART_DEFAULT_HEIGHT,
  CHART_MAX_HEIGHT,
  CHART_MIN_HEIGHT,
  TABLE_MAX_WIDTH,
  TABLE_MIN_WIDTH,
  type PaneOrder,
  type RoomColumn,
} from "../hooks/useRoomLayout";
import { usePaneReorder } from "../hooks/usePaneReorder";
import { SURFACE_SHELL_CLASS } from "../constants/surface";
import { formatGradeLabel } from "../lib/grade";
import {
  extractSide,
  groupPartsByName,
  toPartGroupName,
  type PartGroupEntry,
} from "../lib/partGrouping";
import { isPartSettled, summarizeParts } from "../lib/sheetSummary";
import { formatKrw } from "../lib/masking";
import {
  listingDetailHref,
  liveRoomHref,
  partDetailHref,
} from "../lib/listingHref";
import { cameFromSheet, clearFromSheet } from "../lib/detailNavigation";
import {
  BID_ENTER_HINT,
  focusBidInput,
  focusFirstBidInput,
  isSheetBidNav,
} from "../lib/bidKeys";
import { isTypingInto } from "../lib/keyboard";
import type { SheetBidEntry } from "../hooks/useSheetBidding";
import { AuctionSideDock } from "./AuctionSideDock";
import { LoginGateOverlay } from "./LoginGateOverlay";
import { PaneGripHandle } from "./PaneGripHandle";
import { PartMarketChart } from "./PartMarketChart";
import { RoomPicker } from "./RoomPicker";
import { RoomSplitter } from "./RoomSplitter";
import { RoomStackSplitter } from "./RoomStackSplitter";
import { ShortcutTooltip } from "./ShortcutTooltip";
import { ViewerMediaPane } from "./ListingViewerDialog";
import { formatDate, formatTraceNo } from "./ListingSpecSheet";
import { buildTraceHref } from "./ListingInfoSection";
import {
  LISTING_ROW_AXIS,
  PART_ROW_AXIS,
  SheetBatchFooter,
  SheetBatchSubtotal,
  SheetPartGrid,
} from "./SheetParts";

/**
 * 시세 카드에서 캔버스를 뺀 나머지 높이 (머리글 · 기간 탭 · 시세 히어로 · 시간축).
 * 차트를 키울 때 1열 높이에서 이만큼 빼야 캔버스가 넘치지 않는다.
 */
const CHART_CARD_CHROME = 175;

/** 1열과 2열 사이 틈 · 이 자리를 눈금(`RoomSplitter`)이 그대로 쓴다 */
const SPLITTER_WIDTH = 8;

/** 사진과 시세 사이 틈 · 이 자리를 눈금(`RoomStackSplitter`)이 그대로 쓴다 */
const STACK_SPLITTER_HEIGHT = 8;

/** 1열 최소 폭 · 사진이 이보다 좁아지면 볼 값어치가 없다 */
const PHOTO_COLUMN_MIN_WIDTH = 460;

/** 사진 판 최소 높이 · 시세를 키울 때 이만큼은 남긴다 */
const PHOTO_MIN_HEIGHT = 240;

/**
 * 사진 판 바탕 · 밝기와 무관하게 어두운 무채색으로 고정한다.
 *
 * 어두워야 하는 이유는 취향이 아니다 — 바탕에 색기가 돌면 붉은 살색과 마블링 흰색이
 * 실제와 다르게 읽히고, 낙찰가를 그 색으로 판단한다. 흰 판 위에서는 단면 사진이
 * 배경과 붙어 경계가 사라진다.
 *
 * 다만 예전 `#0f0f12` 는 다크모드 canvas 와 같은 값이라, 다른 판이 모두 바닥보다
 * 떠 있는데 이 판만 바닥에 뚫린 구멍처럼 보였다. 한 단계 올려 판으로 읽히게 둔다.
 */
const PHOTO_STAGE_CLASS = "bg-[#1a1a1f]";

/**
 * 고정축 이동 화살표 · picker 바로 옆에 붙어 "이걸 옆으로 옮긴다" 를 말한다.
 *
 * 그림 위에 얹으면 관습상 "다음 장" 으로 읽혀, 두 번째 사진을 보려다 개체를 벗어난다.
 * 바꾸는 대상 바로 옆에 두면 그 오해가 생길 자리가 없다.
 */
function StepArrow({
  side,
  noun,
  disabled,
  onClick,
  hint,
}: {
  side: "prev" | "next";
  /** 무엇을 옮기는가 · 개체축이면 "개체", 부위축이면 "부위" */
  noun: string;
  disabled: boolean;
  onClick: () => void;
  /** 넘어갈 대상 이름 · 누르기 전에 어디로 가는지 보여 준다 */
  hint: string | null;
}) {
  const Icon = side === "prev" ? ChevronLeft : ChevronRight;
  const label = `${side === "prev" ? "이전" : "다음"} ${noun}`;
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-[3px] transition-colors",
        disabled
          ? "cursor-default text-content-ghost"
          : "text-content-soft hover:bg-surface-strong hover:text-content",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
    </button>
  );
  if (disabled) return button;

  return (
    <ShortcutTooltip
      label={label}
      shortcut={side === "prev" ? "←" : "→"}
      title={hint}
    >
      {button}
    </ShortcutTooltip>
  );
}

/**
 * 접수번호에 올리면 키보드로도 넘길 수 있다고 알려 준다.
 *
 * ←/→ 로 한 번이라도 넘겨 본 사람에게는 더 띄우지 않는다(`show`) — 이미 아는 걸
 * 매번 덮으면 친절이 아니라 접수번호를 가리는 소음이다. 버튼 말풍선의 키 표시는 남는다.
 * 지나가던 마우스에 튀지 않게 버튼보다 늦게 뜬다.
 */
function ArrowNavHint({
  show,
  noun,
  children,
}: {
  show: boolean;
  noun: string;
  children: ReactNode;
}) {
  if (!show) return <>{children}</>;
  return (
    <ShortcutTooltip
      label={`${noun} 이동`}
      shortcut="← →"
      title={`${BID_ENTER_HINT} · / 검색`}
      delayDuration={500}
    >
      <div className="flex items-center">{children}</div>
    </ShortcutTooltip>
  );
}

/**
 * 마감분 감추기 · 회차가 도는 동안 손댈 수 있는 행만 남긴다.
 *
 * 네모칸은 꺼져 있을 때도 그린다. 켜야 아이콘이 생기면 끈 상태에서는 그냥 글자라
 * 누를 수 있는 것인지조차 안 보인다 — 빈 네모가 「켤 수 있다」 를 말한다.
 *
 * 마감된 게 하나도 없으면 아예 그리지 않는다. 눌러도 아무 일이 없는 버튼을 두면
 * 다음에 정말 필요할 때도 믿지 않게 된다. 켠 뒤에는 몇 개를 감췄는지 그대로 적어
 * 「숫자가 왜 줄었지」 를 되묻지 않게 한다.
 */
function HideSettledToggle({
  on,
  count,
  onToggle,
}: {
  on: boolean;
  /** 감췄거나 감출 수 있는 마감 행 수 */
  count: number;
  onToggle: () => void;
}) {
  if (count === 0 && !on) return null;
  const Box = on ? SquareCheckBig : Square;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-semibold transition-colors",
        on
          ? "bg-surface-strong text-content"
          : "text-content-soft hover:bg-surface-accent hover:text-content",
      )}
    >
      <Box
        className={cn("h-3.5 w-3.5", !on && "text-content-faint")}
        strokeWidth={2.2}
        aria-hidden
      />
      낙찰분 숨김
      <span className="tabular-nums text-content-faint">{count}</span>
    </button>
  );
}

/** 접수번호(+좌/우) 한 줄 · 부위축 스테퍼가 가리키는 개체를 적는다 */
function stepperIdentity(entry: SheetBidEntry | null): string | null {
  if (!entry) return null;
  const side = extractSide(entry.part.partName);
  return side ? `${entry.listing.listingNo} ${side}` : entry.listing.listingNo;
}

/**
 * 크게 보기 토글 · 사진과 시세 카드가 각자 제 우측 위에 하나씩 단다.
 *
 * 켠 판만 남고 다른 판은 자리를 비우므로, 남은 판의 버튼이 곧 되돌리기 버튼이 된다.
 * `tone` 은 얹히는 바탕 · 사진은 먹색 위, 시세는 카드 위라 같은 회색을 쓸 수 없다.
 */
function FocusButton({
  on,
  label,
  tone,
  onToggle,
}: {
  on: boolean;
  label: string;
  tone: "dark" | "card";
  onToggle: () => void;
}) {
  const Icon = on ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? `${label} 크게 보기 끄기` : `${label} 크게 보기`}
      title={on ? "원래 크기로" : `${label}에 높이를 몰아준다`}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] transition-colors",
        tone === "dark"
          ? "bg-white/10 text-white/70 backdrop-blur-md hover:bg-white/20 hover:text-white"
          : on
            ? "bg-surface text-content ring-1 ring-line"
            : "text-content-soft hover:bg-surface-strong hover:text-content",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
    </button>
  );
}

/**
 * 받은 차례대로 두 판을 늘어놓고 사이에 눈금을 끼운다 · 세로 쌓기와 가로 열이 같이 쓴다.
 *
 * 판을 그리는 일은 부르는 쪽에 남긴다 — 순서마다 JSX 를 한 벌씩 써 두면 한쪽만 고치는
 * 실수가 나고, `key` 를 쥔 같은 판이 자리만 바뀌어야 리액트가 상태를 이어 받는다.
 */
function orderPanes<P extends string>(
  order: PaneOrder<P>,
  panes: Record<P, ReactNode>,
  splitter: ReactNode,
): ReactNode[] {
  return [panes[order[0]], splitter, panes[order[1]]];
}

/** 열 트랙도 같은 차례를 따른다 · 표는 잡아 둔 px, 1열은 남는 폭 전부 */
function gridColumns(order: PaneOrder<RoomColumn>, tableWidth: number): string {
  const track = (col: RoomColumn) =>
    col === "table"
      ? `${tableWidth}px`
      : `minmax(${PHOTO_COLUMN_MIN_WIDTH}px,1fr)`;
  return `${track(order[0])} ${SPLITTER_WIDTH}px ${track(order[1])}`;
}

/** 무엇을 세우고 볼 것인가 · 개체 한 마리 또는 부위 하나 */
export type RoomAxis =
  { kind: "listing"; listingNo: string } | { kind: "part"; group: string };

/**
 * 경매장 상세 · 한 축을 세우고 나머지를 표로 훑으며 입찰한다.
 *
 *   ┌ 헤더 · [개체별|부위별] · 선택기 · 등급판정 18개 ─────────────┐
 *   │ 사진(크게)       │ 표 · 입력칸 · 결과 · 일괄 입찰 바          │
 *   │ 시세 차트        │                                            │
 *   └────────────────────────────────────────────────────────────┘
 *
 * 두 축이 같은 껍데기를 쓴다 — 바뀌는 것은 무엇이 고정이고 무엇이 행인가뿐이다.
 *
 *  - 개체축: 개체 하나를 세운다 · 행 = 그 개체의 부위 20개
 *  - 부위축: 부위 하나를 세운다 · 행 = 그 부위를 가진 개체들
 *
 * 어느 축이든 헤더의 등급판정·왼쪽 사진은 「지금 고른 행의 개체」를 가리킨다.
 * 세 곳이 늘 같은 개체를 말해야 표를 훑는 동안 눈이 헷갈리지 않는다.
 *
 *  - 화면 높이에 맞춰 잠근 격자 · 페이지는 스크롤하지 않고 열이 저마다 안에서 흘린다
 *  - 표가 곧 주문창이다 · 따로 주문 패널을 두면 같은 값이 두 벌이 되고 표만 좁아진다
 *  - 위아래는 표 안(행), 좌우(←/→)는 표 바깥 · 고정축을 옆으로 옮긴다
 *  - 축을 바꿔도 보던 대상은 유지된다 (등심 보다 개체별로 가면 그 개체의 등심이 열린다)
 */
export function AuctionDetailRoom({ axis }: { axis: RoomAxis }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    house,
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
    getBlockReason,
    getPartResult,
    sheetBidding,
    loginPromptOpen,
    setLoginPromptOpen,
  } = useAuctionRoom();

  const houseKey = house?.key ?? null;
  const partGroups = useMemo(() => groupPartsByName(listings), [listings]);

  /* ── 고정축 ─────────────────────────────────────────── */

  const axisListing =
    axis.kind === "listing"
      ? (listings.find((l) => l.listingNo === axis.listingNo) ?? null)
      : null;
  const axisGroup =
    axis.kind === "part"
      ? (partGroups.find((g) => g.group === axis.group) ?? null)
      : null;

  const hideSettled = useRoomLayout((state) => state.hideSettled);
  const toggleHideSettled = useRoomLayout((state) => state.toggleHideSettled);

  /** 표의 행 · 개체축이면 부위들, 부위축이면 개체들 */
  const allRows = useMemo<SheetBidEntry[]>(() => {
    if (axis.kind === "listing") {
      if (!axisListing) return [];
      return [...axisListing.parts]
        .sort((a, b) => a.partNo - b.partNo)
        .map((part) => ({ listing: axisListing, part }));
    }
    return (axisGroup?.items ?? []).map(({ listing, part }) => ({
      listing,
      part,
    }));
  }, [axis.kind, axisListing, axisGroup]);

  /*
   * 표·바닥글·←/→ 이동이 모두 이 목록을 쓴다. 감춘 행으로는 넘어가지지 않아야
   * 「눌렀는데 아무 일도 안 일어난다」 가 생기지 않는다. 합계는 감추기 전 목록으로
   * 낸다 — 열넷 중 몇이 내 것인지는 감췄다고 달라지지 않는다.
   */
  const rows = useMemo(
    () =>
      hideSettled
        ? allRows.filter(({ part }) => !isPartSettled(part))
        : allRows,
    [allRows, hideSettled],
  );

  /* ── 고른 행 ─────────────────────────────────────────── */

  /**
   * 고른 행 · id 가 이 축에 없으면(축을 옮긴 직후) 힌트 → 첫 미마감 행 순으로 내려앉는다.
   * `group` 은 개체를 넘겨도 보던 부위를 잇기 위한 기억이다.
   */
  const [pick, setPick] = useState<{ id: string | null; group: string | null }>(
    { id: null, group: null },
  );
  const partParam = searchParams.get("part");
  const listingParam = searchParams.get("listing");

  const selected = useMemo<SheetBidEntry | null>(() => {
    if (rows.length === 0) return null;
    const byId = rows.find((r) => r.part.id === pick.id);
    if (byId) return byId;

    if (axis.kind === "listing") {
      if (!pick.id && partParam) {
        const byParam = rows.find(
          (r) =>
            r.part.listingPartNo === partParam ||
            String(r.part.partNo).padStart(2, "0") ===
              partParam.padStart(2, "0"),
        );
        if (byParam) return byParam;
      }
      const byGroup = pick.group
        ? rows.find((r) => toPartGroupName(r.part.partName) === pick.group)
        : null;
      if (byGroup) return byGroup;
    } else if (!pick.id && listingParam) {
      const byListing = rows.find((r) => r.listing.listingNo === listingParam);
      if (byListing) return byListing;
    }

    return rows.find((r) => !isPartSettled(r.part)) ?? rows[0] ?? null;
  }, [rows, pick, axis.kind, partParam, listingParam]);

  const selectRow = useCallback((entry: SheetBidEntry) => {
    setPick({
      id: entry.part.id,
      group: toPartGroupName(entry.part.partName),
    });
  }, []);

  /** 헤더의 등급판정 · 왼쪽 사진이 가리키는 개체 */
  const focusListing = selected?.listing ?? axisListing;

  /* ── 이전/다음 고정축 ─────────────────────────────────── */

  const goToListing = useCallback(
    (target: LiveListing | undefined) => {
      if (!target) return;
      router.replace(listingDetailHref(target.listingNo, { houseKey }), {
        scroll: false,
      });
    },
    [router, houseKey],
  );

  const goToGroup = useCallback(
    (target: PartGroupEntry | undefined) => {
      if (!target) return;
      router.replace(partDetailHref(target.group, { houseKey }), {
        scroll: false,
      });
    },
    [router, houseKey],
  );

  const listingIdx = listings.findIndex((l) => l.id === axisListing?.id);
  const groupIdx = partGroups.findIndex((g) => g.group === axisGroup?.group);

  /*
   * 좌우는 표 바깥, 위아래는 표 안. 예전엔 두 축 모두 ←/→ 가 「옆 개체」였는데,
   * 부위축은 행이 이미 개체라 ↑/↓ 와 하는 일이 같았다 — 키 넷이 한 가지 일만 했다.
   * 고정축(헤더 picker 가 가리키는 것)을 옮기게 하면 두 축 다 겹치지 않는다.
   */
  const pivotIdx = axis.kind === "listing" ? listingIdx : groupIdx;
  const pivotLast =
    (axis.kind === "listing" ? listings.length : partGroups.length) - 1;
  const canPrev = pivotIdx > 0;
  const canNext = pivotIdx >= 0 && pivotIdx < pivotLast;

  const goPrev = useCallback(() => {
    if (axis.kind === "listing") goToListing(listings[listingIdx - 1]);
    else goToGroup(partGroups[groupIdx - 1]);
  }, [
    axis.kind,
    goToListing,
    goToGroup,
    listings,
    listingIdx,
    partGroups,
    groupIdx,
  ]);

  const goNext = useCallback(() => {
    if (axis.kind === "listing") goToListing(listings[listingIdx + 1]);
    else goToGroup(partGroups[groupIdx + 1]);
  }, [
    axis.kind,
    goToListing,
    goToGroup,
    listings,
    listingIdx,
    partGroups,
    groupIdx,
  ]);

  const [arrowNavLearned, setArrowNavLearned] = useLocalStorage(
    "live-auction-arrow-nav-learned",
    false,
  );
  /** ←/→ 를 입찰칸 안에서 눌렀나 · 다음 개체에서 칸을 다시 잡을지 정한다 */
  const refocusBid = useRef(false);

  /* ── 축 전환 · 보던 대상을 들고 넘어간다 ──────────────── */

  const switchAxis = useCallback(
    (next: RoomAxis["kind"]) => {
      if (next === axis.kind || !selected) return;
      if (next === "part") {
        router.push(
          partDetailHref(toPartGroupName(selected.part.partName), {
            houseKey,
            listingNo: selected.listing.listingNo,
          }),
        );
        return;
      }
      router.push(
        listingDetailHref(selected.listing.listingNo, {
          houseKey,
          part: String(selected.part.partNo).padStart(2, "0"),
        }),
      );
    },
    [axis.kind, selected, router, houseKey],
  );

  // ←/→ 개체 이동 · ↓ 첫 입찰칸 · 입력칸 안에서는 글자 커서라 막는다 · Alt 를 쥐면 어디서든
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      // 눈금을 잡고 있으면 방향키는 너비 조절이다 (`RoomSplitter` 가 직접 받는다)
      if (el instanceof HTMLElement && el.getAttribute("role") === "separator")
        return;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);

      /*
       * 보기 축 전환 · 글을 쓰는 중이 아니면 어디서든 (고르기 중인 입찰칸 포함).
       *
       * 글자가 아니라 자판 자리(`code`)로 받는다. 한글 입력기가 켜져 있으면 B 자리를
       * 눌러도 `key` 는 `ㅠ` 라 글자로만 보면 영문일 때만 먹는다 — `/` 는 입력기가
       * 건드리지 않아 멀쩡했고 이것만 안 되던 이유가 여기 있었다.
       */
      if (e.code === "KeyB" || e.key === "b" || e.key === "B") {
        if (isTypingInto(el) || e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        switchAxis(axis.kind === "listing" ? "part" : "listing");
        return;
      }

      /*
       * ←/→ 로 개체를 훑다가 ↓ 를 누르면 그대로 입찰에 들어간다 — 개체를 고르고
       * 마우스로 칸을 찾아 누르던 두 손 동작을 한 손으로 잇는다.
       * 칸 안에서의 ↓ 는 다음 칸 이동이라 `handleBidKeyDown` 이 이미 맡고 있다.
       */
      if (e.key === "ArrowDown") {
        if (typing) return;
        if (focusFirstBidInput()) e.preventDefault();
        return;
      }

      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      /*
       * 고르기 중인 입찰칸에서는 ←/→ 가 고정축 이동이다. 쓰는 중이면 글자 커서라
       * 여기까지 오지도 않는다(`handleSheetBidKeyDown` 이 막는다).
       * 고정축을 옮기면 표가 통째로 갈리므로 새 표에서 같은 자리를 다시 잡아 준다 —
       * 안 그러면 한 번 옮기고 포커스를 잃어 다음부터는 마우스를 잡아야 한다.
       */
      const inBidCell = isSheetBidNav(el);
      if (typing && !e.altKey && !inBidCell) return;
      e.preventDefault();
      if (inBidCell) refocusBid.current = true;
      if (e.key === "ArrowLeft") goPrev();
      else goNext();
      if (!arrowNavLearned) setArrowNavLearned(true);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    goPrev,
    goNext,
    arrowNavLearned,
    setArrowNavLearned,
    switchAxis,
    axis.kind,
  ]);

  /* 고정축이 바뀐 뒤 · 고른 행의 입찰칸으로 · 마감돼 칸이 없으면 첫 칸으로 */
  const selectedPartId = selected?.part.id;
  useEffect(() => {
    if (!refocusBid.current) return;
    refocusBid.current = false;
    if (selectedPartId && focusBidInput(selectedPartId)) return;
    focusFirstBidInput();
  }, [selectedPartId]);

  /* ── 주변 장치 ───────────────────────────────────────── */

  useEffect(() => {
    clearFromSheet();
  }, []);

  const goBackToSheet = () => {
    if (cameFromSheet()) {
      clearFromSheet();
      router.back();
      return;
    }
    router.push(liveRoomHref(houseKey));
  };

  const pushRecent = useSideDock((state) => state.pushRecent);
  const axisListingId = axisListing?.id;
  const axisListingNo = axisListing?.listingNo;
  useEffect(() => {
    // 개체축에서만 쌓는다 · 부위축은 행을 훑을 때마다 개체가 바뀌어 최근 목록이 금세 더럽혀진다
    if (!axisListingId || !axisListingNo) return;
    pushRecent({ listingId: axisListingId, listingNo: axisListingNo });
  }, [axisListingId, axisListingNo, pushRecent]);

  const focus = useRoomLayout((state) => state.focus);
  const toggleFocus = useRoomLayout((state) => state.toggleFocus);
  const storedTableWidth = useRoomLayout((state) => state.tableWidth);
  const setTableWidth = useRoomLayout((state) => state.setTableWidth);
  const nudgeTableWidth = useRoomLayout((state) => state.nudgeTableWidth);
  const resetTableWidth = useRoomLayout((state) => state.resetTableWidth);
  const storedChartHeight = useRoomLayout((state) => state.chartHeight);
  const setChartHeight = useRoomLayout((state) => state.setChartHeight);
  const nudgeChartHeight = useRoomLayout((state) => state.nudgeChartHeight);
  const resetChartHeight = useRoomLayout((state) => state.resetChartHeight);
  const stackOrder = useRoomLayout((state) => state.stackOrder);
  const columnOrder = useRoomLayout((state) => state.columnOrder);
  const swapStackOrder = useRoomLayout((state) => state.swapStackOrder);
  const swapColumnOrder = useRoomLayout((state) => state.swapColumnOrder);
  useRoomLayoutHydration();

  /* 1열 안에서 위아래로 · 그리고 두 열끼리 좌우로 · 같은 손놀림을 축만 바꿔 쓴다 */
  const stack = usePaneReorder({
    axis: "y",
    order: stackOrder,
    gap: STACK_SPLITTER_HEIGHT,
    onSwap: swapStackOrder,
  });
  const column = usePaneReorder({
    axis: "x",
    order: columnOrder,
    gap: SPLITTER_WIDTH,
    onSwap: swapColumnOrder,
  });
  const tableOnLeft = columnOrder[0] === "table";

  /**
   * 저장된 너비를 지금 화면에 맞춰 깎는다.
   *
   * 사이드 도크를 펴면 방이 360px 좁아진다 — 넓은 화면에서 잡아 둔 눈금을 그대로 쓰면
   * 1열이 제 최소 폭에 걸려 그리드가 넘친다. 저장값은 건드리지 않고 표시할 때만 줄여,
   * 도크를 접으면 원래 잡아 둔 자리로 돌아온다.
   */
  const [gridRef, { width: gridWidth }] = useMeasure<HTMLDivElement>();
  const maxTableWidth =
    gridWidth > 0
      ? Math.max(
          TABLE_MIN_WIDTH,
          Math.floor(gridWidth) - PHOTO_COLUMN_MIN_WIDTH - SPLITTER_WIDTH,
        )
      : TABLE_MAX_WIDTH;
  const tableWidth = Math.min(storedTableWidth, maxTableWidth);

  /**
   * 시세 캔버스 높이 · 너비와 같은 이유로 저장값을 지금 화면에 맞춰 깎는다.
   *
   * 크게 보기를 켠 동안에는 1열을 통째로 쓰므로 잡아 둔 높이를 무시한다 — 그 값은
   * 그대로 남겨 두어 크게 보기를 끄면 눈금이 원래 자리로 돌아온다.
   */
  const [colRef, { height: colHeight }] = useMeasure<HTMLDivElement>();
  /* 1열은 높이를 재는 쪽과 자리를 옮기는 쪽이 같은 노드를 봐야 한다 */
  const registerStackColumn = column.registerPane("stack");
  const stackColumnRef = useCallback(
    (el: HTMLDivElement | null) => {
      colRef(el);
      registerStackColumn(el);
    },
    [colRef, registerStackColumn],
  );
  const maxChartHeight =
    colHeight > 0
      ? Math.max(
          CHART_MIN_HEIGHT,
          Math.min(
            CHART_MAX_HEIGHT,
            Math.round(colHeight) -
              CHART_CARD_CHROME -
              PHOTO_MIN_HEIGHT -
              STACK_SPLITTER_HEIGHT,
          ),
        )
      : CHART_MAX_HEIGHT;
  const chartHeight =
    focus === "chart"
      ? Math.max(CHART_DEFAULT_HEIGHT, Math.round(colHeight) - CHART_CARD_CHROME)
      : Math.min(storedChartHeight, maxChartHeight);

  const [mediaIdx, setMediaIdx] = useState(0);
  const focusListingId = focusListing?.id;
  useEffect(() => {
    setMediaIdx(0);
  }, [focusListingId]);

  const sideDock = (
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
      onNavigateListing={(id) => goToListing(listings.find((l) => l.id === id))}
    />
  );

  /* ── 집계 · 입찰 가능 ─────────────────────────────────── */

  const summary = useMemo(
    () =>
      summarizeParts(
        allRows.map((r) => r.part),
        dealerId,
      ),
    [allRows, dealerId],
  );
  /** 표에 걸친 개체 수 · 부위축에서 좌/우가 한 마리로 합쳐진다 */
  const headCount = useMemo(
    () => new Set(rows.map((r) => r.listing.id)).size,
    [rows],
  );
  const allHeadCount = useMemo(
    () => new Set(allRows.map((r) => r.listing.id)).size,
    [allRows],
  );
  const blockReasons = useMemo(
    () => rows.map((r) => getBlockReason(r.listing)),
    [rows, getBlockReason],
  );
  const allBlocked = rows.length > 0 && blockReasons.every(Boolean);
  const allSettled =
    summary.total > 0 && summary.settledCount === summary.total;

  const missing = axis.kind === "listing" ? !axisListing : !axisGroup;
  if (missing || allRows.length === 0 || !focusListing) {
    return (
      <>
        {sideDock}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-[14px] font-semibold text-content-mid">
            {listingsLoading
              ? "상장 정보를 불러오는 중입니다."
              : axis.kind === "listing"
                ? `오늘 상장에서 ${axis.listingNo} 개체를 찾을 수 없습니다.`
                : `오늘 상장에 ${axis.group} 부위가 없습니다.`}
          </p>
          {listingsLoading ? null : (
            <button
              type="button"
              onClick={goBackToSheet}
              className="h-9 bg-inverse px-4 text-[13px] font-bold text-inverse-content"
            >
              상장표로 돌아가기
            </button>
          )}
        </div>
      </>
    );
  }

  const chartReferencePrice =
    selected?.part.minPrice != null
      ? { value: selected.part.minPrice, label: "최저단가" }
      : null;

  /**
   * 1열 · 사진 + 시세 · 키운 쪽이 높이를 독차지하고 다른 쪽은 자리를 비운다.
   *
   * 틈을 `gap` 이 아니라 눈금이 만든다 — `gap-2` 를 둔 채 사이에 눈금을 끼우면 틈이
   * 둘이 되어 8px 이 24px 로 벌어진다. 자리를 끄는 동안에는 `translate` 가 스크롤
   * 영역을 늘려 막대가 깜빡이므로 잠시 넘침을 잘라 둔다.
   */
  const stackColumn = (
    <div
      key="stack"
      ref={stackColumnRef}
      style={column.paneStyle("stack")}
      className={cn(
        "scrollbar-thin scrollbar-gutter-auto flex min-h-0 min-w-0 flex-col",
        stack.dragging ? "overflow-hidden" : "overflow-y-auto",
        column.dragging === "stack" && "relative z-30",
        column.dragging &&
          column.dragging !== "stack" &&
          "transition-transform duration-200",
      )}
    >
      {orderPanes(
        stackOrder,
        {
          /* 그림 위에는 아무것도 얹지 않는다 · 개체 이동은 헤더 스테퍼, 장 전환은 썸네일 레일 */
          photo:
            focus === "chart" ? null : (
              <section
                key="photo"
                ref={stack.registerPane("photo")}
                aria-label="사진"
                style={stack.paneStyle("photo")}
                className={cn(
                  "relative flex min-h-[240px] flex-1 flex-col border border-line pt-3",
                  PHOTO_STAGE_CLASS,
                  // 들어 올린 판 · 어두운 화면에서는 그림자가 묻혀 테두리를 같이 준다
                  stack.dragging === "photo" &&
                    "z-30 shadow-2xl ring-1 ring-content-soft",
                  /*
                   * 전환은 끄는 동안에만 건다. 자리가 바뀌는 순간에도 켜져 있으면
                   * 판이 놓인 칸과 `translate` 가 같은 프레임에 뒤집히는 바람에,
                   * 이미 눈앞에 있는 판이 한 번 솟았다 내려온다.
                   */
                  stack.dragging &&
                    stack.dragging !== "photo" &&
                    "transition-transform duration-200",
                )}
              >
                <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
                  {focus === "none" ? (
                    <PaneGripHandle
                      label="사진"
                      axis="y"
                      tone="dark"
                      dragging={stack.dragging === "photo"}
                      {...stack.handleProps("photo")}
                    />
                  ) : null}
                  <FocusButton
                    on={focus === "photo"}
                    label="사진"
                    tone="dark"
                    onToggle={() => toggleFocus("photo")}
                  />
                </div>
                <ViewerMediaPane
                  key={focusListing.id}
                  listing={focusListing}
                  mediaIdx={mediaIdx}
                  onMediaIdxChange={setMediaIdx}
                  className="px-3 pb-3"
                />
              </section>
            ),
          /* 차트는 캔버스 높이가 고정이라 눌리면 잘린다 · 모자라면 열이 흐른다 */
          chart:
            focus === "photo" ? null : (
              <div
                key="chart"
                ref={stack.registerPane("chart")}
                style={stack.paneStyle("chart")}
                className={cn(
                  focus === "chart" ? "min-h-0 flex-1" : "shrink-0",
                  stack.dragging === "chart" &&
                    "relative z-30 shadow-2xl ring-1 ring-content-soft",
                  stack.dragging &&
                    stack.dragging !== "chart" &&
                    "transition-transform duration-200",
                )}
              >
                <PartMarketChart
                  partName={selected?.part.partName ?? null}
                  listing={focusListing}
                  referencePrice={chartReferencePrice}
                  height={chartHeight}
                  headerAction={
                    /* 손잡이와 확대는 한 벌로 읽혀야 한다 · 기간 탭과는 더 떨어뜨린다 */
                    <div className="flex items-center gap-1">
                      {focus === "none" ? (
                        <PaneGripHandle
                          label="시세"
                          axis="y"
                          tone="card"
                          dragging={stack.dragging === "chart"}
                          {...stack.handleProps("chart")}
                        />
                      ) : null}
                      <FocusButton
                        on={focus === "chart"}
                        label="시세"
                        tone="card"
                        onToggle={() => toggleFocus("chart")}
                      />
                    </div>
                  }
                />
              </div>
            ),
        },
        /* 두 판이 다 보일 때만 눈금이 뜻을 갖는다 */
        focus === "none" ? (
          <RoomStackSplitter
            key="stack-splitter"
            chartHeight={chartHeight}
            chartBelow={stackOrder[0] === "photo"}
            maxHeight={maxChartHeight}
            onResize={(px) => setChartHeight(px, maxChartHeight)}
            onNudge={(delta) => nudgeChartHeight(delta, maxChartHeight)}
            onReset={resetChartHeight}
          />
        ) : null,
      )}
    </div>
  );

  /* 2열 · 표가 곧 주문창 */
  const tablePane = (
    <section
      key="table"
      ref={column.registerPane("table")}
      aria-label={axis.kind === "listing" ? "부위" : "개체"}
      style={column.paneStyle("table")}
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        SURFACE_SHELL_CLASS,
        column.dragging === "table" &&
          "relative z-30 shadow-2xl ring-1 ring-content-soft",
        column.dragging &&
          column.dragging !== "table" &&
          "transition-transform duration-200",
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line-soft px-4 py-2.5">
        {/*
         * 세는 단위는 1열 머리글과 같다 · 부위축에서는 좌/우가 따로 행이라
         * 행 수(30)와 개체 수(15)가 다르다 — 이름과 숫자가 어긋나지 않게 개체를 센다.
         * 행 수는 아래 소계(`내 입찰 0/30`)가 말한다.
         */}
        <h2 className="text-[13px] font-bold text-content">
          {axis.kind === "listing" ? "부위" : "개체"}{" "}
          <span className="tabular-nums text-content-faint">
            {axis.kind === "listing" ? rows.length : headCount}
            {hideSettled && summary.settledCount > 0 ? (
              <span className="text-content-ghost">
                /{axis.kind === "listing" ? allRows.length : allHeadCount}
              </span>
            ) : null}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          {/* 소계는 바닥글이 맡는다 · 머리글에도 같은 줄을 두면 한 화면에 두 번 적힌다 */}
          <HideSettledToggle
            on={hideSettled}
            count={summary.settledCount}
            onToggle={toggleHideSettled}
          />
          {/* 머리글 여백보다 한 칸 바깥으로 · 글자 줄과 아이콘의 광학 끝선을 맞춘다 */}
          <PaneGripHandle
            label="표"
            axis="x"
            tone="card"
            dragging={column.dragging === "table"}
            className="-mr-1"
            {...column.handleProps("table")}
          />
        </div>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-[13px] font-semibold text-content-mid">
              남은 부위가 없습니다
            </p>
            <p className="text-[12px] text-content-faint">
              {allRows.length}개가 모두 마감돼 숨겨졌어요
            </p>
            <button
              type="button"
              onClick={toggleHideSettled}
              className="mt-1 h-7 rounded-md bg-surface-accent px-2.5 text-[12px] font-semibold text-content transition-colors hover:bg-surface-strong"
            >
              숨김 해제
            </button>
          </div>
        ) : (
          <SheetPartGrid
            entries={rows}
            axis={axis.kind === "listing" ? PART_ROW_AXIS : LISTING_ROW_AXIS}
            columns={1}
            gridClassName="grid-cols-1"
            dealerId={dealerId}
            canReadBids={isAuthenticated && isDealer}
            selectedPartId={selected?.part.id ?? null}
            onSelectPart={selectRow}
            bidding={sheetBidding}
            isBlocked={({ listing }) => !!getBlockReason(listing)}
            getPartResult={getPartResult}
          />
        )}
      </div>
      <div className="shrink-0 border-t border-line-soft bg-surface px-3 pb-2">
        <SheetBatchFooter
          batchKey={
            axis.kind === "listing" ? axisListing!.id : `part:${axisGroup!.group}`
          }
          label={
            axis.kind === "listing" ? axisListing!.listingNo : axisGroup!.group
          }
          entries={rows}
          bidding={sheetBidding}
          notice={
            allSettled
              ? axis.kind === "listing"
                ? "마감된 개체입니다."
                : "마감된 부위입니다."
              : allBlocked
                ? blockReasons[0]
                : undefined
          }
          selected={selected}
          selectedLabel={({ listing, part }) =>
            axis.kind === "listing" ? part.partName : listing.listingNo
          }
        >
          <SheetBatchSubtotal summary={summary} />
        </SheetBatchFooter>
      </div>
    </section>
  );

  return (
    <>
      {sideDock}

      <RoomHeader
        axis={axis}
        onAxisChange={switchAxis}
        listing={focusListing}
        stepPrev={
          <StepArrow
            side="prev"
            noun={axis.kind === "listing" ? "개체" : "부위"}
            disabled={!canPrev}
            onClick={goPrev}
            hint={
              axis.kind === "listing"
                ? (listings[listingIdx - 1]?.listingNo ?? null)
                : (partGroups[groupIdx - 1]?.group ?? null)
            }
          />
        }
        stepNext={
          <StepArrow
            side="next"
            noun={axis.kind === "listing" ? "개체" : "부위"}
            disabled={!canNext}
            onClick={goNext}
            hint={
              axis.kind === "listing"
                ? (listings[listingIdx + 1]?.listingNo ?? null)
                : (partGroups[groupIdx + 1]?.group ?? null)
            }
          />
        }
        /* 부위축은 picker 가 부위를 가리키므로 "지금 어느 개체인가" 를 따로 적는다 */
        entityLabel={
          axis.kind === "part" ? stepperIdentity(selected ?? null) : null
        }
        showArrowHint={!arrowNavLearned && (canPrev || canNext)}
        picker={
          axis.kind === "listing" ? (
            <RoomPicker
              label="다른 개체 선택"
              placeholder="접수번호 · 업체 · 등급 검색"
              hotkey="/"
              title={axisListing!.listingNo}
              badge={
                listings.length > 1
                  ? `${listingIdx + 1}/${listings.length}`
                  : null
              }
              items={listings}
              keyOf={(l) => l.id}
              isCurrent={(l) => l.id === axisListing!.id}
              searchTextOf={(l) => [
                l.listingNo,
                l.companyName,
                formatGradeLabel(l.grade, l.marblingScore),
              ]}
              renderRow={(l) => <ListingPickerRow listing={l} />}
              onPick={(l) => goToListing(l)}
            />
          ) : (
            <RoomPicker
              label="다른 부위 선택"
              placeholder="부위 검색"
              hotkey="/"
              width={260}
              title={axisGroup!.group}
              badge={`${axisGroup!.count}`}
              items={partGroups}
              keyOf={(g) => g.group}
              isCurrent={(g) => g.group === axisGroup!.group}
              searchTextOf={(g) => [g.group]}
              renderRow={(g) => <PartPickerRow group={g} dealerId={dealerId} />}
              onPick={(g) =>
                router.replace(partDetailHref(g.group, { houseKey }), {
                  scroll: false,
                })
              }
            />
          )
        }
      />

      <div
        ref={gridRef}
        className={cn(
          "grid min-h-0 flex-1 px-6 pb-3",
          // 열을 끄는 동안 `translate` 가 가로 스크롤을 만들지 않게 잠시 잘라 둔다
          column.dragging && "overflow-hidden",
        )}
        style={{ gridTemplateColumns: gridColumns(columnOrder, tableWidth) }}
      >
        {orderPanes(
          columnOrder,
          { stack: stackColumn, table: tablePane },
          <RoomSplitter
            key="column-splitter"
            tableWidth={tableWidth}
            tableOnLeft={tableOnLeft}
            maxWidth={maxTableWidth}
            onResize={(px) => setTableWidth(Math.min(px, maxTableWidth))}
            onNudge={(delta) => nudgeTableWidth(delta, maxTableWidth)}
            onReset={resetTableWidth}
          />,
        )}
      </div>

      <LoginGateOverlay
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
      />
    </>
  );
}

/* ───────────────────────── 선택기 행 ───────────────────────── */

function ListingPickerRow({ listing }: { listing: LiveListing }) {
  return (
    <>
      {/* 번호보다 단면이 먼저 눈에 든다 · 고르는 기준이 결국 고기 모양이다 */}
      {/* 모서리·테두리는 경매 시트 표의 사진 칸과 같은 값으로 맞춘다 */}
      <span className="relative h-[33px] w-11 shrink-0 overflow-hidden rounded-md bg-surface-accent ring-1 ring-line">
        {listing.images[0] ? (
          <Image
            src={listing.images[0]}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <ImageOff
            className="absolute inset-0 m-auto h-3.5 w-3.5 text-content-ghost"
            strokeWidth={1.5}
            aria-hidden
          />
        )}
      </span>
      <span className="shrink-0 whitespace-nowrap text-[12.5px] font-bold tabular-nums text-content">
        {listing.listingNo}
      </span>
      <span className="w-[58px] shrink-0 text-[12px] font-semibold text-content-mid">
        {formatGradeLabel(listing.grade, listing.marblingScore)}
      </span>
      <span className="min-w-0 flex-1 truncate text-right text-[12px] text-content-soft">
        {listing.companyName || "-"}
      </span>
    </>
  );
}

function PartPickerRow({
  group,
  dealerId,
}: {
  group: PartGroupEntry;
  dealerId: string | null;
}) {
  const settled = group.items.filter(({ part }) => isPartSettled(part)).length;
  const myOpen = dealerId
    ? group.items.filter(
        ({ part }) =>
          !isPartSettled(part) &&
          part.allBids.some((b) => b.dealerId === dealerId),
      ).length
    : 0;
  const done = settled === group.count;

  return (
    <>
      {/* 진행 중 내 입찰이 있는 부위는 먹색 점 · 전부 마감된 부위는 한 톤 물린다 */}
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          myOpen > 0 ? "bg-inverse" : "bg-transparent",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] font-semibold",
          done ? "text-content-faint" : "text-content",
        )}
      >
        {group.group}
      </span>
      {myOpen > 0 ? (
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-content-soft">
          내 입찰 {myOpen}
        </span>
      ) : null}
      <span className="shrink-0 text-[12px] font-medium tabular-nums text-content-faint">
        {group.count}
      </span>
    </>
  );
}

/* ───────────────────────── 헤더 ───────────────────────── */

const AXIS_TABS: { kind: RoomAxis["kind"]; label: string }[] = [
  { kind: "listing", label: "개체별" },
  { kind: "part", label: "부위별" },
];

function RoomHeader({
  axis,
  onAxisChange,
  listing,
  picker,
  stepPrev,
  stepNext,
  entityLabel,
  showArrowHint,
}: {
  axis: RoomAxis;
  onAxisChange: (next: RoomAxis["kind"]) => void;
  /** 지금 고른 행의 개체 · 어느 축이든 이 값이 사진·등급판정을 함께 말한다 */
  listing: LiveListing;
  picker: React.ReactNode;
  /** 고정축 이동 좌우 화살표 · 두 축 모두 picker 를 사이에 두고 감싼다 */
  stepPrev: React.ReactNode;
  stepNext: React.ReactNode;
  /** 부위축에서만 · picker 가 부위를 가리키므로 개체는 여기서 밝힌다 */
  entityLabel: string | null;
  /** 접수번호에 키보드 이동 안내를 붙일지 · ←/→ 를 써 본 뒤로는 끈다 */
  showArrowHint: boolean;
}) {
  /** ←/→ 가 옮기는 것 · 표의 행과 뒤집힌 짝이다 */
  const pivotNoun = axis.kind === "listing" ? "개체" : "부위";
  // 도축장은 지금 보고 있는 경매장과 늘 같다 (상장 목록이 도축장으로 걸러진다) · 빼고 날짜만
  const slaughterLine =
    [
      formatDate(listing.slaughterDate),
      listing.slaughterNo ? `No.${listing.slaughterNo}` : null,
    ]
      .filter((v) => v && v !== "-")
      .join(" · ") || null;

  return (
    <header className="px-6 pb-3 pt-2">
      <div
        role="tablist"
        aria-label="보기 축"
        className="mb-1.5 inline-flex items-center gap-0.5 rounded-[4px] bg-surface-strong/70 p-0.5"
      >
        {/* 두 탭 모두 같은 말을 한다 · 알려 줄 건 「키로도 된다」 하나뿐이다 */}
        {AXIS_TABS.map(({ kind, label }) => {
          const active = kind === axis.kind;
          return (
            <ShortcutTooltip key={kind} label="키보드 이동" shortcut="B">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-keyshortcuts="b"
                onClick={() => onAxisChange(kind)}
                className={cn(
                  "h-6 rounded-[3px] px-2.5 text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-surface text-content ring-1 ring-line"
                    : "text-content-soft hover:text-content",
                )}
              >
                {label}
              </button>
            </ShortcutTooltip>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/*
         * 화살표는 늘 picker 를 감싼다 — picker 가 가리키는 것이 곧 고정축이고,
         * ←/→ 가 옮기는 것도 그것이다. 부위축의 접수번호는 「지금 고른 행이 어느
         * 개체인가」 를 말할 뿐이라 화살표 밖에 둔다.
         */}
        <div className="flex items-center gap-0.5">
          {stepPrev}
          <ArrowNavHint show={showArrowHint} noun={pivotNoun}>
            {picker}
          </ArrowNavHint>
          {stepNext}
        </div>
        {entityLabel === null ? null : (
          <span className="text-[13.5px] font-bold tabular-nums text-content">
            {entityLabel}
          </span>
        )}

        {/*
         * 값 18개 · 토스증권 종목 헤더처럼 두 줄(9열)로 세운다.
         * 열 안에서는 라벨 왼쪽 · 값 오른쪽 — 값의 오른쪽 끝이 맞아 세로로 훑힌다.
         *
         * 간격은 열 사이(20px) > 라벨·값 사이(8px) 순서를 지킨다. 이 순서가 뒤집히면
         * 값이 제 라벨이 아니라 옆 열의 라벨에 붙어 읽힌다. 사이드 메뉴를 펴도 두 줄을
         * 지키려고 좁힌 것이지만, 원래 12px 이던 라벨·값 사이를 더 줄인 덕에 짝이
         * 오히려 또렷해졌다 — 깎을 곳은 열 사이가 아니라 짝 안쪽이었다.
         */}
        <dl className="grid grid-flow-col grid-rows-2 gap-x-5 gap-y-1.5">
          <Stat label="축종" value={listing.breed} />
          <Stat label="성별" value={listing.gender} />
          <Stat label="개월" value={listing.monthAge} />
          <Stat label="상장업체" value={listing.companyName} />
          <Stat
            label="등급"
            value={formatGradeLabel(listing.grade, listing.marblingScore)}
          />
          <Stat label="근내지방" value={listing.marblingScore} />
          <Stat label="육색" value={listing.meatColor} />
          <Stat label="지방색" value={listing.fatColor} />
          <Stat label="조직도" value={listing.texture} />
          <Stat label="성숙도" value={listing.maturity} />
          <Stat label="등지방두께" value={listing.backFat} unit="mm" />
          <Stat label="등심면적" value={listing.eyeMuscle} unit="㎠" />
          <Stat label="도체중" value={listing.carcassWeight} unit="kg" />
          <Stat label="가공중량" value={listing.processWeight} unit="kg" />
          <Stat
            label="경락단가"
            value={
              listing.unitPrice
                ? formatKrw(Math.round(listing.unitPrice))
                : null
            }
            unit="원"
          />
          <Stat label="도축" value={slaughterLine} />
          <Stat label="가공" value={formatDate(listing.processDate)} />
          {/* 번호 자체가 조회 링크다 · 옆에 「이력조회」를 또 두면 열이 그만큼 넓어진다 */}
          <div className="flex items-baseline gap-2">
            <dt className="shrink-0 text-[11.5px] font-medium text-content-faint">
              이력
            </dt>
            <dd className="ml-auto text-[13.5px] font-semibold leading-none">
              <a
                href={buildTraceHref(listing.traceNo)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 tabular-nums text-content underline decoration-line underline-offset-[3px] hover:decoration-content"
              >
                {formatTraceNo(listing.traceNo)}
                <ExternalLink
                  className="h-3 w-3 text-content-faint"
                  aria-hidden
                />
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-[11.5px] font-medium text-content-faint">
        {label}
      </dt>
      <dd
        className={cn(
          "ml-auto text-[13.5px] font-semibold leading-none tabular-nums",
          empty ? "text-content-ghost" : "text-content",
        )}
      >
        {empty ? "-" : value}
        {!empty && unit ? (
          <span className="pl-0.5 text-[11px] font-medium text-content-faint">
            {unit}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
