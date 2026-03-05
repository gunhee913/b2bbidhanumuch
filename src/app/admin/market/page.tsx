'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { generateDealerSettlements, BidPartDetail } from '@/constants/dealerSettlement';

// 부위 매핑 (좌/우 -> 통합)
const PART_MAPPING: Record<string, string> = {
  '등심(좌)': '등심',
  '등심(우)': '등심',
  '안심': '안심',
  '채끝': '채끝',
  '치마': '치마',
  '부채': '부채',
  '업진': '업진',
  '토시·제비': '토시·제비',
  '앞다리': '앞다리',
  '우둔': '우둔',
  '목심': '목심',
  '양지(좌)': '양지',
  '양지(우)': '양지',
  '설도(좌)': '설도',
  '설도(우)': '설도',
  '사태': '사태',
  '꼬리': '꼬리',
  '족': '족',
  '사골': '사골',
  '잡뼈': '잡뼈',
};

// 등급 매핑 (세분화)
const GRADE_MAPPING: Record<string, string> = {
  '1++A': '1++(9)',
  '1++B': '1++(8)',
  '1++C': '1++(7)',
  '1+A': '1+',
  '1+B': '1+',
  '1+C': '1+',
  '1A': '1',
  '1B': '1',
  '1C': '1',
  '2A': '2',
  '2B': '2',
  '2C': '2',
  '2': '2',
};

// 부위 목록
const PARTS = [
  '등심', '안심', '채끝', '치마', '부채', '업진', '토시·제비', '앞다리', 
  '우둔', '목심', '양지', '설도', '사태', '꼬리', '족', '사골', '잡뼈'
];

// 등급 목록 (육질등급)
const GRADES = ['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'];

// 육량등급 목록
const YIELD_GRADES = ['A', 'B', 'C'];

// 성별 목록
const GENDERS = ['거세', '암'];

// 낙찰 내역 타입
interface BidRecord {
  listingNo: string;
  partName: string;
  partNameOriginal: string;
  grade: string;
  gradeOriginal: string;
  yieldGrade: string; // 육량등급 (A, B, C)
  gender: string; // 성별 (거세, 암)
  dealerNo: string;
  dealerName: string;
  companyName: string;
  weight: number;
  price: number;
  totalPrice: number;
}

// 시세 요약 타입
interface PriceSummary {
  partName: string;
  grade: string;
  count: number;
  totalWeight: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  records: BidRecord[];
}

export default function MarketPage() {
  const [startDate, setStartDate] = useState<string>('2026-01-21');
  const [endDate, setEndDate] = useState<string>('2026-01-21');
  const [partFilter, setPartFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [yieldGradeFilter, setYieldGradeFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [sPartFilter, setSPartFilter] = useState<string>('all');
  const [sGradeFilter, setSGradeFilter] = useState<string>('all');
  const [sYieldGradeFilter, setSYieldGradeFilter] = useState<string>('all');
  const [sGenderFilter, setSGenderFilter] = useState<string>('all');

  const handleSearch = () => {
    setSPartFilter(partFilter);
    setSGradeFilter(gradeFilter);
    setSYieldGradeFilter(yieldGradeFilter);
    setSGenderFilter(genderFilter);
  };
  
  // 중도매인별 낙찰 데이터 가져오기
  const dealerSettlements = useMemo(() => generateDealerSettlements(), []);
  
  // 모든 낙찰 내역을 플랫하게 변환
  const allBidRecords = useMemo(() => {
    const records: BidRecord[] = [];
    let idx = 0;
    
    dealerSettlements.forEach(settlement => {
      settlement.bidParts.forEach(part => {
        // 육량등급 추출 (마지막 글자: A, B, C)
        const yieldGrade = part.grade.slice(-1);
        // 성별 할당 (거세 70%, 암 30% 비율로)
        const gender = (idx * 3 + 1) % 10 < 7 ? '거세' : '암';
        idx++;
        
        records.push({
          listingNo: part.listingNo,
          partName: PART_MAPPING[part.partName] || part.partName,
          partNameOriginal: part.partName,
          grade: GRADE_MAPPING[part.grade] || part.grade,
          gradeOriginal: part.grade,
          yieldGrade,
          gender,
          dealerNo: settlement.dealerNo,
          dealerName: settlement.dealerName,
          companyName: part.companyName,
          weight: part.weight,
          price: part.unitPrice,
          totalPrice: part.amount,
        });
      });
    });
    
    return records;
  }, [dealerSettlements]);
  
  // 부위/등급별로 그룹핑 (0건인 항목도 포함, 육량등급 필터 적용)
  const summaryData = useMemo(() => {
    const groupMap = new Map<string, BidRecord[]>();
    
    // 모든 부위/등급 조합 초기화
    PARTS.forEach(part => {
      GRADES.forEach(grade => {
        groupMap.set(`${part}-${grade}`, []);
      });
    });
    
    allBidRecords.forEach(record => {
      if (sYieldGradeFilter !== 'all' && record.yieldGrade !== sYieldGradeFilter) {
        return;
      }
      if (sGenderFilter !== 'all' && record.gender !== sGenderFilter) {
        return;
      }
      
      const key = `${record.partName}-${record.grade}`;
      if (groupMap.has(key)) {
        groupMap.get(key)!.push(record);
      }
    });
    
    const summaries: PriceSummary[] = [];
    
    groupMap.forEach((records, key) => {
      const [partName, grade] = key.split('-');
      
      if (records.length === 0) {
        summaries.push({
          partName,
          grade,
          count: 0,
          totalWeight: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          avgAmount: 0,
          minAmount: 0,
          maxAmount: 0,
          records: [],
        });
      } else {
        const prices = records.map(r => r.price);
        const amounts = records.map(r => r.totalPrice);
        const totalWeight = records.reduce((sum, r) => sum + r.weight, 0);
        
        summaries.push({
          partName,
          grade,
          count: records.length,
          totalWeight: Math.round(totalWeight * 10) / 10,
          avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          avgAmount: Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length),
          minAmount: Math.min(...amounts),
          maxAmount: Math.max(...amounts),
          records: records.sort((a, b) => a.listingNo.localeCompare(b.listingNo)),
        });
      }
    });
    
    // 부위 순서, 등급 순서로 정렬
    return summaries.sort((a, b) => {
      const partOrderA = PARTS.indexOf(a.partName);
      const partOrderB = PARTS.indexOf(b.partName);
      if (partOrderA !== partOrderB) return partOrderA - partOrderB;
      
      const gradeOrderA = GRADES.indexOf(a.grade);
      const gradeOrderB = GRADES.indexOf(b.grade);
      return gradeOrderA - gradeOrderB;
    });
  }, [allBidRecords, sYieldGradeFilter, sGenderFilter]);
  
  // 필터링된 데이터
  const filteredData = useMemo(() => {
    return summaryData.filter(item => {
      const matchesPart = sPartFilter === 'all' || item.partName === sPartFilter;
      const matchesGrade = sGradeFilter === 'all' || item.grade === sGradeFilter;
      return matchesPart && matchesGrade;
    });
  }, [summaryData, sPartFilter, sGradeFilter]);
  
  // 행 확장/축소
  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };
  
  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const excelData: any[] = [];
    
    filteredData.forEach(item => {
      item.records.forEach(record => {
        excelData.push({
          '기간': startDate === endDate ? startDate : `${startDate} ~ ${endDate}`,
          '상장번호': record.listingNo,
          '부위': record.partNameOriginal,
          '등급': record.gradeOriginal,
          '상장업체': record.companyName,
          '중도매인명': record.dealerName,
          '중도매인번호': record.dealerNo,
          '중량(kg)': record.weight,
          '낙찰단가(원/kg)': record.price,
          '낙찰금액(원)': record.totalPrice,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '시세 데이터');

    const fileName = `시세_데이터_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 필터 초기화
  const resetFilters = () => {
    setStartDate('2026-01-21');
    setEndDate('2026-01-21');
    setPartFilter('all');
    setGradeFilter('all');
    setYieldGradeFilter('all');
    setGenderFilter('all');
    setSPartFilter('all');
    setSGradeFilter('all');
    setSYieldGradeFilter('all');
    setSGenderFilter('all');
    setExpandedRows(new Set());
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">시세 조회</h1>
        <p className="text-sm text-gray-500 mt-1">부위별/등급별 당일 시세 데이터를 조회합니다.</p>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">기간</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          {/* 성별 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">성별</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="all">전체</option>
              {GENDERS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 부위 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">부위</span>
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="all">전체</option>
              {PARTS.map(part => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          </div>

          {/* 등급 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">등급</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="all">전체</option>
              {GRADES.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          {/* 육량등급 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">육량</span>
            <select
              value={yieldGradeFilter}
              onChange={(e) => setYieldGradeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            >
              <option value="all">전체</option>
              {YIELD_GRADES.map(yg => (
                <option key={yg} value={yg}>{yg}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs hover:bg-gray-800"
          >
            조회
          </button>

          {/* 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={resetFilters}
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
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className="w-10 px-2 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50"></th>
                <th className="w-20 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">부위</th>
                <th className="w-16 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">등급</th>
                <th className="w-20 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">낙찰건수</th>
                <th className="w-24 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">총중량(kg)</th>
                <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">평균단가</th>
                <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">최저단가</th>
                <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">최고단가</th>
                <th className="w-32 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">평균낙찰금액</th>
                <th className="w-32 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">최저낙찰금액</th>
                <th className="w-32 px-4 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50">최고낙찰금액</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500 border border-gray-200">
                    조회된 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const rowKey = `${item.partName}-${item.grade}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const hasRecords = item.count > 0;
                  
                  return (
                    <React.Fragment key={rowKey}>
                      <tr 
                        className={`transition-colors ${hasRecords ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50/50'}`}
                        onClick={() => hasRecords && toggleRow(rowKey)}
                      >
                        <td className="px-2 py-3 text-center border border-gray-200">
                          {hasRecords ? (
                            isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                            )
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-900 font-medium whitespace-nowrap">
                          {item.partName}
                        </td>
                        <td className="px-4 py-3 text-xs text-center border border-gray-200 text-gray-700 whitespace-nowrap">
                          {item.grade}
                        </td>
<td className={`px-4 py-3 text-xs text-center border border-gray-200 whitespace-nowrap ${hasRecords ? 'text-gray-900' : 'text-gray-400'}`}>
                          {item.count}
                        </td>
                        <td className={`px-4 py-3 text-xs text-center border border-gray-200 whitespace-nowrap ${hasRecords ? 'text-gray-700' : 'text-gray-400'}`}>
                          {hasRecords ? item.totalWeight.toLocaleString() : '-'}
                        </td>
                        <td className={`px-4 py-3 text-xs text-center border border-gray-200 whitespace-nowrap ${hasRecords ? 'text-gray-900' : 'text-gray-400'}`}>
                          {hasRecords ? `${item.avgPrice.toLocaleString()}원` : '-'}
                        </td>
                        <td className={`px-4 py-3 text-xs text-center border border-gray-200 whitespace-nowrap ${hasRecords ? 'text-gray-700' : 'text-gray-400'}`}>
                          {hasRecords ? `${item.minPrice.toLocaleString()}원` : '-'}
                        </td>
                        <td className={`px-4 py-3 text-xs text-center border border-gray-200 whitespace-nowrap ${hasRecords ? 'text-gray-700' : 'text-gray-400'}`}>
                          {hasRecords ? `${item.maxPrice.toLocaleString()}원` : '-'}
                        </td>
                        <td className={`px-4 py-3 text-xs text-center border border-gray-200 whitespace-nowrap ${hasRecords ? 'text-gray-900' : 'text-gray-400'}`}>
                          {hasRecords ? `${item.avgAmount.toLocaleString()}원` : '-'}
                        </td>
                        <td className={`px-4 py-3 text-xs text-center border border-gray-200 whitespace-nowrap ${hasRecords ? 'text-gray-700' : 'text-gray-400'}`}>
                          {hasRecords ? `${item.minAmount.toLocaleString()}원` : '-'}
                        </td>
                        <td className={`px-4 py-3 text-xs text-center border border-gray-200 whitespace-nowrap ${hasRecords ? 'text-gray-700' : 'text-gray-400'}`}>
                          {hasRecords ? `${item.maxAmount.toLocaleString()}원` : '-'}
                        </td>
                      </tr>
                      
                      {/* 상세 내역 */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="px-4 py-3 bg-gray-50 border border-gray-200">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              상세 내역 ({item.count}건)
                            </div>
                            <table className="w-full border border-gray-200 bg-white">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 whitespace-nowrap">상장번호</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 whitespace-nowrap">상장업체</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 whitespace-nowrap">부위</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 whitespace-nowrap">등급</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 whitespace-nowrap">중도매인번호</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 whitespace-nowrap">중도매인명</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 whitespace-nowrap">중량(kg)</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 whitespace-nowrap">낙찰단가</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center whitespace-nowrap">낙찰금액</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.records.map((record, idx) => (
                                  <tr key={`${record.listingNo}-${idx}`} className="border-t border-gray-200 hover:bg-gray-50">
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{record.listingNo}</td>
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{record.companyName}</td>
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{record.partNameOriginal}</td>
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{record.gradeOriginal}</td>
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{record.dealerNo}</td>
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{record.dealerName}</td>
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">{record.weight}</td>
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                      {record.price.toLocaleString()}원
                                    </td>
                                    <td className="px-2 py-2 text-xs text-center text-gray-700 whitespace-nowrap">
                                      {record.totalPrice.toLocaleString()}원
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 정보 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            총 {filteredData.length}개 항목
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
