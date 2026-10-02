"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { formatKrw } from "@/features/live-auction/lib/masking";
import {
  formatGradeLabel,
  matchesGradeFilter,
} from "@/features/live-auction/lib/grade";
import { GradeFilterTabs } from "@/features/live-auction/components/SheetFilterBar";
import { CHIP_BASE } from "@/features/live-auction/components/PartResultRow";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import type { BidHistoryEntry, BidHistoryKind } from "../hooks/useBidHistory";
import { PART_ROW_ATTR } from "../hooks/useHistoryKeys";
import { filterTabs, SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
  EmptyRow,
  Measured,
  ResetFiltersButton,
  SearchInput,
  SkeletonRows,
  WeightValue,
} from "./TableParts";

/** 컬럼 수 · 빈 줄/기다리는 줄 colSpan 용 */
const COLUMN_COUNT = 11;

/** 경매결과·배송지시 표와 같은 밀도 · 글자 체계도 같다 (`DailyHistoryTable` 쪽 설명) */
const ROW_H = "h-9";
const HEAD_CELL =
  "whitespace-nowrap border-b border-line py-1.5 font-medium -tracking-[0.01em]";
const TEXT_CELL = cn(ROW_H, "whitespace-nowrap px-2 py-1 align-middle");
const NUM_CELL = cn(
  ROW_H,
  "whitespace-nowrap px-2 py-1 text-right align-middle tabular-nums",
);

/**
 * 열마다 제 값이 안 잘리는 폭 (px) · 이 합의 비율로 환산해 쓴다
 * (경매결과 표·경매장 부위표와 같은 방식 · `DailyHistoryTable` 쪽 설명).
 */
const COLUMN_WIDTHS = [
  64, // 입찰시간 · `text-[11px]` 이라 안 늘어난다
  100, // 한 일 · 배지 + 「관리자」 꼬리표가 함께 서는 날이 있다
  106, // 접수번호
  66, // 등급
  78, // 부위
  92, // 업체 · 잘려도 되는 칸 · 돈 칸에 꼬리 「원」 이 붙은 만큼 여기서 꿔 준다
  66, // 중량
  83, // 최저단가 · `128,000원`
  141, // 단가 · `92,000 → 94,000원` 이 한 줄에 선다
  98, // 총 금액 · `1,234,567원`
  62, // 상태
];
const TABLE_BASE_WIDTH = COLUMN_WIDTHS.reduce((sum, w) => sum + w, 0);

interface KindStyle {
  label: string;
  /** 배지 바탕·글자 */
  badge: string;
}

/**
 * 한 일의 종류 · **입찰 · 수정 · 취소** 셋이다.
 *
 * 관리자가 내 입찰에 손댄 것도 결국 수정이거나 취소라 이름은 같이 쓰고, 색을
 * `note` 로 바꾼 뒤 옆에 「관리자」 를 붙인다. 이름을 따로 두면 고를 거리가 다섯이
 * 되는데 사람이 묻는 건 「무슨 일이 있었나」 셋이고 「누가 했나」 는 그다음이다.
 */
const KIND: Record<BidHistoryKind, KindStyle> = {
  placed: {
    label: "입찰",
    badge: "bg-won/12 text-won",
  },
  updated: {
    label: "수정",
    badge: "bg-surface-accent text-content-mid",
  },
  cancelled: {
    label: "취소",
    badge: "bg-lost/12 text-lost",
  },
  admin_update: {
    label: "수정",
    badge: "bg-note/12 text-note",
  },
  admin_delete: {
    label: "취소",
    badge: "bg-note/12 text-note",
  },
};

const isAdminKind = (kind: BidHistoryKind) =>
  kind === "admin_update" || kind === "admin_delete";

const KIND_TABS = filterTabs(["입찰", "수정", "취소"]);

export interface BidHistoryTableProps {
  selectedDate: string | null;
  entries: BidHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  /** 왼쪽 두 판이 비추고 있는 부위 (260720-101-01) · 그 부위의 줄을 모두 밝힌다 */
  focusedPartNo: string | null;
  onSelectRow: (entry: BidHistoryEntry) => void;
  /** 머리줄 맨 앞 일자 조회 · 세 화면이 같은 것을 쓴다 (`HistoryDatePicker`) */
  dateControl: ReactNode;
  headerAction?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 그날 입찰에 한 일 전부 · 일어난 차례대로.
 *
 * 경매결과 표가 「무엇이 남았나」 라면 이 표는 **「무엇을 했나」** 다. 그래서 한
 * 부위에 여러 줄이 설 수 있다 — 넣고, 고치고, 뺀 것이 각각 한 줄이다. 취소해서
 * 사라진 입찰도 여기에는 남는다 (`bid_audit_logs`).
 *
 * 줄을 누르면 왼쪽 세 판이 그 개체로 간다 — 경매결과 표와 같은 손놀림이다. 같은
 * 부위의 줄들은 함께 밝아진다. 세 줄이 한 부위의 이야기라는 걸 눈으로 묶어 준다.
 */
export function BidHistoryTable({
  selectedDate,
  entries,
  isLoading,
  error,
  focusedPartNo,
  onSelectRow,
  dateControl,
  headerAction,
  className,
  style,
  ref,
}: BidHistoryTableProps) {
  const [kindFilter, setKindFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setKindFilter("");
    setGradeFilter("");
    setQuery("");
  }, [selectedDate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (kindFilter && KIND[e.kind].label !== kindFilter) return false;
      if (!matchesGradeFilter(gradeFilter, e.grade, e.marblingScore))
        return false;
      if (!q) return true;
      return [
        e.listingNo,
        e.partName,
        formatGradeLabel(e.grade, e.marblingScore),
        e.companyName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [entries, kindFilter, gradeFilter, query]);

  const hasActiveFilter =
    kindFilter !== "" || gradeFilter !== "" || query.trim() !== "";
  const resetFilters = () => {
    setKindFilter("");
    setGradeFilter("");
    setQuery("");
  };

  return (
    <div
      ref={ref}
      style={style}
      className={cn("flex flex-col", SURFACE_SHELL_CLASS, className)}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 pl-2.5 pr-3">
        <div className="flex items-center gap-2">
          {dateControl}
          <span className="text-[11px] text-content-faint">·</span>
          <span className="text-[11px] tabular-nums text-content-soft">
            총 {filtered.length}
            {hasActiveFilter ? (
              <span className="text-content-faint"> / {entries.length}</span>
            ) : null}
            건
          </span>
        </div>

        {headerAction ? (
          <div className="-mr-1 flex shrink-0 items-center">{headerAction}</div>
        ) : null}
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface-muted px-4 py-2">
        <SegmentedTabs
          label="한 일"
          value={kindFilter}
          onChange={setKindFilter}
          options={KIND_TABS}
          toggleable
        />
        <GradeFilterTabs value={gradeFilter} onChange={setGradeFilter} />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="상장번호 · 부위 · 등급 · 업체"
          label="입찰내역 검색"
        />
        {hasActiveFilter ? <ResetFiltersButton onClick={resetFilters} /> : null}
      </div>

      <TableScroll>
        {/* 열 순서 = 언제 → 무엇을 했나 → 무엇에 → 얼마나 → 얼마에 → 지금 어떤가 */}
        <table
          style={{ minWidth: TABLE_BASE_WIDTH }}
          className="w-full table-fixed text-[13px] font-semibold text-content"
        >
          <colgroup>
            {COLUMN_WIDTHS.map((width, i) => (
              <col
                key={i}
                style={{ width: `${(width / TABLE_BASE_WIDTH) * 100}%` }}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-surface-muted text-[12px] font-medium text-content-faint">
            <tr>
              <th className={cn(HEAD_CELL, "px-2 text-right")}>입찰시간</th>
              <th className={cn(HEAD_CELL, "px-2 text-center")}>한 일</th>
              <th className={cn(HEAD_CELL, "px-2 text-left")}>접수번호</th>
              <th className={cn(HEAD_CELL, "px-2 text-left")}>등급</th>
              <th className={cn(HEAD_CELL, "px-2 text-left")}>부위</th>
              <th className={cn(HEAD_CELL, "px-2 text-left")}>업체</th>
              <th className={cn(HEAD_CELL, "px-2 text-right")}>중량</th>
              <th className={cn(HEAD_CELL, "px-2 text-right")}>최저단가</th>
              <th className={cn(HEAD_CELL, "px-2 text-right")}>단가</th>
              <th className={cn(HEAD_CELL, "px-2 text-right")}>총 금액</th>
              <th className={cn(HEAD_CELL, "px-2 text-center")}>상태</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows colSpan={COLUMN_COUNT} rows={5} />
            ) : error ? (
              <EmptyRow colSpan={COLUMN_COUNT} message={error} />
            ) : filtered.length === 0 ? (
              <EmptyRow
                colSpan={COLUMN_COUNT}
                message={
                  hasActiveFilter
                    ? "조건에 해당하는 입찰내역이 없습니다."
                    : "선택한 일자에 입찰한 기록이 없습니다."
                }
              />
            ) : (
              filtered.map((entry) => (
                <BidHistoryRowView
                  key={entry.id}
                  entry={entry}
                  isSelected={entry.listingNo === focusedPartNo}
                  onSelect={() => onSelectRow(entry)}
                />
              ))
            )}
          </tbody>
        </table>
      </TableScroll>
    </div>
  );
}

function BidHistoryRowView({
  entry,
  isSelected,
  onSelect,
}: {
  entry: BidHistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const kind = KIND[entry.kind];
  const gone = entry.kind === "cancelled" || entry.kind === "admin_delete";
  const amount = entry.newAmount ?? entry.oldAmount;

  return (
    <tr
      {...{ [PART_ROW_ATTR]: entry.listingNo }}
      onClick={onSelect}
      aria-selected={isSelected}
      className={cn(
        "cursor-pointer border-b border-line-soft transition-colors hover:bg-surface-muted",
        /* 뺀 줄은 한 단계 묽게 · 지금 걸려 있는 것과 눈으로 갈라야 한다 */
        gone && "text-content-soft",
        isSelected && "bg-surface-accent hover:bg-surface-accent",
      )}
    >
      <td
        className={cn(
          NUM_CELL,
          "text-[11px] font-medium text-content-faint -tracking-[0.02em]",
        )}
      >
        {format(new Date(entry.at), "HH:mm:ss")}
      </td>

      <td
        className={cn(TEXT_CELL, "text-center")}
        title={
          entry.performedBy
            ? `관리자 ${kind.label} · ${entry.performedBy}`
            : undefined
        }
      >
        <span className={cn(CHIP_BASE, "align-middle", kind.badge)}>
          {kind.label}
        </span>
        {isAdminKind(entry.kind) ? (
          <span className="pl-1 text-[10.5px] font-bold text-note">관리자</span>
        ) : null}
      </td>

      {/* 접수번호 · 줄의 이름표라 가장 또렷하게 (경매장 상장표·경매결과와 같다) */}
      <td
        className={cn(
          TEXT_CELL,
          "font-bold tabular-nums -tracking-[0.02em]",
          gone ? "text-content-mid" : "text-content",
        )}
      >
        {entry.listingNo}
      </td>

      <td
        className={cn(
          TEXT_CELL,
          "font-semibold tabular-nums -tracking-[0.01em]",
          gone ? "text-content-mid" : "text-content",
        )}
      >
        {formatGradeLabel(entry.grade, entry.marblingScore)}
      </td>

      <td
        className={cn(
          TEXT_CELL,
          "truncate",
          gone ? "text-content-soft" : "text-content-mid",
        )}
        title={entry.partName}
      >
        {entry.partName}
      </td>

      <td
        className={cn(
          TEXT_CELL,
          "truncate font-medium",
          gone ? "text-content-ghost" : "text-content-faint",
        )}
        title={entry.companyName}
      >
        {entry.companyName || "-"}
      </td>

      <td className={NUM_CELL}>
        <WeightValue weight={entry.weight} muted={gone} />
      </td>

      <td className={NUM_CELL}>
        <Measured
          value={formatKrw(entry.minPrice)}
          unit="원"
          className="font-medium text-content-soft"
        />
      </td>

      <td className={NUM_CELL}>
        <PriceChange entry={entry} />
      </td>

      <td className={NUM_CELL}>
        <Measured
          value={formatKrw(amount)}
          unit="원"
          className={cn(
            "font-bold",
            gone ? "text-content-soft" : "text-content",
          )}
        />
      </td>

      <td className={cn(TEXT_CELL, "text-center")}>
        {entry.alive ? (
          <span className="text-[11px] font-semibold text-content-mid">
            {entry.settled ? "마감" : "입찰중"}
          </span>
        ) : (
          <span className="text-[11px] text-content-ghost">없음</span>
        )}
      </td>
    </tr>
  );
}

/**
 * 단가 칸 · 고친 줄에만 `92,000 → 94,000` 으로 전후를 함께 보인다.
 *
 * 바뀐 값만 적으면 「얼마에서 얼마로」 를 윗줄과 대조해야 알 수 있는데, 같은 부위의
 * 줄이 서로 붙어 있지 않다 (이 표는 시간순이다). 화살표 하나로 그 대조를 없앤다.
 * 올렸는지 내렸는지는 `rise`/`fall` 로 — 경매장 시세와 같은 말이다.
 */
function PriceChange({ entry }: { entry: BidHistoryEntry }) {
  const to = entry.newPrice;
  const from = entry.oldPrice;

  if (from != null && to != null && from !== to) {
    const up = to > from;
    return (
      <>
        <span className="font-medium text-content-faint">
          {formatKrw(from)}
        </span>
        {/* 아이콘 대신 글자 · 상자가 생기면 줄 높이가 밀린다 */}
        <span className="px-1 text-content-ghost" aria-hidden>
          →
        </span>
        {/* 「원」 은 끝값에만 · 두 번 적으면 화살표가 단위 사이에 끼어 읽힌다 */}
        <Measured
          value={formatKrw(to)}
          unit="원"
          className={cn("font-bold", up ? "text-rise" : "text-fall")}
        />
      </>
    );
  }

  const value = to ?? from;
  if (value == null || value <= 0)
    return <span className="text-content-ghost">-</span>;

  /* 뺀 줄은 그 값이 이제 없다는 뜻이라 줄을 긋는다 */
  const gone = entry.kind === "cancelled" || entry.kind === "admin_delete";
  return (
    <Measured
      value={formatKrw(value)}
      unit="원"
      className={cn(
        "font-semibold",
        gone ? "text-content-faint line-through" : "text-content",
      )}
    />
  );
}
