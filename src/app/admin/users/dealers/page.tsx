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
  Download,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  phone: string;
  password: string;
  address: string;
  role: 'agent' | 'staff'; // 경매대리인 | 직원
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
}

interface Dealer {
  id: string;
  dealerNo: string;
  name: string;
  phone: string;
  password: string;
  auctionPassword: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
  employees: Employee[];
}

const initialDealers: Dealer[] = [
  { 
    id: '1', 
    dealerNo: '7000001', 
    name: '김철수', 
    phone: '010-1234-5678', 
    password: '1234',
    auctionPassword: '0000',
    address: '서울시 강남구 역삼동',
    status: 'active',
    createdAt: '2024-03-15', 
    lastLogin: '2026-01-19 11:30',
    employees: [
      { id: '1-1', name: '김대리', phone: '010-1111-1111', password: '1234', address: '서울시 강남구', role: 'agent', status: 'active', createdAt: '2024-05-01', lastLogin: '2026-01-19 10:30' },
      { id: '1-2', name: '이직원', phone: '010-2222-2222', password: '1234', address: '서울시 서초구', role: 'staff', status: 'active', createdAt: '2024-06-15', lastLogin: '2026-01-18 15:20' },
    ]
  },
  { 
    id: '2', 
    dealerNo: '7000002', 
    name: '이영희', 
    phone: '010-2345-6789', 
    password: '1234',
    auctionPassword: '1111',
    address: '경기도 성남시 분당구',
    status: 'active',
    createdAt: '2024-05-20', 
    lastLogin: '2026-01-19 10:15',
    employees: [
      { id: '2-1', name: '박대리', phone: '010-3333-3333', password: '1234', address: '경기도 성남시', role: 'agent', status: 'active', createdAt: '2024-07-01', lastLogin: '2026-01-19 09:15' },
    ]
  },
  { 
    id: '3', 
    dealerNo: '7000003', 
    name: '박민수', 
    phone: '010-3456-7890', 
    password: '1234',
    auctionPassword: '2222',
    address: '충북 음성군 음성읍',
    status: 'inactive',
    createdAt: '2026-01-18', 
    lastLogin: '-',
    employees: []
  },
  { 
    id: '4', 
    dealerNo: '7000004', 
    name: '최지현', 
    phone: '010-4567-8901', 
    password: '1234',
    auctionPassword: '3333',
    address: '서울시 서초구 반포동',
    status: 'active',
    createdAt: '2024-08-10', 
    lastLogin: '2026-01-18 16:45',
    employees: [
      { id: '4-1', name: '정직원', phone: '010-4444-4444', password: '1234', address: '서울시 서초구', role: 'staff', status: 'inactive', createdAt: '2024-09-01', lastLogin: '2026-01-17 14:00' },
    ]
  },
  { 
    id: '5', 
    dealerNo: '7000005', 
    name: '정대호', 
    phone: '010-5678-9012', 
    password: '1234',
    auctionPassword: '4444',
    address: '경기도 용인시 수지구',
    status: 'active',
    createdAt: '2024-06-25', 
    lastLogin: '2025-12-20 09:00',
    employees: []
  },
];

export default function DealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>(initialDealers);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDealer, setExpandedDealer] = useState<string | null>(null);
  const itemsPerPage = 10;

  // 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);

  // 직원 모달 상태
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [showDeleteEmployeeModal, setShowDeleteEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState({
    dealerNo: '',
    name: '',
    phone: '',
    password: '',
    auctionPassword: '',
    address: '',
    status: 'active' as 'active' | 'inactive',
  });

  // 직원 폼 데이터
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    phone: '',
    password: '',
    address: '',
    role: 'agent' as 'agent' | 'staff',
    status: 'active' as 'active' | 'inactive',
  });

  const filteredDealers = dealers.filter(dealer => {
    // 중도매인 정보 검색
    const matchesDealerSearch = 
      dealer.name.includes(searchQuery) ||
      dealer.dealerNo.includes(searchQuery) ||
      dealer.phone.includes(searchQuery);
    
    // 경매대리인/직원 정보 검색
    const matchesEmployeeSearch = dealer.employees.some(emp => 
      emp.name.includes(searchQuery) ||
      emp.phone.includes(searchQuery)
    );
    
    return matchesDealerSearch || matchesEmployeeSearch;
  });

  const totalPages = Math.ceil(filteredDealers.length / itemsPerPage);
  const paginatedDealers = filteredDealers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 행 확장/축소
  const toggleExpand = (dealerId: string) => {
    setExpandedDealer(expandedDealer === dealerId ? null : dealerId);
  };

  // 수정 모달 열기
  const handleEditOpen = (dealer: Dealer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDealer(dealer);
    setFormData({
      dealerNo: dealer.dealerNo,
      name: dealer.name,
      phone: dealer.phone,
      password: dealer.password,
      auctionPassword: dealer.auctionPassword,
      address: dealer.address,
      status: dealer.status,
    });
    setShowEditModal(true);
  };

  // 수정 저장
  const handleEditSave = () => {
    if (!selectedDealer) return;
    setDealers(dealers.map(d => 
      d.id === selectedDealer.id 
        ? { ...d, ...formData }
        : d
    ));
    setShowEditModal(false);
    setSelectedDealer(null);
  };

  // 삭제 모달 열기
  const handleDeleteOpen = (dealer: Dealer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDealer(dealer);
    setShowDeleteModal(true);
  };

  // 삭제 확인
  const handleDeleteConfirm = () => {
    if (!selectedDealer) return;
    setDealers(dealers.filter(d => d.id !== selectedDealer.id));
    setShowDeleteModal(false);
    setSelectedDealer(null);
  };

  // 등록 모달 열기
  const handleAddOpen = () => {
    const nextNo = 7000000 + dealers.length + 1;
    setFormData({
      dealerNo: nextNo.toString(),
      name: '',
      phone: '',
      password: '',
      auctionPassword: '',
      address: '',
      status: 'active',
    });
    setShowAddModal(true);
  };

  // 등록 저장
  const handleAddSave = () => {
    const today = new Date().toISOString().split('T')[0];
    const newDealer: Dealer = {
      id: (dealers.length + 1).toString(),
      dealerNo: formData.dealerNo,
      name: formData.name,
      phone: formData.phone,
      password: formData.password,
      auctionPassword: formData.auctionPassword,
      address: formData.address,
      status: formData.status,
      createdAt: today,
      lastLogin: '-',
      employees: [],
    };
    setDealers([...dealers, newDealer]);
    setShowAddModal(false);
  };

  // 직원 추가 모달 열기
  const handleAddEmployeeOpen = (dealer: Dealer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDealer(dealer);
    setEmployeeFormData({ name: '', phone: '', password: '', address: '', role: 'agent', status: 'active' });
    setShowAddEmployeeModal(true);
  };

  // 직원 추가 저장
  const handleAddEmployeeSave = () => {
    if (!selectedDealer) return;
    const today = new Date().toISOString().split('T')[0];
    const newEmployee: Employee = {
      id: `${selectedDealer.id}-${selectedDealer.employees.length + 1}`,
      name: employeeFormData.name,
      phone: employeeFormData.phone,
      password: employeeFormData.password,
      address: employeeFormData.address,
      role: employeeFormData.role,
      status: employeeFormData.status,
      createdAt: today,
      lastLogin: '-',
    };
    setDealers(dealers.map(d => 
      d.id === selectedDealer.id 
        ? { ...d, employees: [...d.employees, newEmployee] }
        : d
    ));
    setShowAddEmployeeModal(false);
    setSelectedDealer(null);
  };

  // 직원 수정 모달 열기
  const handleEditEmployeeOpen = (dealer: Dealer, employee: Employee) => {
    setSelectedDealer(dealer);
    setSelectedEmployee(employee);
    setEmployeeFormData({
      name: employee.name,
      phone: employee.phone,
      password: employee.password,
      address: employee.address,
      role: employee.role,
      status: employee.status,
    });
    setShowEditEmployeeModal(true);
  };

  // 직원 수정 저장
  const handleEditEmployeeSave = () => {
    if (!selectedDealer || !selectedEmployee) return;
    setDealers(dealers.map(d => 
      d.id === selectedDealer.id 
        ? { 
            ...d, 
            employees: d.employees.map(emp => 
              emp.id === selectedEmployee.id 
                ? { ...emp, ...employeeFormData }
                : emp
            )
          }
        : d
    ));
    setShowEditEmployeeModal(false);
    setSelectedDealer(null);
    setSelectedEmployee(null);
  };

  // 직원 삭제 모달 열기
  const handleDeleteEmployeeOpen = (dealer: Dealer, employee: Employee) => {
    setSelectedDealer(dealer);
    setSelectedEmployee(employee);
    setShowDeleteEmployeeModal(true);
  };

  // 직원 삭제 확인
  const handleDeleteEmployeeConfirm = () => {
    if (!selectedDealer || !selectedEmployee) return;
    setDealers(dealers.map(d => 
      d.id === selectedDealer.id 
        ? { ...d, employees: d.employees.filter(emp => emp.id !== selectedEmployee.id) }
        : d
    ));
    setShowDeleteEmployeeModal(false);
    setSelectedDealer(null);
    setSelectedEmployee(null);
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'agent':
        return '경매대리인';
      case 'staff':
        return '직원';
      default:
        return '-';
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">중도매인 관리</h1>
        <button 
          onClick={handleAddOpen}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          중도매인 등록
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 중매인번호, 전화번호, 경매대리인/직원 검색..."
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
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">중도매인번호</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">중도매인명</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">연락처(ID)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">비밀번호</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">경매 비밀번호</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">주소</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">최근로그인</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">직원수</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">수정</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedDealers.map((dealer) => (
                <React.Fragment key={dealer.id}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(dealer.id)}
                  >
                    <td className="px-4 py-4 text-center">
                      {expandedDealer === dealer.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-500 mx-auto" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 text-center">{dealer.dealerNo}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 text-center">{dealer.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">{dealer.phone}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">{dealer.password}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">{dealer.auctionPassword}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">{dealer.address}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{dealer.createdAt}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{dealer.lastLogin}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center">{dealer.employees.length}명</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={(e) => handleEditOpen(dealer, e)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" 
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={dealer.status}
                        onChange={(e) => {
                          setDealers(dealers.map(d => 
                            d.id === dealer.id 
                              ? { ...d, status: e.target.value as 'active' | 'inactive' }
                              : d
                          ));
                        }}
                        className="w-full px-3 py-1.5 text-sm border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-center"
                      >
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                      </select>
                    </td>
                  </tr>
                  {/* 직원 목록 (펼침) */}
                  {expandedDealer === dealer.id && (
                    <tr>
                      <td colSpan={12} className="p-0">
                        <div className="bg-gray-50 p-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">경매대리인 / 직원 목록</h4>
                            <button
                              onClick={(e) => handleAddEmployeeOpen(dealer, e)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              직원 추가
                            </button>
                          </div>
                          {dealer.employees.length > 0 ? (
                            <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">구분</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">성함</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">연락처(ID)</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">비밀번호</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 min-w-[180px]">주소</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">등록일</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">최근로그인</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">수정</th>
                                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">상태</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {dealer.employees.map((employee) => (
                                  <tr key={employee.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm text-gray-600 text-center">{getRoleText(employee.role)}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900 text-center">{employee.name}</td>
                                    <td className="px-4 py-2 text-sm text-gray-600 text-center">{employee.phone}</td>
                                    <td className="px-4 py-2 text-sm text-gray-600 text-center">{employee.password}</td>
                                    <td className="px-4 py-2 text-sm text-gray-600 text-center">{employee.address || '-'}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500 text-center">{employee.createdAt}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500 text-center">{employee.lastLogin}</td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center justify-center">
                                        <button 
                                          onClick={() => handleEditEmployeeOpen(dealer, employee)}
                                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" 
                                          title="수정"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <select
                                        value={employee.status}
                                        onChange={(e) => {
                                          setDealers(dealers.map(d => 
                                            d.id === dealer.id 
                                              ? { 
                                                  ...d, 
                                                  employees: d.employees.map(emp => 
                                                    emp.id === employee.id 
                                                      ? { ...emp, status: e.target.value as 'active' | 'inactive' }
                                                      : emp
                                                  )
                                                }
                                              : d
                                          ));
                                        }}
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
                            <div className="text-center py-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">
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

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {filteredDealers.length}명
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

      {/* 중도매인 수정 모달 */}
      {showEditModal && selectedDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">중도매인 수정</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">중도매인번호</label>
                <input
                  type="text"
                  value={formData.dealerNo}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">중도매인명</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처(ID)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">경매 비밀번호</label>
                <input
                  type="text"
                  value={formData.auctionPassword}
                  onChange={(e) => setFormData({ ...formData, auctionPassword: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

      {/* 중도매인 삭제 확인 모달 */}
      {showDeleteModal && selectedDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">중도매인 삭제</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-900">{selectedDealer.name}</span> ({selectedDealer.dealerNo})님을 삭제하시겠습니까?
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

      {/* 중도매인 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">중도매인 등록</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">중도매인번호 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.dealerNo}
                  onChange={(e) => setFormData({ ...formData, dealerNo: e.target.value })}
                  placeholder="7000000"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">중도매인명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처(ID) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">경매 비밀번호 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.auctionPassword}
                  onChange={(e) => setFormData({ ...formData, auctionPassword: e.target.value })}
                  placeholder="경매 비밀번호를 입력하세요"
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="주소를 입력하세요"
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
                disabled={!formData.dealerNo || !formData.name || !formData.phone || !formData.password || !formData.auctionPassword}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직원 추가 모달 */}
      {showAddEmployeeModal && selectedDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddEmployeeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">직원 추가 - {selectedDealer.name}</h3>
              <button onClick={() => setShowAddEmployeeModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">소속 중도매인</p>
              <p className="text-sm font-medium text-gray-900">{selectedDealer.name} ({selectedDealer.dealerNo})</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">구분 <span className="text-red-500">*</span></label>
                <select
                  value={employeeFormData.role}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as 'agent' | 'staff' })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                >
                  <option value="agent">경매대리인</option>
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
      {showEditEmployeeModal && selectedDealer && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditEmployeeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">경매대리인/직원 수정</h3>
              <button onClick={() => setShowEditEmployeeModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">소속 중도매인</p>
              <p className="text-sm font-medium text-gray-900">{selectedDealer.name} ({selectedDealer.dealerNo})</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">구분</label>
                <select
                  value={employeeFormData.role}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value as 'agent' | 'staff' })}
                  className="w-full px-3 py-2.5 border border-gray-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                >
                  <option value="agent">경매대리인</option>
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
      {showDeleteEmployeeModal && selectedDealer && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteEmployeeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">직원 삭제</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-900">{selectedEmployee.name}</span>님을 삭제하시겠습니까?
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
