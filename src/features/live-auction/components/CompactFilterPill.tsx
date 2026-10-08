"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL_SENTINEL = "__all__";

/** `lg` · 경매장 상장표 머리 줄 · 옆 등급 탭(`SegmentedTabs` `lg`)과 같은 32px */
const PILL_SIZE_CLASS = {
  md: {
    trigger: "h-7 max-w-[132px] px-2 text-label [&>svg]:h-3 [&>svg]:w-3",
    label: "text-cap",
    item: undefined,
  },
  lg: {
    trigger: "h-8 max-w-[156px] px-2.5 text-[13px] [&>svg]:h-3.5 [&>svg]:w-3.5",
    label: "text-[12px]",
    item: "py-1.5 text-[14px]",
  },
} as const;

export interface CompactFilterPillProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: readonly string[];
  allLabel?: string;
  allowAll?: boolean;
  /**
   * 선택 후 라벨을 숨기고 값만 표시 (`등급 | 1++(9)` → `1++(9)`).
   * 값만으로 필터 종류가 드러나는 곳(사이드바 등급·업체)에서만 켠다.
   * 육량 `A/B/C` 처럼 값이 자립하지 못하는 필터는 기본값(false) 유지.
   */
  valueOnlyWhenActive?: boolean;
  size?: keyof typeof PILL_SIZE_CLASS;
  className?: string;
}

/**
 * 사이드바 등 좁은 공간에서 사용하는 초소형 필터 pill.
 * 선택 전: `등급`                      (라벨만 · 회색)
 * 선택 후: `등급 | 1++(9)` 또는 `1++(9)` (`valueOnlyWhenActive`)
 *
 * `valueOnlyWhenActive` 배경 · 사이드바 폭(≈336px) 에서 `등급 | 1++(9)` `업체 | 정직한고기` 두 pill 이
 * 우측 요약(`상장 N건 · 낙찰 M건`) 을 밀어내 겹치던 문제. 라벨은 `title` 툴팁으로만 남기고,
 * pill 은 `min-w-0` + `max-w` 로 긴 업체명도 줄임표 처리.
 */
export function CompactFilterPill({
  value,
  onChange,
  label,
  options,
  allLabel = "전체",
  allowAll = true,
  valueOnlyWhenActive = false,
  size = "md",
  className,
}: CompactFilterPillProps) {
  const sized = PILL_SIZE_CLASS[size];
  const isActive = value !== "";
  const showLabel = !isActive || !valueOnlyWhenActive;

  return (
    <Select
      value={value || ALL_SENTINEL}
      onValueChange={(v) => onChange(v === ALL_SENTINEL ? "" : v)}
    >
      <SelectTrigger
        title={isActive ? `${label} · ${value}` : label}
        aria-label={isActive ? `${label} ${value}` : label}
        className={cn(
          "w-auto min-w-0 gap-1 rounded-md border transition-colors focus:ring-1 focus:ring-offset-0 [&>svg]:shrink-0",
          sized.trigger,
          isActive
            ? "border-inverse bg-inverse text-inverse-content hover:border-inverse focus:ring-slate-300"
            : "shrink-0 border-line bg-surface text-content-mid hover:border-line focus:ring-line",
          className,
        )}
      >
        <span className="flex min-w-0 items-center">
          {showLabel ? (
            <span
              className={cn(
                "shrink-0 font-medium tracking-tight",
                sized.label,
                isActive ? "text-white/60" : "text-content-faint",
              )}
            >
              {label}
            </span>
          ) : null}
          {isActive && showLabel ? (
            <span
              className="mx-1.5 inline-block h-2.5 w-px shrink-0 bg-surface/30"
              aria-hidden
            />
          ) : null}
          {isActive ? (
            <span className="truncate font-bold">{value}</span>
          ) : null}
        </span>
      </SelectTrigger>
      <SelectContent
        className="min-w-[140px] rounded-md border-line shadow-xl"
        align="start"
      >
        {allowAll ? (
          <>
            <SelectItem
              value={ALL_SENTINEL}
              className={cn(
                "text-content-soft focus:text-content-mid",
                sized.item,
              )}
            >
              {allLabel}
            </SelectItem>
            <SelectSeparator className="bg-surface-accent" />
          </>
        ) : null}
        {options.map((opt) => (
          <SelectItem key={opt} value={opt} className={sized.item}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
