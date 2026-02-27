'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
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
  dealer1: { id: string; dealerNo: string; name: string } | null;
  dealer2: { id: string; dealerNo: string; name: string } | null;
  dealer3: { id: string; dealerNo: string; name: string } | null;
}

// 중도매인 타입
interface Dealer {
  id: string;
  dealerNo: string;
  name: string;
}

interface DealersResponse {
  dealers: Dealer[];
}

interface PartnersResponse {
  partners: Partner[];
}

export default function PartnersDealersPage() {
  const [expandedDealers, setExpandedDealers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [sSearchTerm, setSSearchTerm] = useState('');
  const [sDealerFilter, setSDealerFilter] = useState('all');
  const [sStatusFilter, setSStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleSearch = () => {
    setSSearchTerm(searchTerm);
    setSDealerFilter(dealerFilter);
    setSStatusFilter(statusFilter);
  };

  // 중도매인 목록 조회
  const { data: dealersData, isLoading: isLoadingDealers } = useQuery<DealersResponse>({
    queryKey: ['dealers'],
    queryFn: async () => {
      const response = await fetch('/api/dealers');
      if (!response.ok) throw new Error('중도매인 조회 실패');
      return response.json();
    },
  });

  // 거래처 목록 조회
  const { data: partnersData, isLoading: isLoadingPartners } = useQuery<PartnersResponse>({
    queryKey: ['partners'],
    queryFn: async () => {
      const response = await fetch('/api/partners');
      if (!response.ok) throw new Error('거래처 조회 실패');
      return response.json();
    },
  });

  const dealers = dealersData?.dealers || [];
  const partners = partnersData?.partners || [];
  const isLoading = isLoadingDealers || isLoadingPartners;

  // 날짜 포맷팅
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd');
    } catch {
      return '-';
    }
  };

  // 중도매인 펼치기/접기
  const toggleDealer = (dealerId: string) => {
    setExpandedDealers(prev =>
      prev.includes(dealerId)
        ? prev.filter(id => id !== dealerId)
        : [...prev, dealerId]
    );
  };

  // 중도매인별 연결된 거래처 가져오기
  const getPartnersForDealer = (dealerId: string) => {
    return partners.filter(p => 
      p.dealer1?.id === dealerId || p.dealer2?.id === dealerId || p.dealer3?.id === dealerId
    );
  };

  // 필터링된 중도매인 데이터
  const filteredData = dealers
    .filter(dealer => sDealerFilter === 'all' || dealer.id === sDealerFilter)
    .map(dealer => {
      const dealerPartners = getPartnersForDealer(dealer.id).filter(partner => {
        const matchSearch = sSearchTerm === '' || 
          partner.name.includes(sSearchTerm) || 
          (partner.representative && partner.representative.includes(sSearchTerm));
        const matchStatus = sStatusFilter === 'all' || partner.status === sStatusFilter;
        return matchSearch && matchStatus;
      });
      return { ...dealer, partners: dealerPartners };
    })
    .filter(dealer => sDealerFilter !== 'all' || dealer.partners.length > 0 || sSearchTerm === '');

  // 전체 연결 수
  const totalLinks = filteredData.reduce((acc, d) => acc + d.partners.length, 0);

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    if (totalLinks === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const excelData: Record<string, string | number>[] = [];
    filteredData.forEach(dealer => {
      dealer.partners.forEach(partner => {
        excelData.push({
          '중도매인번호': dealer.dealerNo,
          '중도매인명': dealer.name,
          '거래처번호': partner.partnerNo,
          '거래처명': partner.name,
          '사업자번호': partner.businessNo || '-',
          '대표자': partner.representative || '-',
          '연락처': partner.phone || '-',
          '주소': partner.address || '-',
          '거래처구분': partner.businessType || '-',
          '등록일': formatDate(partner.createdAt),
          '상태': partner.status === 'active' ? '활성' : '비활성',
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 14 }, { wch: 10 },
      { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 8 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '중도매인별 거래처');
    
    const today = new Date();
    const fileName = `중도매인별거래처_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 스타일
  const thClass = "px-3 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-3 py-2 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">거래처 조회(중도매인별)</h1>
        <p className="text-sm text-gray-500 mt-1">중도매인별로 연결된 거래처를 조회합니다.</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 중도매인 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <select
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[140px]"
            >
              <option value="all">전체</option>
              {dealers.map(dealer => (
                <option key={dealer.id} value={dealer.id}>{dealer.name} ({dealer.dealerNo})</option>
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
            <input
              type="text"
              placeholder="거래처명, 대표자 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white w-48"
            />
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
                setDealerFilter('all');
                setStatusFilter('all');
                setSSearchTerm('');
                setSDealerFilter('all');
                setSStatusFilter('all');
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>
        </div>
      </div>

      {/* 요약 정보 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 연결</span>
            <span className="text-sm font-semibold text-gray-900">{totalLinks}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">중도매인</span>
            <span className="text-sm font-semibold text-gray-900">{filteredData.length}명</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr>
                <th className={thClass} style={{ width: '100px' }}>중도매인번호</th>
                <th className={thClass} style={{ width: '80px' }}>중도매인명</th>
                <th className={thClass} style={{ width: '70px' }}>거래처 수</th>
                <th className={thClass} style={{ width: '80px' }}>거래처번호</th>
                <th className={thClass} style={{ width: '100px' }}>거래처명</th>
                <th className={thClass} style={{ width: '120px' }}>사업자번호</th>
                <th className={thClass} style={{ width: '70px' }}>대표자</th>
                <th className={thClass} style={{ width: '110px' }}>연락처</th>
                <th className={thClass} style={{ width: '240px' }}>주소</th>
                <th className={thClass} style={{ width: '90px' }}>거래처구분</th>
                <th className={thClass} style={{ width: '90px' }}>등록일</th>
                <th className={thClass} style={{ width: '70px' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      데이터 조회 중...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                    {dealers.length === 0 ? '등록된 중도매인이 없습니다.' : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredData.map((dealer) => (
                  <React.Fragment key={dealer.id}>
                    {dealer.partners.length > 0 ? (
                      <>
                        {/* 첫 번째 거래처와 함께 표시 */}
                        <tr 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleDealer(dealer.id)}
                        >
                          <td className={`${tdClass} bg-gray-50 font-medium`} rowSpan={expandedDealers.includes(dealer.id) ? dealer.partners.length : 1}>
                            <div className="flex items-center justify-center gap-1">
                              {expandedDealers.includes(dealer.id) ? (
                                <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              )}
                              {dealer.dealerNo}
                            </div>
                          </td>
                          <td className={`${tdClass} bg-gray-50 font-medium`} rowSpan={expandedDealers.includes(dealer.id) ? dealer.partners.length : 1}>
                            {dealer.name}
                          </td>
                          <td className={`${tdClass} bg-gray-50`} rowSpan={expandedDealers.includes(dealer.id) ? dealer.partners.length : 1}>
                            {dealer.partners.length}개
                          </td>
                          {expandedDealers.includes(dealer.id) ? (
                            <>
                              <td className={tdClass}>{dealer.partners[0].partnerNo}</td>
                              <td className={`${tdClass} font-medium text-gray-900`}>{dealer.partners[0].name}</td>
                              <td className={tdClass}>{dealer.partners[0].businessNo || '-'}</td>
                              <td className={tdClass}>{dealer.partners[0].representative || '-'}</td>
                              <td className={tdClass}>{dealer.partners[0].phone || '-'}</td>
                              <td className={`${tdClass} text-left truncate`} title={dealer.partners[0].address || ''}>{dealer.partners[0].address || '-'}</td>
                              <td className={tdClass}>{dealer.partners[0].businessType || '-'}</td>
                              <td className={tdClass}>{formatDate(dealer.partners[0].createdAt)}</td>
                              <td className={tdClass}>{dealer.partners[0].status === 'active' ? '활성' : '비활성'}</td>
                            </>
                          ) : (
                            <td className={tdClass} colSpan={9}>
                              <span className="text-gray-400">클릭하여 거래처 목록 보기</span>
                            </td>
                          )}
                        </tr>
                        {/* 나머지 거래처 행들 */}
                        {expandedDealers.includes(dealer.id) && dealer.partners.slice(1).map((partner) => (
                          <tr key={partner.id} className="hover:bg-gray-50">
                            <td className={tdClass}>{partner.partnerNo}</td>
                            <td className={`${tdClass} font-medium text-gray-900`}>{partner.name}</td>
                            <td className={tdClass}>{partner.businessNo || '-'}</td>
                            <td className={tdClass}>{partner.representative || '-'}</td>
                            <td className={tdClass}>{partner.phone || '-'}</td>
                            <td className={`${tdClass} text-left truncate`} title={partner.address || ''}>{partner.address || '-'}</td>
                            <td className={tdClass}>{partner.businessType || '-'}</td>
                            <td className={tdClass}>{formatDate(partner.createdAt)}</td>
                            <td className={tdClass}>{partner.status === 'active' ? '활성' : '비활성'}</td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr className="hover:bg-gray-50">
                        <td className={`${tdClass} bg-gray-50 font-medium`}>{dealer.dealerNo}</td>
                        <td className={`${tdClass} bg-gray-50 font-medium`}>{dealer.name}</td>
                        <td className={`${tdClass} bg-gray-50`}>0개</td>
                        <td className={tdClass} colSpan={9}>
                          <span className="text-gray-400">등록된 거래처가 없습니다.</span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
