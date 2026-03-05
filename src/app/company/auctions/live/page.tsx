'use client';

import React, { useState, useMemo, useEffect } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { RefreshCw, Timer, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// 경매 항목 타입
interface AuctionItem {
  id: string;
  listingId: string;
  listingNo: string;
  partName: string;
  grade: string;
  weight: number;
  minPrice: number;
  currentHighestBid: number;
  bidCount: number;
  status: string;
  highestBidDealerNo: string;
  highestBidDealerName: string;
}

// API에서 실시간 데이터 조회
const fetchLiveListings = async (params: {
  listingDate?: string;
  companyId?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (params.listingDate) searchParams.set('listingDate', params.listingDate);
  if (params.companyId) searchParams.set('companyId', params.companyId);

  const response = await fetch(`/api/listings/live?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('실시간 데이터 조회 실패');
  }
  return response.json();
};

// 등급 포맷팅 함수
const formatGrade = (grade: string, marblingScore: number | null) => {
  if (!grade) return '';
  if (grade.includes('(')) return grade;
  if (marblingScore && grade.startsWith('1++')) {
    return `${grade}(${marblingScore})`;
  }
  return grade;
};

// 개체번호 추출 함수
const getCattleNo = (listingNo: string): string => {
  const parts = listingNo.split('-');
  return parts.length >= 2 ? parts[1] : '';
};

export default function CompanyAuctionLivePage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  const companyId = session?.company?.id || '';
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchDate, setSearchDate] = useState(todayStr);
  const [bidFilter, setBidFilter] = useState('all');
  const [showSubtotal, setShowSubtotal] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [showRoundHistoryModal, setShowRoundHistoryModal] = useState(false);

  // 오늘 날짜인지 확인
  const isToday = searchDate === todayStr;

  const handleSearch = () => {
    setSearchDate(selectedDate);
  };

  // 경매 회차 정보 조회 (5초 간격, searchDate 기준)
  const { data: roundData } = useQuery({
    queryKey: ['rounds', 'current', searchDate],
    queryFn: async () => {
      const res = await fetch(`/api/auctions/rounds/current?date=${searchDate}`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 5000,
  });

  const currentRound = roundData?.currentRound;
  const lastClosedRound = roundData?.lastClosedRound;
  const allRounds = roundData?.allRounds || [];

  // 타이머 로직
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

  // API 호출
  const { data: liveData, isLoading, refetch } = useQuery({
    queryKey: ['companyLiveListings', searchDate, companyId],
    queryFn: () => fetchLiveListings({
      listingDate: searchDate,
      companyId: companyId || undefined,
    }),
    enabled: !!companyId,
    refetchInterval: isToday ? 5000 : false, // 오늘이면 5초마다 새로고침
  });

  // 데이터 변환
  const auctionItems: AuctionItem[] = useMemo(() => {
    if (!liveData?.listings) return [];
    
    const items: AuctionItem[] = [];
    
    liveData.listings.forEach((listing: any) => {
      (listing.parts || []).forEach((part: any) => {
        items.push({
          id: part.id,
          listingId: listing.id,
          listingNo: part.listingPartNo || `${listing.listingNo}-${String(part.partNo).padStart(2, '0')}`,
          partName: part.partName,
          grade: formatGrade(listing.grade, listing.marblingScore),
          weight: part.weight || 0,
          minPrice: part.minPrice || 0,
          currentHighestBid: part.highestBid?.bidPrice || 0,
          bidCount: part.bidCount || 0,
          status: listing.status || '',
          highestBidDealerNo: part.highestBid?.dealerNo || '',
          highestBidDealerName: part.highestBid?.dealerName || '',
        });
      });
    });
    
    return items;
  }, [liveData]);

  // 필터링
  const filteredItems = useMemo(() => {
    return auctionItems.filter(item => {
      const bidMatch = bidFilter === 'all' 
        || (bidFilter === 'withBids' && item.bidCount > 0)
        || (bidFilter === 'withoutBids' && item.bidCount === 0);
      return bidMatch;
    });
  }, [auctionItems, bidFilter]);

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
  const stats = liveData?.stats || {
    totalListings: 0,
    totalParts: 0,
    partsWithBids: 0,
    partsWithoutBids: 0,
    totalBidAmount: 0,
  };

  const thClass = "px-2 py-1.5 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경매 현황(실시간)</h1>
        <p className="text-sm text-gray-500 mt-1">{companyName}</p>
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
              onClick={() => refetch()}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              새로고침
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setSearchDate(todayStr);
                setBidFilter('all');
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* 경매 상태 패널 */}
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
              onClick={() => setShowRoundHistoryModal(true)}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              경매이력
            </button>
          </div>
        ) : lastClosedRound ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded">
                {lastClosedRound.round_no}차 종료
              </span>
              <span className="text-xs text-gray-500">
                다음 차수 대기 중입니다.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowRoundHistoryModal(true)}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              경매이력
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {isToday ? '경매가 아직 시작되지 않았습니다.' : `${searchDate} 경매 현황`}
            </span>
            {allRounds.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRoundHistoryModal(true)}
                className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                경매이력
              </button>
            )}
          </div>
        )}
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">총 상장</div>
          <div className="text-xl font-bold text-gray-900">{filteredItems.length}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">입찰 있음</div>
          <div className="text-xl font-bold text-green-600">{filteredItems.filter(i => i.bidCount > 0).length}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">입찰 없음</div>
          <div className="text-xl font-bold text-gray-400">{filteredItems.filter(i => i.bidCount === 0).length}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">현재 총 입찰금액</div>
          <div className="text-xl font-bold text-gray-900">
            {filteredItems.reduce((sum, item) => sum + (item.currentHighestBid * item.weight), 0).toLocaleString()}원
          </div>
        </div>
      </div>

      {/* 로딩 */}
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
                <th className={`${thClass} w-[140px]`}>상장번호</th>
                <th className={`${thClass} w-[80px]`}>부위</th>
                <th className={`${thClass} w-[80px]`}>등급</th>
                <th className={`${thClass} w-[70px]`}>중량</th>
                <th className={`${thClass} w-[100px]`}>최저가격</th>
                <th className={`${thClass} w-[100px]`}>최고입찰가격</th>
                <th className={`${thClass} w-[120px]`}>총입찰가격</th>
                <th className={`${thClass} w-[80px]`}>중도매인번호</th>
                <th className={`${thClass} w-[80px]`}>중도매인명</th>
                <th className={`${thClass} w-[70px]`}>입찰수</th>
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
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className={`${tdClass} text-[11px] text-gray-600`}>{item.listingNo}</td>
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
                        <td className={`${tdClass} ${item.highestBidDealerNo ? 'text-gray-900' : 'text-gray-400'}`}>
                          {item.highestBidDealerNo || '-'}
                        </td>
                        <td className={`${tdClass} ${item.highestBidDealerName ? 'text-gray-900' : 'text-gray-400'}`}>
                          {item.highestBidDealerName || '-'}
                        </td>
                        <td className={`${tdClass} ${item.bidCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                          {item.bidCount}
                        </td>
                      </tr>
                    ))}
                    {/* 개체별 소계 */}
                    {showSubtotal && (
                      <tr className="font-semibold border-t-2 border-gray-300">
                        <td className={`${tdClass} text-left`} colSpan={2}>
                          개체 {cattleNo} 소계 ({cattleItems.length}부위, 입찰 {itemsWithBidsInCattle}건)
                        </td>
                        <td className={tdClass}></td>
                        <td className={`${tdClass} text-right`}>{subtotalWeight.toFixed(1)}</td>
                        <td className={tdClass}></td>
                        <td className={tdClass}></td>
                        <td className={`${tdClass} text-right text-gray-900`}>
                          {subtotalBidAmount > 0 ? Math.round(subtotalBidAmount).toLocaleString() : '-'}
                        </td>
                        <td className={tdClass}></td>
                        <td className={tdClass}></td>
                        <td className={`${tdClass} text-gray-900`}>{subtotalBidCount}</td>
                      </tr>
                    )}
                    {/* 개체 간 구분선 */}
                    {cattleIdx < sortedCattleNos.length - 1 && showSubtotal && (
                      <tr>
                        <td colSpan={10} className="h-1 bg-gray-300"></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {/* 전체 합계 */}
              {showSubtotal && filteredItems.length > 0 && (
                <>
                  <tr>
                    <td colSpan={10} className="h-1 bg-gray-400"></td>
                  </tr>
                  <tr className="bg-gray-200 font-bold">
                    <td className={`${tdClass} text-left`} colSpan={2}>
                      전체 합계 ({filteredItems.length}부위, 입찰 {filteredItems.filter(i => i.bidCount > 0).length}건)
                    </td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-right`}>
                      {filteredItems.reduce((sum, item) => sum + item.weight, 0).toFixed(1)}
                    </td>
                    <td className={tdClass}></td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-right text-gray-900`}>
                      {filteredItems.reduce((sum, item) => sum + (item.currentHighestBid * item.weight), 0).toLocaleString()}
                    </td>
                    <td className={tdClass}></td>
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

      {/* 경매이력 모달 */}
      {showRoundHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRoundHistoryModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">경매 회차 이력</h3>
                <p className="text-xs text-gray-500 mt-0.5">{searchDate} 기준</p>
              </div>
              <button
                onClick={() => setShowRoundHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {allRounds.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  경매 이력이 없습니다.
                </div>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 border border-gray-200 text-center font-medium text-gray-600 w-[50px]">회차</th>
                      <th className="px-2 py-2 border border-gray-200 text-center font-medium text-gray-600 w-[60px]">상태</th>
                      <th className="px-2 py-2 border border-gray-200 text-center font-medium text-gray-600">시작시간</th>
                      <th className="px-2 py-2 border border-gray-200 text-center font-medium text-gray-600">종료시간</th>
                      <th className="px-2 py-2 border border-gray-200 text-center font-medium text-gray-600 w-[80px]">경과시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRounds.map((round: any) => {
                      const startedAt = round.started_at ? new Date(round.started_at) : null;
                      const endedAt = round.ended_at ? new Date(round.ended_at) : null;
                      let elapsed = '-';
                      if (startedAt && endedAt) {
                        const diffMs = endedAt.getTime() - startedAt.getTime();
                        const diffMin = Math.floor(diffMs / 60000);
                        const diffSec = Math.floor((diffMs % 60000) / 1000);
                        elapsed = `${diffMin}분 ${diffSec}초`;
                      } else if (startedAt && round.status === 'open') {
                        const diffMs = Date.now() - startedAt.getTime();
                        const diffMin = Math.floor(diffMs / 60000);
                        const diffSec = Math.floor((diffMs % 60000) / 1000);
                        elapsed = `${diffMin}분 ${diffSec}초 (진행중)`;
                      }
                      return (
                        <tr key={round.id} className="bg-white hover:bg-gray-50">
                          <td className="px-2 py-2 border border-gray-200 text-center font-medium text-gray-900 whitespace-nowrap">
                            {round.round_no}차
                          </td>
                          <td className="px-2 py-2 border border-gray-200 text-center whitespace-nowrap">
                            {round.status === 'open' ? (
                              <span className="text-green-600 font-medium">진행중</span>
                            ) : (
                              <span className="text-gray-500">종료</span>
                            )}
                          </td>
                          <td className="px-2 py-2 border border-gray-200 text-center text-gray-700 whitespace-nowrap">
                            {startedAt ? format(startedAt, 'HH:mm:ss') : '-'}
                          </td>
                          <td className="px-2 py-2 border border-gray-200 text-center text-gray-700 whitespace-nowrap">
                            {endedAt ? format(endedAt, 'HH:mm:ss') : '-'}
                          </td>
                          <td className="px-2 py-2 border border-gray-200 text-center text-gray-500 whitespace-nowrap">
                            {elapsed}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-400">총 {allRounds.length}건</span>
              <button
                onClick={() => setShowRoundHistoryModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
