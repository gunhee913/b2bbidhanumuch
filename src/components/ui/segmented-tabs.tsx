"use client";

import { cn } from "@/lib/utils";

export interface SegmentedTabOption {
  /** 빈 문자열을 「거르지 않음」 으로 쓰는 자리가 많다 (`filterTabs`) */
  value: string;
  label: string;
  /** 말풍선 · 안 주면 라벨을 그대로 읽힌다 */
  title?: string;
  /** 읽어 줄 단축키 · 등급 탭의 숫자키처럼 */
  hotkey?: string;
  /** 칸에 그대로 다는 표식 · 방향키가 짚은 칸을 끌어올 때 쓴다 (`data-*`) */
  attrs?: Record<string, string>;
}

/**
 * 라벨 목록 앞에 「전체」 를 세운다 · 거르개 탭이 쓰는 꼴.
 *
 * 빈 문자열이 「거르지 않음」 이다 — 거르는 쪽이 빈 값을 그냥 통과시키면 되므로
 * 「전체」 를 다른 값들과 다르게 다룰 자리가 한 군데도 생기지 않는다.
 */
export function filterTabs(
  labels: readonly string[],
): readonly SegmentedTabOption[] {
  return [
    { value: "", label: "전체" },
    ...labels.map((label) => ({ value: label, label })),
  ];
}

/**
 * 분절 탭 · 고를 수 있는 것과 고른 것을 한 줄에 함께 보인다.
 *
 * 경매장 상장표 등급 탭에서 시작해 화면마다 한 벌씩 베껴 두었던 것을 한곳으로 모았다.
 * 배송지시의 묶는 기준, 경매결과·입찰내역의 거르개가 같은 일을 하는데 테두리가 있고
 * 없고, 높이가 28 과 26 으로 어긋나 있었다 — 화면을 옮길 때마다 같은 줄이 들썩였다.
 *
 * 테두리를 두르는 건 이 줄이 대개 검색창(`h-7` 테두리 상자) 옆에 서기 때문이다.
 * 바탕만으로 묶어 두면 테두리 있는 이웃 옆에서 혼자 떠 보인다.
 *
 * 켜진 칩에만 `ring` 을 더한다. 어두운 판에서는 `bg-surface` 와 `bg-surface-muted` 의
 * 차이가 밝은 판보다 훨씬 좁아, 그림자 하나로는 어느 칩이 켜졌는지 읽히지 않는다.
 */
export function SegmentedTabs({
  label,
  value,
  options,
  onChange,
  toggleable = false,
  dense = false,
  className,
}: {
  /** 읽어 줄 이름 · 「등급」 「묶는 기준」 처럼 이 줄이 무엇을 고르는지 */
  label: string;
  value: string;
  options: readonly SegmentedTabOption[];
  onChange: (value: string) => void;
  /**
   * 켜진 칩을 다시 눌러 끌 수 있는가 · 거르개는 그렇고 축(묶는 기준)은 아니다.
   * 축은 끄면 표가 설 자리가 없어진다.
   */
  toggleable?: boolean;
  /**
   * 좌우 여백을 한 단 줄인다 · 칸이 열 개를 넘어 한 줄에 다 세워야 할 때.
   * 시세 표의 부위 탭 열일곱 칸이 기본 여백으로는 판 밖으로 나간다.
   */
  dense?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-line bg-surface-muted p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            aria-keyshortcuts={option.hotkey || undefined}
            title={option.title ?? option.label}
            {...option.attrs}
            onClick={() => onChange(toggleable && active ? "" : option.value)}
            className={cn(
              "whitespace-nowrap rounded-[5px] text-[11px] font-semibold leading-6 tabular-nums transition-colors",
              dense ? "px-1.5" : "px-2",
              active
                ? "bg-surface text-content shadow-sm ring-1 ring-line"
                : "text-content-soft hover:text-content",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 분절 탭과 나란히 서는 켜고 끄는 칩 · 「미정만」 처럼 하나뿐인 거르개.
 *
 * 생김새를 탭과 같게 둔다 — 켜진 꼴이 켜진 탭과 같아야 「눌려 있다」 가 설명 없이
 * 읽힌다. 전에는 네모 체크상자였는데, 테두리 두른 탭 옆에서 그것만 높이가 14px 이라
 * 줄의 가운데선이 흔들렸다.
 */
export function ToggleChip({
  pressed,
  onPressedChange,
  children,
  title,
  className,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-md border px-2.5 text-[11px] font-semibold transition-colors",
        pressed
          ? "border-line bg-surface text-content shadow-sm"
          : "border-line bg-surface-muted text-content-soft hover:text-content",
        className,
      )}
    >
      {children}
    </button>
  );
}
