"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "react-use";

import {
  EntitySheetTable,
  scrollSheetRowIntoView,
  type SheetSummaryColumn,
} from "@/features/listings/components/EntitySheetTable";
import { fromLiveListing } from "@/features/listings/lib/sheetEntity";
import type { LiveListing } from "../api";
import { matchesGradeFilter } from "../lib/grade";
import { summarizeParts, type PartsSummary } from "../lib/sheetSummary";
import { useSheetCursor } from "../hooks/useSheetCursor";
import { useStickySheetOffsets } from "../hooks/useStickySheetOffsets";
import { SheetFilterBar } from "./SheetFilterBar";
import {
  SheetSummaryPanel,
  SHEET_TABLE_MIN_WIDTH,
  SUMMARY_PANEL_MAX_WIDTH,
  SUMMARY_PANEL_MIN_WIDTH,
} from "./SheetSummaryPanel";
import { SheetResultCells } from "./SheetParts";

/** 우측 결과 열 · 경매내역(`DailyListingsSection`) 과 동일 · 낙찰 n/총 · 총 낙찰대금 · 내 낙찰대금 */
const SUMMARY_COLUMNS: SheetSummaryColumn[] = [
  { label: "낙찰", align: "center", groupStart: true, widthClass: "w-[4.5%]" },
  { label: "총 낙찰대금", align: "right", widthClass: "w-[10.6%]" },
  {
    label: "내 낙찰대금",
    align: "right",
    widthClass: "w-[11%]",
    headClass: "pr-3",
  },
];

export interface LiveListingSheetProps {
  listings: LiveListing[];
  isLoading: boolean;
  dealerId: string | null;
  /** 행 클릭 · 개체 페이지로 넘어간다 */
  onOpenListing: (listingId: string) => void;
  gradeFilter: string;
  companyFilter: string;
  onGradeChange: (v: string) => void;
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
 *  - 개체 행 우측 · 낙찰 n/총 · 총 낙찰대금 · 내 낙찰대금(진행중/미낙찰)
 *  - 행을 누르면 개체 페이지 · 사진·시세·부위별 입찰은 거기서 한 화면에 본다
 *  - 커서가 머문 행은 오른쪽 요약(사진·시세)이 따라간다
 *  - 사진 썸네일은 표 기본 라이트박스로 크게만 본다 · 입찰은 개체 페이지 한 곳에서만 한다
 */
export function LiveListingSheet({
  listings,
  isLoading,
  dealerId,
  onOpenListing,
  gradeFilter,
  companyFilter,
  onGradeChange,
  onCompanyChange,
  companyOptions,
  canShowSummary,
  favoriteIds,
  onToggleFavorite,
}: LiveListingSheetProps) {
  const { filterRef, filterStickyTop, headStickyTop } = useStickySheetOffsets();

  const summaryById = useMemo(
    () =>
      new Map<string, PartsSummary>(
        listings.map((l) => [l.id, summarizeParts(l.parts, dealerId)]),
      ),
    [listings, dealerId],
  );

  const filtered = useMemo(
    () =>
      listings.filter(
        (l) =>
          matchesGradeFilter(gradeFilter, l.grade, l.marblingScore) &&
          (!companyFilter || l.companyName === companyFilter),
      ),
    [listings, gradeFilter, companyFilter],
  );

  const entities = useMemo(() => filtered.map(fromLiveListing), [filtered]);

  /**
   * 짚고 있는 행 · 마우스를 올려도, ↑/↓ 를 눌러도 같은 손가락이 움직인다.
   * 표의 밝은 줄과 오른쪽 요약이 늘 같은 개체를 가리켜야 해서 자리를 하나만 둔다.
   */
  const cursorIds = useMemo(() => filtered.map((l) => l.id), [filtered]);
  const cursor = useSheetCursor({
    ids: cursorIds,
    onOpen: onOpenListing,
    onMove: scrollSheetRowIntoView,
  });

  /** 요약이 가리키는 개체 · 행을 스쳐 지나가는 동안 사진·차트가 따라 튀지 않게 잠깐 묵힌다 */
  const [summaryId, setSummaryId] = useState<string | null>(null);
  useDebounce(() => setSummaryId(cursor.id), 90, [cursor.id]);

  /** 아직 아무 행도 짚지 않았으면 첫 개체를 세워 둔다 (빈 패널 방지) */
  const summaryListing = useMemo(
    () => filtered.find((l) => l.id === summaryId) ?? filtered[0] ?? null,
    [filtered, summaryId],
  );

  return (
    <div className="flex flex-col">
      <div
        ref={filterRef}
        style={{ top: filterStickyTop }}
        className="sticky z-30"
      >
        <SheetFilterBar
          gradeFilter={gradeFilter}
          companyFilter={companyFilter}
          onGradeChange={onGradeChange}
          onCompanyChange={onCompanyChange}
          companyOptions={companyOptions}
        />
      </div>

      <div className="flex">
        {/*
         * 남는 폭은 표와 요약이 3:1 로 나눈다 · 표가 먼저고, 요약은 제 상한까지만.
         *
         * 표가 큰 몫을 갖는 건 열이 16칸이라서다. 3:1 로 받아 가장 넓어지는 자리가
         * 1512px 인데 칸당 94px — 상세 방 표가 9칸에 1000px(칸당 111px)까지 허용하는
         * 것보다 오히려 빡빡하다. 벌어져서 읽기 나빠지는 지점은 아직 멀다.
         */}
        <div
          className="min-w-0 flex-[3]"
          style={
            canShowSummary ? { minWidth: SHEET_TABLE_MIN_WIDTH } : undefined
          }
        >
          <EntitySheetTable
            compact
            stickyHeadTop={headStickyTop}
            onHoverEntity={cursor.set}
            selectedId={cursor.id}
            entities={entities}
            onSelect={onOpenListing}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            isLoading={isLoading}
            emptyMessage={
              listings.length === 0
                ? "오늘 상장된 개체가 없습니다."
                : "필터 조건에 해당하는 개체가 없습니다."
            }
            summaryColumns={SUMMARY_COLUMNS}
            renderSummary={(entity) => {
              const summary = summaryById.get(entity.id);
              return summary ? <SheetResultCells summary={summary} /> : null;
            }}
          />
        </div>

        {canShowSummary ? (
          <aside
            aria-label="개체 요약"
            style={{
              minWidth: SUMMARY_PANEL_MIN_WIDTH,
              maxWidth: SUMMARY_PANEL_MAX_WIDTH,
            }}
            className="flex-1 border-l border-line-soft"
          >
            <div className="sticky" style={{ top: headStickyTop }}>
              <SheetSummaryPanel listing={summaryListing} />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
