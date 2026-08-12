"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { usePriceFlash } from "../hooks/usePriceFlash";
import { CompactFilterPill } from "./CompactFilterPill";
import { SummaryStack } from "./SidebarSummaryStack";
import type { PartGroupEntry } from "../lib/partGrouping";
import type { ListingViewMode } from "./ListingSidebar";

const GRADE_OPTIONS = [
  "1++(9)",
  "1++(8)",
  "1++(7)",
  "1+",
  "1",
  "2",
  "3",
] as const;

/**
 * 그룹 낙찰 요약:
 *  - count  · 낙찰이 확정된 부위 개수 (`allBids` 에 rank 필드가 채워진 항목 존재)
 *  - amount · 낙찰(winning) 입찰가 × 중량 합계 (원)
 * `bidAmount` 이 서버에서 확정된 경우 우선 사용 (반올림 오차 방지).
 */
function computeSettlement(entry: PartGroupEntry): {
  count: number;
  amount: number;
} {
  let count = 0;
  let amount = 0;
  for (const item of entry.items) {
    if (item.part.allBids.some((b) => b.rank != null)) count += 1;
    const winningBid = item.part.allBids.find((b) => b.isWinning);
    if (winningBid) {
      amount +=
        winningBid.bidAmount ??
        (item.part.weight != null
          ? Math.round(winningBid.bidPrice * item.part.weight)
          : 0);
    }
  }
  return { count, amount };
}

/**
 * 그룹 라이브 활동 지표 계산:
 *  - bidCount    · 그룹 내 모든 부위의 총 입찰 액션 수 (부위별 bidCount 합계)
 *  - bidderCount · 그룹 내 unique 딜러 수 (allBids.dealerId 기준)
 * 두 값은 실시간 회차 중 tick up 하는 라이브 metric.
 */
function computeGroupActivity(entry: PartGroupEntry): {
  bidCount: number;
  bidderCount: number;
} {
  let bidCount = 0;
  const bidderIds = new Set<string>();
  for (const item of entry.items) {
    bidCount += item.part.bidCount;
    for (const b of item.part.allBids) {
      bidderIds.add(b.dealerId);
    }
  }
  return { bidCount, bidderCount: bidderIds.size };
}

const VIEW_MODE_TABS: { value: ListingViewMode; label: string }[] = [
  { value: "part", label: "부위별" },
  { value: "individual", label: "개체별" },
];

export interface PartSidebarProps {
  viewMode: ListingViewMode;
  onViewModeChange: (v: ListingViewMode) => void;
  groups: PartGroupEntry[];
  selectedGroup: string | null;
  onSelect: (group: string) => void;
  isLoading: boolean;
  totalPartCount: number;
  gradeFilter: string;
  companyFilter: string;
  onGradeChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  companyOptions: string[];
}

/**
 * 부위별 뷰의 좌측 사이드바.
 *
 * 구조 (위 → 아래):
 * 1. 뷰모드 탭 (개체별/부위별) — 개체별 사이드바와 공통 UX
 * 2. 필터 행 · 등급/업체 필터(좌) + 총·낙찰 요약 카운트(우)
 *    → 개체별 사이드바(`ListingSidebar`) 와 동일한 필터 · 요약 컨벤션
 * 3. 컬럼 헤더 · [부위 | 경매건수 | 낙찰건수]
 * 4. 부위 그룹 리스트 · 각 그룹의 카운트 · 낙찰건수
 *    (헤더의 컬럼과 세로 정렬되도록 동일 grid template)
 */
export function PartSidebar({
  viewMode,
  onViewModeChange,
  groups,
  selectedGroup,
  onSelect,
  isLoading,
  totalPartCount,
  gradeFilter,
  companyFilter,
  onGradeChange,
  onCompanyChange,
  companyOptions,
}: PartSidebarProps) {
  const settlementByGroup = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const g of groups) map.set(g.group, computeSettlement(g));
    return map;
  }, [groups]);

  const activityByGroup = useMemo(() => {
    const map = new Map<
      string,
      { bidCount: number; bidderCount: number }
    >();
    for (const g of groups) map.set(g.group, computeGroupActivity(g));
    return map;
  }, [groups]);

  const totalSettled = useMemo(() => {
    let sum = 0;
    for (const s of settlementByGroup.values()) sum += s.count;
    return sum;
  }, [settlementByGroup]);

  const hasActiveFilter = !!(gradeFilter || companyFilter);
  const resetFilters = () => {
    onGradeChange("");
    onCompanyChange("");
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden border border-slate-200 bg-white">
      {/* 뷰모드 탭 · 기본 slate-900 (심플·명료한 대비) */}
      <nav className="border-b border-slate-100 p-1">
        <ul className="flex items-stretch gap-0.5">
          {VIEW_MODE_TABS.map((tab) => (
            <li key={tab.value} className="flex-1">
              <button
                type="button"
                onClick={() => onViewModeChange(tab.value)}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-[1px] text-sm font-bold transition-colors",
                  viewMode === tab.value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/*
       * 필터(좌) + 요약(우 · 2-line) · `ListingSidebar` 와 동일 컨벤션
       *  Line 1 · [총 N건 · 낙찰 M건]  · 카운트 (11px bold)
       *  Line 2 · [낙찰대금 X.XX억원]  · hero number (13px bold sky · NumberFlow 롤링)
       * 낙찰이 0건일 때는 line 2 를 렌더링하지 않아 자연스러운 축소.
       */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CompactFilterPill
            value={gradeFilter}
            onChange={onGradeChange}
            label="등급"
            options={GRADE_OPTIONS}
          />
          <CompactFilterPill
            value={companyFilter}
            onChange={onCompanyChange}
            label="업체"
            options={companyOptions}
            className={cn(!companyOptions.length && "opacity-60")}
          />
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-0.5 inline-flex h-7 items-center px-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              title="필터 초기화"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        <SummaryStack
          totalCount={totalPartCount}
          settledCount={totalSettled}
        />
      </div>

      {/*
       * 컬럼 헤더 · 5-col · divider 없이 typography + position 만으로 그룹 분리.
       *   [부위 | 상장 | 낙찰 | 입찰 | 낙찰대금]
       *          └─ activity metrics ─┘   └ outcome ┘
       * 좌→우 스캔 flow · counts → live → 최종 금액 (Upbit 스타일 clean)
       * 컬럼 폭 24/26/32/50 · gap-x-1.5 · `ListingSidebar` 와 grid template 통일
       */}
      <div className="grid grid-cols-[minmax(0,1fr)_24px_26px_32px_50px] items-baseline gap-x-1.5 border-b border-slate-100 bg-slate-50/60 pl-4 pr-3 py-2">
        <span className="text-[10px] font-semibold text-slate-500">부위</span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          상장
        </span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          낙찰
        </span>
        <span className="text-right text-[10px] font-semibold text-sky-700">
          입찰
        </span>
        <span className="text-right text-[10px] font-semibold text-slate-500">
          낙찰대금
        </span>
      </div>

      {/*
       * 부위 그룹 리스트 · 심플 텍스트 톤 · divide-y 얇은 구분선.
       *
       * Row states (배경/텍스트 색만 · 뱃지/pill/dot 없음):
       *  - Default   · 흰 배경 · hover:slate-50
       *  - Selected  · bg-slate-100
       *  - 낙찰      · sky-700 (있을 때) / slate-300 (0)
       *  - 입찰      · NumberFlow rolling + flash-up · sky-700 bold (라이브)
       *  - 참여자    · slate-500 (있을 때) / slate-300 (0)
       */}
      <OverlayScroll className="flex-1" autoHide="leave">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            불러오는 중...
          </div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            {hasActiveFilter
              ? "필터에 해당하는 부위가 없습니다."
              : "오늘 상장된 부위가 없습니다."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {groups.map((g) => {
              const isActive = g.group === selectedGroup;
              const settlement = settlementByGroup.get(g.group) ?? {
                count: 0,
                amount: 0,
              };
              const activity = activityByGroup.get(g.group) ?? {
                bidCount: 0,
                bidderCount: 0,
              };
              return (
                <li key={g.group}>
                  <PartRow
                    name={g.group}
                    count={g.count}
                    settled={settlement.count}
                    settledAmount={settlement.amount}
                    bidCount={activity.bidCount}
                    isActive={isActive}
                    onClick={() => onSelect(g.group)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </OverlayScroll>
    </aside>
  );
}

/**
 * 부위 그룹 row · 5-col grid · 순수 텍스트 톤 (뱃지/pill/dot 없음).
 *
 * 컬럼 (헤더와 동일 template):
 *   [부위 | 상장 | 낙찰 | 입찰 || 낙찰대금]
 *          └── activity metrics ──┘  └ outcome ┘
 *
 * 라이브 애니메이션:
 *  - `NumberFlow` · 입찰 / 낙찰대금 rolling (Toss/거래소 감성)
 *  - `usePriceFlash` · 입찰 · 낙찰대금 증가 감지 → flash-up 900ms sky pulse
 *
 * 낙찰대금 포맷: compact notation · 1 decimal ("381.6만" · "1.2억")
 *   0원 → "—" 로 표시 (slate-300 muted · 명확한 no-data 시그널)
 *
 * 상태는 배경 (selected = bg-slate-100) 과 텍스트 색상으로만 표현.
 */
function PartRow({
  name,
  count,
  settled,
  settledAmount,
  bidCount,
  isActive,
  onClick,
}: {
  name: string;
  count: number;
  settled: number;
  settledAmount: number;
  bidCount: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const bidFlash = usePriceFlash(bidCount);
  const amountFlash = usePriceFlash(settledAmount);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        // `h-[52px]` fixed · `ListingRow` 와 정확히 동일한 pixel height (min-h 아님)
        // 컬럼 폭 24/26/32/50 · gap-x-1.5 · `ListingSidebar` 와 grid template 통일
        "grid h-[52px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_24px_26px_32px_50px] items-center gap-x-1.5 pl-4 pr-3 py-3 text-left transition-colors",
        isActive ? "bg-slate-100" : "hover:bg-slate-50",
      )}
    >
      {/* 부위명 · dominant (13px sky-700 bold · truncate · leading-none 명시) */}
      <span className="truncate text-[13px] font-bold leading-none -tracking-[0.01em] text-sky-700">
        {name}
      </span>

      {/* 상장 · static base count */}
      <span className="justify-self-end text-[11px] font-semibold text-slate-500 tabular-nums">
        {count}
      </span>

      {/* 낙찰 count · 값 있으면 sky-700 · 없으면 muted */}
      <span
        className={cn(
          "justify-self-end text-[11px] font-semibold tabular-nums",
          settled > 0 ? "text-sky-700" : "text-slate-300",
        )}
      >
        {settled}
      </span>

      {/*
       * 입찰 · 라이브 카운터 · activity 그룹 마지막 · divider 없음
       * NumberFlow rolling + flash-up on 증가 (누군가 입찰 시 sky pulse).
       */}
      <span
        className={cn(
          "justify-self-end text-[11px] font-bold tabular-nums",
          bidCount > 0 ? "text-sky-700" : "text-slate-300",
          bidFlash === "up" && "flash-up",
        )}
      >
        <NumberFlow value={bidCount} locales="ko-KR" willChange />
      </span>

      {/*
       * 낙찰대금 · 업비트 `거래대금` 스타일 · outcome 컬럼 · 최우측
       * 11px medium slate-600 · flash-up sky wash 900ms · subtle 낙찰 시그널
       * divider 없이 typography + position 으로 outcome 그룹 시각 분리
       */}
      <span
        className={cn(
          "justify-self-end text-[11px] font-medium tabular-nums",
          settledAmount > 0 ? "text-slate-600" : "text-slate-300",
          amountFlash === "up" && "flash-up",
        )}
      >
        {settledAmount > 0 ? (
          <NumberFlow
            value={settledAmount}
            locales="ko-KR"
            format={{ notation: "compact", maximumFractionDigits: 1 }}
            willChange
          />
        ) : (
          "—"
        )}
      </span>
    </button>
  );
}
