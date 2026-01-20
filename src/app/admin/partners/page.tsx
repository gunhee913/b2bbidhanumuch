'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Search, 
  Plus, 
  Edit, 
  Download,
  X,
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
  
  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  
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

  // 모달 열기
  const openModal = (partner?: Partner) => {
    if (partner) {
      setEditingPartner(partner);
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
    } else {
      setEditingPartner(null);
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
    }
    setShowModal(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false);
    setEditingPartner(null);
  };

  // 거래처 저장
  const handleSave = () => {
    if (!formData.name || !formData.businessNo || !formData.representative || !formData.phone) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    if (editingPartner) {
      setPartners(prev => prev.map(p =>
        p.id === editingPartner.id ? { ...p, ...formData } : p
      ));
    } else {
      const newPartner: Partner = {
        id: `p${Date.now()}`,
        partnerNo: String(10001 + partners.length),
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setPartners(prev => [...prev, newPartner]);
    }
    closeModal();
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
  const thClass = "px-3 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-3 py-2 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">거래처 등록</h1>
        <p className="text-sm text-gray-500 mt-1">거래처를 등록하고 중도매인을 설정합니다.</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 거래처구분 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">거래처구분</span>
            <select
              value={businessTypeFilter}
              onChange={(e) => setBusinessTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white"
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
              className="px-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white"
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
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white w-52"
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
              className="px-4 py-1.5 border border-gray-200 text-gray-600 rounded text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
            <button
              type="button"
              onClick={() => openModal()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              <Plus className="w-3.5 h-3.5" />
              거래처 등록
            </button>
          </div>
        </div>
      </div>

      {/* 요약 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 거래처</span>
            <span className="text-sm font-semibold text-gray-900">{filteredPartners.length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">활성</span>
            <span className="text-sm font-semibold text-green-600">{filteredPartners.filter(p => p.status === 'active').length}개</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">비활성</span>
            <span className="text-sm font-semibold text-gray-400">{filteredPartners.filter(p => p.status === 'inactive').length}개</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className={thClass}>거래처번호</th>
                <th className={thClass}>거래처명</th>
                <th className={thClass}>사업자번호</th>
                <th className={thClass}>대표자</th>
                <th className={thClass}>연락처</th>
                <th className={thClass}>주소</th>
                <th className={thClass}>거래처구분</th>
                <th className={thClass}>등록일</th>
                <th className={thClass}>중도매인1</th>
                <th className={thClass}>중도매인2</th>
                <th className={thClass}>중도매인3</th>
                <th className={thClass}>상태</th>
                <th className={thClass}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50">
                  <td className={tdClass}>{partner.partnerNo}</td>
                  <td className={`${tdClass} font-medium text-gray-900`}>{partner.name}</td>
                  <td className={tdClass}>{partner.businessNo}</td>
                  <td className={tdClass}>{partner.representative}</td>
                  <td className={tdClass}>{partner.phone}</td>
                  <td className={`${tdClass} text-left max-w-[200px] truncate`} title={partner.address}>
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
                        onClick={() => openModal(partner)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title="수정"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(partner.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPartners.length === 0 && (
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

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {editingPartner ? '거래처 수정' : '거래처 등록'}
              </h3>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 거래처명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">거래처명 (상호) *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 맛있는정육점"
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                />
              </div>

              {/* 사업자번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사업자번호 *</label>
                <input
                  type="text"
                  value={formData.businessNo}
                  onChange={(e) => setFormData({ ...formData, businessNo: e.target.value })}
                  placeholder="예: 123-45-67890"
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                />
              </div>

              {/* 대표자 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대표자 *</label>
                <input
                  type="text"
                  value={formData.representative}
                  onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                  placeholder="예: 홍길동"
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                />
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="예: 02-1234-5678"
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                />
              </div>

              {/* 주소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="예: 서울시 강남구 역삼동 123-45"
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                />
              </div>

              {/* 거래처구분 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">거래처구분</label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                >
                  <option value="음식점">음식점</option>
                  <option value="일반정육점">일반정육점</option>
                  <option value="마트">마트</option>
                  <option value="육가공장">육가공장</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 상태 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>

              {/* 중도매인 설정 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">중도매인1</label>
                  <select
                    value={formData.dealer1}
                    onChange={(e) => setFormData({ ...formData, dealer1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                  >
                    <option value="">선택</option>
                    {dealers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">중도매인2</label>
                  <select
                    value={formData.dealer2}
                    onChange={(e) => setFormData({ ...formData, dealer2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                  >
                    <option value="">선택</option>
                    {dealers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">중도매인3</label>
                  <select
                    value={formData.dealer3}
                    onChange={(e) => setFormData({ ...formData, dealer3: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none bg-white"
                  >
                    <option value="">선택</option>
                    {dealers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                {editingPartner ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
