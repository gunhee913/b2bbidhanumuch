"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useWinningParts } from "@/features/delivery/hooks/useWinningParts";
import { useDeliveryAssignments } from "@/features/delivery/hooks/useDeliveryAssignments";
import type { AssignmentInfo, WinningPart } from "@/features/delivery/types";
import { formatWon } from "@/features/live-auction/lib/masking";
import { PeriodFilter } from "./PeriodFilter";

export interface PartnerAnalysisPanelProps {
  dealerId: string | null;
}

const KRW_COMPACT = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const PALETTE = [
  "#0369a1",
  "#0284c7",
  "#0ea5e9",
  "#38bdf8",
  "#7dd3fc",
  "#bae6fd",
  "#94a3b8",
  "#cbd5e1",
];

interface PartnerAgg {
  partnerId: string;
  partnerName: string;
  count: number;
  amount: number;
  parts: Map<string, number>;
}

/**
 * 거래처 분석 대시보드.
 *
 * - 낙찰 부위와 거래처 배정 데이터를 조합해 거래처별 집계
 * - KPI · 배정률/거래처 수/총 배정 금액
 * - 거래처 TOP 8 (금액 기준) · 상세 테이블
 */
export function PartnerAnalysisPanel({ dealerId }: PartnerAnalysisPanelProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [searchStart, setSearchStart] = useState(monthAgo);
  const [searchEnd, setSearchEnd] = useState(today);

  const partsQuery = useWinningParts({
    dealerId,
    startDate: searchStart,
    endDate: searchEnd,
  });
  const assignmentsQuery = useDeliveryAssignments();

  const parts = useMemo<WinningPart[]>(
    () => partsQuery.data?.winningParts ?? [],
    [partsQuery.data],
  );
  const assignments = useMemo<Record<string, AssignmentInfo>>(
    () => assignmentsQuery.data?.assignments ?? {},
    [assignmentsQuery.data],
  );

  const isLoading = partsQuery.isLoading || assignmentsQuery.isLoading;

  const kpi = useMemo(() => {
    let totalParts = 0;
    let assignedParts = 0;
    let assignedAmount = 0;
    let unassignedAmount = 0;
    const partnerSet = new Set<string>();
    for (const p of parts) {
      totalParts++;
      const assign = assignments[p.partId];
      if (assign) {
        assignedParts++;
        assignedAmount += p.bidAmount;
        partnerSet.add(assign.partnerId);
      } else {
        unassignedAmount += p.bidAmount;
      }
    }
    return {
      totalParts,
      assignedParts,
      unassignedParts: totalParts - assignedParts,
      assignRate:
        totalParts > 0 ? Math.round((assignedParts / totalParts) * 100) : 0,
      partnerCount: partnerSet.size,
      assignedAmount,
      unassignedAmount,
    };
  }, [parts, assignments]);

  const partners = useMemo<PartnerAgg[]>(() => {
    const map = new Map<string, PartnerAgg>();
    for (const p of parts) {
      const assign = assignments[p.partId];
      if (!assign) continue;
      let agg = map.get(assign.partnerId);
      if (!agg) {
        agg = {
          partnerId: assign.partnerId,
          partnerName: assign.partnerName || "-",
          count: 0,
          amount: 0,
          parts: new Map(),
        };
        map.set(assign.partnerId, agg);
      }
      agg.count++;
      agg.amount += p.bidAmount;
      agg.parts.set(p.partName, (agg.parts.get(p.partName) ?? 0) + 1);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [parts, assignments]);

  const topByAmount = useMemo(
    () => partners.slice(0, 8).map((p) => ({
      name: p.partnerName,
      amount: p.amount,
      count: p.count,
    })),
    [partners],
  );

  return (
    <div className="grid gap-4">
      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        onChange={({ startDate: s, endDate: e }) => {
          setStartDate(s);
          setEndDate(e);
        }}
        onSearch={() => {
          setSearchStart(startDate);
          setSearchEnd(endDate);
        }}
      />

      <div className="grid grid-cols-4 gap-2">
        <KpiCard
          label="배정률"
          value={isLoading ? "-" : `${kpi.assignRate}%`}
          hint={
            isLoading
              ? " "
              : `${kpi.assignedParts} / ${kpi.totalParts}건`
          }
          tone="sky"
        />
        <KpiCard
          label="거래처 수"
          value={
            isLoading ? "-" : `${kpi.partnerCount.toLocaleString()}개`
          }
          hint=" "
        />
        <KpiCard
          label="배정 완료 금액"
          value={isLoading ? "-" : formatWon(kpi.assignedAmount)}
          tone="sky"
          hint=" "
        />
        <KpiCard
          label="미배정 금액"
          value={isLoading ? "-" : formatWon(kpi.unassignedAmount)}
          tone={kpi.unassignedAmount > 0 ? "warn" : "slate"}
          hint={
            isLoading
              ? " "
              : `${kpi.unassignedParts}건 미배정`
          }
        />
      </div>

      <div className="border border-slate-200 bg-white">
        <SectionHeader
          title="거래처 TOP 8 (배정 금액)"
          right={
            <span className="text-[11px] tabular-nums text-slate-400">
              {searchStart} ~ {searchEnd}
            </span>
          }
        />
        <div className="p-3">
          {topByAmount.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topByAmount}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => KRW_COMPACT.format(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#334155" }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(2,132,199,0.05)" }}
                    content={<PartnerTooltip />}
                  />
                  <Bar dataKey="amount" radius={0}>
                    {topByAmount.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="border border-slate-200 bg-white">
        <SectionHeader
          title="거래처별 상세"
          right={
            <span className="text-[11px] tabular-nums text-slate-400">
              총 {partners.length}개 거래처
            </span>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <colgroup>
              <col className="w-[48px]" />
              <col className="w-auto" />
              <col className="w-[100px]" />
              <col className="w-[140px]" />
              <col className="w-[200px]" />
            </colgroup>
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 text-center">
                  #
                </th>
                <th className="border-b border-r border-slate-200 px-3 py-2 text-left">
                  거래처
                </th>
                <th className="border-b border-r border-slate-200 px-3 py-2 text-right">
                  배정 건수
                </th>
                <th className="border-b border-r border-slate-200 px-3 py-2 text-right">
                  배정 금액
                </th>
                <th className="border-b border-slate-200 px-3 py-2 text-left">
                  주요 부위
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows colSpan={5} rows={4} />
              ) : partners.length === 0 ? (
                <EmptyRow colSpan={5} />
              ) : (
                partners.map((p, i) => (
                  <PartnerRow key={p.partnerId} rank={i + 1} partner={p} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PartnerRow({
  rank,
  partner,
}: {
  rank: number;
  partner: PartnerAgg;
}) {
  const topParts = Array.from(partner.parts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60">
      <td className="border-r border-slate-100 px-3 py-2 text-center align-middle text-[11px] font-bold tabular-nums text-slate-500">
        {rank}
      </td>
      <td className="border-r border-slate-100 px-3 py-2 text-left align-middle text-[13px] font-bold text-slate-900">
        {partner.partnerName}
      </td>
      <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-right align-middle text-[12px] tabular-nums text-slate-700">
        {partner.count.toLocaleString()}건
      </td>
      <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-right align-middle text-[12px] font-bold tabular-nums text-sky-700">
        {formatWon(partner.amount)}
      </td>
      <td className="px-3 py-2 text-left align-middle">
        <div className="flex flex-wrap items-center gap-1">
          {topParts.length === 0 ? (
            <span className="text-[11px] text-slate-400">-</span>
          ) : (
            topParts.map(([name, count]) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700"
              >
                {name}
                <span className="tabular-nums text-slate-400">×{count}</span>
              </span>
            ))
          )}
        </div>
      </td>
    </tr>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "slate" | "sky" | "warn";
}) {
  const color =
    tone === "sky"
      ? "text-sky-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-slate-900";
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-[20px] font-extrabold tabular-nums tracking-tight",
          color,
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10.5px] tabular-nums text-slate-400">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
      <span className="text-[13px] font-extrabold text-slate-900">{title}</span>
      {right}
    </header>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[260px] items-center justify-center text-[12px] text-slate-400">
      표시할 데이터가 없습니다.
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-14 text-center text-[13px] text-slate-400"
      >
        조회기간 내 배정된 거래처가 없습니다.
      </td>
    </tr>
  );
}

function SkeletonRows({
  colSpan,
  rows,
}: {
  colSpan: number;
  rows: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td colSpan={colSpan} className="px-3 py-3">
            <div className="h-4 w-full animate-pulse bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

interface PartnerPayload {
  amount?: number;
  count?: number;
}

function PartnerTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: PartnerPayload }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as PartnerPayload | undefined;
  const amount = data?.amount ?? 0;
  const count = data?.count ?? 0;
  return (
    <div className="border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="text-[11px] font-bold text-slate-900">{label}</div>
      <div className="mt-1 flex items-center gap-3 text-[11px] tabular-nums">
        <span className="text-slate-500">건수</span>
        <span className="font-bold text-slate-900">{count}건</span>
      </div>
      <div className="mt-0.5 flex items-center gap-3 text-[11px] tabular-nums">
        <span className="text-slate-500">금액</span>
        <span className="font-bold text-sky-700">
          {KRW_COMPACT.format(amount)}원
        </span>
      </div>
    </div>
  );
}
