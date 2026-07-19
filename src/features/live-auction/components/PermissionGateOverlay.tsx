"use client";

import { Lock, X } from "lucide-react";

export interface PermissionGateOverlayProps {
  open: boolean;
  slaughterHouseName: string;
  onClose: () => void;
}

export function PermissionGateOverlay({
  open,
  slaughterHouseName,
  onClose,
}: PermissionGateOverlayProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[420px] bg-white p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-slate-400 hover:bg-slate-100"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-amber-100 p-3">
            <Lock className="h-6 w-6 text-amber-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            해당 공판장 권한이 없습니다
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">
              {slaughterHouseName}
            </span>
            에서 입찰하시려면 공판장별 매참인 자격이 필요합니다.
            <br />
            자세한 사항은 고객센터로 문의해 주세요.
          </p>
          <div className="mt-2 flex w-full gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              관전 계속
            </button>
            <a
              href="/support"
              className="flex-1 bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              고객센터 문의
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
