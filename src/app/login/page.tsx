"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { EntryFlow } from "@/features/entry/components/EntryFlow";

/** 진입 2단계 · 중도매인 로그인 · `/main` 과 같은 컴포넌트 (URL 로 단계 결정) */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <EntryFlow />
    </Suspense>
  );
}
