'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { SLAUGHTER_HOUSES } from '@/constants/slaughterHouses';
import { 
  Plus, 
  Edit, 
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import {
  useDealers,
  useCreateDealer,
  useUpdateDealer,
  useDeleteDealer,
  useUpdateDealerStatus,
  useCreateDealerEmployee,
  useUpdateDealerEmployee,
  useDeleteDealerEmployee,
  useUpdateDealerEmployeeStatus,
} from '@/features/dealers/hooks';
import {
  DealerWithEmployees,
  DealerEmployee,
  CreateDealerInput,
  UpdateDealerInput,
  CreateDealerEmployeeInput,
  UpdateDealerEmployeeInput,
} from '@/features/dealers/types';

export default function DealersPage() {
  const { data: dealers = [], isLoading, error } = useDealers();
  
  const createDealerMutation = useCreateDealer();
  const updateDealerMutation = useUpdateDealer();
  const deleteDealerMutation = useDeleteDealer();
  const updateDealerStatusMutation = useUpdateDealerStatus();
  
  const createEmployeeMutation = useCreateDealerEmployee();
  const updateEmployeeMutation = useUpdateDealerEmployee();
  const deleteEmployeeMutation = useDeleteDealerEmployee();
  const updateEmployeeStatusMutation = useUpdateDealerEmployeeStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDealer, setExpandedDealer] = useState<string | null>(null);

  // 중도매인 상태
  const [editingDealerId, setEditingDealerId] = useState<string | null>(null);
  const [isAddingDealer, setIsAddingDealer] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<DealerWithEmployees | null>(null);

  // 직원 상태
  const [addingEmployeeToDealerId, setAddingEmployeeToDealerId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<DealerEmployee | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    dealerNo: '',
    name: '',
    representativeName: '',
    businessNo: '',
    phone: '',
    auctionPassword: '',
    address: '',
    slaughterHouse: '',
    status: 'active' as 'active' | 'inactive',
  });

  // 직원 폼 데이터
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    phone: '',
    password: '',
    address: '',
    role: '',
    position: '',
    status: 'active' as 'active' | 'inactive',
  });

  const filteredDealers = dealers.filter(dealer => {
    const matchesDealerSearch = 
      dealer.name.includes(searchQuery) ||
      dealer.dealerNo.includes(searchQuery) ||
      dealer.phone.includes(searchQuery);
    
    const matchesEmployeeSearch = dealer.employees.some(emp => 
      emp.name.includes(searchQuery) ||
      emp.phone.includes(searchQuery)
    );
    
    return matchesDealerSearch || matchesEmployeeSearch;
  }).sort((a, b) => a.dealerNo.localeCompare(b.dealerNo));

  const toggleExpand = (dealerId: string) => {
    setExpandedDealer(expandedDealer === dealerId ? null : dealerId);
  };

  // 수정 인라인 열기
  const handleEditOpen = (dealer: DealerWithEmployees, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDealer(dealer);
    setFormData({
      dealerNo: dealer.dealerNo,
      name: dealer.name,
      representativeName: dealer.representativeName || '',
      businessNo: dealer.businessNo || '',
      phone: dealer.phone,
      auctionPassword: '',
      address: dealer.address || '',
      slaughterHouse: dealer.slaughterHouse || '',
      status: dealer.status,
    });
    setEditingDealerId(dealer.id);
  };

  const handleEditCancel = () => {
    setEditingDealerId(null);
    setSelectedDealer(null);
    setFormData({ dealerNo: '', name: '', representativeName: '', businessNo: '', phone: '', auctionPassword: '', address: '', slaughterHouse: '', status: 'active' });
  };

  const handleEditSave = async () => {
    if (!editingDealerId) return;
    
    const input: UpdateDealerInput = {
      name: formData.name,
      representativeName: formData.representativeName || undefined,
      businessNo: formData.businessNo || undefined,
      phone: formData.phone,
      address: formData.address || undefined,
      slaughterHouse: formData.slaughterHouse || null,
      status: formData.status,
    };

    if (formData.auctionPassword) input.auctionPassword = formData.auctionPassword;

    try {
      await updateDealerMutation.mutateAsync({ id: editingDealerId, input });
      handleEditCancel();
    } catch (err) {
      console.error('Failed to update dealer:', err);
      alert('수정에 실패했습니다.');
    }
  };

  // 등록 인라인 열기
  const handleAddOpen = () => {
    const nextNo = 7000000 + dealers.length + 1;
    setFormData({
      dealerNo: nextNo.toString(),
      name: '',
      representativeName: '',
      businessNo: '',
      phone: '',
      auctionPassword: '',
      address: '',
      slaughterHouse: '',
      status: 'active',
    });
    setIsAddingDealer(true);
  };

  const handleAddCancel = () => {
    setIsAddingDealer(false);
    setFormData({ dealerNo: '', name: '', representativeName: '', businessNo: '', phone: '', auctionPassword: '', address: '', slaughterHouse: '', status: 'active' });
  };

  const handleAddSave = async () => {
    const input: CreateDealerInput = {
      dealerNo: formData.dealerNo,
      name: formData.name,
      representativeName: formData.representativeName || undefined,
      businessNo: formData.businessNo || undefined,
      phone: formData.phone,
      password: '0000',
      auctionPassword: formData.auctionPassword || '0000',
      address: formData.address || undefined,
      slaughterHouse: formData.slaughterHouse || null,
      status: formData.status,
    };

    try {
      await createDealerMutation.mutateAsync(input);
      handleAddCancel();
    } catch (err) {
      console.error('Failed to create dealer:', err);
      alert('등록에 실패했습니다.');
    }
  };

  // 상태 변경
  const handleStatusChange = async (dealerId: string, status: 'active' | 'inactive') => {
    try {
      await updateDealerStatusMutation.mutateAsync({ id: dealerId, status });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // 직원 추가 인라인 열기
  const handleAddEmployeeOpen = (dealer: DealerWithEmployees, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDealer(dealer);
    setEmployeeFormData({ name: '', phone: '', password: '', address: '', role: '', position: '', status: 'active' });
    setAddingEmployeeToDealerId(dealer.id);
  };

  const handleAddEmployeeCancel = () => {
    setAddingEmployeeToDealerId(null);
    setEmployeeFormData({ name: '', phone: '', password: '', address: '', role: '', position: '', status: 'active' });
  };

  const handleAddEmployeeSave = async () => {
    if (!addingEmployeeToDealerId) return;

    const input: CreateDealerEmployeeInput = {
      dealerId: addingEmployeeToDealerId,
      name: employeeFormData.name,
      phone: employeeFormData.phone,
      password: employeeFormData.password,
      address: employeeFormData.address || undefined,
      role: employeeFormData.role || undefined,
      position: employeeFormData.position || undefined,
      status: employeeFormData.status,
    };

    try {
      await createEmployeeMutation.mutateAsync(input);
      handleAddEmployeeCancel();
    } catch (err) {
      console.error('Failed to create employee:', err);
      alert('직원 등록에 실패했습니다.');
    }
  };

  // 직원 수정 인라인 열기
  const handleEditEmployeeOpen = (dealer: DealerWithEmployees, employee: DealerEmployee) => {
    setSelectedDealer(dealer);
    setSelectedEmployee(employee);
    setEmployeeFormData({
      name: employee.name,
      phone: employee.phone,
      password: '',
      address: employee.address || '',
      role: employee.role || '',
      position: employee.position || '',
      status: employee.status,
    });
    setEditingEmployeeId(employee.id);
  };

  const handleEditEmployeeCancel = () => {
    setEditingEmployeeId(null);
    setSelectedDealer(null);
    setSelectedEmployee(null);
    setEmployeeFormData({ name: '', phone: '', password: '', address: '', role: '', position: '', status: 'active' });
  };

  const handleEditEmployeeSave = async () => {
    if (!selectedEmployee) return;

    const input: UpdateDealerEmployeeInput = {
      name: employeeFormData.name,
      phone: employeeFormData.phone,
      address: employeeFormData.address || undefined,
      role: employeeFormData.role || undefined,
      position: employeeFormData.position || undefined,
      status: employeeFormData.status,
    };
    
    if (employeeFormData.password) input.password = employeeFormData.password;

    try {
      await updateEmployeeMutation.mutateAsync({ id: selectedEmployee.id, input });
      handleEditEmployeeCancel();
    } catch (err) {
      console.error('Failed to update employee:', err);
      alert('직원 수정에 실패했습니다.');
    }
  };

  // 직원 상태 변경
  const handleEmployeeStatusChange = async (employeeId: string, status: 'active' | 'inactive') => {
    try {
      await updateEmployeeStatusMutation.mutateAsync({ id: employeeId, status });
    } catch (err) {
      console.error('Failed to update employee status:', err);
    }
  };

  // 전화번호 포맷팅 함수
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

  const formatBusinessNo = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 5) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setEmployeeFormData({ ...employeeFormData, phone: formatted });
  };

  const handleDealerPhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, phone: formatted });
  };

  const getRoleText = (role: string | null) => {
    return role || '-';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const datePart = date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      .replace(/\. /g, '-').replace('.', '');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${datePart} ${hours}:${minutes}`;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">로딩 중...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-2">데이터를 불러오는데 실패했습니다.</p>
            <p className="text-sm text-gray-500">{(error as Error).message}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">중도매인 관리</h1>
      </div>

      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="이름, 중매인번호, 전화번호, 경매대리인/직원 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
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
              중도매인 등록
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '1100px' }}>
            <thead>
              <tr>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ width: 32 }}></th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 100 }}>중도매인번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 100 }}>중도매인명</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 80 }}>대표자명</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 120 }}>사업자등록번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 130 }}>대표번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 90 }}>경매 비밀번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 200 }}>주소</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 110 }}>소속 공판장</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">등록일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">직원수</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 50 }}>수정</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 90 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {/* 인라인 중도매인 등록 행 */}
              {isAddingDealer && (
                <tr>
                  <td className="px-2 py-2 text-center border border-gray-200">-</td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.dealerNo}
                      onChange={(e) => setFormData({ ...formData, dealerNo: e.target.value })}
                      placeholder="7000000"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="중도매인명"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.representativeName}
                      onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                      placeholder="대표자명"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.businessNo}
                      onChange={(e) => setFormData({ ...formData, businessNo: formatBusinessNo(e.target.value) })}
                      placeholder="000-00-00000"
                      maxLength={12}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="대표번호"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.auctionPassword}
                      onChange={(e) => setFormData({ ...formData, auctionPassword: e.target.value })}
                      placeholder="경매 비밀번호"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="주소"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-200">
                    <select
                      value={formData.slaughterHouse}
                      onChange={(e) => setFormData({ ...formData, slaughterHouse: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                    >
                      <option value="">미지정</option>
                      {SLAUGHTER_HOUSES.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 border border-gray-200 text-sm text-gray-400 text-center">-</td>
                  <td className="px-2 py-2 border border-gray-200 text-sm text-gray-400 text-center">-</td>
                  <td className="px-2 py-2 border border-gray-200" colSpan={2}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleAddSave}
                        disabled={!formData.dealerNo || !formData.name || !formData.phone || createDealerMutation.isPending}
                        className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createDealerMutation.isPending ? '저장중...' : '저장'}
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
              {filteredDealers.map((dealer) => (
                <React.Fragment key={dealer.id}>
                  {editingDealerId === dealer.id ? (
                    <tr>
                      <td className="px-2 py-2 text-center border border-gray-200">
                        {expandedDealer === dealer.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.dealerNo}
                          disabled
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-100 text-gray-500 text-center"
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
                          value={formData.representativeName}
                          onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                          placeholder="대표자명"
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.businessNo}
                          onChange={(e) => setFormData({ ...formData, businessNo: formatBusinessNo(e.target.value) })}
                          placeholder="000-00-00000"
                          maxLength={12}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.auctionPassword}
                          onChange={(e) => setFormData({ ...formData, auctionPassword: e.target.value })}
                          placeholder="변경시 입력"
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <select
                          value={formData.slaughterHouse}
                          onChange={(e) => setFormData({ ...formData, slaughterHouse: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        >
                          <option value="">미지정</option>
                          {SLAUGHTER_HOUSES.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center whitespace-nowrap">{formatDate(dealer.createdAt)}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center whitespace-nowrap">{dealer.employees.length}명</td>
                      <td className="px-2 py-2 border border-gray-200" colSpan={2}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={handleEditSave}
                            disabled={!formData.name || !formData.phone || updateDealerMutation.isPending}
                            className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updateDealerMutation.isPending ? '저장중...' : '저장'}
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
                    <tr 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(dealer.id)}
                    >
                      <td className="px-2 py-2 text-center border border-gray-200">
                        {expandedDealer === dealer.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-sm font-medium text-gray-900 text-center whitespace-nowrap">{dealer.dealerNo}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm font-medium text-gray-900 text-center whitespace-nowrap">{dealer.name}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center whitespace-nowrap">{dealer.representativeName || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center whitespace-nowrap">{dealer.businessNo || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center whitespace-nowrap">{dealer.phone}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center whitespace-nowrap">••••</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 whitespace-nowrap">{dealer.address || '-'}</td>
                      <td className={`px-2 py-2 border border-gray-200 text-sm text-center whitespace-nowrap ${dealer.slaughterHouse ? 'text-gray-900 font-medium' : 'text-amber-600'}`}>{dealer.slaughterHouse || '미지정'}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center whitespace-nowrap">{formatDate(dealer.createdAt)}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center whitespace-nowrap">{dealer.employees.length}명</td>
                      <td className="px-2 py-2 border border-gray-200">
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={(e) => handleEditOpen(dealer, e)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" 
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 border border-gray-200" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={dealer.status}
                          onChange={(e) => handleStatusChange(dealer.id, e.target.value as 'active' | 'inactive')}
                          className="w-full px-3 py-1.5 text-sm border border-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        >
                          <option value="active">활성</option>
                          <option value="inactive">비활성</option>
                        </select>
                      </td>
                    </tr>
                  )}
                  {/* 직원 목록 (펼침) */}
                  {expandedDealer === dealer.id && (
                    <tr>
                      <td colSpan={13} className="p-0">
                        <div className="p-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">경매대리인 / 직원 목록</h4>
                            <button
                              onClick={(e) => handleAddEmployeeOpen(dealer, e)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-white hover:bg-gray-800 transition-colors text-xs font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              직원 추가
                            </button>
                          </div>
                          {(dealer.employees.length > 0 || addingEmployeeToDealerId === dealer.id) ? (
                            <table className="w-full bg-white border border-gray-200 table-fixed border-collapse">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[100px] border border-gray-200">구분</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[80px] border border-gray-200">직책</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[80px] border border-gray-200">성함</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[140px] border border-gray-200">연락처(ID)</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[100px] border border-gray-200">비밀번호</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[180px] border border-gray-200">주소</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[100px] border border-gray-200">등록일</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[140px] border border-gray-200">최근로그인</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[60px] border border-gray-200">수정</th>
                                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[80px] border border-gray-200">상태</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dealer.employees.map((employee) => (
                                  editingEmployeeId === employee.id ? (
                                    <tr key={employee.id} className="bg-gray-50">
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                        <input
                                          type="text"
                                          value={employeeFormData.role}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                                          placeholder="구분"
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                        <input
                                          type="text"
                                          value={employeeFormData.position}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, position: e.target.value })}
                                          placeholder="직책"
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                        <input
                                          type="text"
                                          value={employeeFormData.name}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                                          placeholder="성함"
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                        <input
                                          type="text"
                                          value={employeeFormData.phone}
                                          onChange={(e) => handlePhoneChange(e.target.value)}
                                          placeholder="010-0000-0000"
                                          maxLength={13}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                        <input
                                          type="text"
                                          value={employeeFormData.password}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                                          placeholder="변경시 입력"
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                        <input
                                          type="text"
                                          value={employeeFormData.address}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                                          placeholder="주소"
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-2 py-2 text-sm text-gray-400 text-center border border-gray-200 whitespace-nowrap">{formatDate(employee.createdAt)}</td>
                                      <td className="px-2 py-2 text-sm text-gray-400 text-center border border-gray-200 whitespace-nowrap">{formatDateTime(employee.lastLoginAt)}</td>
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap" colSpan={2}>
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            onClick={handleEditEmployeeSave}
                                            disabled={!employeeFormData.name || !employeeFormData.phone || updateEmployeeMutation.isPending}
                                            className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {updateEmployeeMutation.isPending ? '저장중...' : '저장'}
                                          </button>
                                          <button
                                            onClick={handleEditEmployeeCancel}
                                            className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                                          >
                                            취소
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : (
                                    <tr key={employee.id} className="hover:bg-gray-50">
                                      <td className="px-2 py-2 text-sm text-gray-600 text-center border border-gray-200 whitespace-nowrap">{getRoleText(employee.role)}</td>
                                      <td className="px-2 py-2 text-sm text-gray-600 text-center border border-gray-200 whitespace-nowrap">{employee.position || '-'}</td>
                                      <td className="px-2 py-2 text-sm text-gray-900 text-center border border-gray-200 whitespace-nowrap">{employee.name}</td>
                                      <td className="px-2 py-2 text-sm text-gray-600 text-center border border-gray-200 whitespace-nowrap">{employee.phone}</td>
                                      <td className="px-2 py-2 text-sm text-gray-600 text-center border border-gray-200 whitespace-nowrap">••••</td>
                                      <td className="px-2 py-2 text-sm text-gray-600 text-center border border-gray-200 whitespace-nowrap">{employee.address || '-'}</td>
                                      <td className="px-2 py-2 text-sm text-gray-500 text-center border border-gray-200 whitespace-nowrap">{formatDate(employee.createdAt)}</td>
                                      <td className="px-2 py-2 text-sm text-gray-500 text-center border border-gray-200 whitespace-nowrap">{formatDateTime(employee.lastLoginAt)}</td>
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                        <div className="flex items-center justify-center">
                                          <button 
                                            onClick={() => handleEditEmployeeOpen(dealer, employee)}
                                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" 
                                            title="수정"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                      <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                        <select
                                          value={employee.status}
                                          onChange={(e) => handleEmployeeStatusChange(employee.id, e.target.value as 'active' | 'inactive')}
                                          className="w-full px-2 py-1 text-xs border border-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        >
                                          <option value="active">활성</option>
                                          <option value="inactive">비활성</option>
                                        </select>
                                      </td>
                                    </tr>
                                  )
                                ))}
                                {/* 인라인 직원 추가 행 */}
                                {addingEmployeeToDealerId === dealer.id && (
                                  <tr>
                                    <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                      <input
                                        type="text"
                                        value={employeeFormData.role}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                                        placeholder="구분"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                      <input
                                        type="text"
                                        value={employeeFormData.position}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, position: e.target.value })}
                                        placeholder="직책"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                      <input
                                        type="text"
                                        value={employeeFormData.name}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                                        placeholder="성함"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                      <input
                                        type="text"
                                        value={employeeFormData.phone}
                                        onChange={(e) => handlePhoneChange(e.target.value)}
                                        placeholder="010-0000-0000"
                                        maxLength={13}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                      <input
                                        type="text"
                                        value={employeeFormData.password}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                                        placeholder="비밀번호"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-2 py-2 border border-gray-200 whitespace-nowrap">
                                      <input
                                        type="text"
                                        value={employeeFormData.address}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                                        placeholder="주소"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-sm text-gray-400 text-center border border-gray-200 whitespace-nowrap">-</td>
                                    <td className="px-2 py-2 text-sm text-gray-400 text-center border border-gray-200 whitespace-nowrap">-</td>
                                    <td className="px-2 py-2 border border-gray-200 whitespace-nowrap" colSpan={2}>
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={handleAddEmployeeSave}
                                          disabled={!employeeFormData.name || !employeeFormData.phone || !employeeFormData.password || createEmployeeMutation.isPending}
                                          className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {createEmployeeMutation.isPending ? '저장중...' : '저장'}
                                        </button>
                                        <button
                                          onClick={handleAddEmployeeCancel}
                                          className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-center py-6 text-sm text-gray-500 bg-white border border-gray-200">
                              등록된 경매대리인/직원이 없습니다.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            총 {filteredDealers.length}명
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
