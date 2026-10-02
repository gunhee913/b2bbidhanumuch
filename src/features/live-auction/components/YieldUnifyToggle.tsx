"use client";

import { cn } from "@/lib/utils";

export interface YieldUnifyToggleProps {
  checked: boolean;
  onChange: (unified: boolean) => void;
  /** 켜졌을 때 한 줄 마커의 색 · 차트 주인공 선과 같은 색을 준다 */
  heroColor: string;
  /** 꺼졌을 때 세 줄 마커의 색 · 차트 보조선(크로스헤어)과 같은 색 */
  mutedColor: string;
  className?: string;
}

/**
 * 「육량등급 통합」 켜고 끄기 · 시세 차트와 부위별 시세 표가 **같은 하나**를 쥔다.
 *
 * 둘이 따로 놀면 표는 A·B·C 를 갈라 놓았는데 차트는 합쳐 그리는 일이 생긴다. 같은
 * 화면 좌우에서 한쪽은 1++A(9) 94,000원, 다른 쪽은 1++(9) 96,000원을 말하는 셈이라
 * 어느 쪽이 참인지 매번 확인해야 한다 — 견주라고 나란히 놓은 두 판인데.
 *
 * 생김새는 차트 범례 줄의 오버레이 토글에서 가져왔다. 마커(12×6) + 라벨이고 꺼지면
 * 옅어진다. 마커가 뜻을 그대로 그린다 — 꺼짐은 세 줄(A·B·C 따로), 켜짐은 한 줄.
 * 단추가 둘로 떨어져 있어도 같은 그림이면 같은 것으로 읽힌다.
 */
export function YieldUnifyToggle({
  checked,
  onChange,
  heroColor,
  mutedColor,
  className,
}: YieldUnifyToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
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
          <line
            x1="0"
            y1="3"
            x2="12"
            y2="3"
            stroke={heroColor}
            strokeWidth="2"
          />
        ) : (
          <>
            <line
              x1="0"
              y1="0.5"
              x2="12"
              y2="0.5"
              stroke={mutedColor}
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="3"
              x2="12"
              y2="3"
              stroke={mutedColor}
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="5.5"
              x2="12"
              y2="5.5"
              stroke={mutedColor}
              strokeWidth="1"
            />
          </>
        )}
      </svg>
      육량등급 통합
    </button>
  );
}
