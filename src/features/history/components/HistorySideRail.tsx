"use client";

import { useRef, type ComponentType } from "react";
import { CalendarCheck, History, Rows3, type LucideProps } from "lucide-react";
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
import { useHistoryPrefs, type HistoryView } from "../hooks/useHistoryPrefs";

/**
 * 좁은 데서 넓은 데로 · 내가 건 것 → 내가 한 일 → 그날 나온 것 전부.
 *
 * 머리 메뉴의 「경매내역」 은 그대로 둔다. 거기서 이 페이지 전체를 부르는 이름과
 * 안에서 한 화면을 부르는 이름이 같으면, 레일에서 「경매내역」 을 눌러 놓고도
 * 경매내역에 들어와 있는 건지 아닌지가 안 읽힌다.
 */
const VIEWS: {
  key: HistoryView;
  label: string;
  icon: ComponentType<LucideProps>;
}[] = [
  { key: "history", label: "경매결과", icon: CalendarCheck },
  { key: "bids", label: "입찰내역", icon: History },
  { key: "sheet", label: "상장표", icon: Rows3 },
];

/**
 * 경매내역 사이드 레일 · 56px · 본문을 통째로 갈아 끼운다.
 *
 * 경매장·배송지시 레일과 같은 칸(`SideDockRailItem`)을 쓰지만 **하는 일이 다르다**.
 * 저 둘에서 레일은 304px 패널을 여는 손잡이고, 여기서는 화면을 고르는 손잡이다.
 * 경매내역도 상장표도 폭과 높이를 통째로 쓰려는 표라 304px 안에 들어가지 않는다 —
 * 패널에 욱여넣는 대신 본문을 내준다.
 *
 * 그래도 칸 생김새를 맞추는 건 손이 자리를 기억하기 때문이다. 세 화면을 오가며 늘
 * 오른쪽 끝 같은 높이를 누르던 손이, 여기서만 다른 것을 찾아야 할 까닭이 없다.
 */
export function HistorySideRail() {
  const view = useHistoryPrefs((s) => s.view);
  const setView = useHistoryPrefs((s) => s.setView);
  const roundPhase = useRoundPulse();
  const frameRef = useRef<HTMLDivElement>(null);
  useReserveToastInset(frameRef, SIDE_DOCK_RAIL_WIDTH);

  return (
    /*
     * 레일을 담는 틀 · 화면 높이를 다 쓰되 가로로는 본문과 같은 상한에 맞춰 가운데
     * 선다. 넓은 화면에서도 화면 끝이 아니라 본문 바로 옆에 남는다.
     *
     * 틀은 클릭을 받지 않는다 — 가운데가 비어 있는 투명한 판이라 그대로 두면 본문
     * 전체를 덮어 아무것도 안 눌린다.
     */
    <div
      ref={frameRef}
      className={cn(
        "pointer-events-none fixed inset-y-0 left-0 right-0 z-[45]",
        PAGE_SHELL_CLASS,
      )}
    >
      <nav
        aria-label="경매내역 화면"
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
            /* 보고 있는 칸을 다시 눌러도 그대로 둔다 · 화면은 늘 셋 중 하나여야 한다 */
            onClick={() => setView(v.key)}
          />
        ))}
        {/*
         * 명암 단추는 경매장·배송지시와 같은 자리 · 레일 맨 아래에 선 하나로 갈라 둔다
         * (`SideDockShell` 의 바닥 무리와 같은 값). 위 셋은 오늘의 자료고 이것은
         * 내 설정이라, 같은 줄기로 읽히면 「입찰내역 다음에 밝기」 가 된다.
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
 * 세 화면의 본문 오른쪽 끝이 같은 자리에 서야 해서다.
 *
 * 최소 폭은 본문이 늘 품어야 하는 폭에서 거꾸로 잡는다 — 왼쪽 열이 가장 좁을 때
 * (`SIDE_MIN_WIDTH` 320) + 눈금 8 + 표 판이 가장 좁을 때(`TABLE_MIN_WIDTH` 560)
 * + 바깥 여백 48 + 레일 56 = 992. 표가 다 보이는 폭(920)이 아니다 — 눈금을 끝까지
 * 밀어 둔 사람에게는 표가 제 판 안에서 가로로 미는 것이 맞다.
 */
export function historyShellClass() {
  return sideDockShellClass(false, {
    minClosed: "min-w-[992px]",
    minOpen: "min-w-[992px]",
  });
}
