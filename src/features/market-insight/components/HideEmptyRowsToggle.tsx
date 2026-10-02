"use client";

import { cn } from "@/lib/utils";

/**
 * 「낙찰 없음 숨김」 · 값이 없는 등급 줄을 걷어낸다.
 *
 * 바로 왼쪽 「육량등급 통합」 과 한 벌로 읽혀야 해서 같은 문법을 쓴다 — 높이 24,
 * 10.5px, 마커(12×6) + 글자, 꺼지면 옅게. 둘 다 **표의 생김새**를 바꾸는 단추라
 * (무엇을 보느냐가 아니라 어떻게 보느냐) 나란히 서는 것이 맞다.
 *
 * 마커가 뜻을 그대로 그린다 · 꺼짐은 찬 줄과 빈 줄이 번갈아 선 모양, 켜짐은 찬 줄만
 * 모인 모양. 숨긴 줄 수를 옆에 적어 「왜 줄이 줄었지」 를 되묻지 않게 한다.
 */
export function HideEmptyRowsToggle({
  checked,
  onChange,
  hiddenCount,
  heroColor,
  mutedColor,
  className,
}: {
  checked: boolean;
  onChange: (hide: boolean) => void;
  /** 감췄거나 감출 수 있는 줄 수 */
  hiddenCount: number;
  heroColor: string;
  mutedColor: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      title="이번 기간에 낙찰이 없던 등급 줄을 걷어낸다"
      className={cn(
        "inline-flex h-6 shrink-0 select-none items-center gap-1 rounded px-1.5 text-[10.5px] font-semibold tracking-tight transition-colors hover:bg-surface-accent",
        checked ? "text-content" : "text-content-faint",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 12 6"
        width={12}
        height={6}
        className="shrink-0"
      >
        {checked ? (
          /* 찬 줄만 · 위아래로 붙어 있다 */
          <>
            <rect x="0" y="0.5" width="12" height="2" fill={heroColor} />
            <rect x="0" y="3.5" width="12" height="2" fill={heroColor} />
          </>
        ) : (
          /* 찬 줄과 빈 줄이 번갈아 · 빈 줄은 테두리만 */
          <>
            <rect x="0" y="0" width="12" height="1.6" fill={mutedColor} />
            <rect
              x="0.4"
              y="2.4"
              width="11.2"
              height="1.2"
              fill="none"
              stroke={mutedColor}
              strokeWidth="0.8"
            />
            <rect x="0" y="4.4" width="12" height="1.6" fill={mutedColor} />
          </>
        )}
      </svg>
      낙찰 없음 숨김
      {hiddenCount > 0 ? (
        <span className="tabular-nums text-content-ghost">{hiddenCount}</span>
      ) : null}
    </button>
  );
}
