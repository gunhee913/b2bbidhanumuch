'use client';

import React, { useState, useMemo } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// 오늘 날짜 (YYYY-MM-DD)
const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateValue = getTodayDateValue();

// 경락 내역 데이터 타입
interface BidRecord {
  id: string;
  closedAt: string;
  listingDate: string;
  listingNo: string;
  listingPartNo: string;
  partName: string;
  grade: string;
  weight: number;
  bidPrice: number | null;
  bidAmount: number | null;
  commission: number | null;
  deliveryFee: number | null;
  breed: string;
  gender: string;
  dealerNo: string | null;
  dealerName: string | null;
  traceNo: string;
  isFailed: boolean;
}

interface SettledResponse {
  records: BidRecord[];
  stats: {
    totalCount: number;
    successCount: number;
    failedCount: number;
    totalAmount: number;
  };
}

export default function CompanyAuctionBidsPage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  const companyId = session?.company?.id || '';
  
  const [startDate, setStartDate] = useState(todayDateValue);
  const [endDate, setEndDate] = useState(todayDateValue);
  const [sStartDate, setSStartDate] = useState(todayDateValue);
  const [sEndDate, setSEndDate] = useState(todayDateValue);
  const [dealerFilter, setDealerFilter] = useState('');
  const [hideFailed, setHideFailed] = useState(false);

  const handleSearch = () => {
    setSStartDate(startDate);
    setSEndDate(endDate);
  };

  // API 호출
  const { data: settledData, isLoading } = useQuery<SettledResponse>({
    queryKey: ['companySettledBids', companyId, sStartDate, sEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.set('companyId', companyId);
      if (sStartDate) params.set('closedDateFrom', sStartDate);
      if (sEndDate) params.set('closedDateTo', sEndDate);
      
      const response = await fetch(`/api/bids/settled?${params.toString()}`);
      if (!response.ok) throw new Error('데이터 조회 실패');
      return response.json();
    },
    enabled: !!companyId,
  });

  const records = (settledData?.records || []).sort((a: BidRecord, b: BidRecord) => {
    const aParts = (a.listingPartNo || '').split('-');
    const bParts = (b.listingPartNo || '').split('-');
    const aMain = parseInt(aParts[0]) || 0;
    const bMain = parseInt(bParts[0]) || 0;
    if (aMain !== bMain) return aMain - bMain;
    const aSub = parseInt(aParts[1]) || 0;
    const bSub = parseInt(bParts[1]) || 0;
    return aSub - bSub;
  });

  // 필터링
  const filteredRecords = useMemo(() => {
    return records.filter((record: BidRecord) => {
      if (hideFailed && record.isFailed) return false;
      if (dealerFilter && record.dealerName && !record.dealerName.includes(dealerFilter)) return false;
      return true;
    });
  }, [records, hideFailed, dealerFilter]);

  // 합계 계산
  const successRecords = filteredRecords.filter((r: BidRecord) => !r.isFailed);
  const failedCount = filteredRecords.filter((r: BidRecord) => r.isFailed).length;
  const totalWeight = successRecords.reduce((sum: number, r: BidRecord) => sum + r.weight, 0);
  const totalAmount = successRecords.reduce((sum: number, r: BidRecord) => sum + (r.bidAmount || 0), 0);
  const totalCommission = successRecords.reduce((sum: number, r: BidRecord) => sum + (r.commission || 0), 0);
  const totalDeliveryFee = successRecords.reduce((sum: number, r: BidRecord) => sum + (r.deliveryFee || 0), 0);

  const thClass = "px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-2 py-2 text-xs text-gray-600 text-center whitespace-nowrap border border-gray-200";

  // 날짜 포맷팅
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yy.MM.dd');
    } catch {
      return '-';
    }
  };

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    if (filteredRecords.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const excelData = filteredRecords.map((record: BidRecord) => ({
      '상태': record.isFailed ? '유찰' : '낙찰',
      '마감일자': formatDate(record.closedAt),
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
      '이력번호': record.traceNo,
      '거래처번호': '-',
      '거래처명': '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '부분육 경락 내역');

    const fileName = `${companyName}_부분육_경락내역_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경락 내역</h1>
        <p className="text-sm text-gray-500 mt-1">{companyName}</p>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">기간</span>
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
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
            >
              조회
            </button>
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
                className="w-4 h-4 appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700 relative
                  after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:font-bold after:opacity-0 checked:after:opacity-100"
              />
              <span className="text-sm font-medium text-gray-600">유찰분 숨김</span>
            </label>
          </div>

          {/* 초기화/엑셀 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayDateValue);
                setEndDate(todayDateValue);
                setSStartDate(todayDateValue);
                setSEndDate(todayDateValue);
                setDealerFilter('');
                setHideFailed(false);
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
          </div>
        </div>
      </div>

      {/* 합계 정보 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 건수</span>
            <span className="text-sm font-semibold text-gray-900">{filteredRecords.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">낙찰</span>
            <span className="text-sm font-semibold text-gray-900">{successRecords.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">유찰</span>
            <span className="text-sm font-semibold text-gray-900">{failedCount}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 중량</span>
            <span className="text-sm font-semibold text-gray-900">{totalWeight.toFixed(1)}kg</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 낙찰금액</span>
            <span className="text-sm font-semibold text-gray-900">{totalAmount.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 수수료</span>
            <span className="text-sm font-semibold text-gray-900">{totalCommission.toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 배송수수료</span>
            <span className="text-sm font-semibold text-gray-900">{totalDeliveryFee.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">데이터 조회 중...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-gray-500">해당 기간에 마감된 경락 내역이 없습니다.</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thClass}>상태</th>
                    <th className={thClass}>마감일자</th>
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
                    <th className={thClass}>이력번호</th>
                    <th className={thClass}>거래처번호</th>
                    <th className={thClass}>거래처명</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record: BidRecord) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className={tdClass}>
                        {record.isFailed ? (
                          <span className="text-gray-400">유찰</span>
                        ) : (
                          <span className="text-green-600 font-medium">낙찰</span>
                        )}
                      </td>
                      <td className={tdClass}>{formatDate(record.closedAt)}</td>
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
                      <td className={tdClass}>{record.traceNo || '-'}</td>
                      <td className={tdClass}>-</td>
                      <td className={tdClass}>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                총 {filteredRecords.length}건
              </div>
            </div>
          </>
        )}
      </div>
    </CompanyLayout>
  );
}
