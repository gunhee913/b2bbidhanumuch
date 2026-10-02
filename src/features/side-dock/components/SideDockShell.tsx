"use client";

import type { ComponentType, ReactNode } from "react";
import { ChevronsLeft, ChevronsRight, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { ShortcutTooltip } from "@/features/live-auction/components/ShortcutTooltip";
import { SideDockRailItem } from "./SideDockRailItem";

/** 레일 폭 · 늘 보인다 */
export const SIDE_DOCK_RAIL_WIDTH = 56;
/** 패널 폭 · 펴면 레일 왼쪽에 붙는다 */
export const SIDE_DOCK_PANEL_WIDTH = 304;

export interface SideDockTabDef<K extends string> {
  key: K;
  label: string;
  icon: ComponentType<LucideProps>;
  badge?: number;
  /**
   * 레일 바닥 무리로 내린다 · 오늘의 자료가 아니라 내 설정일 때.
   * (단축키 안내·테마처럼 「지금 일」 과 상관없는 것들)
   */
  footer?: boolean;
  /** 패널 안에 그릴 것 · 접혀 있어도 마운트는 유지된다 */
  render: () => ReactNode;
}

/**
 * 오른쪽 사이드 메뉴 껍데기 · 56px 아이콘 레일 + 304px 패널.
 *
 * 화면 높이를 다 쓰되 본문 위에 덮지 않는다 — 페이지 오른쪽 여백(`sideDockShellClass`)
 * 으로 자리를 비워 두고, 펼치면 그 여백이 넓어져 본문이 그만큼 좁아진다.
 *
 * **패널 내용은 접혀 있어도 계속 마운트해 둔다.** 탭을 오갈 때마다 찾아 둔 글자와
 * 펼쳐 둔 줄이 풀리면 메뉴가 「다시 처음부터」 가 되고, 받아 둔 자료도 버려진다.
 * 대신 접힌 동안은 `inert` 로 손과 읽어 주기에서 통째로 뺀다.
 *
 * 탭 목록만 받고 내용은 모른다. 경매장은 회차·관심·메모를, 배송지시는 거래처·숫자
 * 자리를 넣는데, 레일과 패널이 열리고 닫히는 짜임은 둘이 똑같다.
 */
export function SideDockShell<K extends string>({
  id,
  label,
  open,
  tab,
  tabs,
  onToggleTab,
  onSetOpen,
  railTop,
  railFooter,
  overlay,
}: {
  /** 패널 요소 id · 레일 단추의 `aria-controls` 가 가리킨다 */
  id: string;
  label: string;
  open: boolean;
  tab: K;
  tabs: SideDockTabDef<K>[];
  onToggleTab: (tab: K) => void;
  onSetOpen: (open: boolean) => void;
  /** 여닫이 단추 바로 아래 · 회차 칸처럼 모양이 다른 레일 칸 */
  railTop?: ReactNode;
  /** 레일 바닥 · 테마처럼 탭이 아닌 단추 */
  railFooter?: ReactNode;
  /** 레일 옆에 튀어나오는 카드 따위 · 접혀 있을 때만 뜨는 것들 */
  overlay?: ReactNode;
}) {
  const main = tabs.filter((t) => !t.footer);
  const footer = tabs.filter((t) => t.footer);

  return (
    /*
     * 도크를 담는 틀 · 화면 높이를 다 쓰되 가로로는 본문과 같은 상한(`PAGE_SHELL_CLASS`)에
     * 맞춰 가운데 선다. 안쪽 둘은 화면 끝이 아니라 이 틀의 오른쪽 끝에 붙으므로,
     * 넓은 화면에서도 본문 바로 옆에 남는다.
     *
     * 틀 자체는 클릭을 받지 않는다 — 가운데가 뻥 뚫린 투명한 판이라 그대로 두면
     * 본문 전체를 덮어 아무것도 눌리지 않는다. `overflow-hidden` 은 접힌 패널이
     * 밀려나 있는 자리(+360)를 잘라 낸다 — 없으면 펼칠 때 패널이 틀 바깥 여백에서
     * 떠서 날아 들어온다.
     */
    <div
      className={cn(
        "pointer-events-none fixed inset-y-0 left-0 right-0 z-[45] overflow-hidden",
        PAGE_SHELL_CLASS,
      )}
    >
      <aside
        id={id}
        aria-label={label}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "pointer-events-auto absolute inset-y-0 right-14 z-0 flex w-[304px] flex-col border-l border-line-soft bg-canvas transition-[transform,visibility] duration-200 ease-out",
          open ? "visible translate-x-0" : "invisible translate-x-[360px]",
        )}
      >
        {/*
         * 구르는 일은 패널 **안쪽**이 맡는다 · 여기서 통째로 감싸면 머리줄까지 같이
         * 흘러가 「무엇을 보는 칸인지」 가 사라진다. 경매장 패널들이 쓰는 짜임 그대로다.
         */}
        {tabs.map((t) => (
          <div
            key={t.key}
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              tab !== t.key && "hidden",
            )}
          >
            {t.render()}
          </div>
        ))}
      </aside>

      <nav
        aria-label={label}
        className={cn(
          "pointer-events-auto absolute inset-y-0 right-0 z-10 flex w-14 flex-col items-center gap-1 bg-canvas",
          !open && "border-l border-line-soft",
        )}
      >
        <ShortcutTooltip label={open ? "접기" : "펼치기"} side="left">
          <button
            type="button"
            onClick={() => onSetOpen(!open)}
            aria-expanded={open}
            aria-controls={id}
            aria-label={open ? `${label} 접기` : `${label} 펼치기`}
            className="my-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-faint transition-colors hover:bg-surface-accent hover:text-content focus:outline-none focus-visible:bg-surface-accent focus-visible:text-content focus-visible:outline-none"
          >
            {open ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </ShortcutTooltip>

        {railTop}

        {main.map((t) => (
          <SideDockRailItem
            key={t.key}
            icon={t.icon}
            label={t.label}
            badge={t.badge}
            active={open && tab === t.key}
            onClick={() => onToggleTab(t.key)}
          />
        ))}

        {/*
         * 아래 무리는 오늘의 자료가 아니라 내 설정이다 · 사이 선 하나로 갈라 둔다.
         * `mt-auto` 를 이 무리 머리에 걸어야 함께 바닥에 붙는다 — 마지막 칸에 걸면
         * 그것만 내려가고 앞 칸은 위 목록 꼬리에 남는다.
         */}
        <div className="mt-auto flex flex-col items-center gap-1 pt-2">
          <span className="mb-1 h-px w-5 bg-line" aria-hidden />
          {footer.map((t) => (
            <SideDockRailItem
              key={t.key}
              icon={t.icon}
              label={t.label}
              active={open && tab === t.key}
              onClick={() => onToggleTab(t.key)}
            />
          ))}
          {railFooter}
        </div>
      </nav>

      {overlay}
    </div>
  );
}

/**
 * 본문 오른쪽 여백 · 레일(56)은 늘 비워 두고, 패널이 펴져 있으면 패널(304)만큼 더 비운다.
 * 페이지 껍데기(header + main + footer)에 붙여야 헤더까지 함께 물러난다.
 *
 * 본문은 이 틀 안에서 **왼쪽에 붙어 있다**. 그래서 도크를 여닫으면 본문이 오른쪽에서
 * 줄었다 늘 뿐, 통째로 옆으로 미끄러지지 않는다 — 표를 읽는 중에 가로로 밀리는 것이
 * 폭이 조금 줄어드는 것보다 훨씬 거슬린다.
 *
 * 여백만큼 최소 폭도 같이 키운다. 여백을 본문에서 깎으면 표 오른쪽 끝이 도크 밑으로
 * 밀려 잘린다 — 모자라면 본문을 줄이는 대신 페이지를 가로로 넘긴다.
 */
export function sideDockShellClass(
  open: boolean,
  { minClosed, minOpen }: { minClosed: string; minOpen: string },
) {
  return cn(
    PAGE_SHELL_CLASS,
    "transition-[padding] duration-200 ease-out",
    open ? `${minOpen} pr-[360px]` : `${minClosed} pr-14`,
  );
}
