"use client";

import { Save } from "lucide-react";
import { cn } from "@/lib/utils";

import type { DirtySummary } from "../lib/groupByEntity";

export interface SaveBarProps {
  dirtyCount: number;
  /** 저장 전 확인 문구 · `3두 6건 → 한우명가 4 · 삼성정육 2` */
  summary: DirtySummary;
  submitting: boolean;
  onSave: () => void;
  onReset: () => void;
  error?: string | null;
}

/**
 * 배송지시 상단에 dirty 변경분이 있을 때만 노출되는 sticky 저장 바.
 * 저장 전 "어디로 몇 건" 을 한 줄로 보여 확인 단계를 대신한다 · amber = 저장 전(카드 행 틴트와 동일).
 */
export function SaveBar({
  dirtyCount,
  summary,
  submitting,
  onSave,
  onReset,
  error,
}: SaveBarProps) {
  if (dirtyCount === 0 && !error) return null;
  return (
    <div className="sticky top-12 z-20 -mx-8 mb-3 border-b border-amber-200 bg-amber-50/95 px-8 py-2.5 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1360px] min-[1700px]:max-w-[1600px] items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px]">
          <span
            className={cn(
              "inline-flex h-5 min-w-[22px] items-center justify-center px-1.5 text-[11px] font-bold tabular-nums",
              "bg-amber-500 text-white",
            )}
          >
            {dirtyCount}
          </span>
          <span className="font-semibold tabular-nums text-content-mid">
            {summary.entityCount}두 {summary.partCount}건
          </span>
          {summary.byPartner.length > 0 ? (
            <>
              <span className="text-content-faint">→</span>
              <span className="tabular-nums text-content-mid">
                {summary.byPartner.map((b, i) => (
                  <span key={b.name}>
                    {i > 0 ? <span className="mx-1 text-content-ghost">·</span> : null}
                    <b className="font-bold text-content">{b.name}</b> {b.count}
                  </span>
                ))}
              </span>
            </>
          ) : null}
          {error ? (
            <span className="ml-2 font-semibold text-rose-700">{error}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={submitting || dirtyCount === 0}
            className="inline-flex h-8 items-center border border-line bg-surface px-3 text-[12px] font-semibold text-content-mid transition-colors hover:border-line hover:bg-surface-muted disabled:opacity-50"
          >
            되돌리기
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={submitting || dirtyCount === 0}
            className={cn(
              "inline-flex h-8 items-center gap-1 bg-sky-600 px-3 text-[12px] font-bold text-white transition-colors hover:bg-sky-700",
              (submitting || dirtyCount === 0) && "opacity-50",
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {submitting ? "저장 중..." : `${dirtyCount}건 저장`}
          </button>
        </div>
      </div>
    </div>
  );
}
