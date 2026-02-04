'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChevronDown, ChevronUp, RefreshCw, Square } from 'lucide-react';
import { useLiveListings } from '@/features/listings/hooks';
import { useCompanies } from '@/features/companies/hooks';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

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

  // 오늘 날짜인지 확인
  const isToday = selectedDate === todayStr;

  // API Hooks - 경매 없이 승인된 상장 직접 조회
  const { data: liveData, isLoading, refetch } = useLiveListings(
    { listingDate: selectedDate },
    { refetchInterval: isToday ? 5000 : false } // 오늘이면 5초마다 새로고침
  );
  const { data: companiesData } = useCompanies();

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

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
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

  // 전체 마감
  const handleCloseAll = async () => {
    // 입찰이 있는 상장들만 마감
    const listingIds = [...new Set(filteredItems.filter(i => i.bidCount > 0).map(i => i.listingId))];
    
    if (listingIds.length === 0) {
      alert('마감할 상장이 없습니다.');
      return;
    }

    if (!confirm(`${listingIds.length}개 상장을 마감하시겠습니까?`)) return;

    try {
      // 각 상장별로 마감 처리
      for (const listingId of listingIds) {
        await fetch(`/api/listings/${listingId}/close`, { method: 'POST' });
      }
      refetch();
      alert('마감이 완료되었습니다.');
    } catch (error: any) {
      alert(error.message || '마감 처리 중 오류 발생');
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

  // 인라인 편집 저장
  const saveEdit = async (bidId: string, minPrice: number) => {
    const price = parseInt(parseNumber(editPrice), 10);
    if (isNaN(price) || price <= 0) {
      alert('유효한 입찰가를 입력해주세요.');
      return;
    }

    if (price < minPrice) {
      alert(`최저가(${minPrice.toLocaleString()}원) 이상으로 입력해주세요.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bidPrice: price,
          updatedBy: session?.user?.name || '관리자',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '수정 실패');
      }

      setEditingBidId(null);
      setEditPrice('');
      refetch();
    } catch (error: any) {
      alert(error.message || '입찰 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 입찰 삭제
  const handleDeleteBid = async (bidId: string, dealerName: string, isTopBid: boolean) => {
    const warningMsg = isTopBid 
      ? `⚠️ [${dealerName}]님의 입찰은 현재 1위입니다.\n정말 삭제하시겠습니까?`
      : `[${dealerName}]님의 입찰을 삭제하시겠습니까?`;
    
    if (!confirm(warningMsg)) return;

    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '삭제 실패');
      }

      refetch();
    } catch (error: any) {
      alert(error.message || '입찰 삭제 중 오류가 발생했습니다.');
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
            {isToday && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                실시간
              </span>
            )}
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
                setSelectedDate(todayStr);
                setCompanyFilter('all');
                setBidFilter('all');
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>

            {/* 전체 마감 버튼 */}
            {stats.partsWithBids > 0 && (
              <button
                onClick={handleCloseAll}
                className="px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 flex items-center gap-1"
              >
                <Square className="w-3 h-3" />
                전체 마감
              </button>
            )}
          </div>
        </div>
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
                          onClick={() => item.bidCount > 0 && toggleItem(item.id)}
                        >
                          <td className={tdClass}>
                            {item.bidCount > 0 && (
                              expandedItems.includes(item.id) 
                                ? <ChevronUp className="w-4 h-4 mx-auto text-gray-400" />
                                : <ChevronDown className="w-4 h-4 mx-auto text-gray-400" />
                            )}
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
                        </tr>
                        {/* 입찰 내역 펼침 */}
                        {expandedItems.includes(item.id) && item.bids.length > 0 && (
                          <tr>
                            <td colSpan={11} className="p-0">
                              <div className="p-3 border-t border-gray-200 bg-gray-50">
                                <div className="text-xs font-semibold text-gray-700 mb-2">입찰 내역 ({item.bids.length}건)</div>
                                <table className="w-full border-collapse table-fixed">
                                  <thead>
                                    <tr>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[60px]">순위</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[75px]">중도매인번호</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[65px]">중도매인명</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[120px]">입찰가</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[90px]">총입찰금액</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[110px]">입찰시간</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[55px]">수정자</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[110px]">수정시간</th>
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
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-500">
                                          {bid.updatedBy || '-'}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-500">
                                          {bid.updatedAt || '-'}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center">
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
                      </tr>
                    )}
                    {/* 개체 간 구분선 */}
                    {cattleIdx < sortedCattleNos.length - 1 && showSubtotal && (
                      <tr>
                        <td colSpan={11} className="h-1 bg-gray-300"></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {/* 전체 합계 */}
              {showSubtotal && filteredItems.length > 0 && (
                <>
                  <tr>
                    <td colSpan={11} className="h-1 bg-gray-400"></td>
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
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

    </AdminLayout>
  );
}
