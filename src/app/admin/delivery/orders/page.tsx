'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Printer, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface WinningPart {
  partId: string;
  partNo: number;
  partName: string;
  listingPartNo: string;
  weight: number;
  bidPrice: number;
  bidAmount: number;
  dealerId: string;
  dealerNo: string;
  dealerName: string;
  listingId: string;
  listingNo: string;
  listingDate: string;
  grade: string;
  traceNo: string;
  companyName: string;
}

interface AssignmentInfo {
  partnerId: string;
  partnerNo: string;
  partnerName: string;
  representative: string;
  phone: string;
  address: string;
}

interface DeliveryItem {
  partId: string;
  partnerNo: string;
  partnerName: string;
  partnerRepresentative: string;
  partnerPhone: string;
  partnerAddress: string;
  dealerNo: string;
  dealerName: string;
  listingPartNo: string;
  traceNo: string;
  partName: string;
  grade: string;
  weight: number;
  bidPrice: number;
  bidAmount: number;
}

export default function DeliveryOrdersPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [partnerSearch, setPartnerSearch] = useState('');

  const { data: partsData, isLoading: partsLoading } = useQuery<{ winningParts: WinningPart[] }>({
    queryKey: ['delivery-winning-parts', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/delivery/winning-parts?date=${selectedDate}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const { data: assignmentsData } = useQuery<{ assignments: Record<string, AssignmentInfo> }>({
    queryKey: ['delivery-assignments', selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/delivery/assignments?date=${selectedDate}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const winningParts = partsData?.winningParts || [];
  const assignments = assignmentsData?.assignments || {};

  const deliveryItems = useMemo(() => {
    const items: DeliveryItem[] = winningParts.map(part => {
      const assignment = assignments[part.partId];
      return {
        partId: part.partId,
        partnerNo: assignment?.partnerNo || '-',
        partnerName: assignment?.partnerName || '미지정',
        partnerRepresentative: assignment?.representative || '-',
        partnerPhone: assignment?.phone || '-',
        partnerAddress: assignment?.address || '-',
        dealerNo: part.dealerNo,
        dealerName: part.dealerName,
        listingPartNo: part.listingPartNo || '',
        traceNo: part.traceNo || '-',
        partName: part.partName,
        grade: part.grade,
        weight: part.weight,
        bidPrice: part.bidPrice,
        bidAmount: part.bidAmount,
      };
    });

    return items.sort((a, b) => {
      if (a.partnerName === '미지정') return 1;
      if (b.partnerName === '미지정') return -1;
      return a.partnerName.localeCompare(b.partnerName);
    });
  }, [winningParts, assignments]);

  const filteredItems = useMemo(() => {
    if (!partnerSearch) return deliveryItems;
    const search = partnerSearch.toLowerCase();
    return deliveryItems.filter(item =>
      item.partnerName.toLowerCase().includes(search) ||
      item.partnerNo.includes(search)
    );
  }, [deliveryItems, partnerSearch]);

  const partnerSubtotals = useMemo(() => {
    const subtotals = new Map<string, { count: number; weight: number; amount: number }>();
    filteredItems.forEach(item => {
      const key = item.partnerName;
      const existing = subtotals.get(key) || { count: 0, weight: 0, amount: 0 };
      subtotals.set(key, {
        count: existing.count + 1,
        weight: existing.weight + item.weight,
        amount: existing.amount + item.bidAmount,
      });
    });
    return subtotals;
  }, [filteredItems]);

  const handlePrint = () => {
    const grouped = new Map<string, DeliveryItem[]>();
    filteredItems.forEach(item => {
      if (item.partnerName === '미지정') return;
      const existing = grouped.get(item.partnerName) || [];
      grouped.set(item.partnerName, [...existing, item]);
    });

    if (grouped.size === 0) {
      alert('인쇄할 거래처가 없습니다.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>출고지시서</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Malgun Gothic', sans-serif; font-size: 11px; }
            .page { page-break-after: always; padding: 10px; }
            .page:last-child { page-break-after: avoid; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .header h1 { font-size: 20px; margin: 0 0 10px 0; }
            .info { margin-bottom: 15px; }
            .info-row { display: flex; margin-bottom: 5px; }
            .info-label { width: 80px; font-weight: bold; }
            .info-value { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          ${Array.from(grouped.entries()).map(([partnerName, items]) => {
            const partner = items[0];
            const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
            const totalAmount = items.reduce((sum, i) => sum + i.bidAmount, 0);
            return `
              <div class="page">
                <div class="header">
                  <h1>출 고 지 시 서</h1>
                  <p>발행일: ${selectedDate}</p>
                </div>
                
                <div class="info">
                  <div class="info-row">
                    <span class="info-label">거래처명:</span>
                    <span class="info-value">${partnerName}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">연락처:</span>
                    <span class="info-value">${partner.partnerPhone}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">주소:</span>
                    <span class="info-value">${partner.partnerAddress}</span>
                  </div>
                </div>
                
                <table>
                  <thead>
                    <tr>
                      <th style="width: 40px">No</th>
                      <th>중도매인</th>
                      <th>상장번호</th>
                      <th>부위</th>
                      <th>등급</th>
                      <th style="width: 70px">중량(kg)</th>
                      <th style="width: 80px">단가</th>
                      <th style="width: 100px">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map((item, idx) => `
                      <tr>
                        <td>${idx + 1}</td>
                        <td class="text-left">${item.dealerName}</td>
                        <td>${item.listingPartNo}</td>
                        <td>${item.partName}</td>
                        <td>${item.grade}</td>
                        <td class="text-right">${item.weight.toFixed(1)}</td>
                        <td class="text-right">${item.bidPrice.toLocaleString()}</td>
                        <td class="text-right">${item.bidAmount.toLocaleString()}</td>
                      </tr>
                    `).join('')}
                    <tr class="total-row">
                      <td colspan="5">합계 (${items.length}건)</td>
                      <td class="text-right">${totalWeight.toFixed(1)}</td>
                      <td></td>
                      <td class="text-right">${totalAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div class="footer">
                  <p>HanuMuch - 출고지시서</p>
                </div>
              </div>
            `;
          }).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExcelDownload = () => {
    const data = filteredItems.map(item => ({
      '거래처번호': item.partnerNo,
      '거래처명': item.partnerName,
      '연락처': item.partnerPhone,
      '주소': item.partnerAddress,
      '중도매인번호': item.dealerNo,
      '중도매인명': item.dealerName,
      '상장번호': item.listingPartNo,
      '이력번호': item.traceNo,
      '부위': item.partName,
      '등급': item.grade,
      '중량(kg)': item.weight,
      '단가': item.bidPrice,
      '금액': item.bidAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출고지시서');
    XLSX.writeFile(wb, `출고지시서_${selectedDate}.xlsx`);
  };

  const thClass = 'px-2 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50';
  const tdClass = 'px-2 py-1.5 text-xs border border-gray-200';

  const totals = useMemo(() => {
    return filteredItems.reduce((acc, item) => ({
      count: acc.count + 1,
      weight: acc.weight + item.weight,
      amount: acc.amount + item.bidAmount,
    }), { count: 0, weight: 0, amount: 0 });
  }, [filteredItems]);

  const renderTableRows = () => {
    const rows: React.ReactNode[] = [];
    let currentPartner = '';
    let partnerStartIdx = 0;

    filteredItems.forEach((item, idx) => {
      if (item.partnerName !== currentPartner) {
        if (currentPartner && partnerSubtotals.has(currentPartner)) {
          const subtotal = partnerSubtotals.get(currentPartner)!;
          rows.push(
            <tr key={`subtotal-${currentPartner}`} className="bg-gray-50 font-semibold">
              <td className={`${tdClass} text-right`} colSpan={10}>
                {currentPartner} 소계 ({subtotal.count}건)
              </td>
              <td className={`${tdClass} text-right`}>{subtotal.weight.toFixed(1)}</td>
              <td className={`${tdClass} text-right`}></td>
              <td className={`${tdClass} text-right`}>{subtotal.amount.toLocaleString()}</td>
            </tr>
          );
        }
        currentPartner = item.partnerName;
        partnerStartIdx = idx;
      }

      const isFirstOfPartner = idx === partnerStartIdx;
      const partnerItemCount = filteredItems.filter(i => i.partnerName === item.partnerName).length;

      rows.push(
        <tr key={`${item.partId}-${idx}`} className={`hover:bg-gray-50 ${item.partnerName === '미지정' ? 'text-gray-400' : ''}`}>
          {isFirstOfPartner ? (
            <>
              <td className={`${tdClass} text-center`} rowSpan={partnerItemCount}>{item.partnerNo}</td>
              <td className={`${tdClass} text-center ${item.partnerName === '미지정' ? 'text-red-400' : ''}`} rowSpan={partnerItemCount}>{item.partnerName}</td>
              <td className={`${tdClass} text-center text-gray-500`} rowSpan={partnerItemCount}>{item.partnerRepresentative}</td>
              <td className={`${tdClass} text-gray-500 truncate`} rowSpan={partnerItemCount}>{item.partnerAddress}</td>
            </>
          ) : null}
          <td className={`${tdClass} text-center`}>{item.dealerNo}</td>
          <td className={`${tdClass} text-center`}>{item.dealerName}</td>
          <td className={`${tdClass} text-center`}>{item.listingPartNo}</td>
          <td className={`${tdClass} text-center`}>{item.traceNo}</td>
          <td className={`${tdClass} text-center`}>{item.partName}</td>
          <td className={`${tdClass} text-center`}>{item.grade}</td>
          <td className={`${tdClass} text-right`}>{item.weight.toFixed(1)}</td>
          <td className={`${tdClass} text-right`}>{item.bidPrice.toLocaleString()}</td>
          <td className={`${tdClass} text-right`}>{item.bidAmount.toLocaleString()}</td>
        </tr>
      );
    });

    if (currentPartner && partnerSubtotals.has(currentPartner)) {
      const subtotal = partnerSubtotals.get(currentPartner)!;
      rows.push(
        <tr key={`subtotal-${currentPartner}-last`} className="bg-gray-50 font-semibold">
          <td className={`${tdClass} text-right`} colSpan={10}>
            {currentPartner} 소계 ({subtotal.count}건)
          </td>
          <td className={`${tdClass} text-right`}>{subtotal.weight.toFixed(1)}</td>
          <td className={`${tdClass} text-right`}></td>
          <td className={`${tdClass} text-right`}>{subtotal.amount.toLocaleString()}</td>
        </tr>
      );
    }

    return rows;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">출고지시서</h1>

        <div className="bg-white p-4 border border-gray-200 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">출고일자</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">거래처</label>
              <input
                type="text"
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                placeholder="거래처명/번호"
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white w-32"
              />
            </div>
            <div className="text-xs text-gray-600">
              총 {totals.count}건 / {totals.weight.toFixed(1)}kg / {totals.amount.toLocaleString()}원
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => { setPartnerSearch(''); setSelectedDate(todayStr); }}
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

        <div className="bg-white border border-gray-200">
          {partsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className={`${thClass} w-[55px]`}>거래처번호</th>
                  <th className={`${thClass} w-[70px]`}>거래처명</th>
                  <th className={`${thClass} w-[45px]`}>대표자</th>
                  <th className={`${thClass} w-[160px]`}>배송지</th>
                  <th className={`${thClass} w-[70px]`}>중도매인번호</th>
                  <th className={`${thClass} w-[60px]`}>중도매인명</th>
                  <th className={`${thClass} w-[105px]`}>상장번호</th>
                  <th className={`${thClass} w-[80px]`}>이력번호</th>
                  <th className={`${thClass} w-[55px]`}>부위</th>
                  <th className={`${thClass} w-[45px]`}>등급</th>
                  <th className={`${thClass} w-[50px]`}>중량</th>
                  <th className={`${thClass} w-[65px]`}>입찰단가</th>
                  <th className={`${thClass} w-[85px]`}>낙찰금액</th>
                </tr>
              </thead>
              <tbody>
                {renderTableRows()}

                {!partsLoading && filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-gray-400 text-sm">
                      조회된 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot>
                  <tr className="font-bold border-t-2 border-gray-400">
                    <td className={`${tdClass} text-right`} colSpan={10}>
                      전체 합계 ({totals.count}건)
                    </td>
                    <td className={`${tdClass} text-right`}>{totals.weight.toFixed(1)}</td>
                    <td className={`${tdClass} text-right`}></td>
                    <td className={`${tdClass} text-right`}>{totals.amount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
