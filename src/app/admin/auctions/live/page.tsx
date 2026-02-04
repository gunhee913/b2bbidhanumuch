'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChevronDown, ChevronUp, X, RefreshCw, Play, Square } from 'lucide-react';
import { useAuctions, useLiveBids, useOpenAuction, useCloseAuction, useCreateAuction } from '@/features/auctions/hooks';
import { useListings } from '@/features/listings/hooks';
import { useCompanies } from '@/features/companies/hooks';
import { useDealers } from '@/features/dealers/hooks';
import { format } from 'date-fns';

// 입찰 내역 타입
interface BidRecord {
  id: string;
  dealerNo: string;
  dealerName: string;
  bidPrice: number;
  bidTime: string;
  rank: number;
}

// 경매 항목 타입
interface AuctionItem {
  id: string;
  partId: string;
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

export default function AuctionLivePage() {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // 조회 날짜 상태
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [bidFilter, setBidFilter] = useState('all');
  const [showSubtotal, setShowSubtotal] = useState(true);
  
  // 경매 생성 모달
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // 마감 모달
  const [showCloseModal, setShowCloseModal] = useState(false);

  // 오늘 날짜인지 확인
  const isToday = selectedDate === todayStr;

  // API Hooks
  const { data: auctionsData, isLoading: auctionsLoading, refetch: refetchAuctions } = useAuctions({ 
    auctionDateFrom: selectedDate, 
    auctionDateTo: selectedDate 
  });
  const { data: companiesData } = useCompanies();
  const { data: dealersData } = useDealers();
  
  // 선택한 날짜의 경매 찾기
  const currentAuction = useMemo(() => {
    if (!auctionsData || auctionsData.length === 0) return null;
    return auctionsData[0]; // 해당 날짜의 첫 번째 경매
  }, [auctionsData]);

  // 실시간 입찰 현황 (경매가 있을 때만)
  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useLiveBids(
    currentAuction?.id || null,
    { refetchInterval: currentAuction?.status === 'open' ? 5000 : false }
  );

  // 승인된 상장 조회 (경매 생성용)
  const { data: approvedListings } = useListings({ 
    status: 'approved',
    listingDateFrom: selectedDate,
    listingDateTo: selectedDate,
  });

  // Mutations
  const createAuction = useCreateAuction();
  const openAuction = useOpenAuction();
  const closeAuction = useCloseAuction();

  // 경매 항목 데이터 변환
  const auctionItems: AuctionItem[] = useMemo(() => {
    if (!liveData?.listings) return [];
    
    const items: AuctionItem[] = [];
    liveData.listings.forEach((listing: any) => {
      listing.parts?.forEach((part: any) => {
        items.push({
          id: `${listing.id}-${part.id}`,
          partId: part.id,
          listingNo: part.listingPartNo || `${listing.listingNo}-${String(part.partNo).padStart(2, '0')}`,
          partName: part.partName,
          companyName: listing.companyName || '',
          grade: listing.grade || '',
          weight: part.weight || 0,
          minPrice: part.minPrice || 0,
          currentHighestBid: part.highestBid?.bidPrice || 0,
          bidCount: part.bidCount || 0,
          bids: (part.allBids || []).map((bid: any, idx: number) => ({
            id: `${part.id}-${idx}`,
            dealerNo: bid.dealerId?.slice(-7) || '',
            dealerName: bid.dealerName || '',
            bidPrice: bid.bidPrice,
            bidTime: bid.bidAt ? format(new Date(bid.bidAt), 'yy.MM.dd HH:mm:ss') : '',
            rank: idx + 1,
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

  // 통계
  const stats = useMemo(() => {
    const totalItems = filteredItems.length;
    const itemsWithBids = filteredItems.filter(item => item.bidCount > 0).length;
    const itemsWithoutBids = filteredItems.filter(item => item.bidCount === 0).length;
    const totalBidAmount = filteredItems.reduce((sum, item) => sum + (item.currentHighestBid * item.weight), 0);
    return { totalItems, itemsWithBids, itemsWithoutBids, totalBidAmount };
  }, [filteredItems]);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 경매 생성
  const handleCreateAuction = async () => {
    if (!approvedListings || approvedListings.length === 0) {
      alert('등록할 상장이 없습니다.');
      return;
    }

    try {
      const listingIds = approvedListings.map((l: any) => l.id);
      await createAuction.mutateAsync({
        auctionDate: selectedDate,
        listingIds,
      });
      setShowCreateModal(false);
      refetchAuctions();
    } catch (error: any) {
      alert(error.message || '경매 생성 실패');
    }
  };

  // 경매 시작
  const handleOpenAuction = async () => {
    if (!currentAuction) return;
    try {
      await openAuction.mutateAsync(currentAuction.id);
      refetchAuctions();
    } catch (error: any) {
      alert(error.message || '경매 시작 실패');
    }
  };

  // 경매 마감
  const handleCloseAuction = async () => {
    if (!currentAuction) return;
    try {
      await closeAuction.mutateAsync(currentAuction.id);
      setShowCloseModal(false);
      refetchAuctions();
      refetchLive();
    } catch (error: any) {
      alert(error.message || '경매 마감 실패');
    }
  };

  // 새로고침
  const handleRefresh = () => {
    refetchAuctions();
    if (currentAuction) {
      refetchLive();
    }
  };

  const thClass = "px-2 py-1.5 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  const isLoading = auctionsLoading || liveLoading;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경매 현황(실시간)</h1>
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
            {!isToday && (
              <span className="text-xs text-gray-500">(과거 데이터)</span>
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

            {/* 경매 상태 및 버튼 */}
            {currentAuction ? (
              <>
                {currentAuction.status === 'scheduled' && (
                  <button
                    onClick={handleOpenAuction}
                    disabled={openAuction.isPending}
                    className="px-4 py-1.5 bg-green-600 text-white text-xs hover:bg-green-700 flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    경매 시작
                  </button>
                )}
                {currentAuction.status === 'open' && (
                  <>
                    <div className="px-3 py-1.5 bg-green-100 text-green-800 text-xs flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      진행중
                    </div>
                    <button
                      onClick={() => setShowCloseModal(true)}
                      className="px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800 flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" />
                      마감
                    </button>
                  </>
                )}
                {currentAuction.status === 'closed' && (
                  <div className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs">
                    마감 완료
                  </div>
                )}
              </>
            ) : (
              isToday && approvedListings && approvedListings.length > 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-1.5 bg-blue-600 text-white text-xs hover:bg-blue-700"
                >
                  경매 생성
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">총 상장</div>
          <div className="text-xl font-bold text-gray-900">{stats.totalItems}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">입찰 있음</div>
          <div className="text-xl font-bold text-gray-900">{stats.itemsWithBids}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">입찰 없음</div>
          <div className="text-xl font-bold text-gray-900">{stats.itemsWithoutBids}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">현재 총 입찰금액</div>
          <div className="text-xl font-bold text-gray-900">{Math.round(stats.totalBidAmount).toLocaleString()}원</div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white border border-gray-200 p-8 text-center text-gray-500">
          데이터를 불러오는 중...
        </div>
      )}

      {/* 경매 없음 */}
      {!isLoading && !currentAuction && (
        <div className="bg-white border border-gray-200 p-8 text-center text-gray-500">
          {selectedDate}에 등록된 경매가 없습니다.
          {isToday && approvedListings && approvedListings.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 hover:underline"
              >
                경매 생성하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 경매 현황 테이블 */}
      {!isLoading && currentAuction && auctionItems.length > 0 && (
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
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[70px]">순위</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[100px]">중도매인명</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[100px]">입찰가</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[120px]">총입찰금액</th>
                                      <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 text-center w-[140px]">입찰시간</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.bids.map((bid) => (
                                      <tr key={bid.id} className="bg-white">
                                        <td className={`px-2 py-1 text-xs border border-gray-200 text-center ${bid.rank === 1 ? 'font-bold text-green-600' : 'text-gray-500'}`}>
                                          {bid.rank === 1 ? '1위 (최고)' : `${bid.rank}위`}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center">{bid.dealerName}</td>
                                        <td className={`px-2 py-1 text-xs border border-gray-200 text-right ${bid.rank === 1 ? 'font-bold text-gray-900' : ''}`}>
                                          {bid.bidPrice.toLocaleString()}원
                                        </td>
                                        <td className={`px-2 py-1 text-xs border border-gray-200 text-right ${bid.rank === 1 ? 'font-bold text-gray-900' : ''}`}>
                                          {Math.round(bid.bidPrice * item.weight).toLocaleString()}원
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-500">{bid.bidTime}</td>
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
                      전체 합계 ({filteredItems.length}부위, 입찰 {stats.itemsWithBids}건)
                    </td>
                    <td className={tdClass}></td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-right`}>
                      {filteredItems.reduce((sum, item) => sum + item.weight, 0).toFixed(1)}
                    </td>
                    <td className={tdClass}></td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-right text-gray-900`}>
                      {stats.totalBidAmount > 0 ? Math.round(stats.totalBidAmount).toLocaleString() : '-'}
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

      {/* 상장은 있으나 아직 경매에 등록 안 됨 */}
      {!isLoading && currentAuction && auctionItems.length === 0 && (
        <div className="bg-white border border-gray-200 p-8 text-center text-gray-500">
          경매에 등록된 상장이 없습니다.
        </div>
      )}

      {/* 경매 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-[400px]">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">경매 생성</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-gray-600">
                {selectedDate} 경매를 생성합니다.
              </div>
              <div className="bg-gray-50 p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">포함될 상장</span>
                  <span className="font-semibold">{approvedListings?.length || 0}건</span>
                </div>
                <div className="text-xs text-gray-400">
                  승인된 상장이 자동으로 포함됩니다.
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleCreateAuction}
                disabled={createAuction.isPending}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {createAuction.isPending ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 마감 모달 */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-[400px]">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">경매 마감</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="border border-gray-200 p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">마감 현황</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">총 상장</span>
                    <span>{stats.totalItems}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">낙찰</span>
                    <span>{stats.itemsWithBids}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">유찰</span>
                    <span>{stats.itemsWithoutBids}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">낙찰률</span>
                    <span>{stats.totalItems > 0 ? ((stats.itemsWithBids / stats.totalItems) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-gray-500">총 낙찰금액</span>
                    <span className="font-semibold">{Math.round(stats.totalBidAmount).toLocaleString()}원</span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600 bg-yellow-50 p-3 border border-yellow-200">
                경매를 마감하면 최고 입찰자가 낙찰됩니다. 계속하시겠습니까?
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleCloseAuction}
                disabled={closeAuction.isPending}
                className="px-4 py-2 text-sm text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50"
              >
                {closeAuction.isPending ? '마감 중...' : '마감'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
