"use client";

import { cn } from "@/lib/utils";
import { formatKrw } from "@/features/live-auction/lib/masking";

export interface DeliveryProgressProps {
  entityTotal: number;
  entityDone: number;
  partTotal: number;
  partSaved: number;
  partPending: number;
  totalAmount: number;
  totalWeight: number;
  isLoading: boolean;
}

/**
 * 배송지시 · 진행 카드 1개.
 * "얼마나 남았나"를 바 하나로 · 우측에 낙찰 총액·중량. (경매내역 KPI 카드와 같은 문법)
 */
export function DeliveryProgress({
  entityTotal,
  entityDone,
  partTotal,
  partSaved,
  partPending,
  totalAmount,
  totalWeight,
  isLoading,
}: DeliveryProgressProps) {
  const savedPct = partTotal > 0 ? (partSaved / partTotal) * 100 : 0;
  const pendingPct = partTotal > 0 ? (partPending / partTotal) * 100 : 0;
  const unassigned = partTotal - partSaved - partPending;
  const allDone = partTotal > 0 && partSaved === partTotal;

  return (
    <div className="flex items-center gap-6 border border-line bg-surface px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2 text-[12px] text-content-mid">
            <span className="text-[13px] font-extrabold text-content">배정 진행</span>
            {isLoading ? (
              <span className="text-content-faint">-</span>
            ) : (
              <>
                <span className="tabular-nums">
                  개체 <b className="font-bold text-content">{entityDone}</b>
                  <span className="text-content-faint"> / {entityTotal}두</span>
                </span>
                <span className="text-content-ghost">·</span>
                <span className="tabular-nums">
                  부위 <b className="font-bold text-content">{partSaved}</b>
                  <span className="text-content-faint"> / {partTotal}건</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-baseline gap-3 text-[11.5px] tabular-nums">
            {partPending > 0 ? (
              <span className="text-amber-700">
                저장 전 <b className="font-bold">{partPending}</b>
              </span>
            ) : null}
            {!isLoading && unassigned > 0 ? (
              <span className="text-rose-600">
                미배정 <b className="font-bold">{unassigned}</b>
              </span>
            ) : null}
            <span className={cn("font-bold", allDone ? "text-sky-700" : "text-content-mid")}>
              {isLoading ? "-" : `${Math.round(savedPct)}%`}
            </span>
          </div>
        </div>
        <div className="mt-2 flex h-[6px] w-full overflow-hidden bg-surface-accent">
          <div className="h-full bg-sky-500 transition-[width]" style={{ width: `${savedPct}%` }} />
          <div className="h-full bg-amber-400 transition-[width]" style={{ width: `${pendingPct}%` }} />
        </div>
      </div>

      <div className="h-8 w-px shrink-0 bg-surface-strong" aria-hidden />

      <div className="shrink-0 text-right leading-tight">
        <div className="text-[11px] font-semibold text-content-soft">낙찰 총액</div>
        <div className="text-[16px] font-extrabold tabular-nums tracking-tight text-content">
          {isLoading ? "-" : formatKrw(totalAmount)}
          <span className="ml-0.5 text-[12px] font-semibold text-content-faint">원</span>
        </div>
      </div>
      <div className="shrink-0 text-right leading-tight">
        <div className="text-[11px] font-semibold text-content-soft">총 중량</div>
        <div className="text-[16px] font-extrabold tabular-nums tracking-tight text-content">
          {isLoading ? "-" : totalWeight.toFixed(1)}
          <span className="ml-0.5 text-[12px] font-semibold text-content-faint">kg</span>
        </div>
      </div>
    </div>
  );
}
