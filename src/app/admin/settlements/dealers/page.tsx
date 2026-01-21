'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Download,
  Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// 낙찰 부위 데이터 타입
interface BidPartDetail {
  listingNo: string;      // 상장번호
  partName: string;       // 부위명
  companyName: string;    // 상장업체명
  grade: string;          // 등급
  weight: number;         // 중량
  unitPrice: number;      // 낙찰단가
  amount: number;         // 낙찰금액
}

// 중도매인별 정산 데이터 타입
interface DealerSettlement {
  id: string;
  dealerNo: string;       // 중도매인번호
  dealerName: string;     // 중도매인명
  phone: string;          // 연락처
  bidParts: BidPartDetail[];  // 낙찰받은 부위 목록
  totalWeight: number;    // 총 중량
  totalAmount: number;    // 총 낙찰금액
  commission: number;     // 수수료 (2%)
  netPayment: number;     // 차인지급액
}

// 19개 부위
const PART_NAMES = [
  '등심(좌)', '등심(우)', '안심', '채끝', '갈비(좌)', '갈비(우)',
  '특수부위', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
  '설도(좌)', '설도(우)', '사태', '꼬리', '족', '사골', '잡뼈'
];

// 부위별 기본 단가
const PART_PRICES: Record<string, number> = {
  '등심(좌)': 85000, '등심(우)': 85000, '안심': 95000, '채끝': 82000,
  '갈비(좌)': 78000, '갈비(우)': 78000, '특수부위': 72000, '앞다리': 55000,
  '우둔': 58000, '목심': 62000, '양지(좌)': 52000, '양지(우)': 52000,
  '설도(좌)': 56000, '설도(우)': 56000, '사태': 48000, '꼬리': 35000,
  '족': 25000, '사골': 20000, '잡뼈': 15000
};

// 부위별 기본 중량
const PART_WEIGHTS: Record<string, number> = {
  '등심(좌)': 15.5, '등심(우)': 15.5, '안심': 4.5, '채끝': 8.0,
  '갈비(좌)': 12.5, '갈비(우)': 12.5, '특수부위': 3.5, '앞다리': 25.0,
  '우둔': 21.0, '목심': 14.5, '양지(좌)': 12.5, '양지(우)': 12.5,
  '설도(좌)': 16.5, '설도(우)': 16.5, '사태': 15.0, '꼬리': 16.0,
  '족': 10.5, '사골': 3.5, '잡뼈': 22.0
};

// 더미 데이터 생성
const generateDummyData = (): DealerSettlement[] => {
  const dealers = [
    { no: '7000001', name: '김철수', phone: '010-1234-5678' },
    { no: '7000002', name: '이영희', phone: '010-2345-6789' },
    { no: '7000003', name: '박민수', phone: '010-3456-7890' },
    { no: '7000004', name: '최지현', phone: '010-4567-8901' },
    { no: '7000005', name: '정대호', phone: '010-5678-9012' },
  ];

  const companies = ['건화', '대진엠에스', '안심엘피씨', '정직한고기'];
  const grades = ['1++A', '1++B', '1+A', '1+B', '1A', '1B'];

  const today = new Date();
  const dateCode = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  return dealers.map((dealer, dealerIdx) => {
    const bidParts: BidPartDetail[] = [];
    
    // 각 중도매인당 15~25개 부위 낙찰
    const partCount = 15 + (dealerIdx * 3) % 11;
    
    for (let i = 0; i < partCount; i++) {
      const partIdx = (dealerIdx * 7 + i * 3) % 19;
      const partName = PART_NAMES[partIdx];
      const companyIdx = (dealerIdx + i) % 4;
      const gradeIdx = (dealerIdx * 2 + i) % 6;
      const cattleNo = 100 * (companyIdx + 1) + Math.floor(i / 19) + 1;
      const partNo = (i % 19) + 1;
      
      const baseWeight = PART_WEIGHTS[partName];
      const weightVariation = ((dealerIdx * 5 + i * 2) % 20 - 10) / 10;
      const weight = Number((baseWeight + weightVariation).toFixed(1));
      
      const basePrice = PART_PRICES[partName];
      const gradeMultiplier = grades[gradeIdx].startsWith('1++') ? 1.0 : grades[gradeIdx].startsWith('1+') ? 0.9 : 0.8;
      const unitPrice = Math.round(basePrice * gradeMultiplier);
      const amount = Math.round(weight * unitPrice);

      bidParts.push({
        listingNo: `${dateCode}-${cattleNo}-${String(partNo).padStart(2, '0')}`,
        partName,
        companyName: companies[companyIdx],
        grade: grades[gradeIdx],
        weight,
        unitPrice,
        amount,
      });
    }

    // 상장번호 중간 숫자(개체번호) 기준으로 정렬 (101 -> 102 -> 201 -> 202 순)
    const sortedBidParts = [...bidParts].sort((a, b) => {
      const aCattleNo = parseInt(a.listingNo.split('-')[1]);
      const bCattleNo = parseInt(b.listingNo.split('-')[1]);
      if (aCattleNo !== bCattleNo) {
        return aCattleNo - bCattleNo;
      }
      // 같은 개체번호면 부위번호로 정렬
      const aPartNo = parseInt(a.listingNo.split('-')[2]);
      const bPartNo = parseInt(b.listingNo.split('-')[2]);
      return aPartNo - bPartNo;
    });

    const totalWeight = Number(sortedBidParts.reduce((sum, p) => sum + p.weight, 0).toFixed(1));
    const totalAmount = sortedBidParts.reduce((sum, p) => sum + p.amount, 0);
    const commission = 0; // 중도매인 수수료 없음
    const netPayment = totalAmount; // 수수료 공제 없이 전액

    return {
      id: dealer.no,
      dealerNo: dealer.no,
      dealerName: dealer.name,
      phone: dealer.phone,
      bidParts: sortedBidParts,
      totalWeight,
      totalAmount,
      commission,
      netPayment,
    };
  });
};

export default function DealerSettlementsPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [settlements] = useState<DealerSettlement[]>(generateDummyData());
  const [dealerFilter, setDealerFilter] = useState('all');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const filteredSettlements = settlements.filter(s => 
    dealerFilter === 'all' || s.id === dealerFilter
  );

  const handleExcelDownload = () => {
    const excelData: Record<string, string | number>[] = [];
    
    filteredSettlements.forEach(settlement => {
      settlement.bidParts.forEach(part => {
        excelData.push({
          '중도매인번호': settlement.dealerNo,
          '중도매인명': settlement.dealerName,
          '연락처': settlement.phone,
          '상장번호': part.listingNo,
          '부위': part.partName,
          '상장업체': part.companyName,
          '등급': part.grade,
          '중량': part.weight,
          '낙찰단가': part.unitPrice,
          '낙찰금액': part.amount,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '낙찰서(중도매인별)');
    
    const fileName = `낙찰서_중도매인별_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 인쇄 기능
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalAmount = filteredSettlements.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalParts = filteredSettlements.reduce((sum, s) => sum + s.bidParts.length, 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>낙찰서(중도매인별)</title>
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
            .dealer-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>낙 찰 서 (중도매인별)</h1>
        <div class="main-header">
          <div>
            <p>정산일: ${new Date().toLocaleDateString('ko-KR')}</p>
            <p>중도매인: ${filteredSettlements.map(s => `${s.dealerName}(${s.dealerNo})`).join(', ')}</p>
          </div>
          <div class="summary">
            <p>총 ${totalParts}건</p>
            <p class="font-bold">낙찰금액: ${totalAmount.toLocaleString()}원</p>
          </div>
        </div>
        
        ${filteredSettlements.map(settlement => `
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
                ${settlement.bidParts.map(part => `
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
                  <td colspan="4">${settlement.dealerName} 소계 (${settlement.bidParts.length}건)</td>
                  <td class="text-right">${settlement.totalWeight.toFixed(1)}</td>
                  <td></td>
                  <td class="text-right">${settlement.totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `).join('')}
        
        <script>
          window.onload = function() { window.print(); }
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
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">낙찰서(중도매인별)</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">중도매인</span>
            <select
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[120px]"
            >
              <option value="all">전체</option>
              {settlements.map(s => (
                <option key={s.id} value={s.id}>{s.dealerName}</option>
              ))}
            </select>
          </div>

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

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setDealerFilter('all');
                setStartDate(todayStr);
                setEndDate(todayStr);
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
              <th className={`${thClass} w-[70px]`}>중도매인번호</th>
              <th className={`${thClass} w-[70px]`}>중도매인명</th>
              <th className={`${thClass} w-[120px]`}>상장번호</th>
              <th className={`${thClass} w-[80px]`}>부위</th>
              <th className={`${thClass} w-[90px]`}>상장업체</th>
              <th className={`${thClass} w-[60px]`}>등급</th>
              <th className={`${thClass} w-[60px]`}>중량</th>
              <th className={`${thClass} w-[80px]`}>낙찰단가</th>
              <th className={`${thClass} w-[90px]`}>낙찰금액</th>
              <th className={`${thClass} w-[80px]`}>수수료</th>
              <th className={`${thClass} w-[100px]`}>지급액</th>
            </tr>
          </thead>
          <tbody>
            {filteredSettlements.map((settlement, sIdx) => (
              <React.Fragment key={settlement.id}>
                {/* 부위별 행 */}
                {settlement.bidParts.map((part, partIdx) => (
                  <tr key={`${settlement.id}-${partIdx}`} className="hover:bg-gray-50">
                    <td className={tdClass}>{partIdx === 0 ? settlement.dealerNo : ''}</td>
                    <td className={tdClass}>{partIdx === 0 ? settlement.dealerName : ''}</td>
                    <td className={`${tdClass} text-[10px] text-gray-600`}>{part.listingNo}</td>
                    <td className={tdClass}>{part.partName}</td>
                    <td className={tdClass}>{part.companyName}</td>
                    <td className={tdClass}>{part.grade}</td>
                    <td className={`${tdClass} text-right`}>{part.weight.toFixed(1)}</td>
                    <td className={`${tdClass} text-right`}>{part.unitPrice.toLocaleString()}</td>
                    <td className={`${tdClass} text-right`}>{part.amount.toLocaleString()}</td>
                    <td className={`${tdClass} text-gray-400`}>{partIdx === 0 ? '-' : ''}</td>
                    <td className={`${tdClass} text-right font-semibold`}>
                      {partIdx === 0 ? settlement.netPayment.toLocaleString() : ''}
                    </td>
                  </tr>
                ))}
                {/* 중도매인별 소계 */}
                <tr className="font-semibold border-t-2 border-gray-300">
                  <td className={`${tdClass} text-left`} colSpan={3}>{settlement.dealerName} 소계 ({settlement.bidParts.length}건)</td>
                  <td className={tdClass} colSpan={3}></td>
                  <td className={`${tdClass} text-right`}>{settlement.totalWeight.toFixed(1)}</td>
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-right`}>{settlement.totalAmount.toLocaleString()}</td>
                  <td className={`${tdClass} text-gray-400`}>-</td>
                  <td className={`${tdClass} text-right`}>{settlement.netPayment.toLocaleString()}</td>
                </tr>
                {/* 중도매인 구분선 */}
                {sIdx < filteredSettlements.length - 1 && (
                  <tr>
                    <td colSpan={11} className="h-2 bg-gray-100"></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {/* 전체 합계 */}
            <tr className="font-bold border-t-2 border-gray-400">
              <td className={`${tdClass} text-left`} colSpan={3}>
                전체 합계 ({filteredSettlements.reduce((sum, s) => sum + s.bidParts.length, 0)}건)
              </td>
              <td className={tdClass} colSpan={3}></td>
              <td className={`${tdClass} text-right`}>
                {filteredSettlements.reduce((sum, s) => sum + s.totalWeight, 0).toFixed(1)}
              </td>
              <td className={tdClass}></td>
              <td className={`${tdClass} text-right`}>
                {filteredSettlements.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}
              </td>
              <td className={`${tdClass} text-gray-400`}>-</td>
              <td className={`${tdClass} text-right`}>
                {filteredSettlements.reduce((sum, s) => sum + s.netPayment, 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
