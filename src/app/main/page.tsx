"use client";

import { MainHeader } from "@/features/main/components/MainHeader";
import { HeroSection } from "@/features/main/components/HeroSection";
import { LiveAuctionSection } from "@/features/main/components/LiveAuctionSection";
import { AuctionCalendarSection } from "@/features/main/components/AuctionCalendarSection";
import { RankingNoticeSection } from "@/features/main/components/RankingNoticeSection";
import { AppDownloadBanner } from "@/features/main/components/AppDownloadBanner";
import { MainFooter } from "@/features/main/components/MainFooter";
import { ScrollToTopButton } from "@/features/main/components/ScrollToTopButton";

export default function MainPage() {
  return (
    <>
      <MainHeader />
      <main>
        <HeroSection />
        <LiveAuctionSection />
        <AuctionCalendarSection />
        <RankingNoticeSection />
        <AppDownloadBanner />
      </main>
      <MainFooter />
      <ScrollToTopButton />
    </>
  );
}
