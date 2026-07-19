"use client";

import { format } from "date-fns";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing, LivePart } from "../api";
import { formatGradeLabel } from "../lib/grade";
import { BidPanel } from "./BidPanel";
import { ListingImageGallery } from "./ListingImageGallery";
import { TraceInfoLink } from "./ListingInfoSection";

export type DetailTab = "info" | "bid" | "bulk";

const DETAIL_TABS: { value: DetailTab; label: string }[] = [
  { value: "bid", label: "입찰하기" },
  { value: "info", label: "개체정보" },
  { value: "bulk", label: "일괄입찰" },
];

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

export interface PartDetailPanelProps {
  listing: LiveListing | null;
  part: LivePart | null;
  allListings: LiveListing[];
  dealerId: string | null;
  isLoggedIn: boolean;
  isAuthorized: boolean;
  canBid: boolean;
  disabledReason?: string;
  onRequestLogin: () => void;
  onRequestPermission: () => void;
  /** 현재 활성 탭 · 부모(LiveAuctionRoom) 가 관리 */
  tab: DetailTab;
  onTabChange: (t: DetailTab) => void;
  /** `bulk` 탭 컨텐츠 슬롯 · `LiveAuctionRoom` 이 `BulkBidPanel` 을 조립해 전달 */
  bulkContent?: React.ReactNode;
}

/**
 * 부위별 뷰의 오른쪽 컴팩트 상세 패널 (폭 ~340px).
 *
 * 하나의 카드 안에 [개체정보 | 입찰하기] 두 탭으로 구성:
 * - **개체정보** 탭 (기본): 이미지 갤러리 + 컴팩트 정보 그리드
 * - **입찰하기** 탭: `BidPanel` (부위/등급 · 입찰가 폼 · 총 입찰금액 · 시세차트)
 *
 * 활성 탭은 부모(`LiveAuctionRoom`) 가 controlled 로 관리 →
 * 부위 테이블 행 클릭은 `info` 탭으로, "입찰하기" 버튼은 `bid` 탭으로 유도.
 */
export function PartDetailPanel({
  listing,
  part,
  allListings,
  dealerId,
  isLoggedIn,
  isAuthorized,
  canBid,
  disabledReason,
  onRequestLogin,
  onRequestPermission,
  tab,
  onTabChange,
  bulkContent,
}: PartDetailPanelProps) {
  // 개체(listing) 조차 선택되지 않은 상태에서는 empty state.
  // bulk 탭은 개체가 있으면 part 가 없어도 진입 가능해야 하므로 part 유무는 개별 탭 단에서 판단.
  if (!listing) {
    return (
      <div className="flex max-h-[inherit] flex-col items-center justify-center gap-3 border border-dashed border-slate-200 bg-white/50 px-4 py-16 text-center">
        <div className="bg-slate-100 p-3">
          <Info className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500">
          부위를 선택해 주세요.
        </p>
        <p className="text-xs leading-relaxed text-slate-400">
          가운데 테이블에서 개체를 클릭하면
          <br />
          여기서 이미지·정보·입찰을 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);

  return (
    <div className="flex max-h-[inherit] flex-col overflow-hidden border border-slate-200 bg-white">
      {/* 헤더 · 고정 */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 className="truncate text-[18px] font-bold leading-none -tracking-[0.01em] tabular-nums text-slate-900">
          {listing.listingNo}
        </h2>
        <TraceInfoLink traceNo={listing.traceNo} />
      </header>

      {/* 탭 · 고정 · [개체정보 | 입찰하기] */}
      <nav className="shrink-0 border-b border-slate-100">
        <ul className="flex items-stretch">
          {DETAIL_TABS.map((t) => {
            const isActive = tab === t.value;
            return (
              <li key={t.value} className="flex-1">
                <button
                  type="button"
                  onClick={() => onTabChange(t.value)}
                  className={cn(
                    "relative flex h-10 w-full items-center justify-center text-[13px] font-bold transition-colors",
                    isActive
                      ? "text-slate-900"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  {t.label}
                  {isActive ? (
                    <span
                      className="absolute inset-x-4 bottom-0 h-[2px] bg-slate-900"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 탭 콘텐츠 · 자체 스크롤 (헤더+탭바는 항상 노출) */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {tab === "bulk" ? (
          bulkContent ?? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">
              일괄입찰 도구를 불러오는 중입니다.
            </div>
          )
        ) : tab === "bid" ? (
          part ? (
            <BidPanel
              listing={listing}
              allListings={allListings}
              selectedPart={part}
              dealerId={dealerId}
              isLoggedIn={isLoggedIn}
              isAuthorized={isAuthorized}
              canBid={canBid}
              disabledReason={disabledReason}
              onRequestLogin={onRequestLogin}
              onRequestPermission={onRequestPermission}
            />
          ) : (
            <div className="px-4 py-8 text-center text-xs text-slate-400">
              가운데 테이블에서 부위를 선택해 주세요.
            </div>
          )
        ) : (
          <>
            <div className="p-3">
              <ListingImageGallery
                images={listing.images}
                listingNo={listing.listingNo}
                compactThumbs
              />
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <HorizontalInfoGrid listing={listing} gradeLabel={gradeLabel} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 좁은 폭(340px 기준) 오른쪽 상세 · 개체정보 탭 콘텐츠.
 *
 * 정보 아키텍처:
 * - **품질정보 (최상단)** · 구매 결정 핵심 지표라 가장 먼저 노출.
 *   등급 · 근내지방 · 등지방 · 등심면적 · 육색 · 지방색 · 조직감 · 성숙도
 *   → 라벨위/값아래 4열 그리드 (2줄). `NumericCell` 로 자릿수 정렬.
 * - **기본정보 (하단)** · 참고성 텍스트 값 위주.
 *   축종/성별 · 개월령 · 도축장 · 도축일 · 도축번호 · 도체중 · 가공업체 · 경락단가 · 이력번호
 *   → 라벨:값 2열 그리드 (`Cell`). 값 긴 필드는 `col-span-2`.
 *
 * Section 헤더(`품질정보` · `기본정보`) 는 제거해 세로 절약.
 * 두 섹션 사이는 얇은 divider 하나로만 구분.
 */
function HorizontalInfoGrid({
  listing,
  gradeLabel,
}: {
  listing: LiveListing;
  gradeLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* 품질정보 · 라벨위/값아래 4열 그리드 · 핵심 지표 상단 배치 */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
        <NumericCell label="등급" value={gradeLabel} emphasis />
        <NumericCell
          label="근내지방"
          value={listing.marblingScore}
          emphasis
        />
        <NumericCell
          label="등지방"
          value={listing.backFat}
          unit="mm"
        />
        <NumericCell
          label="등심면적"
          value={listing.eyeMuscle}
          unit="cm²"
        />
        <NumericCell label="육색" value={listing.meatColor} />
        <NumericCell label="지방색" value={listing.fatColor} />
        <NumericCell label="조직감" value={listing.texture} />
        <NumericCell label="성숙도" value={listing.maturity} />
      </div>

      {/* divider */}
      <div className="border-t border-slate-100" aria-hidden />

      {/* 기본정보 · 라벨:값 2열 그리드 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
        <Cell label="축종">
          {listing.breed || "-"} · {listing.gender || "-"}
        </Cell>
        <Cell label="개월령">
          {listing.monthAge != null ? `${listing.monthAge}개월` : "-"}
        </Cell>
        <Cell label="도축일">{formatDate(listing.slaughterDate)}</Cell>
        <Cell label="도축번호">{listing.slaughterNo || "-"}</Cell>
        <Cell label="도축장">{listing.slaughterHouse || "-"}</Cell>
        <Cell label="가공업체">{listing.companyName || "-"}</Cell>
        <Cell label="도체중">{formatKg(listing.carcassWeight)}</Cell>
        <Cell label="경락단가" emphasis>
          {listing.unitPrice
            ? `${NUMBER_FORMATTER.format(Math.round(listing.unitPrice))}원/kg`
            : "-"}
        </Cell>
        <Cell label="이력번호" span={2}>
          {formatTraceNo(listing.traceNo)}
        </Cell>
      </div>
    </div>
  );
}

function Cell({
  label,
  children,
  emphasis,
  span,
}: {
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
  span?: 1 | 2;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-baseline justify-between gap-2",
        span === 2 && "col-span-2",
      )}
    >
      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-400">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 truncate text-right tabular-nums",
          emphasis
            ? "text-[13px] font-bold text-sky-600"
            : "text-[12px] font-semibold text-slate-900",
        )}
      >
        {children}
      </span>
    </div>
  );
}

function SectionDivider() {
  return (
    <div
      className="col-span-2 my-1 border-t border-slate-100"
      aria-hidden
    />
  );
}

/**
 * 품질정보 셀 · 라벨 위 · 값 아래 세로 정렬.
 *
 * 좁은 폭에서 label:value 가로 배치보다 세로 배치가 스캔이 빠름
 * (모든 셀 값 자릿수를 시각적으로 정렬 가능).
 * `value` 는 숫자 또는 문자열(`"1++A(9)"` 같은 등급 라벨) 모두 지원.
 */
function NumericCell({
  label,
  value,
  unit,
  emphasis,
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  emphasis?: boolean;
}) {
  const isEmpty =
    value == null || (typeof value === "string" && value.trim().length === 0);

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="truncate text-[10px] font-medium text-slate-400">
        {label}
      </span>
      <span
        className={cn(
          "whitespace-nowrap leading-none tabular-nums",
          isEmpty
            ? "text-[13px] font-bold text-slate-300"
            : emphasis
              ? "text-[15px] font-extrabold text-sky-600"
              : "text-[13px] font-bold text-slate-900",
        )}
      >
        {isEmpty ? "-" : value}
        {unit && !isEmpty ? (
          <span className="ml-0.5 text-[10px] font-medium text-slate-400">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function formatTraceNo(traceNo: string | null | undefined): string {
  if (!traceNo) return "-";
  const trimmed = traceNo.trim();
  if (trimmed.startsWith("002-") || trimmed.startsWith("002 ")) {
    return trimmed;
  }
  return `002-${trimmed}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return format(new Date(iso), "yyyy.MM.dd");
  } catch {
    return "-";
  }
}

function formatKg(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "-";
  return `${Math.round(value)}kg`;
}
