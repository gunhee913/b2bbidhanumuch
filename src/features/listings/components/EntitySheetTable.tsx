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
import { ChevronRight, ImageOff, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import {
  ImageLightbox,
  type GalleryItem,
} from "@/features/live-auction/components/ListingImageGallery";
import type { SheetEntity, SheetFocus } from "../lib/sheetEntity";

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
const QUALITY_CELL = cn(SHEET_CELL, "text-center text-content-mid");
/**
 * 좁은 표(`compact`) 전용 여백.
 *
 * 기본 `px-2` 는 열 16개에서만 여백으로 202px 을 먹는다 — 표 폭의 5분의 1이다.
 * 본문 열은 4분의 3(`px-1.5`), 값이 한 자리 숫자인 등급판정 7열은 절반(`px-1`),
 * 그룹 경계의 들여쓰기도 `pl-3` → `pl-2` 로 줄여 아낀 폭을 전 열에 되돌린다.
 */
const DENSE_CELL = "px-1.5";
const QUALITY_TIGHT = "px-1";
const DENSE_GROUP_START = "pl-2";

const QUALITY_COLUMN_COUNT = 7;
/**
 * 등급판정 7열 폭 · 근내지방 · 육색 · 지방색 · 조직도 · 성숙도 · 등지방두께 · 등심면적.
 * compact 비율은 표 폭 980px(요약을 편 최소 폭)에서 머리글이 잘리지 않는 값으로 잡았다.
 */
const QUALITY_WIDTHS = {
  compact: [
    "w-[5.7%]",
    "w-[3.2%]",
    "w-[4.3%]",
    "w-[4.3%]",
    "w-[4.3%]",
    "w-[6.3%]",
    "w-[5.3%]",
  ],
  wide: [
    "w-[4.4%]",
    "w-[3.1%]",
    "w-[3.7%]",
    "w-[3.7%]",
    "w-[3.7%]",
    "w-[5.2%]",
    "w-[4.4%]",
  ],
} as const;
/** 머리글 높이 · 초점 이동으로 스크롤할 때 고정 머리글 밑에 행이 숨지 않도록 여유를 준다 */
const STICKY_HEAD_HEIGHT = 36;
const EMPTY_EXPANDED: ReadonlySet<string> = new Set();

export interface SheetSummaryColumn {
  label: string;
  align: "left" | "center" | "right";
  /** 이 열 앞에 그룹 구분선 */
  groupStart?: boolean;
  /** `w-[7.5%]` 같은 colgroup 폭 클래스 */
  widthClass: string;
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
   */
  compact?: boolean;
  /** 우측 결과/요약 열 정의 · 셀은 `renderSummary` 가 같은 순서로 `<td>` 를 돌려준다 */
  summaryColumns: SheetSummaryColumn[];
  renderSummary: (entity: SheetEntity) => ReactNode;
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
  summaryColumns,
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
  className,
}: EntitySheetTableProps) {
  const isStickyHead = stickyHeadTop != null;
  /** 펼침이 없으면 화살표 열 자체를 두지 않는다 · 행은 다른 화면으로 가는 링크다 */
  const expandable = !!renderExpanded;
  const dense = compact ? DENSE_CELL : undefined;
  const quality = compact ? QUALITY_TIGHT : undefined;
  const groupStart = cn(SHEET_GROUP_START, compact && DENSE_GROUP_START);
  const [lightbox, setLightbox] = useState<SheetEntity | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);
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
    <div className={cn(!isStickyHead && "overflow-x-auto", className)}>
      <table
        className={cn(
          "w-full table-fixed text-[13px] font-semibold text-content",
          minWidthClass ?? (compact ? "min-w-[900px]" : "min-w-[1200px]"),
        )}
      >
        {/* 비율 폭 · 남는 폭이 한 열에 몰리지 않고 전체에 나눠진다 (합 ≈ 100%) */}
        <colgroup>
          {expandable ? (
            <col className={compact ? "w-[2.5%]" : "w-[2.2%]"} />
          ) : null}
          {compact ? (
            <>
              {/* 별 + 사진 + 접수번호 한 칸 · 18 + 36 + 6 + 80 + 좌우 12 = 152px (표 980 기준) */}
              <col className="w-[15.7%]" />
              <col className="w-[6.9%]" />
              <col className="w-[3.8%]" />
              <col className="w-[3.8%]" />
              <col className="w-[3.6%]" />
              {/* 상장업체는 유일하게 잘려도 되는 열(`truncate`) · 남는 폭을 여기서 꾼다 */}
              <col className="w-[6.7%]" />
              {QUALITY_WIDTHS.compact.map((w, i) => (
                <col key={i} className={w} />
              ))}
            </>
          ) : (
            <>
              <col className="w-[3.7%]" />
              <col className="w-[9.5%]" />
              <col className="w-[6%]" />
              <col className="w-[3.5%]" />
              <col className="w-[3.5%]" />
              <col className="w-[3.5%]" />
              <col className="w-[8.6%]" />
              {QUALITY_WIDTHS.wide.map((w, i) => (
                <col key={i} className={w} />
              ))}
              <col className="w-[11.6%]" />
            </>
          )}
          {summaryColumns.map((c) => (
            <col key={c.label} className={c.widthClass} />
          ))}
        </colgroup>
        <thead
          style={isStickyHead ? { top: stickyHeadTop } : undefined}
          className={cn(
            "bg-surface-muted text-[12px] font-medium text-content-faint",
            isStickyHead && "sticky z-10",
          )}
        >
          <tr>
            {expandable ? (
              <th className={cn(SHEET_HEAD, "px-1")} aria-label="펼침" />
            ) : null}
            {compact ? (
              <th className={cn(SHEET_HEAD, dense, "text-left")}>접수번호</th>
            ) : (
              <>
                <th className={cn(SHEET_HEAD, "px-1")}>사진</th>
                <th className={cn(SHEET_HEAD, groupStart, "text-left")}>
                  접수번호
                </th>
              </>
            )}
            <th className={cn(SHEET_HEAD, dense, "text-left")}>등급</th>
            <th className={cn(SHEET_HEAD, dense)}>축종</th>
            <th className={cn(SHEET_HEAD, dense)}>성별</th>
            <th className={cn(SHEET_HEAD, dense)}>개월</th>
            <th className={cn(SHEET_HEAD, dense, "text-left")}>상장업체</th>
            <th className={cn(SHEET_HEAD, groupStart, quality && "pr-1")}>
              근내지방
            </th>
            <th className={cn(SHEET_HEAD, quality)}>육색</th>
            <th className={cn(SHEET_HEAD, quality)}>지방색</th>
            <th className={cn(SHEET_HEAD, quality)}>조직도</th>
            <th className={cn(SHEET_HEAD, quality)}>성숙도</th>
            <th className={cn(SHEET_HEAD, quality)}>등지방두께</th>
            <th className={cn(SHEET_HEAD, quality)}>등심면적</th>
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
              favorited={
                favoriteIds ? favoriteIds.has(entity.listingNo) : null
              }
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
  renderSummary: (entity: SheetEntity) => ReactNode;
  renderExpanded?: (
    entity: SheetEntity,
    ctx: { flashPartNo: number | null },
  ) => ReactNode;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [flashPartNo, setFlashPartNo] = useState<number | null>(null);
  /** 펼침 영역이 없으면 행은 다른 화면으로 가는 링크 · 화살표도 돌지 않는다 */
  const expandable = !!renderExpanded;
  const dense = compact ? DENSE_CELL : undefined;
  const quality = compact ? QUALITY_TIGHT : undefined;
  const groupStart = cn(SHEET_GROUP_START, compact && DENSE_GROUP_START);

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
      className={compact ? "mx-0" : undefined}
    />
  );

  return (
    <Fragment>
      <tr
        ref={rowRef}
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
          <td className={cn(SHEET_CELL, dense)}>
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
        <td
          className={cn(
            SHEET_CELL,
            dense,
            "text-left font-semibold text-content",
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
        <td
          className={cn(
            SHEET_CELL,
            dense,
            "truncate text-left text-content-mid",
          )}
        >
          {entity.companyName || "-"}
        </td>
        <td
          className={cn(
            QUALITY_CELL,
            groupStart,
            quality && "pr-1",
            "font-semibold text-content",
          )}
        >
          {dash(entity.marblingScore)}
        </td>
        <td className={cn(QUALITY_CELL, quality)}>{dash(entity.meatColor)}</td>
        <td className={cn(QUALITY_CELL, quality)}>{dash(entity.fatColor)}</td>
        <td className={cn(QUALITY_CELL, quality)}>{dash(entity.texture)}</td>
        <td className={cn(QUALITY_CELL, quality)}>{dash(entity.maturity)}</td>
        <td className={cn(QUALITY_CELL, quality)}>
          <UnitValue value={entity.backFat} unit="mm" />
        </td>
        <td className={cn(QUALITY_CELL, quality)}>
          <UnitValue value={entity.eyeMuscle} unit="㎠" />
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
        {renderSummary(entity)}
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
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
        "active:scale-[0.9]",
        on
          ? "text-fav"
          : "text-content-ghost hover:bg-surface-accent hover:text-fav/70",
      )}
    >
      <Star
        className={cn("h-3.5 w-3.5", on && "fill-current")}
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

/**
 * 값 + 단위 · 단위는 흐리게 (중량 칸의 `12.3kg` 과 같은 방식).
 * 200행이 같은 단위를 되풀이하므로 숫자만 또렷하게 남긴다.
 */
export function UnitValue({
  value,
  unit,
}: {
  value: number | null | undefined;
  unit: string;
}) {
  if (value === null || value === undefined) {
    return <span className="text-content-ghost">-</span>;
  }
  return (
    <>
      {value}
      <span className="pl-0.5 text-[11px] font-medium text-content-faint">
        {unit}
      </span>
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
