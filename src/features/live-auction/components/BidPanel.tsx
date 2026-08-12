"use client";

import { useEffect, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { useCreateBid } from "@/features/auctions/hooks";
import { cn } from "@/lib/utils";
import type { LiveListing, LivePart } from "../api";
import { formatWeightKg } from "../lib/masking";
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

  /*
   * 입력 값이 최저단가와 정확히 일치하는 상태 · placeholder-like 표시용.
   *
   * 최저단가는 "경매 시작가(플로어)" 라서 그대로 두면 실질적으로 의미 있는
   * 입찰이 되지 않는다. 사용자가 값을 능동적으로 조정하도록 유도하기 위해
   * 이 조건일 때 input 값을 회색으로 dim 처리 (활성 입력 색 대비).
   *
   * 사용자가 한 자리라도 수정하면 자동 해제 → 정상 강조 색으로 복귀.
   */
  const isAtMinPriceFloor =
    selectedPart.minPrice != null && price === selectedPart.minPrice;

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
      {/*
       * 헤더 · 1줄 인라인 · Trading UI 표준 (Upbit 마켓 헤더 style).
       *
       * 배치 (좌 → 우):
       *   [부위명 · dominant] [등급 · accent] · [업체명 · meta] · [중량 · meta]
       *
       * 위계 (전부 baseline align · 1줄):
       *   - 부위명 · 16px bold slate-900        · PRIMARY (뭘 사는가)
       *   - 등급   · 13px bold sky-700          · SECONDARY (품질 신호 · accent 색으로 구분)
       *   - 업체명 · 12px medium slate-500      · META (어느 목장)
       *   - 중량   · 12px medium slate-500      · META (계산 기준)
       *
       * 이전 설계 문제:
       *   - 2줄 (등급 위 · 업체명+중량 아래) · chip 자리 없어지자 우측 공백
       *   - Line 2 가 orphan 느낌 · 계층 관계 모호
       *
       * 새 설계:
       *   - 사이즈+굵기+색상만으로 계층 표현 · 모두 1줄
       *   - 상태 chip (낙찰/미낙찰/1위/입찰중/역전) 전부 제거
       *     · 내 입찰가 tile 톤 + 왼쪽 테이블 row 톤으로 상태 이미 전달
       *     · 헤더는 "정체성" 만 담당 · 상태는 데이터가 스스로 말함
       *   - 긴 업체명은 truncate · min-w-0 로 flex-shrink 허용
       */}
      <header className="border-b border-slate-100 px-5 pt-4 pb-3">
        <div className="flex items-baseline gap-1.5">
          <h3 className="shrink-0 text-[16px] font-bold leading-none tracking-tight text-slate-900">
            {selectedPart.partName}
          </h3>
          <span className="shrink-0 text-slate-300">·</span>
          <span className="shrink-0 text-[13px] font-semibold tabular-nums leading-none text-slate-700">
            {gradeLabel}
          </span>
          <span className="shrink-0 text-slate-300">·</span>
          <span className="min-w-0 truncate text-[12px] font-medium leading-none text-slate-500">
            {listing.companyName}
          </span>
          <span className="shrink-0 text-slate-300">·</span>
          <span className="shrink-0 text-[12px] font-medium tabular-nums leading-none text-slate-500">
            {formatWeightKg(selectedPart.weight)}
          </span>
        </div>
      </header>

      {/*
       * 3-column 시세 tile · Upbit 마켓 정보 style.
       *
       * 최저단가 | 현재 최고가 | 내 입찰가
       * - 현재 최고가만 sky-50 배경 + sky-700 텍스트 (매수 primary · 시장 앵커)
       * - 내 입찰가는 내 상태에 따라 tone 변화:
       *   · iAmTop (1위)      · sky (내가 최고가)
       *   · isOutbid (역전)    · rose (내가 밀림)
       *   · 낙찰(마감 후)      · sky
       *   · 미낙찰(마감 후)    · slate
       *   · 미입찰            · slate "—"
       * - 이전에 사용했던 "갱신가" 라는 용어는 도메인에서 쓰이지 않아 제거.
       *   "얼마 이상 입찰해야 1위 되는지" 는 input 초기값과 인라인 경고로 대체.
       */}
      <PriceTileRow
        minPrice={selectedPart.minPrice}
        topPrice={topBid?.bidPrice ?? null}
        myBidPrice={myBid?.bidPrice ?? null}
        iAmTop={iAmTop}
        isOutbid={isOutbid}
        isSettled={isSettled}
        isWinning={!!myBid?.isWinning}
      />

      {/*
       * Input 독립 블록 · 명확한 editable affordance.
       *
       * 이전(v2) 은 label-value 3행 표 안에 input 을 섞어 놓아 편집 가능한 행과
       * readonly 행이 구분되지 않았다 (사용자 피드백: "입력폼 같은 느낌이 아니라
       * 입력이 되어있는 느낌"). Interaction affordance 실패.
       *
       * v3: input 을 독립 블록으로 분리 · 표준 form input 어포던스 적용:
       * - 명확한 border (idle slate-300 → hover slate-400 → focus sky-500)
       * - focus:ring-2 (sky glow)
       * - caret-sky-600 (커서 눈에 띔)
       * - "원" suffix (Upbit KRW 처럼 unit 명시)
       * - 위에 별도 label ("입찰가 (원/kg)")
       */}
      <div className="mx-5 mt-4">
        <label
          htmlFor="bid-price-input"
          className="mb-1.5 block text-[11px] font-semibold text-slate-600"
        >
          입찰가
          <span className="ml-1 text-[10px] font-medium text-slate-400">
            (원/kg)
          </span>
        </label>
        <div className="relative">
          <input
            id="bid-price-input"
            type="text"
            inputMode="numeric"
            value={NUMBER_FORMATTER.format(price)}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "");
              setPrice(Number(digits) || 0);
              setError(null);
            }}
            disabled={disabled}
            /*
             * text-color 우선순위:
             * 1) disabled  · slate-400 (form primitive convention)
             * 2) 최저단가 floor · slate-400 (placeholder-like · 조정 유도)
             * 3) 그 외    · slate-900 (활성 입력)
             *
             * disabled 스타일은 반드시 뒤에 와야 우선 적용 됨 (Tailwind cascade).
             */
            className={cn(
              "h-12 w-full border bg-white px-4 pr-10 text-right text-[18px] font-bold tabular-nums caret-sky-600 transition-colors",
              "border-slate-300 hover:border-slate-400",
              "focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20",
              isAtMinPriceFloor
                ? "text-slate-400 font-semibold"
                : "text-slate-900",
              "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400",
            )}
          />
          <span
            className={cn(
              "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold transition-colors",
              isAtMinPriceFloor ? "text-slate-300" : "text-slate-400",
            )}
          >
            원
          </span>
        </div>

        {/*
         * 스텝 버튼 · input 바로 아래 배치 (Gestalt proximity).
         *
         * 입찰가 값을 조작하는 컨트롤(input + step)끼리 인접하게 두어
         * 조작 흐름이 자연스러움. 이전엔 총액 아래에 있어 시각적으로
         * "총액 관련 액션" 처럼 오해될 여지가 있었음.
         */}
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
          {/*
           * "최소가" 버튼 · 라벨/스타일 통일.
           *
           * 내부 동작은 상황에 따라 스마트 (nextMinBid):
           *   - 내가 최고가거나 최고가 없음 → 부위 최저단가로 초기화
           *   - 타 매참인이 최고가        → 그 위 +1원 (MIN_BID_INCREMENT)
           * 그러나 UI 라벨은 항상 "최소가" 로 통일해 노이즈 최소화.
           * outbid 시의 urgency 는 이미 내 입찰가 tile 의 rose 톤이 전달함.
           */}
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
                : "현재 최고가 +1원 (역전 최소값)"
            }
            className={cn(
              "h-8 border text-[11px] font-semibold transition-colors",
              "border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800",
              "disabled:opacity-40",
            )}
          >
            최소가
          </button>
        </div>

        {/*
         * 중량/낙찰대금 요약 · Uniform Typography.
         *
         * 두 값 모두 같은 사이즈·굵기.
         * 이유:
         * - 6자리 숫자(총액) vs 짧은 kg(중량) → 숫자 자체의 시각 무게가 이미 차이 만듦
         * - CTA(sky-600 primary) 와 강조 경쟁 방지 → 요약은 quiet
         * - "Emphasize by exception" 원칙 · 모든 걸 강조하면 아무것도 강조 안 됨
         */}
        <dl className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <dt className="text-[12px] font-medium text-slate-500">중량</dt>
            <dd className="text-[14px] font-semibold tabular-nums text-slate-800">
              {formatWeightKg(selectedPart.weight)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-[12px] font-medium text-slate-500">
              낙찰대금
            </dt>
            <dd>
              <NumberFlow
                value={totalAmount}
                locales="ko-KR"
                suffix="원"
                className="text-[14px] font-semibold tabular-nums text-slate-800"
                willChange
                respectMotionPreference
              />
            </dd>
          </div>
        </dl>

        {/* 인라인 경고 · 최저단가 미달 시 얇게 표시 (배너 대신) */}
        {price > 0 && !meetsMinPrice && selectedPart.minPrice ? (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>최저단가 이상 입력이 필요합니다.</span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-red-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 px-5 pb-4">
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
 * 시세 스트립 · Bloomberg terminal 방식 · 값 색상 자체가 신호.
 *
 * 디자인 언어:
 *   - 카드/배경/underline bar/dot/뱃지 다 없음 · 값 typography 만
 *   - 3-column · divide-x 수직 라인 · Segmented reading rhythm
 *   - 상태는 값 색상 하나로 전달 (Bloomberg/Reuters classic)
 *   - 단위 "원/kg" 반복 제거 · 하단에 한 번만 subtle caption
 *
 * 값 색상 계층 (자연스러운 3-tier hierarchy):
 *   - 최저단가     · slate-500  · reference · 참고 정보 (subdued)
 *   - 현재 최고가   · slate-900  · dominant · 시장 앵커 (강조)
 *   - 내 입찰가    · state 색   · personal · 상태 신호 (sky/rose/slate)
 *
 * 이전 반복 실패:
 *   - v1 · 3색 배경 stripe → 쿠폰 스티커
 *   - v2 · 하단 accent bar → AI 랜딩 클리셰
 *   - v3 · Ring 카드 + hover → 여전히 카드 노이즈
 *   - v4 · Vertical order book → 옆으로가 낫다
 *   - v5 · Horizontal + dot → dot 도 데코임
 *
 * 최종 · Colored Values Only:
 *   - 값 색상 = 신호 · 데코 zero
 *   - 라벨 균일 · 값만 위계 표현
 */

type PriceState = "default" | "sky" | "rose";

function PriceTileRow({
  minPrice,
  topPrice,
  myBidPrice,
  iAmTop,
  isOutbid,
  isSettled,
  isWinning,
}: {
  minPrice: number | null;
  topPrice: number | null;
  myBidPrice: number | null;
  iAmTop: boolean;
  isOutbid: boolean;
  isSettled: boolean;
  isWinning: boolean;
}) {
  const myState: PriceState =
    isSettled && isWinning
      ? "sky"
      : !isSettled && iAmTop
        ? "sky"
        : !isSettled && isOutbid
          ? "rose"
          : "default";

  return (
    <motion.div
      className="mx-5 mt-4 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-200/70"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <PriceCell label="최저단가" value={minPrice} valueTone="muted" />
      <PriceCell label="현재 최고가" value={topPrice} valueTone="anchor" />
      <PriceCell label="내 입찰가" value={myBidPrice} valueTone={myState} />
    </motion.div>
  );
}

/**
 * 값 색상 · CVA variant · 위계 3-tier + state 2종.
 *
 * - muted   · slate-500 · 참고 정보 (reference)
 * - anchor  · slate-900 · 시장 앵커 (dominant)
 * - default · slate-900 · 내 값 · 상태 없음 (기본)
 * - sky     · sky-700   · 내 값 · 승리 중 (1위/낙찰)
 * - rose    · rose-700  · 내 값 · 역전당함 (경고)
 */
const valueStyles = cva(
  "text-[15px] font-bold tabular-nums leading-none",
  {
    variants: {
      valueTone: {
        muted: "text-slate-500",
        anchor: "text-slate-900",
        default: "text-slate-900",
        sky: "text-sky-700",
        rose: "text-rose-700",
      },
    },
    defaultVariants: { valueTone: "default" },
  },
);

type ValueVariants = VariantProps<typeof valueStyles>;
type ValueTone = NonNullable<ValueVariants["valueTone"]>;

/**
 * Horizontal cell · Vertically stacked · label + value only.
 *
 * 구조:
 *   [label]     ← 10.5px medium slate-500 (모든 셀 동일)
 *   [value]     ← 15px bold tabular · 색상은 tone 에 따라
 *
 * 단위 "원/kg" 제거 · 상위 컨테이너 caption 이나 컨텍스트가 담당.
 * padding py-3 · breathing room 확보.
 */
function PriceCell({
  label,
  value,
  valueTone,
}: {
  label: string;
  value: number | null;
  valueTone: ValueTone;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-3">
      <span className="text-[10.5px] font-medium text-slate-500">{label}</span>
      {value != null && value > 0 ? (
        <NumberFlow
          value={Math.round(value)}
          locales="ko-KR"
          className={valueStyles({ valueTone })}
          willChange
          respectMotionPreference
        />
      ) : (
        <span className={valueStyles({ valueTone: "muted" })}>—</span>
      )}
    </div>
  );
}

/**
 * CTA 버튼 · Upbit 매수/매도 컨벤션 · h-12 sky-600 primary.
 *
 * 상태별 스타일:
 * - settled       : 회색 disabled "경매 종료"
 * - unauth        : 회색 filled "로그인 후 입찰 가능"
 * - unauthorized  : amber filled "이 공판장 권한 필요"
 * - hasBid + ready: [입찰 변경 sky-600] + [입찰취소 outline slate]
 * - ready         : 단일 sky-600 "입찰하기"
 *
 * 이전(v1) 은 primary 를 slate-900 로 두었는데, Upbit/Binance/Bithumb 는
 * primary 매수 = 파랑 컨벤션. sky-600 이 "실행" 감정을 훨씬 강하게 전달.
 */
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
  if (isSettled) {
    return (
      <button
        type="button"
        disabled
        aria-disabled
        className="h-12 w-full cursor-not-allowed bg-slate-100 text-[15px] font-bold text-slate-500"
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
        className="h-12 w-full bg-slate-100 text-[15px] font-bold text-slate-700 transition-colors hover:bg-slate-200"
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
        className="h-12 w-full bg-amber-100 text-[15px] font-bold text-amber-800 transition-colors hover:bg-amber-200"
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
            "h-12 bg-sky-600 text-[15px] font-bold text-white transition-colors hover:bg-sky-700",
            disabled && "opacity-50",
          )}
        >
          {isSubmitting ? "처리 중..." : "입찰 변경"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled || isCancelling}
          className="h-12 border border-slate-300 bg-white text-[14px] font-semibold text-slate-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
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
        "h-12 w-full bg-sky-600 text-[15px] font-bold text-white transition-colors hover:bg-sky-700",
        disabled && "opacity-50",
      )}
    >
      {isSubmitting ? "처리 중..." : "입찰하기"}
    </button>
  );
}

