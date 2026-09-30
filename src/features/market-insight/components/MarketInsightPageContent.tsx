"use client";

import { useCallback, useState } from "react";
import { format, subDays } from "date-fns";
import { MainHeader } from "@/features/main/components/MainHeader";
import { MainFooter } from "@/features/main/components/MainFooter";
import { PeriodFilter } from "@/features/history/components/PeriodFilter";
import { MarketChartCard } from "./MarketChartCard";
import { MarketPartSummaryTable } from "./MarketPartSummaryTable";
import { MyAnalysisSection } from "./MyAnalysisSection";

const initialPeriod = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
  return { startDate: weekAgo, endDate: today };
};

/**
 * `/insight` 시세·동향 PC 페이지 본문.
 *
 * 레이아웃 (delivery 와 동일 톤):
 * 1. 상단 화이트 바 · `PeriodFilter` · 조회 프리셋 + 날짜 인풋 + 조회 버튼
 * 2. 본문 · `MarketChartCard` (부위 필터 내장) · `MarketPartSummaryTable`
 * 3. 하단 · `MyAnalysisSection` · 로그인 중도매인의 낙찰 분포 (같은 조회기간)
 *
 * 조회 기간은 draft(period) / applied(searchPeriod) 2단 상태 (delivery 패턴).
 * 프리셋 클릭 시 즉시 반영 · 직접 날짜 수정은 [조회] 버튼으로 커밋.
 */
export function MarketInsightPageContent() {
  const [period, setPeriod] = useState(initialPeriod);
  const [searchPeriod, setSearchPeriod] = useState(period);
  const [gradeFilter, setGradeFilter] = useState<string>("");

  const handleSearch = useCallback(() => {
    setSearchPeriod(period);
  }, [period]);

  return (
    <>
      <MainHeader />
      <main className="min-h-[calc(100vh-48px)] bg-canvas">
        <div className="border-b border-line bg-surface">
          <div className="mx-auto w-full max-w-[1360px] min-[1700px]:max-w-[1600px] px-8 pb-4 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <PeriodFilter
                startDate={period.startDate}
                endDate={period.endDate}
                onChange={setPeriod}
                onSearch={handleSearch}
                className="flex-1 min-w-[420px]"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1360px] min-[1700px]:max-w-[1600px] px-8 py-6">
          <div className="grid gap-4">
            <MarketChartCard />
            <MarketPartSummaryTable
              startDate={searchPeriod.startDate}
              endDate={searchPeriod.endDate}
              gradeFilter={gradeFilter}
              onChangeGradeFilter={setGradeFilter}
            />
            <MyAnalysisSection
              startDate={searchPeriod.startDate}
              endDate={searchPeriod.endDate}
            />
          </div>
        </div>
      </main>
      <MainFooter />
    </>
  );
}
