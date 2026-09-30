"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { EntryFlow } from "@/features/entry/components/EntryFlow";

/** 진입 1단계 · 공판장 선택 → (같은 화면에서) `/login?house=` → `/auction/live?house=` */
export default function MainPage() {
  return (
    <Suspense fallback={<EntryFallback />}>
      <EntryFlow />
    </Suspense>
  );
}

function EntryFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Loader2 className="h-8 w-8 animate-spin text-content-faint" />
    </div>
  );
}
