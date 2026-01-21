'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  MoreHorizontal,
  UserCheck,
  UserX,
  Filter
} from 'lucide-react';
import Link from 'next/link';

// 회원 데이터 타입
interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'dealer' | 'company' | 'admin';
  status: 'active' | 'pending' | 'suspended';
  bidCount: number;
  totalAmount: number;
  createdAt: string;
  lastLogin: string;
}

// 더미 데이터
const dummyMembers: Member[] = [
  { id: '1', name: '김하누', email: 'kimhanu@email.com', phone: '010-1234-5678', type: 'dealer', status: 'active', bidCount: 152, totalAmount: 45000000, createdAt: '2024-03-15', lastLogin: '2026-01-19 11:30' },
  { id: '2', name: '박소고', email: 'parksogo@email.com', phone: '010-2345-6789', type: 'dealer', status: 'active', bidCount: 98, totalAmount: 32000000, createdAt: '2024-05-20', lastLogin: '2026-01-19 10:15' },
  { id: '3', name: '이한우', email: 'leehanu@email.com', phone: '010-3456-7890', type: 'dealer', status: 'pending', bidCount: 0, totalAmount: 0, createdAt: '2026-01-18', lastLogin: '-' },
  { id: '4', name: '최육우', email: 'choiyukwoo@email.com', phone: '010-4567-8901', type: 'dealer', status: 'active', bidCount: 67, totalAmount: 21000000, createdAt: '2024-08-10', lastLogin: '2026-01-18 16:45' },
  { id: '5', name: '정도매', email: 'jungdomae@email.com', phone: '010-5678-9012', type: 'dealer', status: 'suspended', bidCount: 23, totalAmount: 8500000, createdAt: '2024-06-25', lastLogin: '2025-12-20 09:00' },
  { id: '6', name: '건화식품', email: 'gunhwa@company.com', phone: '02-1234-5678', type: 'company', status: 'active', bidCount: 0, totalAmount: 0, createdAt: '2024-01-10', lastLogin: '2026-01-19 09:00' },
  { id: '7', name: '대진엠에스', email: 'daejin@company.com', phone: '02-2345-6789', type: 'company', status: 'active', bidCount: 0, totalAmount: 0, createdAt: '2024-01-10', lastLogin: '2026-01-19 08:30' },
  { id: '8', name: '한우사', email: 'hanwoosa@email.com', phone: '010-6789-0123', type: 'dealer', status: 'active', bidCount: 45, totalAmount: 15000000, createdAt: '2024-09-05', lastLogin: '2026-01-19 12:00' },
  { id: '9', name: '육우맨', email: 'yukwooman@email.com', phone: '010-7890-1234', type: 'dealer', status: 'active', bidCount: 89, totalAmount: 28000000, createdAt: '2024-04-18', lastLogin: '2026-01-18 14:30' },
  { id: '10', name: '소고기킹', email: 'beefking@email.com', phone: '010-8901-2345', type: 'dealer', status: 'pending', bidCount: 0, totalAmount: 0, createdAt: '2026-01-17', lastLogin: '-' },
];

export default function UsersListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const itemsPerPage = 10;

  // 필터링된 데이터
  const filteredMembers = dummyMembers.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);
    
    const matchesType = typeFilter === 'all' || member.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />활성</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" />대기</span>;
      case 'suspended':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700"><XCircle className="w-3 h-3" />정지</span>;
      default:
        return null;
    }
  };

  // 회원 유형 배지
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'dealer':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">중도매인</span>;
      case 'company':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">가공업체</span>;
      case 'admin':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">관리자</span>;
      default:
        return null;
    }
  };

  // 전체 선택
  const handleSelectAll = () => {
    if (selectedUsers.length === paginatedMembers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedMembers.map(m => m.id));
    }
  };

  // 개별 선택
  const handleSelectOne = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(u => u !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  // 상세보기
  const handleViewDetail = (member: Member) => {
    setSelectedUser(member);
    setShowDetailModal(true);
  };

  // 통계
  const stats = {
    total: dummyMembers.length,
    active: dummyMembers.filter(m => m.status === 'active').length,
    pending: dummyMembers.filter(m => m.status === 'pending').length,
    suspended: dummyMembers.filter(m => m.status === 'suspended').length,
  };

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          회원 등록
        </button>
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
                placeholder="이름, 이메일, 전화번호로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
              />
            </div>
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-3">
            {/* 회원 유형 필터 */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm bg-white"
            >
              <option value="all">전체 유형</option>
              <option value="dealer">중도매인</option>
              <option value="company">가공업체</option>
              <option value="admin">관리자</option>
            </select>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm bg-white"
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="pending">대기</option>
              <option value="suspended">정지</option>
            </select>

            {/* 엑셀 */}
            <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 bg-white">
              <Download className="w-4 h-4" />
              엑셀
            </button>
          </div>
        </div>

        {/* 선택된 항목 액션 */}
        {selectedUsers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
            <span className="text-sm text-gray-600">{selectedUsers.length}명 선택됨</span>
            <button className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium">
              <UserCheck className="w-4 h-4" />
              일괄 승인
            </button>
            <button className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium">
              <UserX className="w-4 h-4" />
              일괄 정지
            </button>
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
                    checked={selectedUsers.length === paginatedMembers.length && paginatedMembers.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border border-gray-200 bg-white checked:bg-red-600 checked:border-red-600 focus:ring-red-500 focus:ring-offset-0 appearance-none cursor-pointer relative checked:before:content-['✓'] checked:before:absolute checked:before:inset-0 checked:before:flex checked:before:items-center checked:before:justify-center checked:before:text-white checked:before:text-xs checked:before:font-bold"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">회원정보</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">연락처</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">유형</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">입찰수</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">총 거래액</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">최근 로그인</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(member.id)}
                      onChange={() => handleSelectOne(member.id)}
                      className="w-4 h-4 rounded border border-gray-200 bg-white checked:bg-red-600 checked:border-red-600 focus:ring-red-500 focus:ring-offset-0 appearance-none cursor-pointer relative checked:before:content-['✓'] checked:before:absolute checked:before:inset-0 checked:before:flex checked:before:items-center checked:before:justify-center checked:before:text-white checked:before:text-xs checked:before:font-bold"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5" />
                      {member.phone}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">{getTypeBadge(member.type)}</td>
                  <td className="px-4 py-4 text-center">{getStatusBadge(member.status)}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right font-medium">{member.bidCount}건</td>
                  <td className="px-4 py-4 text-sm text-gray-900 text-right font-medium">
                    {member.totalAmount > 0 ? `${(member.totalAmount / 10000).toLocaleString()}만원` : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">{member.lastLogin}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewDetail(member)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
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
            총 {filteredMembers.length}명 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredMembers.length)}명 표시
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

      {/* 상세보기 모달 */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">회원 상세정보</h3>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{selectedUser.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getTypeBadge(selectedUser.type)}
                  {getStatusBadge(selectedUser.status)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">이메일</p>
                  <p className="text-sm text-gray-900">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">전화번호</p>
                  <p className="text-sm text-gray-900">{selectedUser.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">가입일</p>
                  <p className="text-sm text-gray-900">{selectedUser.createdAt}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedUser.bidCount}</p>
                <p className="text-xs text-gray-500">총 입찰수</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {selectedUser.totalAmount > 0 ? `${(selectedUser.totalAmount / 10000).toLocaleString()}만` : '0'}
                </p>
                <p className="text-xs text-gray-500">총 거래액</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                닫기
              </button>
              <button className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                수정
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
