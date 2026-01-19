'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  X,
} from 'lucide-react';

interface Employee {
  id: string;
  role: 'ceo' | 'staff';
  name: string;
  phone: string;
  password: string;
  address: string;
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'inactive';
}

interface Company {
  id: string;
  companyNo: string;
  name: string;
  businessNo: string;
  ceo: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
  employees: Employee[];
}

const initialCompanies: Company[] = [
  { 
    id: '1', 
    companyNo: '100', 
    name: '건화', 
    businessNo: '123-45-67890', 
    ceo: '김건화', 
    phone: '02-1234-5678', 
    status: 'active', 
    createdAt: '2024-01-10', 
    lastLogin: '2026-01-19 09:00',
    employees: [
      { id: '1-1', role: 'ceo', name: '김건화', phone: '010-1234-5678', password: '1234', address: '서울시 강남구 테헤란로 123', createdAt: '2024-01-10', lastLogin: '2026-01-19 09:00', status: 'active' },
      { id: '1-2', role: 'staff', name: '이직원', phone: '010-2345-6789', password: '1234', address: '서울시 서초구 서초대로 456', createdAt: '2024-03-15', lastLogin: '2026-01-18 17:30', status: 'active' },
    ]
  },
  { 
    id: '2', 
    companyNo: '200', 
    name: '대진엠에스', 
    businessNo: '234-56-78901', 
    ceo: '이대진', 
    phone: '02-2345-6789', 
    status: 'active', 
    createdAt: '2024-01-10', 
    lastLogin: '2026-01-19 08:30',
    employees: [
      { id: '2-1', role: 'ceo', name: '이대진', phone: '010-3456-7890', password: '1234', address: '경기도 성남시 분당구 정자동 789', createdAt: '2024-01-10', lastLogin: '2026-01-19 08:30', status: 'active' },
    ]
  },
  { 
    id: '3', 
    companyNo: '300', 
    name: '안심엘피씨', 
    businessNo: '345-67-89012', 
    ceo: '박안심', 
    phone: '02-3456-7890', 
    status: 'active', 
    createdAt: '2024-02-15', 
    lastLogin: '2026-01-18 17:00',
    employees: [
      { id: '3-1', role: 'ceo', name: '박안심', phone: '010-4567-8901', password: '1234', address: '충북 음성군 음성읍 중앙로 12', createdAt: '2024-02-15', lastLogin: '2026-01-18 17:00', status: 'active' },
      { id: '3-2', role: 'staff', name: '김직원', phone: '010-5678-9012', password: '1234', address: '충북 음성군 음성읍 읍내리 34', createdAt: '2024-05-20', lastLogin: '2026-01-19 08:00', status: 'active' },
      { id: '3-3', role: 'staff', name: '최직원', phone: '010-6789-0123', password: '1234', address: '충북 음성군 금왕읍 금왕리 56', createdAt: '2024-06-10', lastLogin: '2026-01-17 16:00', status: 'inactive' },
    ]
  },
  { 
    id: '4', 
    companyNo: '400', 
    name: '정직한고기', 
    businessNo: '456-78-90123', 
    ceo: '최정직', 
    phone: '02-4567-8901', 
    status: 'inactive', 
    createdAt: '2024-03-20', 
    lastLogin: '2026-01-19 10:30',
    employees: [
      { id: '4-1', role: 'ceo', name: '최정직', phone: '010-7890-1234', password: '1234', address: '충북 음성군 대소면 대소리 78', createdAt: '2024-03-20', lastLogin: '2026-01-19 10:30', status: 'active' },
    ]
  },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const itemsPerPage = 10;

  // 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // 직원 모달 상태
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [showDeleteEmployeeModal, setShowDeleteEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

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
    role: 'staff' as 'ceo' | 'staff',
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
      company.phone.includes(searchQuery) ||
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

  // 수정 모달 열기
  const handleEditOpen = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCompany(company);
    setFormData({
      companyNo: company.companyNo,
      name: company.name,
      businessNo: company.businessNo,
      ceo: company.ceo,
      phone: company.phone,
      status: company.status,
    });
    setShowEditModal(true);
  };

  // 수정 저장
  const handleEditSave = () => {
    if (!selectedCompany) return;
    setCompanies(companies.map(c => 
      c.id === selectedCompany.id 
        ? { ...c, ...formData }
        : c
    ));
    setShowEditModal(false);
    setSelectedCompany(null);
  };

  // 삭제 모달 열기
  const handleDeleteOpen = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };

  // 삭제 확인
  const handleDeleteConfirm = () => {
    if (!selectedCompany) return;
    setCompanies(companies.filter(c => c.id !== selectedCompany.id));
    setShowDeleteModal(false);
    setSelectedCompany(null);
  };

  // 등록 모달 열기
  const handleAddOpen = () => {
    const nextNo = String((companies.length + 1) * 100);
    setFormData({
      companyNo: nextNo,
      name: '',
      businessNo: '',
      ceo: '',
      phone: '',
      status: 'active',
    });
    setShowAddModal(true);
  };

  // 등록 저장
  const handleAddSave = () => {
    const today = new Date().toISOString().split('T')[0];
    const newCompany: Company = {
      id: (companies.length + 1).toString(),
      companyNo: formData.companyNo,
      name: formData.name,
      businessNo: formData.businessNo,
      ceo: formData.ceo,
      phone: formData.phone,
      status: formData.status,
      createdAt: today,
      lastLogin: '-',
      employees: [],
    };
    setCompanies([...companies, newCompany]);
    setShowAddModal(false);
  };

  // 직원 추가 모달 열기
  const handleAddEmployeeOpen = (company: Company) => {
    setSelectedCompany(company);
    setEmployeeFormData({
      role: 'staff',
      name: '',
      phone: '',
      password: '',
      address: '',
      status: 'active',
    });
    setShowAddEmployeeModal(true);
  };

  // 직원 추가 저장
  const handleAddEmployeeSave = () => {
    if (!selectedCompany) return;
    const today = new Date().toISOString().split('T')[0];
    const newEmployee: Employee = {
      id: `${selectedCompany.id}-${selectedCompany.employees.length + 1}`,
      role: employeeFormData.role,
      name: employeeFormData.name,
      phone: employeeFormData.phone,
      password: employeeFormData.password,
      address: employeeFormData.address,
      createdAt: today,
      lastLogin: '-',
      status: employeeFormData.status,
    };
    setCompanies(companies.map(c => 
      c.id === selectedCompany.id 
        ? { ...c, employees: [...c.employees, newEmployee] }
        : c
    ));
    setShowAddEmployeeModal(false);
    setSelectedCompany(null);
  };

  // 직원 수정 모달 열기
  const handleEditEmployeeOpen = (company: Company, employee: Employee) => {
    setSelectedCompany(company);
    setSelectedEmployee(employee);
    setEmployeeFormData({
      role: employee.role,
      name: employee.name,
      phone: employee.phone,
      password: employee.password,
      address: employee.address,
      status: employee.status,
    });
    setShowEditEmployeeModal(true);
  };

  // 직원 수정 저장
  const handleEditEmployeeSave = () => {
    if (!selectedCompany || !selectedEmployee) return;
    setCompanies(companies.map(c => 
      c.id === selectedCompany.id 
        ? { 
            ...c, 
            employees: c.employees.map(emp => 
              emp.id === selectedEmployee.id 
                ? { ...emp, ...employeeFormData }
                : emp
            )
          }
        : c
    ));
    setShowEditEmployeeModal(false);
    setSelectedCompany(null);
    setSelectedEmployee(null);
  };

  // 직원 삭제 모달 열기
  const handleDeleteEmployeeOpen = (company: Company, employee: Employee) => {
    setSelectedCompany(company);
    setSelectedEmployee(employee);
    setShowDeleteEmployeeModal(true);
  };

  // 직원 삭제 확인
  const handleDeleteEmployeeConfirm = () => {
    if (!selectedCompany || !selectedEmployee) return;
    setCompanies(companies.map(c => 
      c.id === selectedCompany.id 
        ? { ...c, employees: c.employees.filter(emp => emp.id !== selectedEmployee.id) }
        : c
    ));
    setShowDeleteEmployeeModal(false);
    setSelectedCompany(null);
    setSelectedEmployee(null);
  };

  // 직원 상태 변경
  const handleEmployeeStatusChange = (companyId: string, employeeId: string, status: 'active' | 'inactive') => {
    setCompanies(companies.map(c => 
      c.id === companyId 
        ? { 
            ...c, 
            employees: c.employees.map(emp => 
              emp.id === employeeId 
                ? { ...emp, status }
                : emp
            )
          }
        : c
    ));
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">상장업체 관리</h1>
        <button 
          onClick={handleAddOpen}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          상장업체 등록
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="업체번호, 업체명, 사업자등록번호, 대표자, 대표번호, 직원명, 직원연락처로 검색..."
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
                <th className="w-10 px-2 py-3"></th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">업체번호</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">업체명</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">사업자등록번호</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">대표자</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">대표번호</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">최근로그인</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">직원수</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">수정</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCompanies.map((company) => (
                <React.Fragment key={company.id}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(company.id)}
                  >
                    <td className="px-2 py-4 text-center">
                      {expandedCompany === company.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 text-center">{company.companyNo}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 text-center">{company.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">{company.businessNo}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-center">{company.ceo}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">{company.phone}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{company.createdAt}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{company.lastLogin}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 text-center font-medium">{company.employees.length}명</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={(e) => handleEditOpen(company, e)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" 
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={company.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          setCompanies(companies.map(c => 
                            c.id === company.id 
                              ? { ...c, status: e.target.value as 'active' | 'inactive' }
                              : c
                          ));
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                      >
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                      </select>
                    </td>
                  </tr>
                  {/* 확장된 직원 테이블 */}
                  {expandedCompany === company.id && (
                    <tr>
                      <td colSpan={11} className="px-4 py-4 bg-gray-50">
                        <div className="ml-8">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">대표/직원 목록</h4>
                            <button
                              onClick={() => handleAddEmployeeOpen(company)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              직원 추가
                            </button>
                          </div>
                          {company.employees.length > 0 ? (
                            <table className="w-full bg-white rounded-lg border border-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">구분</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">성함</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">연락처(ID)</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">비밀번호</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 min-w-[180px]">주소</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">등록일</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">최근로그인</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">수정</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">상태</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {company.employees.map((employee) => (
                                  <tr key={employee.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-xs text-gray-900 text-center">
                                      {employee.role === 'ceo' ? '대표' : '직원'}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-900 text-center">{employee.name}</td>
                                    <td className="px-3 py-2 text-xs text-gray-600 text-center">{employee.phone}</td>
                                    <td className="px-3 py-2 text-xs text-gray-600 text-center">{employee.password}</td>
                                    <td className="px-3 py-2 text-xs text-gray-600 text-center">{employee.address}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500 text-center">{employee.createdAt}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500 text-center">{employee.lastLogin}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center justify-center">
                                        <button 
                                          onClick={() => handleEditEmployeeOpen(company, employee)}
                                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" 
                                          title="수정"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <select
                                        value={employee.status}
                                        onChange={(e) => handleEmployeeStatusChange(company.id, employee.id, e.target.value as 'active' | 'inactive')}
                                        className="w-full px-2 py-1 text-xs border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                                      >
                                        <option value="active">활성</option>
                                        <option value="inactive">비활성</option>
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-sm text-gray-500 text-center py-4 bg-white rounded-lg border border-gray-200">
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

      {/* 업체 수정 모달 */}
      {showEditModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">상장업체 수정</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">업체번호</label>
                <input
                  type="text"
                  value={formData.companyNo}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">업체명</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
                <input
                  type="text"
                  value={formData.businessNo}
                  onChange={(e) => setFormData({ ...formData, businessNo: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대표자</label>
                <input
                  type="text"
                  value={formData.ceo}
                  onChange={(e) => setFormData({ ...formData, ceo: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대표번호</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleEditSave}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 업체 삭제 확인 모달 */}
      {showDeleteModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">상장업체 삭제</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-900">{selectedCompany.name}</span> ({selectedCompany.companyNo})을(를) 삭제하시겠습니까?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 업체 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">상장업체 등록</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">업체번호 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.companyNo}
                  onChange={(e) => setFormData({ ...formData, companyNo: e.target.value })}
                  placeholder="100"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">업체명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="업체명을 입력하세요"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.businessNo}
                  onChange={(e) => setFormData({ ...formData, businessNo: e.target.value })}
                  placeholder="000-00-00000"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대표자 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.ceo}
                  onChange={(e) => setFormData({ ...formData, ceo: e.target.value })}
                  placeholder="대표자명을 입력하세요"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대표번호 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="02-0000-0000"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태 <span className="text-red-500">*</span></label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleAddSave}
                disabled={!formData.companyNo || !formData.name || !formData.businessNo || !formData.ceo || !formData.phone}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직원 추가 모달 */}
      {showAddEmployeeModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddEmployeeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">직원 추가 - {selectedCompany.name}</h3>
              <button onClick={() => setShowAddEmployeeModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">구분 <span className="text-red-500">*</span></label>
                <select
                  value={employeeFormData.role}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as 'ceo' | 'staff' })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                >
                  <option value="ceo">대표</option>
                  <option value="staff">직원</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성함 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={employeeFormData.name}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                  placeholder="성함을 입력하세요"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처(ID) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={employeeFormData.phone}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={employeeFormData.password}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <input
                  type="text"
                  value={employeeFormData.address}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                  placeholder="주소를 입력하세요"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태 <span className="text-red-500">*</span></label>
                <select
                  value={employeeFormData.status}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleAddEmployeeSave}
                disabled={!employeeFormData.name || !employeeFormData.phone || !employeeFormData.password}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직원 수정 모달 */}
      {showEditEmployeeModal && selectedCompany && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditEmployeeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">직원 수정 - {selectedCompany.name}</h3>
              <button onClick={() => setShowEditEmployeeModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">구분</label>
                <select
                  value={employeeFormData.role}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as 'ceo' | 'staff' })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                >
                  <option value="ceo">대표</option>
                  <option value="staff">직원</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성함</label>
                <input
                  type="text"
                  value={employeeFormData.name}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처(ID)</label>
                <input
                  type="text"
                  value={employeeFormData.phone}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                <input
                  type="text"
                  value={employeeFormData.password}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <input
                  type="text"
                  value={employeeFormData.address}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select
                  value={employeeFormData.status}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditEmployeeModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleEditEmployeeSave}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직원 삭제 확인 모달 */}
      {showDeleteEmployeeModal && selectedCompany && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteEmployeeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">직원 삭제</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-900">{selectedEmployee.name}</span>을(를) 삭제하시겠습니까?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteEmployeeModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleDeleteEmployeeConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
