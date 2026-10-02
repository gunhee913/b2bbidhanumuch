"use client";

import { Suspense } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
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
    /*
     * 한 화면 높이에 가두고 스크롤은 표 안에서만 돈다 (상세 방·배송지시와 같은 틀).
     *
     * 예전에는 창이 통째로 굴렀다. 그러면 막대가 화면 맨 오른쪽 끝 — 사이드 메뉴
     * 바깥 — 에 서서, 정작 구르는 표와 한 뼘 떨어진 자리에 있었다. 머리글과 필터는
     * `sticky` 로 붙들어 두었지만 그건 「굴러가는 것을 붙잡아 둔 것」 이라, 창을
     * 줄이면 붙는 자리를 다시 재야 했고 바닥글까지 표 아래에 딸려 다녔다.
     *
     * 구르는 것을 표로 좁히면 그 셋이 한꺼번에 없어진다 — 막대가 표 옆에 서고,
     * 필터·머리글은 스크롤 바깥에 있어 붙들 필요가 없다. 바닥글은 자리가 없어 뺐다.
     */
    <div className={cn("h-screen overflow-hidden", auctionShellClass)}>
      <MainHeader fluid />
      <main
        className={cn(
          "flex h-[calc(100vh-48px)] flex-col overflow-hidden",
          CANVAS_BG_CLASS,
        )}
      >
        <Suspense fallback={null}>
          <LiveAuctionRoom />
        </Suspense>
      </main>
    </div>
  );
}
