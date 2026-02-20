'use client';

import React, { useState, useMemo } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { Printer, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';

// 출고 항목 타입
interface DeliveryItem {
  partnerNo: string;
  partnerName: string;
  partnerPhone: string;
  partnerAddress: string;
  dealerNo: string;
  dealerName: string;
  listingNo: string;
  traceNo: string;
  partName: string;
  grade: string;
  weight: number;
  unitPrice: number;
  amount: number;
}

// 20개 부위
const PARTS = [
  '등심(좌)', '등심(우)', '안심', '채끝', '치마', '부채', '업진', '토시·제비',
  '앞다리', '우둔', '목심', '양지(좌)', '양지(우)', '설도(좌)', '설도(우)',
  '사태', '꼬리', '족', '사골', '잡뼈'
];

// 부위별 가격
const PART_PRICES: Record<string, number> = {
  '등심(좌)': 85000, '등심(우)': 85000, '안심': 95000, '채끝': 82000,
  '치마': 65000, '부채': 60000, '업진': 55000, '토시·제비': 70000, '앞다리': 55000,
  '우둔': 58000, '목심': 62000, '양지(좌)': 52000, '양지(우)': 52000,
  '설도(좌)': 56000, '설도(우)': 56000, '사태': 48000, '꼬리': 35000,
  '족': 25000, '사골': 20000, '잡뼈': 15000
};

// 부위별 중량
const PART_WEIGHTS: Record<string, number> = {
  '등심(좌)': 15.5, '등심(우)': 15.5, '안심': 4.5, '채끝': 8.0,
  '치마': 4.0, '부채': 3.0, '업진': 4.5, '토시·제비': 2.0, '앞다리': 25.0,
  '우둔': 21.0, '목심': 14.5, '양지(좌)': 12.5, '양지(우)': 12.5,
  '설도(좌)': 16.5, '설도(우)': 16.5, '사태': 15.0, '꼬리': 16.0,
  '족': 10.5, '사골': 3.5, '잡뼈': 22.0
};

// 중도매인
const DEALERS = [
  { no: '7000001', name: '김철수' },
  { no: '7000002', name: '이영희' },
  { no: '7000003', name: '박민수' },
  { no: '7000004', name: '최지현' },
];

// 거래처
const PARTNERS = [
  { no: '10001', name: '맛있는정육점', phone: '010-1234-5678', address: '서울시 강남구 역삼동 123-45' },
  { no: '10002', name: '소고기천국', phone: '010-2345-6789', address: '서울시 서초구 서초동 234-56' },
  { no: '10003', name: '신선마트', phone: '010-3456-7890', address: '경기도 성남시 분당구 정자동 345-67' },
  { no: '10004', name: '한우명가', phone: '010-4567-8901', address: '인천시 연수구 송도동 456-78' },
];

// 더미 데이터 생성
const generateDeliveryItems = (companyName: string): DeliveryItem[] => {
  const today = new Date();
  const dateCode = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  const companyPrefixMap: Record<string, string> = {
    '건화': '101',
    '대진엠에스': '201',
    '안심엘피씨': '301',
    '정직한고기': '401',
  };
  
  const baseNo = companyPrefixMap[companyName] || '101';
  const items: DeliveryItem[] = [];
  const failedParts = [6, 16];
  
  for (let cattleIdx = 0; cattleIdx < 2; cattleIdx++) {
    const cattleNo = parseInt(baseNo) + cattleIdx;
    const grade = cattleIdx === 0 ? '1++A(9)' : '1+A';
    const gradeMultiplier = grade.includes('1++') ? 1.0 : 0.85;
    
    PARTS.forEach((partName, partIdx) => {
      if (failedParts.includes(partIdx)) return; // 유찰분 제외
      
      const dealerIdx = (cattleIdx + partIdx) % DEALERS.length;
      const dealer = DEALERS[dealerIdx];
      const partnerIdx = (cattleIdx + partIdx) % PARTNERS.length;
      const partner = PARTNERS[partnerIdx];
      
      const weight = PART_WEIGHTS[partName];
      const unitPrice = Math.round(PART_PRICES[partName] * gradeMultiplier);
      
      items.push({
        partnerNo: partner.no,
        partnerName: partner.name,
        partnerPhone: partner.phone,
        partnerAddress: partner.address,
        dealerNo: dealer.no,
        dealerName: dealer.name,
        listingNo: `${dateCode}-${cattleNo}-${String(partIdx + 1).padStart(2, '0')}`,
        traceNo: `1486-729${cattleIdx}-${partIdx + 1}`,
        partName,
        grade,
        weight,
        unitPrice,
        amount: Math.round(weight * unitPrice),
      });
    });
  }
  
  // 거래처별 정렬
  return items.sort((a, b) => a.partnerName.localeCompare(b.partnerName));
};

export default function CompanyDeliveryPage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [partnerSearch, setPartnerSearch] = useState('');
  
  const deliveryItems = useMemo(() => generateDeliveryItems(companyName), [companyName]);
  
  // 필터링
  const filteredItems = useMemo(() => {
    if (!partnerSearch) return deliveryItems;
    const search = partnerSearch.toLowerCase();
    return deliveryItems.filter(item => 
      item.partnerName.toLowerCase().includes(search) ||
      item.partnerNo.includes(search)
    );
  }, [deliveryItems, partnerSearch]);
  
  // 거래처별 소계
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
  
  // 전체 합계
  const totals = useMemo(() => {
    return filteredItems.reduce((acc, item) => ({
      count: acc.count + 1,
      weight: acc.weight + item.weight,
      amount: acc.amount + item.amount,
    }), { count: 0, weight: 0, amount: 0 });
  }, [filteredItems]);
  
  // 인쇄
  const handlePrint = () => {
    const grouped = new Map<string, DeliveryItem[]>();
    filteredItems.forEach(item => {
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
          <title>출고지시서 - ${companyName}</title>
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
                  <p>발행일: ${selectedDate} | ${companyName}</p>
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
    XLSX.writeFile(wb, `${companyName}_출고지시서_${selectedDate}.xlsx`);
  };
  
  const thClass = 'px-2 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50';
  const tdClass = 'px-2 py-1.5 text-xs border border-gray-200';
  
  // 테이블 행 렌더링
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
              <td className={`${tdClass} text-right`} colSpan={8}>
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
        <tr key={`${item.listingNo}-${idx}`} className="hover:bg-gray-50">
          {isFirstOfPartner ? (
            <>
              <td className={`${tdClass} text-center`} rowSpan={partnerItemCount}>{item.partnerNo}</td>
              <td className={`${tdClass} text-center`} rowSpan={partnerItemCount}>{item.partnerName}</td>
              <td className={`${tdClass} text-center text-gray-500`} rowSpan={partnerItemCount}>{item.partnerPhone}</td>
              <td className={`${tdClass} text-gray-500 truncate`} rowSpan={partnerItemCount}>{item.partnerAddress}</td>
            </>
          ) : null}
          <td className={`${tdClass} text-center`}>{item.dealerNo}</td>
          <td className={`${tdClass} text-center`}>{item.dealerName}</td>
          <td className={`${tdClass} text-center`}>{item.listingNo}</td>
          <td className={`${tdClass} text-center`}>{item.partName}</td>
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
          <td className={`${tdClass} text-right`} colSpan={8}>
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
    <CompanyLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">출고지시서</h1>
          <p className="text-sm text-gray-500 mt-1">{companyName}</p>
        </div>
        
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
                <th className={`${thClass} w-[100px]`}>연락처</th>
                <th className={`${thClass} w-[180px]`}>배송지</th>
                <th className={`${thClass} w-[70px]`}>중도매인번호</th>
                <th className={`${thClass} w-[60px]`}>중도매인명</th>
                <th className={`${thClass} w-[105px]`}>상장번호</th>
                <th className={`${thClass} w-[55px]`}>부위</th>
                <th className={`${thClass} w-[50px]`}>중량</th>
                <th className={`${thClass} w-[65px]`}>입찰단가</th>
                <th className={`${thClass} w-[85px]`}>낙찰금액</th>
              </tr>
            </thead>
            <tbody>
              {renderTableRows()}
              
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400 text-sm">
                    조회된 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            {/* 전체 합계 */}
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="font-bold border-t-2 border-gray-400">
                  <td className={`${tdClass} text-right`} colSpan={8}>
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
    </CompanyLayout>
  );
}
