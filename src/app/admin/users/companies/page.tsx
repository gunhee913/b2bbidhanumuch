'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
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
  role: string; // 구분 (자유 입력)
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
      { id: '1-1', role: '대표', name: '김건화', phone: '010-1234-5678', password: '1234', address: '서울시 강남구 테헤란로 123', createdAt: '2024-01-10', lastLogin: '2026-01-19 09:00', status: 'active' },
      { id: '1-2', role: '직원', name: '이직원', phone: '010-2345-6789', password: '1234', address: '서울시 서초구 서초대로 456', createdAt: '2024-03-15', lastLogin: '2026-01-18 17:30', status: 'active' },
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
      { id: '2-1', role: '대표', name: '이대진', phone: '010-3456-7890', password: '1234', address: '경기도 성남시 분당구 정자동 789', createdAt: '2024-01-10', lastLogin: '2026-01-19 08:30', status: 'active' },
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
      { id: '3-1', role: '대표', name: '박안심', phone: '010-4567-8901', password: '1234', address: '충북 음성군 음성읍 중앙로 12', createdAt: '2024-02-15', lastLogin: '2026-01-18 17:00', status: 'active' },
      { id: '3-2', role: '직원', name: '김직원', phone: '010-5678-9012', password: '1234', address: '충북 음성군 음성읍 읍내리 34', createdAt: '2024-05-20', lastLogin: '2026-01-19 08:00', status: 'active' },
      { id: '3-3', role: '직원', name: '최직원', phone: '010-6789-0123', password: '1234', address: '충북 음성군 금왕읍 금왕리 56', createdAt: '2024-06-10', lastLogin: '2026-01-17 16:00', status: 'inactive' },
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
      { id: '4-1', role: '대표', name: '최정직', phone: '010-7890-1234', password: '1234', address: '충북 음성군 대소면 대소리 78', createdAt: '2024-03-20', lastLogin: '2026-01-19 10:30', status: 'active' },
    ]
  },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const itemsPerPage = 10;

  // 상장업체 상태
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // 직원 상태
  const [addingEmployeeToCompanyId, setAddingEmployeeToCompanyId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
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

  // 수정 인라인 열기
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
    setEditingCompanyId(company.id);
  };

  // 수정 취소
  const handleEditCancel = () => {
    setEditingCompanyId(null);
    setSelectedCompany(null);
    setFormData({ companyNo: '', name: '', businessNo: '', ceo: '', phone: '', status: 'active' });
  };

  // 수정 저장
  const handleEditSave = () => {
    if (!editingCompanyId) return;
    setCompanies(companies.map(c => 
      c.id === editingCompanyId 
        ? { ...c, ...formData }
        : c
    ));
    setEditingCompanyId(null);
    setSelectedCompany(null);
    setFormData({ companyNo: '', name: '', businessNo: '', ceo: '', phone: '', status: 'active' });
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

  // 등록 인라인 열기
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
    setIsAddingCompany(true);
  };

  // 등록 취소
  const handleAddCancel = () => {
    setIsAddingCompany(false);
    setFormData({ companyNo: '', name: '', businessNo: '', ceo: '', phone: '', status: 'active' });
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
    setIsAddingCompany(false);
    setFormData({ companyNo: '', name: '', businessNo: '', ceo: '', phone: '', status: 'active' });
  };

  // 직원 추가 인라인 열기
  const handleAddEmployeeOpen = (company: Company, e: React.MouseEvent) => {
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
  };

  // 직원 추가 취소
  const handleAddEmployeeCancel = () => {
    setAddingEmployeeToCompanyId(null);
    setSelectedCompany(null);
    setEmployeeFormData({ role: '', name: '', phone: '', password: '', address: '', status: 'active' });
  };

  // 직원 추가 저장
  const handleAddEmployeeSave = (company: Company) => {
    const today = new Date().toISOString().split('T')[0];
    const newEmployee: Employee = {
      id: `${company.id}-${company.employees.length + 1}`,
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
      c.id === company.id 
        ? { ...c, employees: [...c.employees, newEmployee] }
        : c
    ));
    setAddingEmployeeToCompanyId(null);
    setSelectedCompany(null);
    setEmployeeFormData({ role: '', name: '', phone: '', password: '', address: '', status: 'active' });
  };

  // 직원 수정 인라인 열기
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
    setEditingEmployeeId(employee.id);
  };

  // 직원 수정 취소
  const handleEditEmployeeCancel = () => {
    setEditingEmployeeId(null);
    setSelectedCompany(null);
    setSelectedEmployee(null);
    setEmployeeFormData({ role: '', name: '', phone: '', password: '', address: '', status: 'active' });
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
    setEditingEmployeeId(null);
    setSelectedCompany(null);
    setSelectedEmployee(null);
    setEmployeeFormData({ role: '', name: '', phone: '', password: '', address: '', status: 'active' });
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

  const getRoleText = (role: string) => {
    return role || '-';
  };

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
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 w-8"></th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">업체번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">업체명</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">사업자등록번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">대표자</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">대표번호</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">등록일</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">최근로그인</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">직원수</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">수정</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">상태</th>
              </tr>
            </thead>
            <tbody>
              {/* 인라인 상장업체 등록 행 */}
              {isAddingCompany && (
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
                  <td className="px-2 py-2 border border-gray-200" colSpan={2}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleAddSave}
                        disabled={!formData.companyNo || !formData.name || !formData.businessNo || !formData.ceo || !formData.phone}
                        className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {paginatedCompanies.map((company) => (
                <React.Fragment key={company.id}>
                  {editingCompanyId === company.id ? (
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
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center">{company.createdAt}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center">{company.lastLogin}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-900 text-center font-medium">{company.employees.length}명</td>
                      <td className="px-2 py-2 border border-gray-200" colSpan={2}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={handleEditSave}
                            disabled={!formData.name || !formData.businessNo || !formData.ceo || !formData.phone}
                            className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <td className="px-2 py-2 border border-gray-200 text-sm font-medium text-gray-900 text-center">{company.companyNo}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm font-medium text-gray-900 text-center">{company.name}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center">{company.businessNo}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-900 text-center">{company.ceo}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-600 text-center">{company.phone}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center">{company.createdAt}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-500 text-center">{company.lastLogin}</td>
                      <td className="px-2 py-2 border border-gray-200 text-sm text-gray-900 text-center font-medium">{company.employees.length}명</td>
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
                          onChange={(e) => {
                            setCompanies(companies.map(c => 
                              c.id === company.id 
                                ? { ...c, status: e.target.value as 'active' | 'inactive' }
                                : c
                            ));
                          }}
                          className="w-full px-3 py-1.5 text-sm border border-gray-100  focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-white  hover:bg-gray-800 transition-colors text-xs font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              직원 추가
                            </button>
                          </div>
                          {(company.employees.length > 0 || addingEmployeeToCompanyId === company.id) ? (
                            <table className="w-full bg-white border border-gray-200 table-fixed border-collapse">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[80px] border border-gray-200">구분</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[80px] border border-gray-200">성함</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[130px] border border-gray-200">연락처(ID)</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[90px] border border-gray-200">비밀번호</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[180px] border border-gray-200">주소</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[90px] border border-gray-200">등록일</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[120px] border border-gray-200">최근로그인</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[50px] border border-gray-200">수정</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-[70px] border border-gray-200">상태</th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* 인라인 직원 추가 행 */}
                                {addingEmployeeToCompanyId === company.id && (
                                  <tr>
                                    <td className="px-3 py-2 w-[80px] border border-gray-200">
                                      <input
                                        type="text"
                                        value={employeeFormData.role}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                                        placeholder="구분"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-3 py-2 w-[80px] border border-gray-200">
                                      <input
                                        type="text"
                                        value={employeeFormData.name}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                                        placeholder="성함"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-3 py-2 w-[130px] border border-gray-200">
                                      <input
                                        type="text"
                                        value={employeeFormData.phone}
                                        onChange={(e) => handlePhoneChange(e.target.value)}
                                        placeholder="010-0000-0000"
                                        maxLength={13}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-3 py-2 w-[90px] border border-gray-200">
                                      <input
                                        type="text"
                                        value={employeeFormData.password}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                                        placeholder="비밀번호"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-3 py-2 w-[180px] border border-gray-200">
                                      <input
                                        type="text"
                                        value={employeeFormData.address}
                                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                                        placeholder="주소"
                                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-400 text-center w-[90px] border border-gray-200">-</td>
                                    <td className="px-3 py-2 text-xs text-gray-400 text-center w-[120px] border border-gray-200">-</td>
                                    <td className="px-3 py-2 w-[50px] border border-gray-200" colSpan={2}>
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => handleAddEmployeeSave(company)}
                                          disabled={!employeeFormData.role || !employeeFormData.name || !employeeFormData.phone || !employeeFormData.password}
                                          className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          저장
                                        </button>
                                        <button
                                          onClick={handleAddEmployeeCancel}
                                          className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-100"
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                {company.employees.map((employee) => (
                                  editingEmployeeId === employee.id ? (
                                    <tr key={employee.id} className="bg-gray-50">
                                      <td className="px-3 py-2 w-[80px] border border-gray-200">
                                        <input
                                          type="text"
                                          value={employeeFormData.role}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                                          placeholder="구분"
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-3 py-2 w-[80px] border border-gray-200">
                                        <input
                                          type="text"
                                          value={employeeFormData.name}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-3 py-2 w-[130px] border border-gray-200">
                                        <input
                                          type="text"
                                          value={employeeFormData.phone}
                                          onChange={(e) => handlePhoneChange(e.target.value)}
                                          maxLength={13}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-3 py-2 w-[90px] border border-gray-200">
                                        <input
                                          type="text"
                                          value={employeeFormData.password}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-3 py-2 w-[180px] border border-gray-200">
                                        <input
                                          type="text"
                                          value={employeeFormData.address}
                                          onChange={(e) => setEmployeeFormData({ ...employeeFormData, address: e.target.value })}
                                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-500 text-center w-[90px] border border-gray-200">{employee.createdAt}</td>
                                      <td className="px-3 py-2 text-xs text-gray-500 text-center w-[120px] border border-gray-200">{employee.lastLogin}</td>
                                      <td className="px-3 py-2 w-[50px] border border-gray-200">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            onClick={handleEditEmployeeSave}
                                            className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800"
                                          >
                                            저장
                                          </button>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 w-[70px] border border-gray-200">
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
                                  ) : (
                                    <tr key={employee.id} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 text-xs text-gray-900 text-center w-[80px] border border-gray-200">
                                        {getRoleText(employee.role)}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-900 text-center w-[80px] border border-gray-200">{employee.name}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 text-center w-[130px] border border-gray-200">{employee.phone}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 text-center w-[90px] border border-gray-200">{employee.password}</td>
                                      <td className="px-3 py-2 text-xs text-gray-600 text-center w-[180px] border border-gray-200">{employee.address}</td>
                                      <td className="px-3 py-2 text-xs text-gray-500 text-center w-[90px] border border-gray-200">{employee.createdAt}</td>
                                      <td className="px-3 py-2 text-xs text-gray-500 text-center w-[120px] border border-gray-200">{employee.lastLogin}</td>
                                      <td className="px-3 py-2 w-[50px] border border-gray-200">
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
                                      <td className="px-3 py-2 w-[70px] border border-gray-200">
                                        <select
                                          value={employee.status}
                                          onChange={(e) => handleEmployeeStatusChange(company.id, employee.id, e.target.value as 'active' | 'inactive')}
                                          className="w-full px-2 py-1 text-xs border border-gray-100  focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white text-center"
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
                          ) : (
                            <div className="text-sm text-gray-500 text-center py-4 bg-white  border border-gray-200">
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
              className="p-2 border border-gray-100  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5  text-sm font-medium transition-colors ${
                  currentPage === page ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-100  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 업체 삭제 확인 모달 */}
      {showDeleteModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-none shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">상장업체 삭제</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-900">{selectedCompany.name}</span> ({selectedCompany.companyNo})을(를) 삭제하시겠습니까?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700  hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-white  hover:bg-gray-800 font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직원 삭제 확인 모달 */}
      {showDeleteEmployeeModal && selectedCompany && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteEmployeeModal(false)} />
          <div className="relative bg-white rounded-none shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">직원 삭제</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-900">{selectedEmployee.name}</span>을(를) 삭제하시겠습니까?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteEmployeeModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700  hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleDeleteEmployeeConfirm}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-white  hover:bg-gray-800 font-medium"
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
