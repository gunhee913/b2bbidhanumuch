'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, Trophy } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateDealerSettlements, COMPANIES } from '@/constants/dealerSettlement';

type SortKey = 'amount' | 'count' | 'weight' | 'bidRate';

export default function CompanyRankingPage() {
  const [startDate, setStartDate] = useState('2026-01-16');
  const [endDate, setEndDate] = useState('2026-01-21');
  const [sortBy, setSortBy] = useState<SortKey>('amount');

  // 낙찰 데이터 가져오기
  const settlements = useMemo(() => generateDealerSettlements(), []);

  // 상장업체별 순위 데이터
  const companyRanking = useMemo(() => {
    const companyData: Record<string, {
      amount: number;
      weight: number;
      count: number;
      totalListed: number;
    }> = {};

    // 초기화
    COMPANIES.forEach(company => {
      companyData[company] = { amount: 0, weight: 0, count: 0, totalListed: 0 };
    });

    // 데이터 집계
    settlements.forEach(settlement => {
      settlement.bidParts.forEach(part => {
        const company = part.companyName;
        if (companyData[company]) {
          companyData[company].amount += part.amount;
          companyData[company].weight += part.weight;
          companyData[company].count += 1;
          companyData[company].totalListed += 1; // 상장 건수 (더미: 낙찰건수와 동일하게)
        }
      });
    });

    // 배열로 변환 및 정렬
    const ranking = Object.entries(companyData).map(([name, data]) => ({
      name,
      amount: data.amount,
      weight: Math.round(data.weight * 10) / 10,
      count: data.count,
      totalListed: Math.round(data.count * 1.15), // 상장 건수 (낙찰건수보다 약간 많게)
      bidRate: data.count > 0 ? Math.round((data.count / Math.round(data.count * 1.15)) * 100 * 10) / 10 : 0,
      avgPrice: data.count > 0 ? Math.round(data.amount / data.weight) : 0,
    }));

    return ranking.sort((a, b) => {
      if (sortBy === 'bidRate') return b.bidRate - a.bidRate;
      return b[sortBy] - a[sortBy];
    });
  }, [settlements, sortBy]);

  // 전체 합계
  const totals = useMemo(() => {
    return companyRanking.reduce(
      (acc, c) => ({
        amount: acc.amount + c.amount,
        weight: acc.weight + c.weight,
        count: acc.count + c.count,
        totalListed: acc.totalListed + c.totalListed,
      }),
      { amount: 0, weight: 0, count: 0, totalListed: 0 }
    );
  }, [companyRanking]);

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const data = companyRanking.map((c, idx) => ({
      '순위': idx + 1,
      '상장업체': c.name,
      '상장금액(원)': c.amount,
      '상장중량(kg)': c.weight,
      '상장건수': c.totalListed,
      '낙찰건수': c.count,
      '낙찰률(%)': c.bidRate,
      '평균단가(원/kg)': c.avgPrice,
      '금액비중(%)': ((c.amount / totals.amount) * 100).toFixed(1),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '상장업체순위');
    XLSX.writeFile(wb, `상장업체_순위_${startDate}_${endDate}.xlsx`);
  };

  // 트로피 색상
  const getTrophyColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-transparent';
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">상장업체 순위</h1>
        <p className="text-sm text-gray-500 mt-1">상장업체별 상장금액, 상장건수, 낙찰률 순위를 조회합니다.</p>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 선택 */}
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
          </div>

          {/* 정렬 기준 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">정렬</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="amount">상장금액순</option>
              <option value="count">낙찰건수순</option>
              <option value="weight">상장중량순</option>
              <option value="bidRate">낙찰률순</option>
            </select>
          </div>

          {/* 엑셀 다운로드 */}
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>
        </div>
      </div>

      {/* TOP 3 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {companyRanking.slice(0, 4).map((company, idx) => (
          <div
            key={company.name}
            className={`bg-white border-2 p-4 ${
              idx === 0 ? 'border-yellow-400' : idx === 1 ? 'border-gray-300' : idx === 2 ? 'border-amber-500' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className={`w-5 h-5 ${getTrophyColor(idx + 1)}`} />
              <span className="text-lg font-bold text-gray-900">{idx + 1}위</span>
            </div>
            <div className="text-sm font-medium text-gray-800 mb-2">{company.name}</div>
            <div className="text-xl font-bold text-gray-900 mb-1">{company.amount.toLocaleString()}원</div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{company.count}건 낙찰</span>
              <span>낙찰률 {company.bidRate}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* 순위 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-16 px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">순위</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">상장업체</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">
                  상장금액
                  {sortBy === 'amount' && <span className="ml-1 text-blue-500">▼</span>}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">
                  상장중량(kg)
                  {sortBy === 'weight' && <span className="ml-1 text-blue-500">▼</span>}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">상장건수</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">
                  낙찰건수
                  {sortBy === 'count' && <span className="ml-1 text-blue-500">▼</span>}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">
                  낙찰률
                  {sortBy === 'bidRate' && <span className="ml-1 text-blue-500">▼</span>}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">평균단가</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
              </tr>
            </thead>
            <tbody>
              {companyRanking.map((company, idx) => (
                <tr key={company.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center border border-gray-200">
                    <div className="flex items-center justify-center gap-1">
                      {idx < 3 && <Trophy className={`w-4 h-4 ${getTrophyColor(idx + 1)}`} />}
                      <span className={`text-xs font-medium ${idx < 3 ? 'text-gray-900' : 'text-gray-600'}`}>
                        {idx + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-center border border-gray-200 font-medium text-gray-900">
                    {company.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-center border border-gray-200 font-medium text-gray-900">
                    {company.amount.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700">
                    {company.weight}
                  </td>
                  <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700">
                    {company.totalListed}
                  </td>
                  <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700">
                    {company.count}
                  </td>
                  <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700">
                    {company.bidRate}%
                  </td>
                  <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700">
                    {company.avgPrice.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700">
                    {((company.amount / totals.amount) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {/* 합계 */}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={2} className="px-4 py-3 text-xs text-center border border-gray-200">합계</td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">
                  {totals.amount.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">
                  {Math.round(totals.weight * 10) / 10}
                </td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">
                  {totals.totalListed}
                </td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">
                  {totals.count}
                </td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">
                  {totals.totalListed > 0 ? Math.round((totals.count / totals.totalListed) * 100 * 10) / 10 : 0}%
                </td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">-</td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
