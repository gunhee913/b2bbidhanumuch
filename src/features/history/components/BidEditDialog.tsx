"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyBidItem } from "@/features/bids/types";
import {
  formatWeightKg,
  formatWon,
  formatWonPerKg,
} from "@/features/live-auction/lib/masking";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";

const KRW = new Intl.NumberFormat("ko-KR");

export interface BidEditDialogProps {
  bid: MyBidItem;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 진행중 입찰 변경 다이얼로그.
 *
 * - prefill: 기존 입찰가
 * - 최저단가 미달 시 인라인 hint
 * - +100 / +1,000 / -100 / -1,000 프리셋
 * - `POST /api/bids` 로 upsert
 */
export function BidEditDialog({ bid, onClose, onSaved }: BidEditDialogProps) {
  const [priceText, setPriceText] = useState<string>(
    KRW.format(Math.round(bid.myBid)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const priceNumber = Number(priceText.replace(/[^0-9]/g, "")) || 0;
  const totalAmount = priceNumber > 0 ? Math.round(priceNumber * bid.weight) : 0;
  const isBelowMin = priceNumber > 0 && priceNumber < bid.minPrice;
  const isSameAsCurrent = priceNumber === Math.round(bid.myBid);
  const canSubmit =
    priceNumber > 0 && !isBelowMin && !isSameAsCurrent && !submitting;

  const setPrice = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) {
      setPriceText("");
      return;
    }
    setPriceText(KRW.format(Math.round(n)));
  };

  const adjust = (delta: number) => {
    setPrice((priceNumber || 0) + delta);
  };

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (!digits) {
      setPriceText("");
      return;
    }
    setPriceText(KRW.format(Number(digits)));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: bid.partId,
          dealerId: bid.dealerId,
          bidPrice: priceNumber,
          weight: bid.weight,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "입찰 변경에 실패했습니다.");
        return;
      }
      onSaved();
    } catch {
      setError("입찰 변경 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const gradeLabel = formatGradeLabel(bid.grade, bid.marblingScore);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] overflow-hidden rounded-lg bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line-soft px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-600">
              입찰 변경
            </div>
            <div className="mt-0.5 text-[15px] font-bold tabular-nums text-content">
              {bid.listingNo || bid.entityListingNo}
              <span className="mx-1.5 text-content-ghost">·</span>
              {bid.partName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-content-faint hover:bg-surface-accent hover:text-content-mid"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-3 gap-3 border-b border-line-soft px-5 py-3">
          <InfoCell label="등급" value={gradeLabel} />
          <InfoCell label="중량" value={formatWeightKg(bid.weight)} />
          <InfoCell
            label="최저단가"
            value={formatWonPerKg(bid.minPrice)}
          />
        </div>

        <div className="px-5 py-4">
          <label className="text-[11px] font-semibold text-content-soft">
            내 입찰가 (원/kg)
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={priceText}
              onChange={(e) => handleChange(e.target.value)}
              className={cn(
                "h-11 flex-1 rounded border bg-surface px-3 text-right text-[16px] font-bold tabular-nums outline-none focus:border-sky-500",
                isBelowMin
                  ? "border-amber-400 text-amber-700"
                  : "border-line text-content",
              )}
              maxLength={9}
              placeholder="0"
            />
            <span className="text-[12px] font-semibold text-content-soft">원</span>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[100, 1000, -100, -1000].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => adjust(d)}
                className="h-8 rounded border border-line bg-surface text-[11px] font-bold text-content-mid transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
              >
                {d > 0 ? `+${KRW.format(d)}` : `${KRW.format(d)}`}
              </button>
            ))}
          </div>

          {isBelowMin ? (
            <div className="mt-2 text-[11px] font-semibold text-amber-700">
              최저단가({formatWonPerKg(bid.minPrice)}) 이상 입력해 주세요.
            </div>
          ) : null}
          {isSameAsCurrent ? (
            <div className="mt-2 text-[11px] font-semibold text-content-soft">
              현재 입찰가와 동일합니다.
            </div>
          ) : null}

          <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-3">
            <span className="text-[12px] font-semibold text-content-soft">
              총 입찰금액
            </span>
            <span className="text-[16px] font-extrabold tabular-nums text-content">
              {formatWon(totalAmount)}
            </span>
          </div>
          <div className="mt-0.5 text-right text-[11px] text-content-faint">
            {priceNumber > 0 ? formatWonPerKg(priceNumber) : "-"} ×{" "}
            {formatWeightKg(bid.weight)}
          </div>

          {error ? (
            <div className="mt-3 border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center gap-2 border-t border-line-soft px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded border border-line bg-surface text-[13px] font-bold text-content-mid transition-colors hover:border-line hover:bg-surface-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "h-10 flex-[1.6] rounded bg-sky-600 text-[13px] font-bold text-white transition-colors hover:bg-sky-700",
              !canSubmit && "opacity-50",
            )}
          >
            {submitting ? "저장 중..." : "입찰 변경"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-content-faint">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-bold text-content">
        {value}
      </div>
    </div>
  );
}
