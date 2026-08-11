"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AlertCircle, Clock, TrendingUp, Users } from "lucide-react";
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

/**
 * 부위별 입찰내역 · `PartDetailPanel` 의 "입찰내역" 탭 콘텐츠.
 *
 * 상위 컨테이너(PartDetailPanel)가 이미 부위 헤더를 렌더하므로 이 컴포넌트는
 * 콘텐츠에만 집중:
 *   1. Stats bar  · 총 입찰 · 참여 딜러 · 최고가 갱신 3-col grid
 *   2. Current top · 현재 최고가 큰 숫자 + 시각 + 나 배지
 *   3. Timeline    · 최신순 · 시각 / 딜러 라벨 / 가격 / 상태 배지
 *   4. Legend      · 익명 라벨 정책 안내 (하단 caption)
 *
 * 딜러 뷰는 익명 라벨 (딜러 A/B/C), 관리자/출품업체 뷰는 실명 노출.
 * 마스킹 정책은 서버 (`/api/bids/part/[partId]/history`) 에서 처리.
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
      {/* Stats bar */}
      {data ? (
        <div className="grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-200">
          <StatChip
            icon={<Clock className="h-3 w-3" />}
            label="총 입찰"
            value={data.stats.totalBids}
            suffix="회"
          />
          <StatChip
            icon={<Users className="h-3 w-3" />}
            label="참여 딜러"
            value={data.stats.totalDealers}
            suffix="명"
          />
          <StatChip
            icon={<TrendingUp className="h-3 w-3" />}
            label="최고가 갱신"
            value={data.stats.topBidUpdates}
            suffix="회"
          />
        </div>
      ) : null}

      {/* Current top card */}
      {data?.currentTop ? (
        <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                현재 최고가
              </span>
              {data.currentTop.isMine ? (
                <span className="inline-flex items-center bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  나
                </span>
              ) : null}
            </div>
            <span className="text-[10.5px] font-medium tabular-nums text-slate-500">
              {format(new Date(data.currentTop.bidAt), "HH:mm:ss", {
                locale: ko,
              })}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-[24px] font-bold tabular-nums -tracking-[0.02em]",
                data.currentTop.isMine ? "text-sky-700" : "text-slate-900",
              )}
            >
              {new Intl.NumberFormat("ko-KR").format(
                Math.round(data.currentTop.bidPrice),
              )}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              원/kg
            </span>
          </div>
        </div>
      ) : null}

      {/* Timeline */}
      <div className="bg-white">
        {query.isLoading && !data ? (
          <div className="flex h-40 items-center justify-center text-[12px] text-slate-400">
            불러오는 중...
          </div>
        ) : query.isError ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-[12px] text-slate-500">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            입찰내역을 불러올 수 없습니다.
          </div>
        ) : !data || data.history.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[12px] text-slate-400">
            아직 입찰이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.history.map((entry) => (
              <TimelineRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>

      {/* Footer legend · 익명 라벨 정책 안내 */}
      {data && data.history.length > 0 ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10.5px] text-slate-500">
          <span>단위 : 원/kg · </span>
          <span>
            다른 딜러 정보는 익명 라벨로 표시됩니다
            <span className="text-slate-300"> (딜러 A, B, C · 첫 입찰 순)</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="flex flex-col items-center bg-white px-2 py-2">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span className="text-[14px] font-bold tabular-nums -tracking-[0.02em] text-slate-900">
          {new Intl.NumberFormat("ko-KR").format(value)}
        </span>
        <span className="text-[10px] font-medium text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

/**
 * 타임라인 각 항목 · 최신순 표시.
 * - 좌: 시각 (HH:mm:ss)
 * - 중: 딜러 라벨 (본인 = "나" · sky 강조)
 * - 우: 가격 + 상태 배지 ([최고] filled emerald / [경신] outline slate)
 */
function TimelineRow({ entry }: { entry: BidHistoryEntry }) {
  const time = format(new Date(entry.bidAt), "HH:mm:ss", { locale: ko });
  return (
    <li
      className={cn(
        "flex items-center gap-2 px-4 py-2 transition-colors",
        entry.isMine
          ? "bg-sky-50/60"
          : entry.isCurrentTop
            ? "bg-emerald-50/40"
            : "hover:bg-slate-50/60",
      )}
    >
      <span className="w-[54px] shrink-0 font-mono text-[10.5px] tabular-nums text-slate-500">
        {time}
      </span>
      <span
        className={cn(
          "flex-1 truncate text-[12px] font-semibold",
          entry.isMine ? "text-sky-700" : "text-slate-700",
        )}
      >
        {entry.dealerLabel}
      </span>
      <div className="flex items-center gap-1">
        {entry.isCurrentTop ? (
          <span className="inline-flex items-center bg-emerald-600 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white">
            최고
          </span>
        ) : entry.wasTopAtTime ? (
          <span className="inline-flex items-center border border-slate-300 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-slate-600">
            경신
          </span>
        ) : null}
        <span
          className={cn(
            "min-w-[64px] text-right text-[12.5px] font-bold tabular-nums -tracking-[0.02em]",
            entry.isMine
              ? "text-sky-700"
              : entry.isCurrentTop
                ? "text-emerald-700"
                : "text-slate-800",
          )}
        >
          {new Intl.NumberFormat("ko-KR").format(Math.round(entry.bidPrice))}
        </span>
      </div>
    </li>
  );
}
