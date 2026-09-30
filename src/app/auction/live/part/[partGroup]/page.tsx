"use client";

import { Suspense, use } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { AuctionDetailRoom } from "@/features/live-auction/components/AuctionDetailRoom";
import { useSideDockInsetClass } from "@/features/live-auction/components/AuctionSideDock";
import { CANVAS_BG_CLASS } from "@/features/live-auction/constants/surface";
import { cn } from "@/lib/utils";

interface PartDetailPageProps {
  params: Promise<{ partGroup: string }>;
}

/**
 * `/auction/live/part/[partGroup]` · 부위축 상세.
 * 개체 페이지와 같은 화면에서 고정축만 뒤집는다 — 부위 하나를 세우고
 * 그 부위를 가진 개체들이 표의 행이 된다. 같은 부위끼리 견주며 입찰한다.
 */
export default function PartDetailPage({ params }: PartDetailPageProps) {
  const { partGroup } = use(params);
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
            axis={{ kind: "part", group: decodeURIComponent(partGroup) }}
          />
        </Suspense>
      </main>
    </div>
  );
}
