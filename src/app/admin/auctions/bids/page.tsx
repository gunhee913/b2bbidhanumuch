'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Filter, 
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  User,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';

// 입찰 데이터 타입
interface Bid {
  id: string;
  bidder: string;
  bidderId: string;
  listingNo: string;
  company: string;
  grade: string;
  part: string;
  bidAmount: number;
  previousBid: number | null;
  isHighest: boolean;
  bidTime: string;
}

// 더미 데이터
const dummyBids: Bid[] = [
  { id: '1', bidder: '김하누', bidderId: '72', listingNo: '260119-001-0001', company: '건화', grade: '1++A(9)', part: '등심(좌)', bidAmount: 152000, previousBid: 150000, isHighest: true, bidTime: '2026-01-19 12:05:32' },
  { id: '2', bidder: '박소고', bidderId: '45', listingNo: '260119-002-0001', company: '대진엠에스', grade: '1++B(8)', part: '등심(우)', bidAmount: 148000, previousBid: 145000, isHighest: true, bidTime: '2026-01-19 12:04:18' },
  { id: '3', bidder: '이한우', bidderId: '33', listingNo: '260119-001-0001', company: '건화', grade: '1++A(9)', part: '등심(좌)', bidAmount: 150000, previousBid: 148000, isHighest: false, bidTime: '2026-01-19 12:02:45' },
  { id: '4', bidder: '최육우', bidderId: '28', listingNo: '260119-001-0002', company: '건화', grade: '1+A', part: '안심', bidAmount: 138000, previousBid: null, isHighest: true, bidTime: '2026-01-19 12:01:22' },
  { id: '5', bidder: '정도매', bidderId: '51', listingNo: '260119-002-0001', company: '대진엠에스', grade: '1++B(8)', part: '등심(우)', bidAmount: 145000, previousBid: 143000, isHighest: false, bidTime: '2026-01-19 11:58:10' },
  { id: '6', bidder: '한우사', bidderId: '19', listingNo: '260119-003-0001', company: '안심엘피씨', grade: '1+A', part: '채끝', bidAmount: 140000, previousBid: 138000, isHighest: true, bidTime: '2026-01-19 11:55:33' },
  { id: '7', bidder: '육우맨', bidderId: '67', listingNo: '260119-001-0001', company: '건화', grade: '1++A(9)', part: '등심(좌)', bidAmount: 148000, previousBid: 145000, isHighest: false, bidTime: '2026-01-19 11:52:17' },
  { id: '8', bidder: '소고기킹', bidderId: '82', listingNo: '260119-002-0003', company: '대진엠에스', grade: '1++A(7)', part: '갈비(좌)', bidAmount: 145000, previousBid: null, isHighest: true, bidTime: '2026-01-19 11:48:45' },
  { id: '9', bidder: '김하누', bidderId: '72', listingNo: '260119-001-0001', company: '건화', grade: '1++A(9)', part: '등심(좌)', bidAmount: 145000, previousBid: 142000, isHighest: false, bidTime: '2026-01-19 11:45:20' },
  { id: '10', bidder: '박소고', bidderId: '45', listingNo: '260119-002-0001', company: '대진엠에스', grade: '1++B(8)', part: '등심(우)', bidAmount: 143000, previousBid: 140000, isHighest: false, bidTime: '2026-01-19 11:42:08' },
];

export default function BidsHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 필터링된 데이터
  const filteredBids = dummyBids.filter(bid => {
    const matchesSearch = 
      bid.bidder.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.listingNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.bidderId.includes(searchQuery);
    
    const matchesCompany = companyFilter === 'all' || bid.company === companyFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'highest' && bid.isHighest) ||
      (statusFilter === 'outbid' && !bid.isHighest);
    const matchesDate = !dateFilter || bid.bidTime.startsWith(dateFilter);
    
    return matchesSearch && matchesCompany && matchesStatus && matchesDate;
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredBids.length / itemsPerPage);
  const paginatedBids = filteredBids.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 고유 업체 목록
  const companies = [...new Set(dummyBids.map(b => b.company))];

  // 통계
  const stats = {
    totalBids: dummyBids.length,
    uniqueBidders: new Set(dummyBids.map(b => b.bidderId)).size,
    highestBids: dummyBids.filter(b => b.isHighest).length,
    avgBidAmount: Math.round(dummyBids.reduce((sum, b) => sum + b.bidAmount, 0) / dummyBids.length),
  };

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">입찰 내역</h1>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">총 입찰 수</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalBids}건</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">참여 입찰자</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.uniqueBidders}명</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">최고가 입찰</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.highestBids}건</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">평균 입찰가</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgBidAmount.toLocaleString()}원</p>
        </div>
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
                placeholder="입찰자, 상장번호, 입찰자ID로 검색..."
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

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-sm"
            >
              <option value="all">전체 상태</option>
              <option value="highest">최고가</option>
              <option value="outbid">차순위</option>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">입찰자</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상장번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">업체</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">등급</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">부위</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">입찰가</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">입찰시간</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBids.map((bid) => (
                <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{bid.bidder}</p>
                        <p className="text-xs text-gray-500">#{bid.bidderId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/admin/auctions/${bid.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      {bid.listingNo}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{bid.company}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{bid.grade}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{bid.part}</td>
                  <td className="px-4 py-4 text-right">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{bid.bidAmount.toLocaleString()}원</p>
                      {bid.previousBid && (
                        <div className="flex items-center justify-end gap-1 text-xs text-green-600">
                          <TrendingUp className="w-3 h-3" />
                          +{(bid.bidAmount - bid.previousBid).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {bid.isHighest ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        최고가
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        차순위
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {bid.bidTime.split(' ')[1]}
                    </div>
                    <p className="text-xs text-gray-400">{bid.bidTime.split(' ')[0]}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="상세보기"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {filteredBids.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredBids.length)}개 표시
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
