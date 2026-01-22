'use client';

import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Printer, Download, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateDealerSettlements, DealerSettlementData } from '@/constants/dealerSettlement';
import { 
  DELIVERY_PARTNERS, 
  loadAssignments, 
  PartnerAssignments,
} from '@/constants/delivery';

// 출고 항목 타입
interface DeliveryItem {
  partnerNo: string;
  partnerName: string;
  partnerRepresentative: string;
  partnerPhone: string;
  partnerAddress: string;
  dealerNo: string;
  dealerName: string;
  listingNo: string;
  traceNo: string; // 이력번호
  partName: string;
  grade: string;
  weight: number;
  unitPrice: number;
  amount: number;
}

export default function DeliveryOrdersPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [settlements] = useState<DealerSettlementData[]>(generateDealerSettlements());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [assignments, setAssignments] = useState<PartnerAssignments>({});
  
  // 초기 데이터 로드
  useEffect(() => {
    setAssignments(loadAssignments());
    
    const handleFocus = () => {
      setAssignments(loadAssignments());
    };
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  
  // 거래처 찾기
  const findPartner = (partnerNo: string) => {
    return DELIVERY_PARTNERS.find(p => p.partnerNo === partnerNo);
  };
  
  // 이력번호 생성 (상장번호 기반 더미)
  const generateTraceNo = (listingNo: string): string => {
    // 상장번호에서 개체번호 추출 (예: 260121-101-01 → 101)
    const parts = listingNo.split('-');
    if (parts.length >= 2) {
      const cattleNo = parseInt(parts[1]);
      // 더미 이력번호 생성 (실제로는 DB에서 가져와야 함)
      const base = 1000 + cattleNo;
      return `${base}-${7000 + cattleNo}-${cattleNo % 10}`;
    }
    return '-';
  };
  
  // 출고 데이터 생성
  const deliveryItems = useMemo(() => {
    const items: DeliveryItem[] = [];
    
    settlements.forEach((settlement) => {
      settlement.bidParts.forEach((part) => {
        const partnerNo = assignments[part.listingNo];
        const partner = partnerNo ? findPartner(partnerNo) : null;
        
        items.push({
          partnerNo: partner?.partnerNo || '-',
          partnerName: partner?.name || '미지정',
          partnerRepresentative: partner?.representative || '-',
          partnerPhone: partner?.phone || '-',
          partnerAddress: partner?.address || '-',
          dealerNo: settlement.dealerNo,
          dealerName: settlement.dealerName,
          listingNo: part.listingNo,
          traceNo: generateTraceNo(part.listingNo),
          partName: part.partName,
          grade: part.grade,
          weight: part.weight,
          unitPrice: part.unitPrice,
          amount: part.amount,
        });
      });
    });
    
    // 거래처별로 정렬
    return items.sort((a, b) => {
      if (a.partnerName === '미지정') return 1;
      if (b.partnerName === '미지정') return -1;
      return a.partnerName.localeCompare(b.partnerName);
    });
  }, [settlements, assignments]);
  
  // 필터링된 데이터
  const filteredItems = useMemo(() => {
    if (!partnerSearch) return deliveryItems;
    const search = partnerSearch.toLowerCase();
    return deliveryItems.filter(item => 
      item.partnerName.toLowerCase().includes(search) ||
      item.partnerNo.includes(search)
    );
  }, [deliveryItems, partnerSearch]);
  
  // 거래처별 소계 계산
  const partnerSubtotals = useMemo(() => {
    const subtotals = new Map<string, { count: number; weight: number; amount: number }>();
    
    filteredItems.forEach(item => {
      const key = item.partnerName;
      const existing = subtotals.get(key) || { count: 0, weight: 0, amount: 0 };
      subtotals.set(key, {
        count: existing.count + 1,
        weight: existing.weight + item.weight,
        amount: existing.amount + item.amount,
      });
    });
    
    return subtotals;
  }, [filteredItems]);
  
  // 출고지시서 인쇄
  const handlePrint = () => {
    // 거래처별로 그룹핑
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
            const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
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
                        <td>${item.listingNo}</td>
                        <td>${item.partName}</td>
                        <td>${item.grade}</td>
                        <td class="text-right">${item.weight.toFixed(1)}</td>
                        <td class="text-right">${item.unitPrice.toLocaleString()}</td>
                        <td class="text-right">${item.amount.toLocaleString()}</td>
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
  
  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const data = filteredItems.map(item => ({
      '거래처번호': item.partnerNo,
      '거래처명': item.partnerName,
      '연락처': item.partnerPhone,
      '주소': item.partnerAddress,
      '중도매인번호': item.dealerNo,
      '중도매인명': item.dealerName,
      '상장번호': item.listingNo,
      '부위': item.partName,
      '등급': item.grade,
      '중량(kg)': item.weight,
      '단가': item.unitPrice,
      '금액': item.amount,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '출고지시서');
    XLSX.writeFile(wb, `출고지시서_${selectedDate}.xlsx`);
  };
  
  // 테이블 스타일
  const thClass = 'px-2 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50';
  const tdClass = 'px-2 py-1.5 text-xs border border-gray-200';
  
  // 전체 합계
  const totals = useMemo(() => {
    return filteredItems.reduce((acc, item) => ({
      count: acc.count + 1,
      weight: acc.weight + item.weight,
      amount: acc.amount + item.amount,
    }), { count: 0, weight: 0, amount: 0 });
  }, [filteredItems]);
  
  // 거래처별로 그룹핑하여 렌더링
  const renderTableRows = () => {
    const rows: React.ReactNode[] = [];
    let currentPartner = '';
    let partnerStartIdx = 0;
    
    filteredItems.forEach((item, idx) => {
      // 새로운 거래처 시작
      if (item.partnerName !== currentPartner) {
        // 이전 거래처 소계
        if (currentPartner && partnerSubtotals.has(currentPartner)) {
          const subtotal = partnerSubtotals.get(currentPartner)!;
          rows.push(
            <tr key={`subtotal-${currentPartner}`} className="bg-gray-50 font-semibold">
              <td className={`${tdClass} text-right`} colSpan={9}>
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
      
      // 데이터 행
      const isFirstOfPartner = idx === partnerStartIdx;
      const partnerItemCount = filteredItems.filter(i => i.partnerName === item.partnerName).length;
      
      rows.push(
        <tr key={`${item.listingNo}-${idx}`} className={`hover:bg-gray-50 ${item.partnerName === '미지정' ? 'text-gray-400' : ''}`}>
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
          <td className={`${tdClass} text-center`}>{item.listingNo}</td>
          <td className={`${tdClass} text-center`}>{item.partName}</td>
          <td className={`${tdClass} text-center`}>{item.grade}</td>
          <td className={`${tdClass} text-right`}>{item.weight.toFixed(1)}</td>
          <td className={`${tdClass} text-right`}>{item.unitPrice.toLocaleString()}</td>
          <td className={`${tdClass} text-right`}>{item.amount.toLocaleString()}</td>
        </tr>
      );
    });
    
    // 마지막 거래처 소계
    if (currentPartner && partnerSubtotals.has(currentPartner)) {
      const subtotal = partnerSubtotals.get(currentPartner)!;
      rows.push(
        <tr key={`subtotal-${currentPartner}-last`} className="bg-gray-50 font-semibold">
          <td className={`${tdClass} text-right`} colSpan={9}>
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
        
        {/* 필터 */}
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
                onClick={() => {
                  setPartnerSearch('');
                  setSelectedDate(todayStr);
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
        
        {/* 테이블 */}
        <div className="bg-white border border-gray-200">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className={`${thClass} w-[55px]`}>거래처번호</th>
                <th className={`${thClass} w-[70px]`}>거래처명</th>
                <th className={`${thClass} w-[45px]`}>대표자</th>
                <th className={`${thClass} w-[180px]`}>배송지</th>
                <th className={`${thClass} w-[70px]`}>중도매인번호</th>
                <th className={`${thClass} w-[60px]`}>중도매인명</th>
                <th className={`${thClass} w-[105px]`}>상장번호</th>
                <th className={`${thClass} w-[55px]`}>부위</th>
                <th className={`${thClass} w-[45px]`}>등급</th>
                <th className={`${thClass} w-[50px]`}>중량</th>
                <th className={`${thClass} w-[65px]`}>입찰단가</th>
                <th className={`${thClass} w-[85px]`}>낙찰금액</th>
              </tr>
            </thead>
            <tbody>
              {renderTableRows()}
              
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-400 text-sm">
                    조회된 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            {/* 전체 합계 */}
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="font-bold border-t-2 border-gray-400">
                  <td className={`${tdClass} text-right`} colSpan={9}>
                    전체 합계 ({totals.count}건)
                  </td>
                  <td className={`${tdClass} text-right`}>{totals.weight.toFixed(1)}</td>
                  <td className={`${tdClass} text-right`}></td>
                  <td className={`${tdClass} text-right`}>{totals.amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
