'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChevronDown, ChevronUp, RefreshCw, Square, Timer, Play, FileText } from 'lucide-react';
import { useLiveListings } from '@/features/listings/hooks';
import { useCompanies } from '@/features/companies/hooks';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

// 입찰 내역 타입
interface BidRecord {
  id: string;
  bidId: string; // DB의 실제 bid id
  dealerNo: string;
  dealerName: string;
  bidPrice: number;
  bidTime: string;
  rank: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

// 경매 항목 타입
interface AuctionItem {
  id: string;
  partId: string;
  listingId: string;
  listingNo: string;
  partName: string;
  companyName: string;
  grade: string;
  weight: number;
  minPrice: number;
  currentHighestBid: number;
  bidCount: number;
  bids: BidRecord[];
  status: string;
}

// 등급 포맷팅: 1++ 등급만 marblingScore 표시
const formatGrade = (grade: string, marblingScore: number | null) => {
  if (!grade) return '';
  if (grade.includes('(')) return grade;
  if (marblingScore && grade.startsWith('1++')) {
    return `${grade}(${marblingScore})`;
  }
  return grade;
};

export default function AuctionLivePage() {
  const { data: session } = useSession();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // 조회 날짜 상태
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [bidFilter, setBidFilter] = useState('all');
  const [showSubtotal, setShowSubtotal] = useState(true);
  
  // 마감 모달
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingListingId, setClosingListingId] = useState<string | null>(null);

  // 인라인 편집
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 수정이력 모달 (관리자 수정/삭제만)
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // 비밀번호 모달
  const [pwModal, setPwModal] = useState<{
    type: 'edit' | 'delete';
    bidId: string;
    minPrice?: number;
    dealerName?: string;
    isTopBid?: boolean;
  } | null>(null);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');

  // 부위별 딜러 변경이력
  const [partAuditLogs, setPartAuditLogs] = useState<Record<string, any[]>>({});
  const [allDealerAuditLogs, setAllDealerAuditLogs] = useState<Record<string, any[]>>({});

  // 오늘 날짜인지 확인
  const isToday = selectedDate === todayStr;

  // --- 경매 관련 ---
  const [isClosingRound, setIsClosingRound] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isStartingAuction, setIsStartingAuction] = useState(false);
  const [auctionDurationMin, setAuctionDurationMin] = useState<number | ''>(20);

  // 현재 회차 조회 (5초 간격)
  const { data: roundData, refetch: refetchRound } = useQuery({
    queryKey: ['rounds', 'current'],
    queryFn: async () => {
      const res = await fetch('/api/auctions/rounds/current');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 5000,
  });

  const currentRound = roundData?.currentRound;
  const lastClosedRound = roundData?.lastClosedRound;
  const allRounds = roundData?.allRounds || [];
  const totalRounds = roundData?.totalRounds || 0;

  useEffect(() => {
    if (!currentRound?.started_at) {
      setRemainingSeconds(null);
      return;
    }

    const hasDuration = !!currentRound.round_duration_min;

    const calculateRemaining = () => {
      const now = Date.now();
      const startedAt = new Date(currentRound.started_at).getTime();

      if (hasDuration) {
        const durationMs = currentRound.round_duration_min * 60 * 1000;
        const endTime = startedAt + durationMs;
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setRemainingSeconds(remaining);
        if (remaining <= 0) {
          handleCloseCurrentRound();
        }
      } else {
        const elapsed = Math.floor((now - startedAt) / 1000);
        setRemainingSeconds(elapsed);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [currentRound?.started_at, currentRound?.round_duration_min, currentRound?.id]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 현재 회차 수동 마감
  const handleCloseCurrentRound = useCallback(async () => {
    if (!currentRound?.id || isClosingRound) return;
    setIsClosingRound(true);
    try {
      await fetch(`/api/auctions/${currentRound.id}/close`, { method: 'POST' });
      refetchRound();
    } catch (err) {
      console.error('회차 마감 오류:', err);
    } finally {
      setIsClosingRound(false);
    }
  }, [currentRound?.id, isClosingRound, refetchRound]);

  // API Hooks - 경매 없이 승인된 상장 직접 조회
  const { data: liveData, isLoading, refetch } = useLiveListings(
    { listingDate: selectedDate },
    { refetchInterval: isToday ? 5000 : false } // 오늘이면 5초마다 새로고침
  );
  const { data: companiesData } = useCompanies();

  // 날짜별 전체 딜러 변경이력 로드
  useEffect(() => {
    fetch(`/api/bids/audit-logs?date=${selectedDate}&actionTypes=dealer_update,dealer_cancel`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => {
        const grouped: Record<string, any[]> = {};
        data.forEach((log: any) => {
          const pid = log.partId || log.part_id;
          if (pid) {
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push(log);
          }
        });
        setAllDealerAuditLogs(grouped);
        setPartAuditLogs(grouped);
      })
      .catch(() => {});
  }, [selectedDate, liveData]);

  const handleStartAuction = useCallback(async () => {
    if (isStartingAuction) return;
    const duration = auctionDurationMin || undefined;
    const msg = duration
      ? `${selectedDate} 경매를 시작하시겠습니까? (${duration}분)`
      : `${selectedDate} 경매를 시작하시겠습니까? (수동 종료)`;
    if (!confirm(msg)) return;
    setIsStartingAuction(true);
    try {
      const res = await fetch('/api/auctions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionDate: selectedDate, durationMin: duration }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '경매 시작 실패');
        return;
      }
      refetchRound();
      refetch();
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsStartingAuction(false);
    }
  }, [isStartingAuction, auctionDurationMin, selectedDate, refetchRound, refetch]);

  // 경매 항목 데이터 변환
  const auctionItems: AuctionItem[] = useMemo(() => {
    if (!liveData?.listings) return [];
    
    const items: AuctionItem[] = [];
    liveData.listings.forEach((listing: any) => {
      listing.parts?.forEach((part: any) => {
        items.push({
          id: `${listing.id}-${part.id}`,
          partId: part.id,
          listingId: listing.id,
          listingNo: part.listingPartNo || `${listing.listingNo}-${String(part.partNo).padStart(2, '0')}`,
          partName: part.partName,
          companyName: listing.companyName || '',
          grade: formatGrade(listing.grade || '', listing.marblingScore),
          weight: part.weight || 0,
          minPrice: part.minPrice || 0,
          currentHighestBid: part.highestBid?.bidPrice || 0,
          bidCount: part.bidCount || 0,
          status: listing.status || '',
          bids: (part.allBids || []).map((bid: any, idx: number) => ({
            id: `${part.id}-${idx}`,
            bidId: bid.id, // DB의 실제 bid id
            dealerNo: bid.dealerNo || '',
            dealerName: bid.dealerName || '',
            bidPrice: bid.bidPrice,
            bidTime: bid.bidAt ? format(new Date(bid.bidAt), 'yy.MM.dd HH:mm:ss') : '',
            rank: idx + 1,
            updatedAt: bid.updatedAt ? format(new Date(bid.updatedAt), 'yy.MM.dd HH:mm:ss') : null,
            updatedBy: bid.updatedBy || null,
          })),
        });
      });
    });
    return items;
  }, [liveData]);

  // 필터링
  const filteredItems = useMemo(() => {
    return auctionItems.filter(item => {
      const companyMatch = companyFilter === 'all' || item.companyName === companyFilter;
      const bidMatch = bidFilter === 'all' 
        || (bidFilter === 'withBids' && item.bidCount > 0)
        || (bidFilter === 'withoutBids' && item.bidCount === 0);
      return companyMatch && bidMatch;
    });
  }, [auctionItems, companyFilter, bidFilter]);

  // 개체번호 추출 (260205-201-01 -> 201)
  const getCattleNo = (listingNo: string): string => {
    const parts = listingNo.split('-');
    return parts.length >= 2 ? parts[1] : '';
  };

  // 개체별 그룹화
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const cattleNo = getCattleNo(item.listingNo);
      if (!acc[cattleNo]) {
        acc[cattleNo] = [];
      }
      acc[cattleNo].push(item);
      return acc;
    }, {} as Record<string, AuctionItem[]>);
  }, [filteredItems]);

  const sortedCattleNos = Object.keys(groupedItems).sort((a, b) => parseInt(a) - parseInt(b));

  // 통계 (API에서 제공하는 것 사용)
  const stats = liveData?.stats || {
    totalParts: 0,
    partsWithBids: 0,
    partsWithoutBids: 0,
    totalBidAmount: 0,
  };

  const toggleItem = (itemId: string, partId?: string) => {
    const isExpanding = !expandedItems.includes(itemId);
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
    if (isExpanding && partId && !partAuditLogs[partId]) {
      fetch(`/api/bids/audit-logs?date=${selectedDate}&partId=${partId}&actionTypes=dealer_update,dealer_cancel`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setPartAuditLogs(prev => ({ ...prev, [partId]: data })))
        .catch(() => {});
    }
  };

  // 상장 마감 (낙찰 처리)
  const handleCloseListing = async () => {
    if (!closingListingId) return;
    
    try {
      const response = await fetch(`/api/listings/${closingListingId}/close`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '마감 처리 실패');
      }
      
      setShowCloseModal(false);
      setClosingListingId(null);
      refetch();
    } catch (error: any) {
      alert(error.message || '마감 처리 실패');
    }
  };

  // 전체 마감 (유찰 포함 모든 상장)
  const handleCloseAll = async () => {
    // 모든 상장 마감 (입찰 유무 상관없이)
    const listingIds = [...new Set(filteredItems.map(i => i.listingId))];
    
    if (listingIds.length === 0) {
      alert('마감할 상장이 없습니다.');
      return;
    }

    const withBids = filteredItems.filter(i => i.bidCount > 0).length;
    const withoutBids = filteredItems.length - withBids;

    if (!confirm(`${listingIds.length}개 상장을 마감하시겠습니까?\n(낙찰: ${withBids}건, 유찰: ${withoutBids}건)`)) return;

    try {
      let successCount = 0;
      let failCount = 0;
      const maxRetries = 2;

      for (const listingId of listingIds) {
        let ok = false;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const res = await fetch(`/api/listings/${listingId}/close`, { method: 'POST' });
            if (res.ok) {
              ok = true;
              break;
            }
            const data = await res.json().catch(() => ({}));
            if (attempt < maxRetries && data.error?.includes('fetch failed')) {
              await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
              continue;
            }
            console.error(`마감 실패 (${listingId}):`, data.error);
          } catch {
            if (attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
              continue;
            }
          }
          break;
        }
        if (ok) successCount++;
        else failCount++;
      }

      refetch();
      if (failCount > 0) {
        alert(`마감 완료: 성공 ${successCount}건, 실패 ${failCount}건`);
      } else {
        alert('마감이 완료되었습니다.');
      }
    } catch (error: any) {
      alert(error.message || '마감 처리 중 오류 발생');
    }
  };

  // 마감 취소
  const handleReopenAll = async () => {
    const closedListingIds = [...new Set(filteredItems.filter(i => i.status === 'closed' || i.status === 'completed').map(i => i.listingId))];
    
    if (closedListingIds.length === 0) {
      alert('마감 취소할 상장이 없습니다.');
      return;
    }

    if (!confirm(`${closedListingIds.length}개 상장의 마감을 취소하시겠습니까?`)) return;

    try {
      let successCount = 0;
      let errorMessage = '';
      
      for (const listingId of closedListingIds) {
        const response = await fetch(`/api/listings/${listingId}/reopen`, { method: 'POST' });
        const data = await response.json();
        
        if (!response.ok) {
          errorMessage = data.error || '마감 취소 중 오류 발생';
          break; // 에러 발생 시 중단
        }
        successCount++;
      }
      
      refetch();
      
      if (errorMessage) {
        alert(`${successCount}개 취소 완료.\n\n오류: ${errorMessage}`);
      } else {
        alert('마감 취소가 완료되었습니다.');
      }
    } catch (error: any) {
      alert(error.message || '마감 취소 중 오류 발생');
    }
  };

  // 새로고침
  const handleRefresh = () => {
    refetch();
  };

  // 숫자만 추출
  const parseNumber = (value: string) => {
    return value.replace(/[^0-9]/g, '');
  };

  // 인라인 편집 시작
  const startEdit = (bidId: string, currentPrice: number) => {
    setEditingBidId(bidId);
    setEditPrice(currentPrice.toString());
  };

  // 인라인 편집 취소
  const cancelEdit = () => {
    setEditingBidId(null);
    setEditPrice('');
  };

  // 인라인 편집 저장 (비밀번호 모달 열기)
  const saveEdit = (bidId: string, minPrice: number) => {
    const price = parseInt(parseNumber(editPrice), 10);
    if (isNaN(price) || price <= 0) {
      alert('유효한 입찰가를 입력해주세요.');
      return;
    }

    if (price < minPrice) {
      alert(`최저가(${minPrice.toLocaleString()}원) 이상으로 입력해주세요.`);
      return;
    }

    setPwInput('');
    setPwError('');
    setPwModal({ type: 'edit', bidId, minPrice });
  };

  // 입찰 삭제 (비밀번호 모달 열기)
  const handleDeleteBid = (bidId: string, dealerName: string, isTopBid: boolean) => {
    const warningMsg = isTopBid 
      ? `⚠️ [${dealerName}]님의 입찰은 현재 1위입니다.\n정말 삭제하시겠습니까?`
      : `[${dealerName}]님의 입찰을 삭제하시겠습니까?`;
    
    if (!confirm(warningMsg)) return;

    setPwInput('');
    setPwError('');
    setPwModal({ type: 'delete', bidId, dealerName, isTopBid });
  };

  // 비밀번호 확인 후 실행
  const handlePwConfirm = async () => {
    if (!pwModal) return;
    if (!pwInput.trim()) {
      setPwError('비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setPwError('');

    try {
      if (pwModal.type === 'edit') {
        const price = parseInt(parseNumber(editPrice), 10);
        const response = await fetch(`/api/bids/${pwModal.bidId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bidPrice: price,
            updatedBy: session?.user?.name || '관리자',
            adminPassword: pwInput,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          if (response.status === 403) {
            setPwError(error.error || '비밀번호가 일치하지 않습니다.');
            return;
          }
          throw new Error(error.error || '수정 실패');
        }

        setEditingBidId(null);
        setEditPrice('');
      } else {
        const response = await fetch(`/api/bids/${pwModal.bidId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAdmin: true, adminPassword: pwInput, performedBy: session?.user?.name || '관리자' }),
        });

        if (!response.ok) {
          const error = await response.json();
          if (response.status === 403) {
            setPwError(error.error || '비밀번호가 일치하지 않습니다.');
            return;
          }
          throw new Error(error.error || '삭제 실패');
        }
      }

      setPwModal(null);
      setPwInput('');
      setPartAuditLogs({});
      refetch();
    } catch (error: any) {
      alert(error.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/bids/audit-logs?date=${selectedDate}&actionTypes=update,delete`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const thClass = "px-2 py-1.5 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경매 현황(실시간)</h1>
        <p className="text-sm text-gray-500 mt-1">승인된 상장의 입찰 현황을 실시간으로 확인합니다.</p>
      </div>

      {/* 필터 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">조회일자</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={todayStr}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">상장업체</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[120px]"
            >
              <option value="all">전체</option>
              {companiesData?.map((company: any) => (
                <option key={company.id} value={company.name}>{company.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">입찰상태</span>
            <select
              value={bidFilter}
              onChange={(e) => setBidFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 text-xs outline-none bg-white min-w-[100px]"
            >
              <option value="all">전체</option>
              <option value="withBids">입찰 있음</option>
              <option value="withoutBids">입찰 없음</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showSubtotal}
                onChange={(e) => setShowSubtotal(e.target.checked)}
                className="w-4 h-4 rounded appearance-none bg-white border border-gray-300 checked:bg-gray-700 checked:border-gray-700 relative
                  after:content-['✓'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-xs after:font-bold after:opacity-0 checked:after:opacity-100"
              />
              <span className="text-xs text-gray-600">개체별 소계</span>
            </label>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              새로고침
            </button>

            <button
              type="button"
              onClick={() => {
                fetchAuditLogs();
                setShowAuditModal(true);
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              수정이력
            </button>

            {/* 전체 마감 버튼 */}
            {filteredItems.length > 0 && !filteredItems.every(i => i.status === 'closed' || i.status === 'completed') && (
              <button
                onClick={handleCloseAll}
                className="px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 flex items-center gap-1"
              >
                <Square className="w-3 h-3" />
                전체 마감
              </button>
            )}

            {/* 마감 취소 버튼 */}
            {filteredItems.some(i => i.status === 'closed' || i.status === 'completed') && (
              <button
                onClick={handleReopenAll}
                className="px-4 py-1.5 bg-red-600 text-white text-xs hover:bg-red-700 flex items-center gap-1"
              >
                마감 취소
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 경매 컨트롤 패널 */}
      <div className="bg-white border border-gray-200 p-4 mb-4">
        {currentRound ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded">
                {currentRound.round_no}차 경매 진행중
              </span>
              {remainingSeconds != null && (
                <div className="flex items-center gap-2">
                  <Timer className={`w-4 h-4 ${
                    currentRound.round_duration_min
                      ? (remainingSeconds <= 60 ? 'text-red-500' : 'text-gray-500')
                      : 'text-blue-500'
                  }`} />
                  <span
                    className={`text-2xl font-mono font-bold tabular-nums ${
                      currentRound.round_duration_min
                        ? (remainingSeconds <= 60 ? 'text-red-600' : remainingSeconds <= 120 ? 'text-orange-500' : 'text-gray-900')
                        : 'text-blue-600'
                    }`}
                  >
                    {formatTimer(remainingSeconds)}
                  </span>
                  {!currentRound.round_duration_min && (
                    <span className="text-xs text-blue-500 font-medium">경과</span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleCloseCurrentRound}
              disabled={isClosingRound}
              className="px-4 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Square className="w-3 h-3" />
              경매 종료
            </button>
          </div>
        ) : lastClosedRound ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded">
                {lastClosedRound.round_no}차 종료
              </span>
              <span className="text-xs text-gray-500">
                다음 차수를 시작하거나 전체 마감할 수 있습니다.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={auctionDurationMin}
                  onChange={(e) => setAuctionDurationMin(e.target.value ? parseInt(e.target.value) : '')}
                  min={1}
                  placeholder="수동"
                  className="w-16 px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500">분</span>
              </div>
              <button
                type="button"
                onClick={handleStartAuction}
                disabled={isStartingAuction}
                className="px-4 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                {isStartingAuction ? '시작 중...' : `${lastClosedRound.round_no + 1}차 시작`}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {isToday ? '경매가 아직 시작되지 않았습니다.' : `${selectedDate} 경매 현황`}
              </span>
            </div>
            {isToday && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={auctionDurationMin}
                    onChange={(e) => setAuctionDurationMin(e.target.value ? parseInt(e.target.value) : '')}
                    min={1}
                    placeholder="수동"
                    className="w-16 px-2 py-1.5 border border-gray-200 text-xs outline-none bg-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-500">분</span>
                </div>
                <button
                  type="button"
                  onClick={handleStartAuction}
                  disabled={isStartingAuction}
                  className="px-4 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  {isStartingAuction ? '시작 중...' : '경매 시작'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">총 부위</div>
          <div className="text-xl font-bold text-gray-900">{stats.totalParts}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">입찰 있음</div>
          <div className="text-xl font-bold text-green-600">{stats.partsWithBids}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">입찰 없음</div>
          <div className="text-xl font-bold text-gray-400">{stats.partsWithoutBids}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">현재 총 입찰금액</div>
          <div className="text-xl font-bold text-gray-900">{stats.totalBidAmount.toLocaleString()}원</div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white border border-gray-200 p-8 text-center text-gray-500">
          데이터를 불러오는 중...
        </div>
      )}

      {/* 데이터 없음 */}
      {!isLoading && auctionItems.length === 0 && (
        <div className="bg-white border border-gray-200 p-8 text-center text-gray-500">
          {selectedDate}에 승인된 상장이 없습니다.
        </div>
      )}

      {/* 경매 현황 테이블 */}
      {!isLoading && auctionItems.length > 0 && (
        <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse table-fixed">
            <thead className="sticky top-0">
              <tr>
                <th className={`${thClass} w-[30px]`}></th>
                <th className={`${thClass} w-[120px]`}>상장번호</th>
                <th className={`${thClass} w-[90px]`}>상장업체</th>
                <th className={`${thClass} w-[80px]`}>부위</th>
                <th className={`${thClass} w-[60px]`}>등급</th>
                <th className={`${thClass} w-[60px]`}>중량</th>
                <th className={`${thClass} w-[80px]`}>최저가격</th>
                <th className={`${thClass} w-[90px]`}>최고입찰가격</th>
                <th className={`${thClass} w-[100px]`}>총입찰가격</th>
                <th className={`${thClass} w-[80px]`}>중도매인명</th>
                <th className={`${thClass} w-[60px]`}>입찰수</th>
                <th className={`${thClass} w-[60px]`}>변경이력</th>
              </tr>
            </thead>
            <tbody>
              {sortedCattleNos.map((cattleNo, cattleIdx) => {
                const cattleItems = groupedItems[cattleNo];
                const subtotalWeight = cattleItems.reduce((sum, item) => sum + item.weight, 0);
                const subtotalBidAmount = cattleItems.reduce((sum, item) => sum + (item.currentHighestBid * item.weight), 0);
                const subtotalBidCount = cattleItems.reduce((sum, item) => sum + item.bidCount, 0);
                const itemsWithBidsInCattle = cattleItems.filter(item => item.bidCount > 0).length;

                return (
                  <React.Fragment key={cattleNo}>
                    {cattleItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleItem(item.id, item.partId)}
                        >
                          <td className={tdClass}>
                            {expandedItems.includes(item.id) 
                              ? <ChevronUp className="w-4 h-4 mx-auto text-gray-400" />
                              : <ChevronDown className="w-4 h-4 mx-auto text-gray-400" />
                            }
                          </td>
                          <td className={`${tdClass} text-[10px] text-gray-600`}>{item.listingNo}</td>
                          <td className={tdClass}>{item.companyName}</td>
                          <td className={tdClass}>{item.partName}</td>
                          <td className={tdClass}>{item.grade}</td>
                          <td className={`${tdClass} text-right`}>{item.weight.toFixed(1)}</td>
                          <td className={`${tdClass} text-right`}>{item.minPrice.toLocaleString()}</td>
                          <td className={`${tdClass} text-right font-semibold ${item.currentHighestBid > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {item.currentHighestBid > 0 ? item.currentHighestBid.toLocaleString() : '-'}
                          </td>
                          <td className={`${tdClass} text-right font-semibold ${item.currentHighestBid > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {item.currentHighestBid > 0 ? Math.round(item.currentHighestBid * item.weight).toLocaleString() : '-'}
                          </td>
                          <td className={`${tdClass} ${item.bids.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {item.bids.length > 0 ? item.bids[0].dealerName : '-'}
                          </td>
                          <td className={`${tdClass} ${item.bidCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                            {item.bidCount}
                          </td>
                          <td className={`${tdClass} ${(allDealerAuditLogs[item.partId]?.length || 0) > 0 ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                            {(allDealerAuditLogs[item.partId]?.length || 0) > 0 ? allDealerAuditLogs[item.partId].length : '-'}
                          </td>
                        </tr>
                        {/* 입찰 내역 펼침 */}
                        {expandedItems.includes(item.id) && (
                          <tr>
                            <td colSpan={12} className="p-0">
                              <div className="p-3 border-t border-gray-200 bg-gray-50">
                                <div className="text-xs font-semibold text-gray-700 mb-2">입찰 내역 ({item.bids.length}건{(partAuditLogs[item.partId]?.length || 0) > 0 ? ` / 변경이력 ${partAuditLogs[item.partId].length}건` : ''})</div>
                                <table className="w-full border-collapse table-fixed">
                                  <thead>
                                    <tr>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[60px]">순위</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[75px]">중도매인번호</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[65px]">중도매인명</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[120px]">입찰가</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[90px]">총입찰금액</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[110px]">입찰시간</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[75px]">관리</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.bids.map((bid) => (
                                      <tr key={bid.id} className="bg-white">
                                        <td className={`px-2 py-1 text-xs border border-gray-200 text-center ${bid.rank === 1 ? 'font-bold text-green-600' : 'text-gray-500'}`}>
                                          {bid.rank === 1 ? '1위 (최고)' : `${bid.rank}위`}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-600">{bid.dealerNo || '-'}</td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center">{bid.dealerName}</td>
                                        <td className={`px-2 py-1 text-xs border border-gray-200 text-right ${bid.rank === 1 ? 'font-bold text-gray-900' : ''}`}>
                                          {editingBidId === bid.bidId ? (
                                            <div className="flex items-center gap-1 justify-end">
                                              <input
                                                type="text"
                                                inputMode="numeric"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(parseNumber(e.target.value))}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') saveEdit(bid.bidId, item.minPrice);
                                                  if (e.key === 'Escape') cancelEdit();
                                                }}
                                                className="w-20 px-2 py-0.5 text-xs border border-gray-300 outline-none text-right"
                                                autoFocus
                                                disabled={isSubmitting}
                                              />
                                              <button
                                                onClick={() => saveEdit(bid.bidId, item.minPrice)}
                                                className="px-2 py-0.5 text-[10px] text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50 min-w-[40px]"
                                                disabled={isSubmitting}
                                              >
                                                {isSubmitting ? '저장 중...' : '저장'}
                                              </button>
                                              <button
                                                onClick={cancelEdit}
                                                className="px-2 py-0.5 text-[10px] text-gray-600 border border-gray-300 hover:bg-gray-50"
                                                disabled={isSubmitting}
                                              >
                                                취소
                                              </button>
                                            </div>
                                          ) : (
                                            <span>{bid.bidPrice.toLocaleString()}원</span>
                                          )}
                                        </td>
                                        <td className={`px-2 py-1 text-xs border border-gray-200 text-right ${bid.rank === 1 ? 'font-bold text-gray-900' : ''}`}>
                                          {editingBidId === bid.bidId 
                                            ? `${Math.round(parseInt(parseNumber(editPrice) || '0', 10) * item.weight).toLocaleString()}원`
                                            : `${Math.round(bid.bidPrice * item.weight).toLocaleString()}원`
                                          }
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-500">{bid.bidTime}</td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center">
                                          {item.status === 'closed' ? (
                                            <span className="text-[10px] text-gray-400">마감됨</span>
                                          ) : (
                                            <div className="flex items-center justify-center gap-1">
                                              {editingBidId !== bid.bidId && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEdit(bid.bidId, bid.bidPrice);
                                                  }}
                                                  className="px-2 py-0.5 text-[10px] text-gray-600 border border-gray-300 hover:bg-gray-50 min-w-[32px]"
                                                >
                                                  수정
                                                </button>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteBid(bid.bidId, bid.dealerName, bid.rank === 1);
                                                }}
                                                className="px-2 py-0.5 text-[10px] text-white bg-gray-700 hover:bg-gray-800 min-w-[32px]"
                                              >
                                                삭제
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                    {/* 딜러 변경/취소 이력 행 */}
                                    {(partAuditLogs[item.partId] || []).map((log: any) => (
                                      <tr key={`audit-${log.id}`} className="bg-white">
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-400">
                                          {log.actionType === 'dealer_update' ? '변경' : '취소'}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-600">{log.dealerNo || '-'}</td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center">{log.dealerName}</td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-right">
                                          {log.actionType === 'dealer_cancel' ? (
                                            <span className="line-through text-gray-400">{log.oldBidPrice?.toLocaleString()}원</span>
                                          ) : (
                                            <span>
                                              <span className="line-through text-gray-400">{log.oldBidPrice?.toLocaleString()}</span>
                                              <span className="text-gray-700"> → {log.newBidPrice?.toLocaleString()}원</span>
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-right">
                                          {log.actionType === 'dealer_cancel' ? (
                                            <span className="line-through text-gray-400">{log.oldBidAmount?.toLocaleString()}원</span>
                                          ) : log.newBidAmount ? (
                                            `${log.newBidAmount.toLocaleString()}원`
                                          ) : '-'}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-500">
                                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center">
                                          <span className="text-[10px] text-gray-400">-</span>
                                        </td>
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
                    {/* 개체별 소계 */}
                    {showSubtotal && (
                      <tr className="font-semibold border-t-2 border-gray-300 bg-gray-100">
                        <td className={tdClass}></td>
                        <td className={`${tdClass} text-left`} colSpan={2}>
                          개체 {cattleNo} 소계 ({cattleItems.length}부위, 입찰 {itemsWithBidsInCattle}건)
                        </td>
                        <td className={tdClass}></td>
                        <td className={tdClass}></td>
                        <td className={`${tdClass} text-right`}>{subtotalWeight.toFixed(1)}</td>
                        <td className={tdClass}></td>
                        <td className={tdClass}></td>
                        <td className={`${tdClass} text-right text-gray-900`}>
                          {subtotalBidAmount > 0 ? Math.round(subtotalBidAmount).toLocaleString() : '-'}
                        </td>
                        <td className={tdClass}></td>
                        <td className={`${tdClass} text-gray-900`}>{subtotalBidCount}</td>
                        <td className={`${tdClass} text-gray-900`}>
                          {cattleItems.reduce((sum: number, ci: any) => sum + (allDealerAuditLogs[ci.partId]?.length || 0), 0) || '-'}
                        </td>
                      </tr>
                    )}
                    {/* 개체 간 구분선 */}
                    {cattleIdx < sortedCattleNos.length - 1 && showSubtotal && (
                      <tr>
                        <td colSpan={12} className="h-1 bg-gray-300"></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {/* 전체 합계 */}
              {showSubtotal && filteredItems.length > 0 && (
                <>
                  <tr>
                    <td colSpan={12} className="h-1 bg-gray-400"></td>
                  </tr>
                  <tr className="bg-gray-200 font-bold">
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-left`} colSpan={2}>
                      전체 합계 ({filteredItems.length}부위, 입찰 {stats.partsWithBids}건)
                    </td>
                    <td className={tdClass}></td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-right`}>
                      {filteredItems.reduce((sum, item) => sum + item.weight, 0).toFixed(1)}
                    </td>
                    <td className={tdClass}></td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-right text-gray-900`}>
                      {stats.totalBidAmount > 0 ? stats.totalBidAmount.toLocaleString() : '-'}
                    </td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-gray-900`}>
                      {filteredItems.reduce((sum, item) => sum + item.bidCount, 0)}
                    </td>
                    <td className={`${tdClass} text-gray-900`}>
                      {filteredItems.reduce((sum, item) => sum + (allDealerAuditLogs[item.partId]?.length || 0), 0) || '-'}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 수정이력 모달 */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAuditModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">입찰 수정/삭제 이력</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedDate} 기준</p>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  수정/삭제 이력이 없습니다.
                </div>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-1.5 border border-gray-200 text-center font-medium text-gray-600 w-[50px]">구분</th>
                      <th className="px-2 py-1.5 border border-gray-200 text-center font-medium text-gray-600 w-[80px]">상장번호</th>
                      <th className="px-2 py-1.5 border border-gray-200 text-center font-medium text-gray-600 w-[70px]">부위</th>
                      <th className="px-2 py-1.5 border border-gray-200 text-center font-medium text-gray-600 w-[70px]">중도매인</th>
                      <th className="px-2 py-1.5 border border-gray-200 text-center font-medium text-gray-600 w-[80px]">변경전</th>
                      <th className="px-2 py-1.5 border border-gray-200 text-center font-medium text-gray-600 w-[80px]">변경후</th>
                      <th className="px-2 py-1.5 border border-gray-200 text-center font-medium text-gray-600 w-[110px]">수정시간</th>
                      <th className="px-2 py-1.5 border border-gray-200 text-center font-medium text-gray-600 w-[60px]">수정자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="bg-white hover:bg-gray-50">
                        <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-700">
                          {log.actionType === 'update' ? '수정' : '삭제'}
                        </td>
                        <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-700">{log.listingNo}</td>
                        <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-700">{log.partName}</td>
                        <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-700">{log.dealerName}</td>
                        <td className="px-2 py-1.5 border border-gray-200 text-right text-gray-700">
                          {log.oldBidPrice ? `${log.oldBidPrice.toLocaleString()}원` : '-'}
                        </td>
                        <td className="px-2 py-1.5 border border-gray-200 text-right text-gray-700">
                          {log.actionType === 'delete' ? (
                            <span className="text-red-500">삭제됨</span>
                          ) : log.newBidPrice ? (
                            `${log.newBidPrice.toLocaleString()}원`
                          ) : '-'}
                        </td>
                        <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-500">
                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </td>
                        <td className="px-2 py-1.5 border border-gray-200 text-center text-gray-500">{log.performedBy || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-400">총 {auditLogs.length}건</span>
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 확인 모달 */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setPwModal(null); setPwInput(''); setPwError(''); }} />
          <div className="relative bg-white rounded-lg shadow-xl w-[320px] p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              비밀번호 확인
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {pwModal.type === 'edit' ? '입찰가 수정' : '입찰 삭제'}을 위해 비밀번호를 입력해주세요.
            </p>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePwConfirm(); }}
              placeholder="비밀번호"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              autoFocus
              disabled={isSubmitting}
            />
            {pwError && (
              <p className="mt-1.5 text-xs text-red-500">{pwError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setPwModal(null); setPwInput(''); setPwError(''); }}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                onClick={handlePwConfirm}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
