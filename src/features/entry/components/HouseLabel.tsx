"use client";

import { cn } from "@/lib/utils";
import { useCurrentHouse } from "../hooks/useCurrentHouse";

/**
 * 헤더 공판장 표기 · 「농협부분육경매 | 음성」
 * - 지금 들어와 있는 공판장을 전역 컨텍스트로 보여 준다 · 전환 기능은 두지 않는다(소속 공판장 고정)
 * - 칩 대신 가는 세로선 + 글자색 한 단계 낮춘 텍스트 · 헤더가 테두리·면 없이 색으로만 위계를
 *   가르므로, 여기만 회색 면이 떠 있으면 누를 수 있는 버튼처럼 읽힌다
 * - 공판장을 알 수 없으면(소속·URL·저장값 없음) 렌더하지 않는다
 */
export function HouseLabel({ className }: { className?: string }) {
  const { house } = useCurrentHouse();
  if (!house) return null;

  return (
    <span
      title={house.fullName}
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap",
        className,
      )}
    >
      <span aria-hidden className="h-3.5 w-px bg-line" />
      <span className="text-[14px] font-semibold leading-none text-content-soft">
        {house.key}
      </span>
    </span>
  );
}
