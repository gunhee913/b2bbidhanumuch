"use client";

import { Suspense } from "react";
import { MarketInsightPageContent } from "@/features/market-insight/components/MarketInsightPageContent";

export default function InsightPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-[1240px] px-8 py-16">
            <div className="h-6 w-32 animate-pulse bg-slate-100" />
            <div className="mt-6 h-64 animate-pulse bg-slate-100" />
          </div>
        </div>
      }
    >
      <MarketInsightPageContent />
    </Suspense>
  );
}
