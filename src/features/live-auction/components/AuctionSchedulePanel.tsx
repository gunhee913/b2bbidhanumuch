"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuctionCalendarMonth } from "@/features/auction-days/hooks/useAuctionCalendarMonth";
import { useCurrentHouse } from "@/features/entry/hooks/useCurrentHouse";
import {
  AuctionScheduleCalendar,
  startOfMonthOf,
} from "./AuctionScheduleCalendar";
import { GradeListingTable } from "./GradeListingTable";

export interface AuctionSchedulePanelProps {
  /** yyyy-MM-dd · 지금 보고 있는 경매일 */
  listingDate: string;
}

/**
 * 경매 일정 패널 · 어느 날에 장이 서고 어느 날이 쉬는지.
 *
 * 부분육 경매는 매일 서지 않아서 "다음 장이 언제인지" 가 늘 궁금한 정보인데, 회차
 * 시간표는 오늘 안쪽 이야기라 이 질문에 답해 주지 못한다. 그래서 경매 시간과 따로 둔다.
 *
 * 고른 날의 개장/휴일은 달력 칸이 이미 글자로 말하므로 따로 한 줄을 세우지 않는다.
 * 고른 날짜는 아래 상장두수 표 머리에 붙는다.
 */
export function AuctionSchedulePanel({
  listingDate,
}: AuctionSchedulePanelProps) {
  const { house } = useCurrentHouse();
  const [anchor, setAnchor] = useState(() => startOfMonthOf(listingDate));
  const [selectedDate, setSelectedDate] = useState(listingDate);
  // 경매일이 바뀌면(날짜 넘김·다른 장) 고른 날도 그날로 되돌린다
  useEffect(() => setSelectedDate(listingDate), [listingDate]);

  /* 달을 넘기는 건 패널이 쥐고, 달력은 받은 것만 그린다 */
  const { data, isLoading } = useAuctionCalendarMonth(
    format(anchor, "yyyy-MM"),
    house?.name ?? null,
  );
  const days = data?.days ?? [];

  return (
    <>
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-[13px] font-bold tracking-tight text-content">
          경매 일정
        </h2>
      </header>

      <AuctionScheduleCalendar
        listingDate={listingDate}
        anchor={anchor}
        onAnchorChange={setAnchor}
        days={days}
        isLoading={isLoading}
        selected={selectedDate}
        onSelect={setSelectedDate}
      />

      <GradeListingTable
        date={selectedDate}
        className="mt-1 border-t border-line-soft pb-3 pt-3"
      />
    </>
  );
}
