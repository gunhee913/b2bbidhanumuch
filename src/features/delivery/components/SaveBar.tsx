"use client";

import { Save } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SaveBarProps {
  dirtyCount: number;
  submitting: boolean;
  onSave: () => void;
  onReset: () => void;
  error?: string | null;
}

/**
 * 배송지시 테이블 상단에 dirty 변경분이 있을 때만 노출되는 sticky 저장 바.
 * 일괄 저장 UX 를 유지해 서버 부하와 UX 를 균형 잡는다.
 */
export function SaveBar({
  dirtyCount,
  submitting,
  onSave,
  onReset,
  error,
}: SaveBarProps) {
  if (dirtyCount === 0 && !error) return null;
  return (
    <div className="sticky top-[64px] z-20 -mx-8 mb-3 border-b border-sky-100 bg-sky-50/95 px-8 py-2.5 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px]">
          <span
            className={cn(
              "inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
              "bg-sky-600 text-white",
            )}
          >
            {dirtyCount}
          </span>
          <span className="font-semibold text-slate-700">
            건의 변경사항이 있습니다.
          </span>
          {error ? (
            <span className="ml-2 font-semibold text-rose-700">{error}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={submitting || dirtyCount === 0}
            className="inline-flex h-8 items-center rounded border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            되돌리기
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={submitting || dirtyCount === 0}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded bg-sky-600 px-3 text-[12px] font-bold text-white transition-colors hover:bg-sky-700",
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
