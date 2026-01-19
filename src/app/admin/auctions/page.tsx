'use client';

import React, { useState, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Search,
  X,
} from 'lucide-react';

// 부위 데이터 (내일 경매이므로 낙찰가격 없음)
const PARTS_DATA = [
  { id: 1, name: '등심(좌)', weight: '15.2kg', minPrice: 85000, bidPrice: null },
  { id: 2, name: '등심(우)', weight: '15.3kg', minPrice: 85000, bidPrice: null },
  { id: 3, name: '안심', weight: '4.5kg', minPrice: 95000, bidPrice: null },
  { id: 4, name: '채끝', weight: '8.2kg', minPrice: 82000, bidPrice: null },
  { id: 5, name: '갈비(좌)', weight: '12.8kg', minPrice: 78000, bidPrice: null },
  { id: 6, name: '갈비(우)', weight: '12.0kg', minPrice: 78000, bidPrice: null },
  { id: 7, name: '특수부위', weight: '3.2kg', minPrice: 72000, bidPrice: null },
  { id: 8, name: '설도(좌)', weight: '16.5kg', minPrice: 56000, bidPrice: null },
  { id: 9, name: '설도(우)', weight: '16.8kg', minPrice: 56000, bidPrice: null },
  { id: 10, name: '앞다리', weight: '25.4kg', minPrice: 55000, bidPrice: null },
  { id: 11, name: '우둔', weight: '21.7kg', minPrice: 58000, bidPrice: null },
  { id: 12, name: '목심', weight: '14.0kg', minPrice: 62000, bidPrice: null },
  { id: 13, name: '양지(좌)', weight: '12.2kg', minPrice: 52000, bidPrice: null },
  { id: 14, name: '양지(우)', weight: '12.4kg', minPrice: 52000, bidPrice: null },
  { id: 15, name: '사태', weight: '15.1kg', minPrice: 48000, bidPrice: null },
  { id: 16, name: '꼬리', weight: '16.2kg', minPrice: 35000, bidPrice: null },
  { id: 17, name: '족', weight: '10.9kg', minPrice: 25000, bidPrice: null },
  { id: 18, name: '사골', weight: '3.1kg', minPrice: 20000, bidPrice: null },
  { id: 19, name: '잡뼈', weight: '21.5kg', minPrice: 15000, bidPrice: null },
];

// 상태 타입 및 옵션
type AuctionStatus = '대기' | '승인';

const STATUS_OPTIONS: { value: AuctionStatus; label: string }[] = [
  { value: '대기', label: '대기' },
  { value: '승인', label: '승인' },
];

// 경매 데이터 타입
interface Auction {
  id: string;
  auctionNo: string;
  breed: string;
  gender: string;
  grade: string;
  monthAge: number;
  backFat: number;
  eyeMuscle: number;
  meatColor: number;
  fatColor: number;
  texture: number;
  maturity: number;
  traceNo: string;
  slaughterHouse: string;
  slaughterDate: string;
  slaughterNo: string;
  carcassWeight: number;
  company: string;
  processDate: string;
  processWeight: number;
  status: AuctionStatus;
}

// 내일 날짜 코드 생성 (YYMMDD)
const getTomorrowDateCode = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = String(tomorrow.getFullYear()).slice(-2);
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// 내일 날짜 문자열 (YYYY-MM-DD) - input date용
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const tomorrowCode = getTomorrowDateCode();
const tomorrowDateString = getTomorrowDateString();

// 더미 데이터
const dummyAuctions: Auction[] = [
  { 
    id: '1', 
    auctionNo: `${tomorrowCode}-101`, 
    breed: '한우', 
    gender: '거세', 
    grade: '1++A(9)', 
    monthAge: 32,
    backFat: 15, 
    eyeMuscle: 98, 
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1486-7293-1',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '201',
    carcassWeight: 520, 
    company: '건화',
    processDate: "26.01.17",
    processWeight: 312,
    status: '승인',
  },
  { 
    id: '2', 
    auctionNo: `${tomorrowCode}-201`, 
    breed: '한우', 
    gender: '암', 
    grade: '1+A', 
    monthAge: 30,
    backFat: 12, 
    eyeMuscle: 92, 
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1523-8842-3',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '202',
    carcassWeight: 485, 
    company: '대진엠에스',
    processDate: "26.01.17",
    processWeight: 291,
    status: '승인',
  },
  { 
    id: '3', 
    auctionNo: `${tomorrowCode}-301`, 
    breed: '한우', 
    gender: '거세', 
    grade: '1++B(8)', 
    monthAge: 34,
    backFat: 14, 
    eyeMuscle: 95, 
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1498-6521-7',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '203',
    carcassWeight: 512, 
    company: '안심엘피씨',
    processDate: "26.01.17",
    processWeight: 307,
    status: '대기',
  },
  { 
    id: '4', 
    auctionNo: `${tomorrowCode}-401`, 
    breed: '한우', 
    gender: '암', 
    grade: '1+B', 
    monthAge: 28,
    backFat: 11, 
    eyeMuscle: 88, 
    meatColor: 5, 
    fatColor: 3, 
    texture: 1, 
    maturity: 2, 
    traceNo: '1512-9934-2',
    slaughterHouse: '음성',
    slaughterDate: "26.01.16",
    slaughterNo: '204',
    carcassWeight: 468, 
    company: '정직한고기',
    processDate: "26.01.17",
    processWeight: 281,
    status: '대기',
  },
];

export default function AuctionsListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(tomorrowDateString);
  const [endDate, setEndDate] = useState<string>(tomorrowDateString);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [auctions, setAuctions] = useState<Auction[]>(dummyAuctions);
  const itemsPerPage = 10;

  // 날짜 입력 refs
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // 사진 모달 상태
  const [photoModalAuction, setPhotoModalAuction] = useState<Auction | null>(null);

  // 고유 업체 목록
  const companies = [...new Set(auctions.map(a => a.company))];

  // 상태 변경 핸들러
  const handleStatusChange = (auctionId: string, newStatus: AuctionStatus) => {
    setAuctions(prev => prev.map(auction => 
      auction.id === auctionId ? { ...auction, status: newStatus } : auction
    ));
  };

  // 날짜를 6자리 코드로 변환 (YYMMDD)
  const dateToCode = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 접수번호에서 날짜 코드 추출
  const extractDateCode = (auctionNo: string) => {
    return auctionNo.split('-')[0];
  };

  // 필터링된 데이터
  const filteredAuctions = auctions.filter(auction => {
    const matchesCompany = companyFilter === 'all' || auction.company === companyFilter;
    
    // 날짜 범위 필터
    let matchesDate = true;
    const auctionDateCode = extractDateCode(auction.auctionNo);
    
    if (startDate && endDate) {
      const startCode = dateToCode(startDate);
      const endCode = dateToCode(endDate);
      matchesDate = auctionDateCode >= startCode && auctionDateCode <= endCode;
    } else if (startDate) {
      const startCode = dateToCode(startDate);
      matchesDate = auctionDateCode >= startCode;
    } else if (endDate) {
      const endCode = dateToCode(endDate);
      matchesDate = auctionDateCode <= endCode;
    }
    
    return matchesCompany && matchesDate;
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);
  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 행 확장/축소
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // 상장번호 생성
  const generateListingNo = (auctionNo: string, partIndex: number) => {
    return `${auctionNo}-${String(partIndex + 1).padStart(4, '0')}`;
  };

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">부분육 상장 조회</h1>
      </div>

      {/* 검색 조건 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* 상장일자 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">상장일자</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => startDateRef.current?.showPicker()}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-0 border-0 bg-transparent cursor-pointer hover:opacity-70"
              >
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
              <input
                ref={startDateRef}
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-sm"
              />
            </div>
            <span className="text-gray-500">~</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => endDateRef.current?.showPicker()}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-0 border-0 bg-transparent cursor-pointer hover:opacity-70"
              >
                <Calendar className="w-4 h-4 text-gray-400" />
              </button>
              <input
                ref={endDateRef}
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-sm"
              />
            </div>
          </div>

          {/* 상장업체 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">상장업체</label>
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-sm min-w-[140px]"
            >
              <option value="all">전체</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          {/* 검색 버튼 */}
          <button 
            type="button"
            onClick={() => setCurrentPage(1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            검색
          </button>

          {/* 초기화 버튼 */}
          <button 
            type="button"
            onClick={() => {
              setStartDate(tomorrowDateString);
              setEndDate(tomorrowDateString);
              setCompanyFilter('all');
              setCurrentPage(1);
              // 입력 필드 직접 초기화
              if (startDateRef.current) startDateRef.current.value = tomorrowDateString;
              if (endDateRef.current) endDateRef.current.value = tomorrowDateString;
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-8 px-1 py-2"></th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">접수번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">축종</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">성별</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">등급</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">개월령</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">등지방</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">등심면적</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">육색</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">지방색</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">조직감</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">성숙도</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">이력번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">도축장</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">도축일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">도축번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">도체중</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">상장업체</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">가공일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">가공중량</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">사진</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedAuctions.map((auction) => (
                <React.Fragment key={auction.id}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(auction.id)}
                  >
                    <td className="px-2 py-3 text-center">
                      {expandedId === auction.id ? (
                        <ChevronUp className="w-3 h-3 text-gray-400 mx-auto" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-2 py-3 text-xs font-medium text-gray-900 text-center whitespace-nowrap">{auction.auctionNo}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.breed}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.gender}</td>
                    <td className="px-2 py-3 text-xs font-medium text-gray-900 text-center whitespace-nowrap">{auction.grade}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.monthAge}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.backFat}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.eyeMuscle}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.meatColor}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.fatColor}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.texture}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.maturity}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.traceNo}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.slaughterHouse}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.slaughterDate}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.slaughterNo}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.carcassWeight}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.company}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.processDate}</td>
                    <td className="px-2 py-3 text-xs text-gray-600 text-center whitespace-nowrap">{auction.processWeight}</td>
                    <td className="px-2 py-3 text-center whitespace-nowrap">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setPhotoModalAuction(auction);
                        }}
                        className="px-2 py-0.5 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                      >
                        보기
                      </button>
                    </td>
                    <td className="px-2 py-3 text-center whitespace-nowrap">
                      <select
                        value={auction.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(auction.id, e.target.value as AuctionStatus)}
                        className="px-1 py-0.5 text-xs font-medium rounded border border-gray-200 cursor-pointer outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-700"
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  {/* 확장된 부위 테이블 */}
                  {expandedId === auction.id && (
                    <tr>
                      <td colSpan={22} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-3 gap-4">
                          {/* 3열로 부위 데이터 표시 */}
                          {[0, 1, 2].map((colIndex) => (
                            <table key={colIndex} className="w-full bg-white border border-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">상장번호</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">부위</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">중량</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200">최저가격</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600">낙찰가격</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: 7 }).map((_, idx) => {
                                  const globalIdx = colIndex * 7 + idx;
                                  const part = PARTS_DATA[globalIdx];
                                  
                                  // 데이터가 없으면 빈 행 표시
                                  if (!part) {
                                    return (
                                      <tr key={`empty-${globalIdx}`} className="border-t border-gray-100">
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center border-r border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center">-</td>
                                      </tr>
                                    );
                                  }
                                  
                                  return (
                                    <tr key={part.id} className="border-t border-gray-100">
                                      <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200">
                                        {generateListingNo(auction.auctionNo, globalIdx)}
                                      </td>
                                      <td className="px-2 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{part.name}</td>
                                      <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200">{part.weight}</td>
                                      <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200">
                                        {part.minPrice.toLocaleString()}
                                      </td>
                                      <td className="px-2 py-2 text-xs text-center">
                                        {part.bidPrice ? (
                                          <span className="text-red-600 font-medium">{part.bidPrice.toLocaleString()}</span>
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ))}
                        </div>
                        {/* 수정/삭제 버튼 */}
                        <div className="flex justify-end gap-2 mt-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`${auction.auctionNo} 수정`);
                            }}
                            className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`${auction.auctionNo}을(를) 삭제하시겠습니까?`)) {
                                alert('삭제되었습니다.');
                              }
                            }}
                            className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {filteredAuctions.length}개
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-100 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-red-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-100 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 사진 보기 모달 */}
      {photoModalAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setPhotoModalAuction(null)}
          />
          
          {/* 모달 컨텐츠 */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">상장 사진</h3>
                <p className="text-sm text-gray-500">
                  접수번호: {photoModalAuction.auctionNo} | {photoModalAuction.company} | {photoModalAuction.grade}
                </p>
              </div>
              <button
                onClick={() => setPhotoModalAuction(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* 사진 그리드 */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 등심 사진들 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 text-center">등심1</p>
                  <img 
                    src="/등심1.png" 
                    alt="등심1"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 text-center">등심2</p>
                  <img 
                    src="/등심2.png" 
                    alt="등심2"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 text-center">등심3</p>
                  <img 
                    src="/등심3.png" 
                    alt="등심3"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 text-center">등심4</p>
                  <img 
                    src="/등심4.png" 
                    alt="등심4"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              </div>
            </div>
            
            {/* 푸터 */}
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setPhotoModalAuction(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
