'use client';

import React, { useState } from 'react';
import DealerLayout from '@/components/dealer/DealerLayout';
import { Download, Printer, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface BidPartDetail {
  id: string;
  listingNo: string;
  partName: string;
  companyName: string;
  companyNo: string;
  grade: string;
  weight: number;
  unitPrice: number;
  amount: number;
  closedAt: string;
}

interface DealerSettlement {
  id: string;
  dealerNo: string;
  dealerName: string;
  phone: string;
  bidParts: BidPartDetail[];
  totalWeight: number;
  totalAmount: number;
  netPayment: number;
}

interface DealerSettlementsResponse {
  settlements: DealerSettlement[];
  summary: {
    totalDealers: number;
    totalParts: number;
    totalWeight: number;
    totalAmount: number;
    totalNetPayment: number;
  };
}

export default function DealerSettlementsPage() {
  const { data: session } = useSession();
  const dealerName = session?.dealer?.name || session?.employee?.name || '';
  const dealerId = session?.dealer?.id || '';

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [sStartDate, setSStartDate] = useState(todayStr);
  const [sEndDate, setSEndDate] = useState(todayStr);

  const handleSearch = () => {
    setSStartDate(startDate);
    setSEndDate(endDate);
  };

  const { data, isLoading } = useQuery<DealerSettlementsResponse>({
    queryKey: ['dealer-settlements', dealerId, sStartDate, sEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sStartDate) params.append('startDate', sStartDate);
      if (sEndDate) params.append('endDate', sEndDate);
      if (dealerId) params.append('dealerId', dealerId);
      const res = await fetch(`/api/settlements/dealers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!dealerId,
  });

  const settlement = data?.settlements?.[0] || null;
  const bidParts = settlement?.bidParts || [];

  const handleExcelDownload = () => {
    if (bidParts.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const excelData: Record<string, string | number>[] = [];

    bidParts.forEach(part => {
      excelData.push({
        '상장번호': part.listingNo,
        '부위': part.partName,
        '상장업체': part.companyName,
        '등급': part.grade,
        '중량': part.weight,
        '낙찰단가': part.unitPrice,
        '낙찰금액': part.amount,
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '낙찰서');

    const fileName = `${dealerName}_낙찰서_${sStartDate}_${sEndDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handlePrint = () => {
    if (!settlement || bidParts.length === 0) {
      alert('인쇄할 데이터가 없습니다.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>낙찰서</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', sans-serif; padding: 8px 15px; font-size: 9px; }
          h1 { text-align: center; margin-bottom: 8px; font-size: 14px; }
          .main-header { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #333; font-size: 9px; }
          .summary { text-align: right; }
          .summary p { margin: 1px 0; }
          .dealer-section { margin-bottom: 15px; }
          .dealer-header { background: #f0f0f0; padding: 4px 8px; margin-bottom: 5px; font-weight: bold; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
          th, td { border: 1px solid #ccc; padding: 2px 4px; text-align: center; font-size: 8px; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .subtotal-row { border-top: 2px solid #333; font-weight: 600; }
          @media print {
            @page { size: A4; margin: 5mm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>낙 찰 서</h1>
        <div class="main-header">
          <div>
            <p>기간: ${sStartDate} ~ ${sEndDate}</p>
            <p>중도매인: ${settlement.dealerName} (${settlement.dealerNo})</p>
          </div>
          <div class="summary">
            <p>총 ${bidParts.length}건</p>
            <p class="font-bold">낙찰금액: ${settlement.totalAmount.toLocaleString()}원</p>
          </div>
        </div>

        <div class="dealer-section">
          <div class="dealer-header">${settlement.dealerName} (${settlement.dealerNo}) - 낙찰금액: ${settlement.totalAmount.toLocaleString()}원</div>
          <table>
            <thead>
              <tr>
                <th>상장번호</th>
                <th>부위</th>
                <th>상장업체</th>
                <th>등급</th>
                <th>중량</th>
                <th>낙찰단가</th>
                <th>낙찰금액</th>
              </tr>
            </thead>
            <tbody>
              ${bidParts.map(part => `
                <tr>
                  <td>${part.listingNo}</td>
                  <td>${part.partName}</td>
                  <td>${part.companyName}</td>
                  <td>${part.grade}</td>
                  <td class="text-right">${part.weight.toFixed(1)}</td>
                  <td class="text-right">${part.unitPrice.toLocaleString()}</td>
                  <td class="text-right">${part.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="subtotal-row">
                <td colspan="4">합계 (${bidParts.length}건)</td>
                <td class="text-right">${settlement.totalWeight.toFixed(1)}</td>
                <td></td>
                <td class="text-right">${settlement.totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <script>
            window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const thClass = "px-2 py-1.5 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <DealerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">낙찰서</h1>
      </div>

      {/* 필터 */}
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
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
          >
            조회
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setStartDate(todayStr);
                setEndDate(todayStr);
                setSStartDate(todayStr);
                setSEndDate(todayStr);
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
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
            >
              <Printer className="w-3.5 h-3.5" />
              인쇄
            </button>
          </div>
        </div>
      </div>

      {/* 낙찰서 테이블 */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0">
            <tr>
              <th className={`${thClass} w-[120px]`}>상장번호</th>
              <th className={`${thClass} w-[80px]`}>부위</th>
              <th className={`${thClass} w-[90px]`}>상장업체</th>
              <th className={`${thClass} w-[60px]`}>등급</th>
              <th className={`${thClass} w-[60px]`}>중량</th>
              <th className={`${thClass} w-[80px]`}>낙찰단가</th>
              <th className={`${thClass} w-[90px]`}>낙찰금액</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : bidParts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  낙찰 내역이 없습니다.
                </td>
              </tr>
            ) : (
              <>
                {bidParts.map((part, partIdx) => (
                  <tr key={`${part.id}-${partIdx}`} className="hover:bg-gray-50">
                    <td className={`${tdClass} text-[10px] text-gray-600`}>{part.listingNo}</td>
                    <td className={tdClass}>{part.partName}</td>
                    <td className={tdClass}>{part.companyName}</td>
                    <td className={tdClass}>{part.grade}</td>
                    <td className={`${tdClass} text-right`}>{part.weight.toFixed(1)}</td>
                    <td className={`${tdClass} text-right`}>{part.unitPrice.toLocaleString()}</td>
                    <td className={`${tdClass} text-right`}>{part.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {/* 합계 */}
                <tr className="font-bold border-t-2 border-gray-400">
                  <td className={`${tdClass} text-left`} colSpan={4}>
                    합계 ({bidParts.length}건)
                  </td>
                  <td className={`${tdClass} text-right`}>
                    {settlement!.totalWeight.toFixed(1)}
                  </td>
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-right`}>
                    {settlement!.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </DealerLayout>
  );
}
