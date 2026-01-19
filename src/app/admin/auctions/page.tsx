'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

// 경매 데이터 타입
interface Auction {
  id: string;
  auctionNo: string;
  listingNo: string;
  company: string;
  grade: string;
  type: string;
  weight: string;
  minPrice: number;
  currentBid: number;
  bidCount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  endTime: string;
}

// 더미 데이터
const dummyAuctions: Auction[] = [
  { id: '1', auctionNo: '260119-001', listingNo: '260119-001-0001', company: '건화', grade: '1++A(9)', type: '한우거세', weight: '520kg', minPrice: 85000, currentBid: 152000, bidCount: 5, status: 'active', createdAt: '2026-01-19 09:00', endTime: '2026-01-19 15:00' },
  { id: '2', auctionNo: '260119-001', listingNo: '260119-001-0002', company: '건화', grade: '1+A', type: '한우거세', weight: '498kg', minPrice: 80000, currentBid: 138000, bidCount: 3, status: 'active', createdAt: '2026-01-19 09:00', endTime: '2026-01-19 15:00' },
  { id: '3', auctionNo: '260119-001', listingNo: '260119-001-0003', company: '건화', grade: '1+B', type: '한우암', weight: '465kg', minPrice: 78000, currentBid: 0, bidCount: 0, status: 'pending', createdAt: '2026-01-19 09:00', endTime: '2026-01-19 15:00' },
  { id: '4', auctionNo: '260119-002', listingNo: '260119-002-0001', company: '대진엠에스', grade: '1++B(8)', type: '한우거세', weight: '512kg', minPrice: 83000, currentBid: 148000, bidCount: 7, status: 'active', createdAt: '2026-01-19 09:00', endTime: '2026-01-19 15:00' },
  { id: '5', auctionNo: '260119-002', listingNo: '260119-002-0002', company: '대진엠에스', grade: '1+A', type: '한우거세', weight: '488kg', minPrice: 80000, currentBid: 142000, bidCount: 4, status: 'completed', createdAt: '2026-01-19 09:00', endTime: '2026-01-19 15:00' },
  { id: '6', auctionNo: '260119-002', listingNo: '260119-002-0003', company: '대진엠에스', grade: '1++A(7)', type: '한우암', weight: '478kg', minPrice: 82000, currentBid: 145000, bidCount: 6, status: 'active', createdAt: '2026-01-19 09:00', endTime: '2026-01-19 15:00' },
  { id: '7', auctionNo: '260119-002', listingNo: '260119-002-0004', company: '대진엠에스', grade: '1+B', type: '한우암', weight: '455kg', minPrice: 76000, currentBid: 0, bidCount: 0, status: 'pending', createdAt: '2026-01-19 09:00', endTime: '2026-01-19 15:00' },
  { id: '8', auctionNo: '260119-003', listingNo: '260119-003-0001', company: '안심엘피씨', grade: '1+A', type: '한우거세', weight: '502kg', minPrice: 80000, currentBid: 140000, bidCount: 5, status: 'active', createdAt: '2026-01-19 09:00', endTime: '2026-01-19 15:00' },
  { id: '9', auctionNo: '260118-001', listingNo: '260118-001-0001', company: '건화', grade: '1++A(9)', type: '한우거세', weight: '515kg', minPrice: 85000, currentBid: 155000, bidCount: 8, status: 'completed', createdAt: '2026-01-18 09:00', endTime: '2026-01-18 15:00' },
  { id: '10', auctionNo: '260118-001', listingNo: '260118-001-0002', company: '건화', grade: '1+A', type: '한우암', weight: '462kg', minPrice: 78000, currentBid: 0, bidCount: 0, status: 'cancelled', createdAt: '2026-01-18 09:00', endTime: '2026-01-18 15:00' },
];

export default function AuctionsListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAuctions, setSelectedAuctions] = useState<string[]>([]);
  const itemsPerPage = 10;

  // 필터링된 데이터
  const filteredAuctions = dummyAuctions.filter(auction => {
    const matchesSearch = 
      auction.listingNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.grade.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || auction.status === statusFilter;
    const matchesCompany = companyFilter === 'all' || auction.company === companyFilter;
    const matchesDate = !dateFilter || auction.createdAt.startsWith(dateFilter);
    
    return matchesSearch && matchesStatus && matchesCompany && matchesDate;
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);
  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"><Clock className="w-3 h-3" />진행중</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />완료</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3" />대기</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700"><XCircle className="w-3 h-3" />취소</span>;
      default:
        return null;
    }
  };

  // 전체 선택
  const handleSelectAll = () => {
    if (selectedAuctions.length === paginatedAuctions.length) {
      setSelectedAuctions([]);
    } else {
      setSelectedAuctions(paginatedAuctions.map(a => a.id));
    }
  };

  // 개별 선택
  const handleSelectOne = (id: string) => {
    if (selectedAuctions.includes(id)) {
      setSelectedAuctions(selectedAuctions.filter(a => a !== id));
    } else {
      setSelectedAuctions([...selectedAuctions, id]);
    }
  };

  // 고유 업체 목록
  const companies = [...new Set(dummyAuctions.map(a => a.company))];

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">경매 목록</h1>
          <p className="text-gray-500 mt-1">등록된 경매를 관리합니다.</p>
        </div>
        <Link
          href="/admin/auctions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          경매 등록
        </Link>
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
                placeholder="상장번호, 업체명, 등급으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
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
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
              />
            </div>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            >
              <option value="all">전체 상태</option>
              <option value="pending">대기</option>
              <option value="active">진행중</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
            </select>

            {/* 업체 필터 */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            >
              <option value="all">전체 업체</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>

            {/* 내보내기 */}
            <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
              <Download className="w-4 h-4" />
              내보내기
            </button>
          </div>
        </div>

        {/* 선택된 항목 액션 */}
        {selectedAuctions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
            <span className="text-sm text-gray-600">{selectedAuctions.length}개 선택됨</span>
            <button className="text-sm text-red-600 hover:text-red-700 font-medium">일괄 삭제</button>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">상태 변경</button>
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedAuctions.length === paginatedAuctions.length && paginatedAuctions.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">상장번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">업체</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">등급</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">품종</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">최저가</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">현재가</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">입찰수</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedAuctions.map((auction) => (
                <tr key={auction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedAuctions.includes(auction.id)}
                      onChange={() => handleSelectOne(auction.id)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/admin/auctions/${auction.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      {auction.listingNo}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{auction.company}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{auction.grade}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{auction.type}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-right">{auction.minPrice.toLocaleString()}원</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">
                    {auction.currentBid > 0 ? `${auction.currentBid.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-center">{auction.bidCount}건</td>
                  <td className="px-4 py-4 text-center">{getStatusBadge(auction.status)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/admin/auctions/${auction.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/auctions/${auction.id}/edit`}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {filteredAuctions.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredAuctions.length)}개 표시
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
