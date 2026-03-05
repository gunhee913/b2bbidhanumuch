'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateDealerSettlements, COMPANIES } from '@/constants/dealerSettlement';

export default function DealerRankingPage() {
  const [startDate, setStartDate] = useState('2026-01-16');
  const [endDate, setEndDate] = useState('2026-01-21');
  const [searchStartDate, setSearchStartDate] = useState('2026-01-16');
  const [searchEndDate, setSearchEndDate] = useState('2026-01-21');
  const [expandedDealers, setExpandedDealers] = useState<Set<string>>(new Set());

  // 조회 버튼 클릭
  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };

  // 낙찰 데이터 가져오기
  const settlements = useMemo(() => generateDealerSettlements(), []);

  // 중도매인별 데이터 (거래처별 상세 포함)
  const dealerData = useMemo(() => {
    return settlements.map(settlement => {
      const totalAmount = settlement.bidParts.reduce((sum, p) => sum + p.amount, 0);
      const count = settlement.bidParts.length;

      // 거래처(상장업체)별 집계
      const companyMap: Record<string, { count: number; amount: number }> = {};
      settlement.bidParts.forEach(part => {
        if (!companyMap[part.companyName]) {
          companyMap[part.companyName] = { count: 0, amount: 0 };
        }
        companyMap[part.companyName].count += 1;
        companyMap[part.companyName].amount += part.amount;
      });

      const companies = Object.entries(companyMap)
        .map(([name, data]) => ({
          name,
          count: data.count,
          amount: data.amount,
          ratio: ((data.amount / totalAmount) * 100).toFixed(1),
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        dealerNo: settlement.dealerNo,
        dealerName: settlement.dealerName,
        amount: totalAmount,
        count,
        companies,
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [settlements]);

  // 전체 합계
  const totals = useMemo(() => {
    return dealerData.reduce(
      (acc, d) => ({
        amount: acc.amount + d.amount,
        count: acc.count + d.count,
      }),
      { amount: 0, count: 0 }
    );
  }, [dealerData]);

  // 행 확장/축소 토글
  const toggleExpand = (dealerNo: string) => {
    const newExpanded = new Set(expandedDealers);
    if (newExpanded.has(dealerNo)) {
      newExpanded.delete(dealerNo);
    } else {
      newExpanded.add(dealerNo);
    }
    setExpandedDealers(newExpanded);
  };

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const data = dealerData.map((d, idx) => ({
      '순위': idx + 1,
      '중도매인번호': d.dealerNo,
      '중도매인명': d.dealerName,
      '낙찰 건수': d.count,
      '낙찰대금(원)': d.amount,
      '비중(%)': ((d.amount / totals.amount) * 100).toFixed(1),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '중도매인경매현황');
    XLSX.writeFile(wb, `중도매인_경매현황_${searchStartDate}_${searchEndDate}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">중도매인 경매 현황</h1>
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
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
            >
              조회
            </button>
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

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-12 px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50"></th>
                <th className="w-16 px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">순위</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">중도매인번호</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">중도매인명</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰 건수</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">낙찰대금</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-50">비중</th>
              </tr>
            </thead>
            <tbody>
              {dealerData.map((dealer, idx) => (
                <React.Fragment key={dealer.dealerNo}>
                  {/* 중도매인 행 */}
                  <tr 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(dealer.dealerNo)}
                  >
                    <td className="px-4 py-3 text-center border border-gray-200">
                      {expandedDealers.has(dealer.dealerNo) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 mx-auto" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-center border border-gray-200 font-medium text-gray-900">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-600">
                      {dealer.dealerNo}
                    </td>
                    <td className="px-4 py-3 text-xs text-center border border-gray-200 font-medium text-gray-900">
                      {dealer.dealerName}
                    </td>
                    <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700">
                      {dealer.count}건
                    </td>
                    <td className="px-4 py-3 text-xs text-center border border-gray-200 font-medium text-gray-900">
                      {dealer.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700">
                      {((dealer.amount / totals.amount) * 100).toFixed(1)}%
                    </td>
                  </tr>

                  {/* 거래처별 상세 내역 (확장 시) */}
                  {expandedDealers.has(dealer.dealerNo) && (
                    <tr>
                      <td colSpan={7} className="p-0 border border-gray-200 bg-gray-50">
                        <div className="p-4">
                          <div className="text-xs font-semibold text-gray-700 mb-2">거래처별 낙찰 내역</div>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-white whitespace-nowrap">상장업체</th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-white whitespace-nowrap">낙찰 건수</th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-white whitespace-nowrap">낙찰대금</th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 bg-white whitespace-nowrap">비중</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dealer.companies.map((company) => (
                                <tr key={company.name} className="hover:bg-gray-100">
                                  <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap font-medium">
                                    {company.name}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">
                                    {company.count}건
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">
                                    {company.amount.toLocaleString()}원
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center border border-gray-200 whitespace-nowrap">
                                    {company.ratio}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {/* 합계 */}
              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-3 text-center border border-gray-200"></td>
                <td colSpan={3} className="px-4 py-3 text-xs text-center border border-gray-200">합계</td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">
                  {totals.count}건
                </td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">
                  {totals.amount.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-xs text-center border border-gray-200">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
