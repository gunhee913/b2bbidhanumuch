"use client";

import { cn } from "@/lib/utils";

/** 글자 높이 → 글자 크기 · SVG 로 굽던 시절의 `height` 감각을 그대로 쓰려고 둔다 */
const SIZE_RATIO = 1.12;

/**
 * 「농협부분육경매」 워드마크.
 *
 * 예전엔 Pretendard 아웃라인을 SVG 패스로 구워 뒀지만, 글자를 바꾸려면 매번 다시 구워야 해
 * 본문과 같은 글꼴을 쓰는 텍스트로 되돌렸다. 글꼴을 갈아끼우면 워드마크도 따라온다.
 *
 * - 굵기 700 · 자간 -0.03em · 800 은 어두운 바탕에서 흰 획이 번져 한글 속공간이 막힌다.
 *   옆 메뉴(600)보다 한 단계만 무겁게 둬서 로고가 헤더를 짓누르지 않게 한다
 * - `currentColor` → 부모 글자색을 그대로 (헤더·푸터 먹색, 어두운 바탕 흰색)
 */
export function Wordmark({
  height = 14,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="농협부분육경매"
      className={cn(
        "shrink-0 select-none whitespace-nowrap font-bold leading-none",
        className,
      )}
      style={{
        fontSize: Math.round(height * SIZE_RATIO),
        letterSpacing: "-0.03em",
      }}
    >
      농협부분육경매
    </span>
  );
}
