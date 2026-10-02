"use client";

import { Suspense } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { AuctionDetailRoom } from "@/features/live-auction/components/AuctionDetailRoom";
import { useAuctionShellClass } from "@/features/live-auction/components/AuctionSideDock";
import { CANVAS_BG_CLASS } from "@/features/live-auction/constants/surface";
import { cn } from "@/lib/utils";

/**
 * `/auction/live/bids` · 입찰축 상세.
 *
 * 관심 페이지와 같은 화면이고 모으는 기준만 다르다 — 오늘 내가 값을 넣은 부위들이 곧
 * 표의 행이다. 세워 둘 고정축이 없으니 동적 구간도 없다.
 *
 * 사이드 메뉴의 「내 입찰」 과 보는 것은 같지만 하는 일이 다르다. 저쪽은 304px 목록에서
 * 「얼마에 넣었더라」 를 확인하는 자리고, 여기는 넣은 값을 **고치는** 자리다 — 사진과
 * 시세 차트를 옆에 끼고 ↑↓ 로 줄을 옮기며 한 번에 다시 써 내려간다.
 */
export default function MyBidsDetailPage() {
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
          <AuctionDetailRoom axis={{ kind: "mybid" }} />
        </Suspense>
      </main>
    </div>
  );
}
