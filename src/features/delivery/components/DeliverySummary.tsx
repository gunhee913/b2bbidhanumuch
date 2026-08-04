"use client";

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
 * 모서리 직각, 텍스트 컬러 slate-900 통일 (강조 대신 위계는 라벨/값 크기로 표현).
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
        value={isLoading ? "-" : `${totalCount.toLocaleString()}건`}
      />
      <SummaryCard
        label="배정 완료"
        value={isLoading ? "-" : `${assignedCount.toLocaleString()}건`}
      />
      <SummaryCard
        label="미배정"
        value={isLoading ? "-" : `${unassignedCount.toLocaleString()}건`}
      />
      <SummaryCard
        label="낙찰 총액"
        value={isLoading ? "-" : formatWon(totalAmount)}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[18px] font-extrabold tabular-nums tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}
