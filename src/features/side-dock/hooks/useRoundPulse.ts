"use client";

import { format } from "date-fns";
import { useRoundSchedule } from "@/features/round-schedules/hooks/useRoundSchedule";
import { useCurrentRound } from "@/features/live-auction/hooks/useCurrentRound";
import {
  useRoundPhase,
  type RoundPhase,
} from "@/features/live-auction/components/RoundCountdownDial";

/**
 * 오늘 경매 시간의 지금 상태 · 어느 화면에서든 같은 답을 준다.
 *
 * 경매장 방(`useAuctionRoom`)이 쓰던 두 질의를 그대로 쓴다 — 열쇠가 같으므로
 * 경매장에서는 이미 받아 둔 것을 나눠 쓰고, 다른 화면에서는 이 둘만 새로 받는다.
 * 5초·15초 주기는 그 질의들이 쥐고 있다.
 *
 * 레일 맨 윗칸이 네 화면에서 같은 숫자를 말해야 해서 한곳에 모았다. 화면마다
 * 제 계산을 두면 같은 순간에도 초가 어긋나 보인다.
 */
export function useRoundPulse(): RoundPhase {
  const listingDate = format(new Date(), "yyyy-MM-dd");
  const { data: roundData } = useCurrentRound(listingDate);
  const { data: scheduleData } = useRoundSchedule(listingDate);

  return useRoundPhase({
    currentRound: roundData?.currentRound ?? null,
    lastClosedRound: roundData?.lastClosedRound ?? null,
    schedules: scheduleData?.schedules ?? [],
    allRounds: roundData?.allRounds ?? [],
    date: listingDate,
  });
}
