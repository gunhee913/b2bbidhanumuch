"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SheetBidCellState } from "../hooks/useSheetBidding";
import {
  BID_INPUT_ATTR,
  BID_MODE_ATTR,
  bidModeHint,
  handleSheetBidKeyDown,
  type BidMode,
} from "../lib/bidKeys";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
/**
 * 포커스 시 셀 옆에 뜨는 미니 스텝 · 원/kg.
 * `+1` 은 한 칸 차이로 순위가 갈리는 자리라 둔다 — 97,001 · 97,002 처럼 실제로 그렇게 쓴다.
 */
const STEPS = [1, 10, 100, 1000] as const;

/** `+100` · 내려간 순간에는 같은 버튼이 `−100` 을 읽어 준다 */
const stepLabel = (delta: number) =>
  `${delta < 0 ? "−" : "+"}${NUMBER_FORMATTER.format(Math.abs(delta))}`;

/**
 * 스텝 자국이 남아 있는 시간 · 60Hz 에서 대여섯 프레임.
 *
 * 더 줄이면 프레임 수가 모자라 아예 안 그려지는 누름이 생긴다 — 여기가 바닥이다.
 * 이 길이로는 `−100` 글자를 읽기는 어렵고 「어느 버튼이 번쩍였나」 만 남는데,
 * 크기가 곧 어느 버튼인지라 그걸로 충분하다.
 */
const PULSE_MS = 90;

/**
 * 누르는 동안 한 번 꺼졌다 켜진다 · 깜빡임.
 *
 * 크기만 줄여서는 안 됐다. 연타하면 먹색 자국(`pulse`)이 꺼질 틈 없이 켜져 있어,
 * 그 위에서 10% 줄었다 돌아오는 건 보이지 않는다. 투명도를 함께 떨어뜨리면
 * 켜져 있든 꺼져 있든 바탕과의 차이가 무너졌다 살아나 눌린 것이 보인다.
 *
 * `transform` 과 `opacity` 는 아래 `SOFT` 의 전이 목록에 없다. 넣으면 되돌아오는
 * 동안 다음 누름이 겹쳐 반쯤 눌린 채 뭉개진다 — 빠른 손일수록 반응이 없어진다.
 */
const PRESSABLE = "active:scale-[0.9] active:opacity-40";

/**
 * 색만 부드럽게 · 스텝 자국이 사라지는 건 보여야 하고, 눌림은 보이면 안 된다.
 * `transition-all` 로 묶으면 둘을 따로 못 준다.
 */
const SOFT = "transition-[color,background-color] duration-75";

/** 막대 높이 + 셀과의 사이 · 취소 줄이 붙으면 한 줄만큼 더 든다 */
const POPOVER_SPACE = 56;
const POPOVER_SPACE_WITH_CANCEL = 84;

/** 취소를 한 번 더 물어보는 시간 · 지나면 없던 일이 된다 */
export const CANCEL_CONFIRM_MS = 3000;

/**
 * 막대를 위로 펼 자리가 있나.
 *
 * 표는 `overflow-hidden` 상자 안에 있어 첫 줄에서 위로 펴면 잘린다(`data-sheet-clip`).
 * 머리글까지 덮지 않도록 상자 위끝과 머리글 아래끝 중 낮은 쪽을 천장으로 삼는다 —
 * 스크롤로 머리글이 올라가 버리면 상자 위끝이 이긴다.
 */
function hasRoomAbove(input: HTMLInputElement, needed: number): boolean {
  const clip = input.closest("[data-sheet-clip]");
  if (!clip) return true;
  const head = clip.querySelector("thead");
  const ceiling = Math.max(
    clip.getBoundingClientRect().top,
    head?.getBoundingClientRect().bottom ?? 0,
  );
  return input.getBoundingClientRect().top - ceiling >= needed;
}
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
  /** 칸에 들어왔을 때 · 왼쪽 사진·시세가 이 부위를 따라오게 행을 고른다 */
  onFocus?: () => void;
  /** ↑/↓ 가 옮기는 것 · 안내문에 적는다 (개체축이면 "부위") */
  rowLabel: string;
  /** ←/→ 가 옮기는 것 · 고정축 (개체축이면 "개체") */
  pivotLabel: string;
  /** 서버에 들어간 내 입찰을 무른다 · 없으면 버튼을 아예 안 그린다 */
  onCancel?: () => void;
  canCancel?: boolean;
}

/**
 * 상장표 인라인 입찰 셀 · 엑셀형.
 *
 *  - 폭은 입력 상한인 6자리(`109,100`)에 맞춘다 · 원/kg 단가는 십만 단위를 넘지 않는다
 *  - 엑셀처럼 고르기/쓰기 두 모드 · 키 계약은 `handleSheetBidKeyDown` 이 갖는다
 *  - 포커스 시 우측에 `+1 +10 +100 +1,000` 미니 스텝
 *
 * 모드는 어떻게 들어왔는지로 정한다. 마우스로 누르면 「쓰겠다」 는 뜻이라 곧장 쓰기로,
 * 키보드로 지나가면 훑는 중이라 고르기로 들어온다. 고르기에서는 `readOnly` 라 값이
 * 변할 길이 없다 — ↓ 로 스무 줄을 훑어도 초안이 생기지 않는다.
 *
 * 칸을 세우는 건 면(`bg-field`)이다. 예전에는 바탕이 행과 같은 값이고 `line` 테두리
 * 하나로 버텼는데 다크에서 대비가 1.31:1 이라 선이 없는 것과 같았다 — 어디에 쓰는지
 * 모르겠다는 말이 여기서 나왔다. 마감 부위는 이 셀 대신 평문 텍스트라, 파인 자리가
 * 사라지는 것으로 「끝났다」 가 읽힌다.
 *
 * placeholder 는 두지 않는다. 바로 왼쪽이 최저단가 열이라 같은 숫자가 두 번 나왔고,
 * 흐린 숫자는 힌트가 아니라 「이미 넣은 값」 이나 「잠긴 값」 으로 읽혔다. 최저가는
 * 옆 열이 말하고, 빈 자리는 비어 있음으로 말한다.
 *
 * 테두리는 예외만 말한다 · 평소(`field-line`) · 포커스(파란 링) · 변경 중(orange) ·
 * 최저 미달·오류(rose). 값을 넣었는지는 테두리가 아니라 숫자가 있는지로 읽는다 —
 * 서버에 들어간 값과 고치는 중인 값은 orange 하나로 갈린다.
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
  onFocus,
  rowLabel,
  pivotLabel,
  onCancel,
  canCancel = false,
}: SheetBidCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<BidMode>("nav");
  const [flashing, setFlashing] = useState(false);
  /** 첫 줄처럼 위가 막힌 자리에서는 막대를 아래로 편다 */
  const [flipDown, setFlipDown] = useState(false);
  /** 방금 먹인 스텝 · 그 크기의 버튼이 잠깐 켜져 얼마가 움직였는지 말한다 */
  const [pulse, setPulse] = useState<{ delta: number } | null>(null);
  /** 마우스로 들어왔나 · 눌러서 들어오면 곧장 쓰기, 키보드로 지나가면 고르기 */
  const byPointer = useRef(false);
  /** 취소를 한 번 더 물어보는 중 · 무를 수 없는 일이라 한 번 눌러서는 안 간다 */
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    if (state.flashToken === 0) return;
    setFlashing(true);
    const t = window.setTimeout(() => setFlashing(false), 900);
    return () => window.clearTimeout(t);
  }, [state.flashToken]);

  useEffect(() => {
    if (!pulse) return;
    const t = window.setTimeout(() => setPulse(null), PULSE_MS);
    return () => window.clearTimeout(t);
  }, [pulse]);

  // 물어본 채로 오래 두지 않는다 · 시간이 지나거나 칸을 떠나면 없던 일이 된다
  useEffect(() => {
    if (!confirmingCancel) return;
    const t = window.setTimeout(
      () => setConfirmingCancel(false),
      CANCEL_CONFIRM_MS,
    );
    return () => window.clearTimeout(t);
  }, [confirmingCancel]);
  useEffect(() => {
    if (!focused || !canCancel) setConfirmingCancel(false);
  }, [focused, canCancel]);

  // 막대 안에서 입찰을 넣으면 취소 줄이 붙어 한 줄 자란다 · 위 여유를 다시 잰다
  useEffect(() => {
    const el = inputRef.current;
    if (!focused || !el) return;
    setFlipDown(
      !hasRoomAbove(el, canCancel ? POPOVER_SPACE_WITH_CANCEL : POPOVER_SPACE),
    );
  }, [focused, canCancel]);

  const text = value != null && value > 0 ? NUMBER_FORMATTER.format(value) : "";
  const isDirty =
    state.draft != null && state.draft > 0 && state.draft !== savedPrice;
  const isBelowMin =
    value != null && value > 0 && minPrice != null && value < minPrice;
  /** 되돌릴 게 있을 때만 · 고치지도 않았는데 초기화가 살아 있으면 저장값을 지우는 줄 안다 */
  const canRevert = state.draft != null;
  const canSubmit = value != null && value > 0 && !isBelowMin && !state.pending;

  /** 값을 건드리는 길은 모두 쓰기다 · 스텝 버튼으로 올려도 커서가 그 자리에 선다 */
  const step = (delta: number) => {
    const base = value ?? minPrice ?? 0;
    setMode("edit");
    // 늘 새 객체다 · 같은 크기를 연달아 눌러도 자국이 다시 살아난다
    setPulse({ delta });
    onChange(partId, Math.max(0, base + delta));
  };

  /** 고르기에서 숫자를 눌렀을 때 · 그 숫자 하나로 갈아 끼우고 쓰기로 */
  const typeOver = (digit: string) => {
    setMode("edit");
    onChange(partId, digit ? Number(digit) : null);
  };

  /** Enter 로 고치러 들어갈 때 · 통째로 골라 두지 않고 커서를 끝에 세운다 */
  const beginEdit = () => {
    setMode("edit");
    const el = inputRef.current;
    el?.setSelectionRange(el.value.length, el.value.length);
  };

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 6);
    onChange(partId, digits ? Number(digits) : null);
  };

  // 표식에 부위를 적어 둔다 · 개체를 넘긴 뒤 같은 부위 칸을 다시 찾는 기준(`focusBidInput`)
  return (
    <div
      className="relative flex items-center justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      {/*
       * 미니 스텝 · 포커스 시 셀 위에 떠서 열 폭에 영향을 주지 않는다.
       * 모두 `tabIndex={-1}` + mousedown 막기 · 눌러도 칸이 포커스를 놓지 않아야
       * 막대가 사라지지 않고 연달아 올릴 수 있다.
       */}
      {focused && !disabled ? (
        <div
          className={cn(
            "absolute right-0 z-10 rounded-md border border-line bg-surface p-0.5 shadow-md",
            flipDown ? "top-full mt-1" : "bottom-full mb-1",
          )}
          aria-label="입찰가 조절"
        >
          <div className="flex items-stretch gap-px">
            {/*
             * 키로 올리고 내린 값이 어느 버튼의 크기였는지 그 버튼이 켜져서 말한다.
             * 내릴 때도 같은 버튼을 쓴다 — 버튼을 여덟 개로 늘리면 막대가 두 배가 되고,
             * 실제로 필요한 건 「얼마가 움직였나」 지 「내리는 버튼」 이 아니다.
             *
             * 자리는 건드리지 않는다. 방향을 1px 밀림으로 말했더니 ↑↓ 를 오갈 때마다
             * 버튼이 위아래로 떨었다 — 읽으라고 켜 놓고 흔들면 읽을 수가 없다.
             * 부호는 글자(`+100` ↔ `−100`)만으로 충분하고, 폭이 같아 줄도 안 밀린다.
             */}
            {STEPS.map((delta) => {
              const hit = pulse != null && Math.abs(pulse.delta) === delta;
              const down = hit && pulse.delta < 0;
              return (
                <button
                  key={delta}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => step(delta)}
                  className={cn(
                    PRESSABLE,
                    "h-6 rounded px-1.5 text-[10.5px] font-semibold tabular-nums",
                    hit
                      ? // 켜질 때는 즉시, 꺼질 때만 천천히 · 두드린 자국처럼 남는다
                        "bg-inverse text-inverse-content transition-none"
                      : cn(
                          SOFT,
                          "text-content-mid hover:bg-surface-accent hover:text-content",
                        ),
                  )}
                >
                  {stepLabel(down ? -delta : delta)}
                </button>
              );
            })}
            <span className="mx-0.5 w-px shrink-0 bg-line" aria-hidden />
            <button
              type="button"
              tabIndex={-1}
              disabled={!canRevert}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onRevert}
              className={cn(
                PRESSABLE,
                SOFT,
                "h-6 rounded px-1.5 text-[10.5px] font-semibold text-content-soft hover:bg-surface-accent hover:text-content disabled:text-content-ghost disabled:hover:bg-transparent",
              )}
            >
              초기화
            </button>
            <button
              type="button"
              tabIndex={-1}
              disabled={!canSubmit}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onSubmit}
              className={cn(
                PRESSABLE,
                SOFT,
                "h-6 rounded bg-inverse px-2 text-[10.5px] font-bold text-inverse-content hover:opacity-85 disabled:bg-surface-accent disabled:text-content-ghost",
              )}
            >
              입찰
            </button>
          </div>
          {/*
           * 「초기화」 와 나란히 두는 게 요점이다. 초기화는 내가 고치던 초안을 버리는
           * 것이고(서버 값은 그대로), 취소는 서버에 들어간 입찰을 무르는 것이다 —
           * 이름만 놓고는 둘이 같은 말로 읽혀서, 붙여 놓고 갈라야 차이가 보인다.
           *
           * 결과 열에 넣지 않은 이유도 같다. 그 열은 37px 이라 자리도 없지만, 무엇보다
           * 읽는 열이라 버튼이 하나도 없다. 스무 줄에 취소 버튼이 스무 개 뜨면 오클릭이
           * 곧 사고다 — 여기는 포커스된 한 줄에만 떠서 화면에 늘 하나뿐이다.
           */}
          {canCancel && onCancel ? (
            <div className="mt-0.5 flex justify-end border-t border-line pt-0.5">
              <button
                type="button"
                tabIndex={-1}
                disabled={state.pending}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (!confirmingCancel) {
                    setConfirmingCancel(true);
                    return;
                  }
                  setConfirmingCancel(false);
                  onCancel();
                }}
                className={cn(
                  PRESSABLE,
                  SOFT,
                  "h-6 whitespace-nowrap rounded border px-2 text-[10.5px] font-semibold disabled:opacity-50",
                  confirmingCancel
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-line text-content-soft hover:border-rose-300 hover:text-rose-600",
                )}
              >
                {confirmingCancel ? "한 번 더 눌러 취소" : "입찰취소"}
              </button>
            </div>
          ) : null}
          {/* 지금 어느 모드인지와, 그 모드에서 살아 있는 키 · 커서만으로는 약하다 */}
          <p className="whitespace-nowrap px-1 pb-0.5 pt-1 text-[10px] font-medium text-content-faint">
            {bidModeHint(mode, rowLabel, pivotLabel)}
          </p>
        </div>
      ) : null}
      <div className="relative w-full min-w-[58px] max-w-[62px]">
        <input
          ref={inputRef}
          {...{ [BID_INPUT_ATTR]: partId, [BID_MODE_ATTR]: mode }}
          type="text"
          inputMode="numeric"
          value={text}
          readOnly={mode === "nav"}
          disabled={disabled || state.pending}
          aria-label="내 입찰가"
          onMouseDown={() => {
            byPointer.current = true;
          }}
          onFocus={(e) => {
            const pointer = byPointer.current;
            byPointer.current = false;
            setFocused(true);
            setFlipDown(
              !hasRoomAbove(
                e.currentTarget,
                canCancel ? POPOVER_SPACE_WITH_CANCEL : POPOVER_SPACE,
              ),
            );
            setMode(pointer ? "edit" : "nav");
            // 키보드로 들어오면 값을 통째로 골라 둔다 · 숫자를 누르면 그대로 갈린다
            if (!pointer) e.currentTarget.select();
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            setMode("nav");
          }}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) =>
            handleSheetBidKeyDown(e, {
              mode,
              onEdit: beginEdit,
              onNav: () => setMode("nav"),
              onTypeOver: typeOver,
              onSubmit,
              onRevert,
              onStep: step,
              isEmpty: value == null || value <= 0,
              canSubmit,
            })
          }
          className={cn(
            "h-7 w-full rounded-[5px] border bg-field px-1.5 text-right text-[12px] font-bold tabular-nums -tracking-[0.01em] text-content outline-none transition-colors",
            "focus:border-focus focus:ring-2 focus:ring-focus/30",
            "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-content-faint",
            state.error
              ? "border-rose-400 text-rose-600"
              : isBelowMin
                ? "border-orange-400 text-orange-600"
                : isDirty
                  ? "border-orange-400"
                  : "border-field-line",
            // 고르기는 「고른 칸」 · 커서 없이 면이 차서 글 쓰는 자리로 안 보인다
            focused && mode === "nav" && "bg-focus/10 caret-transparent",
            flashing && "border-focus bg-focus/10",
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
