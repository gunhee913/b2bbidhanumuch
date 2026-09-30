"use client";

import { useEffect, useRef, useState } from "react";
import type { RoundInfo } from "@/features/main/api";
import { useMyBids, type MyBidEntry } from "./useMyBids";
import { showRoundCloseToast } from "../components/RoundCloseToast";

/** 낙찰 결과(rank) 가 이 시간 안에 안 들어오면 있는 값으로 토스트를 띄운다 */
const SETTLE_WAIT_MS = 8_000;

interface PendingClose {
  roundId: string;
  roundNo: number;
  since: number;
}

/**
 * 회차가 open → closed 로 바뀌는 순간을 잡아 결과 토스트를 띄운다.
 *
 * - 첫 로드 때 이미 닫혀 있던 회차는 대상이 아니다 (새로고침마다 울리지 않게)
 * - 중도매인이면 내 입찰의 rank 가 확정될 때까지(최대 8초) 기다린 뒤 낙찰/미낙찰 건수를 붙인다
 *   · close_round RPC 가 rank 를 세팅하고 useMyBids 가 5초 주기로 다시 읽어 오므로 보통 한 번의 갱신으로 끝난다
 * - 비로그인/비딜러는 "n회차 종료" 만
 */
export function useRoundCloseNotifier({
  allRounds,
  dealerId,
  listingDate,
  onOpenMyBids,
}: {
  allRounds: RoundInfo[];
  dealerId: string | null;
  listingDate: string;
  onOpenMyBids: (roundId: string) => void;
}) {
  const seenClosedRef = useRef<Set<string> | null>(null);
  const [pending, setPending] = useState<PendingClose[]>([]);
  const { data: myBids } = useMyBids(dealerId, listingDate);

  // 1) closed 로 새로 바뀐 회차 감지
  useEffect(() => {
    if (allRounds.length === 0) return;
    const closedNow = allRounds.filter((r) => r.status === "closed");
    if (seenClosedRef.current === null) {
      seenClosedRef.current = new Set(closedNow.map((r) => r.id));
      return;
    }
    const seen = seenClosedRef.current;
    const fresh = closedNow.filter((r) => !seen.has(r.id));
    if (fresh.length === 0) return;
    fresh.forEach((r) => seen.add(r.id));
    const now = Date.now();
    setPending((prev) => [
      ...prev,
      ...fresh.map((r) => ({ roundId: r.id, roundNo: r.round_no, since: now })),
    ]);
  }, [allRounds]);

  // 2) 결과 확정(또는 대기 초과) 시 토스트
  useEffect(() => {
    if (pending.length === 0) return;

    const fire = (p: PendingClose) => {
      const my = dealerId ? summarizeMyRound(myBids ?? [], p.roundId) : null;
      showRoundCloseToast({
        roundId: p.roundId,
        roundNo: p.roundNo,
        my,
        onOpenMyBids: dealerId ? onOpenMyBids : undefined,
      });
    };

    const now = Date.now();
    const ready = pending.filter((p) => {
      if (!dealerId) return true;
      if (now - p.since >= SETTLE_WAIT_MS) return true;
      const mine = (myBids ?? []).filter((b) => b.auctionId === p.roundId);
      return mine.length === 0
        ? now - p.since >= 2_000
        : mine.every((b) => b.rank != null);
    });

    if (ready.length > 0) {
      ready.forEach(fire);
      const readyIds = new Set(ready.map((p) => p.roundId));
      setPending((prev) => prev.filter((p) => !readyIds.has(p.roundId)));
      return;
    }

    // 아직 확정 안 됨 · 다음 판정 타이머 (myBids 갱신이 오면 effect 가 다시 돈다)
    const nextCheck = Math.min(
      ...pending.map((p) => Math.max(500, SETTLE_WAIT_MS - (now - p.since))),
    );
    const t = window.setTimeout(
      () => setPending((prev) => [...prev]),
      nextCheck,
    );
    return () => window.clearTimeout(t);
  }, [pending, myBids, dealerId, onOpenMyBids]);
}

function summarizeMyRound(bids: MyBidEntry[], roundId: string) {
  const mine = bids.filter((b) => b.auctionId === roundId);
  return mine.reduce(
    (acc, b) => {
      acc.bidCount += 1;
      if (b.rank != null && b.isWinning) {
        acc.wonCount += 1;
        acc.wonAmount += b.bidAmount;
      } else if (b.rank != null) {
        acc.lostCount += 1;
      }
      return acc;
    },
    { bidCount: 0, wonCount: 0, lostCount: 0, wonAmount: 0 },
  );
}
