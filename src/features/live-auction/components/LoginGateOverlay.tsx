"use client";

import Link from "next/link";
import { LogIn, X } from "lucide-react";

export interface LoginGateOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function LoginGateOverlay({ open, onClose }: LoginGateOverlayProps) {
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
          <div className="bg-sky-100 p-3">
            <LogIn className="h-6 w-6 text-sky-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            로그인이 필요합니다
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            부분육 경매에 참여하시려면 중도매인 계정으로 로그인 해주세요.
            <br />
            경매장 관전은 로그인 없이도 자유롭게 이용 가능합니다.
          </p>
          <div className="mt-2 flex w-full gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              관전 계속
            </button>
            <Link
              href="/login"
              className="flex-1 bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
