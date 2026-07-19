"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useMyBids, type MyBidEntry } from "../hooks/useMyBids";
import { useRealtimeBids } from "@/hooks/useRealtimeBids";
import { formatGradeLabel } from "../lib/grade";
import { formatWeightKg, formatWon, formatWonPerKg } from "../lib/masking";

export interface MyBidsTriggerProps {
  dealerId: string | null;
  listingDate: string;
  onOpen: () => void;
}

/**
 * 나의 입찰 드로어 트리거 버튼. FloatingCard 아래에 stack.
 */
export function MyBidsTrigger({
  dealerId,
  listingDate,
  onOpen,
}: MyBidsTriggerProps) {
  const { data: bids = [] } = useMyBids(dealerId, listingDate);
  // 아직 마감되지 않은 회차의 입찰 (rank === null)
  const activeBids = useMemo(
    () => bids.filter((b) => b.rank == null),
    [bids],
  );
  const totalAmount = activeBids.reduce((sum, b) => sum + b.bidAmount, 0);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!dealerId}
      className={cn(
        "pointer-events-auto w-[200px] overflow-hidden rounded-2xl bg-white p-4 text-left shadow-xl shadow-slate-300/40 ring-1 ring-slate-100 transition-all",
        dealerId
          ? "hover:-translate-y-0.5 hover:ring-slate-200"
          : "cursor-not-allowed opacity-70",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
          <ClipboardList className="h-4 w-4 text-sky-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            My Bids
          </span>
          <span className="text-[13px] font-bold text-slate-900">
            나의 입찰
          </span>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        {dealerId ? (
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-slate-500">
              입찰 중
            </span>
            <span className="text-[15px] font-bold tabular-nums text-slate-900">
              {activeBids.length}
              <span className="ml-0.5 text-[11px] font-medium text-slate-400">
                건
              </span>
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">
            로그인 후 확인 가능
          </span>
        )}
        {dealerId && activeBids.length > 0 ? (
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-[10px] font-medium text-slate-400">총액</span>
            <span className="text-[12px] font-semibold tabular-nums text-slate-700">
              {formatWon(totalAmount)}
            </span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

export interface MyBidsDrawerProps {
  open: boolean;
  onClose: () => void;
  dealerId: string | null;
  listingDate: string;
}

type Tab = "active" | "closed";

const TABS: { id: Tab; label: string }[] = [
  { id: "active", label: "입찰현황" },
  { id: "closed", label: "경매결과" },
];

export function MyBidsDrawer({
  open,
  onClose,
  dealerId,
  listingDate,
}: MyBidsDrawerProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("active");
  const { data: bids = [], isLoading } = useMyBids(dealerId, listingDate);

  // 실시간 입찰 이벤트에 반응해 refetch
  useRealtimeBids({
    onBidChange: () => {
      queryClient.invalidateQueries({
        queryKey: ["live-auction", "my-bids"],
      });
    },
  });

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  /**
   * 입찰현황 vs 경매결과 판정 기준:
   * - `bid.rank == null` → 회차 아직 마감 전 (입찰현황)
   * - `bid.rank != null` → close_round 로 확정 (경매결과)
   * `listing.status` 는 회차가 마감돼도 유지되므로 부적절.
   */
  const { activeBids, closedBids, byListing } = useMemo(() => {
    const active = bids.filter((b) => b.rank == null);
    const closed = bids.filter((b) => b.rank != null);
    const target = tab === "active" ? active : closed;
    const groups = new Map<
      string,
      { listing: MyBidEntry["listing"]; bids: MyBidEntry[] }
    >();
    target.forEach((b) => {
      if (!b.listing) return;
      const key = b.listing.id;
      if (!groups.has(key)) {
        groups.set(key, { listing: b.listing, bids: [] });
      }
      groups.get(key)!.bids.push(b);
    });
    return {
      activeBids: active,
      closedBids: closed,
      byListing: Array.from(groups.values()),
    };
  }, [bids, tab]);

  const currentBids = tab === "active" ? activeBids : closedBids;
  const totalAmount = currentBids.reduce((sum, b) => sum + b.bidAmount, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200",
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        {/* 헤더 */}
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

        {/* 탭 */}
        <nav className="border-b border-slate-100">
          <ul className="flex">
            {TABS.map((t) => {
              const count = t.id === "active" ? activeBids.length : closedBids.length;
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

        {/* 총액 요약 */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold text-slate-500">
              총 입찰금액
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] tabular-nums text-slate-500">
                {currentBids.length}건
              </span>
              <span className="text-[18px] font-bold tabular-nums text-slate-900">
                {formatWon(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-xs text-slate-400">
              불러오는 중...
            </div>
          ) : byListing.length === 0 ? (
            <EmptyState variant={tab} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {byListing.map((group) => (
                <ListingBidGroup
                  key={group.listing!.id}
                  listing={group.listing!}
                  bids={group.bids}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

function ListingBidGroup({
  listing,
  bids,
}: {
  listing: NonNullable<MyBidEntry["listing"]>;
  bids: MyBidEntry[];
}) {
  const totalAmount = bids.reduce((sum, b) => sum + b.bidAmount, 0);
  const gradeLabel = formatGradeLabel(listing.grade, listing.marblingScore);

  return (
    <li className="px-5 py-3.5">
      {/* 개체 헤더 */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-bold tabular-nums text-sky-700">
            {listing.listingNo}
          </span>
          <span className="inline-flex items-center bg-slate-100 px-1.5 py-px text-[10px] font-bold tabular-nums text-slate-700">
            {gradeLabel}
          </span>
          <span className="text-[11px] tabular-nums text-slate-500">
            {bids.length}건
          </span>
        </div>
        <span className="text-[13px] font-bold tabular-nums text-slate-900">
          {formatWon(totalAmount)}
        </span>
      </div>

      {/* 부위별 입찰 리스트 */}
      <ul className="mt-2 space-y-1.5">
        {bids.map((b) => {
          const isSettled = b.rank != null;
          return (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 text-[12px]"
            >
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate font-semibold text-slate-700">
                  {b.part?.partName ?? "-"}
                </span>
                <span className="text-[10px] tabular-nums text-slate-400">
                  {formatWeightKg(b.part?.weight ?? null)}
                </span>
                {isSettled ? (
                  <span
                    className={cn(
                      "inline-flex items-center px-1 py-px text-[9px] font-bold uppercase tracking-wider",
                      b.isWinning
                        ? "bg-sky-100 text-sky-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {b.isWinning ? "낙찰" : "유찰"}
                  </span>
                ) : null}
              </div>
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-[11px] text-slate-500">
                  {formatWonPerKg(b.bidPrice)}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    isSettled && b.isWinning
                      ? "text-sky-700"
                      : "text-slate-800",
                  )}
                >
                  {formatWon(b.bidAmount)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
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
