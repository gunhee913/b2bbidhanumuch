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

export interface FilterSelectProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: readonly string[];
  /** 전체 옵션 라벨. 기본값: "전체" */
  allLabel?: string;
  /** 전체 옵션 노출 여부. false 이면 반드시 하나의 값이 선택된 상태로 사용. 기본값: true */
  allowAll?: boolean;
  className?: string;
}

/**
 * 메인 페이지 실시간 경매 내역 · 경매 캘린더 등에서 공용으로 사용하는 필터 셀렉트.
 * 라벨과 선택된 값을 `공판장 | 농협 음성` 형태로 함께 보여준다.
 */
export function FilterSelect({
  value,
  onChange,
  label,
  options,
  allLabel = "전체",
  allowAll = true,
  className,
}: FilterSelectProps) {
  const isActive = value !== "";

  return (
    <Select
      value={value || ALL_SENTINEL}
      onValueChange={(v) => onChange(v === ALL_SENTINEL ? "" : v)}
    >
      <SelectTrigger
        className={cn(
          "h-9 w-[168px] shrink-0 gap-2 rounded-lg border px-3 text-xs shadow-sm transition-colors focus:ring-2 focus:ring-offset-0",
          isActive
            ? "border-sky-500 bg-sky-50 text-sky-700 hover:border-sky-500 focus:ring-sky-200"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:ring-slate-200",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center">
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium tracking-tight",
              isActive ? "text-sky-600/70" : "text-slate-400",
            )}
          >
            {label}
          </span>
          {isActive ? (
            <>
              <span
                className="mx-3 inline-block h-3 w-px shrink-0 bg-sky-400"
                aria-hidden
              />
              <span className="truncate font-semibold">{value}</span>
            </>
          ) : null}
        </span>
      </SelectTrigger>
      <SelectContent
        className="min-w-[180px] rounded-lg border-slate-200 shadow-xl"
        align="end"
      >
        {allowAll ? (
          <>
            <SelectItem
              value={ALL_SENTINEL}
              className="text-slate-500 focus:text-slate-700"
            >
              {allLabel}
            </SelectItem>
            <SelectSeparator className="bg-slate-100" />
          </>
        ) : null}
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
