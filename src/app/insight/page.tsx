"use client";

import { Suspense } from "react";
import { MarketInsightPageContent } from "@/features/market-insight/components/MarketInsightPageContent";

export default function InsightPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-muted">
          <div className="mx-auto max-w-[1360px] min-[1700px]:max-w-[1600px] px-8 py-16">
            <div className="h-6 w-32 animate-pulse bg-surface-accent" />
            <div className="mt-6 h-64 animate-pulse bg-surface-accent" />
          </div>
        </div>
      }
    >
      <MarketInsightPageContent />
    </Suspense>
  );
}
