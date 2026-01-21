'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Plus, 
  Edit, 
  Download,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// 거래처 마스터 타입
interface Partner {
  id: string;
  partnerNo: string;
  name: string;
  businessNo: string;
  representative: string;
  phone: string;
  address: string;
  businessType: string;
  status: 'active' | 'inactive';
  createdAt: string;
  dealer1: string; // 중도매인1 ID
  dealer2: string; // 중도매인2 ID
  dealer3: string; // 중도매인3 ID
}

// 중도매인 타입
interface Dealer {
  id: string;
  dealerNo: string;
  name: string;
}

// 중도매인 데이터
const initialDealers: Dealer[] = [
  { id: 'd1', dealerNo: '7000001', name: '김철수' },
  { id: 'd2', dealerNo: '7000002', name: '이영희' },
  { id: 'd3', dealerNo: '7000003', name: '박민수' },
  { id: 'd4', dealerNo: '7000004', name: '최지현' },
  { id: 'd5', dealerNo: '7000005', name: '정수민' },
];

// 거래처 마스터 데이터
const initialPartners: Partner[] = [
  { id: 'p1', partnerNo: '10001', name: '맛있는정육점', businessNo: '123-45-67890', representative: '홍길동', phone: '02-1234-5678', address: '서울시 강남구 역삼동 123-45', businessType: '일반정육점', status: 'active', createdAt: '2024-03-15', dealer1: 'd1', dealer2: '', dealer3: '' },
  { id: 'p2', partnerNo: '10002', name: '소고기천국', businessNo: '234-56-78901', representative: '이순신', phone: '02-2345-6789', address: '서울시 서초구 방배동 456-78', businessType: '음식점', status: 'active', createdAt: '2024-05-20', dealer1: 'd1', dealer2: 'd2', dealer3: '' },
  { id: 'p3', partnerNo: '10003', name: '신선마트', businessNo: '345-67-89012', representative: '강감찬', phone: '02-3456-7890', address: '서울시 송파구 잠실동 789-12', businessType: '마트', status: 'inactive', createdAt: '2024-06-10', dealer1: 'd1', dealer2: '', dealer3: '' },
  { id: 'p4', partnerNo: '10004', name: '한우명가', businessNo: '456-78-90123', representative: '김유신', phone: '031-1234-5678', address: '경기도 성남시 분당구 정자동 234-56', businessType: '음식점', status: 'active', createdAt: '2024-04-01', dealer1: 'd2', dealer2: 'd5', dealer3: '' },
  { id: 'p5', partnerNo: '10005', name: '프리미엄정육', businessNo: '567-89-01234', representative: '을지문덕', phone: '031-2345-6789', address: '경기도 용인시 수지구 동천동 567-89', businessType: '일반정육점', status: 'active', createdAt: '2024-07-15', dealer1: 'd2', dealer2: '', dealer3: '' },
  { id: 'p6', partnerNo: '10006', name: '고기굽는마을', businessNo: '678-90-12345', representative: '권율', phone: '043-1234-5678', address: '충북 음성군 음성읍 읍내리 123', businessType: '음식점', status: 'active', createdAt: '2024-08-20', dealer1: 'd3', dealer2: '', dealer3: '' },
  { id: 'p7', partnerNo: '10007', name: '육미정', businessNo: '789-01-23456', representative: '장보고', phone: '02-4567-8901', address: '서울시 마포구 상암동 890-12', businessType: '음식점', status: 'active', createdAt: '2024-09-01', dealer1: 'd5', dealer2: '', dealer3: '' },
  { id: 'p8', partnerNo: '10008', name: '한우촌', businessNo: '890-12-34567', representative: '최영', phone: '02-5678-9012', address: '서울시 영등포구 여의도동 345-67', businessType: '음식점', status: 'active', createdAt: '2024-09-15', dealer1: 'd5', dealer2: '', dealer3: '' },
  { id: 'p9', partnerNo: '10009', name: '신선정육', businessNo: '901-23-45678', representative: '이성계', phone: '02-6789-0123', address: '서울시 종로구 종로동 678-90', businessType: '일반정육점', status: 'inactive', createdAt: '2024-10-01', dealer1: 'd5', dealer2: '', dealer3: '' },
];

// 거래처구분 목록
const BUSINESS_TYPES = ['전체', '음식점', '일반정육점', '마트', '육가공장', '기타'];

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [dealers] = useState<Dealer[]>(initialDealers);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
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
    dealer1: '',
    dealer2: '',
    dealer3: '',
  });

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

  // 중도매인 이름 가져오기
  const getDealerName = (dealerId: string) => {
    if (!dealerId) return '-';
    const dealer = dealers.find(d => d.id === dealerId);
    return dealer ? dealer.name : '-';
  };

  // 필터링된 데이터
  const filteredPartners = partners.filter(partner => {
    const matchSearch = searchTerm === '' || 
      partner.name.includes(searchTerm) || 
      partner.representative.includes(searchTerm) ||
      partner.partnerNo.includes(searchTerm);
    const matchType = businessTypeFilter === '전체' || partner.businessType === businessTypeFilter;
    const matchStatus = statusFilter === 'all' || partner.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  // 등록 시작
  const handleAddStart = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      name: '',
      businessNo: '',
      representative: '',
      phone: '',
      address: '',
      businessType: '음식점',
      status: 'active',
      dealer1: '',
      dealer2: '',
      dealer3: '',
    });
  };

  // 등록 취소
  const handleAddCancel = () => {
    setIsAdding(false);
    setFormData({
      name: '',
      businessNo: '',
      representative: '',
      phone: '',
      address: '',
      businessType: '음식점',
      status: 'active',
      dealer1: '',
      dealer2: '',
      dealer3: '',
    });
  };

  // 등록 저장
  const handleAddSave = () => {
    if (!formData.name || !formData.businessNo || !formData.representative || !formData.phone) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    const newPartner: Partner = {
      id: `p${Date.now()}`,
      partnerNo: String(10001 + partners.length),
      ...formData,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPartners(prev => [...prev, newPartner]);
    setIsAdding(false);
    setFormData({
      name: '',
      businessNo: '',
      representative: '',
      phone: '',
      address: '',
      businessType: '음식점',
      status: 'active',
      dealer1: '',
      dealer2: '',
      dealer3: '',
    });
  };

  // 수정 시작
  const handleEditStart = (partner: Partner) => {
    setEditingId(partner.id);
    setIsAdding(false);
    setFormData({
      name: partner.name,
      businessNo: partner.businessNo,
      representative: partner.representative,
      phone: partner.phone,
      address: partner.address,
      businessType: partner.businessType,
      status: partner.status,
      dealer1: partner.dealer1,
      dealer2: partner.dealer2,
      dealer3: partner.dealer3,
    });
  };

  // 수정 취소
  const handleEditCancel = () => {
    setEditingId(null);
  };

  // 수정 저장
  const handleEditSave = () => {
    if (!formData.name || !formData.businessNo || !formData.representative || !formData.phone) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    setPartners(prev => prev.map(p =>
      p.id === editingId ? { ...p, ...formData } : p
    ));
    setEditingId(null);
  };

  // 거래처 삭제
  const handleDelete = (partnerId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setPartners(prev => prev.filter(p => p.id !== partnerId));
    }
  };

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const excelData = filteredPartners.map(partner => ({
      '거래처번호': partner.partnerNo,
      '거래처명': partner.name,
      '사업자번호': partner.businessNo,
      '대표자': partner.representative,
      '연락처': partner.phone,
      '주소': partner.address,
      '거래처구분': partner.businessType,
      '등록일': partner.createdAt,
      '중도매인1': getDealerName(partner.dealer1),
      '중도매인2': getDealerName(partner.dealer2),
      '중도매인3': getDealerName(partner.dealer3),
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

          {/* 버튼 그룹 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setBusinessTypeFilter('전체');
                setStatusFilter('all');
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
            <span className="text-sm font-semibold text-gray-900">{filteredPartners.length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">활성</span>
            <span className="text-sm font-semibold text-gray-900">{filteredPartners.filter(p => p.status === 'active').length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">비활성</span>
            <span className="text-sm font-semibold text-gray-500">{filteredPartners.filter(p => p.status === 'inactive').length}개</span>
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
                      value={formData.dealer1}
                      onChange={(e) => setFormData({ ...formData, dealer1: e.target.value })}
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
                      value={formData.dealer2}
                      onChange={(e) => setFormData({ ...formData, dealer2: e.target.value })}
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
                      value={formData.dealer3}
                      onChange={(e) => setFormData({ ...formData, dealer3: e.target.value })}
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
                        disabled={!formData.name || !formData.businessNo || !formData.representative || !formData.phone}
                        className="px-2 py-1 text-xs bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleAddCancel}
                        className="px-2 py-1 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredPartners.map((partner) => (
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
                    <td className={tdClass}>{partner.createdAt}</td>
                    <td className={tdClass}>
                      <select
                        value={formData.dealer1}
                        onChange={(e) => setFormData({ ...formData, dealer1: e.target.value })}
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
                        value={formData.dealer2}
                        onChange={(e) => setFormData({ ...formData, dealer2: e.target.value })}
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
                        value={formData.dealer3}
                        onChange={(e) => setFormData({ ...formData, dealer3: e.target.value })}
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
                          disabled={!formData.name || !formData.businessNo || !formData.representative || !formData.phone}
                          className="px-2 py-1 text-xs bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleEditCancel}
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
                    <td className={tdClass}>{partner.businessNo}</td>
                    <td className={tdClass}>{partner.representative}</td>
                    <td className={tdClass}>{partner.phone}</td>
                    <td className={`${tdClass} text-left truncate`} title={partner.address}>
                      {partner.address}
                    </td>
                    <td className={tdClass}>{partner.businessType}</td>
                    <td className={tdClass}>{partner.createdAt}</td>
                    <td className={tdClass}>{getDealerName(partner.dealer1)}</td>
                    <td className={tdClass}>{getDealerName(partner.dealer2)}</td>
                    <td className={tdClass}>{getDealerName(partner.dealer3)}</td>
                    <td className={tdClass}>{partner.status === 'active' ? '활성' : '비활성'}</td>
                    <td className={tdClass}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditStart(partner)}
                          disabled={isAdding || editingId !== null}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(partner.id)}
                          disabled={isAdding || editingId !== null}
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
              {filteredPartners.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    검색 결과가 없습니다.
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
