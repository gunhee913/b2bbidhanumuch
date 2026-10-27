'use client';

import { useQuery } from '@tanstack/react-query';
import type { DashboardData } from '../types';
import { isValidRange, type DateRange } from '../lib/period';

const fetchDashboard = async ({ start, end }: DateRange): Promise<DashboardData> => {
  const res = await fetch(`/api/admin/dashboard?startDate=${start}&endDate=${end}`);
  if (!res.ok) throw new Error('대시보드 조회에 실패했습니다.');
  return res.json();
};

export function useDashboard(range: DateRange) {
  return useQuery({
    queryKey: ['admin-dashboard', range.start, range.end],
    queryFn: () => fetchDashboard(range),
    enabled: isValidRange(range),
  });
}
