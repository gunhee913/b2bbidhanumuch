"use client";

import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import { LiveAuctionRoom } from "@/features/live-auction/components/LiveAuctionRoom";

/**
 * `/auction/live` · 통합 실시간 경매 뷰.
 *
 * Phase 1 이전에는 공판장 슬러그로 리다이렉트했으나,
 * 이제는 공판장 구분 없이 하나의 통합 뷰만 렌더링한다.
 */
export default function AuctionLivePage() {
  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-64px)] bg-slate-50 pb-12">
        <LiveAuctionRoom />
      </main>
      <MainFooter />
    </>
  );
}
