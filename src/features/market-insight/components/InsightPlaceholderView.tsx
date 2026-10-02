"use client";

import { cn } from "@/lib/utils";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";

export interface InsightPlaceholderViewProps {
  title: string;
  /** 여기에 무엇이 들어올 것인지 · 한 줄 */
  summary: string;
  /** 들어올 것들 · 레일에서 눌러 본 사람이 「여긴 뭐지」 로 끝나지 않게 */
  items: readonly string[];
}

/**
 * 아직 안 만든 화면 · 레일 칸만 먼저 선 자리.
 *
 * 「준비 중입니다」 한 줄로 끝내지 않는다. 레일에 칸이 보이면 누구나 한 번은
 * 눌러 보는데, 그때 아무것도 안 적혀 있으면 고장인지 비어 있는 건지 모른다.
 * 무엇이 들어올 것인지 적어 두면 그 한 번으로 끝나고, 쓰는 사람이 「그건 말고
 * 이게 필요하다」 를 말해 줄 수도 있다.
 */
export function InsightPlaceholderView({
  title,
  summary,
  items,
}: InsightPlaceholderViewProps) {
  return (
    <section className={cn("flex flex-col", SURFACE_SHELL_CLASS)}>
      <header className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5">
        <h2 className="text-[13px] font-bold text-content">{title}</h2>
        <span className="inline-flex h-5 items-center rounded-md bg-surface-accent px-1.5 text-[11px] font-medium text-content-faint">
          준비 중
        </span>
      </header>

      <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
        <p className="text-[13px] font-semibold text-content-soft">{summary}</p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item} className="text-[12px] text-content-faint">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
