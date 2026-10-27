'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { DailyRow, DashboardSummary } from '../types';
import { bidRateOf, formatCompactWon, formatCount, formatPercent, formatWon, shortDate } from '../lib/format';
import { Panel, StatTable, type StatColumn } from './StatTable';

interface DailyTrendCardProps {
  daily: DailyRow[];
  summary: DashboardSummary;
}

interface ChartPoint extends DailyRow {
  label: string;
  bidRate: number;
}

const BAR_FILL = '#17171c';
const LINE_STROKE = '#9494a0';
const GRID_STROKE = '#eeeef2';
const AXIS_TICK = { fontSize: 11, fill: '#6e6e7a' };

/** 낙찰률 축 윗값 · 0~100 고정이면 낙찰률이 낮은 날 선이 바닥에 붙는다. 5% 단위로 올림, 최소 5% */
const rateAxisMax = (dataMax: number) => Math.min(100, Math.max(5, Math.ceil(dataMax / 5) * 5));

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartPoint }>;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-[2px] border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-sm">
      <p className="mb-1 font-semibold text-slate-900">{point.date}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 tabular-nums text-slate-600">
        <dt>낙찰대금</dt>
        <dd className="text-right font-medium text-slate-900">{formatWon(point.wonAmount)}</dd>
        <dt>낙찰률</dt>
        <dd className="text-right font-medium text-slate-900">{formatPercent(point.bidRate)}</dd>
        <dt>경매 두수</dt>
        <dd className="text-right">{formatCount(point.cattleCount, '두')}</dd>
        <dt>낙찰 / 경매 건수</dt>
        <dd className="text-right">
          {point.wonCount} / {point.partCount}건
        </dd>
      </dl>
    </div>
  );
}

const DAILY_COLUMNS: StatColumn<DailyRow>[] = [
  { key: 'date', header: '일자', render: (row) => row.date },
  { key: 'cattleCount', header: '경매 두수', align: 'right', render: (row) => formatCount(row.cattleCount, '두') },
  { key: 'partCount', header: '경매 건수', align: 'right', render: (row) => formatCount(row.partCount, '건') },
  { key: 'wonCount', header: '낙찰 건수', align: 'right', render: (row) => formatCount(row.wonCount, '건') },
  { key: 'bidRate', header: '낙찰률', align: 'right', render: (row) => formatPercent(bidRateOf(row.wonCount, row.partCount)) },
  { key: 'wonAmount', header: '낙찰대금', align: 'right', render: (row) => formatWon(row.wonAmount) },
  { key: 'feeAmount', header: '상장수수료', align: 'right', render: (row) => formatWon(row.feeAmount) },
  { key: 'deliveryFeeAmount', header: '배송수수료', align: 'right', render: (row) => formatWon(row.deliveryFeeAmount) },
];

/** 일별 추이 · 막대(낙찰대금) + 선(낙찰률), 상세 표는 접어 둔다 */
export function DailyTrendCard({ daily, summary }: DailyTrendCardProps) {
  const [isTableOpen, setIsTableOpen] = useState(false);

  // API 는 최신 날짜가 먼저 · 차트는 왼쪽이 과거여야 읽힌다
  const points = useMemo<ChartPoint[]>(
    () =>
      [...daily]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((row) => ({ ...row, label: shortDate(row.date), bidRate: bidRateOf(row.wonCount, row.partCount) })),
    [daily],
  );

  const columns = useMemo<StatColumn<DailyRow>[]>(
    () =>
      DAILY_COLUMNS.map((column) => ({
        ...column,
        footer: {
          date: undefined,
          cattleCount: formatCount(summary.cattleCount, '두'),
          partCount: formatCount(summary.partCount, '건'),
          wonCount: formatCount(summary.wonCount, '건'),
          bidRate: formatPercent(bidRateOf(summary.wonCount, summary.partCount)),
          wonAmount: formatWon(summary.wonAmount),
          feeAmount: formatWon(summary.feeAmount),
          deliveryFeeAmount: formatWon(summary.deliveryFeeAmount),
        }[column.key],
      })),
    [summary],
  );

  const toggle = (
    <button
      type="button"
      onClick={() => setIsTableOpen((open) => !open)}
      aria-expanded={isTableOpen}
      className="flex items-center gap-1 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-900"
    >
      일별 상세 표
      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isTableOpen && 'rotate-180')} />
    </button>
  );

  return (
    <Panel title="일별 경매 추이" aside={daily.length > 0 ? toggle : undefined}>
      {points.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-slate-400">조회 기간에 경매 데이터가 없습니다.</p>
      ) : (
        <>
          <div className="flex items-center gap-4 px-2 pt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[1px]" style={{ background: BAR_FILL }} />
              낙찰대금
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3" style={{ background: LINE_STROKE }} />
              낙찰률
            </span>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 16, right: 8, bottom: 0, left: 8 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
                <YAxis
                  yAxisId="amount"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value: number) => formatCompactWon(value)}
                />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  domain={[0, rateAxisMax]}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f5f5f7' }} />
                <Bar yAxisId="amount" dataKey="wonAmount" fill={BAR_FILL} radius={[2, 2, 0, 0]} maxBarSize={36} />
                <Line
                  yAxisId="rate"
                  type="linear"
                  dataKey="bidRate"
                  stroke={LINE_STROKE}
                  strokeWidth={1.5}
                  dot={{ r: 3, fill: '#ffffff', stroke: LINE_STROKE, strokeWidth: 1.5 }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {isTableOpen && (
            <div className="mt-2 border-t border-slate-100 pt-1">
              <StatTable columns={columns} rows={daily} rowKey={(row) => row.date} />
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
