'use client';

import React, { useState, useMemo } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { 
  Download,
  Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';

// 부위 데이터 타입
interface PartDetail {
  no: number;
  listingNo: string;
  partName: string;
  weight: number;
  unitPrice: number;
  amount: number;
  note: string;
}

// 개체 데이터 타입
interface CattleDetail {
  id: string;
  auctionNo: string;
  species: string;
  gender: string;
  grade: string;
  weight: number;
  saleAmount: number;
  listingFee: number;
  logisticsFee: number;
  loadingFee: number;
  deductionTotal: number;
  netPayment: number;
  parts: PartDetail[];
}

// 20개 부위 및 현실적인 단가 (원/kg)
const PARTS_CONFIG = [
  { name: '등심(좌)', basePrice: 85000, baseWeight: 15.5 },
  { name: '등심(우)', basePrice: 85000, baseWeight: 15.5 },
  { name: '안심', basePrice: 95000, baseWeight: 4.5 },
  { name: '채끝', basePrice: 82000, baseWeight: 8.0 },
  { name: '치마', basePrice: 65000, baseWeight: 4.0 },
  { name: '부채', basePrice: 60000, baseWeight: 3.0 },
  { name: '업진', basePrice: 55000, baseWeight: 4.5 },
  { name: '토시·제비', basePrice: 70000, baseWeight: 2.0 },
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

// 더미 데이터 생성 (특정 업체만)
const generateDummyData = (companyName: string): CattleDetail[] => {
  const today = new Date();
  const dateCode = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const companyPrefixMap: Record<string, string> = {
    '건화': '101',
    '대진엠에스': '201',
    '안심엘피씨': '301',
    '정직한고기': '401',
  };
  
  const baseNo = companyPrefixMap[companyName] || '101';
  const cattleList: CattleDetail[] = [];
  const cattleCount = 2;

  for (let i = 0; i < cattleCount; i++) {
    const cattleNo = parseInt(baseNo) + i;
    const grade = ['1++B', '1++A'][i % 2];
    const gender = i % 2 === 0 ? '거세' : '암';
    const gradeMultiplier = grade.startsWith('1++') ? 1.0 : grade.startsWith('1+') ? 0.85 : 0.7;
    
    const failedPartIdx = i % 20;
    
    const parts: PartDetail[] = PARTS_CONFIG.map((config, partIdx) => {
      const weightVariation = ((i * 3 + partIdx) % 20 - 10) / 10;
      const weight = config.baseWeight > 0 
        ? Number((config.baseWeight + weightVariation).toFixed(1))
        : 0;
      
      const isFailedBid = partIdx === failedPartIdx;
      const unitPrice = isFailedBid ? 0 : Math.round(config.basePrice * gradeMultiplier);
      const amount = isFailedBid ? 0 : Math.round(weight * unitPrice);
      const partNo = partIdx + 1;
      
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
    const listingFee = Math.round(saleAmount * 0.02);
    const logisticsFee = 21000;
    const loadingFee = 20000;
    const deductionTotal = listingFee + logisticsFee + loadingFee;
    const netPayment = saleAmount - deductionTotal;
    const totalWeight = Number(parts.reduce((sum, p) => sum + p.weight, 0).toFixed(1));

    cattleList.push({
      id: `${baseNo}-${i + 1}`,
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
  }

  return cattleList;
};

export default function CompanySettlementsPage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [expandedCattle, setExpandedCattle] = useState<string[]>([]);

  const cattleList = useMemo(() => generateDummyData(companyName), [companyName]);

  // 합계 계산
  const totalSaleAmount = cattleList.reduce((sum, c) => sum + c.saleAmount, 0);
  const totalDeduction = cattleList.reduce((sum, c) => sum + c.deductionTotal, 0);
  const totalNetPayment = cattleList.reduce((sum, c) => sum + c.netPayment, 0);

  const toggleCattle = (cattleId: string) => {
    setExpandedCattle(prev =>
      prev.includes(cattleId)
        ? prev.filter(id => id !== cattleId)
        : [...prev, cattleId]
    );
  };

  const handleExcelDownload = () => {
    const excelData: Record<string, string | number>[] = [];
    
    cattleList.forEach(cattle => {
      excelData.push({
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
    
    // 합계
    excelData.push({
      '접수번호': '합계',
      '축종': '',
      '성별': '',
      '등급': '',
      '중량': cattleList.reduce((sum, c) => sum + c.weight, 0),
      '판매금액': totalSaleAmount,
      '상장수수료': cattleList.reduce((sum, c) => sum + c.listingFee, 0),
      '물류비': cattleList.reduce((sum, c) => sum + c.logisticsFee, 0),
      '상차비': cattleList.reduce((sum, c) => sum + c.loadingFee, 0),
      '공제금액계': totalDeduction,
      '차인지급액': totalNetPayment,
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '정산서');
    
    const fileName = `${companyName}_정산서_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>정산서 - ${companyName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', sans-serif; padding: 8px 15px; font-size: 9px; }
          h1 { text-align: center; margin-bottom: 8px; font-size: 14px; }
          .main-header { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #333; font-size: 9px; }
          .summary { text-align: right; }
          .summary p { margin: 1px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 3px; }
          th, td { border: 1px solid #ccc; padding: 2px 3px; text-align: center; font-size: 8px; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .total-row { background: #e5e7eb; }
          .total-row td { font-weight: bold; }
          @media print {
            @page { size: A4; margin: 5mm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>정 산 서</h1>
        <div class="main-header">
          <div>
            <p>정산일: ${new Date().toLocaleDateString('ko-KR')}</p>
            <p>업체명: ${companyName}</p>
          </div>
          <div class="summary">
            <p>총 ${cattleList.length}두</p>
            <p>판매금액: ${totalSaleAmount.toLocaleString()}원</p>
            <p>공제금액: ${totalDeduction.toLocaleString()}원</p>
            <p class="font-bold">차인지급액: ${totalNetPayment.toLocaleString()}원</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>접수번호</th>
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
            ${cattleList.map(cattle => `
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
            `).join('')}
            <tr class="total-row">
              <td colspan="4">합계 (${cattleList.length}두)</td>
              <td>${cattleList.reduce((sum, c) => sum + c.weight, 0).toFixed(1)}</td>
              <td>${totalSaleAmount.toLocaleString()}</td>
              <td>${cattleList.reduce((sum, c) => sum + c.listingFee, 0).toLocaleString()}</td>
              <td>${cattleList.reduce((sum, c) => sum + c.logisticsFee, 0).toLocaleString()}</td>
              <td>${cattleList.reduce((sum, c) => sum + c.loadingFee, 0).toLocaleString()}</td>
              <td>${totalDeduction.toLocaleString()}</td>
              <td>${totalNetPayment.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        
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
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">정산서</h1>
        <p className="text-sm text-gray-500 mt-1">{companyName}</p>
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

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
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
            {cattleList.map((cattle) => (
              <React.Fragment key={cattle.id}>
                <tr className="hover:bg-gray-50">
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
                    <td colSpan={12} className="p-2">
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
            {/* 전체 합계 */}
            <tr className="font-bold border-t-2 border-gray-400">
              <td className={`${tdClass} text-left`}>
                합계 ({cattleList.length}두)
              </td>
              <td className={tdClass}></td>
              <td className={tdClass}></td>
              <td className={tdClass}></td>
              <td className={`${tdClass} text-right`}>{cattleList.reduce((sum, c) => sum + c.weight, 0).toFixed(1)}</td>
              <td className={`${tdClass} text-right`}>{totalSaleAmount.toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{cattleList.reduce((sum, c) => sum + c.listingFee, 0).toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{cattleList.reduce((sum, c) => sum + c.logisticsFee, 0).toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{cattleList.reduce((sum, c) => sum + c.loadingFee, 0).toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{totalDeduction.toLocaleString()}</td>
              <td className={`${tdClass} text-right`}>{totalNetPayment.toLocaleString()}</td>
              <td className={tdClass}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </CompanyLayout>
  );
}
