'use client';

import React, { useState } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface ByPartData {
  name: string;
  partCount: number;
  count: number;
  amount: number;
  weight: number;
  bidRate: number;
  ratio: number;
}

interface DashboardResponse {
  summary: {
    partCount: number;
    wonCount: number;
  };
  byPart: ByPartData[];
}

export default function CompanyAuctionResultsPage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  const companyId = session?.company?.id || '';

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchStartDate, setSearchStartDate] = useState(todayStr);
  const [searchEndDate, setSearchEndDate] = useState(todayStr);

  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };

  const { data, isLoading } = useQuery<DashboardResponse>({
    queryKey: ['company-results', companyId, searchStartDate, searchEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard?startDate=${searchStartDate}&endDate=${searchEndDate}&companyId=${companyId}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!companyId,
  });

  const byPart = data?.byPart ?? [];
  const summary = data?.summary ?? { partCount: 0, wonCount: 0 };
  const failedCount = summary.partCount - summary.wonCount;
  const avgRate = summary.partCount > 0 ? Math.round((summary.wonCount / summary.partCount) * 100 * 10) / 10 : 0;

  const thClass = "px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border border-gray-200";
  const tdClass = "px-2 py-1.5 text-xs text-gray-600 text-center whitespace-nowrap border border-gray-200";

  const handleExcelDownload = () => {
    if (byPart.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const excelData = [
      ...byPart.map(p => ({
        '부위': p.name,
        '상장': p.partCount,
        '낙찰': p.count,
        '낙찰률': `${p.bidRate}%`,
      })),
      {
        '부위': '합계',
        '상장': summary.partCount,
        '낙찰': summary.wonCount,
        '낙찰률': `${avgRate}%`,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '낙찰률 조회');

    const fileName = `${companyName}_낙찰률조회_${searchStartDate}_${searchEndDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 낙찰률 조회</h1>
        <p className="text-sm text-gray-500 mt-1">{companyName}</p>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">기간</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
            >
              조회
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayStr);
                setEndDate(todayStr);
                setSearchStartDate(todayStr);
                setSearchEndDate(todayStr);
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>
        </div>
      </div>

      {/* 요약 정보 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 상장</span>
            <span className="text-sm font-semibold text-gray-900">{summary.partCount}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 낙찰</span>
            <span className="text-sm font-semibold text-gray-900">{summary.wonCount}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 유찰</span>
            <span className="text-sm font-semibold text-gray-900">{failedCount}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">평균 낙찰률</span>
            <span className="text-sm font-semibold text-gray-900">{avgRate}%</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">데이터 조회 중...</span>
          </div>
        ) : byPart.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm text-gray-500">조회된 데이터가 없습니다.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`${thClass} bg-gray-50 min-w-[100px]`}>부위</th>
                  <th className={`${thClass} bg-gray-50 min-w-[80px]`}>상장</th>
                  <th className={`${thClass} bg-gray-50 min-w-[80px]`}>낙찰</th>
                  <th className={`${thClass} bg-gray-50 min-w-[80px]`}>낙찰률</th>
                </tr>
              </thead>
              <tbody>
                {byPart.map((part) => (
                  <tr key={part.name} className="hover:bg-gray-50">
                    <td className={`${tdClass} font-medium`}>{part.name}</td>
                    <td className={tdClass}>{part.partCount}</td>
                    <td className={`${tdClass} ${part.count > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {part.count}
                    </td>
                    <td className={`${tdClass} text-gray-600`}>
                      {part.bidRate}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-white font-semibold border-t-2 border-gray-200">
                  <td className={`${tdClass} font-bold`}>합계</td>
                  <td className={tdClass}>{summary.partCount}</td>
                  <td className={`${tdClass} text-gray-900`}>{summary.wonCount}</td>
                  <td className={`${tdClass} font-bold`}>{avgRate}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CompanyLayout>
  );
}
