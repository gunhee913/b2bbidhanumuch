"use client";

import { Flag, X } from "lucide-react";
import { toast } from "sonner";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
const ROUND_CLOSE_TOAST_DURATION_MS = 10_000;

export interface RoundCloseToastPayload {
  roundId: string;
  roundNo: number;
  /** 이 회차에 내 입찰이 하나도 없으면 null · 비로그인/비딜러도 null */
  my: {
    bidCount: number;
    wonCount: number;
    lostCount: number;
    wonAmount: number;
  } | null;
  onOpenMyBids?: (roundId: string) => void;
}

/**
 * 회차 마감 결과 토스트 · 입찰 성공 토스트(`BidToast`)와 같은 영수증형.
 *
 *   ⚑ 2회차 종료                              ✕
 *   ────────────────────────────────────────
 *   내 입찰                         12건
 *   낙찰                              7건
 *   미낙찰                            5건
 *   낙찰대금                   3,412,000원
 *   ────────────────────────────────────────
 *                                 내 입찰 보기
 *
 * 내 입찰이 없으면 본문 한 줄("이 회차에 입찰한 부위가 없습니다") 로 짧게.
 * 회차당 id 고정 · 결과가 늦게 확정돼 두 번 호출돼도 갱신만 된다.
 */
export function showRoundCloseToast(payload: RoundCloseToastPayload) {
  toast.custom((id) => <RoundCloseToast id={id} {...payload} />, {
    id: `round-close-${payload.roundId}`,
    duration: ROUND_CLOSE_TOAST_DURATION_MS,
  });
}

function RoundCloseToast({
  id,
  roundId,
  roundNo,
  my,
  onOpenMyBids,
}: RoundCloseToastPayload & { id: string | number }) {
  return (
    <div
      role="status"
      className="w-full overflow-hidden rounded-[10px] border border-line bg-surface font-pretendard shadow-[0_8px_28px_-6px_rgb(0_0_0/0.18),0_2px_8px_-4px_rgb(0_0_0/0.10)]"
    >
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-3">
        <Flag className="h-4 w-4 shrink-0 text-content-mid" aria-hidden />
        <span className="flex-1 text-[13px] font-bold leading-none tracking-[-0.01em] text-content">
          {roundNo}회차 종료
        </span>
        <button
          type="button"
          aria-label="닫기"
          onClick={() => toast.dismiss(id)}
          className="-mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-content-faint transition-colors hover:bg-surface-accent hover:text-content-mid"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {my && my.bidCount > 0 ? (
        <dl className="border-t border-line-soft px-4 py-2.5">
          <Row label="내 입찰" value={`${my.bidCount}건`} />
          <Row
            label="낙찰"
            value={`${my.wonCount}건`}
            emphasize
            tone={my.wonCount > 0 ? "mine" : undefined}
          />
          <Row
            label="미낙찰"
            value={`${my.lostCount}건`}
            emphasize
            tone={my.lostCount > 0 ? "rose" : undefined}
          />
          <Row
            label="낙찰대금"
            value={`${NUMBER_FORMATTER.format(my.wonAmount)}원`}
            emphasize
          />
        </dl>
      ) : (
        <p className="border-t border-line-soft px-4 py-2.5 text-[12px] leading-[18px] text-content-soft">
          {my
            ? "이 회차에 입찰한 부위가 없습니다."
            : "낙찰 결과가 확정되었습니다."}
        </p>
      )}

      {onOpenMyBids && my ? (
        <div className="flex justify-end border-t border-line-soft px-4 py-2">
          <button
            type="button"
            onClick={() => {
              onOpenMyBids(roundId);
              toast.dismiss(id);
            }}
            className="text-[12px] font-semibold leading-none text-content underline decoration-slate-300 underline-offset-2 hover:decoration-ink"
          >
            내 입찰 보기
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  emphasize = false,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "mine" | "rose";
}) {
  const valueColor =
    tone === "mine"
      ? "text-content"
      : tone === "rose"
        ? "text-rose-600"
        : "text-content";
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px]">
      <dt className="shrink-0 text-[12px] leading-[18px] text-content-soft">
        {label}
      </dt>
      <dd
        className={
          emphasize
            ? `text-right text-[13px] font-bold leading-[18px] tabular-nums ${valueColor}`
            : "text-right text-[12px] font-medium leading-[18px] tabular-nums text-content-mid"
        }
      >
        {value}
      </dd>
    </div>
  );
}
