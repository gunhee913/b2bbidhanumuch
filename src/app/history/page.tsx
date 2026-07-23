"use client";

import { Suspense } from "react";
import { HistoryPageContent } from "@/features/history/components/HistoryPageContent";

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HistoryPageContent />
    </Suspense>
  );
}
