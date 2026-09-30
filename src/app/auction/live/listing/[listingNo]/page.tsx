"use client";

import { Suspense, use } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { AuctionDetailRoom } from "@/features/live-auction/components/AuctionDetailRoom";
import { useSideDockInsetClass } from "@/features/live-auction/components/AuctionSideDock";
import { CANVAS_BG_CLASS } from "@/features/live-auction/constants/surface";
import { cn } from "@/lib/utils";

interface ListingDetailPageProps {
  params: Promise<{ listingNo: string }>;
}

/**
 * `/auction/live/listing/[listingNo]` · 개체축 상세.
 * 상장표에서 행을 누르면 들어온다 · 사진 · 시세 · 부위별 입찰을 한 화면에.
 *
 * 입찰하는 화면이라 세로 스크롤을 두지 않는다 — 높이를 화면에 맞춰 잠그고
 * 넘치는 것은 각 열이 안에서 흘린다. 같은 이유로 푸터도 두지 않는다.
 */
export default function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { listingNo } = use(params);
  const sideDockInsetClass = useSideDockInsetClass();

  return (
    <div className={cn("h-screen overflow-hidden", sideDockInsetClass)}>
      <MainHeader fluid />
      <main
        className={cn(
          "flex h-[calc(100vh-48px)] flex-col overflow-hidden",
          CANVAS_BG_CLASS,
        )}
      >
        <Suspense fallback={null}>
          <AuctionDetailRoom
            axis={{ kind: "listing", listingNo: decodeURIComponent(listingNo) }}
          />
        </Suspense>
      </main>
    </div>
  );
}
