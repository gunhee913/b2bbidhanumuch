'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Plus, 
  Edit, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
} from 'lucide-react';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useUpdateCompanyStatus,
  useCreateCompanyEmployee,
  useUpdateCompanyEmployee,
  useUpdateCompanyEmployeeStatus,
} from '@/features/companies/hooks';
import { CompanyWithEmployees, CompanyEmployee } from '@/features/companies/types';
import { format } from 'date-fns';

export default function CompaniesPage() {
  const { data: companies = [], isLoading, error } = useCompanies();
  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const updateCompanyStatusMutation = useUpdateCompanyStatus();
  const createEmployeeMutation = useCreateCompanyEmployee();
  const updateEmployeeMutation = useUpdateCompanyEmployee();
  const updateEmployeeStatusMutation = useUpdateCompanyEmployeeStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const itemsPerPage = 10;

  // 상장업체 상태
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithEmployees | null>(null);

  // 직원 상태
  const [addingEmployeeToCompanyId, setAddingEmployeeToCompanyId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<CompanyEmployee | null>(null);

  // 에러 상태
  const [formError, setFormError] = useState<string | null>(null);
  const [employeeFormError, setEmployeeFormError] = useState<string | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    companyNo: '',
    name: '',
    businessNo: '',
    ceo: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
  });

  // 직원 폼 데이터
  const [employeeFormData, setEmployeeFormData] = useState({
    role: '',
    name: '',
    phone: '',
    password: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
  });

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = 
      company.name.includes(searchQuery) ||
      company.companyNo.includes(searchQuery) ||
      company.businessNo.includes(searchQuery) ||
      company.ceo.includes(searchQuery) ||
      (company.phone?.includes(searchQuery) ?? false) ||
      company.employees.some(emp => 
        emp.name.includes(searchQuery) || 
        emp.phone.includes(searchQuery)
      );
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 확장/축소 토글
  const toggleExpand = (companyId: string) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch {
      return '-';
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
    } catch {
      return '-';
    }
  };

  // 수정 인라인 열기
  const handleEditOpen = (company: CompanyWithEmployees, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCompany(company);
    setFormData({
      companyNo: company.companyNo,
      name: company.name,
      businessNo: company.businessNo,
      ceo: company.ceo,
      phone: company.phone || '',
      status: company.status,
    });
    setEditingCompanyId(company.id);
    setFormError(null);
  };

  // 수정 취소
  const handleEditCancel = () => {
    setEditingCompanyId(null);
    setSelectedCompany(null);
    setFormData({ companyNo: '', name: '', businessNo: '', ceo: '', phone: '', status: 'active' });
    setFormError(null);
  };

  // 수정 저장
  const handleEditSave = async () => {
    if (!editingCompanyId) return;
    setFormError(null);
    
    try {
      await updateCompanyMutation.mutateAsync({
        id: editingCompanyId,
        input: {
          name: formData.name,
          businessNo: formData.businessNo,
          ceo: formData.ceo,
          phone: formData.phone,
          status: formData.status,
        },
      });
      setEditingCompanyId(null);
      setSelectedCompany(null);
      setFormData({ companyNo: '', name: '', businessNo: '', ceo: '', phone: '', status: 'active' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '수정에 실패했습니다.');
    }
  };

  // 등록 인라인 열기
  const handleAddOpen = () => {
    setFormData({
      companyNo: '',
      name: '',
      businessNo: '',
      ceo: '',
      phone: '',
      status: 'active',
    });
    setIsAddingCompany(true);
    setFormError(null);
  };

  // 등록 취소
  const handleAddCancel = () => {
    setIsAddingCompany(false);
    setFormData({ companyNo: '', name: '', businessNo: '', ceo: '', phone: '', status: 'active' });
    setFormError(null);
  };

  // 등록 저장
  const handleAddSave = async () => {
    setFormError(null);
    
    try {
      await createCompanyMutation.mutateAsync({
        companyNo: formData.companyNo,
        name: formData.name,
        businessNo: formData.businessNo,
        ceo: formData.ceo,
        phone: formData.phone,
        status: formData.status,
      });
      setIsAddingCompany(false);
      setFormData({ companyNo: '', name: '', businessNo: '', ceo: '', phone: '', status: 'active' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    }
  };

  // 상장업체 상태 변경
  const handleCompanyStatusChange = (companyId: string, status: 'active' | 'inactive') => {
    updateCompanyStatusMutation.mutate({ id: companyId, status });
  };

  // 직원 추가 인라인 열기
  const handleAddEmployeeOpen = (company: CompanyWithEmployees, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCompany(company);
    setEmployeeFormData({
      role: '',
      name: '',
      phone: '',
      password: '',
      address: '',
      status: 'active',
    });
    setAddingEmployeeToCompanyId(company.id);
    setEmployeeFormError(null);
  };

  // 직원 추가 취소
  const handleAddEmployeeCancel = () => {
    setAddingEmployeeToCompanyId(null);
    setSelectedCompany(null);
    setEmployeeFormData({ role: '', name: '', phone: '', password: '', address: '', status: 'active' });
    setEmployeeFormError(null);
  };

  // 직원 추가 저장
  const handleAddEmployeeSave = async (company: CompanyWithEmployees) => {
    setEmployeeFormError(null);
    
    try {
      await createEmployeeMutation.mutateAsync({
        companyId: company.id,
        role: employeeFormData.role || undefined,
        name: employeeFormData.name,
        phone: employeeFormData.phone,
        password: employeeFormData.password,
        address: employeeFormData.address || undefined,
        status: employeeFormData.status,
      });
      setAddingEmployeeToCompanyId(null);
      setSelectedCompany(null);
      setEmployeeFormData({ role: '', name: '', phone: '', password: '', address: '', status: 'active' });
    } catch (err) {
      setEmployeeFormError(err instanceof Error ? err.message : '직원 등록에 실패했습니다.');
    }
  };

  // 직원 수정 인라인 열기
  const handleEditEmployeeOpen = (company: CompanyWithEmployees, employee: CompanyEmployee) => {
    setSelectedCompany(company);
    setSelectedEmployee(employee);
    setEmployeeFormData({
      role: employee.role || '',
      name: employee.name,
      phone: employee.phone,
      password: '', // 비밀번호는 빈칸으로 (변경 시에만 입력)
      address: employee.address || '',
      status: employee.status,
    });
    setEditingEmployeeId(employee.id);
    setEmployeeFormError(null);
  };

  // 직원 수정 취소
  const handleEditEmployeeCancel = () => {
    setEditingEmployeeId(null);
    setSelectedCompany(null);
    setSelectedEmployee(null);
    setEmployeeFormData({ role: '', name: '', phone: '', password: '', address: '', status: 'active' });
    setEmployeeFormError(null);
  };

  // 직원 수정 저장
  const handleEditEmployeeSave = async () => {
    if (!selectedEmployee) return;
    setEmployeeFormError(null);
    
    try {
      await updateEmployeeMutation.mutateAsync({
        id: selectedEmployee.id,
        input: {
          role: employeeFormData.role || undefined,
          name: employeeFormData.name,
          phone: employeeFormData.phone,
          password: employeeFormData.password || undefined, // 빈칸이면 변경 안함
          address: employeeFormData.address || undefined,
          status: employeeFormData.status,
        },
      });
      setEditingEmployeeId(null);
      setSelectedCompany(null);
      setSelectedEmployee(null);
      setEmployeeFormData({ role: '', name: '', phone: '', password: '', address: '', status: 'active' });
    } catch (err) {
      setEmployeeFormError(err instanceof Error ? err.message : '직원 수정에 실패했습니다.');
    }
  };

  // 직원 상태 변경
  const handleEmployeeStatusChange = (employeeId: string, status: 'active' | 'inactive') => {
    updateEmployeeStatusMutation.mutate({ id: employeeId, status });
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
    setEmployeeFormData({ ...employeeFormData, phone: formatted });
  };

  const handleCompanyPhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, phone: formatted });
  };

  const getRoleText = (role: string | null) => {
    return role || '-';
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
        <div className="flex items-center justify-center h-64 text-red-500">
          데이터를 불러오는데 실패했습니다.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">상장업체 관리</h1>
      </div>

      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="업체번호, 업체명, 사업자등록번호, 대표자, 대표번호 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
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
              상장업체 등록
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '1100px' }}>
            <thead>
              <tr>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ width: 40 }}></th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 80 }}>업체번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 120 }}>업체명</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 130 }}>사업자등록번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 80 }}>대표자</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 130 }}>대표번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 100 }}>등록일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 140 }}>최근로그인</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 60 }}>직원수</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 50 }}>수정</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50" style={{ minWidth: 80 }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {/* 인라인 상장업체 등록 행 */}
              {isAddingCompany && (
                <>
                  <tr>
                    <td className="px-2 py-2 text-center border border-gray-200">-</td>
                    <td className="px-2 py-2 border border-gray-200">
                      <input
                        type="text"
                        value={formData.companyNo}
                        onChange={(e) => setFormData({ ...formData, companyNo: e.target.value })}
                        placeholder="100"
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-200">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="업체명"
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-200">
                      <input
                        type="text"
                        value={formData.businessNo}
                        onChange={(e) => setFormData({ ...formData, businessNo: e.target.value })}
                        placeholder="123-45-67890"
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-200">
                      <input
                        type="text"
                        value={formData.ceo}
                        onChange={(e) => setFormData({ ...formData, ceo: e.target.value })}
                        placeholder="대표자"
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-200">
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handleCompanyPhoneChange(e.target.value)}
                        placeholder="02-0000-0000"
                        maxLength={13}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-200 text-sm text-gray-400 text-center">-</td>
                    <td className="px-2 py-2 border border-gray-200 text-sm text-gray-400 text-center">-</td>
                    <td className="px-2 py-2 border border-gray-200 text-sm text-gray-400 text-center">-</td>
                    <td className="px-2 py-2 border border-gray-200">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={handleAddSave}
                          disabled={!formData.companyNo || !formData.name || !formData.businessNo || !formData.ceo || createCompanyMutation.isPending}
                          className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {createCompanyMutation.isPending ? '...' : '저장'}
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2 border border-gray-200">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={handleAddCancel}
                          className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                        >
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                  {formError && (
                    <tr>
                      <td colSpan={11} className="px-4 py-2 text-sm text-red-500 bg-red-50 border border-gray-200">
                        {formError}
                      </td>
                    </tr>
                  )}
                </>
              )}
              {paginatedCompanies.map((company) => (
                <React.Fragment key={company.id}>
                  {editingCompanyId === company.id ? (
                    <>
                      <tr>
                        <td className="px-2 py-2 text-center border border-gray-200">
                          {expandedCompany === company.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-2 py-2 border border-gray-200">
                          <input
                            type="text"
                            value={formData.companyNo}
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
                            value={formData.businessNo}
                            onChange={(e) => setFormData({ ...formData, businessNo: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-200">
                          <input
                            type="text"
                            value={formData.ceo}
                            onChange={(e) => setFormData({ ...formData, ceo: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-200">
                          <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => handleCompanyPhoneChange(e.target.value)}
                            maxLength={13}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center whitespace-nowrap">{formatDate(company.createdAt)}</td>
                        <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center whitespace-nowrap">{formatDateTime(company.lastLoginAt)}</td>
                        <td className="px-2 py-2 border border-gray-200 text-sm text-gray-900 text-center font-medium whitespace-nowrap">{company.employees.length}명</td>
                        <td className="px-2 py-2 border border-gray-200">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={handleEditSave}
                              disabled={!formData.name || !formData.businessNo || !formData.ceo || updateCompanyMutation.isPending}
                              className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updateCompanyMutation.isPending ? '...' : '저장'}
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2 border border-gray-200">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={handleEditCancel}
                              className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                            >
                              취소
                            </button>
                          </div>
                        </td>
                      </tr>
                      {formError && (
                        <tr>
                          <td colSpan={11} className="px-4 py-2 text-sm text-red-500 bg-red-50 border border-gray-200">
                            {formError}
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(company.id)}
                    >
                      <td className="px-2 py-2 text-center border border-gray-200">
                        {expandedCompany === company.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-2 py-2 border border-gray-200 text-sm font-medium text-gray-900 text-center whitespace-nowrap">{company.companyNo}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm font-medium text-gray-900 text-center whitespace-nowrap">{company.name}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center whitespace-nowrap">{company.businessNo}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-900 text-center whitespace-nowrap">{company.ceo}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center whitespace-nowrap">{company.phone || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center whitespace-nowrap">{formatDate(company.createdAt)}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center whitespace-nowrap">{formatDateTime(company.lastLoginAt)}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-900 text-center font-medium whitespace-nowrap">{company.employees.length}명</td>
                      <td className="px-2 py-2 border border-gray-200">
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={(e) => handleEditOpen(company, e)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" 
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 border border-gray-200">
                        <select
                          value={company.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleCompanyStatusChange(company.id, e.target.value as 'active' | 'inactive')}
                          className="w-full px-3 py-1.5 text-sm border border-gray-100 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                        >
                          <option value="active">활성</option>
                          <option value="inactive">비활성</option>
                        </select>
                      </td>
                    </tr>
                  )}
                  {/* 확장된 직원 테이블 */}
                  {expandedCompany === company.id && (
                    <tr>
                      <td colSpan={11} className="px-2 py-2 border border-gray-200">
                        <div className="ml-8">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">대표/직원 목록</h4>
                            <button
                              onClick={(e) => handleAddEmployeeOpen(company, e)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-white hover:bg-gray-800 transition-colors text-xs font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              직원 추가
                            </button>
                          </div>
                          {(company.employees.length > 0 || addingEmployeeToCompanyId === company.id) ? (
                            <>
                              <table className="w-full bg-white border border-gray-200 table-fixed border-collapse">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[80px] border border-gray-200">구분</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[80px] border border-gray-200">성함</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[130px] border border-gray-200">연락처(ID)</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[90px] border border-gray-200">비밀번호</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[180px] border border-gray-200">주소</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[90px] border border-gray-200">등록일</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[120px] border border-gray-200">최근로그인</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[50px] border border-gray-200">수정</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 w-[70px] border border-gray-200">상태</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* 인라인 직원 추가 행 */}
                                  {addingEmployeeToCompanyId === company.id && (
                                    <>
                                      <tr>
                                        <td className="px-2 py-2 w-[80px] border border-gray-200">
                                          <input
                                            type="text"
                                            value={employeeFormData.role}
                                            onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                                            placeholder="구분"
                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                          />
                                        </td>
                                        <td className="px-2 py-2 w-[80px] border border-gray-200">
                                          <input
                                            type="text"
                                            value={employeeFormData.name}
                                            onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                                            placeholder="성함"
                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                          />
                                        </td>
                                        <td className="px-2 py-2 w-[130px] border border-gray-200">
                                          <input
                                            type="text"
                                            value={employeeFormData.phone}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            placeholder="010-0000-0000"
                                            maxLength={13}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                          />
                                        </td>
                                        <td className="px-2 py-2 w-[90px] border border-gray-200">
                                          <input
                                            type="text"
                                            value={employeeFormData.password}
                                            onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                                            placeholder="비밀번호"
                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                          />
                                        </td>
                                        <td className="px-2 py-2 w-[180px] border border-gray-200">
                                          <input
                                            type="text"
                                            value={employeeFormData.address}
                                            onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                                            placeholder="주소"
                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                          />
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center w-[90px] border border-gray-200">-</td>
                                        <td className="px-2 py-2 text-xs text-gray-400 text-center w-[120px] border border-gray-200">-</td>
                                        <td className="px-2 py-2 w-[50px] border border-gray-200">
                                          <div className="flex items-center justify-center">
                                            <button
                                              onClick={() => handleAddEmployeeSave(company)}
                                              disabled={!employeeFormData.name || !employeeFormData.phone || !employeeFormData.password || createEmployeeMutation.isPending}
                                              className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              {createEmployeeMutation.isPending ? '...' : '저장'}
                                            </button>
                                          </div>
                                        </td>
                                        <td className="px-2 py-2 w-[70px] border border-gray-200">
                                          <div className="flex items-center justify-center">
                                            <button
                                              onClick={handleAddEmployeeCancel}
                                              className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                                            >
                                              취소
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                      {employeeFormError && (
                                        <tr>
                                          <td colSpan={9} className="px-4 py-2 text-xs text-red-500 bg-red-50 border border-gray-200">
                                            {employeeFormError}
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  )}
                                  {company.employees.map((employee) => (
                                    editingEmployeeId === employee.id ? (
                                      <React.Fragment key={employee.id}>
                                        <tr className="bg-gray-50">
                                          <td className="px-2 py-2 w-[80px] border border-gray-200">
                                            <input
                                              type="text"
                                              value={employeeFormData.role}
                                              onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                                              placeholder="구분"
                                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                            />
                                          </td>
                                          <td className="px-2 py-2 w-[80px] border border-gray-200">
                                            <input
                                              type="text"
                                              value={employeeFormData.name}
                                              onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                            />
                                          </td>
                                          <td className="px-2 py-2 w-[130px] border border-gray-200">
                                            <input
                                              type="text"
                                              value={employeeFormData.phone}
                                              onChange={(e) => handlePhoneChange(e.target.value)}
                                              maxLength={13}
                                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                            />
                                          </td>
                                          <td className="px-2 py-2 w-[90px] border border-gray-200">
                                            <input
                                              type="text"
                                              value={employeeFormData.password}
                                              onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                                              placeholder="변경 시 입력"
                                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                            />
                                          </td>
                                          <td className="px-2 py-2 w-[180px] border border-gray-200">
                                            <input
                                              type="text"
                                              value={employeeFormData.address}
                                              onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                            />
                                          </td>
                                          <td className="px-2 py-2 text-xs text-gray-500 text-center w-[90px] border border-gray-200 whitespace-nowrap">{formatDate(employee.createdAt)}</td>
                                          <td className="px-2 py-2 text-xs text-gray-500 text-center w-[120px] border border-gray-200 whitespace-nowrap">{formatDateTime(employee.lastLoginAt)}</td>
                                          <td className="px-2 py-2 w-[50px] border border-gray-200">
                                            <div className="flex items-center justify-center">
                                              <button
                                                onClick={handleEditEmployeeSave}
                                                disabled={updateEmployeeMutation.isPending}
                                                className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
                                              >
                                                {updateEmployeeMutation.isPending ? '...' : '저장'}
                                              </button>
                                            </div>
                                          </td>
                                          <td className="px-2 py-2 w-[70px] border border-gray-200">
                                            <div className="flex items-center justify-center">
                                              <button
                                                onClick={handleEditEmployeeCancel}
                                                className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                                              >
                                                취소
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                        {employeeFormError && (
                                          <tr>
                                            <td colSpan={9} className="px-4 py-2 text-xs text-red-500 bg-red-50 border border-gray-200">
                                              {employeeFormError}
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    ) : (
                                      <tr key={employee.id} className="hover:bg-gray-50">
                                        <td className="px-2 py-2 text-xs text-gray-900 text-center w-[80px] border border-gray-200 whitespace-nowrap">
                                          {getRoleText(employee.role)}
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-900 text-center w-[80px] border border-gray-200 whitespace-nowrap">{employee.name}</td>
                                        <td className="px-2 py-2 text-xs text-gray-600 text-center w-[130px] border border-gray-200 whitespace-nowrap">{employee.phone}</td>
                                        <td className="px-2 py-2 text-xs text-gray-600 text-center w-[90px] border border-gray-200 whitespace-nowrap">****</td>
                                        <td className="px-2 py-2 text-xs text-gray-600 text-center w-[180px] border border-gray-200 whitespace-nowrap">{employee.address || '-'}</td>
                                        <td className="px-2 py-2 text-xs text-gray-500 text-center w-[90px] border border-gray-200 whitespace-nowrap">{formatDate(employee.createdAt)}</td>
                                        <td className="px-2 py-2 text-xs text-gray-500 text-center w-[120px] border border-gray-200 whitespace-nowrap">{formatDateTime(employee.lastLoginAt)}</td>
                                        <td className="px-2 py-2 w-[50px] border border-gray-200">
                                          <div className="flex items-center justify-center">
                                            <button 
                                              onClick={() => handleEditEmployeeOpen(company, employee)}
                                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" 
                                              title="수정"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                        <td className="px-2 py-2 w-[70px] border border-gray-200">
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
                                </tbody>
                              </table>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500 text-center py-4 bg-white border border-gray-200">
                              등록된 직원이 없습니다.
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

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {filteredCompanies.length}개 업체
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
              disabled={currentPage === totalPages || totalPages === 0}
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
