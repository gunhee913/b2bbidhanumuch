"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 경매결과·입찰내역 표가 함께 쓰는 조각들.
 *
 * 두 표는 같은 날을 다른 각도에서 볼 뿐이라 거르개 줄·빈 줄·기다리는 줄이 꼭 같아야
 * 한다. 한쪽에서만 검색창 높이가 1px 달라지면 레일로 오갈 때마다 머리글이 들썩인다.
 *
 * 분절 탭은 여기 있다가 더 멀리 나갔다 — 배송지시의 묶는 기준, 경매장의 등급 탭이
 * 같은 줄이라 `@/components/ui/segmented-tabs` 로 옮겼다.
 */

/** 거르개 줄의 검색창 · 두 표가 같은 모양을 쓰고 안내 글귀만 다르다 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative inline-flex h-7 items-center">
      <Search
        className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-content-faint"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-7 w-[180px] rounded-md border border-line bg-surface pl-7 pr-6 text-[11.5px] text-content placeholder:text-content-faint focus:border-focus focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="검색어 지우기"
          className="absolute right-1.5 inline-flex h-4 w-4 items-center justify-center text-content-faint hover:text-content-mid"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </label>
  );
}

/** 거르개 줄의 초기화 단추 · 걸린 게 있을 때만 뜬다 */
export function ResetFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2 text-[11px] font-medium text-content-soft transition-colors hover:border-line hover:text-content-mid"
    >
      초기화
    </button>
  );
}

export function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-16 text-center text-[13px] text-content-faint"
      >
        {message}
      </td>
    </tr>
  );
}

export function SkeletonRows({
  colSpan,
  rows,
}: {
  colSpan: number;
  rows: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-line-soft">
          <td colSpan={colSpan} className="px-2 py-1.5">
            <div className="h-4 w-full animate-pulse bg-surface-accent" />
          </td>
        </tr>
      ))}
    </>
  );
}

/* ───────────────────────── 숫자 + 단위 ───────────────────────── */

/**
 * 숫자 뒤에 한 치수 작고 흐린 단위 · 배송지시 표(`Measured`)와 같은 규칙.
 *
 * 전에는 거르개 줄 끝에 「단위 : 원/kg · 총 금액은 원」 이라고 한 번 적어 두었다.
 * 열두 칸짜리 표에서 그 한 줄은 어느 칸에 걸리는 말인지 매번 되짚게 만들고,
 * 되짚는 김에 틀리기도 한다 — 단가 칸과 금액 칸이 섞여 있어서다. 칸마다 달면
 * 되짚을 일이 없고, 단가인지 금액인지는 머리글이 이미 말한다.
 *
 * 민짜 인라인이다. `inline-flex` 로 감싸면 그 상자가 줄 상자보다 커져 줄 높이가
 * 한두 px 씩 밀리는데, 열두 칸 가운데 하나만 그래도 표 전체가 그만큼 성겨진다.
 *
 * 값이 없으면 단위를 뺀다 — 「-원」 은 0원처럼 읽힌다.
 */
export function Measured({
  value,
  unit,
  className,
}: {
  /** 이미 다듬어진 글자 · `"-"` 면 값이 없다는 뜻이다 */
  value: string;
  unit: string;
  /** 숫자에만 걸리는 굵기·색 · 단위는 늘 같은 톤으로 둔다 */
  className?: string;
}) {
  if (value === "-") return <span className="text-content-ghost">-</span>;
  return (
    <>
      <span className={className}>{value}</span>
      <span className="pl-0.5 text-[11px] font-medium text-content-faint">
        {unit}
      </span>
    </>
  );
}

/** 중량 · 숫자만 굵게 · 밀린 줄(`muted`)은 한 단계 묽게 */
export function WeightValue({
  weight,
  muted,
}: {
  weight: number;
  muted: boolean;
}) {
  return (
    <Measured
      value={Number.isFinite(weight) && weight > 0 ? weight.toFixed(1) : "-"}
      unit="kg"
      className={cn("font-bold", muted ? "text-content-soft" : "text-content")}
    />
  );
}
