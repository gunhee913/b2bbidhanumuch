"use client";

import { PeriodFilter } from "@/features/history/components/PeriodFilter";
import { cn } from "@/lib/utils";

export type DeliveryStatusFilter = "all" | "assigned" | "unassigned";

export interface DeliveryHeaderProps {
  startDate: string;
  endDate: string;
  onChangePeriod: (next: { startDate: string; endDate: string }) => void;
  onSearch: () => void;
  statusFilter: DeliveryStatusFilter;
  onChangeStatus: (next: DeliveryStatusFilter) => void;
}

const STATUS_TABS: { key: DeliveryStatusFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "unassigned", label: "미등록" },
  { key: "assigned", label: "등록완료" },
];

/**
 * 배송지시 페이지 상단 · 제목 + 기간 필터 + 상태 필터.
 * 필터 값은 부모(`DeliveryPageContent`)가 관리.
 */
export function DeliveryHeader({
  startDate,
  endDate,
  onChangePeriod,
  onSearch,
  statusFilter,
  onChangeStatus,
}: DeliveryHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-[1240px] px-8 pb-4 pt-8">
        <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">
          배송지시
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          낙찰받은 부위의 최종 납품 거래처를 지정하세요.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <PeriodFilter
            startDate={startDate}
            endDate={endDate}
            onChange={onChangePeriod}
            onSearch={onSearch}
            className="flex-1 min-w-[420px]"
          />
        </div>

        <div className="mt-3 flex items-center gap-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onChangeStatus(t.key)}
              className={cn(
                "inline-flex h-8 items-center rounded-md border px-3 text-[12px] font-bold transition-colors",
                statusFilter === t.key
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
              aria-pressed={statusFilter === t.key}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
