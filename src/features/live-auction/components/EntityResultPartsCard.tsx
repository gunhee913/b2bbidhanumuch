"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveListing, LivePart, LivePartBid } from "../api";
import { formatGradeLabel } from "../lib/grade";
import {
  formatKrw,
  formatWeightKg,
} from "../lib/masking";

export interface EntityResultPartsCardProps {
  listing: LiveListing;
  /** 내 dealerId · 내 낙찰/입찰 하이라이트용 · null 이면 관전자 컨텍스트 */
  dealerId: string | null;
  /** 초점 부위 partNo · 해당 행 하이라이트 + 자동 스크롤 */
  focusPartNo?: number | null;
}

/**
 * 마감된 개체의 부위별 낙찰 결과 read-only 테이블.
 *
 * 실경매용 `PartsTable` 과 달리:
 * - 입찰하기 버튼/편집 모드 완전 제거 (과거 데이터)
 * - `낙찰가`, `낙찰자` 를 별도 컬럼으로 노출 → 한 줄로 훑기 가능
 * - SettlementSubRow 제거 · 단일 행 밀도 유지
 * - 상태 배지: 내 낙찰(sky) · 미낙찰(slate) · 그 외 배지 없음
 *
 * `/delivery`, `/history` 다이얼로그에서 사용.
 */
export function EntityResultPartsCard({
  listing,
  dealerId,
  focusPartNo,
}: EntityResultPartsCardProps) {
  const [hideSettled, setHideSettled] = useState(false);
  const focusRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (focusPartNo == null) return;
    // 마운트 · 데이터 로드 완료 후 · 초점 행으로 부드럽게 스크롤
    const id = window.requestAnimationFrame(() => {
      focusRowRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [focusPartNo, listing.id]);

  const { total, settled } = useMemo(() => {
    let s = 0;
    for (const p of listing.parts) {
      if (isSettledPart(p)) s += 1;
    }
    return { total: listing.parts.length, settled: s };
  }, [listing.parts]);

  const visibleParts = useMemo(() => {
    if (!hideSettled) return listing.parts;
    return listing.parts.filter((p) => !isSettledPart(p));
  }, [listing.parts, hideSettled]);

  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);

  return (
    <div className="flex flex-col overflow-hidden border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="text-[14px] font-bold -tracking-[0.01em] tabular-nums text-slate-900">
            {listing.listingNo}
          </h3>
          <span className="shrink-0 text-[11px] font-semibold text-slate-500">
            {listing.breed || "-"}
            <span className="mx-0.5 text-slate-300">·</span>
            {listing.gender || "-"}
          </span>
          <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-px text-[10px] font-bold tabular-nums text-slate-700">
            {gradeLabel}
          </span>
          <span className="mx-1 text-slate-300">·</span>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">
            {total}
            <span className="ml-0.5 text-[10px] font-medium text-slate-400">
              부위
            </span>
          </span>
          <span className="text-slate-300">·</span>
          <span
            className={cn(
              "shrink-0 text-[11px] font-semibold tabular-nums",
              settled > 0 ? "text-sky-700" : "text-slate-400",
            )}
          >
            낙찰 {settled}
            <span
              className={cn(
                "ml-0.5 text-[10px] font-medium",
                settled > 0 ? "text-sky-500/70" : "text-slate-400",
              )}
            >
              건
            </span>
          </span>
        </div>

        <HideSettledToggle
          active={hideSettled}
          onClick={() => setHideSettled((v) => !v)}
        />
      </header>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          {/*
           * 컬럼 폭 설계 (8열) · 모든 컬럼 고정 폭으로 통일:
           * - auto 컬럼 제거 · `내 입찰가` 를 콘텐츠에 딱 맞춘 고정 폭으로 축소해
           *   `낙찰자` 와의 시각적 거리 해소
           * - 카드 폭 대비 sum ≈ 920px · 남는 미세 폭은 브라우저가 균등 분배
           * - 단가/총액 열들은 자릿수(6~7자리) 담을 수 있게 넉넉히
           */}
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-[132px]" />
            <col className="w-[92px]" />
            <col className="w-[116px]" />
            <col className="w-[116px]" />
            <col className="w-[132px]" />
            <col className="w-[116px]" />
            <col className="w-[160px]" />
          </colgroup>
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-2 py-2 text-center">
                회차
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">
                부위
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right">
                중량
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right">
                최저단가
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right">
                낙찰가
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right">
                낙찰대금
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right">
                낙찰자
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-right">
                내 입찰가
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleParts.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-xs text-slate-400"
                >
                  {listing.parts.length === 0
                    ? "등록된 부위가 없습니다."
                    : "낙찰 완료된 부위만 있습니다. 숨김 해제 후 확인해 주세요."}
                </td>
              </tr>
            ) : (
              visibleParts.map((part) => {
                const isFocused = focusPartNo === part.partNo;
                return (
                  <ResultRow
                    key={part.id}
                    part={part}
                    dealerId={dealerId}
                    isFocused={isFocused}
                    rowRef={isFocused ? focusRowRef : null}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 부위 1개 = 1행. sub-row 없음.
 *
 * 상태 판정:
 * - won  · winningBid.dealerId === dealerId (내가 낙찰)
 * - other · winningBid 존재 · 다른 딜러 낙찰
 * - lost · 낙찰자 없음 (유찰) + 내 입찰 있음
 * - noBid · 낙찰자 없음 + 내 입찰 없음
 */
function ResultRow({
  part,
  dealerId,
  isFocused,
  rowRef,
}: {
  part: LivePart;
  dealerId: string | null;
  isFocused: boolean;
  rowRef: React.RefObject<HTMLTableRowElement | null> | null;
}) {
  const winningBid = part.allBids.find((b) => b.isWinning) || null;
  const myBid = dealerId
    ? part.allBids.find((b) => b.dealerId === dealerId) || null
    : null;

  const iWon = !!(winningBid && dealerId && winningBid.dealerId === dealerId);
  const isSettled = isSettledPart(part);
  const iLost = !iWon && !!myBid && !winningBid;

  return (
    <tr
      ref={rowRef}
      className={cn(
        "border-b border-slate-100 last:border-b-0 transition-colors",
        iWon ? "bg-sky-50/70" : undefined,
        isFocused && "ring-2 ring-inset ring-sky-400",
      )}
    >
      <td className="px-2 py-2.5 text-center align-middle">
        <div className="flex justify-center">
          <RoundBadge roundNo={part.roundNo ?? null} />
        </div>
      </td>
      <td
        className={cn(
          "px-3 py-2.5 text-left align-middle text-[13px] font-semibold",
          iWon ? "text-sky-900" : "text-slate-900",
        )}
      >
        {part.partName}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-[12px] tabular-nums text-slate-700">
        {formatWeightKg(part.weight)}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle text-[12px] tabular-nums text-slate-500">
        {formatKrw(part.minPrice)}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-right align-middle text-[12px] tabular-nums",
          winningBid
            ? iWon
              ? "font-bold text-sky-700"
              : "font-bold text-slate-900"
            : "text-slate-300",
        )}
      >
        {winningBid ? formatKrw(winningBid.bidPrice) : "-"}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-right align-middle text-[12px] tabular-nums",
          winningBid
            ? iWon
              ? "font-bold text-sky-700"
              : "font-bold text-slate-900"
            : "text-slate-300",
        )}
      >
        {winningBid
          ? formatKrw(computeTotalAmount(winningBid.bidAmount, winningBid.bidPrice, part.weight))
          : "-"}
      </td>
      <td
        className={cn(
          "whitespace-nowrap px-3 py-2.5 text-right align-middle text-[12px] tabular-nums",
          winningBid
            ? iWon
              ? "font-semibold text-sky-800"
              : "text-slate-700"
            : "text-slate-300",
        )}
      >
        {winningBid?.dealerNo || "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle">
        <MyBidCell
          myBid={myBid}
          iWon={iWon}
          iLost={iLost}
          isSettled={isSettled}
        />
      </td>
    </tr>
  );
}

/**
 * 내 입찰가 셀 · 상태 배지 인라인.
 *
 * - 내 낙찰: `97,500` (sky-700) + `낙찰` chip
 * - 내 미낙찰 (회차 유찰 등 낙찰자 없음): `1,800` (slate-500) + `미낙찰` chip
 * - 다른 딜러 낙찰 · 내 입찰 있음: 값만 (slate-500)
 * - 미입찰 · 완전 유찰: `-`
 */
function MyBidCell({
  myBid,
  iWon,
  iLost,
  isSettled,
}: {
  myBid: LivePartBid | null;
  iWon: boolean;
  iLost: boolean;
  isSettled: boolean;
}) {
  if (!myBid) {
    return <span className="text-[12px] text-slate-300">-</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "text-[12px] tabular-nums",
          iWon ? "font-bold text-sky-700" : "text-slate-600",
        )}
      >
        {formatKrw(myBid.bidPrice)}
      </span>
      {iWon ? (
        <span className="inline-flex shrink-0 items-center bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          낙찰
        </span>
      ) : iLost && isSettled ? (
        <span className="inline-flex shrink-0 items-center bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600">
          미낙찰
        </span>
      ) : null}
    </span>
  );
}

function HideSettledToggle({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors",
        active
          ? "border-sky-500 bg-sky-50 text-sky-700 hover:border-sky-500"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
      )}
      aria-pressed={active}
    >
      <EyeOff className="h-3 w-3" />
      낙찰분 숨김
    </button>
  );
}

/**
 * `PartsTable` 과 동일한 마감 판정 규칙 · `allBids` 내 rank 부여된 bid 존재 여부.
 */
function isSettledPart(part: LivePart): boolean {
  return part.allBids.some((b) => b.rank != null);
}

/**
 * 총 낙찰대금 계산 · `bidAmount` 우선, 없으면 `bidPrice × weight` 로 fallback.
 * 서버에서 계산된 값이 있어야 정합성이 맞지만 · 안전망으로 클라이언트 재계산 지원.
 */
function computeTotalAmount(
  bidAmount: number | null | undefined,
  bidPrice: number | null | undefined,
  weight: number | null | undefined,
): number | null {
  if (bidAmount && bidAmount > 0) return bidAmount;
  if (bidPrice && weight && bidPrice > 0 && weight > 0) {
    return Math.round(bidPrice * weight);
  }
  return null;
}

/**
 * 회차 배지 · 1차/2차/3차 를 색 톤으로 시각 구분.
 * `HistoryCalendarPanel` 과 동일 스펙 유지.
 */
function RoundBadge({ roundNo }: { roundNo: number | null }) {
  if (roundNo == null) {
    return <span className="text-[11px] text-slate-300">-</span>;
  }
  const styleMap: Record<number, string> = {
    1: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200",
    2: "bg-slate-200 text-slate-700",
    3: "bg-slate-800 text-white",
  };
  const cls = styleMap[roundNo] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center whitespace-nowrap px-1.5 text-[10px] font-bold leading-none tabular-nums",
        cls,
      )}
    >
      {roundNo}차
    </span>
  );
}
