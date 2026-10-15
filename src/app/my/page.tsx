"use client";

import { Suspense } from "react";
import { MyPageContent } from "@/features/my-page/components/MyPageContent";

export default function MyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <MyPageContent />
    </Suspense>
  );
}
