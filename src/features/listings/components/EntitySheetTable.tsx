"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { ArrowUp, ChevronRight, ImageOff, Star } from "lucide-react";
import { useMeasure } from "react-use";
import { sum } from "es-toolkit";
import { cn } from "@/lib/utils";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { formatKrw } from "@/features/live-auction/lib/masking";
import {
  ImageLightbox,
  type GalleryItem,
} from "@/features/live-auction/components/ListingImageGallery";
import type { SheetEntity, SheetFocus } from "../lib/sheetEntity";
import {
  COMPACT_COLUMN_PX,
  COMPACT_EXPAND_COLUMN_PX,
  spreadColumns,
} from "../lib/sheetColumns";
import {
  describeSheetSort,
  nextSheetSort,
  type SheetSort,
  type SheetSortKey,
} from "../lib/sheetSort";

/** 그룹 첫 열 · 얇은 좌측 구분선 (헤더·바디 공통) · 개체 / 등급판정 / 상장 / 결과 */
export const SHEET_GROUP_START = "border-l border-line pl-3";
/**
 * 머리글은 값보다 약하게 · 브라우저 기본 `th { font-weight: bold }` 는 thead 상속을 이기므로
 * 굵기를 th 에 직접 건다. 굵은 쪽이 데이터여야 표가 또렷하게 읽힌다.
 */
export const SHEET_HEAD =
  "whitespace-nowrap border-b border-line px-2 py-2 text-center font-medium";
export const SHEET_CELL =
  "whitespace-nowrap px-2 py-1.5 align-middle tabular-nums";
/**
 * 펼침 영역 부위 미니표 · 머리글과 칸.
 *
 * 개체 하나를 펼쳐 부위를 늘어놓는 자리는 두 군데다 — 경매장 상세 방(`SheetPartGrid`)
 * 과 경매내역 상장표(`PartsColumns`). 같은 일을 하는 표라 글자 크기도 여백도 같아야
 * 하는데, 한쪽은 11px 가운데 정렬에 `py-[7px]`, 다른 쪽은 12px 에 `py-[6px]` 이었다.
 */
export const SHEET_PART_HEAD =
  "whitespace-nowrap border-b border-line bg-surface-muted px-1 py-1.5 text-[12px] font-medium text-content-faint";
export const SHEET_PART_CELL =
  "whitespace-nowrap px-1 py-[6px] align-middle tabular-nums";
const QUALITY_CELL = cn(SHEET_CELL, "text-center text-content-mid");
/**
 * 경매장 상장표(`compact`) 칸 여백 · 정렬 갈래마다 하나씩 · 표가 바닥 폭일 때의 최소 틈이다.
 *
 * 왼쪽에 붙는 칸은 별+사진+접수번호 하나뿐이다 — 표 테두리 쪽 12px, 다음 칸 쪽 6px.
 * 나머지는 모두 가운데 정렬이라(등급 · 축종 · 성별 · 개월 · 상장업체 6px · 등급판정 일곱 4px)
 * 남는 폭이 양쪽에 저절로 나뉘어 여백이 된다. 바닥 폭에서 이웃한 값 사이 틈은 12px,
 * 표가 넓어지면 열마다 같은 몫이 얹혀 다 같이 벌어진다 (`COMPACT_COLUMN_PX`).
 * 전에는 칸마다 6 · 4 · 8 이 섞여 틈이 칸 따라 들쑥날쑥했다.
 *
 * 등급과 상장업체는 길이가 들쭉날쭉한 글자라도 가운데에 둔다. 왼쪽에 붙이면 짧은 값
 * (`2B(3)` · 세 자 업체) 뒤로 빈 폭이 한쪽에만 몰려, 가운데 칸 사이에서 그 둘만 틈이 커 보인다.
 *
 * 그룹 경계(상장업체 | 근내지방)는 선만 긋고 들여쓰지 않는다 — 가운데 칸을 들여쓰면
 * 숫자가 칸 한가운데서 벗어나, 고르게 세운 일곱의 간격이 첫 칸에서만 어긋난다.
 */
const DENSE_TEXT_CELL = "pl-3 pr-1.5";
const DENSE_CELL = "px-1.5";
const QUALITY_TIGHT = "px-1";
const DENSE_GROUP_START = "border-l border-line";

/**
 * 단위(원 · mm · ㎠)와 분모 글자.
 *
 * 경매장 상장표(`compact`)는 큰 글씨다 — 실무자 시연에서 중도매인 연령대에 13px 이 작다는
 * 말이 나와 본문을 15px 로 올렸다. 흐린 회색(`content-faint`)은 흰 바탕에서 3:1 남짓이라
 * 글자를 키워도 여전히 안 읽혀 한 단계 진한 `content-soft`(5:1)로 같이 올린다.
 */
const unitTextClass = (large: boolean) =>
  large
    ? "text-[12.5px] font-medium text-content-soft"
    : "text-[11px] font-medium text-content-faint";

/** 행 표식 · 값은 개체 id · 키보드로 짚은 줄을 찾아 굴릴 때 쓴다 */
const SHEET_ROW_ATTR = "data-sheet-row";

/**
 * 그 개체의 행을 보이는 데까지 굴린다 · 찾았으면 `true`.
 *
 * 멈출 자리는 행이 들고 있는 `scroll-margin-top` 이 정한다 — 고정 머리글 밑으로
 * 기어들어 가지 않게 표가 이미 재어 둔 값이다.
 */
export function scrollSheetRowIntoView(entityId: string): boolean {
  const row = document.querySelector(
    `[${SHEET_ROW_ATTR}="${CSS.escape(entityId)}"]`,
  );
  if (!row) return false;
  row.scrollIntoView({ block: "nearest" });
  return true;
}

const QUALITY_COLUMN_COUNT = 7;
/**
 * 넓은 표(경매내역) 등급판정 7열 폭 · 근내지방 · 육색 · 지방색 · 조직도 · 성숙도 · 등지방두께 · 등심면적.
 * `compact` 는 비율이 아니라 px 바닥 폭에 남는 폭을 똑같이 얹는다 (`COMPACT_COLUMN_PX`).
 */
const QUALITY_WIDTHS = [
  "w-[4.4%]",
  "w-[3.1%]",
  "w-[3.7%]",
  "w-[3.7%]",
  "w-[3.7%]",
  "w-[5.2%]",
  "w-[4.4%]",
] as const;
/** 등급판정 일곱 머리글 · 칸 차례와 같다 · 첫 칸 앞에 그룹 경계선이 선다 */
const QUALITY_HEADS: ReadonlyArray<{ label: string; sortKey: SheetSortKey }> = [
  { label: "근내지방", sortKey: "marblingScore" },
  { label: "육색", sortKey: "meatColor" },
  { label: "지방색", sortKey: "fatColor" },
  { label: "조직도", sortKey: "texture" },
  { label: "성숙도", sortKey: "maturity" },
  { label: "등지방두께", sortKey: "backFat" },
  { label: "등심면적", sortKey: "eyeMuscle" },
];
/** 머리글 높이 · 초점 이동으로 스크롤할 때 고정 머리글 밑에 행이 숨지 않도록 여유를 준다 */
const STICKY_HEAD_HEIGHT = 36;
const EMPTY_EXPANDED: ReadonlySet<string> = new Set();
const NO_SUMMARY_COLUMNS: SheetSummaryColumn[] = [];

export interface SheetSummaryColumn {
  label: string;
  align: "left" | "center" | "right";
  /** 이 열 앞에 그룹 구분선 */
  groupStart?: boolean;
  /** `w-[7.5%]` 같은 colgroup 폭 클래스 · 넓은 표(경매내역)용 */
  widthClass?: string;
  /** 바닥 폭 px · `compact` 표용 · 남는 폭은 본문 열과 똑같이 나눠 받는다 */
  basePx?: number;
  /** 마지막 열 우측 여백 등 헤더 추가 클래스 */
  headClass?: string;
}

export interface EntitySheetTableProps {
  entities: SheetEntity[];
  /** 펼친 개체 · `renderExpanded` 와 함께 쓴다 */
  expanded?: ReadonlySet<string>;
  onToggle?: (id: string) => void;
  /**
   * 행 클릭 · 펼침과 함께 호출된다.
   * `renderExpanded` 없이 쓰면 행은 펼치지 않고 이것만 부른다 (경매장 → 개체 페이지 이동).
   */
  onSelect?: (id: string) => void;
  /** 강조할 개체(경매장 선택 개체) */
  selectedId?: string | null;
  focus?: SheetFocus | null;
  /**
   * 경매장 상장표용 · 도축장/도축일 열 제거(당일 한 도축장) · 나머지 열 구성은 경매내역과 동일.
   * 글자는 오히려 크다 (본문 15px · 사진 48px · 행 64px) — 이름은 열이 적다는 뜻이다.
   */
  compact?: boolean;
  /**
   * 우측 결과/요약 열 정의 · 셀은 `renderSummary` 가 같은 순서로 `<td>` 를 돌려준다.
   * 경매장 상장표는 두지 않는다 — 낙찰 결과는 경매내역이 맡는다.
   */
  summaryColumns?: SheetSummaryColumn[];
  renderSummary?: (entity: SheetEntity) => ReactNode;
  /** 펼침 영역 · 부위 표 등 · `flashPartNo` 는 focus 로 진입한 부위 번호(2.2초) */
  renderExpanded?: (
    entity: SheetEntity,
    ctx: { flashPartNo: number | null },
  ) => ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  /** 표 최소 폭 · 기본 1200px (경매내역) · compact 는 900px */
  minWidthClass?: string;
  /**
   * 머리글을 화면 위 이 위치(px)에 고정 · 경매장 상장표용.
   * 가로 스크롤 컨테이너 안에서는 sticky 가 먹지 않아, 지정하면 가로 스크롤을 두지 않는다
   * (표가 영역보다 좁을 때만 쓴다 · compact 900px < 1280 화면 표 영역 1214px).
   */
  stickyHeadTop?: number;
  /**
   * 사진 썸네일 클릭을 가로챈다 · 지정하면 내장 라이트박스 대신 이걸 부른다.
   * 경매장은 개체 뷰어 다이얼로그를 띄우고, 경매내역은 지정하지 않아 라이트박스를 그대로 쓴다.
   */
  onOpenPhotos?: (entityId: string) => void;
  /** 행 hover · 옆 요약 패널이 그 개체를 따라간다 */
  onHoverEntity?: (entityId: string) => void;
  /**
   * 관심으로 찍은 것 · 주면 접수번호 칸 맨 앞에 별이 붙는다 (`compact` 전용).
   * 머리글에는 아무것도 적지 않는다 — 별 하나면 무슨 열인지 이미 읽힌다.
   *
   * 접수번호로만 찍어 본다. 경매장에서는 부위 관심(UUID)도 같은 집합에 섞여 오는데,
   * 생김새가 겹치지 않아 여기서는 없는 것과 같다.
   */
  favoriteIds?: ReadonlySet<string>;
  onToggleFavorite?: (listingNo: string) => void;
  /**
   * 열 머리글 정렬 · `onSortChange` 를 주면 머리글이 정렬 단추가 된다 · `null` 은 원래대로.
   * 표는 받은 차례대로 그릴 뿐이고, 줄을 세우는 건 부르는 쪽이다 (`sortSheetEntities`) —
   * ↑/↓ 커서와 오른쪽 요약도 같은 차례를 따라야 하기 때문이다.
   */
  sort?: SheetSort | null;
  onSortChange?: (next: SheetSort | null) => void;
  className?: string;
}

/**
 * 개체 비교표 · 헤더 1번 · 개체 = 1행 · 등급판정 7항목이 열로 정렬돼 접기 전에 비교 가능.
 *
 * - 비율 폭 컬럼 · 정렬 규칙 (식별·텍스트 좌 · 범주/점수 중앙 · 금액 우) · 그룹 경계에 얇은 세로선
 * - 강조 위계: 접수번호 bold > 등급·근내 semibold > 나머지 regular
 * - 행 클릭 → 바로 아래로 펼침 영역(부위 표) · 개체 정보는 행에 이미 있으니 다시 그리지 않는다
 * - 사진은 인라인으로 펼치지 않고 썸네일 클릭 → 전체화면 뷰어
 * - 경매내역(`DailyListingsSection`)·경매장 상장표(`LiveListingSheet`) 공용 · 결과 열과 펼침 영역만 화면별로 주입
 */
export function EntitySheetTable({
  entities,
  expanded = EMPTY_EXPANDED,
  onToggle,
  onSelect,
  selectedId = null,
  focus = null,
  compact = false,
  summaryColumns = NO_SUMMARY_COLUMNS,
  renderSummary,
  renderExpanded,
  isLoading = false,
  emptyMessage = "상장된 개체가 없습니다.",
  minWidthClass,
  stickyHeadTop,
  onOpenPhotos,
  onHoverEntity,
  favoriteIds,
  onToggleFavorite,
  sort,
  onSortChange,
  className,
}: EntitySheetTableProps) {
  const isStickyHead = stickyHeadTop != null;
  /** 펼침이 없으면 화살표 열 자체를 두지 않는다 · 행은 다른 화면으로 가는 링크다 */
  const expandable = !!renderExpanded;
  const textCell = compact ? DENSE_TEXT_CELL : undefined;
  const labelCell = compact ? cn(DENSE_CELL, "text-center") : "text-left";
  const dense = compact ? DENSE_CELL : undefined;
  const quality = compact ? QUALITY_TIGHT : undefined;
  const groupStart = compact ? DENSE_GROUP_START : SHEET_GROUP_START;
  const sorting = onSortChange
    ? { sort: sort ?? null, onChange: onSortChange }
    : null;
  const [lightbox, setLightbox] = useState<SheetEntity | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [measureRef, { width: measuredWidth }] = useMeasure<HTMLDivElement>();
  const compactBase = useMemo(
    () =>
      compact
        ? [
            ...(expandable ? [COMPACT_EXPAND_COLUMN_PX] : []),
            ...COMPACT_COLUMN_PX,
            ...summaryColumns.map((c) => c.basePx ?? 0),
          ]
        : null,
    [compact, expandable, summaryColumns],
  );
  const compactWidths = compactBase
    ? spreadColumns(compactBase, measuredWidth)
    : null;
  const lightboxItems = useMemo<GalleryItem[]>(
    () =>
      (lightbox?.images ?? []).map((src) => ({
        kind: "photo",
        src,
        label: null,
      })),
    [lightbox],
  );

  const baseColumnCount =
    (expandable ? 1 : 0) +
    (compact ? 5 + QUALITY_COLUMN_COUNT + 1 : 1 + 5 + QUALITY_COLUMN_COUNT + 2);
  const totalColumnCount = baseColumnCount + summaryColumns.length;

  if (isLoading) {
    return (
      <div className={cn("divide-y divide-line-soft", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 animate-pulse bg-surface-accent" />
            <div className="h-4 flex-1 animate-pulse bg-surface-accent" />
          </div>
        ))}
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div
        className={cn(
          "px-4 py-14 text-center text-[13px] text-content-faint",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={compact ? measureRef : undefined}
      className={cn(!isStickyHead && "overflow-x-auto", className)}
    >
      <table
        style={
          compactBase && !minWidthClass
            ? { minWidth: sum(compactBase) }
            : undefined
        }
        className={cn(
          "w-full table-fixed font-semibold text-content",
          compact ? "text-[15px]" : "text-[13px]",
          minWidthClass ?? (compact ? undefined : "min-w-[1200px]"),
        )}
      >
        {/*
         * compact · px 바닥 폭 + 남는 폭을 똑같이 (`spreadColumns`)
         * 넓은 표 · 비율 폭 (합 ≈ 100%)
         */}
        <colgroup>
          {compactWidths ? (
            compactWidths.map((px, i) => <col key={i} style={{ width: px }} />)
          ) : (
            <>
              {expandable ? <col className="w-[2.2%]" /> : null}
              <col className="w-[3.7%]" />
              <col className="w-[9.5%]" />
              <col className="w-[6%]" />
              <col className="w-[3.5%]" />
              <col className="w-[3.5%]" />
              <col className="w-[3.5%]" />
              <col className="w-[8.6%]" />
              {QUALITY_WIDTHS.map((w, i) => (
                <col key={i} className={w} />
              ))}
              <col className="w-[11.6%]" />
              {summaryColumns.map((c) => (
                <col key={c.label} className={c.widthClass} />
              ))}
            </>
          )}
        </colgroup>
        <thead
          style={isStickyHead ? { top: stickyHeadTop } : undefined}
          className={cn(
            "bg-surface-muted font-medium",
            compact
              ? "text-[13px] text-content-soft"
              : "text-[12px] text-content-faint",
            isStickyHead && "sticky z-10",
          )}
        >
          <tr>
            {expandable ? (
              <th className={cn(SHEET_HEAD, "px-1")} aria-label="펼침" />
            ) : null}
            {compact ? (
              <SheetHead
                label="접수번호"
                sortKey="listingNo"
                sorting={sorting}
                className={cn(SHEET_HEAD, textCell, "text-left")}
              />
            ) : (
              <>
                <th className={cn(SHEET_HEAD, "px-1")}>사진</th>
                <SheetHead
                  label="접수번호"
                  sortKey="listingNo"
                  sorting={sorting}
                  className={cn(SHEET_HEAD, groupStart, "text-left")}
                />
              </>
            )}
            <SheetHead
              label="등급"
              sortKey="grade"
              sorting={sorting}
              className={cn(SHEET_HEAD, labelCell)}
            />
            <SheetHead
              label="축종"
              sortKey="breed"
              sorting={sorting}
              className={cn(SHEET_HEAD, dense)}
            />
            <SheetHead
              label="성별"
              sortKey="gender"
              sorting={sorting}
              className={cn(SHEET_HEAD, dense)}
            />
            <SheetHead
              label="개월"
              sortKey="monthAge"
              sorting={sorting}
              className={cn(SHEET_HEAD, dense)}
            />
            <SheetHead
              label="상장업체"
              sortKey="companyName"
              sorting={sorting}
              className={cn(SHEET_HEAD, labelCell)}
            />
            {QUALITY_HEADS.map((head, i) => (
              <SheetHead
                key={head.sortKey}
                label={head.label}
                sortKey={head.sortKey}
                sorting={sorting}
                className={cn(SHEET_HEAD, i === 0 && groupStart, quality)}
              />
            ))}
            {compact ? null : (
              <th className={cn(SHEET_HEAD, groupStart, "text-left")}>
                도축장 · 도축일
              </th>
            )}
            {summaryColumns.map((c) => (
              <th
                key={c.label}
                className={cn(
                  SHEET_HEAD,
                  c.groupStart && groupStart,
                  c.align === "left" && "text-left",
                  c.align === "right" && "text-right",
                  c.headClass,
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entities.map((entity) => (
            <EntityRows
              key={entity.id}
              entity={entity}
              compact={compact}
              open={expanded.has(entity.id)}
              selected={entity.id === selectedId}
              focus={focus?.listingNo === entity.listingNo ? focus : null}
              colSpan={totalColumnCount}
              scrollMarginTop={
                isStickyHead ? stickyHeadTop + STICKY_HEAD_HEIGHT : undefined
              }
              onToggle={() => {
                onToggle?.(entity.id);
                onSelect?.(entity.id);
              }}
              onHover={
                onHoverEntity ? () => onHoverEntity(entity.id) : undefined
              }
              onOpenPhotos={() => {
                if (onOpenPhotos) {
                  onOpenPhotos(entity.id);
                  return;
                }
                setLightboxIdx(0);
                setLightbox(entity);
              }}
              opensDetail={!!onOpenPhotos}
              favorited={favoriteIds ? favoriteIds.has(entity.listingNo) : null}
              onToggleFavorite={
                onToggleFavorite
                  ? () => onToggleFavorite(entity.listingNo)
                  : undefined
              }
              renderSummary={renderSummary}
              renderExpanded={renderExpanded}
            />
          ))}
        </tbody>
      </table>

      {lightbox && lightboxItems.length > 0 ? (
        <ImageLightbox
          items={lightboxItems}
          activeIdx={lightboxIdx}
          onActiveIdxChange={setLightboxIdx}
          listingNo={lightbox.listingNo}
          isSample={false}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}

/* ───────────────────────── 머리글 · 정렬 단추 ───────────────────────── */

/**
 * 열 머리글 · `sorting` 을 주면 칸 전체가 정렬 단추다.
 *
 * 누를 때마다 첫 방향 → 반대 방향 → 원래대로(접수번호 순)를 돈다 (`nextSheetSort`).
 * 손을 올려도 아무것도 바뀌지 않는다 — 머리글 줄에서 칸마다 배경이 켜졌다 꺼지면 표보다
 * 머리글이 먼저 눈에 걸린다. 무엇을 할지는 말풍선이 알려 준다.
 *
 * 화살표는 정렬한 열에만 선다. 열세 칸에 다 세워 두면 머리글 줄이 화살표로 덮이고, 칸마다
 * 화살표 몫(≈10px)을 비워 둬야 해 표가 그만큼 덜 줄어든다 — 사이드 메뉴를 폈을 때 사진 ·
 * 시세가 그 폭을 떠안는다. 방향이 바뀔 때는 같은 화살표가 뒤집히며 돈다.
 *
 * 화살표는 글자 옆에 붙어 칸 가운데에 함께 선다. 칸 밖으로 매달면 바닥 폭(이웃 글자까지
 * 12px)에서 이웃 머리글에 닿는다.
 */
function SheetHead({
  label,
  sortKey,
  sorting,
  className,
}: {
  label: string;
  sortKey: SheetSortKey;
  sorting: {
    sort: SheetSort | null;
    onChange: (next: SheetSort | null) => void;
  } | null;
  className: string;
}) {
  if (!sorting) return <th className={className}>{label}</th>;

  const active = sorting.sort?.key === sortKey ? sorting.sort : null;
  const next = nextSheetSort(sorting.sort, sortKey);

  return (
    <th
      aria-sort={
        active
          ? active.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={cn(className, "relative", active && "text-content")}
    >
      <button
        type="button"
        onClick={() => sorting.onChange(next)}
        title={
          next
            ? `${describeSheetSort(label, next)}으로 정렬`
            : "원래대로 (접수번호 순)"
        }
        className="inline-flex items-center outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-content-faint"
      >
        {label}
        {active ? (
          <ArrowUp
            aria-hidden
            strokeWidth={2.5}
            className={cn(
              "-mr-[2.5px] ml-px h-3 w-3 shrink-0 transition-transform duration-200",
              active.direction === "desc" && "rotate-180",
            )}
          />
        ) : null}
      </button>
    </th>
  );
}

/* ───────────────────────── 개체 행 + 펼침 행 ───────────────────────── */

function EntityRows({
  entity,
  compact,
  open,
  selected,
  focus,
  colSpan,
  scrollMarginTop,
  onToggle,
  onHover,
  onOpenPhotos,
  opensDetail,
  favorited,
  onToggleFavorite,
  renderSummary,
  renderExpanded,
}: {
  opensDetail: boolean;
  entity: SheetEntity;
  compact: boolean;
  open: boolean;
  selected: boolean;
  focus: SheetFocus | null;
  colSpan: number;
  /** 머리글 고정 시 · 초점 스크롤이 멈출 위치 (기본 `scroll-mt-32`) */
  scrollMarginTop?: number;
  onToggle: () => void;
  onHover?: () => void;
  onOpenPhotos: () => void;
  /** `null` 이면 관심을 쓰지 않는 화면 · 별 자체를 그리지 않는다 */
  favorited: boolean | null;
  onToggleFavorite?: () => void;
  renderSummary?: (entity: SheetEntity) => ReactNode;
  renderExpanded?: (
    entity: SheetEntity,
    ctx: { flashPartNo: number | null },
  ) => ReactNode;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [flashPartNo, setFlashPartNo] = useState<number | null>(null);
  /** 펼침 영역이 없으면 행은 다른 화면으로 가는 링크 · 화살표도 돌지 않는다 */
  const expandable = !!renderExpanded;
  const textCell = compact ? DENSE_TEXT_CELL : undefined;
  const labelCell = compact ? cn(DENSE_CELL, "text-center") : "text-left";
  const dense = compact ? DENSE_CELL : undefined;
  const quality = compact ? QUALITY_TIGHT : undefined;
  const groupStart = compact ? DENSE_GROUP_START : SHEET_GROUP_START;

  const gradeLabel = formatGradeLabel(entity.grade, entity.marblingScore);
  const cover = entity.images[0] ?? null;

  // 초점 · 펼쳐진 뒤 스크롤 + 부위 행 2초 강조
  useEffect(() => {
    if (!focus || !open) return;
    const el = rowRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setFlashPartNo(focus.partNo);
    const t = window.setTimeout(() => setFlashPartNo(null), 2200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [focus, open]);

  const slaughter = [
    entity.slaughterHouse,
    entity.slaughterDate ? shortDate(entity.slaughterDate) : null,
  ]
    .filter(Boolean)
    .join(" ");

  const thumb = (
    <SheetThumb
      src={cover}
      alt={`${entity.listingNo} 등심 단면`}
      opensDetail={opensDetail}
      onClick={(e) => {
        e.stopPropagation();
        onOpenPhotos();
      }}
      className={compact ? "mx-0 h-12 w-12" : undefined}
    />
  );

  return (
    <Fragment>
      <tr
        ref={rowRef}
        {...{ [SHEET_ROW_ATTR]: entity.id }}
        onClick={onToggle}
        onMouseEnter={onHover}
        onFocus={onHover}
        aria-expanded={expandable ? open : undefined}
        aria-selected={selected}
        style={scrollMarginTop != null ? { scrollMarginTop } : undefined}
        className={cn(
          "scroll-mt-32 cursor-pointer border-b border-line-soft transition-colors hover:bg-surface-muted/70",
          open && "bg-surface-muted/60",
          selected && "bg-surface-accent hover:bg-surface-accent",
        )}
      >
        {expandable ? (
          <td className={cn(SHEET_CELL, "px-1 text-center")}>
            <ChevronRight
              className={cn(
                "mx-auto h-3.5 w-3.5 text-content-faint transition-transform",
                open && "rotate-90",
              )}
              aria-hidden
            />
          </td>
        ) : null}
        {compact ? (
          /* 행 높이는 이 칸이 정한다 · 사진 48 + 위아래 8 = 64px */
          <td className={cn(SHEET_CELL, textCell, "py-2")}>
            <span className="flex items-center gap-1.5">
              {favorited != null && onToggleFavorite ? (
                <FavoriteStar
                  on={favorited}
                  listingNo={entity.listingNo}
                  onToggle={onToggleFavorite}
                />
              ) : null}
              {thumb}
              <span className="font-bold -tracking-[0.02em] text-content">
                {entity.listingNo}
              </span>
            </span>
          </td>
        ) : (
          <>
            <td className={cn(SHEET_CELL, "px-1")}>{thumb}</td>
            <td
              className={cn(
                SHEET_CELL,
                groupStart,
                "text-left font-bold -tracking-[0.02em] text-content",
              )}
            >
              {entity.listingNo}
            </td>
          </>
        )}
        {/*
         * 위계는 세 단 · 어느 개체인지(접수번호 · 등급)는 굵은 먹색, 나머지 값은 한 가지
         * 회색 · 단위와 머리글은 한 단 작고 옅게. 경매장 표에서는 근내지방만 따로 띄우지
         * 않는다 — 그 점수는 등급 괄호 `1++A(9)` 에 이미 굵게 서 있다.
         */}
        <td
          className={cn(
            SHEET_CELL,
            labelCell,
            "text-content",
            compact ? "font-bold" : "font-semibold",
          )}
        >
          {gradeLabel}
        </td>
        <td className={cn(SHEET_CELL, dense, "text-center text-content-mid")}>
          {dash(entity.breed)}
        </td>
        <td className={cn(SHEET_CELL, dense, "text-center text-content-mid")}>
          {dash(entity.gender)}
        </td>
        <td className={cn(SHEET_CELL, dense, "text-center text-content-mid")}>
          {dash(entity.monthAge)}
        </td>
        <td className={cn(SHEET_CELL, labelCell, "truncate text-content-mid")}>
          {entity.companyName || "-"}
        </td>
        <td
          className={cn(
            QUALITY_CELL,
            groupStart,
            quality,
            !compact && "font-semibold text-content",
          )}
        >
          {dash(entity.marblingScore)}
        </td>
        <td className={cn(QUALITY_CELL, quality)}>{dash(entity.meatColor)}</td>
        <td className={cn(QUALITY_CELL, quality)}>{dash(entity.fatColor)}</td>
        <td className={cn(QUALITY_CELL, quality)}>{dash(entity.texture)}</td>
        <td className={cn(QUALITY_CELL, quality)}>{dash(entity.maturity)}</td>
        <td className={cn(QUALITY_CELL, quality)}>
          <UnitValue value={entity.backFat} unit="mm" large={compact} />
        </td>
        <td className={cn(QUALITY_CELL, quality)}>
          <UnitValue value={entity.eyeMuscle} unit="㎠" large={compact} />
        </td>
        {compact ? null : (
          <td
            className={cn(
              SHEET_CELL,
              SHEET_GROUP_START,
              "text-left text-content-mid",
            )}
          >
            {slaughter || "-"}
          </td>
        )}
        {renderSummary?.(entity)}
      </tr>

      {open && renderExpanded ? (
        <tr className="border-b border-line bg-surface-muted/40">
          <td colSpan={colSpan} className="px-4 pb-4 pt-2.5">
            {renderExpanded(entity, { flashPartNo })}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

/**
 * 관심 별 · 접수번호 칸 맨 앞.
 *
 * 열을 따로 세우지 않았다. 세우면 머리글 한 칸이 비고, 빈 머리글은 「여기 뭔가 빠졌나」로
 * 읽힌다. 접수번호 칸 맨 앞에 두면 칸 폭이 고정이라 별이 세로로 저절로 줄을 맞춘다.
 *
 * 이 표에서 색을 쓰는 자리는 여기뿐이다. 스무 줄이 넘는 무채색 표에서 찍어 둔 개체를
 * 찾아내는 게 별이 할 일인데, 무채색으로 두면 바로 옆 접수번호(`text-content` 굵게)와
 * 같은 색이라 채워도 티가 안 난다 — 훑다가 걸리라고 만든 표식이 훑어서는 안 보였다.
 *
 * 하트가 아니라 별인 건 나머지 화면과 맞추기 위해서다 (`/auction` · `/` 의 관심 버튼도
 * 별이다). 하트는 「좋아요」 로 읽혀서, 값을 재고 담아 두는 화면과는 결이 다르다.
 */
function FavoriteStar({
  on,
  listingNo,
  onToggle,
}: {
  on: boolean;
  listingNo: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${listingNo} 관심`}
      title={on ? "관심에서 빼기" : "관심에 담기"}
      /* 행을 누르면 개체 상세로 간다 · 별은 그 길을 타면 안 된다 */
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors",
        "active:scale-[0.9]",
        on
          ? "text-fav"
          : "text-content-ghost hover:bg-surface-accent hover:text-fav/70",
      )}
    >
      <Star
        className={cn("h-4 w-4", on && "fill-current")}
        strokeWidth={2.2}
        aria-hidden
      />
    </button>
  );
}

/** 개체 사진 썸네일 · 클릭하면 전체화면 뷰어 · 개체 표·부위 표 공용 */
export function SheetThumb({
  src,
  alt,
  onClick,
  opensDetail = false,
  className,
}: {
  src: string | null;
  alt: string;
  onClick: (e: MouseEvent) => void;
  className?: string;
  /**
   * 사진이 아니라 개체 뷰어를 여는 버튼 · 사진이 없어도 누를 수 있다.
   * 사진 미등록 개체가 64%라, 사진 유무로 막으면 스펙조차 볼 길이 없어진다.
   */
  opensDetail?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={opensDetail ? "개체 상세 보기" : "개체 사진 보기"}
      disabled={!src && !opensDetail}
      className={cn(
        "relative mx-auto block h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-accent ring-1 ring-line transition-shadow enabled:hover:ring-content-faint disabled:cursor-default",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="36px"
          loading="lazy"
          className="object-cover"
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-content-ghost">
          <ImageOff className="h-4 w-4" strokeWidth={1.5} />
        </span>
      )}
    </button>
  );
}

/** 펼침 영역 첫 줄 캡션 · `부위 20/20 · 도체중 520kg · 도축번호 … · 가공 …` */
export function SheetEntityCaption({
  entity,
  children,
}: {
  entity: SheetEntity;
  children?: ReactNode;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-x-3 text-[11.5px] tabular-nums text-content-soft">
      <span className="font-semibold text-content-mid">
        부위 {entity.partCount}/{entity.partTotal}
      </span>
      {entity.carcassWeight ? (
        <span>도체중 {entity.carcassWeight}kg</span>
      ) : null}
      {/*
       * 도축장·도축일은 `compact` 에서 열이 빠진다 (하루 한 도축장을 보는 화면이라).
       * 열은 없어도 값까지 없어지면 안 되므로 펼치면 여기서 나온다.
       */}
      {entity.slaughterHouse || entity.slaughterDate ? (
        <span>
          도축{" "}
          {[
            entity.slaughterHouse,
            entity.slaughterDate ? shortDate(entity.slaughterDate) : null,
          ]
            .filter(Boolean)
            .join(" ")}
        </span>
      ) : null}
      {entity.slaughterNo ? <span>도축번호 {entity.slaughterNo}</span> : null}
      {entity.processDate ? (
        <span>가공 {shortDate(entity.processDate)}</span>
      ) : null}
      {entity.processWeight ? (
        <span>가공중량 {entity.processWeight}kg</span>
      ) : null}
      {children}
    </div>
  );
}

/* ─────────────── 우측 결과 열 · 낙찰 n/총 · 총 낙찰대금 · 내 낙찰대금 ─────────────── */

/**
 * 결과 열이 읽는 것만 추린 꼴.
 *
 * 경매장은 실시간 입찰에서(`live-auction/lib/sheetSummary`), 경매내역은 낙찰 스냅샷
 * 에서(`history/lib/dailyListings`) 요약을 만든다. 둘의 집계 함수는 보는 자료가 달라
 * 하나로 합칠 수 없지만, **결과 열이 쓰는 여섯 값**은 같다. 그 여섯만 여기 적어 두면
 * 두 쪽 요약이 그대로 이 칸들에 꽂힌다.
 */
export interface SheetResultSummary {
  total: number;
  wonCount: number;
  wonAmount: number;
  myBidCount: number;
  myWonAmount: number;
  /** 마감 전 · 낙찰자 없는 부위에 걸린 내 입찰 수 (아직 진행 중 · 미낙찰 아님) */
  myOpenCount: number;
}

/**
 * 개체 행 오른쪽 세 칸 · 낙찰 n/총 · 총 낙찰대금 · 내 낙찰대금 · 경매내역 상장표 전용.
 *
 * 한때 경매장 상장표에도 있었다. 화면마다 한 벌씩 두었을 때는 「원」 꼬리가 한쪽에만
 * 붙고 미낙찰 색이 한쪽은 토큰, 한쪽은 생색(`rose-500`)이라 같은 열이 화면 따라 달랐다.
 * 경매장에서 뺀 것은 경매가 도는 동안 칸 대부분이 비어 있어서다 — 결과는 끝나고 본다.
 */
export function SheetResultCells({ summary }: { summary: SheetResultSummary }) {
  const participated = summary.myBidCount > 0;
  return (
    <>
      <td
        className={cn(SHEET_CELL, SHEET_GROUP_START, "px-1 pl-2 text-center")}
      >
        <b className="font-bold text-content">{summary.wonCount}</b>
        <span className="font-medium text-content-faint">/{summary.total}</span>
      </td>
      <td
        className={cn(
          SHEET_CELL,
          "px-1.5 text-right font-semibold text-content",
        )}
      >
        {summary.wonAmount > 0 ? (
          <WonAmount value={summary.wonAmount} />
        ) : (
          <span className="text-content-ghost">-</span>
        )}
      </td>
      <td className={cn(SHEET_CELL, "px-1.5 pr-3 text-right font-bold")}>
        {summary.myWonAmount > 0 ? (
          <span className="text-content">
            <WonAmount value={summary.myWonAmount} />
          </span>
        ) : summary.myOpenCount > 0 ? (
          <span className="text-[11px] font-medium text-content">
            진행중 {summary.myOpenCount}
          </span>
        ) : participated ? (
          <span className="text-[11px] font-medium text-lost">
            미낙찰 {summary.myBidCount}
          </span>
        ) : (
          <span className="text-content-ghost">—</span>
        )}
      </td>
    </>
  );
}

/**
 * 낙찰대금 · 「원」 은 한 단계 작고 흐리게.
 * 열 전체가 같은 단위를 200번 되풀이하므로 숫자만 또렷하게 남긴다 (등지방두께 `mm` 와 같은 규칙).
 */
function WonAmount({ value }: { value: number }) {
  return (
    <>
      {formatKrw(value)}
      <span className={cn("pl-px", unitTextClass(false))}>원</span>
    </>
  );
}

/**
 * 값 + 단위 · 단위는 흐리게 (중량 칸의 `12.3kg` 과 같은 방식).
 * 200행이 같은 단위를 되풀이하므로 숫자만 또렷하게 남긴다.
 */
export function UnitValue({
  value,
  unit,
  large = false,
}: {
  value: number | null | undefined;
  unit: string;
  large?: boolean;
}) {
  if (value === null || value === undefined) {
    return <span className="text-content-ghost">-</span>;
  }
  return (
    <>
      {value}
      <span className={cn("pl-0.5", unitTextClass(large))}>{unit}</span>
    </>
  );
}

function dash(v: string | number | null | undefined): string | number {
  return v === null || v === undefined || v === "" ? "-" : v;
}

/** "2026-01-15" → "26.01.15" */
function shortDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1].slice(2)}.${m[2]}.${m[3]}` : iso;
}
