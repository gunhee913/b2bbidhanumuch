'use client';

import type { CompanyRow, DashboardSummary, DealerRow, GradeRow, PartRow } from '../types';
import { bidRateOf, formatCount, formatPercent, formatWon } from '../lib/format';
import { Panel, StatTable, type StatColumn } from './StatTable';

const TABLE_MAX_HEIGHT = 420;

const rankColumn = <T,>(): StatColumn<T> => ({
  key: 'rank',
  header: '순위',
  width: '44px',
  render: () => null,
});

/** 순위 열은 행 인덱스가 필요해서 rows 를 번호 붙인 형태로 바꿔 넘긴다 */
const withRank = <T,>(rows: T[]) => rows.map((row, index) => ({ ...row, rank: index + 1 }));

type Ranked<T> = T & { rank: number };

export function PartTable({ rows, summary }: { rows: PartRow[]; summary: DashboardSummary }) {
  const columns: StatColumn<Ranked<PartRow>>[] = [
    { ...rankColumn<Ranked<PartRow>>(), render: (row) => <span className="text-slate-400">{row.rank}</span> },
    { key: 'name', header: '부위', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'partCount', header: '경매 건수', align: 'right', render: (row) => formatCount(row.partCount, '건'), footer: formatCount(summary.partCount, '건') },
    { key: 'count', header: '낙찰 건수', align: 'right', render: (row) => formatCount(row.count, '건'), footer: formatCount(summary.wonCount, '건') },
    { key: 'amount', header: '낙찰대금', align: 'right', render: (row) => formatWon(row.amount), footer: formatWon(summary.wonAmount) },
    { key: 'bidRate', header: '낙찰률', align: 'right', render: (row) => formatPercent(row.bidRate), footer: formatPercent(bidRateOf(summary.wonCount, summary.partCount)) },
    { key: 'ratio', header: '비중', align: 'right', render: (row) => formatPercent(row.ratio), footer: '100%' },
  ];
  return (
    <Panel title="부위별 경매현황">
      <StatTable columns={columns} rows={withRank(rows)} rowKey={(row) => row.name} footerLabelSpan={2} maxHeight={TABLE_MAX_HEIGHT} />
    </Panel>
  );
}

export function GradeTable({ rows, summary }: { rows: GradeRow[]; summary: DashboardSummary }) {
  const columns: StatColumn<GradeRow>[] = [
    { key: 'name', header: '등급', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'cattleCount', header: '경매 두수', align: 'right', render: (row) => formatCount(row.cattleCount, '두'), footer: formatCount(summary.cattleCount, '두') },
    { key: 'partCount', header: '경매 건수', align: 'right', render: (row) => formatCount(row.partCount, '건'), footer: formatCount(summary.partCount, '건') },
    { key: 'wonCount', header: '낙찰 건수', align: 'right', render: (row) => formatCount(row.wonCount, '건'), footer: formatCount(summary.wonCount, '건') },
    { key: 'wonAmount', header: '낙찰대금', align: 'right', render: (row) => formatWon(row.wonAmount), footer: formatWon(summary.wonAmount) },
    { key: 'bidRate', header: '낙찰률', align: 'right', render: (row) => formatPercent(row.bidRate), footer: formatPercent(bidRateOf(summary.wonCount, summary.partCount)) },
    { key: 'ratio', header: '비중', align: 'right', render: (row) => formatPercent(row.ratio), footer: '100%' },
  ];
  return (
    <Panel title="등급별 경매현황">
      <StatTable columns={columns} rows={rows} rowKey={(row) => row.name} maxHeight={TABLE_MAX_HEIGHT} />
    </Panel>
  );
}

export function CompanyTable({ rows, summary }: { rows: CompanyRow[]; summary: DashboardSummary }) {
  const columns: StatColumn<Ranked<CompanyRow>>[] = [
    { ...rankColumn<Ranked<CompanyRow>>(), render: (row) => <span className="text-slate-400">{row.rank}</span> },
    { key: 'name', header: '상장업체', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'cattleCount', header: '경매 두수', align: 'right', render: (row) => formatCount(row.cattleCount, '두'), footer: formatCount(summary.cattleCount, '두') },
    { key: 'partCount', header: '경매 건수', align: 'right', render: (row) => formatCount(row.partCount, '건'), footer: formatCount(summary.partCount, '건') },
    { key: 'wonCount', header: '낙찰 건수', align: 'right', render: (row) => formatCount(row.wonCount, '건'), footer: formatCount(summary.wonCount, '건') },
    { key: 'wonAmount', header: '낙찰대금', align: 'right', render: (row) => formatWon(row.wonAmount), footer: formatWon(summary.wonAmount) },
    { key: 'bidRate', header: '낙찰률', align: 'right', render: (row) => formatPercent(row.bidRate), footer: formatPercent(bidRateOf(summary.wonCount, summary.partCount)) },
    { key: 'ratio', header: '비중', align: 'right', render: (row) => formatPercent(row.ratio), footer: '100%' },
  ];
  return (
    <Panel title="상장업체별 경매현황">
      <StatTable columns={columns} rows={withRank(rows)} rowKey={(row) => row.name} footerLabelSpan={2} maxHeight={TABLE_MAX_HEIGHT} />
    </Panel>
  );
}

export function DealerTable({ rows, summary }: { rows: DealerRow[]; summary: DashboardSummary }) {
  const totalBids = rows.reduce((sum, row) => sum + row.bidCount, 0);
  const totalWon = rows.reduce((sum, row) => sum + row.wonCount, 0);
  const columns: StatColumn<Ranked<DealerRow>>[] = [
    { ...rankColumn<Ranked<DealerRow>>(), render: (row) => <span className="text-slate-400">{row.rank}</span> },
    { key: 'name', header: '중도매인', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'bidCount', header: '입찰 수', align: 'right', render: (row) => formatCount(row.bidCount, '건'), footer: formatCount(totalBids, '건') },
    { key: 'wonCount', header: '낙찰 수', align: 'right', render: (row) => formatCount(row.wonCount, '건'), footer: formatCount(totalWon, '건') },
    { key: 'wonAmount', header: '낙찰대금', align: 'right', render: (row) => formatWon(row.wonAmount), footer: formatWon(summary.wonAmount) },
    { key: 'bidRate', header: '낙찰률', align: 'right', render: (row) => formatPercent(row.bidRate), footer: formatPercent(bidRateOf(totalWon, totalBids)) },
    { key: 'ratio', header: '비중', align: 'right', render: (row) => formatPercent(row.ratio), footer: '100%' },
  ];
  return (
    <Panel title="중도매인별 낙찰현황">
      <StatTable columns={columns} rows={withRank(rows)} rowKey={(row) => row.name} footerLabelSpan={2} maxHeight={TABLE_MAX_HEIGHT} />
    </Panel>
  );
}
