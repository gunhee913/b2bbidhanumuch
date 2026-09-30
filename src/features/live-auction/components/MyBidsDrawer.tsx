"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
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
 * 회차별 내 입찰 통계 · 회차 필터 칩이 달고 있는 숫자.
 * - open      : rank == null 인 미확정 입찰 → 건수/합계
 * - closed    : rank != null 인 확정 입찰   → 낙찰/미낙찰 카운트 + 낙찰 합계
 * - scheduled : DB 에 있으나 아직 시작 전
 * - null      : DB 에 아직 생성되지 않은 미래 회차 (placeholder)
 */
export interface RoundStat {
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

export function buildRoundStats(
  rounds: RoundInfo[],
  bids: MyBidEntry[],
): RoundStat[] {
  const byRound = new Map<string, MyBidEntry[]>();
  bids.forEach((b) => {
    if (!b.auctionId) return;
    if (!byRound.has(b.auctionId)) byRound.set(b.auctionId, []);
    byRound.get(b.auctionId)!.push(b);
  });
  const byRoundNo = new Map<number, RoundInfo>();
  rounds.forEach((r) => byRoundNo.set(r.round_no, r));
  const maxRoundNo = Math.max(TOTAL_ROUNDS, ...rounds.map((r) => r.round_no));
  const stats: RoundStat[] = [];
  for (let no = 1; no <= maxRoundNo; no += 1) {
    const round = byRoundNo.get(no) ?? null;
    const list = round ? (byRound.get(round.id) ?? []) : [];
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

export interface MyBidsDrawerProps {
  open: boolean;
  onClose: () => void;
  dealerId: string | null;
  listingDate: string;
  allRounds: RoundInfo[];
  initialRoundFilter?: string | null;
  onNavigateListing?: (listingId: string) => void;
  /** 사이드 메뉴 패널 안에 끼워 넣기 · 떠 있는 껍데기(위치·애니메이션·바깥 클릭·ESC·닫기 버튼) 없이 내용만 */
  embedded?: boolean;
}

type Tab = "active" | "closed";

const TABS: { id: Tab; label: string }[] = [
  { id: "active", label: "입찰현황" },
  { id: "closed", label: "경매결과" },
];

type ViewMode = "entity" | "part";
/** 경매결과 탭 필터 · 미낙찰은 취소선으로 이미 구분되므로 "낙찰만" 토글 하나로 충분 */
type OutcomeFilter = "all" | "won";

/** 오버레이 패널 폭 */
const MY_BIDS_PANEL_WIDTH = 400;

/** 이 속성이 붙은 영역 안의 클릭은 "바깥 클릭 닫기" 에서 제외 (트리거가 직접 열기/토글을 처리) */
export const MY_BIDS_TRIGGER_ATTR = "data-my-bids-trigger";

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
  embedded = false,
}: MyBidsDrawerProps) {
  const isFloating = open && !embedded;
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
      const expanded = tab === "closed" ? expandedInClosed : expandedInActive;
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
    if (!isFloating) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isFloating, onClose]);

  // 드로어 열릴 때 초기 라운드 필터/탭 세팅 · 회차 행에서 열었으면 그 칩을 1회 highlight
  const [highlightRoundId, setHighlightRoundId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  /**
   * 바깥 클릭 닫기 · `click` 단계에서 판정 (mousedown 이 아님).
   * mousedown 으로 닫으면 곧이어 트리거의 click 이 다시 열어버려 토글이 깨진다.
   * click 단계는 React 핸들러(트리거 토글) 가 먼저 돌고 document 리스너가 뒤에 돌아 안전.
   */
  useEffect(() => {
    if (!isFloating) return;
    const handleOutside = (e: MouseEvent) => {
      const el = panelRef.current;
      const target = e.target as Element | null;
      if (!el || !target || el.contains(target)) return;
      // 트리거 영역(내 입찰 카드 · 회차 행 · 도킹 바)은 자체 토글/필터 전환을 담당 → 여기서 닫지 않음
      if (target.closest(`[${MY_BIDS_TRIGGER_ATTR}]`)) return;
      onClose();
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [isFloating, onClose]);
  useEffect(() => {
    if (!open) return;
    setRoundFilter(initialRoundFilter ?? null);
    if (initialRoundFilter) {
      const round = allRounds.find((r) => r.id === initialRoundFilter);
      if (round?.status === "closed") setTab("closed");
      else setTab("active");
      setHighlightRoundId(initialRoundFilter);
      const id = setTimeout(() => setHighlightRoundId(null), 1400);
      return () => clearTimeout(id);
    }
  }, [open, initialRoundFilter, allRounds]);

  // 열림 애니메이션 뒤 닫기 버튼에 focus · 키보드로 바로 ESC/Tab 가능
  useEffect(() => {
    if (!isFloating) return;
    const id = setTimeout(() => closeButtonRef.current?.focus(), 280);
    return () => clearTimeout(id);
  }, [isFloating]);

  const sortedRounds = useMemo(
    () => [...allRounds].sort((a, b) => a.round_no - b.round_no),
    [allRounds],
  );

  /*
   * 회차별 건수 · 예전엔 회차 패널에 따로 카드로 세워 뒀는데, 거기서 회차를 고르면
   * 결국 이 드로어를 그 회차로 여는 동작이었다. 필터와 요약이 따로 놀 이유가 없어
   * 칩이 제 숫자를 달고 있게 합쳤다 — 고르기 전에 어디에 몇 건이 있는지 보인다.
   */
  const countByRoundId = useMemo(() => {
    const map = new Map<string, number>();
    buildRoundStats(allRounds, bids).forEach((s) => {
      if (!s.roundId) return;
      map.set(s.roundId, s.active.count + s.closed.wonCount + s.closed.lostCount);
    });
    return map;
  }, [allRounds, bids]);

  /**
   * 입찰현황 vs 경매결과 판정 기준:
   * - `bid.rank == null` → 회차 아직 마감 전 (입찰현황)
   * - `bid.rank != null` → close_round 로 확정 (경매결과)
   */
  const { activeBids, closedBids, filteredCurrent, byListing, byPart } =
    useMemo(() => {
      const filtered = roundFilter
        ? bids.filter((b) => b.auctionId === roundFilter)
        : bids;
      const active = filtered.filter((b) => b.rank == null);
      const closed = filtered.filter((b) => b.rank != null);
      // 경매결과 탭에서만 낙찰/미낙찰 필터를 적용. 입찰현황 탭은 아직 확정 전이라 무의미.
      const targetBase = tab === "active" ? active : closed;
      const target =
        tab === "closed" && outcomeFilter === "won"
          ? targetBase.filter((b) => b.isWinning)
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
    tab === "closed" && outcomeFilter === "won" ? "낙찰금액" : "총 입찰금액";
  const isEmpty =
    viewMode === "entity" ? byListing.length === 0 : byPart.length === 0;
  const showRoundChips = sortedRounds.length > 1;

  /**
   * 비모달 오버레이 패널 · 어둡게 덮는 backdrop 없음 · 가려지지 않은 영역(사이드/차트)은 그대로 조작 가능.
   * 본문을 밀지 않고 위에 겹쳐 뜬다. 닫기는 바깥 클릭 · X · ESC · 트리거 재클릭 · ↗ 이동(우측 상세가 가려지므로).
   * 컴포넌트는 항상 마운트(탭·필터 state 유지) · 패널 DOM 만 AnimatePresence 로 진입/퇴장.
   */
  const body = (
    <>
      {/* 헤더 · 좌 타이틀 / 우 합계(있을 때만) + 닫기 · 별도 합계 바 없음 */}
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-content">나의 입찰</h2>
        </div>
        <div className="flex items-center gap-2">
          {filteredCurrent.length > 0 ? (
            <div className="flex flex-col items-end leading-none">
              <span className="text-[10px] font-medium text-content-faint">
                {totalLabel} · {filteredCurrent.length}건
              </span>
              <span className="mt-1 text-[14px] font-bold tabular-nums text-content">
                <NumberFlow
                  value={totalAmount}
                  locales="ko-KR"
                  suffix="원"
                  willChange
                />
              </span>
            </div>
          ) : null}
          {embedded ? null : (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex h-8 w-8 items-center justify-center text-content-soft transition-colors hover:bg-surface-accent hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <nav className="px-4">
        <ul className="flex gap-1">
          {TABS.map((t) => {
            const count =
              t.id === "active" ? activeBids.length : closedBids.length;
            const isActive = t.id === tab;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors",
                    isActive
                      ? "bg-surface-strong text-content"
                      : "text-content-faint hover:bg-surface-accent hover:text-content-mid",
                  )}
                >
                  {t.label}
                  <span className="text-[12px] font-semibold tabular-nums text-content-faint">
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/*
       * 컨트롤 1줄 · 좌: 회차 칩(회차 2개 이상일 때만 · 활성 칩 재클릭 = 전체)
       *              우: 개체별/부위별 · (경매결과 탭) 낙찰만
       * 정렬 라벨은 두지 않음 — 뷰 모드가 정렬을 결정하는 고정 규칙
       */}
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {showRoundChips ? (
            <>
              <RoundFilterChip
                label="전체"
                count={bids.length}
                active={roundFilter === null}
                onClick={() => setRoundFilter(null)}
              />
              {sortedRounds.map((r) => (
                <RoundFilterChip
                  key={r.id}
                  label={`${r.round_no}회차`}
                  count={countByRoundId.get(r.id) ?? 0}
                  live={r.status === "open"}
                  active={roundFilter === r.id}
                  highlight={highlightRoundId === r.id}
                  onClick={() =>
                    setRoundFilter((prev) => (prev === r.id ? null : r.id))
                  }
                />
              ))}
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {tab === "closed" ? (
            <OutcomeFilterToggle
              value={outcomeFilter}
              onChange={setOutcomeFilter}
            />
          ) : null}
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-xs text-content-faint">
            불러오는 중...
          </div>
        ) : isEmpty ? (
          <EmptyState variant={tab} onGoBid={onClose} />
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
                  // 비모달 · 경매장으로 이동해도 패널은 유지 (보면서 수정)
                  onNavigate={
                    onNavigateListing
                      ? () => onNavigateListing(group.listing.id)
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
                  onNavigateListing={onNavigateListing}
                />
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <section aria-label="나의 입찰" className="flex h-full min-h-0 flex-col">
        {body}
      </section>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="my-bids-panel"
          ref={panelRef}
          role="complementary"
          aria-label="나의 입찰"
          className="fixed bottom-0 right-0 top-12 z-50 flex flex-col border-l border-line bg-surface shadow-[-12px_0_32px_-12px_rgba(15,23,42,0.28)]"
          style={{ width: MY_BIDS_PANEL_WIDTH }}
          initial={{ x: MY_BIDS_PANEL_WIDTH }}
          animate={{ x: 0 }}
          exit={{
            x: MY_BIDS_PANEL_WIDTH,
            transition: { duration: 0.22, ease: "easeIn" },
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 36,
            mass: 0.9,
          }}
        >
          {body}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * 회차 필터 칩 · 고르는 자리이자 그 회차에 몇 건을 넣었는지 보는 자리.
 * 0 건인 회차는 숫자를 지운다 — 아직 아무것도 없는 회차에 「0」 이 줄줄이 붙으면
 * 정작 숫자가 있는 회차가 눈에 안 들어온다.
 */
function RoundFilterChip({
  label,
  count,
  live,
  active,
  highlight = false,
  onClick,
}: {
  label: string;
  count: number;
  live?: boolean;
  active: boolean;
  /** 회차 행에서 드로어를 열었을 때 1회 ink ring pulse · "이 회차로 왔다" 시선 유도 */
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={
        highlight
          ? {
              boxShadow: [
                "0 0 0 0 rgba(15,23,42,0)",
                "0 0 0 4px rgba(15,23,42,0.45)",
                "0 0 0 0 rgba(15,23,42,0)",
              ],
            }
          : { boxShadow: "0 0 0 0 rgba(15,23,42,0)" }
      }
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "bg-inverse text-inverse-content"
          : "bg-surface-accent text-content-mid hover:bg-surface-strong",
      )}
    >
      {live ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              active ? "bg-surface" : "bg-emerald-500",
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              active ? "bg-surface" : "bg-emerald-500",
            )}
          />
        </span>
      ) : null}
      {label}
      {count > 0 ? (
        <span
          className={cn(
            "tabular-nums",
            active ? "text-inverse-content/70" : "text-content-faint",
          )}
        >
          {count}
        </span>
      ) : null}
    </motion.button>
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
    <li className="group overflow-hidden rounded-lg transition-colors hover:bg-surface-muted/60">
      <GroupHeader
        collapsed={collapsed}
        onToggle={onToggle}
        title={listing.listingNo}
        titleClass="text-content"
        subtitle={subtitleParts.join(" · ")}
        amount={displayAmount}
        amountClass={hasSettled ? "text-content" : "text-content"}
        onNavigate={onNavigate}
        navLabel={`${listing.listingNo} 경매장에서 열기`}
      />
      {!collapsed ? (
        <ul className="divide-y divide-line-soft bg-surface-muted/50">
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
    <div className="inline-flex items-center rounded-md bg-surface-accent p-0.5">
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
                ? "bg-surface text-content shadow-sm"
                : "text-content-soft hover:text-content-mid",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** `낙찰만` 단일 토글 칩 · 켜면 먹색 채움 */
function OutcomeFilterToggle({
  value,
  onChange,
}: {
  value: OutcomeFilter;
  onChange: (v: OutcomeFilter) => void;
}) {
  const on = value === "won";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(on ? "all" : "won")}
      className={cn(
        "inline-flex h-[26px] items-center rounded-md border px-2 text-[11px] font-bold transition-colors",
        on
          ? "border-inverse bg-inverse text-inverse-content"
          : "border-line bg-surface text-content-soft hover:text-content-mid",
      )}
    >
      낙찰만
    </button>
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
    <li className="group overflow-hidden rounded-lg transition-colors hover:bg-surface-muted/60">
      <GroupHeader
        collapsed={collapsed}
        onToggle={onToggle}
        title={partName}
        titleClass="text-content"
        subtitle={subtitleParts.join(" · ")}
        amount={displayAmount}
        amountClass={hasSettled ? "text-content" : "text-content"}
      />
      {!collapsed ? (
        <ul className="divide-y divide-line-soft bg-surface-muted/50">
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
      className="flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted/60"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-content-faint" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-content-faint" />
          )}
          <span
            className={cn(
              "truncate text-[13px] font-bold tabular-nums",
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
          <span className="pl-[22px] text-[11px] tabular-nums text-content-faint">
            {subtitle}
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "shrink-0 self-center text-[13px] font-bold tabular-nums",
          amountClass ?? "text-content",
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
      className="inline-flex h-5 w-5 items-center justify-center rounded text-content-ghost transition-colors hover:bg-surface-accent hover:text-content"
    >
      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
    </button>
  );
}

/**
 * 개체별/부위별 공용 행 · 두 뷰 모두 동일한 1-line 3-column grid.
 *   [ 주제목 + 보조(meta) | 단가 | 금액 ]
 * - entity: 주제목 = 부위명,   meta = 중량             (등급은 그룹 헤더에 이미 있음)
 * - part  : 주제목 = 상장번호, meta = 등급 · 부위 · 중량 (좌/우 구분은 여기서 보임)
 * 미낙찰은 금액 취소선 + 주제목 톤다운만 · 행 전체 opacity 는 쓰지 않음 (스캔 시 흐릿함 방지)
 */
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
  const weight = formatWeightKg(bid.part?.weight ?? null);

  const primary =
    variant === "entity"
      ? (bid.part?.partName ?? "-")
      : (listing?.listingNo ?? "-");

  const metaBits: string[] = [];
  if (variant === "part") {
    if (listing) {
      metaBits.push(formatGradeLabel(listing.grade, listing.marblingScore));
    }
    if (bid.part?.partName) metaBits.push(bid.part.partName);
  }
  if (weight !== "-") metaBits.push(weight);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_84px_92px] items-baseline gap-2 px-4 py-2">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span
          className={cn(
            "shrink-0 text-[12px] font-semibold tabular-nums",
            variant === "part" ? "text-content" : "text-content",
            isLost && "text-content-soft",
          )}
        >
          {primary}
        </span>
        {metaBits.length > 0 ? (
          <span className="min-w-0 truncate text-[11px] tabular-nums text-content-faint">
            {metaBits.join(" · ")}
          </span>
        ) : null}
        {onNavigate && listing ? (
          <NavigateLink
            onClick={onNavigate}
            label={`${listing.listingNo} 경매장에서 열기`}
          />
        ) : null}
      </span>
      <span className="text-right text-[11px] tabular-nums text-content-soft">
        {formatWonPerKg(bid.bidPrice)}
      </span>
      <span
        className={cn(
          "text-right text-[12px] font-bold tabular-nums",
          isLost
            ? "text-content-faint line-through decoration-slate-300"
            : "text-content",
        )}
      >
        {formatWon(bid.bidAmount)}
      </span>
    </li>
  );
}

/**
 * 빈 상태 · 입찰현황 탭은 "경매장에서 입찰하기" 액션 제공 (패널 닫고 테이블로 시선 복귀).
 * 경매결과 탭은 기다리는 상태라 액션 없이 설명만.
 */
function EmptyState({
  variant,
  onGoBid,
}: {
  variant: Tab;
  onGoBid: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <ClipboardList className="h-6 w-6 text-content-ghost" />
      <p className="text-sm font-semibold text-content-soft">
        {variant === "active"
          ? "진행 중인 입찰이 없습니다"
          : "마감된 입찰이 없습니다"}
      </p>
      {variant === "active" ? (
        <button
          type="button"
          onClick={onGoBid}
          className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-md bg-inverse px-4 text-[12px] font-bold text-inverse-content transition-colors hover:bg-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          경매장에서 입찰하기
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      ) : (
        <p className="text-xs leading-relaxed text-content-faint">
          회차가 마감되면 여기에 결과가 표시됩니다.
        </p>
      )}
    </div>
  );
}
