"use client";

import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import type { AuctionDay } from "@/features/auction-days/types";
import { AuctionScheduleCalendar } from "./AuctionScheduleCalendar";

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
  const [selected, setSelected] = useState<{
    date: string;
    day: AuctionDay | null;
  }>({ date: listingDate, day: null });
  // 경매일이 바뀌면(날짜 넘김·다른 장) 고른 날도 그날로 되돌린다
  useEffect(() => setSelected({ date: listingDate, day: null }), [listingDate]);

  return (
    <>
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-[13px] font-bold tracking-tight text-content">
          경매 일정
        </h2>
      </header>

      <AuctionScheduleCalendar
        listingDate={listingDate}
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

      <ul className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-3">
        <LegendItem marker={<span className="h-1 w-1 rounded-full bg-inverse" />}>
          경매
        </LegendItem>
        <LegendItem
          marker={<span className="h-[1.5px] w-2 rounded-full bg-content-ghost" />}
        >
          휴장
        </LegendItem>
        <LegendItem marker={<span className="h-1 w-1" />}>미정</LegendItem>
      </ul>
    </>
  );
}

/** 고른 날 한 줄 · 개장이면 두수, 휴장이면 사유, 미정이면 아직 안 정했다고 */
function SelectedDayLine({ day }: { day: AuctionDay | null }) {
  if (!day || day.status === "unset") {
    return (
      <p className="mt-1 text-[12px] font-medium text-content-faint">
        일정 미정
      </p>
    );
  }

  if (day.status === "closed") {
    return (
      <p className="mt-1 text-[12px] font-medium text-content-soft">
        휴장
        {day.note ? (
          <span className="text-content-faint"> · {day.note}</span>
        ) : null}
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
        <span className="text-content-faint">
          경매 예정
          {day.roundCount > 0 ? ` · ${day.roundCount}회차` : null}
        </span>
      )}
      {day.note ? <span className="text-content-faint"> · {day.note}</span> : null}
    </p>
  );
}

function LegendItem({
  marker,
  children,
}: {
  marker: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5 text-[10.5px] font-medium text-content-faint">
      <span className="flex h-2 w-2 items-center justify-center" aria-hidden>
        {marker}
      </span>
      {children}
    </li>
  );
}

function formatSectionDate(iso: string): string {
  const d = parse(iso, "yyyy-MM-dd", new Date());
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "M월 d일 (EEEEE)", { locale: ko });
}
