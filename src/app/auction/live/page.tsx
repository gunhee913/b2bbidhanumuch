"use client";

import { Suspense } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import { LiveAuctionRoom } from "@/features/live-auction/components/LiveAuctionRoom";

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
  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-64px)] bg-slate-50 pb-12">
        <Suspense fallback={null}>
          <LiveAuctionRoom />
        </Suspense>
      </main>
      <MainFooter />
    </>
  );
}
