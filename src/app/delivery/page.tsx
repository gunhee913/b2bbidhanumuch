"use client";

import { Suspense } from "react";
import { DeliveryPageContent } from "@/features/delivery/components/DeliveryPageContent";

export default function DeliveryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <DeliveryPageContent />
    </Suspense>
  );
}
