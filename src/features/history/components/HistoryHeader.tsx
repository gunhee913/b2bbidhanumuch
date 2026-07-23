"use client";

import { cn } from "@/lib/utils";

export type HistoryTab = "history" | "analysis" | "partner";

export interface HistoryHeaderProps {
  activeTab: HistoryTab;
  onChangeTab: (tab: HistoryTab) => void;
}

const TABS: { key: HistoryTab; label: string; sub?: string }[] = [
  { key: "history", label: "경매내역" },
  { key: "analysis", label: "경매분석" },
  { key: "partner", label: "거래처분석" },
];

/**
 * 경매내역 페이지 상단 제목 + 3 탭 네비게이션.
 *
 * - 경매이력: 캘린더 뷰 + 일자별 상세
 * - 경매분석: KPI 대시보드 + 트렌드/부위/등급 차트
 * - 거래처분석: 낙찰 → 거래처 배정 기반 파트너 집계
 */
export function HistoryHeader({
  activeTab,
  onChangeTab,
}: HistoryHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-[1240px] px-8 pt-2">
        <nav className="flex items-center gap-1">
          {TABS.map((t) => (
            <TabButton
              key={t.key}
              active={activeTab === t.key}
              onClick={() => onChangeTab(t.key)}
              label={t.label}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex h-11 items-center px-4 text-[14px] font-bold transition-colors",
        active ? "text-slate-900" : "text-slate-400 hover:text-slate-600",
      )}
      aria-pressed={active}
    >
      {label}
      {active ? (
        <span
          className="absolute inset-x-0 -bottom-px h-[2px] bg-slate-900"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
