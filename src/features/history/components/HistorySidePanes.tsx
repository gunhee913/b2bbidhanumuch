"use client";

import {
  useCallback,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { useMeasure } from "react-use";
import { cn } from "@/lib/utils";
import { PaneGripHandle } from "@/features/live-auction/components/PaneGripHandle";
import { RoomStackSplitter } from "@/features/live-auction/components/RoomStackSplitter";
import { usePaneListReorder } from "@/features/live-auction/hooks/usePaneListReorder";
import { HistoryPhotoPane } from "./HistoryPhotoPane";
import { HistoryInfoPane } from "./HistoryInfoPane";
import {
  useHistoryPrefs,
  INFO_DEFAULT_HEIGHT,
  INFO_MIN_HEIGHT,
  PHOTO_MIN_HEIGHT,
  type HistorySidePane,
} from "../hooks/useHistoryPrefs";
import type { DailyListing } from "../hooks/useDailyListings";

/** 판 사이 틈 · 이 자리를 눈금(`RoomStackSplitter`)이 그대로 쓴다 */
const STACK_SPLITTER_HEIGHT = 8;

export interface HistorySidePanesProps {
  /** 표에서 고른 줄의 개체 */
  listing: DailyListing | null;
  /** 고른 줄이 무엇인지 · `등심 · 260720-101-01` 꼴 */
  rowLabel: string | null;
  isLoading: boolean;
  className?: string;
  style?: CSSProperties;
  /** 열 자리를 옮기는 쪽이 꽂는다 · 높이를 재는 것과 같은 노드를 본다 */
  ref?: (el: HTMLDivElement | null) => void;
}

/**
 * 왼쪽 열 · 사진 → 개체정보 두 행.
 *
 * 경매결과와 입찰내역이 **같은 이 열을 쓴다**. 오른쪽 표만 갈릴 뿐 왼쪽이 하는 말은
 * 똑같다 — 어떤 고기인가(사진), 무슨 소인가(개체정보). 두 화면에서 왼쪽이 다르면
 * 레일로 넘나들 때마다 눈이 자리를 다시 잡아야 한다.
 *
 * 배송지시 왼쪽 열(`DeliveryFocusPane`)과 같은 짜임이다. 한동안 여기 캘린더가 한 행
 * 더 있었는데 걷어냈다 — 세 행을 쌓으니 날짜·사진·개체정보 중 어느 것도 제 크기를
 * 못 가졌고, 날짜는 고르고 나면 더 볼 일이 없는데 늘 400px 가까이 깔고 앉았다.
 * 지금은 표 머리줄의 날짜 단추가 눌렸을 때만 펼친다 (`HistoryDatePicker`).
 *
 * 높이는 개체정보가 px 로 쥐고 사진이 남는 세로를 전부 가져간다. 둘 다 px 로 잡으면
 * 창을 줄였을 때 합이 맞지 않고, 늘어난 만큼 값이 느는 판은 사진뿐이다.
 *
 * 좁은 화면(`lg` 미만)에서는 눈금도 손잡이도 숨긴다. 거기서는 둘이 쌓여 페이지가
 * 통째로 구르므로 나눠 가질 세로가 없다.
 */
export function HistorySidePanes({
  listing,
  rowLabel,
  isLoading,
  className,
  style,
  ref,
}: HistorySidePanesProps) {
  const storedInfoHeight = useHistoryPrefs((s) => s.infoHeight);
  const setInfoHeight = useHistoryPrefs((s) => s.setInfoHeight);
  const resetInfoHeight = useHistoryPrefs((s) => s.resetInfoHeight);
  const order = useHistoryPrefs((s) => s.sideOrder);
  const setSideOrder = useHistoryPrefs((s) => s.setSideOrder);

  const stack = usePaneListReorder<HistorySidePane>({
    axis: "y",
    order,
    gap: STACK_SPLITTER_HEIGHT,
    onReorder: setSideOrder,
  });

  /*
   * 잡아 둔 높이를 지금 열 높이에 맞춰 깎는다 · 저장값은 건드리지 않아 창을 다시
   * 키우면 원래 자리로 돌아온다.
   */
  const [measureRef, { height: columnHeight }] = useMeasure<HTMLDivElement>();
  /*
   * 높이를 재는 쪽과 열 자리를 옮기는 쪽이 같은 노드를 본다. `translate` 는 레이아웃
   * 크기를 건드리지 않으므로(ResizeObserver 가 보는 건 border-box 다) 자리를 옮기는
   * 중에도 잰 값이 흔들리지 않는다.
   */
  const rootRefs = useCallback(
    (el: HTMLDivElement | null) => {
      measureRef(el);
      ref?.(el);
    },
    [measureRef, ref],
  );

  /*
   * 개체정보 천장 = 사진이 제 바닥에 닿는 지점 · 배송지시와 같은 셈이다. 따로 천장을
   * 두면 사진이 거기서 멈춰 같은 창 높이에서 두 화면의 사진이 다르게 줄어든다.
   *
   * 아직 못 쟀을 때는 담아 둔 값을 그대로 쓴다 — 0 을 넣고 셈하면 첫 그림에서
   * 개체정보가 바닥까지 접혔다가 펴지며 한 번 튄다.
   */
  const maxInfoHeight =
    columnHeight > 0
      ? Math.max(
          INFO_MIN_HEIGHT,
          Math.round(columnHeight) - STACK_SPLITTER_HEIGHT - PHOTO_MIN_HEIGHT,
        )
      : storedInfoHeight;
  const infoHeight = Math.min(storedInfoHeight, maxInfoHeight);

  /** 들어 올린 판 · 끄는 동안에만 전환을 건다 (`AuctionDetailRoom` 쪽 설명) */
  const paneClass = (pane: HistorySidePane) =>
    cn(
      stack.dragging === pane &&
        "relative z-30 shadow-2xl ring-1 ring-content-soft",
      stack.dragging &&
        stack.dragging !== pane &&
        "transition-transform duration-200",
    );

  const grip = (pane: HistorySidePane, label: string) => (
    <PaneGripHandle
      label={label}
      axis="y"
      tone="card"
      dragging={stack.dragging === pane}
      className="hidden lg:inline-flex"
      {...stack.handleProps(pane)}
    />
  );

  const panes: Record<HistorySidePane, ReactNode> = {
    photo: (
      <HistoryPhotoPane
        key="photo"
        ref={stack.registerPane("photo")}
        listing={listing}
        rowLabel={rowLabel}
        isLoading={isLoading}
        headerAction={grip("photo", "사진")}
        style={stack.paneStyle("photo")}
        className={cn("lg:flex-1", paneClass("photo"))}
      />
    ),
    info: (
      <HistoryInfoPane
        key="info"
        ref={stack.registerPane("info")}
        listing={listing}
        isLoading={isLoading}
        headerAction={grip("info", "개체정보")}
        style={
          {
            ...stack.paneStyle("info"),
            "--info-h": `${infoHeight}px`,
          } as CSSProperties
        }
        className={cn(
          "min-h-[188px] shrink-0 lg:h-[var(--info-h)] lg:min-h-0",
          paneClass("info"),
        )}
      />
    ),
  };

  return (
    <div
      ref={rootRefs}
      style={style}
      className={cn("flex flex-col gap-2 lg:gap-0", className)}
    >
      {/*
       * 좁은 화면에서는 `gap-2` 가 8px 틈을 만들고 눈금은 숨는다. 넓은 화면에서는
       * 그 틈을 눈금이 가져간다 — `gap` 을 둔 채 사이에 눈금을 끼우면 틈이 둘이
       * 되어 8px 이 24px 로 벌어진다.
       */}
      {panes[order[0]]}
      {/*
       * 눈금은 늘 개체정보를 민다 · 사진은 남는 세로를 받으므로 어느 자리에 있든
       * 합이 맞는다. 개체정보가 위에 있으면 눈금이 그 아래를 잡는 셈이라
       * `sizedBelow` 가 거짓이다.
       */}
      <div className="hidden shrink-0 lg:block">
        <RoomStackSplitter
          height={infoHeight}
          sizedBelow={order[1] === "info"}
          defaultHeight={INFO_DEFAULT_HEIGHT}
          label="개체정보 높이"
          onResize={(px) => setInfoHeight(px, maxInfoHeight)}
          onReset={resetInfoHeight}
        />
      </div>
      {panes[order[1]]}
    </div>
  );
}
