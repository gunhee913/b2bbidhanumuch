"use client";

import { NoticeSection } from "@/features/main/components/NoticeSection";
import { RankingSection } from "@/features/main/components/RankingSection";

/**
 * 메인 페이지 하단 - 좌측 경매 랭킹 + 우측 공지사항 2컬럼 레이아웃.
 */
export function RankingNoticeSection() {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-[1240px] px-8">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
          <RankingSection />
          <NoticeSection />
        </div>
      </div>
    </section>
  );
}
