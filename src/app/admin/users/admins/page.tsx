'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Plus, 
  Edit, 
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from 'lucide-react';
import {
  useAdmins,
  useCreateAdmin,
  useUpdateAdmin,
  useUpdateAdminStatus,
} from '@/features/admins/hooks';
import { Admin } from '@/features/admins/types';

export default function AdminsPage() {
  const { data: admins = [], isLoading, error } = useAdmins();
  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();
  const updateStatusMutation = useUpdateAdminStatus();

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
    position: '',
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
      (admin.position && admin.position.includes(searchQuery)) ||
      admin.phone.includes(searchQuery);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage) || 1;
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

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\. /g, '.').replace(/\.$/, '');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\. /g, '.').replace(/\.$/, '');
  };

  // 수정 인라인 열기
  const handleEditOpen = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      department: admin.department,
      position: admin.position || '',
      name: admin.name,
      phone: admin.phone,
      password: '', // 비밀번호는 변경시에만 입력
      role: admin.role,
      status: admin.status,
    });
    setEditingAdminId(admin.id);
  };

  // 수정 취소
  const handleEditCancel = () => {
    setEditingAdminId(null);
    setSelectedAdmin(null);
    setFormData({ department: '', position: '', name: '', phone: '', password: '', role: 'admin', status: 'active' });
  };

  // 수정 저장
  const handleEditSave = async () => {
    if (!editingAdminId) return;
    try {
      await updateAdminMutation.mutateAsync({
        id: editingAdminId,
        input: {
          department: formData.department,
          position: formData.position || undefined,
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          status: formData.status,
          ...(formData.password && { password: formData.password }),
        },
      });
      setEditingAdminId(null);
      setSelectedAdmin(null);
      setFormData({ department: '', position: '', name: '', phone: '', password: '', role: 'admin', status: 'active' });
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정 실패');
    }
  };

  // 등록 인라인 열기
  const handleAddOpen = () => {
    setFormData({
      department: '',
      position: '',
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
    setFormData({ department: '', position: '', name: '', phone: '', password: '', role: 'admin', status: 'active' });
  };

  // 등록 저장
  const handleAddSave = async () => {
    try {
      await createAdminMutation.mutateAsync({
        department: formData.department,
        position: formData.position || undefined,
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        status: formData.status,
      });
      setIsAddingAdmin(false);
      setFormData({ department: '', position: '', name: '', phone: '', password: '', role: 'admin', status: 'active' });
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록 실패');
    }
  };

  // 상태 변경
  const handleStatusChange = async (adminId: string, status: 'active' | 'inactive') => {
    try {
      await updateStatusMutation.mutateAsync({ id: adminId, status });
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경 실패');
    }
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">데이터를 불러오는데 실패했습니다.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">관리자 관리</h1>
      </div>

      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="소속, 이름, 연락처로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
          />
          <div className="flex items-center gap-2 ml-auto">
            <button className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-700 bg-white">
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
            <button 
              onClick={handleAddOpen}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white hover:bg-gray-800 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              관리자 등록
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[120px]">소속</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[80px]">직책</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[80px]">이름</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[130px]">연락처(ID)</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[100px]">비밀번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[100px]">권한</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[100px]">등록일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[140px]">최근로그인</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[50px]">수정</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-[80px]">상태</th>
              </tr>
            </thead>
            <tbody>
              {/* 인라인 관리자 등록 행 */}
              {isAddingAdmin && (
                <tr>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="소속"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="직책"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="이름"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="010-0000-0000"
                      maxLength={13}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="비밀번호"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'master' | 'admin' })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    >
                      <option value="master">마스터권한</option>
                      <option value="admin">관리자</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 border border-gray-200 text-sm text-gray-400 text-center">-</td>
                  <td className="px-2 py-2 border border-gray-200 text-sm text-gray-400 text-center">-</td>
                  <td className="px-2 py-2 border border-gray-200">
                    <button
                      onClick={handleAddSave}
                      disabled={!formData.department || !formData.name || !formData.phone || !formData.password || createAdminMutation.isPending}
                      className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createAdminMutation.isPending ? '...' : '저장'}
                    </button>
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <button
                      onClick={handleAddCancel}
                      className="w-full px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                    >
                      취소
                    </button>
                  </td>
                </tr>
              )}
              {paginatedAdmins.length === 0 && !isAddingAdmin ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500 border border-gray-200">
                    등록된 관리자가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedAdmins.map((admin) => (
                  editingAdminId === admin.id ? (
                    <tr key={admin.id} className="bg-gray-50">
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          placeholder="직책"
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          maxLength={13}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="변경시 입력"
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as 'master' | 'admin' })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        >
                          <option value="master">마스터권한</option>
                          <option value="admin">관리자</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center">{formatDate(admin.createdAt)}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center">-</td>
                      <td className="px-2 py-2 border border-gray-200">
                        <button
                          onClick={handleEditSave}
                          disabled={!formData.department || !formData.name || !formData.phone || updateAdminMutation.isPending}
                          className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updateAdminMutation.isPending ? '...' : '저장'}
                        </button>
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <button
                          onClick={handleEditCancel}
                          className="w-full px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                        >
                          취소
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 py-2 border border-gray-200 text-sm font-medium text-gray-900 text-center">{admin.department}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center">{admin.position || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm font-medium text-gray-900 text-center">{admin.name}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center">{admin.phone}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center">••••</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-900 text-center">{getRoleText(admin.role)}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center">{formatDate(admin.createdAt)}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center">{formatDateTime(admin.lastLoginAt)}</td>
                      <td className="px-2 py-2 border border-gray-200">
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={() => handleEditOpen(admin)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" 
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <select
                          value={admin.status}
                          onChange={(e) => handleStatusChange(admin.id, e.target.value as 'active' | 'inactive')}
                          className="w-full px-3 py-1.5 text-sm border border-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        >
                          <option value="active">활성</option>
                          <option value="inactive">비활성</option>
                        </select>
                      </td>
                    </tr>
                  )
                ))
              )}
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
              className="p-2 border border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentPage === page ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-100 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}
