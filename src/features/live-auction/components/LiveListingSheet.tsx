"use client";

import { useMemo, useState } from "react";
import { useDebounce, useMeasure } from "react-use";
import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "../constants/surface";

import {
  EntitySheetTable,
  scrollSheetRowIntoView,
} from "@/features/listings/components/EntitySheetTable";
import { fromLiveListing } from "@/features/listings/lib/sheetEntity";
import {
  sortSheetEntities,
  type SheetSort,
} from "@/features/listings/lib/sheetSort";
import type { LiveListing } from "../api";
import { matchesGradeFilter } from "../lib/grade";
import { useSheetCursor } from "../hooks/useSheetCursor";
import { useSheetSummaryPrefs } from "../hooks/useSheetSummaryPrefs";
import { SheetFilterBar } from "./SheetFilterBar";
import {
  maxSummaryPanelWidth,
  shownSummaryPanelWidth,
  SUMMARY_PANEL_DEFAULT_WIDTH,
  SUMMARY_SPLITTER_WIDTH,
  summaryPanelWidthCss,
  TABLE_CARD_SCROLL_MIN_WIDTH,
} from "../lib/sheetLayout";

/** 표가 바닥 폭보다 좁아지면 남는 판정 열을 옆으로 굴린다 (요약 폭을 지키는 대신) */
const TABLE_SCROLL_OPTIONS = { overflow: { x: "scroll" } } as const;
import { SheetSummaryPanel } from "./SheetSummaryPanel";
import { RoomSplitter } from "./RoomSplitter";
import { OverlayScroll } from "@/components/ui/overlay-scroll";

export interface LiveListingSheetProps {
  listings: LiveListing[];
  isLoading: boolean;
  /** 행 클릭 · 개체 페이지로 넘어간다 */
  onOpenListing: (listingId: string) => void;
  gradeFilter: string;
  /** `cattle_listings.gender` 값 그대로 (`거세` · `암`) · 빈 값은 전체 */
  genderFilter: string;
  companyFilter: string;
  onGradeChange: (v: string) => void;
  onGenderChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  companyOptions: string[];
  /** 표를 최소 폭 밑으로 누르지 않고 요약 패널을 세울 자리가 있는지 (부르는 쪽이 섹션 폭을 잰다) */
  canShowSummary: boolean;
  /** 관심으로 찍은 것 · 접수번호 칸 맨 앞 별 */
  favoriteIds: ReadonlySet<string>;
  onToggleFavorite: (listingNo: string) => void;
}

/**
 * 경매장 기본 뷰 · 상장표 · 개체 = 1행인 비교표.
 *
 *  - 탭 줄 · 필터 행 · 표 · 요약이 한 섹션 안에 들어간다 (탭·필터는 부르는 쪽이 얹는다)
 *  - 결과 열(낙찰 · 총 낙찰대금)은 없다 · 결과는 경매내역, 내 입찰은 사이드 메뉴 「내 입찰」 이 맡는다
 *  - 행을 누르면 개체 페이지 · 사진·시세·부위별 입찰은 거기서 한 화면에 본다
 *  - 커서가 머문 행은 오른쪽 요약(사진·시세)이 따라간다 · 사이 선을 끌어 요약 폭을 정한다
 *  - 머리글을 눌러 줄을 다시 세운다 · ↑/↓ 커서와 요약의 첫 개체도 그 차례를 따른다
 *  - 사진 썸네일은 표 기본 라이트박스로 크게만 본다 · 입찰은 개체 페이지 한 곳에서만 한다
 */
export function LiveListingSheet({
  listings,
  isLoading,
  onOpenListing,
  gradeFilter,
  genderFilter,
  companyFilter,
  onGradeChange,
  onGenderChange,
  onCompanyChange,
  companyOptions,
  canShowSummary,
  favoriteIds,
  onToggleFavorite,
}: LiveListingSheetProps) {
  const filtered = useMemo(
    () =>
      listings.filter(
        (l) =>
          matchesGradeFilter(gradeFilter, l.grade, l.marblingScore) &&
          (!genderFilter || l.gender === genderFilter) &&
          (!companyFilter || l.companyName === companyFilter),
      ),
    [listings, gradeFilter, genderFilter, companyFilter],
  );

  const [sort, setSort] = useState<SheetSort | null>(null);
  const entities = useMemo(
    () => sortSheetEntities(filtered.map(fromLiveListing), sort),
    [filtered, sort],
  );

  /**
   * 짚고 있는 행 · 마우스를 올려도, ↑/↓ 를 눌러도 같은 손가락이 움직인다.
   * 표의 밝은 줄과 오른쪽 요약이 늘 같은 개체를 가리켜야 해서 자리를 하나만 둔다.
   */
  const cursorIds = useMemo(() => entities.map((e) => e.id), [entities]);
  const cursor = useSheetCursor({
    ids: cursorIds,
    onOpen: onOpenListing,
    onMove: scrollSheetRowIntoView,
    /*
     * 커서는 UUID 로 줄을 짚지만 개체 관심은 접수번호로 담는다 (부위는 UUID) —
     * 여기서 한 번 바꿔 끼운다. 그냥 넘기면 없는 열쇠로 별이 켜져 표에는 아무 변화가 없다.
     */
    onFavorite: (id) => {
      const listing = filtered.find((l) => l.id === id);
      if (listing) onToggleFavorite(listing.listingNo);
    },
  });

  /** 요약이 가리키는 개체 · 행을 스쳐 지나가는 동안 사진·차트가 따라 튀지 않게 잠깐 묵힌다 */
  const [summaryId, setSummaryId] = useState<string | null>(null);
  useDebounce(() => setSummaryId(cursor.id), 90, [cursor.id]);

  /*
   * 요약 카드 폭 · 잡아 둔 값은 그대로 두고 그릴 때 줄 폭 안으로 깎는다 (`summaryPanelWidthCss`).
   * 끄는 동안에는 지금 그려진 폭에서 출발해야 손과 눈금이 같이 움직인다 — 줄 폭을 재는 까닭이다.
   */
  const [rowRef, { width: rowWidth }] = useMeasure<HTMLDivElement>();
  const storedPanelWidth = useSheetSummaryPrefs((s) => s.panelWidth);
  const setPanelWidth = useSheetSummaryPrefs((s) => s.setPanelWidth);
  const resetPanelWidth = useSheetSummaryPrefs((s) => s.resetPanelWidth);
  const panelMax = maxSummaryPanelWidth(rowWidth);
  const panelWidth = shownSummaryPanelWidth(storedPanelWidth, rowWidth);
  /* 요약 카드 안 높이 · 스크롤 틀 안에서는 `h-full` 이 먹지 않아 재서 내려준다 (차트가 남는 세로를 쓴다) */
  const [summaryRef, { height: summaryHeight }] = useMeasure<HTMLElement>();

  /** 아직 아무 행도 짚지 않았으면 맨 윗줄 개체를 세워 둔다 (빈 패널 방지) */
  const summaryListing = useMemo(
    () =>
      filtered.find((l) => l.id === summaryId) ??
      filtered.find((l) => l.id === cursorIds[0]) ??
      null,
    [filtered, summaryId, cursorIds],
  );

  /*
   * 상장표 카드 · 필터 아래 표가 한 통 안에서 구른다.
   *
   * 창이 아니라 여기가 구르므로 막대는 표 바로 옆에 서고, 머리글은 이 통 안에서 `top-0`
   * 에 붙는다 — 통이 곧 보이는 영역이라 붙을 높이를 잴 것이 없다.
   */
  const tableCard = (
    <section
      aria-label="상장표"
      className={cn("flex min-h-0 min-w-0 flex-col", SURFACE_SHELL_CLASS)}
    >
      <div className="shrink-0">
        <SheetFilterBar
          gradeFilter={gradeFilter}
          genderFilter={genderFilter}
          companyFilter={companyFilter}
          onGradeChange={onGradeChange}
          onGenderChange={onGenderChange}
          onCompanyChange={onCompanyChange}
          companyOptions={companyOptions}
        />
      </div>
      <OverlayScroll
        autoHideDelay={0}
        options={TABLE_SCROLL_OPTIONS}
        className="min-h-0 flex-1"
      >
        <EntitySheetTable
          compact
          stickyHeadTop={0}
          onHoverEntity={cursor.set}
          selectedId={cursor.id}
          entities={entities}
          onSelect={onOpenListing}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          sort={sort}
          onSortChange={setSort}
          isLoading={isLoading}
          emptyMessage={
            listings.length === 0
              ? "오늘 상장된 개체가 없습니다."
              : "필터 조건에 해당하는 개체가 없습니다."
          }
        />
      </OverlayScroll>
    </section>
  );

  /*
   * 상장표 · 눈금 · 요약 · 개체 상세 방과 같은 짜임이다 (따로 선 카드 둘 + 사이 8px 눈금).
   *
   * 요약이 px 를 쥐고 표는 남는 폭을 가져간다. 사이드 메뉴를 펴면 줄어든 몫을 표가 먼저
   * 떠안아 열 사이 틈부터 좁히고, 표가 바닥 폭(`TABLE_CARD_MIN_WIDTH`)에 닿은 뒤에야
   * 요약이 준다 — 그것도 바닥(`SUMMARY_PANEL_MIN_WIDTH`)까지만. 그보다 좁은 창에서는
   * 표가 다시 좁아지며(`TABLE_CARD_SCROLL_MIN_WIDTH` 까지) 뒤쪽 판정 열을 옆으로 굴린다.
   *
   * 줄 높이를 화면에 묶는다(`minmax(0, 1fr)`) · 두 카드가 제각각 구르고, 눈금 손잡이는
   * 늘 보이는 높이 한가운데에 선다.
   */
  return (
    <div
      ref={rowRef}
      className="grid min-h-0 flex-1"
      style={{
        gridTemplateRows: "minmax(0, 1fr)",
        gridTemplateColumns: canShowSummary
          ? `minmax(${TABLE_CARD_SCROLL_MIN_WIDTH}px, 1fr) ${SUMMARY_SPLITTER_WIDTH}px ${summaryPanelWidthCss(storedPanelWidth)}`
          : "minmax(0, 1fr)",
      }}
    >
      {tableCard}
      {canShowSummary ? (
        <RoomSplitter
          size={panelWidth}
          sizedOnLeft={false}
          defaultSize={SUMMARY_PANEL_DEFAULT_WIDTH}
          label="상장표와 사진·시세 사이 너비"
          onResize={(px) => setPanelWidth(Math.min(px, panelMax))}
          onReset={resetPanelWidth}
        />
      ) : null}
      {canShowSummary ? (
        <aside
          ref={summaryRef}
          aria-label="개체 요약"
          className={cn("flex min-h-0 min-w-0 flex-col", SURFACE_SHELL_CLASS)}
        >
          <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
            <SheetSummaryPanel
              listing={summaryListing}
              availableHeight={summaryHeight}
            />
          </OverlayScroll>
        </aside>
      ) : null}
    </div>
  );
}
