"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";
import { usePriceFlash } from "../hooks/usePriceFlash";

/**
 * 사이드바 낙찰대금 caption · `PartSidebar` · `ListingSidebar` 공용.
 *
 * 레이아웃 · Full-width caption pattern (Bloomberg / 재무제표 표준):
 *   [낙찰대금 · label]                          [381.6만 · amount]
 *   ────────                                    ─────────
 *   왼쪽 (row 좌축 정렬)                        오른쪽 (row 우축 정렬)
 *   → row 의 양 끝 축과 완전 정렬 · empty space 자연 흡수
 *   → "붙어있음" / "떠있음" 두 문제 모두 해소
 *
 * 위계 (3-tier):
 *  - 라벨 "낙찰대금" · 10px slate-400 medium · subtle context provider
 *  - 금액 · 12px sky-700 bold · dominant scan target · tabular-nums
 *
 * ⚠ 정수 픽셀 값 (10 / 12) 만 사용 · 서브픽셀 렌더링 편차 방지
 *    → `부위별` / `개체별` 두 뷰 어떤 컨텍스트에서도 pixel-perfect identical
 *
 * 포맷 · compact notation · `maximumFractionDigits: 1` → "381.6만", "4.3억"
 *   (원 접미사 제거 · 만/억 로 컨텍스트 충분)
 *
 * 애니메이션 · `NumberFlow` 롤링 + `usePriceFlash` sky 900ms 펄스 (증가 시)
 *
 * caller 예시:
 *   <SettlementAmountLine amount={amount} className="mt-0.5" />
 *   `className` 으로 mt spacing 만 주입 · 나머지 정렬은 컴포넌트 내부에서 완결.
 *
 * 낙찰 없을 때 (`amount === 0`) `null` 반환.
 */
export function SettlementAmountLine({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  const flash = usePriceFlash(amount);

  if (!amount || amount <= 0) return null;

  return (
    <div
      className={cn(
        "flex items-baseline justify-between leading-none",
        flash === "up" && "flash-up",
        className,
      )}
    >
      <span className="text-[10px] font-medium tracking-wide text-slate-400">
        낙찰대금
      </span>
      <span className="text-[12px] font-bold tabular-nums -tracking-[0.02em] leading-none text-sky-700">
        <NumberFlow
          value={amount}
          locales="ko-KR"
          format={{
            notation: "compact",
            maximumFractionDigits: 1,
          }}
          willChange
        />
      </span>
    </div>
  );
}
