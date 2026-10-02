"use client";

import { cn } from "@/lib/utils";
import { CHIP_BASE } from "@/features/live-auction/components/PartResultRow";

export type BidStatus = "active" | "won" | "lost";

/**
 * 세 상태가 한 줄기로 이어진다 · 속 빈 파랑(걸어 뒀다) → 속이 차면 내 낙찰 → 빨강 미낙찰.
 *
 * 경매장 부위표의 칩과 같은 규칙이다. 거기서 입찰을 걸면 테두리만 있는 파란 칩이 뜨고,
 * 결과가 나오면 그 칩이 채워지거나 빨강으로 넘어간다. 경매내역은 그 뒤를 이어 보는
 * 화면이라 같은 모양이어야 한다 — 어제 경매장에서 보던 속 빈 파랑이 오늘 여기서
 * 채워져 있으면 그것만으로 「먹었다」가 읽힌다.
 *
 * 예전엔 낙찰이 sky-600 통짜 파랑, 진행중이 먹색 통짜였다. 하루에 스무 건을 먹으면
 * 표가 파란 덩어리로 덮여 어느 줄을 봐야 하는지가 사라졌고, 정작 손이 가야 하는
 * 진행중이 가장 어두워서 「끝난 일」처럼 보였다.
 */
const STATUS_CONFIG: Record<BidStatus, { label: string; className: string }> = {
  active: {
    label: "진행중",
    className: "bg-surface text-won ring-1 ring-inset ring-won/45",
  },
  won: {
    label: "낙찰",
    className: "bg-won-surface text-won",
  },
  lost: {
    label: "미낙찰",
    className: "bg-lost-surface text-lost",
  },
};

/**
 * 경매내역 표의 상태 배지 · 상자는 경매장 칩과 공유하고 폭만 열에 맞춰 못 박는다.
 *
 * `align-middle` 이 붙은 까닭 · 상자(`inline-flex`)는 기본값(baseline)으로 두면 제
 * 안 글자의 밑줄을 바깥 글자의 밑줄에 맞추느라 아래로 내려앉아 줄 상자를 2px 밀어
 * 올린다. 한 줄 25px 로 묶어 둔 표에서 그 2px 은 열두 줄이면 한 줄 값이다.
 */
export function StatusBadge({ status }: { status: BidStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span className={cn(CHIP_BASE, "w-[46px] px-0 align-middle", className)}>
      {label}
    </span>
  );
}
