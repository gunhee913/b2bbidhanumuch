"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BulkBidResponse } from "../hooks/useBulkBid";
import { CompactFilterPill } from "./CompactFilterPill";

/**
 * 일괄입찰 우측 툴바.
 *
 * - 선택 요약 (선택수/전체 · 예상 총액) + 전체선택/해제
 * - 대상 필터 · 등급 / 육량 pill · 후보를 좁혀 자동 재선택
 * - 최저단가 대비 프리셋 (+1/+3/+5/+10%)
 * - 하단: 일괄 입찰 primary 버튼 (2단계 확인)
 *
 * 상태 관리(선택/편집/필터/mutation)는 부모(`LiveAuctionRoom`)가 담당하고
 * 이 컴포넌트는 순수 표현 + 확인 스텝 로컬 state 만 담당.
 */

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
const PLUS_PRESETS = [1, 10, 100, 1000] as const;

export const BULK_GRADE_OPTIONS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;

export const BULK_YIELD_OPTIONS = ["A", "B", "C"] as const;

export interface BulkBidPanelProps {
  /** 선택된 부위 수 */
  selectedCount: number;
  /** 편집 가능(미체결)한 전체 부위 수 */
  totalCandidates: number;
  /** 선택된 부위들의 중량 합계 (kg) */
  totalWeight: number;
  /** 선택된 부위들의 편집가 × 중량 합계 (원) */
  totalAmount: number;
  /** 실제 서버 제출 가능한 항목 수 (선택되고 가격이 입력된 것) */
  readyCount: number;
  /** 최저단가 + 절대금액 가산 · 예: 100 → 최저단가 +100원 */
  onApplyPlus: (delta: number) => void;
  /** 편집한 내 입찰가 전체 초기화 (선택 상태는 유지) */
  onResetPrices: () => void;
  /** 등급/육량 필터 노출 여부 · 개체별 뷰에서는 등급/육량이 모두 동일하므로 숨김 */
  showFilters?: boolean;
  /** 등급/육량 필터 · 부모(LiveAuctionRoom)에서 후보 좁히기 */
  gradeFilter: string;
  yieldFilter: string;
  onGradeChange: (v: string) => void;
  onYieldChange: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
  disabledReason?: string;
  /** 직전 요청 결과 · 성공/실패 카운트 배너로 노출 */
  lastResult?: BulkBidResponse | null;
  lastError?: Error | null;
  onDismissResult?: () => void;
}

export function BulkBidPanel({
  selectedCount,
  totalCandidates,
  totalWeight,
  totalAmount,
  readyCount,
  onApplyPlus,
  onResetPrices,
  showFilters = true,
  gradeFilter,
  yieldFilter,
  onGradeChange,
  onYieldChange,
  onSubmit,
  isSubmitting,
  disabled = false,
  disabledReason,
  lastResult,
  lastError,
  onDismissResult,
}: BulkBidPanelProps) {
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [plusInput, setPlusInput] = useState("");

  const submitDisabled = disabled || readyCount === 0 || isSubmitting;

  const handleApplyCustomPlus = () => {
    const n = parsePlusInput(plusInput);
    if (n == null) return;
    onApplyPlus(n);
  };

  /** 프리셋 버튼: 입력폼의 현재 값에 `delta` 를 누적. 왼쪽 테이블에는 반영 X. */
  const addToPlusInput = (delta: number) => {
    setPlusInput((prev) => {
      const current = parsePlusInput(prev) ?? 0;
      const next = current + delta;
      if (next <= 0) return "";
      return NUMBER_FORMATTER.format(next);
    });
  };

  const submitLabel = useMemo(() => {
    if (isSubmitting) return "처리 중...";
    if (readyCount === 0) return "가격 입력 후 진행하세요";
    return `일괄 입찰 (${readyCount}건)`;
  }, [isSubmitting, readyCount]);

  const handleRequestSubmit = () => {
    if (submitDisabled) return;
    setAwaitingConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setAwaitingConfirm(false);
    onSubmit();
  };

  const handleCancelConfirm = () => {
    setAwaitingConfirm(false);
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-[12px]">
      {/* 결과 배너 · 성공/실패 요약 */}
      {lastError ? (
        <ResultBanner
          tone="error"
          title="일괄 입찰 실패"
          message={lastError.message}
          onDismiss={onDismissResult}
        />
      ) : lastResult ? (
        <ResultBanner
          tone={lastResult.failed.length === 0 ? "success" : "warn"}
          title={
            lastResult.failed.length === 0
              ? `${lastResult.successful.length}건 일괄 입찰 완료`
              : `${lastResult.successful.length}건 성공 · ${lastResult.failed.length}건 실패`
          }
          message={summarizeFailures(lastResult.failed)}
          onDismiss={onDismissResult}
        />
      ) : null}

      {/* Section 1 · 선택 요약 */}
      <section className="rounded-md bg-slate-50 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-slate-500">선택</span>
          <span className="text-[13px] font-bold tabular-nums text-slate-900">
            <span className="text-sky-600">{selectedCount}</span>
            <span className="mx-0.5 text-slate-300">/</span>
            {totalCandidates}
            <span className="ml-0.5 text-[10px] font-medium text-slate-400">
              건
            </span>
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-slate-500">
            총 중량
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-slate-700">
            {totalWeight > 0
              ? `${totalWeight.toFixed(1)}`
              : "-"}
            <span className="ml-0.5 text-[10px] font-medium text-slate-400">
              kg
            </span>
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-slate-500">
            예상 총액
          </span>
          <span className="text-[13px] font-extrabold tabular-nums text-sky-700">
            {totalAmount > 0
              ? `${NUMBER_FORMATTER.format(totalAmount)}원`
              : "-"}
          </span>
        </div>
      </section>

      {/* Section 2 · 대상 필터 · 등급 / 육량 · 후보를 좁혀 자동 재선택 · 부위별 뷰에서만 노출 */}
      {showFilters ? (
        <section>
          <h4 className="mb-1.5 text-[11px] font-semibold text-slate-500">
            대상 필터
          </h4>
          <div className="flex flex-wrap gap-1.5">
            <CompactFilterPill
              value={gradeFilter}
              onChange={onGradeChange}
              label="등급"
              options={BULK_GRADE_OPTIONS}
            />
            <CompactFilterPill
              value={yieldFilter}
              onChange={onYieldChange}
              label="육량"
              options={BULK_YIELD_OPTIONS}
            />
          </div>
        </section>
      ) : null}

      {/* Section 3 · 최저단가 대비 (+원)
       *   프리셋 버튼(+1/+10/+100/+1,000)은 입력폼 값에 누적만 하고
       *   `적용` 버튼을 눌러야 실제로 왼쪽 테이블에 반영된다.
       *   구성: [입력폼 · 적용 · 초기화] · [+1] [+10] [+100] [+1,000]
       */}
      <section>
        <h4 className="mb-1.5 text-[11px] font-semibold text-slate-500">
          최저단가 대비 (+원)
        </h4>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[11px] font-bold text-slate-400">
              +
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={plusInput}
              onChange={(e) => setPlusInput(formatPlusInput(e.target.value))}
              onBlur={() => setPlusInput(formatPlusInput(plusInput))}
              placeholder="500"
              disabled={disabled || selectedCount === 0}
              className="h-8 w-full border border-slate-200 bg-white pl-5 pr-8 text-right text-[12px] font-semibold tabular-nums text-slate-900 outline-none placeholder:text-slate-300 focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] font-medium text-slate-400">
              원
            </span>
          </div>
          <button
            type="button"
            onClick={handleApplyCustomPlus}
            disabled={disabled || selectedCount === 0 || !plusInput.trim()}
            className="h-8 px-2.5 bg-slate-900 text-[11px] font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            적용
          </button>
          <button
            type="button"
            onClick={() => {
              onResetPrices();
              setPlusInput("");
            }}
            disabled={disabled || (readyCount === 0 && !plusInput.trim())}
            className="h-8 px-2.5 border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            title="입력폼 · 편집한 내 입찰가 초기화"
          >
            초기화
          </button>
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1">
          {PLUS_PRESETS.map((won) => (
            <button
              key={won}
              type="button"
              onClick={() => addToPlusInput(won)}
              disabled={disabled || selectedCount === 0}
              className="h-8 border border-slate-200 bg-white text-[11px] font-bold tabular-nums text-slate-700 hover:border-sky-400 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
              title={`입력폼에 +${NUMBER_FORMATTER.format(won)}원 누적`}
            >
              +{NUMBER_FORMATTER.format(won)}
            </button>
          ))}
        </div>
      </section>

      {/* Section 5 · Submit · 2단계 확인 방식 */}
      <div className="mt-1 border-t border-slate-100 pt-3">
        {disabled && disabledReason ? (
          <p className="mb-2 text-center text-[11px] font-semibold text-amber-600">
            {disabledReason}
          </p>
        ) : null}

        {awaitingConfirm ? (
          <div className="flex flex-col gap-2">
            <div className="border border-sky-200 bg-sky-50 p-2.5 text-[11px] leading-snug text-sky-900">
              <p className="font-bold">
                {readyCount}건을 아래 조건으로 입찰합니다.
              </p>
              <p className="mt-1 tabular-nums">
                예상 총액{" "}
                <span className="font-extrabold text-sky-700">
                  {NUMBER_FORMATTER.format(totalAmount)}원
                </span>
              </p>
              <p className="mt-0.5 text-sky-700/80">
                제출 후에는 낙찰 전까지 개별 수정만 가능합니다.
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={isSubmitting}
                className="flex-1 h-10 border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className={cn(
                  "flex-[1.4] h-10 text-[13px] font-bold transition-colors",
                  isSubmitting
                    ? "cursor-not-allowed bg-slate-200 text-slate-500"
                    : "bg-sky-600 text-white hover:bg-sky-700",
                )}
              >
                {isSubmitting ? "처리 중..." : `확인 · ${readyCount}건 입찰`}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRequestSubmit}
            disabled={submitDisabled}
            className={cn(
              "h-10 w-full text-[13px] font-bold transition-colors",
              submitDisabled
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-sky-600 text-white hover:bg-sky-700",
            )}
          >
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** 결과 배너 · 성공/실패/오류 3가지 톤 */
function ResultBanner({
  tone,
  title,
  message,
  onDismiss,
}: {
  tone: "success" | "warn" | "error";
  title: string;
  message?: string;
  onDismiss?: () => void;
}) {
  const styles = {
    success: {
      wrap: "border-sky-200 bg-sky-50 text-sky-800",
      icon: "text-sky-600",
      Icon: CheckCircle2,
    },
    warn: {
      wrap: "border-amber-200 bg-amber-50 text-amber-800",
      icon: "text-amber-600",
      Icon: AlertCircle,
    },
    error: {
      wrap: "border-rose-200 bg-rose-50 text-rose-800",
      icon: "text-rose-600",
      Icon: AlertCircle,
    },
  }[tone];

  const Icon = styles.Icon;

  return (
    <div
      className={cn(
        "relative flex items-start gap-2 border px-2.5 py-2 text-[11px]",
        styles.wrap,
      )}
      role="status"
    >
      <Icon className={cn("mt-px h-3.5 w-3.5 shrink-0", styles.icon)} />
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-tight">{title}</p>
        {message ? (
          <p className="mt-0.5 leading-snug opacity-80">{message}</p>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="닫기"
          className="ml-1 shrink-0 rounded-sm p-0.5 opacity-60 hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

const FAILURE_REASON_LABEL: Record<string, string> = {
  not_found: "부위 없음",
  not_included: "경매 대상 아님",
  invalid_status: "경매 상태 오류",
  no_open_round: "진행 중 회차 없음",
  closed: "회차 마감됨",
  below_min: "최저단가 미달",
  settled: "이미 낙찰됨",
  invalid: "요청 오류",
  db_error: "저장 실패",
};

/** 실패 사유별 카운트 요약 · 예: "최저단가 미달 2 · 회차 마감됨 1" */
function summarizeFailures(
  failed: BulkBidResponse["failed"],
): string | undefined {
  if (!failed.length) return undefined;
  const bucket = new Map<string, number>();
  for (const f of failed) {
    const label = FAILURE_REASON_LABEL[f.reason] ?? f.reason;
    bucket.set(label, (bucket.get(label) ?? 0) + 1);
  }
  return Array.from(bucket.entries())
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");
}

/**
 * 최저단가 대비 (+원) 입력 파싱.
 * "1,000" → 1000. 0 이하 · 실패 시 null.
 */
function parsePlusInput(raw: string): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 입력 중 콤마 자동 포맷. */
function formatPlusInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return NUMBER_FORMATTER.format(n);
}

