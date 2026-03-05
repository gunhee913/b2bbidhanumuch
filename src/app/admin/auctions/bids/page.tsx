'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCompanies } from '@/features/companies/hooks';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

// 오늘 날짜 (YYYY-MM-DD) - input[type="date"]용
const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateValue = getTodayDateValue();

// 경락 내역 데이터 타입
interface SettledRecord {
  id: string;
  listingId: string;
  partId: string;
  closedAt: string;
  listingDate: string;
  listingNo: string;
  listingPartNo: string;
  partName: string;
  grade: string;
  weight: number;
  minPrice: number;
  bidPrice: number | null;
  bidAmount: number | null;
  commission: number | null;
  deliveryFee: number | null;
  breed: string;
  gender: string;
  traceNo: string;
  companyId: string;
  companyNo: string;
  companyName: string;
  dealerId: string | null;
  dealerNo: string | null;
  dealerName: string | null;
  partnerNo: string | null;
  partnerName: string | null;
  isFailed: boolean;
}

interface SettledResponse {
  records: SettledRecord[];
  stats: {
    totalCount: number;
    successCount: number;
    failedCount: number;
    totalAmount: number;
  };
}

// 경락 내역 조회 API
const fetchSettledBids = async (params: {
  closedDateFrom?: string;
  closedDateTo?: string;
  companyId?: string;
}): Promise<SettledResponse> => {
  const searchParams = new URLSearchParams();
  if (params.closedDateFrom) searchParams.set('closedDateFrom', params.closedDateFrom);
  if (params.closedDateTo) searchParams.set('closedDateTo', params.closedDateTo);
  if (params.companyId) searchParams.set('companyId', params.companyId);

  const response = await fetch(`/api/bids/settled?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('경락 내역 조회 실패');
  }
  return response.json();
};

export default function AuctionBidsPage() {
  const [startDate, setStartDate] = useState(todayDateValue);
  const [endDate, setEndDate] = useState(todayDateValue);
  const [companyFilter, setCompanyFilter] = useState('');
  const [dealerFilter, setDealerFilter] = useState('');
  const [hideFailed, setHideFailed] = useState(false);

  const [searchStartDate, setSearchStartDate] = useState(todayDateValue);
  const [searchEndDate, setSearchEndDate] = useState(todayDateValue);
  const [searchCompanyFilter, setSearchCompanyFilter] = useState('');
  const [searchDealerFilter, setSearchDealerFilter] = useState('');
  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
    setSearchCompanyFilter(companyFilter);
    setSearchDealerFilter(dealerFilter);
  };

  // 업체 목록 조회
  const { data: companiesData } = useCompanies();

  // 경락 내역 조회
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settledBids', searchStartDate, searchEndDate, searchCompanyFilter],
    queryFn: () => fetchSettledBids({
      closedDateFrom: searchStartDate || undefined,
      closedDateTo: searchEndDate || undefined,
      companyId: searchCompanyFilter || undefined,
    }),
  });

  const records = data?.records || [];
  const stats = data?.stats || { totalCount: 0, successCount: 0, failedCount: 0, totalAmount: 0 };

  // 필터링 (중도매인 검색, 유찰분 숨김)
  const filteredRecords = records.filter(record => {
    if (hideFailed && record.isFailed) return false;
    if (searchDealerFilter && record.dealerName && !record.dealerName.includes(searchDealerFilter)) return false;
    if (searchDealerFilter && !record.dealerName) return false;
    return true;
  });

  // 합계 계산 (필터링된 데이터 기준)
  const successRecords = filteredRecords.filter(r => !r.isFailed);
  const failedCount = filteredRecords.filter(r => r.isFailed).length;
  const totalWeight = successRecords.reduce((sum, r) => sum + r.weight, 0);
  const totalAmount = successRecords.reduce((sum, r) => sum + (r.bidAmount || 0), 0);
  const totalCommission = successRecords.reduce((sum, r) => sum + (r.commission || 0), 0);
  const totalDeliveryFee = successRecords.reduce((sum, r) => sum + (r.deliveryFee || 0), 0);

  const thClass = "px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-2 py-2 text-xs text-gray-600 text-center whitespace-nowrap border border-gray-200";

  const formatTraceNo = (traceNo: string | undefined | null): string => {
    if (!traceNo) return '-';
    const cleaned = traceNo.replace(/^002-/, '');
    return `002-${cleaned}`;
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yy.MM.dd');
    } catch {
      return dateStr;
    }
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    const excelData = filteredRecords.map((record) => ({
      '상태': record.isFailed ? '유찰' : '낙찰',
      '상장일자': formatDate(record.listingDate),
      '상장번호': record.listingPartNo,
      '부위': record.partName,
      '등급': record.grade,
      '중량(kg)': record.weight,
      '낙찰단가': record.bidPrice || '-',
      '낙찰금액': record.bidAmount || '-',
      '상장수수료': record.commission || '-',
      '배송수수료': record.deliveryFee || '-',
      '축종': record.breed,
      '성별': record.gender,
      '중도매인번호': record.dealerNo || '-',
      '중도매인명': record.dealerName || '-',
      '상장업체명': record.companyName,
      '이력번호': formatTraceNo(record.traceNo),
      '거래처번호': record.partnerNo || '-',
      '거래처명': record.partnerName || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '부분육 경락 내역');

    const today = new Date();
    const fileName = `부분육_경락내역_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경락 내역</h1>
        <p className="text-sm text-gray-500 mt-1">마감된 경매의 낙찰/유찰 내역을 조회합니다.</p>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">마감일자</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          {/* 상장업체 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상장업체</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[120px]"
            >
              <option value="">전체</option>
              {companiesData?.map((company: any) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>

          {/* 중도매인 검색 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <input
              type="text"
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              placeholder="중도매인명 검색"
              className="w-32 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          {/* 유찰분 숨김 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideFailed}
                onChange={(e) => setHideFailed(e.target.checked)}
                className="w-4 h-4 rounded appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700 relative
                  after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:font-bold after:opacity-0 checked:after:opacity-100"
              />
              <span className="text-xs text-gray-600">유찰분 숨김</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
          >
            조회
          </button>

          {/* 버튼들 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              새로고침
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate(todayDateValue);
                setEndDate(todayDateValue);
                setCompanyFilter('');
                setDealerFilter('');
                setHideFailed(false);
                setSearchStartDate(todayDateValue);
                setSearchEndDate(todayDateValue);
                setSearchCompanyFilter('');
                setSearchDealerFilter('');
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
          </div>
        </div>
      </div>

      {/* 합계 정보 */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        <div className="bg-white border border-gray-200 p-2.5">
          <div className="text-[11px] text-gray-500 mb-0.5">총 건수</div>
          <div className="text-lg font-bold text-gray-900 whitespace-nowrap">{filteredRecords.length}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-2.5">
          <div className="text-[11px] text-gray-500 mb-0.5">낙찰</div>
          <div className="text-lg font-bold text-green-600 whitespace-nowrap">{successRecords.length}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-2.5">
          <div className="text-[11px] text-gray-500 mb-0.5">유찰</div>
          <div className="text-lg font-bold text-gray-400 whitespace-nowrap">{failedCount}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-2.5">
          <div className="text-[11px] text-gray-500 mb-0.5">낙찰중량</div>
          <div className="text-base font-bold text-gray-900 whitespace-nowrap">{totalWeight.toFixed(1)}kg</div>
        </div>
        <div className="bg-white border border-gray-200 p-2.5">
          <div className="text-[11px] text-gray-500 mb-0.5">낙찰금액</div>
          <div className="text-base font-bold text-gray-900 whitespace-nowrap">{totalAmount.toLocaleString()}원</div>
        </div>
        <div className="bg-white border border-gray-200 p-2.5">
          <div className="text-[11px] text-gray-500 mb-0.5">상장수수료</div>
          <div className="text-base font-bold text-gray-900 whitespace-nowrap">{totalCommission.toLocaleString()}원</div>
        </div>
        <div className="bg-white border border-gray-200 p-2.5">
          <div className="text-[11px] text-gray-500 mb-0.5">배송수수료</div>
          <div className="text-base font-bold text-gray-900 whitespace-nowrap">{totalDeliveryFee.toLocaleString()}원</div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>상태</th>
                <th className={thClass}>상장일자</th>
                <th className={thClass}>상장번호</th>
                <th className={thClass}>부위</th>
                <th className={thClass}>등급</th>
                <th className={thClass}>중량</th>
                <th className={thClass}>낙찰단가</th>
                <th className={thClass}>낙찰금액</th>
                <th className={thClass}>상장수수료</th>
                <th className={thClass}>배송수수료</th>
                <th className={thClass}>축종</th>
                <th className={thClass}>성별</th>
                <th className={thClass}>중도매인번호</th>
                <th className={thClass}>중도매인명</th>
                <th className={thClass}>상장업체명</th>
                <th className={thClass}>이력번호</th>
                <th className={thClass}>거래처번호</th>
                <th className={thClass}>거래처명</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-gray-500 border border-gray-200">
                    마감된 경락 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className={tdClass}>
                      {record.isFailed ? (
                        <span className="text-gray-400 font-medium">유찰</span>
                      ) : (
                        <span className="text-green-600 font-medium">낙찰</span>
                      )}
                    </td>
                    <td className={tdClass}>{formatDate(record.listingDate)}</td>
                    <td className={`${tdClass} font-medium text-gray-900`}>{record.listingPartNo}</td>
                    <td className={tdClass}>{record.partName}</td>
                    <td className={`${tdClass} font-medium`}>{record.grade}</td>
                    <td className={tdClass}>{record.weight.toFixed(1)}kg</td>
                    <td className={tdClass}>{record.bidPrice ? record.bidPrice.toLocaleString() : '-'}</td>
                    <td className={`${tdClass} font-medium ${record.isFailed ? 'text-gray-400' : 'text-gray-900'}`}>
                      {record.bidAmount ? record.bidAmount.toLocaleString() : '-'}
                    </td>
                    <td className={tdClass}>{record.commission ? record.commission.toLocaleString() : '-'}</td>
                    <td className={tdClass}>{record.deliveryFee ? record.deliveryFee.toLocaleString() : '-'}</td>
                    <td className={tdClass}>{record.breed}</td>
                    <td className={tdClass}>{record.gender}</td>
                    <td className={tdClass}>{record.dealerNo || '-'}</td>
                    <td className={tdClass}>{record.dealerName || '-'}</td>
                    <td className={tdClass}>{record.companyName}</td>
                    <td className={tdClass}>{formatTraceNo(record.traceNo)}</td>
                    <td className={tdClass}>{record.partnerNo || '-'}</td>
                    <td className={tdClass}>{record.partnerName || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            총 {filteredRecords.length}건
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
