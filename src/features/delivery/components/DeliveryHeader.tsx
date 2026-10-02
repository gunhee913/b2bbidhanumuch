"use client";

import { useState } from "react";
import { useInterval } from "react-use";
import { differenceInMinutes, format } from "date-fns";
import { Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodFilter } from "@/features/history/components/PeriodFilter";
import { DELIVERY_DEADLINE_LABEL, deliveryDeadline } from "../lib/deadline";

export interface DeliveryHeaderProps {
  startDate: string;
  endDate: string;
  onChangePeriod: (next: { startDate: string; endDate: string }) => void;
  onSearch: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/** 남은 시간이 이 아래로 떨어지면 색을 바꾼다 · 한 시간이면 쉰 건은 마저 끝낼 수 있다 */
const DEADLINE_SOON_MINUTES = 60;

/**
 * 머리줄에 적을 마감 문구 · 보고 있는 기간의 **마지막 날**을 기준으로 삼는다.
 *
 * 기간을 넓게 잡으면 앞쪽 날은 이미 잠겨 있고 마지막 날만 살아 있다. 살아 있는 쪽을
 * 말해 줘야 「아직 고칠 수 있나」 에 답이 된다 — 첫날로 재면 늘 「마감됨」 이다.
 */
function deadlineState(endDate: string, now: Date) {
  const deadline = deliveryDeadline(endDate);
  if (!deadline)
    return { tone: "open" as const, text: `${DELIVERY_DEADLINE_LABEL} 마감` };

  const left = differenceInMinutes(deadline, now);
  if (left < 0) {
    return {
      tone: "closed" as const,
      text: `${format(deadline, "M/d")} 마감됨`,
    };
  }
  if (left <= DEADLINE_SOON_MINUTES) {
    return { tone: "soon" as const, text: `마감 ${left}분 전` };
  }
  return {
    tone: "open" as const,
    text: `${format(deadline, "M/d")} ${DELIVERY_DEADLINE_LABEL} 마감`,
  };
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
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), 60_000);
  const { tone: deadlineTone, text: deadlineText } = deadlineState(
    endDate,
    now,
  );

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-b-line-soft bg-surface px-3 py-2">
      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        onChange={onChangePeriod}
        onSearch={onSearch}
        className="border-0 bg-transparent p-0"
      />

      {/*
       * 마감을 늘 띄워 둔다 · 막힌 뒤에 알면 늦다.
       *
       * 오늘치가 열려 있는 동안에는 남은 시간을, 지난 날짜만 보고 있으면 「마감됨」 을
       * 적는다. 같은 자리에 같은 문장이 있어야 「어, 오늘은 왜 다르지」 가 눈에 띈다.
       */}
      <span
        title={`배송지는 상장일 ${DELIVERY_DEADLINE_LABEL} 까지 고칠 수 있습니다 · 그 뒤 수정은 관리자에게 요청해 주세요`}
        className={cn(
          "ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 px-2 text-[11px] font-semibold tabular-nums",
          deadlineTone === "open" && "text-content-faint",
          deadlineTone === "soon" && "text-pending",
          deadlineTone === "closed" && "text-content-ghost",
        )}
      >
        <Clock className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        {deadlineText}
      </span>

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
