'use client';

import React, { useState, useMemo } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';

// 오늘 날짜 (YYYY-MM-DD)
const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateValue = getTodayDateValue();

// 20부위 목록
const PARTS = [
  '등심(좌)', '등심(우)', '안심', '채끝', '치마', '부채', '업진', '토시·제비',
  '설도(좌)', '설도(우)', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
  '사태', '꼬리', '족', '사골', '잡뼈'
];

// 유찰 부위 인덱스
const FAILED_PARTS = [6, 16]; // 업진, 꼬리 유찰

// 낙찰률 데이터 계산
interface ResultData {
  listed: number;
  awarded: number;
  rate: number;
}

// 부위별 데이터 생성
const generateResultData = () => {
  const data: Record<string, ResultData> = {};
  
  // 각 부위별로 초기화
  PARTS.forEach(part => {
    data[part] = { listed: 0, awarded: 0, rate: 0 };
  });
  data['합계'] = { listed: 0, awarded: 0, rate: 0 };
  
  // 2두 데이터
  for (let cattleIdx = 0; cattleIdx < 2; cattleIdx++) {
    PARTS.forEach((part, partIdx) => {
      const isFailed = FAILED_PARTS.includes(partIdx);
      
      data[part].listed += 1;
      data[part].awarded += isFailed ? 0 : 1;
      
      data['합계'].listed += 1;
      data['합계'].awarded += isFailed ? 0 : 1;
    });
  }
  
  // 낙찰률 계산
  PARTS.forEach(part => {
    const d = data[part];
    d.rate = d.listed > 0 ? Math.round((d.awarded / d.listed) * 100) : 0;
  });
  
  const grandTotal = data['합계'];
  grandTotal.rate = grandTotal.listed > 0 ? Math.round((grandTotal.awarded / grandTotal.listed) * 100) : 0;
  
  return data;
};

export default function CompanyAuctionResultsPage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  
  const [startDate, setStartDate] = useState(todayDateValue);
  const [endDate, setEndDate] = useState(todayDateValue);

  const resultData = useMemo(() => generateResultData(), []);

  const thClass = "px-3 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border border-gray-200";
  const tdClass = "px-2 py-1.5 text-xs text-gray-600 text-center whitespace-nowrap border border-gray-200";

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const excelData: Record<string, string | number>[] = [];
    
    [...PARTS, '합계'].forEach(part => {
      const d = resultData[part];
      excelData.push({
        '부위': part,
        '상장': d.listed,
        '낙찰': d.awarded,
        '낙찰률': `${d.rate}%`,
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '낙찰률 조회');

    const today = new Date();
    const fileName = `${companyName}_낙찰률조회_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
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

          {/* 초기화/엑셀 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayDateValue);
                setEndDate(todayDateValue);
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
            <span className="text-sm font-semibold text-gray-900">{resultData['합계'].listed}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 낙찰</span>
            <span className="text-sm font-semibold text-gray-900">{resultData['합계'].awarded}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 유찰</span>
            <span className="text-sm font-semibold text-gray-900">{resultData['합계'].listed - resultData['합계'].awarded}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">평균 낙찰률</span>
            <span className="text-sm font-semibold text-gray-900">{resultData['합계'].rate}%</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
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
              {PARTS.map((part) => {
                const d = resultData[part];
                return (
                  <tr key={part} className="hover:bg-gray-50">
                    <td className={`${tdClass} font-medium`}>{part}</td>
                    <td className={tdClass}>{d.listed}</td>
                    <td className={`${tdClass} ${d.awarded > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {d.awarded}
                    </td>
                    <td className={`${tdClass} text-gray-600`}>
                      {d.rate}%
                    </td>
                  </tr>
                );
              })}
              {/* 합계 행 */}
              <tr className="bg-white font-semibold border-t-2 border-gray-200">
                <td className={`${tdClass} font-bold`}>합계</td>
                <td className={tdClass}>{resultData['합계'].listed}</td>
                <td className={`${tdClass} text-gray-900`}>{resultData['합계'].awarded}</td>
                <td className={`${tdClass} font-bold`}>{resultData['합계'].rate}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </CompanyLayout>
  );
}
