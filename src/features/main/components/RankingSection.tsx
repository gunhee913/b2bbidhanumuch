"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAuctionRankings,
  type RankingBidRow,
  type RankingPartStat,
  type RankingPeriod,
} from "@/features/main/api";
import { cn } from "@/lib/utils";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");
const TOP_N = 7;

const CATEGORY_TABS = [
  { value: "amount", label: "총경락금액" },
  { value: "popular", label: "인기부위" },
] as const;

type CategoryTab = (typeof CATEGORY_TABS)[number]["value"];

const PERIOD_TABS = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
] as const;

function formatWon(won: number): string {
  if (!Number.isFinite(won) || won <= 0) return "-";
  return `${NUMBER_FORMATTER.format(won)}원`;
}

function formatWeight(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return "-";
  return `${kg.toFixed(1)}kg`;
}

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "-";
  return `${NUMBER_FORMATTER.format(n)}건`;
}

function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "-";
  return `${(rate * 100).toFixed(1)}%`;
}

export function RankingSection() {
  const [period, setPeriod] = useState<RankingPeriod>("day");
  const [category, setCategory] = useState<CategoryTab>("amount");

  const { data, isLoading } = useQuery({
    queryKey: ["main", "auction-rankings", period],
    queryFn: () => fetchAuctionRankings(period),
    staleTime: 60_000,
  });

  const byAmount = data?.byAmount ?? [];
  const byPart = data?.byPart ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {CATEGORY_TABS.map((tab, idx) => (
            <Fragment key={tab.value}>
              {idx > 0 && (
                <span className="h-5 w-px bg-surface-strong" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => setCategory(tab.value)}
                className={cn(
                  "text-2xl font-bold transition-colors",
                  category === tab.value
                    ? "text-content"
                    : "text-content-ghost hover:text-content-soft",
                )}
              >
                {tab.label}
              </button>
            </Fragment>
          ))}
          {data?.isMock ? (
            <span
              className="ml-1 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200"
              title="실 낙찰 데이터가 없어 샘플 데이터를 표시합니다."
            >
              샘플
            </span>
          ) : null}
        </div>

        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setPeriod(tab.value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                period === tab.value
                  ? "bg-surface-accent text-content"
                  : "text-content-soft hover:text-content-mid",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-content-faint">
            불러오는 중...
          </div>
        ) : category === "popular" ? (
          <PopularPartTable items={byPart} />
        ) : (
          <AmountRankingTable items={byAmount} />
        )}
      </div>
    </div>
  );
}

interface AmountRankingTableProps {
  items: RankingBidRow[];
}

function AmountRankingTable({ items }: AmountRankingTableProps) {
  const rows = fillTo(items, TOP_N);

  return (
    <table className="w-full table-fixed">
      <colgroup>
        <col className="w-14" />
        <col className="w-[17%]" />
        <col className="w-[14%]" />
        <col className="w-[12%]" />
        <col className="w-[22%]" />
        <col />
      </colgroup>
      <thead>
        <tr className="border-b border-line-soft text-[11px] font-medium text-content-faint">
          <th className="whitespace-nowrap px-2 py-2 text-left">순위</th>
          <th className="whitespace-nowrap px-2 py-2 text-left">부위</th>
          <th className="whitespace-nowrap px-2 py-2 text-left">등급</th>
          <th className="whitespace-nowrap px-2 py-2 text-right">중량</th>
          <th className="whitespace-nowrap px-2 py-2 text-right">경락단가</th>
          <th className="whitespace-nowrap px-2 py-2 text-right">
            총경락금액
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, idx) => (
          <tr
            key={idx}
            className="border-b border-slate-50 transition-colors hover:bg-slate-50/70"
          >
            <td className="whitespace-nowrap px-2 py-2.5 text-sm tabular-nums text-content-faint">
              {idx + 1}
            </td>
            <td className="truncate px-2 py-2.5 text-sm font-semibold text-content">
              {item?.partName ?? "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-sm tabular-nums text-content-mid">
              {item?.grade || "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums text-content-mid">
              {item ? formatWeight(item.weight) : "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums text-content-mid">
              {item ? formatWon(item.bidPrice) : "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm font-bold tabular-nums text-content">
              {item ? formatWon(item.bidAmount) : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface PopularPartTableProps {
  items: RankingPartStat[];
}

function PopularPartTable({ items }: PopularPartTableProps) {
  const rows = fillTo(items, TOP_N);

  return (
    <table className="w-full table-fixed">
      <colgroup>
        <col className="w-14" />
        <col className="w-[18%]" />
        <col className="w-[15%]" />
        <col className="w-[15%]" />
        <col className="w-[14%]" />
        <col />
      </colgroup>
      <thead>
        <tr className="border-b border-line-soft text-[11px] font-medium text-content-faint">
          <th className="whitespace-nowrap px-2 py-2 text-left">순위</th>
          <th className="whitespace-nowrap px-2 py-2 text-left">부위</th>
          <th className="whitespace-nowrap px-2 py-2 text-right">상장건수</th>
          <th className="whitespace-nowrap px-2 py-2 text-right">낙찰건수</th>
          <th className="whitespace-nowrap px-2 py-2 text-right">낙찰률</th>
          <th className="whitespace-nowrap px-2 py-2 text-right">총낙찰대금</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, idx) => (
          <tr
            key={idx}
            className="border-b border-slate-50 transition-colors hover:bg-slate-50/70"
          >
            <td className="whitespace-nowrap px-2 py-2.5 text-sm tabular-nums text-content-faint">
              {idx + 1}
            </td>
            <td className="truncate px-2 py-2.5 text-sm font-semibold text-content">
              {item?.partName ?? "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums text-content-mid">
              {item ? formatCount(item.listingCount) : "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums text-content-mid">
              {item ? formatCount(item.winningCount) : "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm tabular-nums text-content-mid">
              {item ? formatRate(item.winningRate) : "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right text-sm font-bold tabular-nums text-content">
              {item ? formatWon(item.totalAmount) : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function fillTo<T>(items: T[], n: number): (T | null)[] {
  const out: (T | null)[] = [...items];
  while (out.length < n) out.push(null);
  return out.slice(0, n);
}
