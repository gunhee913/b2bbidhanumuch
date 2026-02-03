'use client';

import React, { useState, useMemo } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';

// 오늘 날짜 문자열 (YY.MM.DD)
const getTodayString = () => {
  const today = new Date();
  const year = String(today.getFullYear()).slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

// 오늘 날짜 (YYYY-MM-DD)
const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayString = getTodayString();
const todayDateValue = getTodayDateValue();

// 경락 내역 데이터 타입
interface BidRecord {
  id: string;
  bidDate: string;
  listingDate: string;
  listingNo: string;
  part: string;
  grade: string;
  weight: number;
  unitPrice: number | null;
  totalPrice: number | null;
  commission: number | null;
  breed: string;
  gender: string;
  dealerNo: string | null;
  dealerName: string | null;
  traceNo: string;
  isFailed: boolean;
}

// 19부위 목록
const PARTS = [
  '등심(좌)', '등심(우)', '안심', '채끝', '갈비(좌)', '갈비(우)', '특수부위',
  '설도(좌)', '설도(우)', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
  '사태', '꼬리', '족', '사골', '잡뼈'
];

// 부위별 기본 중량 (kg)
const PART_WEIGHTS: Record<string, number> = {
  '등심(좌)': 15.5, '등심(우)': 15.5, '안심': 4.5, '채끝': 8.0, '갈비(좌)': 12.5,
  '갈비(우)': 12.5, '특수부위': 3.5, '설도(좌)': 16.8, '설도(우)': 16.8, '앞다리': 25.0,
  '우둔': 21.0, '목심': 14.5, '양지(좌)': 12.5, '양지(우)': 12.5, '사태': 15.0,
  '꼬리': 16.0, '족': 10.5, '사골': 3.5, '잡뼈': 22.0
};

// 부위별 기본 단가 (원/kg)
const PART_PRICES: Record<string, number> = {
  '등심(좌)': 92000, '등심(우)': 91000, '안심': 105000, '채끝': 85000, '갈비(좌)': 78000,
  '갈비(우)': 77000, '특수부위': 65000, '설도(좌)': 45000, '설도(우)': 44000, '앞다리': 52000,
  '우둔': 46000, '목심': 68000, '양지(좌)': 48000, '양지(우)': 47000, '사태': 42000,
  '꼬리': 35000, '족': 12000, '사골': 8000, '잡뼈': 5000
};

// 중도매인 정보
const dealers = [
  { dealerNo: '7000001', dealerName: '김철수' },
  { dealerNo: '7000002', dealerName: '이영희' },
  { dealerNo: '7000003', dealerName: '박민수' },
  { dealerNo: '7000004', dealerName: '최지현' },
];

// 더미 데이터 생성 (특정 업체만)
const generateBidRecords = (companyName: string): BidRecord[] => {
  const records: BidRecord[] = [];
  let id = 1;
  
  const companyPrefixMap: Record<string, string> = {
    '건화': '101',
    '대진엠에스': '201',
    '안심엘피씨': '301',
    '정직한고기': '401',
  };
  
  const baseNo = companyPrefixMap[companyName] || '101';
  const failedParts = [12, 15]; // 일부 유찰
  
  // 2두 데이터 생성
  for (let cattleIdx = 0; cattleIdx < 2; cattleIdx++) {
    const cattleNo = parseInt(baseNo) + cattleIdx;
    const grade = cattleIdx === 0 ? '1++A(9)' : '1+A';
    const gender = cattleIdx === 0 ? '거세' : '암';
    
    PARTS.forEach((part, partIdx) => {
      const isFailed = failedParts.includes(partIdx);
      const weight = PART_WEIGHTS[part];
      const basePrice = PART_PRICES[part];
      
      const gradeMultiplier = grade.includes('1++') ? 1.0 : grade.includes('1+') ? 0.85 : 0.75;
      const unitPrice = isFailed ? null : Math.round(basePrice * gradeMultiplier);
      const totalPrice = isFailed || !unitPrice ? null : Math.round(weight * unitPrice);
      const commission = totalPrice ? Math.round(totalPrice * 0.02) : null;
      
      const dealerIdx = (cattleIdx + partIdx) % dealers.length;
      const dealer = isFailed ? null : dealers[dealerIdx];
      
      records.push({
        id: String(id++),
        bidDate: isFailed ? '-' : todayString,
        listingDate: todayString,
        listingNo: `260120-${cattleNo}-${String(partIdx + 1).padStart(2, '0')}`,
        part,
        grade,
        weight,
        unitPrice,
        totalPrice,
        commission,
        breed: '한우',
        gender,
        dealerNo: dealer?.dealerNo || null,
        dealerName: dealer?.dealerName || null,
        traceNo: `1486-729${cattleIdx}-${partIdx + 1}`,
        isFailed,
      });
    });
  }

  return records;
};

export default function CompanyAuctionBidsPage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  
  const [startDate, setStartDate] = useState(todayDateValue);
  const [endDate, setEndDate] = useState(todayDateValue);
  const [dealerFilter, setDealerFilter] = useState('');
  const [hideFailed, setHideFailed] = useState(false);
  
  const dummyBidRecords = useMemo(() => generateBidRecords(companyName), [companyName]);

  // 필터링
  const filteredRecords = dummyBidRecords.filter(record => {
    if (hideFailed && record.isFailed) return false;
    if (dealerFilter && record.dealerName && !record.dealerName.includes(dealerFilter)) return false;
    return true;
  });

  // 합계 계산
  const successRecords = filteredRecords.filter(r => !r.isFailed);
  const failedCount = filteredRecords.filter(r => r.isFailed).length;
  const totalWeight = successRecords.reduce((sum, r) => sum + r.weight, 0);
  const totalAmount = successRecords.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  const totalCommission = successRecords.reduce((sum, r) => sum + (r.commission || 0), 0);

  const thClass = "px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-2 py-2 text-xs text-gray-600 text-center whitespace-nowrap border border-gray-200";

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const excelData = filteredRecords.map((record) => ({
      '상태': record.isFailed ? '유찰' : '낙찰',
      '낙찰일자': record.isFailed ? '-' : record.bidDate,
      '상장일자': record.listingDate,
      '상장번호': record.listingNo,
      '부위': record.part,
      '등급': record.grade,
      '중량(kg)': record.weight,
      '낙찰단가': record.unitPrice || '-',
      '낙찰금액': record.totalPrice || '-',
      '수수료': record.commission || '-',
      '축종': record.breed,
      '성별': record.gender,
      '중도매인번호': record.dealerNo || '-',
      '중도매인명': record.dealerName || '-',
      '이력번호': record.traceNo,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '부분육 경락 내역');

    const today = new Date();
    const fileName = `${companyName}_부분육_경락내역_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경락 내역</h1>
        <p className="text-sm text-gray-500 mt-1">{companyName}</p>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">기간</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          {/* 중도매인 검색 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <input
              type="text"
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              placeholder="중도매인명 검색"
              className="w-32 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          {/* 유찰분 숨김 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideFailed}
                onChange={(e) => setHideFailed(e.target.checked)}
                className="w-4 h-4 appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700 relative
                  after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:font-bold after:opacity-0 checked:after:opacity-100"
              />
              <span className="text-sm font-medium text-gray-600">유찰분 숨김</span>
            </label>
          </div>

          {/* 초기화/엑셀 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayDateValue);
                setEndDate(todayDateValue);
                setDealerFilter('');
                setHideFailed(false);
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 text-white text-xs hover:bg-gray-700"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>
        </div>
      </div>

      {/* 합계 정보 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 건수</span>
            <span className="text-sm font-semibold text-gray-900">{filteredRecords.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">낙찰</span>
            <span className="text-sm font-semibold text-gray-900">{successRecords.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">유찰</span>
            <span className="text-sm font-semibold text-gray-900">{failedCount}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 중량</span>
            <span className="text-sm font-semibold text-gray-900">{totalWeight.toFixed(1)}kg</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 낙찰금액</span>
            <span className="text-sm font-semibold text-gray-900">{totalAmount.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 수수료</span>
            <span className="text-sm font-semibold text-gray-900">{totalCommission.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>낙찰일자</th>
                <th className={thClass}>상장일자</th>
                <th className={thClass}>상장번호</th>
                <th className={thClass}>부위</th>
                <th className={thClass}>등급</th>
                <th className={thClass}>중량</th>
                <th className={thClass}>낙찰단가</th>
                <th className={thClass}>낙찰금액</th>
                <th className={thClass}>수수료</th>
                <th className={thClass}>축종</th>
                <th className={thClass}>성별</th>
                <th className={thClass}>중도매인번호</th>
                <th className={thClass}>중도매인명</th>
                <th className={thClass}>이력번호</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className={tdClass}>{record.isFailed ? <span className="text-gray-500">유찰</span> : record.bidDate}</td>
                  <td className={tdClass}>{record.listingDate}</td>
                  <td className={`${tdClass} font-medium text-gray-900`}>{record.listingNo}</td>
                  <td className={tdClass}>{record.part}</td>
                  <td className={`${tdClass} font-medium`}>{record.grade}</td>
                  <td className={tdClass}>{record.weight.toFixed(1)}kg</td>
                  <td className={tdClass}>{record.unitPrice ? record.unitPrice.toLocaleString() : '-'}</td>
                  <td className={`${tdClass} font-medium ${record.isFailed ? 'text-gray-400' : 'text-gray-900'}`}>
                    {record.totalPrice ? record.totalPrice.toLocaleString() : '-'}
                  </td>
                  <td className={tdClass}>{record.commission ? record.commission.toLocaleString() : '-'}</td>
                  <td className={tdClass}>{record.breed}</td>
                  <td className={tdClass}>{record.gender}</td>
                  <td className={tdClass}>{record.dealerNo || '-'}</td>
                  <td className={tdClass}>{record.dealerName || '-'}</td>
                  <td className={tdClass}>{record.traceNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            총 {filteredRecords.length}건
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
