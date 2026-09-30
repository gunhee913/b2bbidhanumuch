"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SheetBidCellState } from "../hooks/useSheetBidding";
import { BID_INPUT_ATTR, BID_KEY_HINT, handleBidKeyDown } from "../lib/bidKeys";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
/** 포커스 시 셀 옆에 뜨는 미니 스텝 · 원/kg */
const STEPS: { label: string; delta: number }[] = [
  { label: "+10", delta: 10 },
  { label: "+100", delta: 100 },
  { label: "+1,000", delta: 1000 },
];
export interface SheetBidCellProps {
  partId: string;
  /** 표시값 · draft 우선, 없으면 서버의 내 입찰가 · 없으면 빈칸 */
  value: number | null;
  minPrice: number | null;
  /** 서버에 저장된 내 입찰가 · 있으면 "변경" 맥락 */
  savedPrice: number | null;
  state: SheetBidCellState;
  disabled?: boolean;
  onChange: (partId: string, price: number | null) => void;
  onSubmit: () => void;
  onRevert: () => void;
}

/**
 * 상장표 인라인 입찰 셀 · 엑셀형.
 *
 *  - 셀 = input · placeholder 는 최저단가 · 값이 최저단가와 같으면 dim
 *  - 폭은 입력 상한인 6자리(`109,100`)에 맞춘다 · 원/kg 단가는 십만 단위를 넘지 않는다
 *  - Enter 입찰 · Esc 되돌리기 · `+`/`-` ±100 · Shift+↑/↓ ±1,000 · ↑/↓ 다음/이전 셀
 *  - 포커스 시 우측에 `+10 +100 +1,000` 미니 스텝
 *  - 테두리 진하기가 곧 상태 · 연함(빈 칸 · 할 일) → 진함(내 입찰 · 넣었고 아직 바꿀 수 있음).
 *    마감 부위는 이 셀 대신 평문 텍스트라, 테두리가 사라지는 것으로 "끝났다" 가 읽힌다.
 *  - 변경(dirty) orange 테두리 · 저장 중 깜빡임 · 성공 1회 플래시 · 오류 셀 아래 한 줄
 */
export function SheetBidCell({
  partId,
  value,
  minPrice,
  savedPrice,
  state,
  disabled = false,
  onChange,
  onSubmit,
  onRevert,
}: SheetBidCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (state.flashToken === 0) return;
    setFlashing(true);
    const t = window.setTimeout(() => setFlashing(false), 900);
    return () => window.clearTimeout(t);
  }, [state.flashToken]);

  const text = value != null && value > 0 ? NUMBER_FORMATTER.format(value) : "";
  const isDirty =
    state.draft != null && state.draft > 0 && state.draft !== savedPrice;
  const isAtFloor =
    value != null && minPrice != null && value === minPrice && !savedPrice;
  const isBelowMin =
    value != null && value > 0 && minPrice != null && value < minPrice;
  const isSaved = !!savedPrice && !isDirty && !state.error && !isBelowMin;

  const step = (delta: number) => {
    const base = value ?? minPrice ?? 0;
    onChange(partId, Math.max(0, base + delta));
  };

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 6);
    onChange(partId, digits ? Number(digits) : null);
  };

  return (
    <div
      className="relative flex items-center justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 미니 스텝 · 포커스 시 셀 위에 떠서 열 폭에 영향을 주지 않는다 */}
      {focused && !disabled ? (
        <div
          className="absolute bottom-full right-0 z-10 mb-0.5 flex items-stretch gap-px border border-line bg-surface p-px shadow-sm"
          aria-label="입찰가 스텝"
        >
          {STEPS.map((s) => (
            <button
              key={s.delta}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => step(s.delta)}
              className="h-6 px-1.5 text-[10.5px] font-semibold tabular-nums text-content-mid transition-colors hover:bg-surface-accent hover:text-content"
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative w-full min-w-[58px] max-w-[62px]">
        <input
          ref={inputRef}
          {...{ [BID_INPUT_ATTR]: "" }}
          type="text"
          inputMode="numeric"
          value={text}
          placeholder={minPrice ? NUMBER_FORMATTER.format(minPrice) : "0"}
          disabled={disabled || state.pending}
          aria-label="내 입찰가"
          title={BID_KEY_HINT}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) =>
            handleBidKeyDown(e, { onSubmit, onRevert, onStep: step })
          }
          className={cn(
            "h-7 w-full border bg-surface px-1 text-right text-[12px] font-bold tabular-nums -tracking-[0.01em] outline-none transition-colors placeholder:font-medium placeholder:text-content-ghost",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-content-faint",
            state.error
              ? "border-rose-400 text-rose-700"
              : isBelowMin
                ? "border-orange-400 text-orange-700"
                : isDirty
                  ? "border-orange-400 text-content focus:border-orange-500"
                  : isSaved
                    ? "border-slate-500 text-content focus:border-inverse"
                    : "border-line text-content focus:border-inverse",
            isAtFloor && !isDirty && "text-content-faint",
            flashing && "border-inverse bg-surface-accent",
            state.pending && "animate-pulse",
          )}
        />
        {state.error ? (
          <span
            role="alert"
            className="pointer-events-none absolute -bottom-3.5 right-0 whitespace-nowrap text-[9.5px] font-semibold text-rose-600"
          >
            {state.error}
          </span>
        ) : isBelowMin ? (
          <span className="pointer-events-none absolute -bottom-3.5 right-0 text-[9.5px] font-semibold text-orange-600">
            최저 미달
          </span>
        ) : null}
      </div>
    </div>
  );
}
