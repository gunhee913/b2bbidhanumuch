'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Plus, 
  Edit, 
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

// 거래처 마스터 타입
interface Partner {
  id: string;
  partnerNo: string;
  name: string;
  businessNo: string | null;
  representative: string | null;
  phone: string | null;
  address: string | null;
  businessType: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  dealer1: Dealer | null;
  dealer2: Dealer | null;
  dealer3: Dealer | null;
}

// 중도매인 타입
interface Dealer {
  id: string;
  dealerNo: string;
  name: string;
}

interface PartnersResponse {
  partners: Partner[];
}

interface DealersResponse {
  dealers: Dealer[];
}

// 거래처구분 목록
const BUSINESS_TYPES = ['전체', '음식점', '일반정육점', '마트', '육가공장', '기타'];

export default function PartnersPage() {
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [sSearchTerm, setSSearchTerm] = useState('');
  const [sBusinessTypeFilter, setSBusinessTypeFilter] = useState('전체');
  const [sStatusFilter, setSStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleSearch = () => {
    setSSearchTerm(searchTerm);
    setSBusinessTypeFilter(businessTypeFilter);
    setSStatusFilter(statusFilter);
  };

  // 인라인 추가/수정 상태
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    businessNo: '',
    representative: '',
    phone: '',
    address: '',
    businessType: '음식점',
    status: 'active' as 'active' | 'inactive',
    dealer1Id: '',
    dealer2Id: '',
    dealer3Id: '',
  });

  // 거래처 목록 조회
  const { data: partnersData, isLoading: isLoadingPartners } = useQuery<PartnersResponse>({
    queryKey: ['partners', sSearchTerm, sBusinessTypeFilter, sStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sSearchTerm) params.set('search', sSearchTerm);
      if (sBusinessTypeFilter !== '전체') params.set('businessType', sBusinessTypeFilter);
      if (sStatusFilter !== 'all') params.set('status', sStatusFilter);
      
      const response = await fetch(`/api/partners?${params.toString()}`);
      if (!response.ok) throw new Error('거래처 조회 실패');
      return response.json();
    },
  });

  // 중도매인 목록 조회
  const { data: dealersData } = useQuery<DealersResponse>({
    queryKey: ['dealers'],
    queryFn: async () => {
      const response = await fetch('/api/dealers');
      if (!response.ok) throw new Error('중도매인 조회 실패');
      return response.json();
    },
  });

  const partners = partnersData?.partners || [];
  const dealers = dealersData?.dealers || [];

  // 거래처 등록 mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '등록 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setIsAdding(false);
      resetFormData();
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  // 거래처 수정 mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '수정 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setEditingId(null);
      resetFormData();
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  // 거래처 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '삭제 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  // 폼 초기화
  const resetFormData = () => {
    setFormData({
      name: '',
      businessNo: '',
      representative: '',
      phone: '',
      address: '',
      businessType: '음식점',
      status: 'active',
      dealer1Id: '',
      dealer2Id: '',
      dealer3Id: '',
    });
  };

  // 연락처 포맷팅
  const formatPhoneNumber = (value: string) => {
    if (!value) return '';
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    if (numbers.length <= 10) return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    // 휴대폰 번호 형식
    if (numbers.startsWith('010')) {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
    // 지역번호 형식 (02, 031 등)
    if (numbers.startsWith('02')) {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    }
    // 그 외 3자리 지역번호
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // 사업자번호 포맷팅
  const formatBusinessNo = (value: string) => {
    if (!value) return '';
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  // 날짜 포맷팅
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd');
    } catch {
      return '-';
    }
  };

  // 등록 시작
  const handleAddStart = () => {
    setIsAdding(true);
    setEditingId(null);
    resetFormData();
  };

  // 등록 취소
  const handleAddCancel = () => {
    setIsAdding(false);
    resetFormData();
  };

  // 등록 저장
  const handleAddSave = () => {
    if (!formData.name) {
      alert('거래처명은 필수입니다.');
      return;
    }

    createMutation.mutate({
      name: formData.name,
      businessNo: formData.businessNo || null,
      representative: formData.representative || null,
      phone: formData.phone || null,
      address: formData.address || null,
      businessType: formData.businessType || null,
      status: formData.status,
      dealer1Id: formData.dealer1Id || null,
      dealer2Id: formData.dealer2Id || null,
      dealer3Id: formData.dealer3Id || null,
    });
  };

  // 수정 시작
  const handleEditStart = (partner: Partner) => {
    setEditingId(partner.id);
    setIsAdding(false);
    setFormData({
      name: partner.name,
      businessNo: partner.businessNo || '',
      representative: partner.representative || '',
      phone: partner.phone || '',
      address: partner.address || '',
      businessType: partner.businessType || '음식점',
      status: partner.status,
      dealer1Id: partner.dealer1?.id || '',
      dealer2Id: partner.dealer2?.id || '',
      dealer3Id: partner.dealer3?.id || '',
    });
  };

  // 수정 취소
  const handleEditCancel = () => {
    setEditingId(null);
    resetFormData();
  };

  // 수정 저장
  const handleEditSave = () => {
    if (!formData.name) {
      alert('거래처명은 필수입니다.');
      return;
    }

    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      data: {
        name: formData.name,
        businessNo: formData.businessNo || null,
        representative: formData.representative || null,
        phone: formData.phone || null,
        address: formData.address || null,
        businessType: formData.businessType || null,
        status: formData.status,
        dealer1Id: formData.dealer1Id || null,
        dealer2Id: formData.dealer2Id || null,
        dealer3Id: formData.dealer3Id || null,
      },
    });
  };

  // 거래처 삭제
  const handleDelete = (partnerId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(partnerId);
    }
  };

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    if (partners.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const excelData = partners.map(partner => ({
      '거래처번호': partner.partnerNo,
      '거래처명': partner.name,
      '사업자번호': partner.businessNo || '-',
      '대표자': partner.representative || '-',
      '연락처': partner.phone || '-',
      '주소': partner.address || '-',
      '거래처구분': partner.businessType || '-',
      '등록일': formatDate(partner.createdAt),
      '중도매인1': partner.dealer1?.name || '-',
      '중도매인2': partner.dealer2?.name || '-',
      '중도매인3': partner.dealer3?.name || '-',
      '상태': partner.status === 'active' ? '활성' : '비활성',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 10 }, { wch: 15 }, { wch: 14 }, { wch: 10 },
      { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, 
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '거래처 목록');
    
    const today = new Date();
    const fileName = `거래처목록_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 스타일
  const thClass = "px-2 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-2 text-xs border border-gray-200 text-center whitespace-nowrap";
  const inputClass = "w-full px-2 py-1.5 text-xs border border-gray-200 outline-none bg-white";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">거래처 등록</h1>
        <p className="text-sm text-gray-500 mt-1">거래처를 등록하고 중도매인을 설정합니다.</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 거래처구분 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">거래처구분</span>
            <select
              value={businessTypeFilter}
              onChange={(e) => setBusinessTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              {BUSINESS_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상태</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>

          {/* 검색 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="거래처명, 대표자, 번호 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 text-xs outline-none bg-white w-52"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
          >
            조회
          </button>

          {/* 버튼 그룹 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setBusinessTypeFilter('전체');
                setStatusFilter('all');
                setSSearchTerm('');
                setSBusinessTypeFilter('전체');
                setSStatusFilter('all');
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 text-white text-xs hover:bg-gray-700"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
            <button
              type="button"
              onClick={handleAddStart}
              disabled={isAdding || editingId !== null}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              거래처 등록
            </button>
          </div>
        </div>
      </div>

      {/* 요약 정보 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 거래처</span>
            <span className="text-sm font-semibold text-gray-900">{partners.length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">활성</span>
            <span className="text-sm font-semibold text-gray-900">{partners.filter(p => p.status === 'active').length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">비활성</span>
            <span className="text-sm font-semibold text-gray-500">{partners.filter(p => p.status === 'inactive').length}개</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr>
                <th className={`${thClass} w-[70px]`}>거래처번호</th>
                <th className={`${thClass} w-[100px]`}>거래처명</th>
                <th className={`${thClass} w-[100px]`}>사업자번호</th>
                <th className={`${thClass} w-[70px]`}>대표자</th>
                <th className={`${thClass} w-[100px]`}>연락처</th>
                <th className={`${thClass} w-[180px]`}>주소</th>
                <th className={`${thClass} w-[80px]`}>거래처구분</th>
                <th className={`${thClass} w-[80px]`}>등록일</th>
                <th className={`${thClass} w-[70px]`}>중도매인1</th>
                <th className={`${thClass} w-[70px]`}>중도매인2</th>
                <th className={`${thClass} w-[70px]`}>중도매인3</th>
                <th className={`${thClass} w-[60px]`}>상태</th>
                <th className={`${thClass} w-[80px]`}>액션</th>
              </tr>
            </thead>
            <tbody>
              {/* 추가 행 */}
              {isAdding && (
                <tr>
                  <td className={`${tdClass} text-gray-400`}>자동생성</td>
                  <td className={tdClass}>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="거래처명 *"
                      className={inputClass}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="text"
                      value={formData.businessNo}
                      onChange={(e) => setFormData({ ...formData, businessNo: formatBusinessNo(e.target.value) })}
                      placeholder="000-00-00000 *"
                      className={inputClass}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="text"
                      value={formData.representative}
                      onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                      placeholder="대표자 *"
                      className={inputClass}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                      placeholder="연락처 *"
                      className={inputClass}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="주소"
                      className={inputClass}
                    />
                  </td>
                  <td className={tdClass}>
                    <select
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className={inputClass}
                    >
                      <option value="음식점">음식점</option>
                      <option value="일반정육점">일반정육점</option>
                      <option value="마트">마트</option>
                      <option value="육가공장">육가공장</option>
                      <option value="기타">기타</option>
                    </select>
                  </td>
                  <td className={`${tdClass} text-gray-400`}>자동</td>
                  <td className={tdClass}>
                    <select
                      value={formData.dealer1Id}
                      onChange={(e) => setFormData({ ...formData, dealer1Id: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">선택</option>
                      {dealers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className={tdClass}>
                    <select
                      value={formData.dealer2Id}
                      onChange={(e) => setFormData({ ...formData, dealer2Id: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">선택</option>
                      {dealers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className={tdClass}>
                    <select
                      value={formData.dealer3Id}
                      onChange={(e) => setFormData({ ...formData, dealer3Id: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">선택</option>
                      {dealers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className={tdClass}>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className={inputClass}
                    >
                      <option value="active">활성</option>
                      <option value="inactive">비활성</option>
                    </select>
                  </td>
                  <td className={tdClass}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={handleAddSave}
                        disabled={!formData.name || createMutation.isPending}
                        className="px-2 py-1 text-xs bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createMutation.isPending ? '저장중...' : '저장'}
                      </button>
                      <button
                        onClick={handleAddCancel}
                        disabled={createMutation.isPending}
                        className="px-2 py-1 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {isLoadingPartners ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      데이터 조회 중...
                    </div>
                  </td>
                </tr>
              ) : partners.map((partner) => (
                editingId === partner.id ? (
                  // 수정 행
                  <tr key={partner.id}>
                    <td className={tdClass}>{partner.partnerNo}</td>
                    <td className={tdClass}>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="거래처명 *"
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>
                      <input
                        type="text"
                        value={formData.businessNo}
                        onChange={(e) => setFormData({ ...formData, businessNo: formatBusinessNo(e.target.value) })}
                        placeholder="000-00-00000 *"
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>
                      <input
                        type="text"
                        value={formData.representative}
                        onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                        placeholder="대표자 *"
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                        placeholder="연락처 *"
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="주소"
                        className={inputClass}
                      />
                    </td>
                    <td className={tdClass}>
                      <select
                        value={formData.businessType}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        className={inputClass}
                      >
                        <option value="음식점">음식점</option>
                        <option value="일반정육점">일반정육점</option>
                        <option value="마트">마트</option>
                        <option value="육가공장">육가공장</option>
                        <option value="기타">기타</option>
                      </select>
                    </td>
                    <td className={tdClass}>{formatDate(partner.createdAt)}</td>
                    <td className={tdClass}>
                      <select
                        value={formData.dealer1Id}
                        onChange={(e) => setFormData({ ...formData, dealer1Id: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">선택</option>
                        {dealers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className={tdClass}>
                      <select
                        value={formData.dealer2Id}
                        onChange={(e) => setFormData({ ...formData, dealer2Id: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">선택</option>
                        {dealers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className={tdClass}>
                      <select
                        value={formData.dealer3Id}
                        onChange={(e) => setFormData({ ...formData, dealer3Id: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">선택</option>
                        {dealers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className={tdClass}>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                        className={inputClass}
                      >
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                      </select>
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={handleEditSave}
                          disabled={!formData.name || updateMutation.isPending}
                          className="px-2 py-1 text-xs bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updateMutation.isPending ? '저장중...' : '저장'}
                        </button>
                        <button
                          onClick={handleEditCancel}
                          disabled={updateMutation.isPending}
                          className="px-2 py-1 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // 일반 행
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className={tdClass}>{partner.partnerNo}</td>
                    <td className={`${tdClass} font-medium text-gray-900`}>{partner.name}</td>
                    <td className={tdClass}>{partner.businessNo || '-'}</td>
                    <td className={tdClass}>{partner.representative || '-'}</td>
                    <td className={tdClass}>{partner.phone || '-'}</td>
                    <td className={`${tdClass} text-left truncate`} title={partner.address || ''}>
                      {partner.address || '-'}
                    </td>
                    <td className={tdClass}>{partner.businessType || '-'}</td>
                    <td className={tdClass}>{formatDate(partner.createdAt)}</td>
                    <td className={tdClass}>{partner.dealer1?.name || '-'}</td>
                    <td className={tdClass}>{partner.dealer2?.name || '-'}</td>
                    <td className={tdClass}>{partner.dealer3?.name || '-'}</td>
                    <td className={tdClass}>{partner.status === 'active' ? '활성' : '비활성'}</td>
                    <td className={tdClass}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditStart(partner)}
                          disabled={isAdding || editingId !== null || deleteMutation.isPending}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(partner.id)}
                          disabled={isAdding || editingId !== null || deleteMutation.isPending}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {!isLoadingPartners && partners.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    등록된 거래처가 없습니다. 신규 등록 버튼을 눌러 거래처를 추가해주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
