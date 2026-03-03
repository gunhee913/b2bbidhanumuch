'use client';

import React, { useState } from 'react';
import DealerLayout from '@/components/dealer/DealerLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface DealerDashboardData {
  summary: {
    bidCount: number;
    wonCount: number;
    wonAmount: number;
    wonRate: number;
  };
  daily: {
    date: string;
    bidCount: number;
    wonCount: number;
    wonAmount: number;
  }[];
  byPart: {
    name: string;
    bidCount: number;
    wonCount: number;
    wonAmount: number;
    weight: number;
    wonRate: number;
    ratio: number;
  }[];
  byPartner: {
    name: string;
    wonCount: number;
    wonAmount: number;
    weight: number;
    ratio: number;
  }[];
}

export default function DealerDashboardPage() {
  const { data: session } = useSession();
  const dealerId = session?.dealer?.id;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchStartDate, setSearchStartDate] = useState(todayStr);
  const [searchEndDate, setSearchEndDate] = useState(todayStr);

  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };

  const { data, isLoading } = useQuery<DealerDashboardData>({
    queryKey: ['dealer-dashboard', dealerId, searchStartDate, searchEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/dealer/dashboard?dealerId=${dealerId}&startDate=${searchStartDate}&endDate=${searchEndDate}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!dealerId,
  });

  const summary = data?.summary ?? { bidCount: 0, wonCount: 0, wonAmount: 0, wonRate: 0 };
  const daily = data?.daily ?? [];
  const byPart = data?.byPart ?? [];
  const byPartner = data?.byPartner ?? [];

  const handleExcelDownload = () => {
    const wb = XLSX.utils.book_new();

    const dailySheet = XLSX.utils.json_to_sheet(daily.map(d => ({
      '일자': d.date,
      '입찰 수': d.bidCount,
      '낙찰 수': d.wonCount,
      '낙찰대금(원)': d.wonAmount,
    })));
    XLSX.utils.book_append_sheet(wb, dailySheet, '일별추이');

    const partSheet = XLSX.utils.json_to_sheet(byPart.map(p => ({
      '부위': p.name,
      '입찰 수': p.bidCount,
      '낙찰 수': p.wonCount,
      '낙찰대금(원)': p.wonAmount,
      '중량(kg)': Math.round(p.weight * 10) / 10,
      '낙찰률(%)': p.wonRate,
      '비중(%)': p.ratio,
    })));
    XLSX.utils.book_append_sheet(wb, partSheet, '부위별낙찰');

    const companySheet = XLSX.utils.json_to_sheet(byPartner.map(c => ({
      '거래처': c.name,
      '낙찰 수': c.wonCount,
      '낙찰대금(원)': c.wonAmount,
      '중량(kg)': Math.round(c.weight * 10) / 10,
      '비중(%)': c.ratio,
    })));
    XLSX.utils.book_append_sheet(wb, companySheet, '거래처별낙찰');

    XLSX.writeFile(wb, `중도매인_대시보드_${searchStartDate}_${searchEndDate}.xlsx`);
  };

  return (
    <DealerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
      </div>

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

          <div className="ml-auto">
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

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">입찰 수</div>
              <div className="text-2xl font-bold text-gray-900">{summary.bidCount.toLocaleString()}건</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">낙찰 수</div>
              <div className="text-2xl font-bold text-gray-900">{summary.wonCount.toLocaleString()}건</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">낙찰대금</div>
              <div className="text-2xl font-bold text-gray-900">{summary.wonAmount.toLocaleString()}원</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">낙찰률</div>
              <div className="text-2xl font-bold text-gray-900">{summary.wonRate}%</div>
            </div>
          </div>

          {/* 일별 입찰/낙찰 추이 */}
          <div className="bg-white border border-gray-200 p-4 mb-6">
            <h2 className="text-sm font-bold text-gray-800 mb-4">일별 입찰/낙찰 추이</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">일자</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">입찰 수</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 수</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-400 border border-gray-200">
                        조회된 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {daily.map((day) => (
                        <tr key={day.date} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.date}</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.bidCount}건</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.wonCount}건</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200 font-medium">{day.wonAmount.toLocaleString()}원</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">합계</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.bidCount.toLocaleString()}건</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.wonCount.toLocaleString()}건</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.wonAmount.toLocaleString()}원</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 부위별 낙찰현황 */}
            <div className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-800 mb-4">부위별 낙찰현황</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">순위</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">부위</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">입찰 수</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 수</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰률</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPart.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-xs text-gray-400 border border-gray-200">데이터 없음</td>
                      </tr>
                    ) : (
                      <>
                        {byPart.map((part, idx) => (
                          <tr key={part.name} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{idx + 1}</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200 font-medium">{part.name}</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.bidCount}건</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.wonCount}건</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.wonAmount.toLocaleString()}원</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.wonRate}%</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.ratio}%</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="px-3 py-2 text-xs text-center border border-gray-200">합계</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.bidCount.toLocaleString()}건</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonCount.toLocaleString()}건</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonAmount.toLocaleString()}원</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonRate}%</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">100%</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 거래처별 낙찰현황 */}
            <div className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-800 mb-4">거래처별 낙찰현황</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">순위</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">거래처</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 수</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">중량</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPartner.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-xs text-gray-400 border border-gray-200">데이터 없음</td>
                      </tr>
                    ) : (
                      <>
                        {byPartner.map((partner, idx) => (
                          <tr key={partner.name} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{idx + 1}</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200 font-medium">{partner.name}</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{partner.wonCount}건</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{partner.wonAmount.toLocaleString()}원</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{(Math.round(partner.weight * 10) / 10)}kg</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{partner.ratio}%</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="px-3 py-2 text-xs text-center border border-gray-200">합계</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonCount.toLocaleString()}건</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonAmount.toLocaleString()}원</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200"></td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">100%</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </DealerLayout>
  );
}
