'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Plus, 
  Edit, 
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';

interface Admin {
  id: string;
  department: string;
  name: string;
  phone: string;
  password: string;
  role: 'master' | 'admin';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
}

const initialAdmins: Admin[] = [
  { id: '1', department: '중부미트센터', name: '홍길동', phone: '010-1111-1111', password: '1234', role: 'master', status: 'active', createdAt: '2024-01-01', lastLogin: '2026-01-19 09:00' },
  { id: '2', department: '중부미트센터', name: '김관리', phone: '010-2222-2222', password: '1234', role: 'admin', status: 'active', createdAt: '2024-02-15', lastLogin: '2026-01-19 08:30' },
  { id: '3', department: '중부미트센터', name: '이매니저', phone: '010-3333-3333', password: '1234', role: 'admin', status: 'active', createdAt: '2024-05-20', lastLogin: '2026-01-18 17:00' },
  { id: '4', department: '농협정보', name: '박농협', phone: '010-4444-4444', password: '1234', role: 'admin', status: 'active', createdAt: '2024-06-10', lastLogin: '2026-01-19 10:00' },
  { id: '5', department: '사업개발팀', name: '최사업', phone: '010-5555-5555', password: '1234', role: 'admin', status: 'active', createdAt: '2024-07-15', lastLogin: '2026-01-18 15:30' },
  { id: '6', department: '디지털정보팀', name: '정디지털', phone: '010-6666-6666', password: '1234', role: 'admin', status: 'active', createdAt: '2024-08-20', lastLogin: '2026-01-19 11:00' },
];

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 관리자 상태
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    department: '',
    name: '',
    phone: '',
    password: '',
    role: 'admin' as 'master' | 'admin',
    status: 'active' as 'active' | 'inactive',
  });

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = 
      admin.name.includes(searchQuery) ||
      admin.department.includes(searchQuery) ||
      admin.phone.includes(searchQuery);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const paginatedAdmins = filteredAdmins.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRoleText = (role: string) => {
    switch (role) {
      case 'master': return '마스터권한';
      case 'admin': return '관리자';
      default: return '';
    }
  };

  // 수정 인라인 열기
  const handleEditOpen = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      department: admin.department,
      name: admin.name,
      phone: admin.phone,
      password: admin.password,
      role: admin.role,
      status: admin.status,
    });
    setEditingAdminId(admin.id);
  };

  // 수정 취소
  const handleEditCancel = () => {
    setEditingAdminId(null);
    setSelectedAdmin(null);
    setFormData({ department: '', name: '', phone: '', password: '', role: 'admin', status: 'active' });
  };

  // 수정 저장
  const handleEditSave = () => {
    if (!editingAdminId) return;
    setAdmins(admins.map(a => 
      a.id === editingAdminId 
        ? { ...a, ...formData }
        : a
    ));
    setEditingAdminId(null);
    setSelectedAdmin(null);
    setFormData({ department: '', name: '', phone: '', password: '', role: 'admin', status: 'active' });
  };

  // 등록 인라인 열기
  const handleAddOpen = () => {
    setFormData({
      department: '',
      name: '',
      phone: '',
      password: '',
      role: 'admin',
      status: 'active',
    });
    setIsAddingAdmin(true);
  };

  // 등록 취소
  const handleAddCancel = () => {
    setIsAddingAdmin(false);
    setFormData({ department: '', name: '', phone: '', password: '', role: 'admin', status: 'active' });
  };

  // 등록 저장
  const handleAddSave = () => {
    const today = new Date().toISOString().split('T')[0];
    const newAdmin: Admin = {
      id: (admins.length + 1).toString(),
      department: formData.department,
      name: formData.name,
      phone: formData.phone,
      password: formData.password,
      role: formData.role,
      status: formData.status,
      createdAt: today,
      lastLogin: '-',
    };
    setAdmins([...admins, newAdmin]);
    setIsAddingAdmin(false);
    setFormData({ department: '', name: '', phone: '', password: '', role: 'admin', status: 'active' });
  };

  // 전화번호 포맷팅
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, phone: formatted });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">관리자 관리</h1>
        <button 
          onClick={handleAddOpen}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          관리자 등록
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="관리자번호, 이름, 연락처로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 bg-white">
              <Download className="w-4 h-4" />
              내보내기
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">소속</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">이름</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">연락처(ID)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">비밀번호</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">권한</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">최근로그인</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">수정</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* 인라인 관리자 등록 행 */}
              {isAddingAdmin && (
                <tr className="bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="소속"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="이름"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="010-0000-0000"
                      maxLength={13}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="비밀번호"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'master' | 'admin' })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                    >
                      <option value="master">마스터권한</option>
                      <option value="admin">관리자</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-400 text-center">-</td>
                  <td className="px-4 py-4 text-sm text-gray-400 text-center">-</td>
                  <td className="px-4 py-4" colSpan={2}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleAddSave}
                        disabled={!formData.department || !formData.name || !formData.phone || !formData.password}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleAddCancel}
                        className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                      >
                        취소
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {paginatedAdmins.map((admin) => (
                editingAdminId === admin.id ? (
                  <tr key={admin.id} className="bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        maxLength={13}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'master' | 'admin' })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                      >
                        <option value="master">마스터권한</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{admin.createdAt}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{admin.lastLogin}</td>
                    <td className="px-4 py-4" colSpan={2}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={handleEditSave}
                          disabled={!formData.department || !formData.name || !formData.phone || !formData.password}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                        >
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 text-center">{admin.department}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 text-center">{admin.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">{admin.phone}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">{admin.password}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-center">{getRoleText(admin.role)}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{admin.createdAt}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{admin.lastLogin}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleEditOpen(admin)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" 
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={admin.status}
                        onChange={(e) => {
                          setAdmins(admins.map(a => 
                            a.id === admin.id 
                              ? { ...a, status: e.target.value as 'active' | 'inactive' }
                              : a
                          ));
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                      >
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                      </select>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {filteredAdmins.length}명
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
                  currentPage === page ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'
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
