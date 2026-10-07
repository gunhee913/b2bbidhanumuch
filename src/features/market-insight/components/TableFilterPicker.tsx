"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";

/** 「거르지 않음」 · 빈 글자를 그대로 쓴다 (`filterTabs` 와 같은 약속) */
const ALL = "";

/**
 * 표 머리에 서는 거르개 쪽지 · 등급과 부위가 같은 꼴을 쓴다.
 *
 * 분절 탭(`SegmentedTabs`)이 아니라 쪽지인 건 칸 수 때문이다. 부위는 스무 가지
 * 가까이 나와 한 줄로 못 세우고, 등급도 여덟에 「전체」 를 더하면 낙찰/미낙찰 탭과
 * 한 줄에 같이 설 자리가 안 난다. 둘을 서로 다른 꼴로 두면 나란히 선 두 거르개가
 * 다른 종류의 조작처럼 보이므로 같이 쪽지로 맞춘다.
 *
 * 쪽지 안은 격자다 (부위 고르개와 같은 셈) — 늘어놓으면 눌러야 할 칸이 목록 길이에
 * 따라 오르내리는데, 격자는 자리가 고정이라 손이 외운다.
 */
export function TableFilterPicker({
  label,
  value,
  options,
  onChange,
  columns = 1,
  width = 150,
  align = "start",
  counts,
}: {
  /** 무엇을 거르는지 · `등급` `부위` `거래처` */
  label: string;
  /** 빈 글자면 거르지 않는 중 */
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  /** 쪽지 안 격자 칸 수 · 이름이 짧으면 여러 줄로 접는다 */
  columns?: number;
  /** 쪽지 너비 (px) */
  width?: number;
  /** 쪽지가 붙는 쪽 · 판 오른쪽 끝에 선 단추는 `end` 라야 밖으로 안 넘친다 */
  align?: "start" | "end";
  /**
   * 칸마다 뒤에 적을 건수 · 「전체」 는 `ALL` 열쇠로 찾는다.
   *
   * 고르기 전에 몇 건짜리인지 보여 주는 값이다. 거래처처럼 **고르면 확 줄어드는**
   * 축에서는 이게 없으면 전체 933건에서 78건으로 떨어진 것이 거름망 탓인지 자료가
   * 없는 탓인지 구분이 안 된다.
   */
  counts?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== ALL;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors",
            active
              ? "border-transparent bg-inverse text-inverse-content"
              : "border-line bg-surface-muted text-content-soft hover:text-content",
          )}
        >
          <span className={cn(!active && "text-content-faint")}>{label}</span>
          <span className="max-w-[92px] truncate">
            {active ? value : "전체"}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 shrink-0",
              active ? "opacity-70" : "text-content-faint",
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>

      {/* 쪽지가 제 테두리를 그리므로 팝오버 기본 껍데기는 벗긴다 (두 겹이 된다) */}
      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <div
          className={cn("grid gap-1 p-2 shadow-xl", SURFACE_SHELL_CLASS)}
          style={{
            width,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          <Option
            label="전체"
            count={counts?.[ALL]}
            picked={!active}
            span={columns}
            onPick={() => {
              onChange(ALL);
              setOpen(false);
            }}
          />
          {options.map((option) => (
            <Option
              key={option}
              label={option}
              count={counts?.[option]}
              picked={option === value}
              onPick={() => {
                onChange(option);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Option({
  label,
  count,
  picked,
  span,
  onPick,
}: {
  label: string;
  /** 안 주면 안 적는다 · 등급·부위 거르개는 이것 없이 쓴다 */
  count?: number;
  picked: boolean;
  /** 「전체」 는 한 줄을 통째로 쓴다 · 값들과 섞여 서면 하나처럼 읽힌다 */
  span?: number;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={span && span > 1 ? { gridColumn: `span ${span}` } : undefined}
      className={cn(
        "flex h-7 min-w-0 items-center justify-between gap-1 rounded-[5px] px-2 text-[11.5px] transition-colors",
        picked
          ? "bg-surface-accent font-bold text-content"
          : "font-medium text-content-mid hover:bg-surface-muted hover:text-content",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        {count === undefined ? null : (
          <span className="tabular-nums text-content-faint">{count}</span>
        )}
        {picked ? <Check className="h-3 w-3" aria-hidden /> : null}
      </span>
    </button>
  );
}
