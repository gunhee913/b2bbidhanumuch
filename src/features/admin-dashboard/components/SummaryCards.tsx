'use client';

import type { DashboardSummary } from '../types';
import { bidRateOf, formatCount, formatPercent, formatWon } from '../lib/format';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

interface Stat {
  label: string;
  value: string;
}

function StatCell({ stat }: { stat: Stat }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 px-5 py-4">
      <span className="text-[12px] font-medium text-slate-500">{stat.label}</span>
      <span className="whitespace-nowrap text-[22px] font-bold leading-none tabular-nums tracking-[-0.01em] text-slate-900">
        {stat.value}
      </span>
    </div>
  );
}

function StatGroup({ title, stats }: { title: string; stats: Stat[] }) {
  return (
    <section className="rounded-[2px] border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-5 py-2.5 text-[12px] font-semibold text-slate-700">{title}</h2>
      <div className="flex divide-x divide-slate-100">
        {stats.map((stat) => (
          <StatCell key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}

/** 요약 카드 · 경매 규모와 금액을 두 묶음으로 나눈다 · 숫자 크기는 모두 같다 */
export function SummaryCards({ summary }: SummaryCardsProps) {
  const scale: Stat[] = [
    { label: '경매 두수', value: formatCount(summary.cattleCount, '두') },
    { label: '경매 건수', value: formatCount(summary.partCount, '건') },
    { label: '낙찰 건수', value: formatCount(summary.wonCount, '건') },
    { label: '낙찰률', value: formatPercent(bidRateOf(summary.wonCount, summary.partCount)) },
  ];

  const money: Stat[] = [
    { label: '낙찰대금', value: formatWon(summary.wonAmount) },
    { label: `상장수수료 ${summary.feeRate}%`, value: formatWon(summary.feeAmount) },
    { label: `배송수수료 ${summary.deliveryFeeRate}%`, value: formatWon(summary.deliveryFeeAmount) },
  ];

  return (
    <div className="grid grid-cols-[4fr_3fr] gap-4">
      <StatGroup title="경매 규모" stats={scale} />
      <StatGroup title="금액" stats={money} />
    </div>
  );
}
