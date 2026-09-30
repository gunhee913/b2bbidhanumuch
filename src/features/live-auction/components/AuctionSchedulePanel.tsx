"use client";

import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuctionCalendarMonth } from "@/features/auction-days/hooks/useAuctionCalendarMonth";
import type { AuctionDay } from "@/features/auction-days/types";
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
 */
export function AuctionSchedulePanel({
  listingDate,
}: AuctionSchedulePanelProps) {
  const { house } = useCurrentHouse();
  const [anchor, setAnchor] = useState(() => startOfMonthOf(listingDate));
  const [selected, setSelected] = useState<{
    date: string;
    day: AuctionDay | null;
  }>({ date: listingDate, day: null });
  // 경매일이 바뀌면(날짜 넘김·다른 장) 고른 날도 그날로 되돌린다
  useEffect(() => setSelected({ date: listingDate, day: null }), [listingDate]);

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
        selected={selected.date}
        onSelect={(date, day) => setSelected({ date, day })}
      />

      <div className="mt-1 border-t border-line-soft px-4 py-3">
        <p className="text-[11.5px] font-semibold tabular-nums text-content-mid">
          {formatSectionDate(selected.date)}
          {selected.date === listingDate ? " · 오늘" : null}
        </p>
        <SelectedDayLine day={selected.day} />
      </div>

      <GradeListingTable
        date={selected.date}
        className="mt-1 border-t border-line-soft pb-3 pt-3"
      />
    </>
  );
}

/** 고른 날 한 줄 · 개장이면 두수, 휴장이면 사유, 미정이면 아직 안 정했다고 */
function SelectedDayLine({ day }: { day: AuctionDay | null }) {
  if (!day || day.status === "unset") {
    return (
      <p className="mt-1 text-[12px] font-medium text-content-soft">
        일정 미정
      </p>
    );
  }

  if (day.status === "closed") {
    return (
      <p className="mt-1 text-[12px] font-medium text-content-soft">
        휴장
        {day.note ? <span> · {day.note}</span> : null}
      </p>
    );
  }

  return (
    <p className="mt-1 text-[12px] font-medium text-content-soft">
      {day.totalListings > 0 ? (
        <>
          상장{" "}
          <span className="font-bold tabular-nums text-content">
            {day.totalListings.toLocaleString("ko-KR")}
          </span>
          두
        </>
      ) : (
        /* 개장으로 잡혀 있지만 아직 상장이 안 올라온 날 · 회차 수라도 알려 준다 */
        <span>
          경매 예정
          {day.roundCount > 0 ? ` · ${day.roundCount}회차` : null}
        </span>
      )}
      {day.note ? <span> · {day.note}</span> : null}
    </p>
  );
}

function formatSectionDate(iso: string): string {
  const d = parse(iso, "yyyy-MM-dd", new Date());
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "M월 d일 (EEEEE)", { locale: ko });
}
