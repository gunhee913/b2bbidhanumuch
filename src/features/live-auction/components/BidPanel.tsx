"use client";

import { useEffect, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Info, TrendingUp } from "lucide-react";
import { useCreateBid } from "@/features/auctions/hooks";
import { cn } from "@/lib/utils";
import type { LiveListing, LivePart } from "../api";
import { formatWon, formatWeightKg, formatWonPerKg } from "../lib/masking";
import { formatGradeLabel } from "../lib/grade";
import { MIN_BID_INCREMENT } from "../constants/bidding";
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

  // 오픈 최고가 · 진행 중 회차에서 현재 최고가 (매참인 익명)
  const topBid = selectedPart?.topBid ?? null;
  const iAmTop = !!topBid?.isMine;
  // 내가 1위가 아니면 최고가 + 최소 증가폭 이상이어야 갱신 가능
  const nextMinBid = useMemo(() => {
    if (!selectedPart) return null;
    if (!topBid) return selectedPart.minPrice ?? null;
    if (iAmTop) return selectedPart.minPrice ?? topBid.bidPrice;
    return topBid.bidPrice + MIN_BID_INCREMENT;
  }, [selectedPart, topBid, iAmTop]);

  const suggestedInitial = useMemo(() => {
    if (myBid) return myBid.bidPrice;
    if (nextMinBid) return nextMinBid;
    return selectedPart?.minPrice ?? 0;
  }, [myBid, nextMinBid, selectedPart?.minPrice]);

  const [price, setPrice] = useState<number>(suggestedInitial);

  useEffect(() => {
    setPrice(suggestedInitial);
    setError(null);
  }, [selectedPart?.id, suggestedInitial]);

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
  const meetsMinPrice =
    price > 0 && (!selectedPart.minPrice || price >= selectedPart.minPrice);
  const meetsNextMin = !nextMinBid || price >= nextMinBid;
  const isValidPrice = meetsMinPrice && meetsNextMin;
  const disabled = !canBid || !isLoggedIn || !isAuthorized;
  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);

  // 회차 마감 여부: 어떤 bid 든 rank 가 세팅되면 마감된 회차
  const isSettled = selectedPart.allBids.some((b) => b.rank != null);
  // 내가 이미 입찰 했는데 1위가 아닌 경우 → 역전당한 상태 (아웃비드)
  const isOutbid = !isSettled && !!myBid && !iAmTop && !!topBid;

  const submit = async () => {
    setError(null);
    if (!isLoggedIn) return onRequestLogin();
    if (!isAuthorized) return onRequestPermission();
    if (!dealerId) return setError("중도매인 정보가 확인되지 않습니다.");
    if (!canBid)
      return setError(disabledReason || "입찰 가능한 상태가 아닙니다.");
    if (!selectedPart.weight)
      return setError("중량 정보가 없어 입찰할 수 없습니다.");
    if (!meetsMinPrice) return setError("최저가 이상의 금액을 입력해주세요.");
    if (!meetsNextMin && nextMinBid)
      return setError(
        `현재 최고가보다 최소 ${NUMBER_FORMATTER.format(nextMinBid)}원/kg 이상 입력해 주세요.`,
      );

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
      {/* 컴팩트 헤더 · settled/live 동일 · 상태 chip 이 자연스럽게 마감 상태 노출 */}
      <header className="border-b border-slate-100 px-5 pt-3.5 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[17px] font-bold leading-none text-slate-900">
            {selectedPart.partName}
          </h3>
          <span className="inline-flex items-center bg-slate-100 px-1.5 py-px text-[10px] font-bold tabular-nums text-slate-700">
            {gradeLabel}
          </span>
          <MyBidStatusChip
            myBid={myBid}
            isSettled={isSettled}
            iAmTop={iAmTop}
            isOutbid={isOutbid}
          />
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

      {/* 현재 최고가 요약 · 오픈 최고가 정책 */}
      <TopBidSummary
        topBid={topBid}
        iAmTop={iAmTop}
        nextMinBid={nextMinBid}
      />

      {/* 아웃비드 배너 */}
      {isOutbid && topBid ? (
        <div className="mx-5 mt-3 flex items-start gap-2 border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 text-[11.5px] font-semibold text-amber-800">
          <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-relaxed">
            타 매참인이 더 높은 가격으로 입찰했습니다.
            <br />
            최소{" "}
            <span className="font-bold tabular-nums">
              {formatWonPerKg(nextMinBid)}
            </span>{" "}
            이상 입력해야 1위 갱신이 가능합니다.
          </span>
        </div>
      ) : null}

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
          {/* 최소 갱신가로 즉시 세팅 · 오픈 최고가 UX */}
          <button
            type="button"
            onClick={() => {
              if (nextMinBid) setPrice(nextMinBid);
              setError(null);
            }}
            disabled={disabled || !nextMinBid}
            title={
              iAmTop || !topBid
                ? "최저단가로 초기화"
                : "타 매참인 최고가보다 한 단계 위로"
            }
            className={cn(
              "h-8 border text-[11px] font-semibold transition-colors",
              isOutbid
                ? "border-amber-400 bg-amber-50 text-amber-700 hover:border-amber-500 hover:bg-amber-100"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800",
              "disabled:opacity-40",
            )}
          >
            {isOutbid ? "1위 갱신가" : "최소가"}
          </button>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-slate-200 pt-3">
          <span className="text-[11px] font-semibold text-slate-500">
            총 입찰금액
          </span>
          <div className="text-right">
            <NumberFlow
              value={totalAmount}
              locales="ko-KR"
              suffix="원"
              className="text-[20px] font-bold tabular-nums leading-none text-slate-900"
              willChange
              respectMotionPreference
            />
            <div className="mt-1 text-[10px] text-slate-400 tabular-nums">
              {NUMBER_FORMATTER.format(price)}원/kg ×{" "}
              {formatWeightKg(selectedPart.weight)}
            </div>
          </div>
        </div>

        {price > 0 && !meetsMinPrice && selectedPart.minPrice ? (
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
          isSettled={isSettled}
          disabled={disabled || createBid.isPending}
          isSubmitting={createBid.isPending}
          isCancelling={isCancelling}
          onSubmit={submit}
          onCancel={cancel}
        />
      </div>

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
 * 오픈 최고가 · 부위 헤더 우측에 표시되는 상태 배지.
 * - 낙찰 / 미낙찰 / 마감 : 회차 마감 후 (내 관점)
 * - 1위 : 진행 중이며 내가 현재 최고가 보유
 * - 역전당함 : 진행 중이지만 내 입찰이 최고가에서 밀려남
 * - 입찰중 : 진행 중이며 내가 입찰했으나 아직 최고가 계산 전 (희귀 케이스)
 */
function MyBidStatusChip({
  myBid,
  isSettled,
  iAmTop,
  isOutbid,
}: {
  myBid: LivePart["allBids"][number] | null;
  isSettled: boolean;
  iAmTop: boolean;
  isOutbid: boolean;
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
        미낙찰
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

  if (iAmTop) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
        <span className="h-1 w-1 bg-white" aria-hidden />
        1위
      </span>
    );
  }

  if (isOutbid) {
    return (
      <span className="ml-auto inline-flex items-center gap-1 bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
        <span className="h-1 w-1 bg-white" aria-hidden />
        역전당함
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

/**
 * 오픈 최고가 · 현재 최고가 요약 카드.
 * - 진행 중 회차에서만 렌더링 (settled 여부는 부모가 판단)
 * - iAmTop 이면 sky 강조, 아니면 slate 안내
 * - 최고가 없으면 "첫 입찰 대기" placeholder
 */
function TopBidSummary({
  topBid,
  iAmTop,
  nextMinBid,
}: {
  topBid: LivePart["topBid"];
  iAmTop: boolean;
  nextMinBid: number | null;
}) {
  if (!topBid) {
    return (
      <div className="mx-5 mt-4 border-l-[3px] border-slate-300 bg-slate-50 px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold text-slate-500">
            현재 최고가
          </span>
          <span className="text-[13px] font-bold tabular-nums text-slate-400">
            첫 입찰 대기
          </span>
        </div>
        <div className="mt-0.5 text-[10.5px] font-medium text-slate-400">
          최저단가부터 입찰이 시작됩니다.
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-5 mt-4 border-l-[3px] px-3 py-2.5",
        iAmTop
          ? "border-sky-600 bg-sky-50/60"
          : "border-slate-400 bg-slate-50",
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          현재 최고가
          {iAmTop ? (
            <span className="inline-flex items-center bg-sky-600 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white">
              나
            </span>
          ) : null}
        </span>
        <NumberFlow
          value={Math.round(topBid.bidPrice)}
          locales="ko-KR"
          suffix="원/kg"
          className={cn(
            "text-[16px] font-bold tabular-nums",
            iAmTop ? "text-sky-700" : "text-slate-800",
          )}
          willChange
          respectMotionPreference
        />
      </div>
      {!iAmTop && nextMinBid ? (
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-[10.5px] font-medium text-slate-500">
            1위 갱신가
          </span>
          <NumberFlow
            value={Math.round(nextMinBid)}
            locales="ko-KR"
            suffix="원/kg 이상"
            className="text-[12px] font-bold tabular-nums text-slate-700"
            willChange
            respectMotionPreference
          />
        </div>
      ) : null}
    </div>
  );
}

function BidActionButtons({
  loginState,
  hasBid,
  isSettled,
  disabled,
  isSubmitting,
  isCancelling,
  onSubmit,
  onCancel,
}: {
  loginState: "unauthenticated" | "unauthorized" | "ready";
  hasBid: boolean;
  isSettled: boolean;
  disabled: boolean;
  isSubmitting: boolean;
  isCancelling: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  // 회차 마감 · 모든 액션 무효 · 단일 disabled 버튼으로 상태 명확히 전달
  if (isSettled) {
    return (
      <button
        type="button"
        disabled
        aria-disabled
        className="h-11 w-full cursor-not-allowed bg-slate-100 text-sm font-bold text-slate-500"
      >
        경매 종료
      </button>
    );
  }

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

