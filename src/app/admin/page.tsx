'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
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
  }[];
  byPart: {
    name: string;
    count: number;
    amount: number;
    weight: number;
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
  byCompany: {
    name: string;
    cattleCount: number;
    partCount: number;
    wonCount: number;
    wonAmount: number;
    weight: number;
    bidRate: number;
    ratio: number;
  }[];
}

export default function AdminDashboardPage() {
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
    queryKey: ['admin-dashboard', searchStartDate, searchEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard?startDate=${searchStartDate}&endDate=${searchEndDate}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const summary = data?.summary ?? { cattleCount: 0, partCount: 0, wonCount: 0, wonAmount: 0, feeRate: 1.5, feeAmount: 0, deliveryFeeRate: 0, deliveryFeeAmount: 0 };
  const daily = data?.daily ?? [];
  const byPart = data?.byPart ?? [];
  const byGrade = data?.byGrade ?? [];
  const byCompany = data?.byCompany ?? [];

  const handleExcelDownload = () => {
    const wb = XLSX.utils.book_new();

    const dailySheet = XLSX.utils.json_to_sheet(daily.map(d => ({
      '일자': d.date,
      '경매 두수': d.cattleCount,
      '경매 건수': d.partCount,
      '낙찰 건수': d.wonCount,
      '낙찰대금(원)': d.wonAmount,
      '상장수수료(원)': d.feeAmount,
    })));
    XLSX.utils.book_append_sheet(wb, dailySheet, '일별경매');

    const partSheet = XLSX.utils.json_to_sheet(byPart.map(p => ({
      '부위': p.name,
      '낙찰대금(원)': p.amount,
      '중량(kg)': Math.round(p.weight * 10) / 10,
      '건수': p.count,
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

    const companySheet = XLSX.utils.json_to_sheet(byCompany.map(c => ({
      '상장업체': c.name,
      '경매 두수': c.cattleCount,
      '경매 건수': c.partCount,
      '낙찰 건수': c.wonCount,
      '낙찰대금(원)': c.wonAmount,
      '낙찰률(%)': c.bidRate,
      '비중(%)': c.ratio,
    })));
    XLSX.utils.book_append_sheet(wb, companySheet, '상장업체별경매');

    XLSX.writeFile(wb, `플랫폼운영현황_${searchStartDate}_${searchEndDate}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
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
                  </tr>
                </thead>
                <tbody>
                  {daily.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400 border border-gray-200">
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
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">합계</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.cattleCount}두</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.partCount.toLocaleString()}건</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.wonCount.toLocaleString()}건</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.wonAmount.toLocaleString()}원</td>
                        <td className="px-4 py-2 text-xs text-center border border-gray-200">{summary.feeAmount.toLocaleString()}원</td>
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
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">순위</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">부위</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPart.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-xs text-gray-400 border border-gray-200">데이터 없음</td>
                      </tr>
                    ) : (
                      <>
                        {byPart.map((part, idx) => (
                          <tr key={part.name} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{idx + 1}</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200 font-medium">{part.name}</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.count}건</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.amount.toLocaleString()}원</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{part.ratio}%</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="px-3 py-2 text-xs text-center border border-gray-200">합계</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonCount}건</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonAmount.toLocaleString()}원</td>
                          <td className="px-3 py-2 text-xs text-center border border-gray-200">100%</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 오른쪽: 등급별 + 상장업체별 */}
            <div className="flex flex-col gap-6">
              {/* 등급별 경매현황 */}
              <div className="bg-white border border-gray-200 p-4">
                <h2 className="text-sm font-bold text-gray-800 mb-4">등급별 경매현황</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">등급</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 두수</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 건수</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰률</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
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
                              <td className="px-3 py-2 text-xs text-center border border-gray-200 font-medium">{grade.name}</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.cattleCount}두</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.partCount}건</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.wonCount}건</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.wonAmount.toLocaleString()}원</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.bidRate}%</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{grade.ratio}%</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-bold">
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">합계</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.cattleCount}두</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.partCount.toLocaleString()}건</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonCount.toLocaleString()}건</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonAmount.toLocaleString()}원</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">
                              {summary.partCount > 0 ? (summary.wonCount / summary.partCount * 100).toFixed(1) : 0}%
                            </td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">100%</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 상장업체별 경매현황 */}
              <div className="bg-white border border-gray-200 p-4">
                <h2 className="text-sm font-bold text-gray-800 mb-4">상장업체별 경매현황</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">순위</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">상장업체</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 두수</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">경매 건수</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰률</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCompany.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-xs text-gray-400 border border-gray-200">데이터 없음</td>
                        </tr>
                      ) : (
                        <>
                          {byCompany.map((company, idx) => (
                            <tr key={company.name} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{idx + 1}</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200 font-medium">{company.name}</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.cattleCount}두</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.partCount}건</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.wonCount}건</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.wonAmount.toLocaleString()}원</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.bidRate}%</td>
                              <td className="px-3 py-2 text-xs text-center border border-gray-200">{company.ratio}%</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-bold">
                            <td colSpan={2} className="px-3 py-2 text-xs text-center border border-gray-200">합계</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.cattleCount}두</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.partCount.toLocaleString()}건</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonCount.toLocaleString()}건</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">{summary.wonAmount.toLocaleString()}원</td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">
                              {summary.partCount > 0 ? (summary.wonCount / summary.partCount * 100).toFixed(1) : 0}%
                            </td>
                            <td className="px-3 py-2 text-xs text-center border border-gray-200">100%</td>
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
    </AdminLayout>
  );
}
