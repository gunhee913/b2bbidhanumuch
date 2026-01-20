'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Calendar, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// 오늘 날짜 문자열 (YY.MM.DD)
const getTodayString = () => {
  const today = new Date();
  const year = String(today.getFullYear()).slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

// 오늘 날짜 (YYYY-MM-DD) - input[type="date"]용
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
  bidDate: string;        // 낙찰일자
  listingDate: string;    // 상장일자
  listingNo: string;      // 상장번호
  part: string;           // 부위
  grade: string;          // 등급
  weight: number;         // 중량 (kg)
  unitPrice: number | null; // 낙찰단가 (원/kg) - 유찰시 null
  totalPrice: number | null; // 낙찰금액 (원) - 유찰시 null
  commission: number | null; // 수수료 (원) - 유찰시 null
  breed: string;          // 축종
  gender: string;         // 성별
  dealerNo: string | null;  // 중도매인번호 - 유찰시 null
  dealerName: string | null; // 중도매인명 - 유찰시 null
  companyNo: string;      // 상장업체번호
  companyName: string;    // 상장업체명
  representative: string; // 대표자명
  traceNo: string;        // 이력번호
  isFailed: boolean;      // 유찰 여부
}

// 19부위 목록 (경매 페이지와 동일)
const PARTS = [
  '등심(좌)', '등심(우)', '안심', '채끝', '갈비(좌)', '갈비(우)', '특수부위',
  '설도(좌)', '설도(우)', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
  '사태', '꼬리', '족', '사골', '잡뼈'
];

// 부위별 기본 중량 (kg) - 경매 페이지와 동일
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

// 개체 정보
interface CattleInfo {
  auctionNo: string;
  grade: string;
  breed: string;
  gender: string;
  companyNo: string;
  companyName: string;
  representative: string;
  traceNo: string;
}

// 4개 개체 정보 (중도매인 관리, 상장업체 관리와 연동)
const cattleList: CattleInfo[] = [
  { auctionNo: '101', grade: '1++A(9)', breed: '한우', gender: '거세', companyNo: '100', companyName: '건화', representative: '김건화', traceNo: '1486-7293-1' },
  { auctionNo: '201', grade: '1+A', breed: '한우', gender: '암', companyNo: '200', companyName: '대진엠에스', representative: '이대진', traceNo: '1523-8842-3' },
  { auctionNo: '301', grade: '1++B(8)', breed: '한우', gender: '거세', companyNo: '300', companyName: '안심엘피씨', representative: '박안심', traceNo: '1498-6521-7' },
  { auctionNo: '401', grade: '1+B', breed: '한우', gender: '암', companyNo: '400', companyName: '정직한고기', representative: '최정직', traceNo: '1512-9934-2' },
];

// 중도매인 정보
const dealers = [
  { dealerNo: '7000001', dealerName: '김철수' },
  { dealerNo: '7000002', dealerName: '이영희' },
  { dealerNo: '7000003', dealerName: '박민수' },
  { dealerNo: '7000004', dealerName: '최지현' },
];

// 유찰 부위 인덱스 (랜덤하게 일부 유찰 처리)
const FAILED_PARTS_BY_CATTLE: Record<number, number[]> = {
  0: [12, 15], // 건화: 특수부위, 토시살 유찰
  1: [13, 16, 18], // 대진엠에스: 갈매기살, 업진살, 꽃등심 유찰
  2: [14], // 안심엘피씨: 제비추리 유찰
  3: [11, 12, 17], // 정직한고기: 사태(우), 특수부위, 치마살 유찰
};

// 더미 데이터 생성 (1두당 19부위)
const generateBidRecords = (): BidRecord[] => {
  const records: BidRecord[] = [];
  let id = 1;

  cattleList.forEach((cattle, cattleIdx) => {
    const failedParts = FAILED_PARTS_BY_CATTLE[cattleIdx] || [];
    
    PARTS.forEach((part, partIdx) => {
      const isFailed = failedParts.includes(partIdx);
      const weight = PART_WEIGHTS[part];
      const basePrice = PART_PRICES[part];
      
      // 등급에 따른 가격 조정
      const gradeMultiplier = cattle.grade.includes('1++') ? 1.0 : cattle.grade.includes('1+') ? 0.85 : 0.75;
      const unitPrice = isFailed ? null : Math.round(basePrice * gradeMultiplier);
      const totalPrice = isFailed || !unitPrice ? null : Math.round(weight * unitPrice);
      const commission = totalPrice ? Math.round(totalPrice * 0.02) : null;
      
      // 유찰이 아닌 경우 결정론적으로 중도매인 배정 (cattleIdx + partIdx 기반)
      const dealerIdx = (cattleIdx + partIdx) % dealers.length;
      const dealer = isFailed ? null : dealers[dealerIdx];
      
      records.push({
        id: String(id++),
        bidDate: isFailed ? '-' : todayString,
        listingDate: todayString,
        listingNo: `260120-${cattle.auctionNo}-${String(partIdx + 1).padStart(4, '0')}`,
        part,
        grade: cattle.grade,
        weight,
        unitPrice,
        totalPrice,
        commission,
        breed: cattle.breed,
        gender: cattle.gender,
        dealerNo: dealer?.dealerNo || null,
        dealerName: dealer?.dealerName || null,
        companyNo: cattle.companyNo,
        companyName: cattle.companyName,
        representative: cattle.representative,
        traceNo: cattle.traceNo,
        isFailed,
      });
    });
  });

  return records;
};

const dummyBidRecords = generateBidRecords();

export default function AuctionBidsPage() {
  const [startDate, setStartDate] = useState(todayDateValue);
  const [endDate, setEndDate] = useState(todayDateValue);
  const [companyFilter, setCompanyFilter] = useState('');
  const [dealerFilter, setDealerFilter] = useState('');
  const [hideFailed, setHideFailed] = useState(false); // 유찰분 숨김

  // 필터링
  const filteredRecords = dummyBidRecords.filter(record => {
    if (hideFailed && record.isFailed) return false; // 유찰분 숨김
    if (companyFilter && record.companyName !== companyFilter) return false;
    if (dealerFilter && record.dealerName && !record.dealerName.includes(dealerFilter)) return false;
    return true;
  });

  // 합계 계산 (유찰 제외)
  const successRecords = filteredRecords.filter(r => !r.isFailed);
  const failedCount = filteredRecords.filter(r => r.isFailed).length;
  const totalWeight = successRecords.reduce((sum, r) => sum + r.weight, 0);
  const totalAmount = successRecords.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
  const totalCommission = successRecords.reduce((sum, r) => sum + (r.commission || 0), 0);

  const thClass = "px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200";
  const tdClass = "px-2 py-2 text-xs text-gray-600 text-center whitespace-nowrap";

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    // 엑셀 데이터 생성
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
      '상장업체번호': record.companyNo,
      '상장업체명': record.companyName,
      '대표자명': record.representative,
      '이력번호': record.traceNo,
    }));

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { wch: 8 },  // 상태
      { wch: 12 }, // 낙찰일자
      { wch: 12 }, // 상장일자
      { wch: 18 }, // 상장번호
      { wch: 10 }, // 부위
      { wch: 10 }, // 등급
      { wch: 10 }, // 중량
      { wch: 12 }, // 낙찰단가
      { wch: 14 }, // 낙찰금액
      { wch: 12 }, // 수수료
      { wch: 8 },  // 축종
      { wch: 8 },  // 성별
      { wch: 12 }, // 중도매인번호
      { wch: 12 }, // 중도매인명
      { wch: 14 }, // 상장업체번호
      { wch: 14 }, // 상장업체명
      { wch: 10 }, // 대표자명
      { wch: 14 }, // 이력번호
    ];

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '부분육 경락 내역');

    // 파일명 생성 (오늘 날짜 포함)
    const today = new Date();
    const fileName = `부분육_경락내역_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;

    // 다운로드
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경락 내역</h1>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">기간</span>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36 pl-3 pr-8 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white"
              />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <span className="text-gray-400">~</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36 pl-3 pr-8 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white"
              />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 상장업체 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상장업체</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white"
            >
              <option value="">전체</option>
              <option value="건화">건화</option>
              <option value="대진엠에스">대진엠에스</option>
              <option value="안심엘피씨">안심엘피씨</option>
              <option value="정직한고기">정직한고기</option>
            </select>
          </div>

          {/* 중도매인 검색 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <input
              type="text"
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              placeholder="중도매인명 검색"
              className="w-32 px-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white"
            />
          </div>

          {/* 유찰분 숨김 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideFailed}
                onChange={(e) => setHideFailed(e.target.checked)}
                className="w-4 h-4 rounded appearance-none bg-white border border-gray-200 checked:bg-red-600 checked:border-red-600 focus:ring-red-500 relative
                  after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:font-bold after:opacity-0 checked:after:opacity-100"
              />
              <span className="text-sm font-medium text-gray-600">유찰분 숨김</span>
            </label>
          </div>

          {/* 검색/초기화/엑셀 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayDateValue);
                setEndDate(todayDateValue);
                setCompanyFilter('');
                setDealerFilter('');
                setHideFailed(false);
              }}
              className="px-4 py-1.5 border border-gray-200 text-gray-600 rounded text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              className="px-4 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              검색
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>
        </div>
      </div>

      {/* 합계 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 건수</span>
            <span className="text-sm font-semibold text-gray-900">{filteredRecords.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">낙찰</span>
            <span className="text-sm font-semibold text-green-600">{successRecords.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">유찰</span>
            <span className="text-sm font-semibold text-orange-500">{failedCount}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 중량</span>
            <span className="text-sm font-semibold text-gray-900">{totalWeight.toFixed(1)}kg</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 낙찰금액</span>
            <span className="text-sm font-semibold text-red-600">{totalAmount.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 수수료</span>
            <span className="text-sm font-semibold text-gray-900">{totalCommission.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
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
                <th className={thClass}>상장업체번호</th>
                <th className={thClass}>상장업체명</th>
                <th className={thClass}>대표자명</th>
                <th className={thClass}>이력번호</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className={`hover:bg-gray-50 ${record.isFailed ? 'bg-orange-50' : ''}`}>
                  <td className={tdClass}>{record.isFailed ? <span className="text-orange-500">유찰</span> : record.bidDate}</td>
                  <td className={tdClass}>{record.listingDate}</td>
                  <td className={`${tdClass} font-medium text-gray-900`}>{record.listingNo}</td>
                  <td className={tdClass}>{record.part}</td>
                  <td className={`${tdClass} font-medium`}>{record.grade}</td>
                  <td className={tdClass}>{record.weight.toFixed(1)}kg</td>
                  <td className={tdClass}>{record.unitPrice ? record.unitPrice.toLocaleString() : '-'}</td>
                  <td className={`${tdClass} font-medium ${record.isFailed ? 'text-gray-400' : 'text-red-600'}`}>
                    {record.totalPrice ? record.totalPrice.toLocaleString() : '-'}
                  </td>
                  <td className={tdClass}>{record.commission ? record.commission.toLocaleString() : '-'}</td>
                  <td className={tdClass}>{record.breed}</td>
                  <td className={tdClass}>{record.gender}</td>
                  <td className={tdClass}>{record.dealerNo || '-'}</td>
                  <td className={tdClass}>{record.dealerName || '-'}</td>
                  <td className={tdClass}>{record.companyNo}</td>
                  <td className={tdClass}>{record.companyName}</td>
                  <td className={tdClass}>{record.representative}</td>
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
    </AdminLayout>
  );
}
