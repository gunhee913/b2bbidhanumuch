"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodFilter } from "@/features/history/components/PeriodFilter";

export interface DeliveryHeaderProps {
  startDate: string;
  endDate: string;
  onChangePeriod: (next: { startDate: string; endDate: string }) => void;
  onSearch: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * 배송지시 첫 줄 · 조회기간과 새로고침.
 *
 * 경매장 필터 줄(`SheetFilterBar`)과 같은 자리·같은 여백을 쓴다. 두 화면을 오가는
 * 사람에게 줄이 어디서 시작하는지가 페이지마다 다르면 매번 눈이 다시 자리를 잡는다.
 *
 * 기간 고르개는 제 테두리를 벗겨서 넣는다. 섹션 안에 또 네모를 두르면 테두리가 겹쳐
 * 떠 있는 상자처럼 읽힌다 — 섹션 안에서 줄을 가르는 데는 아래 실선 하나면 된다.
 *
 * 부위 거르개는 뺐다 — 표가 부위로 묶이면서 거르개가 하던 일을 묶음 머리가 한다.
 * 보기에 관한 것(묶는 기준·미정만)은 표 바로 위에 둔다. 손이 가는 자리와 그 결과가
 * 보이는 자리가 멀면 눌러 놓고 어디가 바뀌었는지 찾게 된다.
 */
export function DeliveryHeader({
  startDate,
  endDate,
  onChangePeriod,
  onSearch,
  isRefreshing,
  onRefresh,
}: DeliveryHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-b-line-soft bg-surface px-3 py-2">
      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        onChange={onChangePeriod}
        onSearch={onSearch}
        className="border-0 bg-transparent p-0"
      />

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 border border-line bg-surface px-2.5 text-[11px] font-semibold text-content-mid transition-colors hover:border-content-ghost hover:text-content disabled:opacity-60"
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
        />
        새로고침
      </button>
    </div>
  );
}
