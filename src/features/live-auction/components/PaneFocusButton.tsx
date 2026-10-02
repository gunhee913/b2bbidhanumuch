"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 전체보기 토글 · 쌓인 판들이 각자 제 머리 오른쪽에 하나씩 단다.
 *
 * 켠 판만 남고 나머지는 자리를 비우므로, 남은 판의 단추가 곧 되돌리기 단추가 된다.
 *
 * **세로만 건드린다.** 켜도 열 너비는 그대로다 — 눈금을 잡아 맞춘 폭은 그 사람 것이고,
 * 단추 하나가 그걸 덮어쓰면 「차트를 눌렀는데 표가 왜 줄지」 가 된다.
 *
 * 평소에는 면이 없고 글자색만 있다 · 손이 닿을 때와 켜져 있을 때만 면이 든다.
 * 바로 옆 `PaneGripHandle` 과 같은 규칙이라 둘이 한 벌로 읽힌다.
 *
 * `tone` 은 얹히는 바탕 · 사진은 먹색 위, 표와 차트는 카드 위라 같은 회색을 쓸 수 없다.
 */
export function PaneFocusButton({
  on,
  label,
  tone,
  onToggle,
  verb = "전체보기",
  className,
}: {
  on: boolean;
  label: string;
  tone: "dark" | "card";
  onToggle: () => void;
  /** 화면마다 부르는 낱말이 다르다 · 상세 방은 「크게 보기」, 분석·통계는 「전체보기」 */
  verb?: string;
  className?: string;
}) {
  const Icon = on ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? `${label} ${verb} 끄기` : `${label} ${verb}`}
      title={on ? "원래 크기로" : `${label}에 높이를 몰아준다`}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] transition-colors",
        tone === "dark"
          ? on
            ? "bg-white/15 text-white ring-1 ring-white/25"
            : "text-white/45 hover:bg-white/15 hover:text-white/85"
          : on
            ? "bg-surface text-content ring-1 ring-line"
            : "text-content-soft hover:bg-surface-strong hover:text-content",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
    </button>
  );
}
