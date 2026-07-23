"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

/**
 * 일괄입찰 편집 모드 · 미들 테이블 마지막 셀에 표시되는 인라인 가격 input.
 *
 * 부모(`useBulkBid`)가 관리하는 `bulkPrices` 맵의 값을 콤마 포맷으로 표시하고
 * 사용자가 편집하면 debounce 없이 즉시 `onChange(partId, price | null)` 호출.
 *
 * 낙찰 완료(`disabled`) 시에는 값 표시만.
 */
export interface BulkPriceCellProps {
  partId: string;
  value: number | undefined;
  disabled?: boolean;
  onChange: (partId: string, price: number | null) => void;
  minPrice?: number | null;
  /** 최저단가 미달 시 UI hint · 부모에서 계산해 넘겨도 되고 자체 계산해도 됨 */
  showBelowMinHint?: boolean;
}

export function BulkPriceCell({
  partId,
  value,
  disabled,
  onChange,
  minPrice,
  showBelowMinHint = true,
}: BulkPriceCellProps) {
  const [text, setText] = useState<string>(
    value != null ? NUMBER_FORMATTER.format(value) : "",
  );

  // 부모(`useBulkBid`) 에서 preset/일괄가 적용해 value 가 바뀌면 input 도 갱신
  useEffect(() => {
    setText(value != null ? NUMBER_FORMATTER.format(value) : "");
  }, [value]);

  const isBelowMin =
    showBelowMinHint &&
    value != null &&
    minPrice != null &&
    minPrice > 0 &&
    value < minPrice;

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (!digits) {
      setText("");
      onChange(partId, null);
      return;
    }
    const n = Number(digits);
    if (!Number.isFinite(n)) {
      setText("");
      onChange(partId, null);
      return;
    }
    setText(NUMBER_FORMATTER.format(n));
    onChange(partId, n);
  };

  if (disabled) {
    return (
      <div className="flex items-center justify-end">
        <span className="text-[11px] text-slate-300">-</span>
      </div>
    );
  }

  return (
    <div className="relative flex justify-end">
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder="0"
        aria-label="입찰가"
        // 최대 6자리(999,999) · 콤마 1개 포함 최대 7 chars.
        // 원/kg 는 100,000 단위까지 · 1,000,000 이상은 실수 입력이므로 하드 제한.
        maxLength={7}
        className={cn(
          "h-7 w-[80px] border bg-white px-1.5 text-right text-[11px] font-bold tabular-nums outline-none placeholder:text-slate-300 focus:border-sky-500",
          isBelowMin
            ? "border-amber-400 text-amber-700"
            : "border-slate-200 text-slate-900",
        )}
      />
      {isBelowMin ? (
        <span
          className="pointer-events-none absolute -bottom-3.5 right-0 text-[9px] font-semibold text-amber-600"
          title={`최저 ${NUMBER_FORMATTER.format(minPrice!)}원/kg`}
        >
          최저 미달
        </span>
      ) : null}
    </div>
  );
}

/**
 * 체크박스 (`aria-label` 필수). row 클릭과 이벤트 충돌 방지를 위해
 * `onClick={e => e.stopPropagation()}` 를 걸어 둔다.
 */
export function BulkCheckbox({
  checked,
  onChange,
  disabled,
  ariaLabel = "선택",
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "h-4 w-4 cursor-pointer border-slate-300 text-sky-600 accent-sky-600 focus:ring-sky-400 focus:ring-offset-0",
        disabled && "cursor-not-allowed opacity-40",
      )}
    />
  );
}
