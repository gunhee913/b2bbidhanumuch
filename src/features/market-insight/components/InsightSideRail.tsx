"use client";

import { useRef, type ComponentType } from "react";
import { CalendarDays, ChartLine, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import {
  SIDE_DOCK_RAIL_WIDTH,
  sideDockShellClass,
} from "@/features/side-dock/components/SideDockShell";
import { useReserveToastInset } from "@/features/side-dock/hooks/useToastInset";
import { SideDockRailItem } from "@/features/side-dock/components/SideDockRailItem";
import { ThemeRailButton } from "@/features/side-dock/components/ThemeRailButton";
import { RoundRail } from "@/features/side-dock/components/RoundRail";
import { useRoundPulse } from "@/features/side-dock/hooks/useRoundPulse";
import { useInsightPrefs, type InsightView } from "../hooks/useInsightPrefs";

/**
 * 바깥에서 안으로 · 시장 전체(시세) → 그중 내 것(경매통계).
 *
 * 레일 글자는 네 자를 넘기지 않는다. 칸이 42px 이라 다섯 자부터 옆 칸 위로 번지고,
 * 번지면 두 칸이 한 덩어리로 보여 어느 글자가 어느 칸인지 안 읽힌다.
 */
const VIEWS: {
  key: InsightView;
  label: string;
  icon: ComponentType<LucideProps>;
}[] = [
  { key: "market", label: "시세", icon: ChartLine },
  { key: "stats", label: "경매통계", icon: CalendarDays },
];

/**
 * 시세·통계 사이드 레일 · 56px · 본문을 통째로 갈아 끼운다.
 *
 * 경매내역 레일(`HistorySideRail`)과 하는 일도 생김새도 같다. 경매장·배송지시에서
 * 레일은 304px 패널을 여는 손잡이지만, 여기와 경매내역에서는 화면을 고르는
 * 손잡이다 — 넷 다 패널에 들어갈 크기가 아니라 본문을 내준다.
 *
 * 그래도 칸을 같은 것으로 쓰는 건 손이 자리를 기억하기 때문이다. 네 화면을 오가며
 * 늘 오른쪽 끝 같은 높이를 누르던 손이, 여기서만 다른 것을 찾아야 할 까닭이 없다.
 */
export function InsightSideRail() {
  const view = useInsightPrefs((s) => s.view);
  const setView = useInsightPrefs((s) => s.setView);
  const roundPhase = useRoundPulse();
  const frameRef = useRef<HTMLDivElement>(null);
  useReserveToastInset(frameRef, SIDE_DOCK_RAIL_WIDTH);

  return (
    /*
     * 레일을 담는 틀 · 화면 높이를 다 쓰되 가로로는 본문과 같은 상한에 맞춰 가운데
     * 선다. 틀은 클릭을 받지 않는다 — 가운데가 비어 있는 투명한 판이라 그대로 두면
     * 본문 전체를 덮어 아무것도 안 눌린다.
     */
    <div
      ref={frameRef}
      className={cn(
        "pointer-events-none fixed inset-y-0 left-0 right-0 z-[45]",
        PAGE_SHELL_CLASS,
      )}
    >
      <nav
        aria-label="시세·통계 화면"
        className="pointer-events-auto absolute inset-y-0 right-0 flex w-14 flex-col items-center gap-1 border-l border-line-soft bg-canvas pt-2"
      >
        {/*
         * 회차 · 네 화면이 함께 쓰는 맨 윗칸 (`RoundRail`).
         *
         * 여기엔 열 패널이 없으니 보여 주기만 한다 — 지난 자료를 들여다보는 중에도
         * 「지금 판이 돌아가고 있다」 는 건 알아야 해서 자리를 비워 두지 않았다.
         * 손을 올리면 경매장에서 보던 그 시계 카드가 그대로 나온다.
         */}
        <RoundRail phase={roundPhase} />

        {VIEWS.map((v) => (
          <SideDockRailItem
            key={v.key}
            icon={v.icon}
            label={v.label}
            active={view === v.key}
            /* 보고 있는 칸을 다시 눌러도 그대로 둔다 · 화면은 늘 둘 중 하나여야 한다 */
            onClick={() => setView(v.key)}
          />
        ))}
        {/*
         * 명암 단추는 경매장·배송지시·경매내역과 같은 자리 · 레일 맨 아래에 선 하나로
         * 갈라 둔다. 위 둘은 보는 각도고 이것은 내 설정이라, 같은 줄기로 읽히면
         * 「경매통계 다음에 밝기」 가 된다.
         */}
        <div className="mt-auto flex flex-col items-center pt-2">
          <span className="mb-1 h-px w-5 bg-line" aria-hidden />
          <ThemeRailButton />
        </div>
      </nav>
    </div>
  );
}

/**
 * 본문 오른쪽 여백 · 레일 56 만큼.
 *
 * 패널이 없으니 늘 접힌 폭이다. 그래도 같은 셈(`sideDockShellClass`)을 쓰는 건
 * 네 화면의 본문 오른쪽 끝이 같은 자리에 서야 해서다.
 *
 * 최소 폭은 라우트 껍데기(`app/insight/layout.tsx`)가 잡아 둔 1280 에 레일 56 을
 * 얹는다 — 1280 은 이 페이지의 `viewport` 선언과 같은 값이다.
 */
export function insightShellClass() {
  return sideDockShellClass(false, {
    minClosed: "min-w-[1336px]",
    minOpen: "min-w-[1336px]",
  });
}
