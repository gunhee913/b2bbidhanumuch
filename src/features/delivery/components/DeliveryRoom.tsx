"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useInterval, useMeasure } from "react-use";
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import {
  SegmentedTabs,
  type SegmentedTabOption,
} from "@/components/ui/segmented-tabs";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { PaneGripHandle } from "@/features/live-auction/components/PaneGripHandle";
import { RoomSplitter } from "@/features/live-auction/components/RoomSplitter";
import { useDealerNotes } from "@/features/live-auction/hooks/useAuctionNotes";
import { usePaneReorder } from "@/features/live-auction/hooks/usePaneReorder";
import type { PaneOrder } from "@/features/live-auction/hooks/useRoomLayout";
import { useSheetCursor } from "@/features/live-auction/hooks/useSheetCursor";
import {
  DELIVERY_DEADLINE_ENABLED,
  DELIVERY_DEADLINE_LABEL,
  isDeliveryLocked,
} from "../lib/deadline";
import type { AssignmentInfo, Partner, WinningPart } from "../types";
import {
  countAssignments,
  effectivePartnerId,
  flattenGroups,
  groupWinningParts,
  liftUndecided,
} from "../lib/groupWinningParts";
import {
  DELIVERY_PANE_MIN_WIDTH,
  DELIVERY_TABLE_PANE_MIN_WIDTH,
  DELIVERY_PANE_WIDTH_DEFAULT,
  useDeliveryPrefs,
  type DeliveryColumn,
  type DeliveryGroupBy,
} from "../hooks/useDeliveryPrefs";
import { usePartnerHotkeys } from "../hooks/usePartnerHotkeys";
import {
  PARTNER_SLOT_COUNT,
  usePartnerPins,
  useSetPartnerPin,
} from "../hooks/usePartnerPins";
import { DeliveryFocusPane } from "./DeliveryFocusPane";
import {
  DELIVERY_TABLE_MIN_WIDTH,
  DeliveryPartTable,
  scrollDeliveryRowIntoView,
} from "./DeliveryPartTable";
import { DeliverySideDock } from "./DeliverySideDock";

/** 1열과 2열 사이 틈 · 이 자리를 눈금(`RoomSplitter`)이 그대로 쓴다 */
const SPLITTER_WIDTH = 8;

/**
 * 묶는 기준 · 끌 수 없는 축이라 `toggleable` 을 주지 않는다.
 * 생김새는 경매장 등급 탭과 한 벌이다 (`SegmentedTabs`).
 */
const GROUP_BY_TABS: readonly SegmentedTabOption[] = [
  { value: "part", label: "부위별" },
  { value: "entity", label: "개체별" },
  { value: "partner", label: "거래처별" },
];

/**
 * 열 두 칸 · **사진 판이 px 를 쥐고 표 판이 남는 폭을 가져간다** (까닭은 `useDeliveryPrefs`).
 *
 * 표 판의 바닥은 표가 아니라 머리줄이 정한다(`DELIVERY_TABLE_PANE_MIN_WIDTH`). 표는
 * 그보다 넓어야 제 모습이지만, 모자라면 판 안에서 가로로 밀면 된다 — 여기서 표의
 * 바닥(958)을 쓰면 그 폭이 페이지 최소 폭까지 올라가, 창이 작은 기기에서 표 대신
 * **화면 전체**가 밀린다.
 */
function gridColumns(
  order: PaneOrder<DeliveryColumn>,
  paneWidth: number,
): string {
  const track = (col: DeliveryColumn) =>
    col === "pane"
      ? `${paneWidth}px`
      : `minmax(${DELIVERY_TABLE_PANE_MIN_WIDTH}px,1fr)`;
  return `${track(order[0])} ${SPLITTER_WIDTH}px ${track(order[1])}`;
}

/**
 * 받은 차례대로 늘어놓고 가운데에 눈금을 끼운다.
 *
 * 넘기는 판에는 **`key` 가 있어야 한다.** 없으면 리액트가 자리 번호로 짝을 맞춰서,
 * 손잡이로 좌우를 맞바꿀 때 「1번 자리의 판」 이 그대로 이어지는 것으로 친다 — 사진 판과
 * 표가 서로의 껍데기를 물려받으며 통째로 다시 서고, 보던 사진 장수도 표를 내려 둔 자리도
 * 거기서 사라진다.
 */
function orderPanes(
  order: PaneOrder<DeliveryColumn>,
  panes: Record<DeliveryColumn, ReactNode>,
  splitter: ReactNode,
): ReactNode[] {
  return [panes[order[0]], splitter, panes[order[1]]];
}

/* 불러오기 전에도 띠는 아홉 자리를 그린다 · 자리 수가 깜빡이면 손이 세는 중에 어긋난다 */
const EMPTY_PINS: (string | null)[] = Array.from(
  { length: PARTNER_SLOT_COUNT },
  () => null,
);

export interface DeliveryRoomProps {
  /** 표 머리줄 맨 앞 조회기간 · 기간을 쥔 건 부르는 쪽이라 다 그린 채로 받는다 */
  periodControl: ReactNode;
  parts: WinningPart[];
  partners: Partner[];
  savedAssignments: Record<string, AssignmentInfo>;
  isLoading: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: (dirty: Record<string, string | null>) => Promise<void>;
  /** 기간이 바뀌면 손대던 것을 버린다 · 부모가 열쇠를 바꿔 알린다 */
  resetKey: string;
  /** 그 날짜 하루로 조회를 옮긴다 · 기간 밖 메모를 눌러 짚어 갈 때 */
  onRequestDate: (date: string) => void;
}

/**
 * 배송지시 · 왼쪽 사진, 오른쪽 표의 두 열 작업 화면.
 *
 *   ┌ 머리 · ‹기간› · [부위별|개체별|거래처별] · 집계 ─────────┐
 *   │ 사진 · 판정 일곱   │ 낙찰 열 | 거래처 열                   │
 *   │                    ├───────────────────────────────────────┤
 *   │                    │ 숫자 띠            [ 변경 n건 저장 ]   │
 *   └──────────────────────────────────────────────────────────┘
 *
 * 경매장 상세 방의 껍데기를 그대로 쓰되 두 가지를 달리했다.
 *
 *  - **시세 차트가 없다.** 시세는 얼마를 부를지 정하는 값이다. 이미 딴 것을 어디로
 *    보낼지와는 상관이 없어서 자리만 차지한다.
 *  - **한 화면에 한 개체가 아니다.** 상세 방은 한 마리를 깊이 보는 틀이라 ←/→ 로
 *    넘기지만, 배송지시는 하루 수십~수백 건을 흘려보내는 일이다. 개체마다 화면을
 *    갈아타면 넘기는 데만 손이 다 간다. 표는 오늘치를 한 줄기로 두고 사진이 커서를
 *    따라오게 했다 (`/auction/live` 요약 판과 같은 방식).
 */
export function DeliveryRoom({
  periodControl,
  parts,
  partners,
  savedAssignments,
  isLoading,
  saving,
  saveError,
  onSave,
  resetKey,
  onRequestDate,
}: DeliveryRoomProps) {
  const groupBy = useDeliveryPrefs((s) => s.groupBy);
  const setGroupBy = useDeliveryPrefs((s) => s.setGroupBy);
  const undecidedFirst = useDeliveryPrefs((s) => s.undecidedFirst);
  const toggleUndecidedFirst = useDeliveryPrefs((s) => s.toggleUndecidedFirst);
  /* 거래처별은 묶음 자체가 미정을 맨 위에 세운다 · 거기서 머리글을 눌러도 바뀔 게 없다 */
  const canLiftUndecided = groupBy !== "partner";
  const storedPaneWidth = useDeliveryPrefs((s) => s.paneWidth);
  const setPaneWidth = useDeliveryPrefs((s) => s.setPaneWidth);
  const resetPaneWidth = useDeliveryPrefs((s) => s.resetPaneWidth);

  const columnOrder = useDeliveryPrefs((s) => s.columnOrder);
  const swapColumnOrder = useDeliveryPrefs((s) => s.swapColumnOrder);
  const column = usePaneReorder({
    axis: "x",
    order: columnOrder,
    gap: SPLITTER_WIDTH,
    onSwap: swapColumnOrder,
  });
  const paneOnLeft = columnOrder[0] === "pane";

  const { data: pinned = EMPTY_PINS } = usePartnerPins();
  const setPin = useSetPartnerPin();

  /*
   * 창을 줄이면 잡아 둔 폭은 그대로 두고 그릴 때만 깎는다 · 표가 먼저 제 폭을 챙긴다.
   *
   * 여기서 쓰는 건 표 **판**의 바닥이 아니라 표 자체의 바닥(958)이다. 표 판이 더
   * 좁아도 가로로 밀면 보이기는 하지만, 밀지 않고 다 보이는 쪽이 늘 낫다 — 사진 판은
   * 제 바닥(370)에 닿을 때까지 양보하고, 거기서부터 표가 밀리기 시작한다.
   */
  const [gridRef, { width: gridWidth }] = useMeasure<HTMLDivElement>();
  const maxPaneWidth =
    gridWidth > 0
      ? Math.max(
          DELIVERY_PANE_MIN_WIDTH,
          gridWidth - DELIVERY_TABLE_MIN_WIDTH - SPLITTER_WIDTH,
        )
      : storedPaneWidth;
  const paneWidth = Math.min(storedPaneWidth, maxPaneWidth);

  const [dirty, setDirty] = useState<Record<string, string | null>>({});
  useEffect(() => setDirty({}), [resetKey]);

  const partnerNameById = useMemo(
    () => new Map(partners.map((p) => [p.id, p.name])),
    [partners],
  );

  /* 보이는 차례가 곧 커서가 훑는 차례다 · 「미정 먼저」 는 저장된 값으로 가른다 */
  const groups = useMemo(() => {
    const grouped = groupWinningParts(parts, groupBy, {
      partnerNameById,
      saved: savedAssignments,
      dirty,
    });
    if (!undecidedFirst || !canLiftUndecided) return grouped;
    return liftUndecided(grouped, (p) => !savedAssignments[p.partId]);
  }, [
    parts,
    groupBy,
    partnerNameById,
    savedAssignments,
    dirty,
    undecidedFirst,
    canLiftUndecided,
  ]);
  const rowIds = useMemo(() => flattenGroups(groups), [groups]);
  const partById = useMemo(
    () => new Map(parts.map((p) => [p.partId, p])),
    [parts],
  );

  const { id: cursorId, set: setCursor } = useSheetCursor({
    ids: rowIds,
    onOpen: () => {},
    onMove: scrollDeliveryRowIntoView,
  });

  /* 들어오자마자 첫 줄을 짚는다 · 커서가 비어 있으면 사진 판도 숫자 키도 갈 곳이 없다 */
  useEffect(() => {
    if (!cursorId && rowIds.length > 0) setCursor(rowIds[0]);
  }, [rowIds, cursorId, setCursor]);

  /*
   * 「미정 먼저」 를 켜면 첫 미정 줄을 짚는다 · 켜는 까닭이 그것들을 처리하려는 것이라.
   * 끌 때는 짚던 줄을 그대로 두고 새 차례에서 그 줄이 보이게만 굴린다.
   * 새 차례(`rowIds`)는 다음 그림에서야 나오므로 한 번 미뤘다가 짚는다.
   */
  const [sortMoved, setSortMoved] = useState<"top" | "keep" | null>(null);
  const handleToggleUndecidedFirst = useCallback(() => {
    setSortMoved(undecidedFirst ? "keep" : "top");
    toggleUndecidedFirst();
  }, [undecidedFirst, toggleUndecidedFirst]);
  useEffect(() => {
    if (!sortMoved) return;
    setSortMoved(null);
    const top = rowIds[0];
    /* 미정이 하나도 없으면 맨 윗줄은 그냥 첫 줄이다 · 거기로 끌고 가지 않는다 */
    const target =
      sortMoved === "top" && top && !savedAssignments[top] ? top : cursorId;
    if (!target) return;
    setCursor(target);
    scrollDeliveryRowIntoView(target);
  }, [sortMoved, rowIds, cursorId, savedAssignments, setCursor]);

  const assign = useCallback((partId: string, partnerId: string | null) => {
    setDirty((prev) => ({ ...prev, [partId]: partnerId }));
  }, []);

  /*
   * 숫자 키는 커서가 짚은 줄에 꽂고 곧바로 다음 줄로 내린다 — `1 2 1 1 3` 처럼
   * 손이 멈추지 않아야 쉰 건이 빨리 끝난다. 마지막 줄에서는 내리지 않는다.
   *
   * 자리에 걸린 id 가 지금 목록에 있는지 먼저 본다. 핀은 브라우저에 남지만 담당
   * 거래처는 바뀐다 — 빠진 거래처를 그대로 꽂으면 표에 이름도 연락처도 없는 배정이
   * 생기고, 그게 저장까지 넘어간다.
   */
  const cursorRef = useRef(cursorId);
  cursorRef.current = cursorId;
  usePartnerHotkeys({
    enabled: rowIds.length > 0,
    onPick: (slot) => {
      const at = cursorRef.current;
      if (!at) return;
      if (slot === null) {
        assign(at, null);
      } else {
        const partnerId = pinned[slot];
        if (!partnerId || !partners.some((p) => p.id === partnerId)) return;
        assign(at, partnerId);
      }
      const next = rowIds[rowIds.indexOf(at) + 1];
      if (next) {
        setCursor(next);
        scrollDeliveryRowIntoView(next);
      }
    },
  });

  const counts = useMemo(
    () => countAssignments(parts, savedAssignments, dirty),
    [parts, savedAssignments, dirty],
  );

  /* 부위 → 지금 걸린 거래처 · 사이드 독이 거래처별 건수를 셀 때 쓴다 */
  const effective = useMemo(
    () =>
      new Map(
        parts.map((p) => [
          p.partId,
          effectivePartnerId(p.partId, savedAssignments, dirty),
        ]),
      ),
    [parts, savedAssignments, dirty],
  );
  const dirtyCount = Object.keys(dirty).length;
  const focused = cursorId ? (partById.get(cursorId) ?? null) : null;

  /*
   * 메모는 (딜러 · 상장일 · 부위) 에 붙어 경매장과 같은 자리를 쓴다 — 입찰하며 「등지방
   * 두꺼움」 이라 적어 둔 말이 배송 지정 화면에도 그대로 떠야 한다.
   *
   * 조회기간으로 자르지 않고 **전부** 받는다. 적어 둔 말은 「언제 적었나」 가 아니라
   * 「무엇을 적었나」 로 찾는 것이라, 기간을 맞춰야 보이면 날짜를 기억하는 사람만
   * 쓸 수 있는 목록이 된다. 표의 자국과 쪽지는 어차피 부위 id 로 집어 가므로 더
   * 받아 온 것이 섞여 보일 일도 없다.
   */
  const notes = useDealerNotes({ all: true });
  const { get: getNote, save: saveNote } = notes;
  const partNote = useCallback(
    (partId: string) => getNote("part", partId),
    [getNote],
  );

  /*
   * 메모에서 그 줄로 짚어 가기 · 지금 기간에 없으면 **메모의 날짜로 조회를 옮기고**
   * 자료가 들어온 뒤에 짚는다.
   *
   * 목록이 날짜를 가리지 않으니(`all: true`) 절반은 지금 표에 없는 줄이다. 전에는 그런
   * 줄을 눌리지 않게 막고 「화면 밖」 이라 적어 뒀는데, 적어 둔 말을 찾아 눌렀는데
   * 막혀 있으면 날짜를 손으로 맞춰 다시 눌러야 한다 — 그 손이 이 목록이 대신할 일이다.
   */
  const [pendingJump, setPendingJump] = useState<string | null>(null);
  const jumpToPart = useCallback(
    (partId: string, activeDate: string) => {
      if (!partById.has(partId)) onRequestDate(activeDate);
      setPendingJump(partId);
    },
    [partById, onRequestDate],
  );

  /*
   * 기다리던 줄이 섰으면 짚고, 안 섰으면 한 번으로 끝낸다.
   *
   * 낙찰받지 못한 부위에도 메모는 남는다 — 경매장에서 값을 가늠하며 적은 것들이다.
   * 그런 줄은 날짜를 옮겨도 배송 표에 설 자리가 없으니, 계속 기다리게 두면 나중에
   * 그 날짜를 조회할 때 커서가 엉뚱한 데로 튄다.
   */
  useEffect(() => {
    if (!pendingJump || isLoading) return;
    if (rowIds.includes(pendingJump)) {
      setCursor(pendingJump);
      scrollDeliveryRowIntoView(pendingJump);
    }
    setPendingJump(null);
  }, [pendingJump, isLoading, rowIds, setCursor]);

  const focusedNote = useMemo(
    () =>
      focused
        ? {
            body: getNote("part", focused.partId),
            onSave: (body: string) =>
              saveNote("part", focused.partId, body, focused.listingDate),
          }
        : null,
    [focused, getNote, saveNote],
  );

  /*
   * 마감은 시간이 흐르면 저절로 온다 · 1분마다 지금을 다시 본다.
   *
   * 초마다 보면 표 전체가 분당 예순 번 다시 그려지고, 새로고침해야만 잠기게 두면
   * 13:29 에 열어 둔 화면으로 14시에도 고칠 수 있다. 분 단위면 둘 다 피한다.
   */
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), 60_000);
  const isLocked = useCallback(
    (part: WinningPart) => isDeliveryLocked(part.listingDate, now),
    [now],
  );

  /*
   * 저장을 누르는 순간에만 묻는다 · 줄마다 물으면 다섯 줄 고치는 데 창이 다섯 번 뜬다.
   * 「무엇이 바뀌는가」 는 바꾸는 중이 아니라 **넘기기 직전**에 한 번 보면 된다.
   */
  const overwriteCount = useMemo(
    () =>
      Object.keys(dirty).filter((partId) => !!savedAssignments[partId]).length,
    [dirty, savedAssignments],
  );

  const handleSave = useCallback(async () => {
    if (dirtyCount === 0) return;
    if (
      overwriteCount > 0 &&
      !window.confirm(
        `이미 지정한 ${overwriteCount}건의 거래처가 바뀝니다.\n${DELIVERY_DEADLINE_ENABLED ? `상장일 ${DELIVERY_DEADLINE_LABEL} 이 지나면 중도매인은 더 고칠 수 없습니다.\n` : ""}\n저장할까요?`,
      )
    ) {
      return;
    }
    await onSave(dirty);
    setDirty({});
  }, [dirty, dirtyCount, overwriteCount, onSave]);

  /*
   * 이 열은 껍데기가 없다 · 테두리와 바탕은 안에 선 사진·개체정보 두 카드가 각자 갖는다.
   * 한 상자 안을 선 하나로 가르면 그 선이 어디에도 붙지 않은 군더더기로 읽혀, 두 카드를
   * 떼고 그 사이 틈을 그대로 눈금으로 쓴다 (경매장 상세 1열과 같은 틀).
   */
  const panePane = (
    <div
      key="pane"
      ref={column.registerPane("pane")}
      style={column.paneStyle("pane")}
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        column.dragging === "pane" && "relative z-30",
        column.dragging &&
          column.dragging !== "pane" &&
          "transition-transform duration-200",
      )}
    >
      <DeliveryFocusPane
        focused={focused}
        note={focusedNote}
        headerAction={
          <PaneGripHandle
            label="개체"
            axis="x"
            tone="card"
            dragging={column.dragging === "pane"}
            className="-mr-1"
            {...column.handleProps("pane")}
          />
        }
      />
    </div>
  );

  const tablePane = (
    <section
      key="table"
      ref={column.registerPane("table")}
      style={column.paneStyle("table")}
      className={cn(
        "flex min-h-0 flex-col",
        SURFACE_SHELL_CLASS,
        column.dragging === "table" &&
          "relative z-30 shadow-2xl ring-1 ring-content-soft",
        column.dragging &&
          column.dragging !== "table" &&
          "transition-transform duration-200",
      )}
    >
      {/* 판이 좁으면 집계 묶음이 아랫줄로 내려선다 · 기간과 묶는 기준은 늘 첫 줄에 */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line-soft px-3 py-1.5">
        {periodControl}
        <span className="h-4 w-px bg-line-soft" aria-hidden />
        <SegmentedTabs
          label="묶는 기준"
          value={groupBy}
          options={GROUP_BY_TABS}
          onChange={(v) => setGroupBy(v as DeliveryGroupBy)}
        />
        <p className="ml-1 flex min-w-0 items-baseline gap-2 text-[12px] tabular-nums text-content-faint">
          <span className="shrink-0">
            낙찰 <b className="font-bold text-content">{counts.total}</b>건
          </span>
          {counts.pending > 0 ? (
            <span className="shrink-0 font-semibold text-pending">
              저장 전 {counts.pending}
            </span>
          ) : null}
          {counts.unassigned > 0 ? (
            <span className="shrink-0 font-semibold text-lost">
              미정 {counts.unassigned}
            </span>
          ) : null}
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className="text-[12px] tabular-nums text-content-faint">
            총 {formatKrw(parts.reduce((s, p) => s + p.bidAmount, 0))}원
          </span>
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

      {/* 구르는 건 표뿐이다 · 머리줄과 저장 바는 통 밖에 서서 제자리를 지킨다 */}
      <OverlayScroll
        autoHideDelay={0}
        options={{ overflow: { x: "scroll" } }}
        className="min-h-0 flex-1"
      >
        <DeliveryPartTable
          groups={groups}
          partners={partners}
          savedAssignments={savedAssignments}
          dirtyAssignments={dirty}
          cursorPartId={cursorId}
          getNote={partNote}
          isLocked={isLocked}
          onCursor={setCursor}
          onAssign={assign}
          undecidedFirst={undecidedFirst && canLiftUndecided}
          onToggleUndecidedFirst={
            canLiftUndecided ? handleToggleUndecidedFirst : undefined
          }
          isLoading={isLoading}
        />
      </OverlayScroll>

      <div className="shrink-0">
        <SaveBar
          dirtyCount={dirtyCount}
          overwriteCount={overwriteCount}
          saving={saving}
          error={saveError}
          onSave={handleSave}
          onReset={() => setDirty({})}
        />
      </div>
    </section>
  );

  /*
   * 두 판을 따로 선 카드로 두고 그 사이 틈(8px)을 눈금이 그대로 쓴다 — 경매장 상세
   * 방과 같은 짜임이다. 붙여 두고 선 하나로 가르면 한 판을 옮겼을 때 어디까지가
   * 어느 판인지 읽히지 않는다.
   */
  return (
    <div
      ref={gridRef}
      className={cn(
        "grid min-h-0 flex-1",
        column.dragging && "overflow-hidden",
      )}
      style={{
        gridTemplateColumns: gridColumns(columnOrder, paneWidth),
      }}
    >
      {orderPanes(
        columnOrder,
        { pane: panePane, table: tablePane },
        <RoomSplitter
          key="column-splitter"
          size={paneWidth}
          sizedOnLeft={paneOnLeft}
          defaultSize={DELIVERY_PANE_WIDTH_DEFAULT}
          onResize={(px) => setPaneWidth(Math.min(px, maxPaneWidth))}
          onReset={resetPaneWidth}
        />,
      )}

      {/*
       * 사이드 독은 `fixed` 라 이 격자 밖에 뜬다 · 자리는 페이지 껍데기의 오른쪽
       * 여백(`useDeliveryShellClass`)이 미리 비워 둔다. 여기서 그리는 까닭은 독이
       * 쥐어야 할 것(커서·고치는 중인 배정·핀·메모)이 전부 이 방 안에 있어서다.
       */}
      <DeliverySideDock
        partners={partners}
        pinned={pinned}
        onPin={(slot, partnerId) => setPin.mutate({ slot, partnerId })}
        pinError={setPin.error?.message ?? null}
        parts={parts}
        effective={effective}
        cursorPartId={cursorId}
        onAssign={assign}
        cursorLocked={!!focused && isLocked(focused)}
        notes={notes.rows}
        onJumpToPart={jumpToPart}
        onDeleteNote={(partId, activeDate) =>
          saveNote("part", partId, "", activeDate)
        }
      />
    </div>
  );
}

function SaveBar({
  dirtyCount,
  overwriteCount,
  saving,
  error,
  onSave,
  onReset,
}: {
  dirtyCount: number;
  /** 그중 이미 지정돼 있던 것을 덮는 건수 · 넘기기 전에 한 번 말해 준다 */
  overwriteCount: number;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2">
      {error ? (
        <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-lost">
          {error}
        </p>
      ) : (
        <p className="min-w-0 flex-1 text-[12px] tabular-nums text-content-faint">
          {dirtyCount > 0 ? (
            <>
              저장하지 않은 변경{" "}
              <b className="font-bold text-content">{dirtyCount}</b>건
              {overwriteCount > 0 ? (
                <span className="pl-1.5 font-semibold text-pending">
                  · 확정분 {overwriteCount}건 덮어씀
                </span>
              ) : null}
            </>
          ) : (
            "변경 사항 없음"
          )}
        </p>
      )}
      {dirtyCount > 0 ? (
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-[12px] font-semibold text-content-soft transition-colors hover:bg-surface-accent hover:text-content disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
          되돌리기
        </button>
      ) : null}
      <button
        type="button"
        onClick={onSave}
        disabled={dirtyCount === 0 || saving}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-inverse px-3.5 text-[12.5px] font-bold text-inverse-content transition-opacity hover:opacity-90 disabled:opacity-30"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : null}
        {dirtyCount > 0 ? `변경 ${dirtyCount}건 저장` : "저장"}
      </button>
    </div>
  );
}
