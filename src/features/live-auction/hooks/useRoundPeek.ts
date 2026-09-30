"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoundPhase } from "../components/RoundCountdownDial";

/** 저절로 튀어나왔을 때 머무는 시간 */
const PEEK_MS = 4000;
/** 아무 일 없을 때의 기본 주기 · 3분 */
const PEEK_INTERVAL_MS = 3 * 60_000;
/**
 * 남은 시간이 이 초를 밑도는 순간 한 번씩.
 * 값 자체보다 「여기서부터는 손을 놓으면 안 된다」는 단계 구분이라 마감 임박 기준(60·30초)과
 * 맞춰 두고, 그 앞에 마음의 준비를 할 5분을 더 둔다.
 */
const PEEK_AT_SEC = [300, 60, 30] as const;

/**
 * 사이드 메뉴가 접혀 있을 때 경매 시간 카드를 저절로 내보내는 시점.
 *
 * 접어 두는 사람은 표를 넓게 쓰려는 것이지 시간을 안 보겠다는 게 아니다. 그렇다고 계속
 * 띄워 두면 접은 뜻이 없어지므로, 놓치면 곤란한 순간(회차가 열리고 닫힐 때 · 5분 · 1분 ·
 * 30초 남았을 때)에만 잠깐 내보내고 그 사이는 느린 주기로만 상기시킨다.
 *
 * 펼쳐져 있으면(enabled=false) 카드가 이미 보이므로 아무것도 하지 않는다.
 */
export function useRoundPeek(phase: RoundPhase, enabled: boolean) {
  const [peeking, setPeeking] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPeeking(true);
    hideTimer.current = setTimeout(() => setPeeking(false), PEEK_MS);
  }, []);

  const hideNow = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPeeking(false);
  }, []);

  useEffect(() => () => void (hideTimer.current && clearTimeout(hideTimer.current)), []);

  // 접으면 떠 있던 카드를 즉시 거둔다 · 펼친 뒤에도 남아 패널과 겹치지 않게
  useEffect(() => {
    if (!enabled) hideNow();
  }, [enabled, hideNow]);

  // 회차가 열리거나 닫히는 순간
  const prevKind = useRef(phase.kind);
  useEffect(() => {
    const changed = prevKind.current !== phase.kind;
    prevKind.current = phase.kind;
    if (!enabled || !changed) return;
    if (phase.kind === "live" || phase.kind === "closed") show();
  }, [phase.kind, enabled, show]);

  // 마감까지 남은 시간이 단계선을 넘어서는 순간
  const prevSec = useRef(phase.remainingSec);
  useEffect(() => {
    const before = prevSec.current;
    const now = phase.remainingSec;
    prevSec.current = now;
    if (!enabled || now <= 0) return;
    if (PEEK_AT_SEC.some((mark) => before > mark && now <= mark)) show();
  }, [phase.remainingSec, enabled, show]);

  // 그 밖에는 느린 주기로
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(show, PEEK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, show]);

  return { peeking, hideNow };
}
