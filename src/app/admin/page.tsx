'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useDashboard } from '@/features/admin-dashboard/hooks/useDashboard';
import { DEFAULT_PRESET, rangeForPreset, type DateRange } from '@/features/admin-dashboard/lib/period';
import { downloadDashboardExcel } from '@/features/admin-dashboard/lib/excel';
import { EMPTY_SUMMARY } from '@/features/admin-dashboard/types';
import { PeriodFilter } from '@/features/admin-dashboard/components/PeriodFilter';
import { SummaryCards } from '@/features/admin-dashboard/components/SummaryCards';
import { DailyTrendCard } from '@/features/admin-dashboard/components/DailyTrendCard';
import { DashboardSkeleton } from '@/features/admin-dashboard/components/DashboardSkeleton';
import { CompanyTable, DealerTable, GradeTable, PartTable } from '@/features/admin-dashboard/components/BreakdownTables';

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DateRange>(() => rangeForPreset(DEFAULT_PRESET));
  const { data, isLoading, isError, refetch } = useDashboard(range);

  const summary = data?.summary ?? EMPTY_SUMMARY;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-slate-900">대시보드</h1>
        <div className="flex items-center gap-3">
          <PeriodFilter applied={range} onApply={setRange} />
          <span className="h-5 w-px bg-slate-200" aria-hidden />
          <button
            type="button"
            onClick={() => data && downloadDashboardExcel(data, range)}
            disabled={!data}
            className="flex h-8 items-center gap-1.5 rounded-[2px] border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900 disabled:cursor-default disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            엑셀
          </button>
        </div>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-[2px] border border-slate-200 bg-white py-20 text-[13px] text-slate-500">
          대시보드를 불러오지 못했습니다.
          <button
            type="button"
            onClick={() => refetch()}
            className="h-8 rounded-[2px] bg-slate-900 px-3.5 text-[12px] font-medium text-white hover:bg-slate-800"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <SummaryCards summary={summary} />
          <DailyTrendCard daily={data?.daily ?? []} summary={summary} />
          <div className="grid grid-cols-2 gap-6">
            <PartTable rows={data?.byPart ?? []} summary={summary} />
            <GradeTable rows={data?.byGrade ?? []} summary={summary} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <CompanyTable rows={data?.byCompany ?? []} summary={summary} />
            <DealerTable rows={data?.byDealer ?? []} summary={summary} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
