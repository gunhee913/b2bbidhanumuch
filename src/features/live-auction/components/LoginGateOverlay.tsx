"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, LogIn, X } from "lucide-react";

export interface LoginGateOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function LoginGateOverlay({ open, onClose }: LoginGateOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f12]/60 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-content-faint transition-colors hover:bg-surface-accent hover:text-content-mid"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-8 pt-9 pb-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted ring-1 ring-inset ring-line">
              <LogIn className="h-6 w-6 text-content" strokeWidth={2} />
            </div>
            <div className="space-y-1.5">
              <h2
                id="login-gate-title"
                className="text-[19px] font-bold tracking-tight text-content"
              >
                매참인 로그인이 필요합니다
              </h2>
              <p className="text-[13.5px] leading-relaxed text-content-soft">
                부분육 경매 입찰에 참여하시려면 승인된 매참인 계정으로
                로그인해주세요.
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-content-mid transition-colors hover:bg-surface-muted"
            >
              관전 계속하기
            </button>
            <Link
              href="/login"
              className="flex-[1.15] rounded-xl bg-inverse px-4 py-2.5 text-center text-lead font-semibold text-inverse-content shadow-sm transition-colors hover:bg-inverse"
            >
              로그인하기
            </Link>
          </div>
        </div>

        <Link
          href="/signup"
          className="group flex items-center justify-between border-t border-line-soft bg-surface-muted/60 px-8 py-3.5 text-[12.5px] transition-colors hover:bg-surface-accent/70"
        >
          <span className="text-content-soft">
            아직 매참인이 아니신가요?
            <span className="ml-1.5 font-semibold text-content">
              매참인 신청 안내
            </span>
          </span>
          <ArrowRight
            className="h-3.5 w-3.5 text-content-faint transition-transform group-hover:translate-x-0.5 group-hover:text-content-mid"
            strokeWidth={2.25}
          />
        </Link>
      </div>
    </div>
  );
}
