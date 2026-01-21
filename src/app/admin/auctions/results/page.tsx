'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// 오늘 날짜 (YYYY-MM-DD) - input[type="date"]용
const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateValue = getTodayDateValue();

// 19부위 목록 (경매 페이지와 동일)
const PARTS = [
  '등심(좌)', '등심(우)', '안심', '채끝', '갈비(좌)', '갈비(우)', '특수부위',
  '설도(좌)', '설도(우)', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
  '사태', '꼬리', '족', '사골', '잡뼈'
];

// 상장업체 목록
const COMPANIES = ['건화', '대진엠에스', '안심엘피씨', '정직한고기'];

// 유찰 부위 인덱스 (bids 페이지와 동일)
const FAILED_PARTS_BY_COMPANY: Record<string, number[]> = {
  '건화': [12, 15], // 특수부위, 꼬리 유찰
  '대진엠에스': [13, 16, 18], // 양지(좌), 족, 잡뼈 유찰
  '안심엘피씨': [14], // 양지(우) 유찰
  '정직한고기': [11, 12, 17], // 목심, 특수부위, 사골 유찰
};

// 낙찰률 데이터 계산
interface ResultData {
  listed: number;   // 상장 개수
  awarded: number;  // 낙찰 개수
  rate: number;     // 낙찰률 (%)
}

// 부위별, 업체별 데이터 생성
const generateResultData = () => {
  const data: Record<string, Record<string, ResultData>> = {};
  
  // 각 부위별로 초기화
  PARTS.forEach(part => {
    data[part] = {};
    COMPANIES.forEach(company => {
      data[part][company] = { listed: 0, awarded: 0, rate: 0 };
    });
    data[part]['합계'] = { listed: 0, awarded: 0, rate: 0 };
  });
  
  // 합계 행 초기화
  data['합계'] = {};
  COMPANIES.forEach(company => {
    data['합계'][company] = { listed: 0, awarded: 0, rate: 0 };
  });
  data['합계']['합계'] = { listed: 0, awarded: 0, rate: 0 };
  
  // 데이터 채우기 (각 업체당 1두씩, 19부위)
  COMPANIES.forEach((company, companyIdx) => {
    const failedParts = FAILED_PARTS_BY_COMPANY[company] || [];
    
    PARTS.forEach((part, partIdx) => {
      const isFailed = failedParts.includes(partIdx);
      
      // 상장 개수는 항상 1
      data[part][company].listed = 1;
      // 낙찰 개수는 유찰이 아닌 경우 1
      data[part][company].awarded = isFailed ? 0 : 1;
      // 낙찰률 계산
      data[part][company].rate = isFailed ? 0 : 100;
      
      // 부위별 합계
      data[part]['합계'].listed += 1;
      data[part]['합계'].awarded += isFailed ? 0 : 1;
      
      // 업체별 합계
      data['합계'][company].listed += 1;
      data['합계'][company].awarded += isFailed ? 0 : 1;
      
      // 전체 합계
      data['합계']['합계'].listed += 1;
      data['합계']['합계'].awarded += isFailed ? 0 : 1;
    });
  });
  
  // 합계 행의 낙찰률 계산
  PARTS.forEach(part => {
    const total = data[part]['합계'];
    total.rate = total.listed > 0 ? Math.round((total.awarded / total.listed) * 100) : 0;
  });
  
  COMPANIES.forEach(company => {
    const total = data['합계'][company];
    total.rate = total.listed > 0 ? Math.round((total.awarded / total.listed) * 100) : 0;
  });
  
  const grandTotal = data['합계']['합계'];
  grandTotal.rate = grandTotal.listed > 0 ? Math.round((grandTotal.awarded / grandTotal.listed) * 100) : 0;
  
  return data;
};

const resultData = generateResultData();

export default function AuctionResultsPage() {
  const [startDate, setStartDate] = useState(todayDateValue);
  const [endDate, setEndDate] = useState(todayDateValue);

  const thClass = "px-3 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border border-gray-200";
  const tdClass = "px-2 py-1.5 text-xs text-gray-600 text-center whitespace-nowrap border border-gray-200";

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    const excelData: Record<string, string | number>[] = [];
    
    [...PARTS, '합계'].forEach(part => {
      const row: Record<string, string | number> = { '부위': part };
      [...COMPANIES, '합계'].forEach(company => {
        const d = resultData[part][company];
        row[`${company}_상장`] = d.listed;
        row[`${company}_낙찰`] = d.awarded;
        row[`${company}_낙찰률`] = `${d.rate}%`;
      });
      excelData.push(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '낙찰률 조회');

    const today = new Date();
    const fileName = `낙찰률조회_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
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
            <span className="text-sm font-semibold text-gray-900">{resultData['합계']['합계'].listed}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 낙찰</span>
            <span className="text-sm font-semibold text-gray-900">{resultData['합계']['합계'].awarded}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 유찰</span>
            <span className="text-sm font-semibold text-gray-900">{resultData['합계']['합계'].listed - resultData['합계']['합계'].awarded}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">평균 낙찰률</span>
            <span className="text-sm font-semibold text-gray-900">{resultData['합계']['합계'].rate}%</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th rowSpan={2} className={`${thClass} bg-gray-50 min-w-[80px]`}>부위</th>
                {COMPANIES.map(company => (
                  <th key={company} colSpan={3} className={`${thClass} bg-gray-50`}>{company}</th>
                ))}
                <th colSpan={3} className={`${thClass} bg-gray-50 font-bold`}>합계</th>
              </tr>
              <tr>
                {[...COMPANIES, '합계'].map((company, idx) => (
                  <React.Fragment key={`header-${company}`}>
                    <th className={`${thClass} bg-gray-50 min-w-[50px]`}>상장</th>
                    <th className={`${thClass} bg-gray-50 min-w-[50px]`}>낙찰</th>
                    <th className={`${thClass} bg-gray-50 min-w-[55px]`}>낙찰률</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {PARTS.map((part, partIdx) => (
                <tr key={part} className="hover:bg-gray-50">
                  <td className={`${tdClass} font-medium`}>{part}</td>
                  {[...COMPANIES, '합계'].map((company, idx) => {
                    const d = resultData[part][company];
                    const isTotal = idx === COMPANIES.length;
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
                {[...COMPANIES, '합계'].map((company, idx) => {
                  const d = resultData['합계'][company];
                  const isGrandTotal = idx === COMPANIES.length;
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
      </div>
    </AdminLayout>
  );
}
