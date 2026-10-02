"use client";

import { Suspense } from "react";
import { MarketInsightPageContent } from "@/features/market-insight/components/MarketInsightPageContent";

export default function InsightPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <MarketInsightPageContent />
    </Suspense>
  );
}
