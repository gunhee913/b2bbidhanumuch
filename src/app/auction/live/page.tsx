"use client";

import { Suspense } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import { LiveAuctionRoom } from "@/features/live-auction/components/LiveAuctionRoom";
import { useAuctionShellClass } from "@/features/live-auction/components/AuctionSideDock";
import { CANVAS_BG_CLASS } from "@/features/live-auction/constants/surface";
import { cn } from "@/lib/utils";

/**
 * `/auction/live` · 통합 실시간 경매 뷰.
 *
 * Phase 1 이전에는 공판장 슬러그로 리다이렉트했으나,
 * 이제는 공판장 구분 없이 하나의 통합 뷰만 렌더링한다.
 *
 * `LiveAuctionRoom` 내부에서 `useSearchParams()` 를 사용하므로
 * Next.js 15 prerender 요구사항에 따라 `Suspense` 로 감싸야 한다.
 * (`missing-suspense-with-csr-bailout` 방지)
 */
export default function AuctionLivePage() {
  const auctionShellClass = useAuctionShellClass();
  return (
    <div className={auctionShellClass}>
      <MainHeader fluid />
      <main className={cn("min-h-[calc(100vh-48px)] pb-12", CANVAS_BG_CLASS)}>
        <Suspense fallback={null}>
          <LiveAuctionRoom />
        </Suspense>
      </main>
      <MainFooter fluid />
    </div>
  );
}
