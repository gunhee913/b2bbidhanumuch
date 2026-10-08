"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuctionDayStats } from "@/features/main/api";

/**
 * 하루치 등급 매트릭스 (1++ 는 근내지방도 9/8/7 로 나뉘고 육량 A/B/C 열).
 *
 * `/api/main/auction-day-stats` 를 그대로 쓴다 — 메인 화면 달력이 이미 같은 표를
 * 그리고 있어서, 경매장에서 따로 집계를 만들면 두 화면의 두수가 어긋날 수 있다.
 *
 * `gender` 를 빼면 전체. 같은 날 안에서 성별 탭만 바꿀 때는 앞 숫자를 쥔 채 기다린다 —
 * 비워 두면 표가 「불러오는 중」 한 줄로 접혔다 다시 펴지며 패널이 들썩인다. 날짜가
 * 바뀌면 쥐지 않는다 · 다른 날 숫자가 새 날짜 머리 밑에 잠깐이라도 서면 안 된다.
 */
export function useAuctionDayStats(
  date: string | null,
  slaughterHouse?: string | null,
  gender?: string | null,
) {
  return useQuery({
    queryKey: [
      "auction-day-stats",
      slaughterHouse ?? null,
      date,
      gender ?? null,
    ],
    queryFn: () =>
      fetchAuctionDayStats(
        date!,
        slaughterHouse ?? undefined,
        gender ?? undefined,
      ),
    enabled: !!date,
    staleTime: 5 * 60_000,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === (slaughterHouse ?? null) &&
      previousQuery.queryKey[2] === date
        ? previous
        : undefined,
  });
}
