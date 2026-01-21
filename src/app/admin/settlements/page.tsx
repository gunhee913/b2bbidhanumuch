'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Download,
  Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// 부위 데이터 타입
interface PartDetail {
  no: number;           // 순번
  listingNo: string;    // 상장번호
  partName: string;     // 부위
  weight: number;       // 중량
  unitPrice: number;    // 단가
  amount: number;       // 금액
  note: string;         // 비고
}

// 개체 데이터 타입
interface CattleDetail {
  id: string;
  auctionNo: string;    // 접수번호
  species: string;      // 축종
  gender: string;       // 성별
  grade: string;        // 등급
  weight: number;       // 중량(도체중)
  saleAmount: number;   // 판매금액
  listingFee: number;   // 상장수수료
  logisticsFee: number; // 물류비
  loadingFee: number; // 상차비
  deductionTotal: number; // 공제금액계
  netPayment: number;   // 차인지급액
  parts: PartDetail[];  // 부위별 내역
}

// 상장업체별 정산 데이터 타입
interface SettlementData {
  id: string;
  companyNo: string;
  companyName: string;
  representative: string;
  address: string;
  settlementDate: string;
  dealerName: string;   // 낙찰자(중도매인)
  cattleList: CattleDetail[];
  totalSaleAmount: number;
  totalDeduction: number;
  totalNetPayment: number;
}

// 19개 부위 및 현실적인 단가 (원/kg)
const PARTS_CONFIG = [
  { name: '등심(좌)', basePrice: 85000, baseWeight: 15.5 },
  { name: '등심(우)', basePrice: 85000, baseWeight: 15.5 },
  { name: '안심', basePrice: 95000, baseWeight: 4.5 },
  { name: '채끝', basePrice: 82000, baseWeight: 8.0 },
  { name: '갈비(좌)', basePrice: 78000, baseWeight: 12.5 },
  { name: '갈비(우)', basePrice: 78000, baseWeight: 12.5 },
  { name: '특수부위', basePrice: 72000, baseWeight: 3.5 },
  { name: '앞다리', basePrice: 55000, baseWeight: 25.0 },
  { name: '우둔', basePrice: 58000, baseWeight: 21.0 },
  { name: '목심', basePrice: 62000, baseWeight: 14.5 },
  { name: '양지(좌)', basePrice: 52000, baseWeight: 12.5 },
  { name: '양지(우)', basePrice: 52000, baseWeight: 12.5 },
  { name: '설도(좌)', basePrice: 56000, baseWeight: 16.5 },
  { name: '설도(우)', basePrice: 56000, baseWeight: 16.5 },
  { name: '사태', basePrice: 48000, baseWeight: 15.0 },
  { name: '꼬리', basePrice: 35000, baseWeight: 16.0 },
  { name: '족', basePrice: 25000, baseWeight: 10.5 },
  { name: '사골', basePrice: 20000, baseWeight: 3.5 },
  { name: '잡뼈', basePrice: 15000, baseWeight: 22.0 },
];

// 더미 데이터 생성
const generateDummyData = (): SettlementData[] => {
  const companies = [
    { no: '100', name: '건화', rep: '김건화', addr: '충북 음성군 음성읍 한벌로 123' },
    { no: '200', name: '대진엠에스', rep: '이대진', addr: '충북 음성군 음성읍 산업단지로 456' },
    { no: '300', name: '안심엘피씨', rep: '박안심', addr: '충북 음성군 음성읍 중앙로 789' },
    { no: '400', name: '정직한고기', rep: '최정직', addr: '충북 음성군 음성읍 평곡로 321' },
  ];

  const dealers = ['이경순', '김철수', '박영희', '최민수'];

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const dateCode = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  return companies.map((company, companyIdx) => {
    const cattleCount = 2 + (companyIdx % 2); // 2~3두
    const cattleList: CattleDetail[] = [];
    let seqNo = companyIdx * 100 + 1;

    for (let i = 0; i < cattleCount; i++) {
      const grade = ['1++B', '1++A', '1+B', '1+A'][i % 4];
      const gender = i % 2 === 0 ? '거세' : '암';
      const gradeMultiplier = grade.startsWith('1++') ? 1.0 : grade.startsWith('1+') ? 0.85 : 0.7;
      
      // 개체번호: 업체번호 + 개체순번 (예: 100 + 1 = 101, 100 + 2 = 102)
      const cattleNo = parseInt(company.no) + i + 1;
      
      // 부위별 내역 생성 (고정값 사용으로 hydration 오류 방지)
      // 두당 1개씩 유찰분 생성 (각 개체마다 다른 부위가 유찰됨)
      const failedPartIdx = (companyIdx + i) % 19; // 유찰될 부위 인덱스
      
      const parts: PartDetail[] = PARTS_CONFIG.map((config, partIdx) => {
        // 인덱스 기반으로 약간의 변화를 줌 (Math.random 대신)
        const weightVariation = ((companyIdx * 7 + i * 3 + partIdx) % 20 - 10) / 10; // -1.0 ~ 0.9
        const weight = config.baseWeight > 0 
          ? Number((config.baseWeight + weightVariation).toFixed(1))
          : 0;
        
        // 유찰분은 단가와 금액을 0으로 설정
        const isFailedBid = partIdx === failedPartIdx;
        const unitPrice = isFailedBid ? 0 : Math.round(config.basePrice * gradeMultiplier);
        const amount = isFailedBid ? 0 : Math.round(weight * unitPrice);
        const partNo = partIdx + 1; // 부위 순번 01~19
        
        return {
          no: partNo,
          listingNo: `${dateCode}-${cattleNo}-${String(partNo).padStart(2, '0')}`,
          partName: config.name,
          weight,
          unitPrice,
          amount,
          note: '',
        };
      });

      const saleAmount = parts.reduce((sum, p) => sum + p.amount, 0);
      const listingFee = Math.round(saleAmount * 0.02); // 2% 수수료
      const logisticsFee = 21000;
      const loadingFee = 20000;
      const deductionTotal = listingFee + logisticsFee + loadingFee;
      const netPayment = saleAmount - deductionTotal;

      // 도체중 계산 (전체 부위 중량의 합)
      const totalWeight = Number(parts.reduce((sum, p) => sum + p.weight, 0).toFixed(1));

      cattleList.push({
        id: `${company.no}-${i + 1}`,
        auctionNo: `${dateCode}-${cattleNo}`,
        species: '한우',
        gender,
        grade,
        weight: totalWeight,
        saleAmount,
        listingFee,
        logisticsFee,
        loadingFee,
        deductionTotal,
        netPayment,
        parts,
      });

      seqNo++;
    }

    const totalSaleAmount = cattleList.reduce((sum, c) => sum + c.saleAmount, 0);
    const totalDeduction = cattleList.reduce((sum, c) => sum + c.deductionTotal, 0);
    const totalNetPayment = cattleList.reduce((sum, c) => sum + c.netPayment, 0);

    return {
      id: company.no,
      companyNo: company.no,
      companyName: company.name,
      representative: company.rep,
      address: company.addr,
      settlementDate: dateStr,
      dealerName: dealers[companyIdx % dealers.length],
      cattleList,
      totalSaleAmount,
      totalDeduction,
      totalNetPayment,
    };
  });
};

export default function SettlementsPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [settlements] = useState<SettlementData[]>(generateDummyData());
  const [expandedCattle, setExpandedCattle] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const toggleCattle = (cattleId: string) => {
    setExpandedCattle(prev =>
      prev.includes(cattleId)
        ? prev.filter(id => id !== cattleId)
        : [...prev, cattleId]
    );
  };

  const filteredSettlements = settlements.filter(s => 
    companyFilter === 'all' || s.id === companyFilter
  );

  const handleExcelDownload = () => {
    const excelData: Record<string, string | number>[] = [];
    
    filteredSettlements.forEach(settlement => {
      // 개체별 데이터
      settlement.cattleList.forEach(cattle => {
        excelData.push({
          '업체명': settlement.companyName,
          '접수번호': cattle.auctionNo,
          '축종': cattle.species,
          '성별': cattle.gender,
          '등급': cattle.grade,
          '중량': cattle.weight,
          '판매금액': cattle.saleAmount,
          '상장수수료': cattle.listingFee,
          '물류비': cattle.logisticsFee,
          '상차비': cattle.loadingFee,
          '공제금액계': cattle.deductionTotal,
          '차인지급액': cattle.netPayment,
        });
      });
      
      // 업체별 소계
      const totalWeight = settlement.cattleList.reduce((sum, c) => sum + c.weight, 0);
      const totalSaleAmount = settlement.cattleList.reduce((sum, c) => sum + c.saleAmount, 0);
      const totalListingFee = settlement.cattleList.reduce((sum, c) => sum + c.listingFee, 0);
      const totalLogisticsFee = settlement.cattleList.reduce((sum, c) => sum + c.logisticsFee, 0);
      const totalLoadingFee = settlement.cattleList.reduce((sum, c) => sum + c.loadingFee, 0);
      const totalDeduction = settlement.cattleList.reduce((sum, c) => sum + c.deductionTotal, 0);
      const totalNetPayment = settlement.cattleList.reduce((sum, c) => sum + c.netPayment, 0);
      
      excelData.push({
        '업체명': `${settlement.companyName} 소계`,
        '접수번호': '',
        '축종': '',
        '성별': '',
        '등급': '',
        '중량': totalWeight,
        '판매금액': totalSaleAmount,
        '상장수수료': totalListingFee,
        '물류비': totalLogisticsFee,
        '상차비': totalLoadingFee,
        '공제금액계': totalDeduction,
        '차인지급액': totalNetPayment,
      });
      
      // 빈 행 추가 (업체 구분)
      excelData.push({
        '업체명': '',
        '접수번호': '',
        '축종': '',
        '성별': '',
        '등급': '',
        '중량': '',
        '판매금액': '',
        '상장수수료': '',
        '물류비': '',
        '상차비': '',
        '공제금액계': '',
        '차인지급액': '',
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '정산서');
    
    const today = new Date();
    const fileName = `정산서_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 인쇄 기능 (필터된 전체 결과)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalSaleAmount = filteredSettlements.reduce((sum, s) => sum + s.totalSaleAmount, 0);
    const totalDeduction = filteredSettlements.reduce((sum, s) => sum + s.totalDeduction, 0);
    const totalNetPayment = filteredSettlements.reduce((sum, s) => sum + s.totalNetPayment, 0);
    const totalCattleCount = filteredSettlements.reduce((sum, s) => sum + s.cattleList.length, 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>정산서</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', sans-serif; padding: 8px 15px; font-size: 9px; }
          h1 { text-align: center; margin-bottom: 8px; font-size: 14px; }
          .main-header { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #333; font-size: 9px; }
          .summary { text-align: right; }
          .summary p { margin: 1px 0; }
          .company-section { margin-bottom: 5px; }
          .company-header { background: #f0f0f0; padding: 4px 8px; margin-bottom: 5px; font-weight: bold; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
          th, td { border: 1px solid #ccc; padding: 2px 3px; text-align: center; font-size: 8px; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .cattle-section { margin-bottom: 8px; }
          .parts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
          .total-row { background: #e5e7eb; }
          .total-row td { font-weight: bold; }
          .page-break { page-break-after: always; }
          @media print {
            @page { size: A4; margin: 5mm; }
            body { padding: 0; }
            .cattle-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>정 산 서</h1>
        <div class="main-header">
          <div>
            <p>정산일: ${new Date().toLocaleDateString('ko-KR')}</p>
            <p>업체명: ${filteredSettlements.map(s => s.companyName).join(', ')}</p>
          </div>
          <div class="summary">
            <p>총 ${totalCattleCount}두</p>
            <p>판매금액: ${totalSaleAmount.toLocaleString()}원</p>
            <p>공제금액: ${totalDeduction.toLocaleString()}원</p>
            <p class="font-bold">차인지급액: ${totalNetPayment.toLocaleString()}원</p>
          </div>
        </div>
        
        ${filteredSettlements.map(settlement => `
          <div class="company-section">
            <div class="company-header">${settlement.companyName} (차인지급액: ${settlement.totalNetPayment.toLocaleString()}원)</div>
            
            ${settlement.cattleList.map((cattle, idx) => `
              <div class="cattle-section">
                <table>
                  <thead>
                    <tr>
                      <th style="width:60px">${settlement.companyName}</th>
                      <th>축종</th>
                      <th>성별</th>
                      <th>등급</th>
                      <th>중량</th>
                      <th>판매금액</th>
                      <th>상장수수료</th>
                      <th>물류비</th>
                      <th>상차비</th>
                      <th>공제금액계</th>
                      <th>차인지급액</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${cattle.auctionNo}</td>
                      <td>${cattle.species}</td>
                      <td>${cattle.gender}</td>
                      <td>${cattle.grade}</td>
                      <td>${cattle.weight}</td>
                      <td>${cattle.saleAmount.toLocaleString()}</td>
                      <td>${cattle.listingFee.toLocaleString()}</td>
                      <td>${cattle.logisticsFee.toLocaleString()}</td>
                      <td>${cattle.loadingFee.toLocaleString()}</td>
                      <td>${cattle.deductionTotal.toLocaleString()}</td>
                      <td class="font-bold">${cattle.netPayment.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div class="parts-grid">
                  <table>
                    <thead>
                      <tr>
                        <th>상장번호</th>
                        <th>품명</th>
                        <th>중량</th>
                        <th>단가</th>
                        <th>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${cattle.parts.slice(0, 11).map(part => `
                        <tr>
                          <td>${part.listingNo}</td>
                          <td>${part.partName}</td>
                          <td>${part.weight > 0 ? part.weight.toFixed(1) : '-'}</td>
                          <td>${part.unitPrice > 0 ? part.unitPrice.toLocaleString() : '-'}</td>
                          <td>${part.amount > 0 ? part.amount.toLocaleString() : '-'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  <table>
                    <thead>
                      <tr>
                        <th>상장번호</th>
                        <th>품명</th>
                        <th>중량</th>
                        <th>단가</th>
                        <th>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${cattle.parts.slice(11).map(part => `
                        <tr>
                          <td>${part.listingNo}</td>
                          <td>${part.partName}</td>
                          <td>${part.weight > 0 ? part.weight.toFixed(1) : '-'}</td>
                          <td>${part.unitPrice > 0 ? part.unitPrice.toLocaleString() : '-'}</td>
                          <td>${part.amount > 0 ? part.amount.toLocaleString() : '-'}</td>
                        </tr>
                      `).join('')}
                      ${Array(11 - cattle.parts.slice(11).length).fill(0).map(() => `
                        <tr><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              ${(idx + 1) % 3 === 0 && idx < settlement.cattleList.length - 1 ? '<div class="page-break"></div>' : ''}
            `).join('')}
            
            <table>
              <tbody>
                <tr class="total-row">
                  <td colspan="5" style="text-align:left; padding-left: 20px;">${settlement.companyName} 합계</td>
                  <td>판매: ${settlement.totalSaleAmount.toLocaleString()}원</td>
                  <td colspan="2">공제: ${settlement.totalDeduction.toLocaleString()}원</td>
                  <td colspan="3">차인지급액: <span class="font-bold">${settlement.totalNetPayment.toLocaleString()}원</span></td>
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
        <h1 className="text-2xl font-bold text-gray-900">정산서(상장업체별)</h1>
      </div>

      {/* 필터 */}
      <div className="bg-white shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상장업체</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[120px]"
            >
              <option value="all">전체</option>
              {settlements.map(s => (
                <option key={s.id} value={s.id}>{s.companyName}</option>
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
                setCompanyFilter('all');
                setStartDate('');
                setEndDate('');
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

      {/* 정산서 테이블 */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0">
            <tr>
              <th className={`${thClass} w-[80px]`}>업체명</th>
              <th className={`${thClass} w-[100px]`}>접수번호</th>
              <th className={`${thClass} w-[50px]`}>축종</th>
              <th className={`${thClass} w-[50px]`}>성별</th>
              <th className={`${thClass} w-[55px]`}>등급</th>
              <th className={`${thClass} w-[55px]`}>중량</th>
              <th className={`${thClass} w-[95px]`}>판매금액</th>
              <th className={`${thClass} w-[80px]`}>상장수수료</th>
              <th className={`${thClass} w-[65px]`}>물류비</th>
              <th className={`${thClass} w-[65px]`}>상차비</th>
              <th className={`${thClass} w-[85px]`}>공제금액계</th>
              <th className={`${thClass} w-[100px]`}>차인지급액</th>
              <th className={`${thClass} w-[70px]`}></th>
            </tr>
          </thead>
          <tbody>
            {filteredSettlements.map((settlement, sIdx) => (
              <React.Fragment key={settlement.id}>
                {/* 개체별 행 */}
                {settlement.cattleList.map((cattle, cattleIdx) => (
                  <React.Fragment key={cattle.id}>
                    <tr className="hover:bg-gray-50">
                      <td className={tdClass}>{cattleIdx === 0 ? settlement.companyName : ''}</td>
                      <td className={`${tdClass} text-[10px] text-gray-600`}>{cattle.auctionNo}</td>
                      <td className={tdClass}>{cattle.species}</td>
                      <td className={tdClass}>{cattle.gender}</td>
                      <td className={tdClass}>{cattle.grade}</td>
                      <td className={`${tdClass} text-right`}>{cattle.weight}</td>
                      <td className={`${tdClass} text-right`}>{cattle.saleAmount.toLocaleString()}</td>
                      <td className={`${tdClass} text-right`}>{cattle.listingFee.toLocaleString()}</td>
                      <td className={`${tdClass} text-right`}>{cattle.logisticsFee.toLocaleString()}</td>
                      <td className={`${tdClass} text-right`}>{cattle.loadingFee.toLocaleString()}</td>
                      <td className={`${tdClass} text-right`}>{cattle.deductionTotal.toLocaleString()}</td>
                      <td className={`${tdClass} text-right font-semibold`}>{cattle.netPayment.toLocaleString()}</td>
                      <td className={tdClass}>
                        <button
                          onClick={() => toggleCattle(cattle.id)}
                          className="text-gray-600 hover:text-gray-800 text-xs"
                        >
                          {expandedCattle.includes(cattle.id) ? '접기 ▲' : '펼치기 ▼'}
                        </button>
                      </td>
                    </tr>
                    {/* 부위별 상세 */}
                    {expandedCattle.includes(cattle.id) && (
                      <tr>
                        <td colSpan={13} className="p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr>
                                  <th className={thClass}>상장번호</th>
                                  <th className={thClass}>품명</th>
                                  <th className={thClass}>중량</th>
                                  <th className={thClass}>단가</th>
                                  <th className={thClass}>금액</th>
                                  <th className={thClass}>비고</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cattle.parts.slice(0, 11).map((part, idx) => (
                                  <tr key={idx}>
                                    <td className={tdClass}>{part.listingNo}</td>
                                    <td className={tdClass}>{part.partName}</td>
                                    <td className={`${tdClass} text-right`}>{part.weight > 0 ? part.weight.toFixed(1) : '-'}</td>
                                    <td className={`${tdClass} text-right`}>{part.unitPrice > 0 ? part.unitPrice.toLocaleString() : '-'}</td>
                                    <td className={`${tdClass} text-right`}>{part.amount > 0 ? part.amount.toLocaleString() : '-'}</td>
                                    <td className={`${tdClass} text-gray-500`}>{part.amount === 0 ? '반출' : ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <table className="w-full border-collapse">
                              <thead>
                                <tr>
                                  <th className={thClass}>상장번호</th>
                                  <th className={thClass}>품명</th>
                                  <th className={thClass}>중량</th>
                                  <th className={thClass}>단가</th>
                                  <th className={thClass}>금액</th>
                                  <th className={thClass}>비고</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cattle.parts.slice(11).map((part, idx) => (
                                  <tr key={idx}>
                                    <td className={tdClass}>{part.listingNo}</td>
                                    <td className={tdClass}>{part.partName}</td>
                                    <td className={`${tdClass} text-right`}>{part.weight > 0 ? part.weight.toFixed(1) : '-'}</td>
                                    <td className={`${tdClass} text-right`}>{part.unitPrice > 0 ? part.unitPrice.toLocaleString() : '-'}</td>
                                    <td className={`${tdClass} text-right`}>{part.amount > 0 ? part.amount.toLocaleString() : '-'}</td>
                                    <td className={`${tdClass} text-gray-500`}>{part.amount === 0 ? '반출' : ''}</td>
                                  </tr>
                                ))}
                                {Array(11 - cattle.parts.slice(11).length).fill(0).map((_, idx) => (
                                  <tr key={`empty-${idx}`}>
                                    <td className={tdClass}>&nbsp;</td>
                                    <td className={tdClass}>&nbsp;</td>
                                    <td className={tdClass}>&nbsp;</td>
                                    <td className={tdClass}>&nbsp;</td>
                                    <td className={tdClass}>&nbsp;</td>
                                    <td className={tdClass}>&nbsp;</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {/* 업체별 소계 */}
                <tr className="font-semibold border-t-2 border-gray-300">
                  <td className={`${tdClass} text-left`} colSpan={2}>{settlement.companyName} 소계 ({settlement.cattleList.length}두)</td>
                  <td className={tdClass} colSpan={4}></td>
                  <td className={`${tdClass} text-right`}>{settlement.totalSaleAmount.toLocaleString()}</td>
                  <td className={`${tdClass} text-right`}>{settlement.cattleList.reduce((sum, c) => sum + c.listingFee, 0).toLocaleString()}</td>
                  <td className={`${tdClass} text-right`}>{settlement.cattleList.reduce((sum, c) => sum + c.logisticsFee, 0).toLocaleString()}</td>
                  <td className={`${tdClass} text-right`}>{settlement.cattleList.reduce((sum, c) => sum + c.loadingFee, 0).toLocaleString()}</td>
                  <td className={`${tdClass} text-right`}>{settlement.totalDeduction.toLocaleString()}</td>
                  <td className={`${tdClass} text-right`}>{settlement.totalNetPayment.toLocaleString()}</td>
                  <td className={tdClass}></td>
                </tr>
                {/* 업체 구분선 */}
                {sIdx < filteredSettlements.length - 1 && (
                  <tr>
                    <td colSpan={13} className="h-2 bg-gray-200"></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {/* 전체 합계 */}
            <tr className="font-bold border-t-2 border-gray-400">
              <td className={`${tdClass} text-left`} colSpan={2}>
                전체 합계 ({filteredSettlements.reduce((sum, s) => sum + s.cattleList.length, 0)}두)
              </td>
              <td className={tdClass} colSpan={4}></td>
              <td className={`${tdClass} text-right`}>{filteredSettlements.reduce((sum, s) => sum + s.totalSaleAmount, 0).toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{filteredSettlements.reduce((sum, s) => sum + s.cattleList.reduce((cs, c) => cs + c.listingFee, 0), 0).toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{filteredSettlements.reduce((sum, s) => sum + s.cattleList.reduce((cs, c) => cs + c.logisticsFee, 0), 0).toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{filteredSettlements.reduce((sum, s) => sum + s.cattleList.reduce((cs, c) => cs + c.loadingFee, 0), 0).toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{filteredSettlements.reduce((sum, s) => sum + s.totalDeduction, 0).toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{filteredSettlements.reduce((sum, s) => sum + s.totalNetPayment, 0).toLocaleString()}</td>
              <td className={tdClass}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
