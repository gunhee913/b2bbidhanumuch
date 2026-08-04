"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useListingByNo } from "@/features/listings/hooks";
import { cn } from "@/lib/utils";
import { formatGradeLabel } from "../lib/grade";
import {
  toLiveListingFromByNo,
  type LivByNoResponse,
} from "../lib/toLiveListing";
import { EntityResultPartsCard } from "./EntityResultPartsCard";
import {
  ListingInfoSection,
  TraceInfoLink,
} from "./ListingInfoSection";
import { ListingImageGallery } from "./ListingImageGallery";

export interface EntityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 개체 상장번호 (예: `260727-101`) · null 이면 아무것도 fetch 하지 않음 */
  listingNo: string | null;
  /** 초점 부위 partNo · 열림 시 자동 하이라이트/스크롤 */
  focusPartNo?: number | null;
  /** 내 dealerId · 내 입찰/낙찰 표시용 */
  dealerId?: string | null;
}

/**
 * 개체 상세 다이얼로그 · `/delivery`, `/history` 등에서 상장번호 클릭 시 열림.
 *
 * - 실시간 룸으로 이동하지 않고 컨텍스트 유지
 * - `useListingByNo` 로 과거 개체 데이터 fetch → `LiveListing` 어댑터
 * - 좌: 이미지 갤러리 · 우: 개체정보 (`ListingInfoSection`)
 * - 하단: 부위별 낙찰 결과 (`EntityResultPartsCard`, read-only)
 * - `focusPartNo` 전달 시 · 해당 부위 행 자동 하이라이트/스크롤
 */
export function EntityDetailDialog({
  open,
  onOpenChange,
  listingNo,
  focusPartNo,
  dealerId,
}: EntityDetailDialogProps) {
  const query = useListingByNo(open ? listingNo : null);

  const listing = useMemo(() => {
    if (!query.data) return null;
    return toLiveListingFromByNo(
      query.data as unknown as LivByNoResponse,
      dealerId,
    );
  }, [query.data, dealerId]);

  const gradeLabel = listing
    ? formatGradeLabel(listing.grade, listing.marblingScore)
    : "-";

  const displayDate =
    listing?.listingDate
      ? format(new Date(listing.listingDate), "yyyy.MM.dd (EEE)", {
          locale: ko,
        })
      : listingNo
        ? "-"
        : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[92vw] max-w-[980px] flex-col gap-0 overflow-hidden bg-slate-50 p-0 sm:rounded-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          개체 상세 · {listingNo || ""}
        </DialogTitle>

        {/* 헤더 */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">
              개체 상세
            </span>
            <span className="text-[15px] font-extrabold tabular-nums text-slate-900">
              {listingNo || "-"}
            </span>
            {listing ? (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[12px] font-semibold text-slate-700">
                  {listing.slaughterHouse || "-"}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-[12px] tabular-nums text-slate-500">
                  {displayDate}
                </span>
                <span className="ml-1 shrink-0 rounded-sm bg-slate-100 px-1.5 py-px text-[10px] font-bold tabular-nums text-slate-700">
                  {gradeLabel}
                </span>
              </>
            ) : null}
          </div>
          {listing?.traceNo ? (
            <div className="mr-8 shrink-0">
              <TraceInfoLink traceNo={listing.traceNo} />
            </div>
          ) : null}
        </header>

        {/* 본문 · 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto">
          {query.isLoading ? (
            <BodySkeleton />
          ) : query.isError ? (
            <BodyError
              message={
                query.error instanceof Error
                  ? query.error.message
                  : "개체를 불러오지 못했습니다."
              }
            />
          ) : listing ? (
            <div className="grid gap-4 p-5">
              {/* 상단 · 이미지 + 개체 스펙 */}
              <div className="grid grid-cols-[280px_1fr] gap-4">
                <div className="min-w-0">
                  <ListingImageGallery
                    images={listing.images}
                    listingNo={listing.listingNo}
                    aspect="square"
                    compactThumbs
                  />
                </div>
                <div className="min-w-0 border border-slate-200 bg-white px-4 py-3">
                  <ListingInfoSection
                    listing={listing}
                    gradeLabel={gradeLabel}
                  />
                </div>
              </div>

              {/* 하단 · 부위별 낙찰 결과 (read-only) */}
              <EntityResultPartsCard
                listing={listing}
                dealerId={dealerId || null}
                focusPartNo={focusPartNo ?? null}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BodySkeleton() {
  return (
    <div className="grid gap-4 p-5">
      <div className="grid grid-cols-[280px_1fr] gap-4">
        <div className="h-[280px] animate-pulse bg-slate-100" />
        <div className="h-[280px] animate-pulse bg-slate-100" />
      </div>
      <div className="h-[320px] animate-pulse bg-slate-100" />
    </div>
  );
}

function BodyError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <AlertCircle className={cn("h-8 w-8 text-slate-300")} />
      <p className="text-[13px] font-semibold text-slate-500">{message}</p>
      <p className="text-[11px] text-slate-400">
        상장번호를 다시 확인해 주세요.
      </p>
    </div>
  );
}
