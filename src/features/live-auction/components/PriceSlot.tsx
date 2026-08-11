"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

/**
 * 가격 셀 공통 고정폭 슬롯 · 중량 셀(w-[30px] + " kg") 과 동일 원리.
 *
 * 배경: 원/kg 가격은 최대 6자리(999,999) 로 제한되므로 최댓값이 담기는
 *       w-[46px] 슬롯 안에 우측 정렬 → 슬롯 좌·우 edge 가 모든 row 에서 동일 X.
 *       tabular-nums 로 각 자릿수(digit column) 는 rows 간 정확히 세로 정렬.
 *
 *       예) 92,000  →  [       92,000]
 *           103,000 → [       103,000]
 *           → 콤마 · 각 자릿수 · 우측 edge 모두 동일 X 좌표
 *
 * 애니메이션 (NumberFlow):
 * - `animate` prop (default: true) · 라이브 가격은 자릿수별 rolling
 * - Upbit/Bithumb/Toss 시세판 표준 · 자릿수마다 spring 으로 부드럽게 전환
 * - `regular` (최저단가 · 정적) 은 animate={false} 로 opt-out 권장
 *
 * 톤 (모든 원/kg 셀에서 공통 사용):
 * - "regular"  · 최저단가(참고 정보)                 → slate-800 · medium (dark tone 유지, 굵기만 완화)
 * - "muted"    · 마감 후 최저단가/현재가격 (dim)     → slate-600 · medium (읽을 수 있는 dim, 라이브 대비 완화만)
 * - "primary"  · 현재가격 · 남의 최고가              → slate-900 bold (테이블 내 최대 contrast)
 * - "mine"     · 현재가격 · 내가 최고가              → sky-700 bold
 * - "won"      · 낙찰 후 내 입찰가                  → sky-700 bold
 * - "lost"     · 미낙찰 후 내 입찰가                → rose-700 bold (row 배경 rose 와 통일)
 */
export const PRICE_SLOT_WIDTH = "w-[46px]";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

export type PriceTone =
  | "regular"
  | "muted"
  | "primary"
  | "mine"
  | "won"
  | "lost";

function toneToClass(tone: PriceTone): string {
  switch (tone) {
    case "regular":
      return "font-medium text-slate-800";
    case "muted":
      return "font-medium text-slate-600";
    case "primary":
      return "font-bold text-slate-900";
    case "mine":
      return "font-bold text-sky-700";
    case "won":
      return "font-bold text-sky-700";
    case "lost":
      return "font-bold text-rose-700";
  }
}

/**
 * 라이브 변동 가격에 애니메이션이 유의미한 톤인지.
 * - primary/mine/won/lost : 실시간 변동 → 애니메이션 필요
 * - regular/muted         : 정적 (최저단가/settled) → 불필요
 */
function isLiveTone(tone: PriceTone): boolean {
  return tone === "primary" || tone === "mine" || tone === "won" || tone === "lost";
}

export function PriceSlot({
  value,
  tone,
  animate,
}: {
  value: number | null | undefined;
  tone: PriceTone;
  /** 명시적 opt-in/out. 미지정 시 라이브 톤(primary/mine/won/lost) 만 자동 애니메이션. */
  animate?: boolean;
}) {
  const isValid =
    value !== null &&
    value !== undefined &&
    Number.isFinite(value) &&
    value > 0;

  if (!isValid) {
    return (
      <span
        className={cn(
          "inline-block text-right text-xs text-slate-300",
          PRICE_SLOT_WIDTH,
        )}
      >
        -
      </span>
    );
  }

  const rounded = Math.round(value!);
  const shouldAnimate = animate ?? isLiveTone(tone);

  const commonClass = cn(
    "inline-block text-right text-xs tabular-nums -tracking-[0.02em]",
    PRICE_SLOT_WIDTH,
    toneToClass(tone),
  );

  if (!shouldAnimate) {
    return <span className={commonClass}>{NUMBER_FORMATTER.format(rounded)}</span>;
  }

  return (
    <NumberFlow
      value={rounded}
      locales="ko-KR"
      format={{ useGrouping: true }}
      className={commonClass}
      willChange
      respectMotionPreference
    />
  );
}

/**
 * 마스킹 상태(딜러 권한 없음) · 슬롯과 동일 폭으로 렌더링해 세로 정렬 유지.
 */
export function MaskedPriceSlot({ tone }: { tone: PriceTone }) {
  return (
    <span
      className={cn(
        "inline-block text-right text-xs tabular-nums",
        PRICE_SLOT_WIDTH,
        toneToClass(tone),
      )}
    >
      ***
    </span>
  );
}

export { NUMBER_FORMATTER as PRICE_NUMBER_FORMATTER };
