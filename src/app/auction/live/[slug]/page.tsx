"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import { LiveAuctionRoom } from "@/features/live-auction/components/LiveAuctionRoom";
import { isSlaughterHouseSlug } from "@/constants/slaughterHouseSlugs";

interface AuctionLiveDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function AuctionLiveDetailPage({
  params,
}: AuctionLiveDetailPageProps) {
  const { slug } = use(params);

  if (!isSlaughterHouseSlug(slug)) {
    notFound();
  }

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-64px)] bg-slate-50 pb-12">
        <LiveAuctionRoom slug={slug} />
      </main>
      <MainFooter />
    </>
  );
}
