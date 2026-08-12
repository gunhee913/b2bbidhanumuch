"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBidHistory } from "../hooks/useBidHistory";
import type { BidHistoryEntry } from "../api";

export interface BidHistoryPanelProps {
  /** 부위 id · null 이면 empty state */
  partId: string | null;
  /**
   * 진행 중 회차 여부. true 면 3초 refetch,
   * false 면 stale 유지 (마감 후 기록 열람 목적)
   */
  isLive?: boolean;
}

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

/**
 * 부위별 입찰내역 · `PartDetailPanel` 의 "입찰내역" 탭 콘텐츠.
 *
 * 구성 (위 → 아래):
 *   1. Stats bar  · 총 입찰수 · 총 입찰자 · 최근 입찰 (3-column typography)
 *   2. Current top · 현재 최고가 큰 숫자 + 시각 (flat · sky 톤)
 *   3. Timeline    · 최신순 · 시각 / 입찰자 라벨 / 가격 / 상태 뱃지
 *   4. Footer      · 익명 라벨 정책 안내
 *
 * 도메인 용어: "딜러" 대신 "입찰자" 사용 (앱 전체 표준).
 * 마스킹 정책: 서버 (`/api/bids/part/[partId]/history`) 에서 처리.
 */
export function BidHistoryPanel({
  partId,
  isLive = true,
}: BidHistoryPanelProps) {
  const query = useBidHistory(partId, { isLive });
  const data = query.data;

  if (!partId) {
    return (
      <div className="flex h-40 items-center justify-center text-[12px] text-slate-400">
        부위를 선택해 주세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/*
       * Stats bar · 2-column · [총 입찰자 · 총 입찰수].
       *
       * "최근 입찰" 시각은 바로 아래 timeline 첫 행의 시각과 100% 중복 →
       * 데이터-잉크 비율 우선으로 제거. 남은 두 지표는 서로 다른 축을 짚음:
       *   - 총 입찰자 · 참여 폭 (breadth)
       *   - 총 입찰수 · 활동 강도 (depth)
       */}
      {data ? (
        <div className="grid grid-cols-2 border-b border-slate-200">
          <StatCell
            label="총 입찰자"
            value={NUMBER_FORMATTER.format(data.stats.totalDealers)}
            unit="명"
          />
          <StatCell
            label="총 입찰수"
            value={NUMBER_FORMATTER.format(data.stats.totalBids)}
            unit="회"
          />
        </div>
      ) : null}

      {/*
       * 현재 최고가 요약 카드는 렌더하지 않음.
       * - 메인 BidPanel PriceTileRow 의 "현재 최고가" tile 과 중복
       * - 왼쪽 테이블 상단 행의 현재가 컬럼과도 중복
       * - Timeline 첫 행에 [최고] 뱃지 + 가격이 이미 존재
       * → 정보 밀도 유지 · 스캔 리듬 방해 최소화.
       */}

      {/*
       * Timeline 영역 · 고정 높이 (TIMELINE_HEIGHT) + 내부 스크롤.
       *
       * 배경:
       *   이전엔 입찰수에 비례해 높이가 늘어나 layout이 요동. 4건이면 짧고
       *   30건이면 부모 스크롤까지 유발. 예측 가능한 UI 를 위해 고정.
       *
       * 스펙:
       *   - 컨테이너 · h-[380px] · loading/error/empty 도 동일 높이 (layout stable)
       *   - 스크롤   · `scrollbar-thin` (앱 표준 · PartDetailPanel 과 동일 클래스)
       *   - 헤더     · sticky top-0 · 스크롤 중에도 컬럼 라벨 유지
       *
       * 높이 산정:
       *   row ≈ 36px · 헤더 32px → 380px 로 약 9-10 행 노출 · 이후 스크롤.
       */}
      <div className="scrollbar-thin h-[380px] overflow-y-auto bg-white">
        {query.isLoading && !data ? (
          <div className="flex h-full items-center justify-center text-[12px] text-slate-400">
            불러오는 중...
          </div>
        ) : query.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[12px] text-slate-500">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            입찰내역을 불러올 수 없습니다.
          </div>
        ) : !data || data.history.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-slate-400">
            아직 입찰이 없습니다.
          </div>
        ) : (
          <>
            {/*
             * 테이블 헤더 · 왼쪽 PartListingTable 헤더와 스펙 통일 + sticky.
             *
             * 스펙 (PartListingTable thead 미러):
             *  bg-slate-50 + text-[11px] font-semibold -tracking-[0.01em] text-slate-500
             *  border-b border-slate-200 + py-2 + px-3
             *
             * `sticky top-0 z-10` · 스크롤 시 컬럼 라벨 상단 고정.
             * 컬럼 폭은 아래 TimelineRow 와 정확히 매칭 (w-[64px] · flex-1 · min-w-[80px]).
             */}
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold -tracking-[0.01em] text-slate-500">
              <span className="w-[64px] shrink-0">입찰시간</span>
              <span className="flex-1">거래인</span>
              <span className="min-w-[80px] text-right">입찰가격</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.history.map((entry) => (
                <TimelineRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </>
        )}
      </div>

      {/*
       * Footer legend 제거 · "단위 : 원/kg" 은 가운데 메인 테이블(BidPanel PriceTileRow)
       * 에 이미 명시되어 있어 여기서도 반복하면 노이즈. 데이터-잉크 비율 우선.
       */}
    </div>
  );
}

/**
 * Stats bar 셀 · BidPanel PriceTile 과 시각 언어 통일.
 *
 * 구조: [라벨 uppercase 9.5px] [값 15px bold] [단위 9.5px]
 * - 배경 · white
 * - border-r 로 셀 구분 (마지막 셀은 last:border-r-0)
 */
function StatCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 border-r border-slate-200 bg-white px-2 py-2.5 last:border-r-0">
      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[15px] font-bold tabular-nums leading-none text-slate-900">
          {value}
        </span>
        {unit ? (
          <span className="text-[9.5px] font-semibold text-slate-400">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 타임라인 각 항목 · 최신순 표시 · 왼쪽 PartListingTable row 스펙과 통일.
 *
 * 스펙:
 *   - 컨테이너 · px-3 py-2 · text-xs (12px) · 왼쪽 테이블과 동일
 *   - 시각      · text-slate-500 tabular-nums (monospace 폰트 제거 · 앱 표준화)
 *   - 거래인    · font-semibold · sky-700 (mine) / slate-800 (default)
 *   - 가격      · font-bold tabular-nums · 색상 동일 규칙
 *
 * 컬럼 폭 · 헤더와 정확히 매칭:
 *   [w-[64px]] [flex-1] [min-w-[80px] text-right]
 *
 * 행 배경:
 *   - isMine · bg-sky-50/60 (내 입찰 · anchor)
 *   - 그 외  · hover:bg-slate-50/60 (인터랙션 hint)
 *
 * 이전엔 시각/거래인에 font-mono, 값에 -tracking-[0.02em] 등 튀는 스펙이 섞여
 * 왼쪽 테이블과 톤이 달랐음. 폰트/사이즈/색 계열 모두 왼쪽에 맞춰 통일.
 */
function TimelineRow({ entry }: { entry: BidHistoryEntry }) {
  const time = format(new Date(entry.bidAt), "HH:mm:ss", { locale: ko });
  return (
    <li
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-xs transition-colors",
        entry.isMine ? "bg-sky-50/60" : "hover:bg-slate-50/60",
      )}
    >
      <span className="w-[64px] shrink-0 tabular-nums text-slate-500">
        {time}
      </span>
      <span
        className={cn(
          "flex-1 truncate font-semibold tabular-nums",
          entry.isMine ? "text-sky-700" : "text-slate-800",
        )}
      >
        {entry.dealerLabel}
      </span>
      <span
        className={cn(
          "min-w-[80px] text-right font-bold tabular-nums",
          entry.isMine ? "text-sky-700" : "text-slate-800",
        )}
      >
        {NUMBER_FORMATTER.format(Math.round(entry.bidPrice))}
      </span>
    </li>
  );
}
