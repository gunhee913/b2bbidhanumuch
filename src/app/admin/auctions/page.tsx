'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
} from 'lucide-react';

// 부위 데이터
const PARTS_DATA = [
  { id: 1, name: '등심(좌)', weight: '15.2kg', minPrice: 85000, bidPrice: 92000 },
  { id: 2, name: '등심(우)', weight: '15.3kg', minPrice: 85000, bidPrice: 89000 },
  { id: 3, name: '안심', weight: '4.5kg', minPrice: 95000, bidPrice: 125000 },
  { id: 4, name: '채끝', weight: '8.2kg', minPrice: 82000, bidPrice: null },
  { id: 5, name: '갈비(좌)', weight: '12.8kg', minPrice: 78000, bidPrice: 85000 },
  { id: 6, name: '갈비(우)', weight: '12.0kg', minPrice: 78000, bidPrice: null },
  { id: 7, name: '특수부위', weight: '3.2kg', minPrice: 72000, bidPrice: 78000 },
  { id: 8, name: '설도(좌)', weight: '16.5kg', minPrice: 56000, bidPrice: 62000 },
  { id: 9, name: '설도(우)', weight: '16.8kg', minPrice: 56000, bidPrice: null },
  { id: 10, name: '앞다리', weight: '25.4kg', minPrice: 55000, bidPrice: 58000 },
  { id: 11, name: '우둔', weight: '21.7kg', minPrice: 58000, bidPrice: 65000 },
  { id: 12, name: '목심', weight: '14.0kg', minPrice: 62000, bidPrice: null },
  { id: 13, name: '양지(좌)', weight: '12.2kg', minPrice: 52000, bidPrice: 56000 },
  { id: 14, name: '양지(우)', weight: '12.4kg', minPrice: 52000, bidPrice: 55000 },
  { id: 15, name: '사태', weight: '15.1kg', minPrice: 48000, bidPrice: null },
  { id: 16, name: '꼬리', weight: '16.2kg', minPrice: 35000, bidPrice: 42000 },
  { id: 17, name: '족', weight: '10.9kg', minPrice: 25000, bidPrice: 28000 },
  { id: 18, name: '사골', weight: '3.1kg', minPrice: 20000, bidPrice: null },
  { id: 19, name: '잡뼈', weight: '21.5kg', minPrice: 15000, bidPrice: 18000 },
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
}

// 더미 데이터
const dummyAuctions: Auction[] = [
  { 
    id: '1', 
    auctionNo: '260119-101', 
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
    slaughterDate: '2026.01.16',
    slaughterNo: '201',
    carcassWeight: 520, 
    company: '건화',
    processDate: '2026.01.17',
    processWeight: 312,
  },
  { 
    id: '2', 
    auctionNo: '260119-201', 
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
    slaughterDate: '2026.01.16',
    slaughterNo: '202',
    carcassWeight: 485, 
    company: '대진엠에스',
    processDate: '2026.01.17',
    processWeight: 291,
  },
  { 
    id: '3', 
    auctionNo: '260119-301', 
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
    slaughterDate: '2026.01.16',
    slaughterNo: '203',
    carcassWeight: 512, 
    company: '안심엘피씨',
    processDate: '2026.01.17',
    processWeight: 307,
  },
  { 
    id: '4', 
    auctionNo: '260119-401', 
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
    slaughterDate: '2026.01.16',
    slaughterNo: '204',
    carcassWeight: 468, 
    company: '정직한고기',
    processDate: '2026.01.17',
    processWeight: 281,
  },
];

export default function AuctionsListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // 필터링된 데이터
  const filteredAuctions = dummyAuctions.filter(auction => {
    const matchesSearch = 
      auction.auctionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.traceNo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = companyFilter === 'all' || auction.company === companyFilter;
    
    return matchesSearch && matchesCompany;
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);
  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 고유 업체 목록
  const companies = [...new Set(dummyAuctions.map(a => a.company))];

  // 행 확장/축소
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // 상장번호 생성
  const generateListingNo = (auctionNo: string, partIndex: number) => {
    return `${auctionNo.replace('-', '')}-${String(partIndex + 1).padStart(4, '0')}`;
  };

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">오늘의 경매 상장 내역</h1>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 검색 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="접수번호, 업체명, 이력번호로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
              />
            </div>
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-3">
            {/* 날짜 필터 */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-sm"
              />
            </div>

            {/* 업체 필터 */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-sm"
            >
              <option value="all">전체 업체</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>

            {/* 내보내기 */}
            <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 bg-white">
              <Download className="w-4 h-4" />
              내보내기
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="w-10 px-2 py-3"></th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">접수번호</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">축종</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">성별</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">등급</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">개월령</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">등지방</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">등심면적</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">육색</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">지방색</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">조직감</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">성숙도</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">이력번호</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">도축장</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">도축일</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">도축번호</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">도체중</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">가공업체</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">가공일</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">가공중량</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">사진</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedAuctions.map((auction) => (
                <React.Fragment key={auction.id}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(auction.id)}
                  >
                    <td className="px-2 py-4 text-center">
                      {expandedId === auction.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900 text-center">{auction.auctionNo}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.breed}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.gender}</td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900 text-center">{auction.grade}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.monthAge}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.backFat}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.eyeMuscle}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.meatColor}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.fatColor}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.texture}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.maturity}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.traceNo}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.slaughterHouse}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.slaughterDate}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.slaughterNo}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.carcassWeight}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.company}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.processDate}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 text-center">{auction.processWeight}</td>
                    <td className="px-3 py-4 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                  {/* 확장된 부위 테이블 */}
                  {expandedId === auction.id && (
                    <tr>
                      <td colSpan={21} className="px-4 py-4 bg-gray-50">
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
                                {PARTS_DATA.slice(colIndex * 7, colIndex * 7 + 7).map((part, idx) => {
                                  const globalIdx = colIndex * 7 + idx;
                                  if (globalIdx >= 19) return null;
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
                                          <span className="text-gray-400">유찰</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ))}
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
    </AdminLayout>
  );
}
