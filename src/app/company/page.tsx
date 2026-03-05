'use client';

import React, { useState } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface DashboardData {
  summary: {
    cattleCount: number;
    partCount: number;
    wonCount: number;
    wonAmount: number;
    feeRate: number;
    feeAmount: number;
    deliveryFeeRate: number;
    deliveryFeeAmount: number;
  };
  daily: {
    date: string;
    cattleCount: number;
    partCount: number;
    wonCount: number;
    wonAmount: number;
    feeAmount: number;
    deliveryFeeAmount: number;
  }[];
  byPart: {
    name: string;
    partCount: number;
    count: number;
    amount: number;
    weight: number;
    bidRate: number;
    ratio: number;
  }[];
  byGrade: {
    name: string;
    cattleCount: number;
    partCount: number;
    wonCount: number;
    wonAmount: number;
    weight: number;
    bidRate: number;
    ratio: number;
  }[];
  byDealer: {
    name: string;
    cattleCount: number;
    bidCount: number;
    wonCount: number;
    wonAmount: number;
    bidRate: number;
    ratio: number;
  }[];
}

export default function CompanyDashboardPage() {
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

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['company-dashboard', companyId, searchStartDate, searchEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard?startDate=${searchStartDate}&endDate=${searchEndDate}&companyId=${companyId}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!companyId,
  });

  const summary = data?.summary ?? { cattleCount: 0, partCount: 0, wonCount: 0, wonAmount: 0, feeRate: 1.5, feeAmount: 0, deliveryFeeRate: 0, deliveryFeeAmount: 0 };
  const daily = data?.daily ?? [];
  const byPart = data?.byPart ?? [];
  const byGrade = data?.byGrade ?? [];
  const byDealer = data?.byDealer ?? [];

  const handleExcelDownload = () => {
    const wb = XLSX.utils.book_new();

    const dailySheet = XLSX.utils.json_to_sheet(daily.map(d => ({
      '일자': d.date,
      '경매 두수': d.cattleCount,
      '경매 건수': d.partCount,
      '낙찰 건수': d.wonCount,
      '낙찰대금(원)': d.wonAmount,
      '상장수수료(원)': d.feeAmount,
      '배송수수료(원)': d.deliveryFeeAmount,
    })));
    XLSX.utils.book_append_sheet(wb, dailySheet, '일별경매');

    const partSheet = XLSX.utils.json_to_sheet(byPart.map(p => ({
      '부위': p.name,
      '경매 건수': p.partCount,
      '낙찰 건수': p.count,
      '낙찰대금(원)': p.amount,
      '중량(kg)': Math.round(p.weight * 10) / 10,
      '낙찰률(%)': p.bidRate,
      '비중(%)': p.ratio,
    })));
    XLSX.utils.book_append_sheet(wb, partSheet, '부위별경매');

    const gradeSheet = XLSX.utils.json_to_sheet(byGrade.map(g => ({
      '등급': g.name,
      '경매 두수': g.cattleCount,
      '경매 건수': g.partCount,
      '낙찰 건수': g.wonCount,
      '낙찰대금(원)': g.wonAmount,
      '낙찰률(%)': g.bidRate,
      '비중(%)': g.ratio,
    })));
    XLSX.utils.book_append_sheet(wb, gradeSheet, '등급별경매');

    const dealerSheet = XLSX.utils.json_to_sheet(byDealer.map((d, idx) => ({
      '순위': idx + 1,
      '중도매인': d.name,
      '입찰 수': d.bidCount,
      '낙찰 수': d.wonCount,
      '낙찰대금(원)': d.wonAmount,
      '낙찰률(%)': d.bidRate,
      '비중(%)': d.ratio,
    })));
    XLSX.utils.book_append_sheet(wb, dealerSheet, '중도매인별낙찰');

    XLSX.writeFile(wb, `${companyName}_운영현황_${searchStartDate}_${searchEndDate}.xlsx`);
  };

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
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
          <div className="grid grid-cols-6 gap-4 mb-6">
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">경매 두수</div>
              <div className="text-2xl font-bold text-gray-900">{summary.cattleCount}두</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">경매 건수</div>
              <div className="text-2xl font-bold text-gray-900">{summary.partCount.toLocaleString()}건</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">낙찰 건수</div>
              <div className="text-2xl font-bold text-gray-900">{summary.wonCount.toLocaleString()}건</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">낙찰대금</div>
              <div className="text-2xl font-bold text-gray-900">{summary.wonAmount.toLocaleString()}원</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">상장수수료 ({summary.feeRate}%)</div>
              <div className="text-2xl font-bold text-gray-900">{summary.feeAmount.toLocaleString()}원</div>
            </div>
            <div className="bg-white border border-gray-200 p-4">
              <div className="text-sm text-gray-500 mb-1">배송수수료 ({summary.deliveryFeeRate}%)</div>
              <div className="text-2xl font-bold text-gray-900">{summary.deliveryFeeAmount.toLocaleString()}원</div>
            </div>
          </div>

          {/* 일별 경매 추이 */}
          <div className="bg-white border border-gray-200 p-4 mb-6">
            <h2 className="text-sm font-bold text-gray-800 mb-4">일별 경매 추이</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">일자</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 두수</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 건수</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">상장수수료</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">배송수수료</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400 border border-gray-200">
                        조회된 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {daily.map((day) => (
                        <tr key={day.date} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.date}</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.cattleCount}두</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.partCount}건</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.wonCount}건</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200 font-medium">{day.wonAmount.toLocaleString()}원</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.feeAmount.toLocaleString()}원</td>
                          <td className="px-4 py-2 text-xs text-center border border-gray-200">{day.deliveryFeeAmount.toLocaleString()}원</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">합계</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.cattleCount}두</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.partCount.toLocaleString()}건</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.wonCount.toLocaleString()}건</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.wonAmount.toLocaleString()}원</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.feeAmount.toLocaleString()}원</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.deliveryFeeAmount.toLocaleString()}원</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 부위별 경매현황 */}
            <div className="bg-white border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-800 mb-4">부위별 경매현황</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">순위</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">부위</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">경매 건수</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰 건수</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰대금</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰률</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">비중</th>
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
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{idx + 1}</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap font-medium">{part.name}</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{part.partCount}건</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{part.count}건</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{part.amount.toLocaleString()}원</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{part.bidRate}%</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{part.ratio}%</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">합계</td>
                          <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{summary.partCount.toLocaleString()}건</td>
                          <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{summary.wonCount}건</td>
                          <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{summary.wonAmount.toLocaleString()}원</td>
                          <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">
                            {summary.partCount > 0 ? (summary.wonCount / summary.partCount * 100).toFixed(1) : 0}%
                          </td>
                          <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">100%</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 오른쪽: 등급별 + 중도매인별 */}
            <div className="flex flex-col gap-6">
              {/* 등급별 경매현황 */}
              <div className="bg-white border border-gray-200 p-4">
                <h2 className="text-sm font-bold text-gray-800 mb-4">등급별 경매현황</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">등급</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">경매 두수</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">경매 건수</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰 건수</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰대금</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰률</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">비중</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byGrade.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-xs text-gray-400 border border-gray-200">데이터 없음</td>
                        </tr>
                      ) : (
                        <>
                          {byGrade.map((grade) => (
                            <tr key={grade.name} className="hover:bg-gray-50">
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap font-medium">{grade.name}</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{grade.cattleCount}두</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{grade.partCount}건</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{grade.wonCount}건</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{grade.wonAmount.toLocaleString()}원</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{grade.bidRate}%</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{grade.ratio}%</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-bold">
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">합계</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{summary.cattleCount}두</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{summary.partCount.toLocaleString()}건</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{summary.wonCount.toLocaleString()}건</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{summary.wonAmount.toLocaleString()}원</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">
                              {summary.partCount > 0 ? (summary.wonCount / summary.partCount * 100).toFixed(1) : 0}%
                            </td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">100%</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 중도매인별 낙찰현황 */}
              <div className="bg-white border border-gray-200 p-4">
                <h2 className="text-sm font-bold text-gray-800 mb-4">중도매인별 낙찰현황</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">순위</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">중도매인</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">입찰 수</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰 수</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰대금</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">낙찰률</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50 whitespace-nowrap">비중</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byDealer.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-xs text-gray-400 border border-gray-200">데이터 없음</td>
                        </tr>
                      ) : (
                        <>
                          {byDealer.map((dealer, idx) => (
                            <tr key={dealer.name} className="hover:bg-gray-50">
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{idx + 1}</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap font-medium">{dealer.name}</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{dealer.bidCount}건</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{dealer.wonCount}건</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{dealer.wonAmount.toLocaleString()}원</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{dealer.bidRate}%</td>
                              <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{dealer.ratio}%</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-bold">
                            <td colSpan={2} className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">합계</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">
                              {byDealer.reduce((s, d) => s + d.bidCount, 0)}건
                            </td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">
                              {byDealer.reduce((s, d) => s + d.wonCount, 0)}건
                            </td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">{summary.wonAmount.toLocaleString()}원</td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">
                              {(() => { const totalBid = byDealer.reduce((s, d) => s + d.bidCount, 0); const totalWon = byDealer.reduce((s, d) => s + d.wonCount, 0); return totalBid > 0 ? (totalWon / totalBid * 100).toFixed(1) : 0; })()}%
                            </td>
                            <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">100%</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </CompanyLayout>
  );
}
