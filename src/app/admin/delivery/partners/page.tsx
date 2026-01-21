'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Download, Save, ChevronUp, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateDealerSettlements, DealerSettlementData } from '@/constants/dealerSettlement';
import { DELIVERY_PARTNERS, loadAssignments, saveAssignments } from '@/constants/delivery';

// 거래처 지정 타입 (이름 또는 번호로 저장)
type PartnerInputs = Record<string, string>;

export default function DeliveryPartnersPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [settlements] = useState<DealerSettlementData[]>(generateDealerSettlements());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dealerSearch, setDealerSearch] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  
  // 부위별 거래처 입력 상태 (listingNo -> 거래처명/번호)
  const [partnerInputs, setPartnerInputs] = useState<PartnerInputs>({});
  // 저장된 거래처 상태 (저장 버튼 눌러야 반영)
  const [savedPartnerInputs, setSavedPartnerInputs] = useState<PartnerInputs>({});
  
  // 자동완성 드롭다운 상태
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 정렬 상태
  const [sortField, setSortField] = useState<'listingNo' | 'partName' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 초기 데이터 로드
  useEffect(() => {
    // 저장된 거래처번호를 불러옴
    const oldAssignments = loadAssignments();
    const converted: PartnerInputs = {};
    Object.entries(oldAssignments).forEach(([listingNo, partnerNo]) => {
      if (partnerNo) {
        // 거래처번호로 저장 (10001, 10002...)
        converted[listingNo] = partnerNo;
      }
    });
    setPartnerInputs(converted);
    setSavedPartnerInputs(converted);
  }, []);
  
  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // 입력된 거래처번호/거래처명으로 거래처 찾기 (정확히 일치해야 함)
  const findPartner = (input: string) => {
    if (!input) return null;
    const search = input.trim();
    // 거래처번호로 정확히 매칭 (예: "10001")
    const byNo = DELIVERY_PARTNERS.find(p => p.partnerNo === search);
    if (byNo) return byNo;
    // 이름으로 정확히 매칭 (예: "맛있는정육점")
    const byName = DELIVERY_PARTNERS.find(p => p.name === search);
    if (byName) return byName;
    return null;
  };
  
  // 중도매인 번호 -> dealer ID 매핑
  const getDealerIdByNo = (dealerNo: string): string => {
    const mapping: Record<string, string> = {
      '7000001': 'd1', // 김철수
      '7000002': 'd2', // 이영희
      '7000003': 'd3', // 박민수
      '7000004': 'd4', // 최지현
      '7000005': 'd5', // 정수민
    };
    return mapping[dealerNo] || '';
  };
  
  // 유사한 거래처 검색 (자동완성용) - 해당 중도매인의 활성 거래처만
  const searchPartners = (input: string, dealerNo: string) => {
    if (!input || input.trim().length === 0) return [];
    const search = input.trim().toLowerCase();
    const dealerId = getDealerIdByNo(dealerNo);
    
    return DELIVERY_PARTNERS.filter(p => 
      p.status === 'active' && 
      (p.dealer1 === dealerId || p.dealer2 === dealerId || p.dealer3 === dealerId) &&
      (p.partnerNo.includes(search) || p.name.toLowerCase().includes(search))
    );
  };
  
  // 모든 부위 데이터를 플랫하게 변환
  const allParts = useMemo(() => {
    const parts: {
      dealerNo: string;
      dealerName: string;
      listingNo: string;
      partName: string;
      grade: string;
      weight: number;
      unitPrice: number;
      amount: number;
    }[] = [];
    
    settlements.forEach(settlement => {
      settlement.bidParts.forEach(part => {
        parts.push({
          dealerNo: settlement.dealerNo,
          dealerName: settlement.dealerName,
          listingNo: part.listingNo,
          partName: part.partName,
          grade: part.grade,
          weight: part.weight,
          unitPrice: part.unitPrice,
          amount: part.amount,
        });
      });
    });
    
    return parts;
  }, [settlements]);
  
  // 필터링된 데이터
  const filteredParts = useMemo(() => {
    let result = allParts.filter(part => {
      if (dealerSearch) {
        const search = dealerSearch.toLowerCase();
        if (!part.dealerName.toLowerCase().includes(search) && !part.dealerNo.includes(dealerSearch)) {
          return false;
        }
      }
      return true;
    });
    
    // 정렬 적용
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        if (sortField === 'listingNo') {
          comparison = a.listingNo.localeCompare(b.listingNo);
        } else if (sortField === 'partName') {
          comparison = a.partName.localeCompare(b.partName);
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [allParts, dealerSearch, sortField, sortDirection]);
  
  // 정렬 토글
  const handleSort = (field: 'listingNo' | 'partName') => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // 정렬 해제
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 거래처 입력 변경
  const handleInputChange = (listingNo: string, value: string) => {
    setPartnerInputs(prev => ({
      ...prev,
      [listingNo]: value,
    }));
    setIsSaved(false);
    setActiveDropdown(listingNo);
  };
  
  // 거래처 선택 (partnerNo로 저장)
  const handleSelectPartner = (listingNo: string, partnerNo: string) => {
    setPartnerInputs(prev => ({
      ...prev,
      [listingNo]: partnerNo,
    }));
    setIsSaved(false);
    setActiveDropdown(null);
  };
  
  // 저장 (거래처번호로 저장)
  const handleSave = () => {
    const assignments: Record<string, string | null> = {};
    const validInputs: PartnerInputs = {};
    
    Object.entries(partnerInputs).forEach(([listingNo, input]) => {
      const partner = findPartner(input);
      if (partner) {
        // 거래처번호(partnerNo)로 저장
        assignments[listingNo] = partner.partnerNo;
        validInputs[listingNo] = partner.partnerNo;
      }
    });
    
    saveAssignments(assignments);
    setSavedPartnerInputs(validInputs);
    setPartnerInputs(validInputs);
    setIsSaved(true);
    alert('저장되었습니다.');
  };
  
  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const data: Record<string, string | number>[] = [];
    
    filteredParts.forEach(part => {
      const input = partnerInputs[part.listingNo] || '';
      const partner = findPartner(input);
      data.push({
        '중도매인번호': part.dealerNo,
        '중도매인명': part.dealerName,
        '상장번호': part.listingNo,
        '부위': part.partName,
        '등급': part.grade,
        '중량(kg)': part.weight,
        '입찰단가': part.unitPrice,
        '낙찰금액': part.amount,
        '거래처번호': partner?.partnerNo || input,
        '거래처명': partner?.name || '',
        '대표자': partner?.representative || '',
        '배송지': partner?.address || '',
      });
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '경락내역 거래처');
    XLSX.writeFile(wb, `경락내역_거래처_${selectedDate}.xlsx`);
  };
  
  // 테이블 스타일
  const thClass = 'px-2 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50';
  const tdClass = 'px-2 py-1.5 text-xs border border-gray-200';
  
  // 전체 통계
  const totalStats = useMemo(() => {
    const total = filteredParts.length;
    const assigned = filteredParts.filter(p => {
      const input = savedPartnerInputs[p.listingNo];
      return input && findPartner(input);
    }).length;
    return { total, assigned };
  }, [filteredParts, savedPartnerInputs]);
  
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">경락내역 거래처 지정</h1>
        
        {/* 필터 */}
        <div className="bg-white p-4 border border-gray-200 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">조회일자</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">중도매인</label>
              <input
                type="text"
                value={dealerSearch}
                onChange={(e) => setDealerSearch(e.target.value)}
                placeholder="번호 또는 이름"
                className="px-2 py-1.5 border border-gray-300 text-xs outline-none bg-white w-32"
              />
            </div>
            <div className="text-xs text-gray-600">
              거래처 지정: <span className={totalStats.assigned === totalStats.total ? 'text-blue-600 font-semibold' : 'text-gray-900'}>{totalStats.assigned}/{totalStats.total}</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setDealerSearch('');
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
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-white text-xs ${isSaved ? 'bg-gray-400' : 'bg-gray-700 hover:bg-gray-800'}`}
              >
                <Save className="w-3.5 h-3.5" />
                저장
              </button>
            </div>
          </div>
        </div>
        
        {/* 테이블 */}
        <div className="bg-white border border-gray-200" ref={dropdownRef}>
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className={`${thClass} w-[75px]`}>중도매인번호</th>
                <th className={`${thClass} w-[65px]`}>중도매인명</th>
                <th 
                  className={`${thClass} w-[115px] cursor-pointer hover:bg-gray-100`}
                  onClick={() => handleSort('listingNo')}
                >
                  <div className="flex items-center justify-center gap-1">
                    상장번호
                    {sortField === 'listingNo' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <span className="w-3 h-3 text-gray-300">↕</span>
                    )}
                  </div>
                </th>
                <th 
                  className={`${thClass} w-[70px] cursor-pointer hover:bg-gray-100`}
                  onClick={() => handleSort('partName')}
                >
                  <div className="flex items-center justify-center gap-1">
                    부위
                    {sortField === 'partName' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <span className="w-3 h-3 text-gray-300">↕</span>
                    )}
                  </div>
                </th>
                <th className={`${thClass} w-[50px]`}>등급</th>
                <th className={`${thClass} w-[50px]`}>중량</th>
                <th className={`${thClass} w-[70px]`}>입찰단가</th>
                <th className={`${thClass} w-[85px]`}>낙찰금액</th>
                <th className={`${thClass} w-[70px]`}>거래처번호</th>
                <th className={`${thClass} w-[100px]`}>거래처명</th>
                <th className={`${thClass} w-[60px]`}>대표자</th>
                <th className={`${thClass}`}>배송지</th>
                <th className={`${thClass} w-[65px]`}>수정</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part, idx) => {
                const input = partnerInputs[part.listingNo] || '';
                const savedInput = savedPartnerInputs[part.listingNo] || '';
                const savedPartner = findPartner(savedInput);
                const currentPartner = findPartner(input);
                const suggestions = activeDropdown === part.listingNo ? searchPartners(input, part.dealerNo) : [];
                const showDropdown = activeDropdown === part.listingNo && suggestions.length > 0 && !currentPartner;
                
                return (
                  <tr key={`${part.listingNo}-${idx}`} className="hover:bg-gray-50">
                    <td className={`${tdClass} text-center`}>{part.dealerNo}</td>
                    <td className={`${tdClass} text-center`}>{part.dealerName}</td>
                    <td className={`${tdClass} text-center`}>{part.listingNo}</td>
                    <td className={`${tdClass} text-center`}>{part.partName}</td>
                    <td className={`${tdClass} text-center`}>{part.grade}</td>
                    <td className={`${tdClass} text-right`}>{part.weight.toFixed(1)}</td>
                    <td className={`${tdClass} text-right`}>{part.unitPrice.toLocaleString()}</td>
                    <td className={`${tdClass} text-right`}>{part.amount.toLocaleString()}</td>
                    <td className={`${tdClass} relative text-center`}>
                      {savedPartner ? (
                        <span className="text-xs">{savedPartner.partnerNo}</span>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => handleInputChange(part.listingNo, e.target.value)}
                            onFocus={() => setActiveDropdown(part.listingNo)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                                setActiveDropdown(null);
                              }
                            }}
                            placeholder="번호/이름"
                            className={`w-full px-1 py-0.5 border text-xs outline-none bg-white text-center ${
                              input && !currentPartner ? 'border-red-300' : currentPartner ? 'border-green-400' : 'border-gray-200'
                            }`}
                          />
                          {/* 자동완성 드롭다운 */}
                          {showDropdown && (
                            <div className="absolute left-0 top-full z-50 w-48 bg-white border border-gray-300 shadow-lg max-h-40 overflow-y-auto">
                              {suggestions.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectPartner(part.listingNo, p.partnerNo)}
                                  className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="font-medium">{p.partnerNo}</span>
                                  <span className="text-gray-500 ml-2">{p.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className={`${tdClass} text-center text-gray-500`}>
                      {savedPartner?.name || currentPartner?.name || '-'}
                    </td>
                    <td className={`${tdClass} text-center text-gray-500`}>
                      {savedPartner?.representative || currentPartner?.representative || '-'}
                    </td>
                    <td className={`${tdClass} text-gray-500 truncate`}>
                      {savedPartner?.address || currentPartner?.address || '-'}
                    </td>
                    <td className={`${tdClass} text-center`}>
                      {savedPartner && (
                        <button
                          type="button"
                          onClick={() => {
                            setPartnerInputs(prev => ({ ...prev, [part.listingNo]: '' }));
                            setSavedPartnerInputs(prev => {
                              const newState = { ...prev };
                              delete newState[part.listingNo];
                              return newState;
                            });
                            setIsSaved(false);
                          }}
                          className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          수정
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-400 text-sm">
                    조회된 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
