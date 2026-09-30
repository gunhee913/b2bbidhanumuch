"use client";

import { use } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import { LiveAuctionRoom } from "@/features/live-auction/components/LiveAuctionRoom";
import { useSideDockInsetClass } from "@/features/live-auction/components/AuctionSideDock";

interface AuctionLiveDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * `/auction/live/[slug]` · 통합 뷰 (하위 호환 라우팅).
 *
 * Phase 1 이전에는 slug (음성/부천/고령/나주) 별로 공판장 뷰를 분리했지만,
 * 지금은 slug 를 무시하고 동일한 통합 뷰를 렌더링한다. 기존 즐겨찾기/딥링크가
 * 깨지지 않도록 라우트만 유지한다.
 */
export default function AuctionLiveDetailPage({
  params,
}: AuctionLiveDetailPageProps) {
  // slug 는 하위 호환을 위해 소비만 하고 사용하지 않는다.
  use(params);
  const sideDockInsetClass = useSideDockInsetClass();

  return (
    <div className={sideDockInsetClass}>
      <MainHeader fluid />
      <main className="min-h-[calc(100vh-48px)] bg-canvas pb-12">
        <LiveAuctionRoom />
      </main>
      <MainFooter fluid />
    </div>
  );
}
