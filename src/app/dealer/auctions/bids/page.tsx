'use client';

import React, { useState, useMemo } from 'react';
import DealerLayout from '@/components/dealer/DealerLayout';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const getTodayDateValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const todayDateValue = getTodayDateValue();

interface BidRecord {
  id: string;
  partId: string;
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
  companyNo: string;
  companyName: string;
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

interface AssignmentInfo {
  partnerNo: string;
  partnerName: string;
}

export default function DealerAuctionBidsPage() {
  const { data: session } = useSession();
  const dealerName = session?.dealer?.name || session?.employee?.name || '';
  const dealerId = session?.dealer?.id || '';

  const [startDate, setStartDate] = useState(todayDateValue);
  const [endDate, setEndDate] = useState(todayDateValue);
  const [sStartDate, setSStartDate] = useState(todayDateValue);
  const [sEndDate, setSEndDate] = useState(todayDateValue);

  const handleSearch = () => {
    setSStartDate(startDate);
    setSEndDate(endDate);
  };

  const { data: settledData, isLoading } = useQuery<SettledResponse>({
    queryKey: ['dealerSettledBids', dealerId, sStartDate, sEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dealerId) params.set('dealerId', dealerId);
      if (sStartDate) params.set('closedDateFrom', sStartDate);
      if (sEndDate) params.set('closedDateTo', sEndDate);

      const response = await fetch(`/api/bids/settled?${params.toString()}`);
      if (!response.ok) throw new Error('데이터 조회 실패');
      return response.json();
    },
    enabled: !!dealerId,
  });

  const { data: assignmentsData } = useQuery<{ assignments: Record<string, AssignmentInfo> }>({
    queryKey: ['dealer-bids-assignments', sStartDate, sEndDate],
    queryFn: async () => {
      const allAssignments: Record<string, AssignmentInfo> = {};
      const dates = new Set<string>();
      (settledData?.records || []).forEach(r => {
        if (r.listingDate) dates.add(r.listingDate);
      });

      for (const date of dates) {
        const res = await fetch(`/api/delivery/assignments?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          if (data.assignments) {
            Object.entries(data.assignments).forEach(([partId, info]: [string, any]) => {
              allAssignments[partId] = { partnerNo: info.partnerNo, partnerName: info.partnerName };
            });
          }
        }
      }
      return { assignments: allAssignments };
    },
    enabled: !!settledData && (settledData.records?.length || 0) > 0,
  });

  const assignmentsMap = assignmentsData?.assignments || {};

  const records = useMemo(() => {
    const raw = settledData?.records || [];
    return [...raw].sort((a, b) => {
      const aParts = (a.listingPartNo || '').split('-');
      const bParts = (b.listingPartNo || '').split('-');
      const aMain = parseInt(aParts[0]) || 0;
      const bMain = parseInt(bParts[0]) || 0;
      if (aMain !== bMain) return aMain - bMain;
      const aSub = parseInt(aParts[1]) || 0;
      const bSub = parseInt(bParts[1]) || 0;
      return aSub - bSub;
    });
  }, [settledData]);

  const successRecords = records.filter((r: BidRecord) => !r.isFailed);
  const totalWeight = successRecords.reduce((sum: number, r: BidRecord) => sum + r.weight, 0);

  const formatTraceNo = (traceNo: string | undefined | null): string => {
    if (!traceNo) return '-';
    const cleaned = traceNo.replace(/^002-/, '');
    return `002-${cleaned}`;
  };
  const totalAmount = successRecords.reduce((sum: number, r: BidRecord) => sum + (r.bidAmount || 0), 0);

  const thClass = "px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50";
  const tdClass = "px-2 py-2 text-xs text-gray-600 text-center whitespace-nowrap border border-gray-200";

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'yy.MM.dd');
    } catch {
      return '-';
    }
  };

  const handleExcelDownload = () => {
    if (records.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const excelData = records.map((record: BidRecord) => {
      const partner = assignmentsMap[record.partId];
      return {
        '상장일자': formatDate(record.listingDate),
        '상장번호': record.listingPartNo,
        '부위': record.partName,
        '등급': record.grade,
        '중량(kg)': record.weight,
        '낙찰단가': record.bidPrice || '-',
        '낙찰금액': record.bidAmount || '-',
        '축종': record.breed,
        '성별': record.gender,
        '상장업체명': record.companyName || '-',
        '이력번호': formatTraceNo(record.traceNo),
        '거래처코드': partner?.partnerNo || '-',
        '거래처명': partner?.partnerName || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '부분육 경락 내역');

    const fileName = `${dealerName}_부분육_경락내역_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <DealerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경락 내역</h1>
        <p className="text-sm text-gray-500 mt-1">{dealerName}</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayDateValue);
                setEndDate(todayDateValue);
                setSStartDate(todayDateValue);
                setSEndDate(todayDateValue);
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

      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 건수</span>
            <span className="text-sm font-semibold text-gray-900">{records.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 중량</span>
            <span className="text-sm font-semibold text-gray-900">{totalWeight.toFixed(1)}kg</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">총 낙찰금액</span>
            <span className="text-sm font-semibold text-gray-900">{totalAmount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">데이터 조회 중...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm text-gray-500">해당 기간에 마감된 경락 내역이 없습니다.</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thClass}>상장일자</th>
                    <th className={thClass}>상장번호</th>
                    <th className={thClass}>부위</th>
                    <th className={thClass}>등급</th>
                    <th className={thClass}>중량</th>
                    <th className={thClass}>낙찰단가</th>
                    <th className={thClass}>낙찰금액</th>
                    <th className={thClass}>축종</th>
                    <th className={thClass}>성별</th>
                    <th className={thClass}>상장업체명</th>
                    <th className={thClass}>이력번호</th>
                    <th className={thClass}>거래처코드</th>
                    <th className={thClass}>거래처명</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: BidRecord) => {
                    const partner = assignmentsMap[record.partId];
                    return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className={tdClass}>{formatDate(record.listingDate)}</td>
                      <td className={`${tdClass} font-medium text-gray-900`}>{record.listingPartNo}</td>
                      <td className={tdClass}>{record.partName}</td>
                      <td className={`${tdClass} font-medium`}>{record.grade}</td>
                      <td className={tdClass}>{record.weight.toFixed(1)}kg</td>
                      <td className={tdClass}>{record.bidPrice ? record.bidPrice.toLocaleString() : '-'}</td>
                      <td className={`${tdClass} font-medium text-gray-900`}>
                        {record.bidAmount ? record.bidAmount.toLocaleString() : '-'}
                      </td>
                      <td className={tdClass}>{record.breed}</td>
                      <td className={tdClass}>{record.gender}</td>
                      <td className={tdClass}>{record.companyName || '-'}</td>
                      <td className={tdClass}>{formatTraceNo(record.traceNo)}</td>
                      <td className={tdClass}>{partner?.partnerNo || '-'}</td>
                      <td className={tdClass}>{partner?.partnerName || '-'}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                총 {records.length}건
              </div>
            </div>
          </>
        )}
      </div>
    </DealerLayout>
  );
}
