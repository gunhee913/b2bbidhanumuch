"use client";

import { Suspense } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { AuctionDetailRoom } from "@/features/live-auction/components/AuctionDetailRoom";
import { useAuctionShellClass } from "@/features/live-auction/components/AuctionSideDock";
import { CANVAS_BG_CLASS } from "@/features/live-auction/constants/surface";
import { cn } from "@/lib/utils";

/**
 * `/auction/live/favorites` · 관심축 상세.
 *
 * 개체·부위 페이지와 같은 화면인데 세워 둘 고정축이 없다 — 관심으로 찍어 둔 부위들이
 * 곧 표의 행이고, 그게 전부다. 개체 관심(접수번호로 찍은 것)은 여기 오지 않는다.
 * 고를 대상이 주소에 없으므로 동적 구간도 없다.
 */
export default function FavoritesDetailPage() {
  const auctionShellClass = useAuctionShellClass();

  return (
    <div className={cn("h-screen overflow-hidden", auctionShellClass)}>
      <MainHeader fluid />
      <main
        className={cn(
          "flex h-[calc(100vh-48px)] flex-col overflow-hidden",
          CANVAS_BG_CLASS,
        )}
      >
        <Suspense fallback={null}>
          <AuctionDetailRoom axis={{ kind: "favorite" }} />
        </Suspense>
      </main>
    </div>
  );
}
