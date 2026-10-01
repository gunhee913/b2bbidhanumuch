"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMeasure } from "react-use";
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { formatKrw } from "@/features/live-auction/lib/masking";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { PaneGripHandle } from "@/features/live-auction/components/PaneGripHandle";
import { RoomSplitter } from "@/features/live-auction/components/RoomSplitter";
import { usePaneReorder } from "@/features/live-auction/hooks/usePaneReorder";
import type { PaneOrder } from "@/features/live-auction/hooks/useRoomLayout";
import { useSheetCursor } from "@/features/live-auction/hooks/useSheetCursor";
import type { AssignmentInfo, Partner, WinningPart } from "../types";
import {
  countAssignments,
  effectivePartnerId,
  flattenGroups,
  groupWinningParts,
} from "../lib/groupWinningParts";
import {
  DELIVERY_PANE_MIN_WIDTH,
  DELIVERY_TABLE_MIN_WIDTH,
  DELIVERY_TABLE_WIDTH_DEFAULT,
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
  DeliveryPartTable,
  scrollDeliveryRowIntoView,
} from "./DeliveryPartTable";
import { PartnerHotkeyBar } from "./PartnerHotkeyBar";

/** 1열과 2열 사이 틈 · 이 자리를 눈금(`RoomSplitter`)이 그대로 쓴다 */
const SPLITTER_WIDTH = 8;

/** 열 트랙도 늘어놓은 차례를 따른다 · 표는 잡아 둔 px, 개체 판은 남는 폭 전부 */
function gridColumns(
  order: PaneOrder<DeliveryColumn>,
  tableWidth: number,
): string {
  const track = (col: DeliveryColumn) =>
    col === "table"
      ? `${tableWidth}px`
      : `minmax(${DELIVERY_PANE_MIN_WIDTH}px,1fr)`;
  return `${track(order[0])} ${SPLITTER_WIDTH}px ${track(order[1])}`;
}

/** 받은 차례대로 늘어놓고 가운데에 눈금을 끼운다 */
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
  parts: WinningPart[];
  partners: Partner[];
  savedAssignments: Record<string, AssignmentInfo>;
  isLoading: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: (dirty: Record<string, string | null>) => Promise<void>;
  /** 기간이 바뀌면 손대던 것을 버린다 · 부모가 열쇠를 바꿔 알린다 */
  resetKey: string;
}

/**
 * 배송지시 · 왼쪽 사진, 오른쪽 표의 두 열 작업 화면.
 *
 *   ┌ 머리 · [개체별|부위별] · 미정만 · 집계 ──────────────────┐
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
  parts,
  partners,
  savedAssignments,
  isLoading,
  saving,
  saveError,
  onSave,
  resetKey,
}: DeliveryRoomProps) {
  const groupBy = useDeliveryPrefs((s) => s.groupBy);
  const setGroupBy = useDeliveryPrefs((s) => s.setGroupBy);
  const storedTableWidth = useDeliveryPrefs((s) => s.tableWidth);
  const setTableWidth = useDeliveryPrefs((s) => s.setTableWidth);
  const resetTableWidth = useDeliveryPrefs((s) => s.resetTableWidth);

  const columnOrder = useDeliveryPrefs((s) => s.columnOrder);
  const swapColumnOrder = useDeliveryPrefs((s) => s.swapColumnOrder);
  const column = usePaneReorder({
    axis: "x",
    order: columnOrder,
    gap: SPLITTER_WIDTH,
    onSwap: swapColumnOrder,
  });
  const tableOnLeft = columnOrder[0] === "table";

  const { data: pinned = EMPTY_PINS } = usePartnerPins();
  const setPin = useSetPartnerPin();

  /* 창을 줄여도 사진 판이 눌리지 않게 · 잡아 둔 폭은 그대로 두고 그릴 때만 깎는다 */
  const [gridRef, { width: gridWidth }] = useMeasure<HTMLDivElement>();
  const maxTableWidth =
    gridWidth > 0
      ? Math.max(
          DELIVERY_TABLE_MIN_WIDTH,
          gridWidth - DELIVERY_PANE_MIN_WIDTH - SPLITTER_WIDTH,
        )
      : storedTableWidth;
  const tableWidth = Math.min(storedTableWidth, maxTableWidth);

  const [dirty, setDirty] = useState<Record<string, string | null>>({});
  const [onlyUndecided, setOnlyUndecided] = useState(false);
  useEffect(() => setDirty({}), [resetKey]);

  /*
   * 거른 목록이 곧 표의 「전부」다 · 커서도 묶음 머리의 일괄 배정도 여기서 나온다.
   * 안 그러면 「미정만」 을 켜 둔 채 일괄을 눌렀을 때 화면에 없는 줄까지 덮인다.
   */
  const shown = useMemo(() => {
    if (!onlyUndecided) return parts;
    return parts.filter(
      (p) => !effectivePartnerId(p.partId, savedAssignments, dirty),
    );
  }, [parts, onlyUndecided, savedAssignments, dirty]);

  const partnerNameById = useMemo(
    () => new Map(partners.map((p) => [p.id, p.name])),
    [partners],
  );

  const groups = useMemo(
    () =>
      groupWinningParts(shown, groupBy, {
        partnerNameById,
        saved: savedAssignments,
        dirty,
      }),
    [shown, groupBy, partnerNameById, savedAssignments, dirty],
  );
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

  const assign = useCallback((partId: string, partnerId: string | null) => {
    setDirty((prev) => ({ ...prev, [partId]: partnerId }));
  }, []);

  const assignGroup = useCallback(
    (partIds: string[], partnerId: string | null) => {
      setDirty((prev) => {
        const next = { ...prev };
        for (const id of partIds) next[id] = partnerId;
        return next;
      });
    },
    [],
  );

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
  const dirtyCount = Object.keys(dirty).length;
  const focused = cursorId ? (partById.get(cursorId) ?? null) : null;

  const handleSave = useCallback(async () => {
    if (dirtyCount === 0) return;
    await onSave(dirty);
    setDirty({});
  }, [dirty, dirtyCount, onSave]);

  const panePane = (
    <section
      ref={column.registerPane("pane")}
      style={column.paneStyle("pane")}
      className={cn(
        "flex min-h-0 flex-col",
        SURFACE_SHELL_CLASS,
        column.dragging === "pane" &&
          "relative z-30 shadow-2xl ring-1 ring-content-soft",
        column.dragging &&
          column.dragging !== "pane" &&
          "transition-transform duration-200",
      )}
    >
      {/*
       * 등급 각인이 사진 위가 아니라 여기 있다. 증명서를 보는 동안 갤러리가 왼쪽 위에
       * 「등급판정확인서」 라벨을 띄우는데, 각인을 얹어 두면 둘이 같은 자리에서 겹친다.
       */}
      <header className="flex shrink-0 items-center gap-2 border-b border-line-soft px-3 py-1.5">
        {focused ? (
          <>
            <span className="shrink-0 text-[13px] font-bold tabular-nums text-content">
              {formatGradeLabel(
                focused.grade,
                focused.marbling > 0 ? focused.marbling : null,
              )}
            </span>
            <span className="shrink-0 text-[12px] font-medium tabular-nums text-content-faint">
              {focused.listingNo}
            </span>
            {focused.companyName ? (
              <span className="min-w-0 truncate text-[12px] font-medium text-content-faint">
                {focused.companyName}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-[12px] font-bold text-content-mid">개체</span>
        )}
        <span className="ml-auto" />
        <PaneGripHandle
          label="개체"
          axis="x"
          tone="card"
          dragging={column.dragging === "pane"}
          className="-mr-1"
          {...column.handleProps("pane")}
        />
      </header>
      <DeliveryFocusPane focused={focused} />
    </section>
  );

  const tablePane = (
    <section
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
      <header className="flex shrink-0 items-center gap-3 border-b border-line-soft px-3 py-1.5">
        <GroupByToggle value={groupBy} onChange={setGroupBy} />
        <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-[12px] text-content-mid">
          <input
            type="checkbox"
            checked={onlyUndecided}
            onChange={(e) => setOnlyUndecided(e.target.checked)}
            className="h-3.5 w-3.5 accent-[rgb(var(--focus))]"
          />
          미정만
        </label>
        <p className="flex min-w-0 items-baseline gap-2 text-[12px] tabular-nums text-content-faint">
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

      <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
        <DeliveryPartTable
          groups={groups}
          partners={partners}
          savedAssignments={savedAssignments}
          dirtyAssignments={dirty}
          cursorPartId={cursorId}
          onCursor={setCursor}
          onAssign={assign}
          onAssignGroup={assignGroup}
          isLoading={isLoading}
        />
      </OverlayScroll>

      <div className="shrink-0">
        <PartnerHotkeyBar
          partners={partners}
          pinned={pinned}
          onPin={(slot, partnerId) => setPin.mutate({ slot, partnerId })}
          pinError={setPin.error?.message ?? null}
        />
        <SaveBar
          dirtyCount={dirtyCount}
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
        gridTemplateColumns: gridColumns(columnOrder, tableWidth),
      }}
    >
      {orderPanes(
        columnOrder,
        { pane: panePane, table: tablePane },
        <RoomSplitter
          key="column-splitter"
          tableWidth={tableWidth}
          tableOnLeft={tableOnLeft}
          defaultWidth={DELIVERY_TABLE_WIDTH_DEFAULT}
          onResize={(px) => setTableWidth(Math.min(px, maxTableWidth))}
          onReset={resetTableWidth}
        />,
      )}
    </div>
  );
}

function GroupByToggle({
  value,
  onChange,
}: {
  value: DeliveryGroupBy;
  onChange: (v: DeliveryGroupBy) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="묶는 기준"
      className="inline-flex shrink-0 items-center rounded-md bg-surface-accent p-0.5"
    >
      {(
        [
          { id: "part", label: "부위별" },
          { id: "entity", label: "개체별" },
          { id: "partner", label: "거래처별" },
        ] as const
      ).map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[11.5px] font-bold transition-colors",
              active
                ? "bg-surface text-content shadow-sm"
                : "text-content-soft hover:text-content-mid",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SaveBar({
  dirtyCount,
  saving,
  error,
  onSave,
  onReset,
}: {
  dirtyCount: number;
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
