"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FONT_CANDIDATES,
  type FontCandidate,
} from "@/features/design/constants";
import { TypeSpecimen } from "@/features/design/components/TypeSpecimen";

/**
 * 글꼴 견본 · 토스인베스트 벤치마킹용 내부 화면 (`/design/type`).
 *
 * 글꼴은 낱글자로는 못 고른다. 상장표처럼 숫자가 빽빽한 표 안에서 13px 로 깔려야
 * 자형 차이가 드러나므로, 실제 경매장 표와 같은 밀도·같은 값으로 두 글꼴을 나란히 세운다.
 *
 * 「토스 규칙」 토글은 글꼴과 별개인 변수를 가른다 — 자간 0 · 표 굵기 600 상한 ·
 * 숫자 tabular-nums. 지금 앱은 음수 자간 + bold 가 기본이라, 글꼴만 바꾸면
 * 무엇 때문에 달라 보이는지 알 수 없다.
 */
export default function TypeComparePage() {
  const [tossRules, setTossRules] = useState(true);
  const [dark, setDark] = useState(true);

  return (
    <main
      className={cn(
        "min-h-screen px-8 py-8",
        dark ? "bg-[#17171C] text-white" : "bg-[#f4f5f8] text-slate-900",
      )}
    >
      <header className="mx-auto mb-6 flex max-w-[1600px] items-end justify-between gap-6">
        <div>
          <h1 className="text-[20px] font-bold leading-none">글꼴 견본</h1>
          <p
            className={cn(
              "mt-2 text-[13px] font-medium",
              dark ? "text-white/45" : "text-slate-500",
            )}
          >
            토스인베스트는 Toss Product Sans · 자간 0 · 표 본문 13px/600 · 배경
            #17171C. 그 폰트는 토스 전용이라 쓸 수 없어 대체를 견준다.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SwitchChip
            label="토스 규칙"
            hint="자간 0 · 표 굵기 600 상한 · tabular-nums"
            on={tossRules}
            dark={dark}
            onClick={() => setTossRules((v) => !v)}
          />
          <SwitchChip
            label={dark ? "어두운 바탕" : "밝은 바탕"}
            on={dark}
            dark={dark}
            onClick={() => setDark((v) => !v)}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-5">
        {FONT_CANDIDATES.map((font) => (
          <TypeSpecimen
            key={font.id}
            font={font}
            tossRules={tossRules}
            dark={dark}
          />
        ))}
      </div>
    </main>
  );
}

function SwitchChip({
  label,
  hint,
  on,
  dark,
  onClick,
}: {
  label: string;
  hint?: string;
  on: boolean;
  dark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={hint}
      className={cn(
        "inline-flex h-9 items-center gap-2 px-3.5 text-[12.5px] font-semibold transition-colors",
        on
          ? dark
            ? "bg-white text-[#17171C]"
            : "bg-slate-900 text-white"
          : dark
            ? "bg-white/[0.08] text-white/55 hover:bg-white/[0.14]"
            : "bg-slate-200 text-slate-600 hover:bg-slate-300",
      )}
    >
      {label}
    </button>
  );
}

export type { FontCandidate };
