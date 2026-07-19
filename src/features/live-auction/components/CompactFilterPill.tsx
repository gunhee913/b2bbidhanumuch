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

export interface CompactFilterPillProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: readonly string[];
  allLabel?: string;
  allowAll?: boolean;
  className?: string;
}

/**
 * 사이드바 등 좁은 공간에서 사용하는 초소형 필터 pill.
 * 선택 전: `육질`
 * 선택 후: `육질 1++`
 */
export function CompactFilterPill({
  value,
  onChange,
  label,
  options,
  allLabel = "전체",
  allowAll = true,
  className,
}: CompactFilterPillProps) {
  const isActive = value !== "";

  return (
    <Select
      value={value || ALL_SENTINEL}
      onValueChange={(v) => onChange(v === ALL_SENTINEL ? "" : v)}
    >
      <SelectTrigger
        className={cn(
          "h-7 w-auto shrink-0 gap-1 rounded-md border px-2 text-[11px] transition-colors focus:ring-1 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3",
          isActive
            ? "border-sky-500 bg-sky-50 text-sky-700 hover:border-sky-500 focus:ring-sky-200"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 focus:ring-slate-200",
          className,
        )}
      >
        <span className="flex min-w-0 items-center">
          <span
            className={cn(
              "shrink-0 text-[10px] font-medium tracking-tight",
              isActive ? "text-sky-600/70" : "text-slate-400",
            )}
          >
            {label}
          </span>
          {isActive ? (
            <>
              <span
                className="mx-1.5 inline-block h-2.5 w-px shrink-0 bg-sky-400"
                aria-hidden
              />
              <span className="truncate font-bold">{value}</span>
            </>
          ) : null}
        </span>
      </SelectTrigger>
      <SelectContent
        className="min-w-[140px] rounded-md border-slate-200 shadow-xl"
        align="start"
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
