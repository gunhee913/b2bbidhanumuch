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
 * 톤 (모든 원/kg 셀에서 공통 사용) · ink 는 라이브 상태(mine) 전용:
 * - "regular"  · 최저단가(참고 정보)                 → slate-800 · medium
 * - "muted"    · 마감 후 보조 숫자                    → slate-600 · medium
 * - "faint"    · 마감 후 최저단가 (기준가는 끝나면 참고값) → slate-400 · medium
 * - "primary"  · 강조 숫자                            → slate-900 bold
 * - "mine"     · 진행 중 내 입찰가                    → ink bold
 * - "won"      · 낙찰 후 내 입찰가 (= 낙찰가)          → slate-900 bold (결과는 칩이 말한다)
 * - "lost"     · 미낙찰 후 내 입찰가                  → slate-500 medium
 *
 * 크기 · 12px · 6자리 "999,999"(50px) 가 잘리지 않는 슬롯. 단위 「원」은 슬롯 밖에 붙는다.
 */
export const PRICE_SLOT_WIDTH = "w-[50px]";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

export type PriceTone =
  "regular" | "muted" | "faint" | "primary" | "mine" | "won" | "lost";

function toneToClass(tone: PriceTone): string {
  switch (tone) {
    case "regular":
      return "font-medium text-content";
    case "muted":
      return "font-medium text-content-mid";
    case "faint":
      return "font-medium text-content-faint";
    case "primary":
      return "font-bold text-content";
    case "mine":
      return "font-bold text-content";
    case "won":
      return "font-bold text-content";
    case "lost":
      return "font-medium text-content-soft";
  }
}

/**
 * 라이브 변동 가격에 애니메이션이 유의미한 톤인지.
 * - primary/mine/won/lost : 실시간 변동 → 애니메이션 필요
 * - regular/muted         : 정적 (최저단가/settled) → 불필요
 */
function isLiveTone(tone: PriceTone): boolean {
  return (
    tone === "primary" || tone === "mine" || tone === "won" || tone === "lost"
  );
}

export function PriceSlot({
  value,
  tone,
  animate,
  unit = "원",
}: {
  value: number | null | undefined;
  tone: PriceTone;
  /** 명시적 opt-in/out. 미지정 시 라이브 톤(primary/mine/won/lost) 만 자동 애니메이션. */
  animate?: boolean;
  /** 숫자 뒤 단위 · 슬롯 밖에 흐리게 붙어 자릿수 정렬을 해치지 않는다. `null` 이면 숨김 */
  unit?: string | null;
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
          "inline-block text-right text-xs text-content-ghost",
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

  return (
    <>
      {shouldAnimate ? (
        <NumberFlow
          value={rounded}
          locales="ko-KR"
          format={{ useGrouping: true }}
          className={commonClass}
          willChange
          respectMotionPreference
        />
      ) : (
        <span className={commonClass}>{NUMBER_FORMATTER.format(rounded)}</span>
      )}
      {unit ? <PriceUnit unit={unit} /> : null}
    </>
  );
}

/** 가격 단위 · 되풀이되는 글자라 숫자보다 흐리고 작게 */
function PriceUnit({ unit }: { unit: string }) {
  return (
    <span className="pl-0.5 text-[11px] font-medium text-content-faint">
      {unit}
    </span>
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
