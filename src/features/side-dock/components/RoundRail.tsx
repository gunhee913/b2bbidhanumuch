"use client";

import { useCallback, useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useSonner } from "sonner";
import { cn } from "@/lib/utils";
import { isDeadlineTier } from "@/features/live-auction/lib/deadline";
import { RoundPeekCard } from "@/features/live-auction/components/RoundPeekCard";
import { useRoundPeek } from "@/features/live-auction/hooks/useRoundPeek";
import type { RoundPhase } from "@/features/live-auction/components/RoundCountdownDial";
import { SideDockRailItem } from "./SideDockRailItem";

export interface RoundRailProps {
  phase: RoundPhase;
  /**
   * 눌렀을 때 열 것 · **경매장만 준다.**
   *
   * 회차 패널(배정 현황·회차별 결과)은 상장 목록이 있어야 그릴 수 있어 경매장에만
   * 있다. 나머지 화면에서는 누를 것이 없으므로 아예 단추로 만들지 않는다 — 눌러도
   * 아무 일이 없는 칸을 두면 다음에 정말 눌러야 할 때도 믿지 않게 된다.
   */
  onOpen?: () => void;
  /** 회차 패널이 지금 펼쳐져 있는가 */
  active?: boolean;
  /**
   * 저절로 튀어나오는 카드를 쓸까 · 경매장이 접혀 있을 때만 참.
   *
   * 열 패널이 없는 화면에서는 손이 닿을 때만 보인다. 경매내역을 보고 있는데 3분마다
   * 카드가 튀어나오면, 정작 마감 30초 전에 나온 것도 「또 그거」 로 지나친다.
   */
  autoPeek?: boolean;
  /**
   * 지금은 카드를 내보내지 말 것.
   *
   * 패널이 이미 펴져 있으면 같은 시계를 패널 안에서 보고 있으므로 손이 스쳐도 띄우지
   * 않고, 레일 옆에 다른 카드(오늘의 상장 브리핑)가 떠 있을 때도 비켜 준다 — 둘이
   * 같은 자리를 쓴다.
   */
  peekBlocked?: boolean;
}

/**
 * 레일 맨 윗칸 · 회차 · 네 화면이 함께 쓴다.
 *
 * 경매가 열려 있으면 라벨 자리에 남은 시간이 선다. 경매장에서는 그게 입찰 마감까지의
 * 시간이고, 경매내역·시세·통계·배송지시에서는 **지금 돌아가고 있는 판이 있다**는 신호다
 * — 지난 자료를 들여다보다가도 한 번 더 걸어야 할 순간은 놓치면 안 된다.
 *
 * 그래서 자리를 네 화면에서 똑같이 맨 위로 맞췄다. 레일은 내용이 아니라 손이 기억하는
 * 자리라, 같은 것이 화면마다 다른 높이에 있으면 매번 눈이 다시 자리를 잡는다.
 *
 * 세는 동안에는 이 칸이 레일에서 제일 또렷해야 한다 — 접어 두면 화면에 남는 건 이
 * 42px 뿐이고, 그때 알아야 하는 건 「몇 초 남았나」 하나다. 단계 색은 카드
 * (`CountdownDigits`)가 정한 규칙을 그대로 따른다. 마지막 30초에는 글자만으로 부족해
 * 아이콘 상자까지 물들이고 숨을 쉰다.
 */
export function RoundRail({
  phase,
  onOpen,
  active = false,
  autoPeek = false,
  peekBlocked = false,
}: RoundRailProps) {
  /*
   * 첫 그림에서는 「회차」 라고만 적는다.
   *
   * 남은 시간은 서버가 그릴 때와 화면이 받을 때가 다를 수밖에 없는 값이라, 그대로
   * 내보내면 하이드레이션에서 어긋난다. 한 프레임 뒤 제 숫자로 바뀐다.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { peeking, hideNow } = useRoundPeek(phase, autoPeek);
  const [hovering, setHovering] = useState(false);
  const leave = useCallback(() => {
    setHovering(false);
    hideNow();
  }, [hideNow]);

  /*
   * 토스트가 떠 있는 동안은 카드를 내보내지 않는다 · **둘이 같은 자리를 쓴다.**
   *
   * 토스트는 오른쪽 위(`offset 64`)에 440px 로 서고, 이 카드는 레일 왼쪽 `top-2` 에
   * 172px 로 선다 — 가로세로가 거의 통째로 겹친다. 회차가 열리는 순간이 제일 나쁜데,
   * 「3회차 경매 시작」 토스트와 이 카드가 **같은 사건으로 동시에** 뜨기 때문이다.
   * 같은 말을 두 장이 겹쳐서 하고 있으면 둘 다 안 읽힌다.
   *
   * 자리를 비키는 쪽은 카드다. 토스트는 몇 초 뒤 저절로 사라지고, 그동안에도 남은
   * 시간은 레일 칸에 그대로 적혀 있다 — 이 카드가 없으면 못 보는 것은 없다.
   */
  const { toasts } = useSonner();
  const toastUp = toasts.length > 0;

  const isLive = mounted && phase.kind === "live";
  const urgent = isLive && isDeadlineTier(phase.tier);

  const cell = (
    <SideDockRailItem
      icon={Timer}
      label={isLive ? phase.formatted : "회차"}
      active={active}
      interactive={!!onOpen}
      onClick={onOpen}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={leave}
      labelClassName={cn(
        isLive && "text-[13px] font-bold",
        isLive && (urgent ? "text-rise" : "text-content"),
      )}
      iconClassName={cn(
        urgent && "bg-rise/10 text-rise",
        isLive && phase.tier === "critical" && "animate-pulse-soft",
      )}
    />
  );

  return (
    <>
      {cell}

      <RoundPeekCard
        phase={phase}
        open={!peekBlocked && !toastUp && (hovering || peeking)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={leave}
        onClick={onOpen}
      />
    </>
  );
}
