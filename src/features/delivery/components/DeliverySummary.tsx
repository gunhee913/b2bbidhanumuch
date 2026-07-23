"use client";

import { cn } from "@/lib/utils";
import { formatWon } from "@/features/live-auction/lib/masking";

export interface DeliverySummaryProps {
  totalCount: number;
  assignedCount: number;
  unassignedCount: number;
  totalAmount: number;
  isLoading: boolean;
}

/**
 * 배송지시 페이지 요약 스트립.
 * 낙찰 부위 규모와 배정 진행률을 한눈에 확인할 수 있도록 4개 카드로 구성.
 */
export function DeliverySummary({
  totalCount,
  assignedCount,
  unassignedCount,
  totalAmount,
  isLoading,
}: DeliverySummaryProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <SummaryCard
        label="낙찰 부위"
        value={
          isLoading ? "-" : `${totalCount.toLocaleString()}건`
        }
      />
      <SummaryCard
        label="배정 완료"
        value={
          isLoading ? "-" : `${assignedCount.toLocaleString()}건`
        }
        highlight
      />
      <SummaryCard
        label="미배정"
        value={
          isLoading ? "-" : `${unassignedCount.toLocaleString()}건`
        }
        tone={unassignedCount > 0 ? "warn" : "muted"}
      />
      <SummaryCard
        label="낙찰 총액"
        value={isLoading ? "-" : formatWon(totalAmount)}
        highlight
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "warn" | "muted";
}) {
  const valueColor = highlight
    ? "text-sky-700"
    : tone === "warn"
      ? "text-amber-700"
      : "text-slate-900";
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-[18px] font-extrabold tabular-nums tracking-tight",
          valueColor,
        )}
      >
        {value}
      </div>
    </div>
  );
}
