'use client';

import { useState } from 'react';
import DealerLayout from '@/components/dealer/DealerLayout';
import { Download, Loader2, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

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
}

interface PartnersResponse {
  partners: Partner[];
}

export default function DealerPartnersPage() {
  const { data: session } = useSession();
  const dealerId = session?.dealer?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [sSearchTerm, setSSearchTerm] = useState('');
  const [sStatusFilter, setSStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleSearch = () => {
    setSSearchTerm(searchTerm);
    setSStatusFilter(statusFilter);
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSSearchTerm('');
    setSStatusFilter('all');
  };

  const { data: partnersData, isLoading } = useQuery<PartnersResponse>({
    queryKey: ['dealer-partners', dealerId],
    queryFn: async () => {
      const response = await fetch(`/api/partners?dealerId=${dealerId}`);
      if (!response.ok) throw new Error('거래처 조회 실패');
      return response.json();
    },
    enabled: !!dealerId,
  });

  const partners = partnersData?.partners || [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd');
    } catch {
      return '-';
    }
  };

  const filteredPartners = partners.filter(partner => {
    const matchSearch =
      sSearchTerm === '' ||
      partner.name.includes(sSearchTerm) ||
      (partner.representative && partner.representative.includes(sSearchTerm));
    const matchStatus = sStatusFilter === 'all' || partner.status === sStatusFilter;
    return matchSearch && matchStatus;
  });

  const handleExcelDownload = () => {
    if (filteredPartners.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const excelData = filteredPartners.map(partner => ({
      '거래처번호': partner.partnerNo,
      '거래처명': partner.name,
      '사업자번호': partner.businessNo || '-',
      '대표자': partner.representative || '-',
      '연락처': partner.phone || '-',
      '주소': partner.address || '-',
      '거래처구분': partner.businessType || '-',
      '등록일': formatDate(partner.createdAt),
      '상태': partner.status === 'active' ? '활성' : '비활성',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 10 }, { wch: 15 }, { wch: 14 }, { wch: 10 },
      { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 8 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '거래처 목록');

    const today = new Date();
    const fileName = `거래처목록_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const thClass = "px-3 py-2 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-3 py-2 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <DealerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">거래처 조회</h1>
        <p className="text-sm text-gray-500 mt-1">본인에게 연결된 거래처를 조회합니다.</p>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="거래처명, 대표자 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white w-48"
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-1 px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
          >
            <Search className="w-3.5 h-3.5" />
            조회
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleReset}
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

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr>
                <th className={thClass} style={{ width: '80px' }}>거래처번호</th>
                <th className={thClass} style={{ width: '120px' }}>거래처명</th>
                <th className={thClass} style={{ width: '120px' }}>사업자번호</th>
                <th className={thClass} style={{ width: '80px' }}>대표자</th>
                <th className={thClass} style={{ width: '120px' }}>연락처</th>
                <th className={thClass} style={{ width: '250px' }}>주소</th>
                <th className={thClass} style={{ width: '90px' }}>거래처구분</th>
                <th className={thClass} style={{ width: '100px' }}>등록일</th>
                <th className={thClass} style={{ width: '70px' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      데이터 조회 중...
                    </div>
                  </td>
                </tr>
              ) : filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {partners.length === 0 ? '등록된 거래처가 없습니다.' : '검색 결과가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => (
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
                    <td className={tdClass}>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        partner.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {partner.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DealerLayout>
  );
}
