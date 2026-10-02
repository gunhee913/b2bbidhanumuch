"use client";

import { Moon, Sun } from "lucide-react";
import { useBidStore } from "@/stores/bidStore";

/**
 * 명암 전환 · 레일 맨 아래.
 *
 * 경매장은 고기 사진 옆에서 색을 재는 화면이라 어두운 바탕을 쓰고 싶어 하는 사람과
 * 밝은 표를 쓰고 싶어 하는 사람이 갈린다. 취향이 아니라 작업 방식의 문제라 토글로 둔다.
 * 배송지시도 같은 사진을 보는 화면이니 같은 자리에 둔다 — 한 화면에서 어둡게 해 놓고
 * 다른 화면으로 넘어가 다시 찾아 눌러야 한다면 그게 더 이상하다.
 *
 * 상태는 `bidStore.isDarkMode` 한 곳에 있고 `DarkModeSync` 가 next-themes 로 흘려보낸다.
 */
export function ThemeRailButton() {
  const isDarkMode = useBidStore((s) => s.isDarkMode);
  const setIsDarkMode = useBidStore((s) => s.setIsDarkMode);
  const label = isDarkMode ? "밝은 화면으로" : "어두운 화면으로";

  return (
    <button
      type="button"
      onClick={() => setIsDarkMode(!isDarkMode)}
      aria-pressed={isDarkMode}
      aria-label={label}
      title={label}
      className="group mb-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-content-faint transition-colors hover:bg-surface-accent hover:text-content focus:outline-none focus-visible:bg-surface-accent focus-visible:text-content focus-visible:outline-none"
    >
      {isDarkMode ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
      )}
    </button>
  );
}
