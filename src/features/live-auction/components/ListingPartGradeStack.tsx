"use client";

import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/tooltip";

/**
 * 상장정보 2줄 스택 · 윗줄 상장번호 · 아랫줄 `등급 · 부위 · 개월 · 업체`.
 *
 * 구매자는 [등급 → 부위 → 업체] 순으로 훑는다. 등급을 맨 왼쪽 앵커로 두어
 * 굵은 글자가 행마다 같은 자리에 오게 하고, 되풀이되는 업체명은 톤을 낮춰 묻히게 한다.
 *
 * 줄어드는 순서: 업체명(shrink-[3]) → 부위(shrink-1) → 등급(shrink-0 · 절대 안 줄어듦)
 */
export function ListingPartGradeStack({
  displayNo,
  companyName,
  partName,
  gradeLabel,
  monthAge,
  muted = false,
}: {
  displayNo: string;
  companyName: string;
  partName: string;
  gradeLabel: string;
  /** 개월령 · 업체명 왼쪽에 `32개월` 로 표시 · null/0 이면 생략 */
  monthAge?: number | null;
  /** 한 단계 흐리게 · 경매내역의 미낙찰 행처럼 "내 것이 아닌" 행 */
  muted?: boolean;
}) {
  const gradeColor = muted ? "text-content-mid" : "text-content";
  const partColor = muted ? "text-content-soft" : "text-content-mid";
  const companyColor = muted ? "text-content-faint" : "text-content-soft";
  const monthAgeLabel =
    monthAge != null && monthAge > 0 ? `${monthAge}개월` : null;

  return (
    <div className="flex min-w-0 flex-col leading-tight">
      <span className="whitespace-nowrap text-[11px] font-medium tabular-nums -tracking-[0.02em] text-content-soft">
        {displayNo}
      </span>
      <div className="mt-1 flex min-w-0 items-baseline gap-1">
        <span
          className={cn(
            "shrink-0 whitespace-nowrap text-[12.5px] font-semibold tabular-nums -tracking-[0.01em]",
            gradeColor,
          )}
        >
          {gradeLabel}
        </span>
        <span className="shrink-0 text-content-ghost" aria-hidden>
          ·
        </span>
        <TruncatedText
          value={partName}
          className={cn(
            "min-w-0 truncate text-[12.5px] font-medium -tracking-[0.01em]",
            partColor,
          )}
        />
        {monthAgeLabel ? (
          <>
            <span className="shrink-0 text-content-ghost" aria-hidden>
              ·
            </span>
            <span
              className={cn(
                "shrink-0 whitespace-nowrap text-[12.5px] font-medium tabular-nums -tracking-[0.01em]",
                companyColor,
              )}
            >
              {monthAgeLabel}
            </span>
          </>
        ) : null}
        {companyName ? (
          <>
            <span className="shrink-0 text-content-ghost" aria-hidden>
              ·
            </span>
            <TruncatedText
              value={companyName}
              className={cn(
                "min-w-0 shrink-[3] truncate text-[12.5px] font-medium -tracking-[0.01em]",
                companyColor,
              )}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
