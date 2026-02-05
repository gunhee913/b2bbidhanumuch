'use client';

import React, { useState, useMemo } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

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
  const [bidFilter, setBidFilter] = useState('all');
  const [showSubtotal, setShowSubtotal] = useState(true);

  // 오늘 날짜인지 확인
  const isToday = selectedDate === todayStr;

  // API 호출
  const { data: liveData, isLoading, refetch } = useQuery({
    queryKey: ['companyLiveListings', selectedDate, companyId],
    queryFn: () => fetchLiveListings({
      listingDate: selectedDate,
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
                setBidFilter('all');
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
          </div>
        </div>
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
                        <td className={`${tdClass} text-gray-900`}>{subtotalBidCount}</td>
                      </tr>
                    )}
                    {/* 개체 간 구분선 */}
                    {cattleIdx < sortedCattleNos.length - 1 && showSubtotal && (
                      <tr>
                        <td colSpan={8} className="h-1 bg-gray-300"></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {/* 전체 합계 */}
              {showSubtotal && filteredItems.length > 0 && (
                <>
                  <tr>
                    <td colSpan={8} className="h-1 bg-gray-400"></td>
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
    </CompanyLayout>
  );
}
