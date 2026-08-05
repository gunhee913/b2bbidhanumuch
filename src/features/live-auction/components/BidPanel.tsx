"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { useCreateBid } from "@/features/auctions/hooks";
import { cn } from "@/lib/utils";
import type { LiveListing, LivePart } from "../api";
import { formatWon, formatWeightKg, formatWonPerKg } from "../lib/masking";
import { formatGradeLabel } from "../lib/grade";
import { MarketStatsPanel } from "./MarketStatsPanel";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
const STEP_BUTTONS: { label: string; delta: number }[] = [
  { label: "+1", delta: 1 },
  { label: "+10", delta: 10 },
  { label: "+100", delta: 100 },
  { label: "+1,000", delta: 1000 },
];

export interface BidPanelProps {
  listing: LiveListing;
  allListings: LiveListing[];
  selectedPart: LivePart | null;
  dealerId: string | null;
  isLoggedIn: boolean;
  isAuthorized: boolean;
  canBid: boolean;
  disabledReason?: string;
  onRequestLogin: () => void;
  onRequestPermission: () => void;
  /**
   * 하단 시세 mini chart (`MarketStatsPanel`) 를 숨김.
   * 부위별 뷰는 우측 컬럼 상단에 `PartMarketChart` 를 별도로 두므로
   * BidPanel 내부 mini chart 는 중복이라 이 옵션으로 끈다.
   */
  hideMarketPanel?: boolean;
}

export function BidPanel({
  listing,
  allListings,
  selectedPart,
  dealerId,
  isLoggedIn,
  isAuthorized,
  canBid,
  disabledReason,
  onRequestLogin,
  onRequestPermission,
  hideMarketPanel,
}: BidPanelProps) {
  const queryClient = useQueryClient();
  const createBid = useCreateBid();
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myBid = useMemo(() => {
    if (!selectedPart || !dealerId) return null;
    return selectedPart.allBids.find((b) => b.dealerId === dealerId) ?? null;
  }, [selectedPart, dealerId]);

  const initialPrice = myBid?.bidPrice ?? selectedPart?.minPrice ?? 0;
  const [price, setPrice] = useState<number>(initialPrice);

  useEffect(() => {
    setPrice(myBid?.bidPrice ?? selectedPart?.minPrice ?? 0);
    setError(null);
  }, [selectedPart?.id, myBid?.bidPrice, selectedPart?.minPrice]);

  if (!selectedPart) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 px-6 py-8 text-center">
        <div className="bg-slate-100 p-3">
          <Info className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500">
          부위를 선택해 주세요
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          왼쪽 표에서 부위를 클릭하면
          <br />
          여기에서 입찰가를 조정할 수 있습니다.
        </p>
      </div>
    );
  }

  const totalAmount = selectedPart.weight
    ? Math.round(price * selectedPart.weight)
    : 0;
  const isValidPrice =
    price > 0 && (!selectedPart.minPrice || price >= selectedPart.minPrice);
  const disabled = !canBid || !isLoggedIn || !isAuthorized;
  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);

  // 회차 마감 여부: 어떤 bid 든 rank 가 세팅되면 마감된 회차
  const isSettled = selectedPart.allBids.some((b) => b.rank != null);
  const winningBid = selectedPart.allBids.find((b) => b.isWinning) ?? null;

  const submit = async () => {
    setError(null);
    if (!isLoggedIn) return onRequestLogin();
    if (!isAuthorized) return onRequestPermission();
    if (!dealerId) return setError("중도매인 정보가 확인되지 않습니다.");
    if (!canBid)
      return setError(disabledReason || "입찰 가능한 상태가 아닙니다.");
    if (!selectedPart.weight)
      return setError("중량 정보가 없어 입찰할 수 없습니다.");
    if (!isValidPrice) return setError("최저가 이상의 금액을 입력해주세요.");

    try {
      await createBid.mutateAsync({
        partId: selectedPart.id,
        dealerId,
        bidPrice: price,
        weight: selectedPart.weight,
      });
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "listings"],
      });
    } catch (e: any) {
      setError(e?.message || "입찰 등록에 실패했습니다.");
    }
  };

  const cancel = async () => {
    if (!myBid) return;
    setError(null);
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/bids/${myBid.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "입찰 취소에 실패했습니다.");
      }
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "listings"],
      });
    } catch (e: any) {
      setError(e?.message || "입찰 취소에 실패했습니다.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 컴팩트 헤더 */}
      <header className="border-b border-slate-100 px-5 pt-3.5 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[17px] font-bold leading-none text-slate-900">
            {selectedPart.partName}
          </h3>
          <span className="inline-flex items-center bg-slate-100 px-1.5 py-px text-[10px] font-bold tabular-nums text-slate-700">
            {gradeLabel}
          </span>
          <MyBidStatusChip myBid={myBid} isSettled={isSettled} />
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="tabular-nums">
            {formatWeightKg(selectedPart.weight)}
          </span>
          <span className="text-slate-300">·</span>
          <span className="tabular-nums">
            최저 {formatWonPerKg(selectedPart.minPrice)}
          </span>
        </div>
      </header>

      {isSettled ? (
        <SettledResultBody
          part={selectedPart}
          myBid={myBid}
          winningBid={winningBid}
        />
      ) : (
        <>
          {/* 입력 영역 */}
          <div className="px-5 py-4">
            <label className="text-[11px] font-semibold text-slate-500">
              내 입찰가 <span className="text-slate-400">(원/kg)</span>
            </label>
            <div className="relative mt-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={NUMBER_FORMATTER.format(price)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "");
                  setPrice(Number(digits) || 0);
                  setError(null);
                }}
                disabled={disabled}
                className={cn(
                  "h-11 w-full border border-slate-300 bg-white px-3 pr-12 text-right text-[18px] font-bold tabular-nums text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100",
                  "disabled:bg-slate-50 disabled:text-slate-400",
                )}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                원
              </span>
            </div>

            <div className="mt-2 grid grid-cols-5 gap-1">
              {STEP_BUTTONS.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => {
                    setPrice((p) => Math.max(0, p + btn.delta));
                    setError(null);
                  }}
                  disabled={disabled}
                  className={cn(
                    "h-8 border border-slate-200 bg-white text-[11px] font-semibold tabular-nums text-slate-700 transition-colors",
                    "hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700",
                    "disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700",
                  )}
                >
                  {btn.label}
                </button>
              ))}
              {/* 초기화 · 최저단가로 리셋 · 증분 버튼과 톤 분리 (slate) */}
              <button
                type="button"
                onClick={() => {
                  setPrice(selectedPart.minPrice ?? 0);
                  setError(null);
                }}
                disabled={disabled}
                title="최저단가로 초기화"
                className={cn(
                  "h-8 border border-slate-200 bg-white text-[11px] font-semibold text-slate-500 transition-colors",
                  "hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800",
                  "disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500",
                )}
              >
                초기화
              </button>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-slate-200 pt-3">
              <span className="text-[11px] font-semibold text-slate-500">
                총 입찰금액
              </span>
              <div className="text-right">
                <div className="text-[20px] font-bold tabular-nums leading-none text-slate-900">
                  {formatWon(totalAmount)}
                </div>
                <div className="mt-1 text-[10px] text-slate-400 tabular-nums">
                  {NUMBER_FORMATTER.format(price)}원/kg ×{" "}
                  {formatWeightKg(selectedPart.weight)}
                </div>
              </div>
            </div>

            {price > 0 && !isValidPrice && selectedPart.minPrice ? (
              <div className="mt-3 flex items-start gap-1.5 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                <AlertCircle className="mt-px h-3 w-3 shrink-0" />
                <span>
                  최저단가 {formatWonPerKg(selectedPart.minPrice)} 이상으로
                  입력해 주세요.
                </span>
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 flex items-start gap-1.5 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
                <AlertCircle className="mt-px h-3 w-3 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 px-5 py-3">
            <BidActionButtons
              loginState={
                !isLoggedIn
                  ? "unauthenticated"
                  : !isAuthorized
                    ? "unauthorized"
                    : "ready"
              }
              hasBid={!!myBid}
              disabled={disabled || createBid.isPending}
              isSubmitting={createBid.isPending}
              isCancelling={isCancelling}
              onSubmit={submit}
              onCancel={cancel}
            />
          </div>
        </>
      )}

      {!hideMarketPanel ? (
        <MarketStatsPanel
          allListings={allListings}
          currentListing={listing}
          currentPartName={selectedPart.partName}
        />
      ) : null}
    </div>
  );
}

/**
 * 회차 마감 후 결과 카드. 낙찰/유찰/미입찰 케이스 모두 처리.
 * Closed-bid: 회차 마감 후에만 낙찰자/낙찰가 노출.
 */
function SettledResultBody({
  part,
  myBid,
  winningBid,
}: {
  part: LivePart;
  myBid: LivePart["allBids"][number] | null;
  winningBid: LivePart["allBids"][number] | null;
}) {
  const iWon = !!myBid?.isWinning;
  const iLost = !!myBid && !myBid.isWinning;
  const winningAmount =
    winningBid && part.weight ? Math.round(winningBid.bidPrice * part.weight) : 0;
  const settledAt = winningBid?.bidAt ? new Date(winningBid.bidAt) : null;

  return (
    <div className="px-5 py-4">
      {/* 낙찰가 · 총 낙찰금액 (강조) */}
      <div
        className={cn(
          "border-l-[3px] px-4 py-3",
          iWon
            ? "border-sky-600 bg-sky-50/60"
            : "border-slate-300 bg-slate-50/60",
        )}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold text-slate-500">
            낙찰가
          </span>
          <span
            className={cn(
              "text-[18px] font-bold tabular-nums",
              iWon ? "text-sky-700" : "text-slate-800",
            )}
          >
            {formatWonPerKg(winningBid?.bidPrice ?? null)}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold text-slate-500">
            총 낙찰금액
          </span>
          <span
            className={cn(
              "text-[13px] font-bold tabular-nums",
              iWon ? "text-sky-700" : "text-slate-700",
            )}
          >
            {formatWon(winningAmount)}
          </span>
        </div>
      </div>

      {/* 낙찰자 · 확정 시각 */}
      <dl className="mt-3 space-y-1.5 text-[11px]">
        <div className="flex items-baseline justify-between">
          <dt className="font-medium text-slate-500">낙찰자</dt>
          <dd className="font-semibold tabular-nums text-slate-800">
            {winningBid?.dealerNo || "-"}
          </dd>
        </div>
        {settledAt ? (
          <div className="flex items-baseline justify-between">
            <dt className="font-medium text-slate-500">확정 시각</dt>
            <dd className="font-semibold tabular-nums text-slate-700">
              {format(settledAt, "HH:mm")}
            </dd>
          </div>
        ) : null}
      </dl>

      {/* 내 입찰 참고 (유찰 시에만) */}
      {iLost && myBid ? (
        <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="font-medium text-slate-500">내 입찰가</span>
            <span className="font-semibold tabular-nums text-slate-600">
              {formatWonPerKg(myBid.bidPrice)}
            </span>
          </div>
        </div>
      ) : null}

      {/* disabled 안내 */}
      <div className="mt-4 flex items-center justify-center bg-slate-100 py-2.5 text-[11px] font-semibold text-slate-500">
        {iWon
          ? "낙찰 확정 · 입찰 종료"
          : iLost
            ? "회차 마감 · 편집 불가"
            : "회차 마감"}
      </div>
    </div>
  );
}

function MyBidStatusChip({
  myBid,
  isSettled,
}: {
  myBid: LivePart["allBids"][number] | null;
  isSettled: boolean;
}) {
  if (isSettled && myBid?.isWinning) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700">
        <span className="h-1 w-1 bg-sky-600" aria-hidden />
        낙찰
      </span>
    );
  }

  if (isSettled && myBid) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
        <span className="h-1 w-1 bg-slate-400" aria-hidden />
        유찰
      </span>
    );
  }

  if (isSettled) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
        마감
      </span>
    );
  }

  if (myBid) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700">
        <span className="h-1 w-1 bg-sky-500" aria-hidden />
        입찰중
      </span>
    );
  }

  return null;
}

function BidActionButtons({
  loginState,
  hasBid,
  disabled,
  isSubmitting,
  isCancelling,
  onSubmit,
  onCancel,
}: {
  loginState: "unauthenticated" | "unauthorized" | "ready";
  hasBid: boolean;
  disabled: boolean;
  isSubmitting: boolean;
  isCancelling: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  if (loginState === "unauthenticated") {
    return (
      <button
        type="button"
        onClick={onSubmit}
        className="h-11 w-full bg-slate-100 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
      >
        로그인 후 입찰 가능
      </button>
    );
  }

  if (loginState === "unauthorized") {
    return (
      <button
        type="button"
        onClick={onSubmit}
        className="h-11 w-full bg-amber-100 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-200"
      >
        이 공판장 권한 필요
      </button>
    );
  }

  if (hasBid) {
    return (
      <div className="grid grid-cols-[1.6fr_1fr] gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className={cn(
            "h-11 bg-sky-600 text-sm font-bold text-white transition-colors hover:bg-sky-700",
            disabled && "opacity-50",
          )}
        >
          {isSubmitting ? "처리 중..." : "입찰 변경"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled || isCancelling}
          className="h-11 border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
        >
          {isCancelling ? "취소 중..." : "입찰취소"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={disabled}
      className={cn(
        "h-11 w-full bg-slate-900 text-sm font-bold text-white transition-colors hover:bg-slate-800",
        disabled && "opacity-50",
      )}
    >
      {isSubmitting ? "처리 중..." : "입찰하기"}
    </button>
  );
}

