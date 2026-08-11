"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { RoundInfo } from "@/features/main/api";
import { cn } from "@/lib/utils";
import { useMyBids, type MyBidEntry } from "../hooks/useMyBids";
import { useRealtimeBids } from "@/hooks/useRealtimeBids";
import { formatGradeLabel } from "../lib/grade";
import { formatWeightKg, formatWon, formatWonPerKg } from "../lib/masking";

/**
 * 플랫폼 정책상 하루 경매는 3차까지 진행됨.
 * DB 에 아직 생성되지 않은 회차는 placeholder(대기) 로 노출.
 */
const TOTAL_ROUNDS = 3;

/**
 * 회차별 내 입찰 통계 · trigger 카드/드로어 공용.
 * - open      : rank == null 인 미확정 입찰 → 건수/합계
 * - closed    : rank != null 인 확정 입찰   → 낙찰/미낙찰 카운트 + 낙찰 합계
 * - scheduled : DB 에 있으나 아직 시작 전
 * - null      : DB 에 아직 생성되지 않은 미래 회차 (placeholder)
 */
interface RoundStat {
  roundNo: number;
  roundId: string | null;
  status: RoundInfo["status"] | null;
  active: {
    count: number;
    amount: number;
  };
  closed: {
    wonCount: number;
    lostCount: number;
    wonAmount: number;
  };
}

function buildRoundStats(rounds: RoundInfo[], bids: MyBidEntry[]): RoundStat[] {
  const byRound = new Map<string, MyBidEntry[]>();
  bids.forEach((b) => {
    if (!b.auctionId) return;
    if (!byRound.has(b.auctionId)) byRound.set(b.auctionId, []);
    byRound.get(b.auctionId)!.push(b);
  });
  const byRoundNo = new Map<number, RoundInfo>();
  rounds.forEach((r) => byRoundNo.set(r.round_no, r));
  const maxRoundNo = Math.max(
    TOTAL_ROUNDS,
    ...rounds.map((r) => r.round_no),
  );
  const stats: RoundStat[] = [];
  for (let no = 1; no <= maxRoundNo; no += 1) {
    const round = byRoundNo.get(no) ?? null;
    const list = round ? byRound.get(round.id) ?? [] : [];
    let activeCount = 0;
    let activeAmount = 0;
    let wonCount = 0;
    let lostCount = 0;
    let wonAmount = 0;
    list.forEach((b) => {
      if (b.rank == null) {
        activeCount += 1;
        activeAmount += b.bidAmount;
      } else if (b.isWinning) {
        wonCount += 1;
        wonAmount += b.bidAmount;
      } else {
        lostCount += 1;
      }
    });
    stats.push({
      roundNo: no,
      roundId: round?.id ?? null,
      status: round?.status ?? null,
      active: { count: activeCount, amount: activeAmount },
      closed: { wonCount, lostCount, wonAmount },
    });
  }
  return stats;
}

export interface MyBidsTriggerProps {
  dealerId: string | null;
  listingDate: string;
  allRounds: RoundInfo[];
  onOpen: (roundId: string | null) => void;
}

/**
 * 회차별 입찰 현황을 요약한 사이드 카드.
 * - 진행중 회차: 좌측 accent bar + 라이브 도트
 * - 마감 회차: 낙찰/미낙찰 카운트 + 낙찰 합계
 * - 대기 회차: placeholder
 */
export function MyBidsTrigger({
  dealerId,
  listingDate,
  allRounds,
  onOpen,
}: MyBidsTriggerProps) {
  const { data: bids = [] } = useMyBids(dealerId, listingDate);
  const stats = useMemo(
    () => buildRoundStats(allRounds, bids),
    [allRounds, bids],
  );
  const { activeTotalAmount, wonTotalAmount, grandTotalAmount, hasAny } =
    useMemo(() => {
      const active = stats.reduce((sum, s) => sum + s.active.amount, 0);
      const won = stats.reduce((sum, s) => sum + s.closed.wonAmount, 0);
      return {
        activeTotalAmount: active,
        wonTotalAmount: won,
        grandTotalAmount: active + won,
        hasAny: active > 0 || won > 0,
      };
    }, [stats]);

  const disabled = !dealerId;

  return (
    <div
      className={cn(
        "pointer-events-auto w-[236px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60",
        disabled && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(null)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between px-4 pt-3.5 pb-2 text-left",
          !disabled && "hover:bg-slate-50/60",
        )}
      >
        <span className="text-[13px] font-bold tracking-tight text-slate-900">
          내 입찰
        </span>
        {!disabled ? (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        ) : null}
      </button>

      <div className="h-px w-full bg-slate-100" />

      {disabled ? (
        <div className="px-4 py-4 text-center text-[11px] text-slate-400">
          로그인 후 확인 가능
        </div>
      ) : stats.length === 0 ? (
        <div className="px-4 py-4 text-center text-[11px] text-slate-400">
          예정된 회차 없음
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {stats.map((s) => (
            <RoundStatRow
              key={s.roundNo}
              stat={s}
              disabled={disabled || !s.roundId}
              onClick={() => onOpen(s.roundId)}
            />
          ))}
        </ul>
      )}

      {!disabled && hasAny ? (
        <>
          <div className="h-px w-full bg-slate-100" />
          <div className="px-4 py-2.5">
            <SummaryLine
              label="낙찰금액 합계"
              amount={wonTotalAmount}
              valueClass="text-sky-700"
            />
            <SummaryLine
              label="진행중 금액"
              amount={activeTotalAmount}
              valueClass="text-slate-700"
            />
            <div className="mt-1.5 border-t border-slate-100 pt-1.5">
              <SummaryLine
                label="낙찰금액 + 진행중"
                amount={grandTotalAmount}
                emphasize
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryLine({
  label,
  amount,
  valueClass,
  emphasize,
}: {
  label: string;
  amount: number;
  valueClass?: string;
  emphasize?: boolean;
}) {
  const isZero = amount <= 0;
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span
        className={cn(
          "text-[10px] font-medium",
          emphasize ? "text-slate-700" : "text-slate-400",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          emphasize
            ? "text-[14px] font-bold text-slate-900"
            : cn("text-[12px] font-semibold", valueClass ?? "text-slate-700"),
          isZero && "text-slate-300",
        )}
      >
        {isZero ? "—" : formatWon(amount)}
      </span>
    </div>
  );
}

function RoundStatRow({
  stat,
  disabled,
  onClick,
}: {
  stat: RoundStat;
  disabled: boolean;
  onClick: () => void;
}) {
  const { roundNo, status, active, closed } = stat;
  const isOpen = status === "open";
  const isClosed = status === "closed";
  // scheduled(스케줄 됐지만 시작 전) 와 null(DB 미생성) 모두 UI 상 "대기중"
  const isWaiting = !isOpen && !isClosed;

  const statusChip = isOpen ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
      </span>
      진행중
    </span>
  ) : isClosed ? (
    <span className="text-[10px] font-semibold text-slate-400">종료</span>
  ) : (
    <span className="text-[10px] font-semibold text-slate-300">대기중</span>
  );

  return (
    <li className="relative">
      {isOpen ? (
        <span
          className="absolute inset-y-0 left-0 w-[3px] bg-sky-500"
          aria-hidden
        />
      ) : null}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex w-full flex-col gap-1 px-4 py-2.5 text-left transition-colors",
          disabled
            ? "cursor-default"
            : "hover:bg-slate-50/60",
        )}
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[12px] font-bold tabular-nums",
              isOpen
                ? "text-slate-900"
                : isWaiting
                  ? "text-slate-400"
                  : "text-slate-700",
            )}
          >
            {roundNo}차 경매
          </span>
          {statusChip}
        </div>
        {isOpen ? (
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-500 tabular-nums">
              입찰 {active.count}건
            </span>
            <span
              className={cn(
                "text-[12px] font-bold tabular-nums",
                active.count > 0 ? "text-slate-900" : "text-slate-400",
              )}
            >
              {active.count > 0 ? formatWon(active.amount) : "—"}
            </span>
          </div>
        ) : isClosed ? (
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] tabular-nums">
              <span className="font-semibold text-sky-600">
                낙찰 {closed.wonCount}
              </span>
              <span className="mx-1 text-slate-300">·</span>
              <span className="font-medium text-slate-500">
                미낙찰 {closed.lostCount}
              </span>
            </span>
            <span
              className={cn(
                "text-[12px] font-bold tabular-nums",
                closed.wonCount > 0 ? "text-sky-700" : "text-slate-400",
              )}
            >
              {closed.wonCount > 0 ? formatWon(closed.wonAmount) : "—"}
            </span>
          </div>
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-300">시작 전</span>
            <span className="text-[12px] font-medium tabular-nums text-slate-300">
              —
            </span>
          </div>
        )}
      </button>
    </li>
  );
}

export interface MyBidsDrawerProps {
  open: boolean;
  onClose: () => void;
  dealerId: string | null;
  listingDate: string;
  allRounds: RoundInfo[];
  initialRoundFilter?: string | null;
  onNavigateListing?: (listingId: string) => void;
}

type Tab = "active" | "closed";

const TABS: { id: Tab; label: string }[] = [
  { id: "active", label: "입찰현황" },
  { id: "closed", label: "경매결과" },
];

type ViewMode = "entity" | "part";
type OutcomeFilter = "all" | "won" | "lost";

const compareListingNo = (a: string, b: string) =>
  a.localeCompare(b, "ko", { numeric: true });

/**
 * 부위별 그룹 키/라벨 정규화.
 * 좌/우 구분 접미어를 제거해서 동일 부위로 통합.
 *
 * 예:
 * - "등심(좌)"  → "등심"
 * - "등심(우1)" → "등심"
 * - "채끝(좌)"  → "채끝"
 * - "치마"      → "치마" (그대로)
 */
const normalizePartName = (name: string): string =>
  name.replace(/\s*\([좌우][^)]*\)\s*$/, "").trim();

export function MyBidsDrawer({
  open,
  onClose,
  dealerId,
  listingDate,
  allRounds,
  initialRoundFilter,
  onNavigateListing,
}: MyBidsDrawerProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("active");
  const [viewMode, setViewMode] = useState<ViewMode>("entity");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [roundFilter, setRoundFilter] = useState<string | null>(
    initialRoundFilter ?? null,
  );
  /**
   * 두 탭 모두 기본 접힘. 각 탭별로 사용자가 명시적으로 편 그룹만 별도 추적.
   */
  const [expandedInActive, setExpandedInActive] = useState<Set<string>>(
    new Set(),
  );
  const [expandedInClosed, setExpandedInClosed] = useState<Set<string>>(
    new Set(),
  );
  const isCollapsed = useCallback(
    (key: string) => {
      const expanded =
        tab === "closed" ? expandedInClosed : expandedInActive;
      return !expanded.has(key);
    },
    [tab, expandedInClosed, expandedInActive],
  );
  const toggleGroup = useCallback(
    (key: string) => {
      const setter =
        tab === "closed" ? setExpandedInClosed : setExpandedInActive;
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [tab],
  );
  const { data: bids = [], isLoading } = useMyBids(dealerId, listingDate);

  useRealtimeBids({
    onBidChange: () => {
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "my-bids"],
      });
    },
  });

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // 드로어 열릴 때 초기 라운드 필터/탭 세팅
  useEffect(() => {
    if (!open) return;
    setRoundFilter(initialRoundFilter ?? null);
    if (initialRoundFilter) {
      const round = allRounds.find((r) => r.id === initialRoundFilter);
      if (round?.status === "closed") setTab("closed");
      else setTab("active");
    }
  }, [open, initialRoundFilter, allRounds]);

  const sortedRounds = useMemo(
    () => [...allRounds].sort((a, b) => a.round_no - b.round_no),
    [allRounds],
  );

  /**
   * 입찰현황 vs 경매결과 판정 기준:
   * - `bid.rank == null` → 회차 아직 마감 전 (입찰현황)
   * - `bid.rank != null` → close_round 로 확정 (경매결과)
   */
  const { activeBids, closedBids, filteredCurrent, byListing, byPart } = useMemo(() => {
    const filtered = roundFilter
      ? bids.filter((b) => b.auctionId === roundFilter)
      : bids;
    const active = filtered.filter((b) => b.rank == null);
    const closed = filtered.filter((b) => b.rank != null);
    // 경매결과 탭에서만 낙찰/미낙찰 필터를 적용. 입찰현황 탭은 아직 확정 전이라 무의미.
    const targetBase = tab === "active" ? active : closed;
    const target =
      tab === "closed" && outcomeFilter !== "all"
        ? targetBase.filter((b) =>
            outcomeFilter === "won" ? b.isWinning : !b.isWinning,
          )
        : targetBase;

    // 개체별 그룹 · 상장번호 오름차순
    const listingMap = new Map<
      string,
      { listing: NonNullable<MyBidEntry["listing"]>; bids: MyBidEntry[] }
    >();
    target.forEach((b) => {
      if (!b.listing) return;
      const key = b.listing.id;
      if (!listingMap.has(key)) {
        listingMap.set(key, { listing: b.listing, bids: [] });
      }
      listingMap.get(key)!.bids.push(b);
    });
    /**
     * 정렬 규칙 (뷰 모드 기준, 탭과 독립)
     * - 개체별: 상장번호 오름차순, 내부는 부위번호 순
     * - 부위별: 그룹은 총 입찰금액 내림차순, 내부 행은 개별 입찰금액 내림차순
     *   부위별 그룹은 낙찰이 있는 탭에서도 총 입찰금액 기준으로 통일 (일관성)
     */
    const sumBidAmount = (list: MyBidEntry[]) =>
      list.reduce((sum, b) => sum + b.bidAmount, 0);

    const listingGroups = Array.from(listingMap.values())
      .map((g) => ({
        ...g,
        bids: [...g.bids].sort(
          (a, b) => (a.part?.partNo ?? 0) - (b.part?.partNo ?? 0),
        ),
      }))
      .sort((a, b) =>
        compareListingNo(a.listing.listingNo, b.listing.listingNo),
      );

    // 부위별 그룹 · 좌/우 구분(등심(좌)/등심(우))은 하나의 "등심" 으로 통합.
    // 그룹 key = 정규화된 이름 · 대표 partNo 는 최소값(첫 번째 부위번호) 을 사용.
    const partMap = new Map<
      string,
      { partName: string; partNo: number; bids: MyBidEntry[] }
    >();
    target.forEach((b) => {
      if (!b.part || !b.listing) return;
      const normalized = normalizePartName(b.part.partName);
      const existing = partMap.get(normalized);
      if (!existing) {
        partMap.set(normalized, {
          partName: normalized,
          partNo: b.part.partNo,
          bids: [b],
        });
      } else {
        existing.bids.push(b);
        // 같은 그룹 내 최소 부위번호를 대표 정렬 키로 유지
        if (b.part.partNo < existing.partNo) {
          existing.partNo = b.part.partNo;
        }
      }
    });
    const partGroups = Array.from(partMap.values())
      .map((g) => ({
        ...g,
        bids: [...g.bids].sort((a, b) => b.bidAmount - a.bidAmount),
      }))
      .sort((a, b) => {
        const diff = sumBidAmount(b.bids) - sumBidAmount(a.bids);
        if (diff !== 0) return diff;
        if (a.partNo !== b.partNo) return a.partNo - b.partNo;
        return a.partName.localeCompare(b.partName, "ko");
      });

    return {
      activeBids: active,
      closedBids: closed,
      filteredCurrent: target,
      byListing: listingGroups,
      byPart: partGroups,
    };
  }, [bids, tab, roundFilter, outcomeFilter]);

  const totalAmount = filteredCurrent.reduce((sum, b) => sum + b.bidAmount, 0);
  const totalLabel =
    tab === "closed" && outcomeFilter === "won"
      ? "낙찰금액"
      : tab === "closed" && outcomeFilter === "lost"
        ? "미낙찰 입찰금액"
        : "총 입찰금액";
  const isEmpty =
    viewMode === "entity" ? byListing.length === 0 : byPart.length === 0;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-sky-600" />
            <h2 className="text-[15px] font-bold text-slate-900">나의 입찰</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav className="border-b border-slate-100">
          <ul className="flex">
            {TABS.map((t) => {
              const count =
                t.id === "active" ? activeBids.length : closedBids.length;
              const isActive = t.id === tab;
              return (
                <li key={t.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "relative flex h-11 w-full items-center justify-center gap-1.5 text-sm font-bold transition-colors",
                      isActive
                        ? "text-slate-900"
                        : "text-slate-400 hover:text-slate-700",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "inline-flex min-w-[16px] items-center justify-center bg-slate-100 px-1 text-[10px] font-bold tabular-nums",
                        isActive ? "bg-sky-100 text-sky-700" : "text-slate-500",
                      )}
                    >
                      {count}
                    </span>
                    {isActive ? (
                      <span
                        className="absolute inset-x-6 bottom-0 h-[2px] bg-slate-900"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {sortedRounds.length > 0 ? (
          <div className="border-b border-slate-100 px-4 py-2">
            <div className="flex flex-wrap items-center gap-1">
              <RoundFilterChip
                label="전체"
                active={roundFilter === null}
                onClick={() => setRoundFilter(null)}
              />
              {sortedRounds.map((r) => (
                <RoundFilterChip
                  key={r.id}
                  label={`${r.round_no}차`}
                  live={r.status === "open"}
                  active={roundFilter === r.id}
                  onClick={() => setRoundFilter(r.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* 그룹 축 스위치 · 낙찰/미낙찰 필터 · 정렬 표시 */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            {tab === "closed" ? (
              <OutcomeFilterToggle
                value={outcomeFilter}
                onChange={setOutcomeFilter}
              />
            ) : null}
          </div>
          <span className="shrink-0 text-[10px] font-medium text-slate-400">
            {viewMode === "part" ? "금액 ↓" : "상장번호 ↑"}
          </span>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold text-slate-500">
              {totalLabel}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] tabular-nums text-slate-500">
                {filteredCurrent.length}건
              </span>
              <span className="text-[18px] font-bold tabular-nums text-slate-900">
                {formatWon(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-xs text-slate-400">
              불러오는 중...
            </div>
          ) : isEmpty ? (
            <EmptyState variant={tab} />
          ) : viewMode === "entity" ? (
            <ul className="space-y-2 p-3">
              {byListing.map((group) => {
                const key = `L:${group.listing.id}`;
                return (
                  <ListingBidGroup
                    key={group.listing.id}
                    listing={group.listing}
                    bids={group.bids}
                    collapsed={isCollapsed(key)}
                    onToggle={() => toggleGroup(key)}
                    onNavigate={
                      onNavigateListing
                        ? () => {
                            onNavigateListing(group.listing.id);
                            onClose();
                          }
                        : undefined
                    }
                  />
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-2 p-3">
              {byPart.map((group) => {
                const key = `P:${group.partName}`;
                return (
                  <PartBidGroup
                    key={group.partName}
                    partName={group.partName}
                    bids={group.bids}
                    collapsed={isCollapsed(key)}
                    onToggle={() => toggleGroup(key)}
                    onNavigateListing={
                      onNavigateListing
                        ? (listingId) => {
                            onNavigateListing(listingId);
                            onClose();
                          }
                        : undefined
                    }
                  />
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

function RoundFilterChip({
  label,
  live,
  active,
  onClick,
}: {
  label: string;
  live?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      )}
    >
      {live ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              active ? "bg-white" : "bg-sky-500",
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              active ? "bg-white" : "bg-sky-500",
            )}
          />
        </span>
      ) : null}
      {label}
    </button>
  );
}

/**
 * 개체별 그룹 카드.
 * - 카드 스타일 (rounded, border, hover shadow)
 * - 헤더 2줄: 상장번호+아이콘 / 등급·건수 subtitle
 */
function ListingBidGroup({
  listing,
  bids,
  collapsed,
  onToggle,
  onNavigate,
}: {
  listing: NonNullable<MyBidEntry["listing"]>;
  bids: MyBidEntry[];
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const totalAmount = bids.reduce((sum, b) => sum + b.bidAmount, 0);
  const settled = bids.filter((b) => b.rank != null);
  const wonCount = settled.filter((b) => b.isWinning).length;
  const lostCount = settled.length - wonCount;
  const wonAmount = settled
    .filter((b) => b.isWinning)
    .reduce((sum, b) => sum + b.bidAmount, 0);
  const hasSettled = settled.length > 0;
  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);
  const displayAmount = hasSettled ? wonAmount : totalAmount;

  const subtitleParts = [gradeLabel, `${bids.length}건`];
  if (hasSettled) {
    subtitleParts.push(`낙찰 ${wonCount}`);
    if (lostCount > 0) subtitleParts.push(`미낙찰 ${lostCount}`);
  }

  return (
    <li className="group overflow-hidden rounded-lg border border-slate-100 bg-white transition-all hover:border-sky-200 hover:shadow-sm">
      <GroupHeader
        collapsed={collapsed}
        onToggle={onToggle}
        title={listing.listingNo}
        titleClass="text-sky-700"
        subtitle={subtitleParts.join(" · ")}
        amount={displayAmount}
        amountClass={hasSettled ? "text-sky-700" : "text-slate-900"}
        onNavigate={onNavigate}
        navLabel={`${listing.listingNo} 경매장에서 열기`}
      />
      {!collapsed ? (
        <ul className="bg-slate-50/50">
          {bids.map((b) => (
            <BidRow key={b.id} bid={b} variant="entity" />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const options: { id: ViewMode; label: string }[] = [
    { id: "entity", label: "개체별" },
    { id: "part", label: "부위별" },
  ];
  return (
    <div className="inline-flex items-center rounded-md bg-slate-100 p-0.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[11px] font-bold transition-colors",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function OutcomeFilterToggle({
  value,
  onChange,
}: {
  value: OutcomeFilter;
  onChange: (v: OutcomeFilter) => void;
}) {
  const options: { id: OutcomeFilter; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "won", label: "낙찰" },
    { id: "lost", label: "미낙찰" },
  ];
  return (
    <div className="inline-flex items-center rounded-md bg-slate-100 p-0.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-[5px] px-2 py-1 text-[11px] font-bold transition-colors",
              active
                ? o.id === "won"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 부위별 그룹 카드.
 */
function PartBidGroup({
  partName,
  bids,
  collapsed,
  onToggle,
  onNavigateListing,
}: {
  partName: string;
  bids: MyBidEntry[];
  collapsed: boolean;
  onToggle: () => void;
  onNavigateListing?: (listingId: string) => void;
}) {
  const settled = bids.filter((b) => b.rank != null);
  const wonBids = settled.filter((b) => b.isWinning);
  const lostCount = settled.length - wonBids.length;
  const wonAmount = wonBids.reduce((sum, b) => sum + b.bidAmount, 0);
  const activeAmount = bids
    .filter((b) => b.rank == null)
    .reduce((sum, b) => sum + b.bidAmount, 0);
  const hasSettled = settled.length > 0;
  const displayAmount = hasSettled ? wonAmount : activeAmount;

  const subtitleParts = [`${bids.length}건`];
  if (hasSettled) {
    subtitleParts.push(`낙찰 ${wonBids.length}`);
    if (lostCount > 0) subtitleParts.push(`미낙찰 ${lostCount}`);
  }

  return (
    <li className="group overflow-hidden rounded-lg border border-slate-100 bg-white transition-all hover:border-sky-200 hover:shadow-sm">
      <GroupHeader
        collapsed={collapsed}
        onToggle={onToggle}
        title={partName}
        titleClass="text-slate-900"
        subtitle={subtitleParts.join(" · ")}
        amount={displayAmount}
        amountClass={hasSettled ? "text-sky-700" : "text-slate-900"}
      />
      {!collapsed ? (
        <ul className="divide-y divide-slate-100 bg-slate-50/50">
          {bids.map((b) => (
            <BidRow
              key={b.id}
              bid={b}
              variant="part"
              onNavigate={
                onNavigateListing && b.listing
                  ? () => onNavigateListing(b.listing!.id)
                  : undefined
              }
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * 개체별/부위별 뷰 공용 그룹 카드 헤더 (2-line).
 * - Line 1: chevron + title + ↗ nav icon   ·   amount (오른쪽 정렬)
 * - Line 2: subtitle (등급/건수/낙찰 요약 등 · 슬레이트 400 dot-separated)
 */
function GroupHeader({
  collapsed,
  onToggle,
  title,
  titleClass,
  subtitle,
  amount,
  amountClass,
  onNavigate,
  navLabel,
}: {
  collapsed: boolean;
  onToggle: () => void;
  title: string;
  titleClass?: string;
  subtitle?: string;
  amount: number;
  amountClass?: string;
  onNavigate?: () => void;
  navLabel?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/60"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )}
          <span
            className={cn(
              "truncate text-[15px] font-bold tabular-nums",
              titleClass,
            )}
          >
            {title}
          </span>
          {onNavigate ? (
            <NavigateLink onClick={onNavigate} label={navLabel} />
          ) : null}
        </div>
        {subtitle ? (
          <span className="pl-[22px] text-[11px] tabular-nums text-slate-400">
            {subtitle}
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "shrink-0 self-center text-[15px] font-bold tabular-nums",
          amountClass ?? "text-slate-900",
        )}
      >
        {amount > 0 ? formatWon(amount) : "—"}
      </span>
    </div>
  );
}

function NavigateLink({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label ?? "경매장에서 열기"}
      title={label ?? "경매장에서 열기"}
      className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-300 transition-colors hover:bg-sky-50 hover:text-sky-600"
    >
      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
    </button>
  );
}

/**
 * 개체별/부위별 공용 행. 4-column grid 로 세로 정렬 축 확립.
 * - variant='entity': 부위명 강조
 * - variant='part'  : 상장번호 강조
 */
/**
 * 개체별/부위별 공용 행.
 * - entity variant: 1-line grid [부위명 | 중량 | 단가 | 금액]
 * - part   variant: 2-line 카드 · 상장번호+금액 / 등급·부위·중량·단가
 */
/**
 * 진행 중 회차의 오픈 최고가 상태 배지.
 * - 1위 : 내가 현재 최고가 (isTopBid)
 * - 역전당함 : 내 입찰이 있지만 최고가에서 밀려남
 */
function OpenBidStatusBadge({ isTop }: { isTop: boolean }) {
  if (isTop) {
    return (
      <span className="inline-flex items-center gap-0.5 bg-sky-600 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
        1위
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 bg-amber-500 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
      역전
    </span>
  );
}

function BidRow({
  bid,
  variant,
  onNavigate,
}: {
  bid: MyBidEntry;
  variant: "entity" | "part";
  onNavigate?: () => void;
}) {
  const isSettled = bid.rank != null;
  const isLost = isSettled && !bid.isWinning;
  const listing = bid.listing;

  if (variant === "entity") {
    return (
      <li
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_54px_92px_96px] items-baseline gap-2 px-4 py-2 text-[12px]",
          isLost && "opacity-60",
        )}
      >
        <span className="flex min-w-0 items-center gap-1 truncate font-semibold text-slate-900">
          <span className="truncate">{bid.part?.partName ?? "-"}</span>
          {!isSettled ? <OpenBidStatusBadge isTop={bid.isTopBid} /> : null}
        </span>
        <span className="text-right text-[11px] tabular-nums text-slate-400">
          {formatWeightKg(bid.part?.weight ?? null)}
        </span>
        <span className="text-right text-[11px] tabular-nums text-slate-500">
          {formatWonPerKg(bid.bidPrice)}
        </span>
        <span
          className={cn(
            "text-right text-[12px] font-bold tabular-nums",
            isLost
              ? "text-slate-400 line-through decoration-slate-300"
              : "text-slate-900",
          )}
        >
          {formatWon(bid.bidAmount)}
        </span>
      </li>
    );
  }

  const subtitleBits: string[] = [];
  if (listing) {
    subtitleBits.push(formatGradeLabel(listing.grade, listing.marblingScore));
  }
  if (bid.part?.partName) subtitleBits.push(bid.part.partName);
  const weight = formatWeightKg(bid.part?.weight ?? null);
  if (weight !== "-") subtitleBits.push(weight);
  const priceLabel = formatWonPerKg(bid.bidPrice);
  if (priceLabel !== "-") subtitleBits.push(priceLabel);

  return (
    <li
      className={cn(
        "flex flex-col gap-0.5 px-4 py-2.5",
        isLost && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] font-bold tabular-nums text-sky-700">
            {listing?.listingNo ?? "-"}
          </span>
          {!isSettled ? <OpenBidStatusBadge isTop={bid.isTopBid} /> : null}
          {onNavigate && listing ? (
            <NavigateLink
              onClick={onNavigate}
              label={`${listing.listingNo} 경매장에서 열기`}
            />
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 text-[13px] font-bold tabular-nums",
            isLost
              ? "text-slate-400 line-through decoration-slate-300"
              : "text-slate-900",
          )}
        >
          {formatWon(bid.bidAmount)}
        </span>
      </div>
      {subtitleBits.length > 0 ? (
        <span className="text-[11px] tabular-nums text-slate-400">
          {subtitleBits.join(" · ")}
        </span>
      ) : null}
    </li>
  );
}

function EmptyState({ variant }: { variant: Tab }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <ClipboardList className="h-6 w-6 text-slate-300" />
      <p className="text-sm font-semibold text-slate-500">
        {variant === "active"
          ? "진행 중인 입찰이 없습니다"
          : "마감된 입찰이 없습니다"}
      </p>
      <p className="text-xs text-slate-400 leading-relaxed">
        {variant === "active"
          ? "부위를 선택하고 입찰가를 등록해 보세요."
          : "회차가 마감되면 여기에 결과가 표시됩니다."}
      </p>
    </div>
  );
}
