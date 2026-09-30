"use client";

import { CircleCheck, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
const BID_TOAST_DURATION_MS = 6000;

export interface BidToastPayload {
  partId: string;
  /** 이전 입찰가 · 있으면 "변경" 으로 표기하고 before → after 를 보여준다 */
  previousPrice: number | null;
  price: number;
  listingPartNo: string;
  partName: string;
  gradeLabel: string;
  weightLabel: string;
  /** 낙찰 시 대금 (단가 × 중량) */
  totalAmount: number;
  onOpenMyBids?: () => void;
}

export interface BatchBidToastPayload {
  batchKey: string;
  /** 묶음 이름 · 접수번호(개체축) 또는 부위명(부위축) */
  label: string;
  okCount: number;
  failedCount: number;
  /** 성공한 부위의 낙찰 시 대금 합계 */
  totalAmount: number;
  onOpenMyBids?: () => void;
}

/**
 * 입찰 결과 토스트 · 영수증형 key-value.
 *
 *   ✓ 입찰 등록                              ✕
 *   ────────────────────────────────────────
 *   상장번호                  260917-104-06
 *   부위               부채 · 1++B(8) · 3.9kg
 *   입찰 단가                 111,000원/kg
 *   낙찰대금                     432,900원
 *   ────────────────────────────────────────
 *                                 내 입찰 보기
 *
 * 정보를 한 줄에 점(·)으로 이어 붙이면 폭에 따라 줄바꿈이 생겨 깔끔함이 깨진다.
 * 항목마다 한 행을 주고 라벨 좌 · 값 우로 정렬하면 높이는 늘지만 어느 폭에서도 같은 모양이고,
 * 송금 완료 화면처럼 "무엇을 얼마에" 가 위에서 아래로 한 번에 읽힌다.
 * 같은 부위 연속 입찰은 id 고정으로 쌓이지 않고 갱신.
 */
export function showBidToast(payload: BidToastPayload) {
  toast.custom((id) => <BidToast id={id} {...payload} />, {
    id: `bid-${payload.partId}`,
    duration: BID_TOAST_DURATION_MS,
  });
}

/**
 * 묶음 입찰 결과 · 단건과 같은 영수증 카드를 쓴다.
 *
 * 한 건이면 영수증, 여러 건이면 줄글 알림처럼 서로 다른 모양이면 같은 일(입찰을 넣었다)이
 * 두 가지 얼굴을 갖는다. 사용자는 결과를 읽기 전에 「무엇이 달라서 다르게 보이나」부터
 * 찾게 되고, 그 사이 정작 확인해야 할 금액이 뒤로 밀린다.
 */
export function showBatchBidToast({
  batchKey,
  label,
  okCount,
  failedCount,
  totalAmount,
  onOpenMyBids,
}: BatchBidToastPayload) {
  const partial = failedCount > 0;
  toast.custom(
    (id) => (
      <BidReceiptCard
        id={id}
        tone={partial ? "partial" : "done"}
        title={partial ? "입찰 일부 실패" : "입찰 등록"}
        note={partial ? "실패한 부위는 셀 아래 사유를 확인하세요" : null}
        onOpenMyBids={onOpenMyBids}
      >
        <ReceiptRow label="대상" value={label} />
        <ReceiptRow
          label={partial ? "완료" : "부위"}
          value={`${okCount}건`}
        />
        {partial ? (
          <ReceiptRow label="실패" value={`${failedCount}건`} />
        ) : null}
        <ReceiptRow
          label="낙찰대금"
          value={`${NUMBER_FORMATTER.format(totalAmount)}원`}
          emphasize
        />
      </BidReceiptCard>
    ),
    { id: `bid-batch-${batchKey}`, duration: BID_TOAST_DURATION_MS },
  );
}

function BidToast({
  id,
  previousPrice,
  price,
  listingPartNo,
  partName,
  gradeLabel,
  weightLabel,
  totalAmount,
  onOpenMyBids,
}: BidToastPayload & { id: string | number }) {
  const isChange = previousPrice !== null && previousPrice !== price;

  return (
    <BidReceiptCard
      id={id}
      tone="done"
      title={isChange ? "입찰 변경" : "입찰 등록"}
      note={null}
      onOpenMyBids={onOpenMyBids}
    >
      <ReceiptRow label="상장번호" value={listingPartNo} />
      <ReceiptRow
        label="부위"
        value={`${partName} · ${gradeLabel} · ${weightLabel}`}
      />
      <ReceiptRow
        label="입찰 단가"
        value={
          <>
            {isChange ? (
              <span className="mr-1 font-medium text-content-faint">
                {NUMBER_FORMATTER.format(previousPrice)} →
              </span>
            ) : null}
            {NUMBER_FORMATTER.format(price)}원/kg
          </>
        }
        emphasize
      />
      <ReceiptRow
        label="낙찰대금"
        value={`${NUMBER_FORMATTER.format(totalAmount)}원`}
        emphasize
      />
    </BidReceiptCard>
  );
}

/** 영수증 껍데기 · 단건·묶음이 같은 카드를 쓴다 (헤더 · 본문 행 · 선택 안내 · 액션) */
function BidReceiptCard({
  id,
  tone,
  title,
  note,
  onOpenMyBids,
  children,
}: {
  id: string | number;
  tone: "done" | "partial";
  title: string;
  note: string | null;
  onOpenMyBids?: () => void;
  children: React.ReactNode;
}) {
  const Icon = tone === "partial" ? TriangleAlert : CircleCheck;

  return (
    <div
      role="status"
      className="w-full overflow-hidden rounded-[10px] border border-line bg-surface font-pretendard shadow-[0_8px_28px_-6px_rgb(0_0_0/0.18),0_2px_8px_-4px_rgb(0_0_0/0.10)]"
    >
      {/* 헤더 · 상태 아이콘 + 제목 + 닫기 */}
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-3">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            tone === "partial" ? "text-amber-500" : "text-content",
          )}
          aria-hidden
        />
        <span className="flex-1 text-[13px] font-bold leading-none tracking-[-0.01em] text-content">
          {title}
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

      {/* 본문 · 라벨 좌 / 값 우 */}
      <dl className="border-t border-line-soft px-4 py-2.5">{children}</dl>

      {note ? (
        <p className="border-t border-line-soft px-4 py-2 text-[12px] leading-[18px] text-content-soft">
          {note}
        </p>
      ) : null}

      {/* 푸터 · 액션 우측 */}
      {onOpenMyBids ? (
        <div className="flex justify-end border-t border-line-soft px-4 py-2">
          <button
            type="button"
            onClick={() => {
              onOpenMyBids();
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

function ReceiptRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px]">
      <dt className="shrink-0 text-[12px] leading-[18px] text-content-soft">
        {label}
      </dt>
      <dd
        className={
          emphasize
            ? "truncate text-right text-[13px] font-bold leading-[18px] tabular-nums text-content"
            : "truncate text-right text-[12px] font-medium leading-[18px] tabular-nums text-content-mid"
        }
      >
        {value}
      </dd>
    </div>
  );
}
