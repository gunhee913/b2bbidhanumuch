'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import DealerLayout from '@/components/dealer/DealerLayout';
import { Download, Save, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useRealtimeDelivery } from '@/hooks/useRealtimeDelivery';

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

interface Partner {
  id: string;
  partnerNo: string;
  name: string;
  representative: string;
  phone: string;
  address: string;
  status: string;
  dealer1: { id: string; dealerNo: string; name: string } | null;
  dealer2: { id: string; dealerNo: string; name: string } | null;
  dealer3: { id: string; dealerNo: string; name: string } | null;
}

interface AssignmentInfo {
  id: string;
  partnerId: string;
  partnerNo: string;
  partnerName: string;
  representative: string;
  phone: string;
  address: string;
}

type PartnerInputs = Record<string, string>;

export default function DealerDeliveryPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: session } = useSession();
  const dealerId = session?.dealer?.id || '';
  const dealerName = session?.dealer?.name || session?.employee?.name || '중도매인';
  const queryClient = useQueryClient();

  useRealtimeDelivery({
    onAssignmentChange: () => {
      queryClient.invalidateQueries({ queryKey: ['dealer-delivery-assignments'] });
    },
    enabled: !!dealerId,
  });

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isSaved, setIsSaved] = useState(true);

  const [sSelectedDate, setSSelectedDate] = useState(todayStr);

  const handleSearch = () => {
    setSSelectedDate(selectedDate);
  };

  const [partnerInputs, setPartnerInputs] = useState<PartnerInputs>({});
  const [savedAssignments, setSavedAssignments] = useState<Record<string, AssignmentInfo>>({});

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [sortField, setSortField] = useState<'listingNo' | 'partName' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: partsData, isLoading: partsLoading } = useQuery<{ winningParts: WinningPart[] }>({
    queryKey: ['dealer-delivery-winning-parts', sSelectedDate, dealerId],
    queryFn: async () => {
      const res = await fetch(`/api/delivery/winning-parts?date=${sSelectedDate}&dealerId=${dealerId}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!dealerId,
  });

  const { data: partnersData } = useQuery<{ partners: Partner[] }>({
    queryKey: ['partners-active'],
    queryFn: async () => {
      const res = await fetch('/api/partners?status=active');
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const { data: assignmentsData } = useQuery<{ assignments: Record<string, AssignmentInfo> }>({
    queryKey: ['dealer-delivery-assignments', sSelectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/delivery/assignments?date=${sSelectedDate}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    refetchInterval: 5000,
  });

  const winningParts = partsData?.winningParts || [];
  const partners = partnersData?.partners || [];

  useEffect(() => {
    if (assignmentsData?.assignments) {
      setSavedAssignments(assignmentsData.assignments);
      const inputs: PartnerInputs = {};
      Object.entries(assignmentsData.assignments).forEach(([partId, info]) => {
        inputs[partId] = info.partnerNo;
      });
      setPartnerInputs(inputs);
      setIsSaved(true);
    }
  }, [assignmentsData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const findPartner = (input: string): Partner | null => {
    if (!input) return null;
    const search = input.trim();
    const byNo = partners.find(p => p.partnerNo === search);
    if (byNo) return byNo;
    const byName = partners.find(p => p.name === search);
    if (byName) return byName;
    return null;
  };

  const searchPartners = (input: string) => {
    if (!input || input.trim().length === 0) return [];
    const search = input.trim().toLowerCase();
    return partners.filter(p =>
      p.status === 'active' &&
      (p.dealer1?.id === dealerId || p.dealer2?.id === dealerId || p.dealer3?.id === dealerId) &&
      (p.partnerNo.includes(search) || p.name.toLowerCase().includes(search))
    );
  };

  const filteredParts = useMemo(() => {
    let result = [...winningParts];

    if (sortField) {
      result = result.sort((a, b) => {
        let comparison = 0;
        if (sortField === 'listingNo') {
          comparison = (a.listingPartNo || '').localeCompare(b.listingPartNo || '', undefined, { numeric: true });
        } else if (sortField === 'partName') {
          comparison = a.partName.localeCompare(b.partName);
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [winningParts, sortField, sortDirection]);

  const handleSort = (field: 'listingNo' | 'partName') => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleInputChange = (partId: string, value: string) => {
    setPartnerInputs(prev => ({ ...prev, [partId]: value }));
    setIsSaved(false);
    setActiveDropdown(partId);
  };

  const handleSelectPartner = (partId: string, partnerNo: string) => {
    setPartnerInputs(prev => ({ ...prev, [partId]: partnerNo }));
    setIsSaved(false);
    setActiveDropdown(null);
  };

  const handleSave = async () => {
    const assignments: Record<string, string | null> = {};

    Object.entries(partnerInputs).forEach(([partId, input]) => {
      const partner = findPartner(input);
      if (partner) {
        assignments[partId] = partner.id;
      }
    });

    Object.keys(savedAssignments).forEach(partId => {
      if (!assignments[partId] && !partnerInputs[partId]) {
        assignments[partId] = null;
      }
    });

    if (Object.keys(assignments).length === 0) {
      alert('저장할 변경사항이 없습니다.');
      return;
    }

    try {
      const res = await fetch('/api/delivery/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments, assignedBy: dealerName }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '저장 실패');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['dealer-delivery-assignments'] });
      setIsSaved(true);
      alert('저장되었습니다.');
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleExcelDownload = () => {
    const data: Record<string, string | number>[] = [];

    filteredParts.forEach(part => {
      const input = partnerInputs[part.partId] || '';
      const savedInfo = savedAssignments[part.partId];
      const currentPartner = findPartner(input);
      const partner = savedInfo || (currentPartner ? {
        partnerNo: currentPartner.partnerNo,
        partnerName: currentPartner.name,
        representative: currentPartner.representative || '',
        address: currentPartner.address || '',
      } : null);

      data.push({
        '상장번호': part.listingPartNo || '',
        '부위': part.partName,
        '등급': part.grade,
        '중량(kg)': part.weight,
        '입찰단가': part.bidPrice,
        '낙찰금액': part.bidAmount,
        '거래처코드': partner?.partnerNo || '',
        '거래처명': partner?.partnerName || '',
        '대표자': partner?.representative || '',
        '배송지': partner?.address || '',
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '경락내역 거래처');
    XLSX.writeFile(wb, `${dealerName}_경락내역_거래처_${selectedDate}.xlsx`);
  };

  const thClass = 'px-2 py-1.5 text-center text-xs font-semibold text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50';
  const tdClass = 'px-2 py-1.5 text-xs border border-gray-200';

  const totalStats = useMemo(() => {
    const total = filteredParts.length;
    const assigned = filteredParts.filter(p => !!savedAssignments[p.partId]).length;
    return { total, assigned };
  }, [filteredParts, savedAssignments]);

  return (
    <DealerLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">경락내역 거래처 지정</h1>

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
            <div className="text-xs text-gray-600">
              거래처 지정: <span className={totalStats.assigned === totalStats.total && totalStats.total > 0 ? 'text-blue-600 font-semibold' : 'text-gray-900'}>{totalStats.assigned}/{totalStats.total}</span>
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
                onClick={() => { setSelectedDate(todayStr); setSSelectedDate(todayStr); }}
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

        <div className="bg-white border border-gray-200" ref={dropdownRef}>
          {partsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
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
                  <th className={`${thClass} w-[70px]`}>거래처코드</th>
                  <th className={`${thClass} w-[100px]`}>거래처명</th>
                  <th className={`${thClass} w-[60px]`}>대표자</th>
                  <th className={`${thClass}`}>배송지</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part) => {
                  const input = partnerInputs[part.partId] || '';
                  const saved = savedAssignments[part.partId];
                  const currentPartner = findPartner(input);
                  const suggestions = activeDropdown === part.partId ? searchPartners(input) : [];
                  const showDropdown = activeDropdown === part.partId && suggestions.length > 0 && !currentPartner;

                  return (
                    <tr key={part.partId} className="hover:bg-gray-50">
                      <td className={`${tdClass} text-center`}>{part.listingPartNo}</td>
                      <td className={`${tdClass} text-center`}>{part.partName}</td>
                      <td className={`${tdClass} text-center`}>{part.grade}</td>
                      <td className={`${tdClass} text-right`}>{part.weight.toFixed(1)}</td>
                      <td className={`${tdClass} text-right`}>{part.bidPrice.toLocaleString()}</td>
                      <td className={`${tdClass} text-right`}>{part.bidAmount.toLocaleString()}</td>
                      <td className={`${tdClass} relative text-center`}>
                        {saved ? (
                          <span className="text-xs">{saved.partnerNo}</span>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={input}
                              onChange={(e) => handleInputChange(part.partId, e.target.value)}
                              onFocus={() => setActiveDropdown(part.partId)}
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
                            {showDropdown && (
                              <div className="absolute left-0 top-full z-50 w-48 bg-white border border-gray-300 shadow-lg max-h-40 overflow-y-auto">
                                {suggestions.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectPartner(part.partId, p.partnerNo)}
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
                        {saved?.partnerName || currentPartner?.name || '-'}
                      </td>
                      <td className={`${tdClass} text-center text-gray-500`}>
                        {saved?.representative || currentPartner?.representative || '-'}
                      </td>
                      <td className={`${tdClass} text-gray-500 truncate`}>
                        {saved?.address || currentPartner?.address || '-'}
                      </td>
                    </tr>
                  );
                })}

                {!partsLoading && filteredParts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                      조회된 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DealerLayout>
  );
}
