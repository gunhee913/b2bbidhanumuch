'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';

// 오늘 날짜 (YYYY-MM-DD) - input[type="date"]용
const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateValue = getTodayDateValue();

// 20부위 목록 (경매 페이지와 동일)
const PARTS = [
  '등심(좌)', '등심(우)', '안심', '채끝', '치마', '부채', '업진', '토시·제비',
  '설도(좌)', '설도(우)', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
  '사태', '꼬리', '족', '사골', '잡뼈'
];

// 낙찰률 데이터 타입
interface ResultData {
  listed: number;   // 상장 개수
  awarded: number;  // 낙찰 개수
  rate: number;     // 낙찰률 (%)
}

interface ResultsResponse {
  companies: string[];
  parts: string[];
  data: Record<string, Record<string, ResultData>>;
  summary: {
    totalListed: number;
    totalAwarded: number;
    totalFailed: number;
    averageRate: number;
  };
}

export default function AuctionResultsPage() {
  const [startDate, setStartDate] = useState(todayDateValue);
  const [endDate, setEndDate] = useState(todayDateValue);
  const [searchStartDate, setSearchStartDate] = useState(todayDateValue);
  const [searchEndDate, setSearchEndDate] = useState(todayDateValue);

  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };

  // 데이터 조회
  const { data: resultsData, isLoading } = useQuery<ResultsResponse>({
    queryKey: ['auction-results', searchStartDate, searchEndDate],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/results?startDate=${searchStartDate}&endDate=${searchEndDate}`);
      if (!response.ok) throw new Error('데이터 조회 실패');
      return response.json();
    },
  });

  const companies = resultsData?.companies || [];
  const resultData = resultsData?.data || {};
  const summary = resultsData?.summary || { totalListed: 0, totalAwarded: 0, totalFailed: 0, averageRate: 0 };

  const thClass = "px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border border-gray-200";
  const tdClass = "px-2 py-1.5 text-xs text-gray-600 text-center whitespace-nowrap border border-gray-200";

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    if (!resultsData) return;
    
    const excelData: Record<string, string | number>[] = [];
    
    [...PARTS, '합계'].forEach(part => {
      const row: Record<string, string | number> = { '부위': part };
      [...companies, '합계'].forEach(company => {
        const d = resultData[part]?.[company] || { listed: 0, awarded: 0, rate: 0 };
        row[`${company}_상장`] = d.listed;
        row[`${company}_낙찰`] = d.awarded;
        row[`${company}_낙찰률`] = `${d.rate}%`;
      });
      excelData.push(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '낙찰률 조회');

    const fileName = `낙찰률조회_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 낙찰률 조회</h1>
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

          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
          >
            조회
          </button>

          {/* 초기화/엑셀 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayDateValue);
                setEndDate(todayDateValue);
                setSearchStartDate(todayDateValue);
                setSearchEndDate(todayDateValue);
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
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

      {/* 요약 정보 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 상장</span>
            <span className="text-sm font-semibold text-gray-900">{summary.totalListed}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 낙찰</span>
            <span className="text-sm font-semibold text-gray-900">{summary.totalAwarded}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 유찰</span>
            <span className="text-sm font-semibold text-gray-900">{summary.totalFailed}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">평균 낙찰률</span>
            <span className="text-sm font-semibold text-gray-900">{summary.averageRate}%</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">데이터 조회 중...</span>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-gray-500">해당 기간에 마감된 경매 데이터가 없습니다.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th rowSpan={2} className={`${thClass} bg-gray-50 min-w-[80px]`}>부위</th>
                  {companies.map(company => (
                    <th key={company} colSpan={3} className={`${thClass} bg-gray-50`}>{company}</th>
                  ))}
                  <th colSpan={3} className={`${thClass} bg-gray-50 font-bold`}>합계</th>
                </tr>
                <tr>
                  {[...companies, '합계'].map((company) => (
                    <React.Fragment key={`header-${company}`}>
                      <th className={`${thClass} bg-gray-50 min-w-[50px]`}>상장</th>
                      <th className={`${thClass} bg-gray-50 min-w-[50px]`}>낙찰</th>
                      <th className={`${thClass} bg-gray-50 min-w-[55px]`}>낙찰률</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PARTS.map((part) => (
                  <tr key={part} className="hover:bg-gray-50">
                    <td className={`${tdClass} font-medium`}>{part}</td>
                    {[...companies, '합계'].map((company, idx) => {
                      const d = resultData[part]?.[company] || { listed: 0, awarded: 0, rate: 0 };
                      const isTotal = idx === companies.length;
                      return (
                        <React.Fragment key={`${part}-${company}`}>
                          <td className={`${tdClass} ${isTotal ? 'font-medium' : ''}`}>{d.listed}</td>
                          <td className={`${tdClass} ${isTotal ? 'font-medium' : ''} ${d.awarded > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {d.awarded}
                          </td>
                          <td className={`${tdClass} ${isTotal ? 'font-medium' : ''} text-gray-600`}>
                            {d.rate}%
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
                {/* 합계 행 */}
                <tr className="bg-white font-semibold border-t-2 border-gray-200">
                  <td className={`${tdClass} font-bold`}>합계</td>
                  {[...companies, '합계'].map((company, idx) => {
                    const d = resultData['합계']?.[company] || { listed: 0, awarded: 0, rate: 0 };
                    const isGrandTotal = idx === companies.length;
                    return (
                      <React.Fragment key={`total-${company}`}>
                        <td className={`${tdClass}`}>{d.listed}</td>
                        <td className={`${tdClass} text-gray-900`}>{d.awarded}</td>
                        <td className={`${tdClass} ${isGrandTotal ? 'font-bold' : ''}`}>{d.rate}%</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
