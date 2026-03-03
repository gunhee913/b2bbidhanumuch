'use client';

import React, { useState } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { 
  Download,
  Printer,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface PartDetail {
  no: number;
  listingNo: string;
  partName: string;
  weight: number;
  unitPrice: number;
  amount: number;
  dealerNo: string;
  dealerName: string;
  note: string;
}

interface FeeItem {
  name: string;
  amount: number;
}

interface CattleDetail {
  id: string;
  auctionNo: string;
  species: string;
  gender: string;
  grade: string;
  weight: number;
  traceNo: string;
  closedAt: string;
  saleAmount: number;
  fees: FeeItem[];
  deductionTotal: number;
  netPayment: number;
  parts: PartDetail[];
}

interface SettlementData {
  id: string;
  companyNo: string;
  companyName: string;
  cattleList: CattleDetail[];
  totalSaleAmount: number;
  totalDeduction: number;
  totalNetPayment: number;
}

interface SettlementsResponse {
  settlements: SettlementData[];
  feeNames: string[];
  summary: {
    totalCompanies: number;
    totalCattle: number;
    totalSaleAmount: number;
    totalDeduction: number;
    totalNetPayment: number;
  };
}

const getFeeAmount = (fees: FeeItem[], name: string) => {
  return fees.find(f => f.name === name)?.amount || 0;
};

export default function CompanySettlementsPage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  const companyId = session?.company?.id || '';
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchStartDate, setSearchStartDate] = useState(todayStr);
  const [searchEndDate, setSearchEndDate] = useState(todayStr);
  const [expandedCattle, setExpandedCattle] = useState<string[]>([]);

  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };

  const { data, isLoading } = useQuery<SettlementsResponse>({
    queryKey: ['company-settlements', companyId, searchStartDate, searchEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchStartDate) params.append('startDate', searchStartDate);
      if (searchEndDate) params.append('endDate', searchEndDate);
      if (companyId) params.append('companyId', companyId);
      
      const response = await fetch(`/api/settlements?${params.toString()}`);
      if (!response.ok) throw new Error('정산 데이터 조회 실패');
      return response.json();
    },
    enabled: !!companyId,
  });

  const settlements = data?.settlements || [];
  const feeNames = data?.feeNames || [];
  const summary = data?.summary || {
    totalCompanies: 0,
    totalCattle: 0,
    totalSaleAmount: 0,
    totalDeduction: 0,
    totalNetPayment: 0,
  };

  const cattleList = settlements.flatMap(s => s.cattleList);
  const totalColSpan = 6 + feeNames.length + 3;

  const toggleCattle = (cattleId: string) => {
    setExpandedCattle(prev =>
      prev.includes(cattleId)
        ? prev.filter(id => id !== cattleId)
        : [...prev, cattleId]
    );
  };

  const handleExcelDownload = () => {
    if (cattleList.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const excelData: Record<string, string | number>[] = [];
    
    cattleList.forEach(cattle => {
      const row: Record<string, string | number> = {
        '접수번호': cattle.auctionNo,
        '이력번호': cattle.traceNo || '-',
        '축종': cattle.species,
        '성별': cattle.gender,
        '등급': cattle.grade,
        '중량': cattle.weight,
        '판매금액': cattle.saleAmount,
      };
      feeNames.forEach(name => {
        row[name] = getFeeAmount(cattle.fees, name);
      });
      row['공제금액계'] = cattle.deductionTotal;
      row['차인지급액'] = cattle.netPayment;
      excelData.push(row);
    });
    
    const totalRow: Record<string, string | number> = {
      '접수번호': '합계',
      '이력번호': '',
      '축종': '',
      '성별': '',
      '등급': '',
      '중량': cattleList.reduce((sum, c) => sum + c.weight, 0),
      '판매금액': summary.totalSaleAmount,
    };
    feeNames.forEach(name => {
      totalRow[name] = cattleList.reduce((sum, c) => sum + getFeeAmount(c.fees, name), 0);
    });
    totalRow['공제금액계'] = summary.totalDeduction;
    totalRow['차인지급액'] = summary.totalNetPayment;
    excelData.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '정산서');
    
    const fileName = `${companyName}_정산서_${searchStartDate}_${searchEndDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handlePrint = () => {
    if (cattleList.length === 0) {
      alert('인쇄할 데이터가 없습니다.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const feeHeaders = feeNames.map(n => `<th>${n}</th>`).join('');

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
          .cattle-section { margin-bottom: 8px; }
          .parts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
          .total-row { background: #e5e7eb; }
          .total-row td { font-weight: bold; }
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
            <p>업체명: ${companyName}</p>
          </div>
          <div class="summary">
            <p>총 ${summary.totalCattle}두</p>
            <p>판매금액: ${summary.totalSaleAmount.toLocaleString()}원</p>
            <p>공제금액: ${summary.totalDeduction.toLocaleString()}원</p>
            <p class="font-bold">차인지급액: ${summary.totalNetPayment.toLocaleString()}원</p>
          </div>
        </div>
        
        ${cattleList.map((cattle, idx) => `
          <div class="cattle-section">
            <table>
              <thead>
                <tr>
                  <th>접수번호</th>
                  <th>축종</th>
                  <th>성별</th>
                  <th>등급</th>
                  <th>중량</th>
                  <th>판매금액</th>
                  ${feeHeaders}
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
                  ${(cattle.fees || []).map((f: FeeItem) => `<td>${f.amount.toLocaleString()}</td>`).join('')}
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
                  ${cattle.parts.slice(0, 11).map((part: PartDetail) => `
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
                  ${cattle.parts.slice(11).map((part: PartDetail) => `
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
          ${(idx + 1) % 3 === 0 && idx < cattleList.length - 1 ? '<div style="page-break-after: always;"></div>' : ''}
        `).join('')}
        
        <table>
          <tbody>
            <tr class="total-row">
              <td colspan="5" style="text-align:left; padding-left: 20px;">전체 합계 (${summary.totalCattle}두)</td>
              <td>판매: ${summary.totalSaleAmount.toLocaleString()}원</td>
              <td colspan="${feeNames.length}">공제: ${summary.totalDeduction.toLocaleString()}원</td>
              <td colspan="2">차인지급액: <span class="font-bold">${summary.totalNetPayment.toLocaleString()}원</span></td>
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
                setStartDate(todayStr);
                setEndDate(todayStr);
                setSearchStartDate(todayStr);
                setSearchEndDate(todayStr);
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={handleExcelDownload}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 text-white text-xs hover:bg-gray-700 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
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
              {feeNames.map(name => (
                <th key={name} className={`${thClass} w-[80px]`}>{name}</th>
              ))}
              <th className={`${thClass} w-[85px]`}>공제금액계</th>
              <th className={`${thClass} w-[100px]`}>차인지급액</th>
              <th className={`${thClass} w-[70px]`}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={totalColSpan} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    데이터 조회 중...
                  </div>
                </td>
              </tr>
            ) : cattleList.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} className="px-4 py-8 text-center text-gray-500">
                  해당 기간에 마감된 정산 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              <>
                {cattleList.map((cattle) => (
                  <React.Fragment key={cattle.id}>
                    <tr className="hover:bg-gray-50">
                      <td className={`${tdClass} text-[10px] text-gray-600`}>{cattle.auctionNo}</td>
                      <td className={tdClass}>{cattle.species}</td>
                      <td className={tdClass}>{cattle.gender}</td>
                      <td className={tdClass}>{cattle.grade}</td>
                      <td className={`${tdClass} text-right`}>{cattle.weight}</td>
                      <td className={`${tdClass} text-right`}>{cattle.saleAmount.toLocaleString()}</td>
                      {feeNames.map(name => (
                        <td key={name} className={`${tdClass} text-right`}>
                          {getFeeAmount(cattle.fees, name).toLocaleString()}
                        </td>
                      ))}
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
                    {expandedCattle.includes(cattle.id) && (
                      <tr>
                        <td colSpan={totalColSpan} className="p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <table className="w-full border-collapse table-fixed">
                              <thead>
                                <tr>
                                  <th className={thClass} style={{ width: '120px' }}>상장번호</th>
                                  <th className={thClass} style={{ width: '70px' }}>품명</th>
                                  <th className={thClass} style={{ width: '55px' }}>중량</th>
                                  <th className={thClass} style={{ width: '70px' }}>단가</th>
                                  <th className={thClass} style={{ width: '85px' }}>금액</th>
                                  <th className={thClass} style={{ width: '45px' }}>비고</th>
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
                                    <td className={`${tdClass} text-gray-500`}>{part.amount === 0 ? '유찰' : ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <table className="w-full border-collapse table-fixed">
                              <thead>
                                <tr>
                                  <th className={thClass} style={{ width: '120px' }}>상장번호</th>
                                  <th className={thClass} style={{ width: '70px' }}>품명</th>
                                  <th className={thClass} style={{ width: '55px' }}>중량</th>
                                  <th className={thClass} style={{ width: '70px' }}>단가</th>
                                  <th className={thClass} style={{ width: '85px' }}>금액</th>
                                  <th className={thClass} style={{ width: '45px' }}>비고</th>
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
                                    <td className={`${tdClass} text-gray-500`}>{part.amount === 0 ? '유찰' : ''}</td>
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
                    합계 ({summary.totalCattle}두)
                  </td>
                  <td className={tdClass}></td>
                  <td className={tdClass}></td>
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-right`}>{cattleList.reduce((sum, c) => sum + c.weight, 0).toFixed(1)}</td>
                  <td className={`${tdClass} text-right`}>{summary.totalSaleAmount.toLocaleString()}</td>
                  {feeNames.map(name => (
                    <td key={name} className={`${tdClass} text-right`}>
                      {cattleList.reduce((sum, c) => sum + getFeeAmount(c.fees, name), 0).toLocaleString()}
                    </td>
                  ))}
                  <td className={`${tdClass} text-right`}>{summary.totalDeduction.toLocaleString()}</td>
                  <td className={`${tdClass} text-right`}>{summary.totalNetPayment.toLocaleString()}</td>
                  <td className={tdClass}></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </CompanyLayout>
  );
}
