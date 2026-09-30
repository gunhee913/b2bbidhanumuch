"use client";

import { cn } from "@/lib/utils";

export type BidStatus = "active" | "won" | "lost";

const STATUS_CONFIG: Record<
  BidStatus,
  { label: string; className: string }
> = {
  active: {
    label: "진행중",
    className: "bg-inverse text-inverse-content",
  },
  won: {
    label: "낙찰",
    className: "bg-sky-600 text-white shadow-sm",
  },
  lost: {
    label: "미낙찰",
    className: "bg-rose-100 text-rose-700",
  },
};

/**
 * 경매내역 테이블 상태 배지 · 진행중 / 낙찰 / 미낙찰 세 가지 상태 지원.
 * - 브랜드 sky-600 solid 로 낙찰을 강조 (라이브 경매 낙찰 chip 과 통일)
 * - 미낙찰은 경매장 테이블의 미낙찰 rose 틴트와 같은 톤
 * - 진행중은 slate-800 solid 로 action-needed 상기
 */
export function StatusBadge({ status }: { status: BidStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex h-5 w-[44px] items-center justify-center text-[10px] font-bold leading-none",
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * @deprecated Use `StatusBadge` instead. Kept for backward compatibility.
 */
export function ResultBadge({ result }: { result: "won" | "lost" }) {
  return <StatusBadge status={result} />;
}
