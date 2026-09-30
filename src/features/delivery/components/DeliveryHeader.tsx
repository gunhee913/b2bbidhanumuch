"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodFilter } from "@/features/history/components/PeriodFilter";
import { CompactFilterPill } from "@/features/live-auction/components/CompactFilterPill";

export interface DeliveryHeaderProps {
  startDate: string;
  endDate: string;
  onChangePeriod: (next: { startDate: string; endDate: string }) => void;
  onSearch: () => void;
  partOptions: readonly string[];
  partFilter: string;
  onPartFilterChange: (v: string) => void;
  hideDone: boolean;
  onHideDoneChange: (v: boolean) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * 배송지시 상단 · 조회기간 + 부위 필터 + 배정 완료 숨김 + 새로고침.
 * 상태 탭(전체/미배정/배정)은 개체 카드의 진행 표시로 대체 → 제거.
 */
export function DeliveryHeader({
  startDate,
  endDate,
  onChangePeriod,
  onSearch,
  partOptions,
  partFilter,
  onPartFilterChange,
  hideDone,
  onHideDoneChange,
  isRefreshing,
  onRefresh,
}: DeliveryHeaderProps) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1360px] min-[1700px]:max-w-[1600px] flex-wrap items-center justify-between gap-3 px-8 pb-4 pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter
          startDate={startDate}
          endDate={endDate}
          onChange={onChangePeriod}
          onSearch={onSearch}
          className="min-w-[420px]"
        />
        <CompactFilterPill
          label="부위"
          value={partFilter}
          onChange={onPartFilterChange}
          options={partOptions}
          allLabel="전체 부위"
          valueOnlyWhenActive
        />
        <label className="inline-flex h-7 cursor-pointer select-none items-center gap-1.5 text-[12px] text-content-mid">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => onHideDoneChange(e.target.checked)}
            className="h-3.5 w-3.5 accent-sky-600"
          />
          배정 완료 숨기기
        </label>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex h-7 items-center gap-1.5 border border-line bg-surface px-2.5 text-[12px] font-semibold text-content-mid transition-colors hover:border-line hover:text-content disabled:opacity-60"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        새로고침
      </button>
      </div>
    </div>
  );
}
