'use client';

import React, { useState, useEffect } from 'react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSession } from 'next-auth/react';

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

// 19개 부위
const PART_NAMES = [
  '등심(좌)', '등심(우)', '안심', '채끝', '갈비(좌)', '갈비(우)',
  '특수부위', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
  '설도(좌)', '설도(우)', '사태', '꼬리', '족', '사골', '잡뼈'
];

// 부위별 기본 단가
const PART_PRICES: Record<string, number> = {
  '등심(좌)': 85000, '등심(우)': 85000, '안심': 95000, '채끝': 82000,
  '갈비(좌)': 78000, '갈비(우)': 78000, '특수부위': 72000, '앞다리': 55000,
  '우둔': 58000, '목심': 62000, '양지(좌)': 52000, '양지(우)': 52000,
  '설도(좌)': 56000, '설도(우)': 56000, '사태': 48000, '꼬리': 35000,
  '족': 25000, '사골': 20000, '잡뼈': 15000
};

// 부위별 기본 중량
const PART_WEIGHTS: Record<string, number> = {
  '등심(좌)': 15.5, '등심(우)': 15.5, '안심': 4.5, '채끝': 8.0,
  '갈비(좌)': 12.5, '갈비(우)': 12.5, '특수부위': 3.5, '앞다리': 25.0,
  '우둔': 21.0, '목심': 14.5, '양지(좌)': 12.5, '양지(우)': 12.5,
  '설도(좌)': 16.5, '설도(우)': 16.5, '사태': 15.0, '꼬리': 16.0,
  '족': 10.5, '사골': 3.5, '잡뼈': 22.0
};

// 중도매인 데이터
const DEALERS = [
  { no: '7000001', name: '김철수' },
  { no: '7000002', name: '이영희' },
  { no: '7000003', name: '박민수' },
  { no: '7000004', name: '최지현' },
  { no: '7000005', name: '정대호' },
];

// 더미 데이터 생성 (특정 업체만)
const generateDummyData = (targetDate: Date, companyName: string): AuctionItem[] => {
  const dateCode = `${String(targetDate.getFullYear()).slice(2)}${String(targetDate.getMonth() + 1).padStart(2, '0')}${String(targetDate.getDate()).padStart(2, '0')}`;
  const grades = ['1++A', '1++B', '1+A', '1+B', '1A', '1B'];
  
  const items: AuctionItem[] = [];
  
  // 해당 업체 2두만 생성
  const companyPrefixMap: Record<string, string> = {
    '건화': '101',
    '대진엠에스': '201',
    '안심엘피씨': '301',
    '정직한고기': '401',
  };
  
  const baseNo = companyPrefixMap[companyName] || '101';
  
  for (let cattleIdx = 0; cattleIdx < 2; cattleIdx++) {
    const cattleNo = parseInt(baseNo) + cattleIdx;
    const gradeIdx = cattleIdx % grades.length;
    const grade = grades[gradeIdx];
    const gradeMultiplier = grade.startsWith('1++') ? 1.0 : grade.startsWith('1+') ? 0.9 : 0.8;
    
    PART_NAMES.forEach((partName, partIdx) => {
      const partNo = partIdx + 1;
      const listingNo = `${dateCode}-${cattleNo}-${String(partNo).padStart(2, '0')}`;
      
      const baseWeight = PART_WEIGHTS[partName];
      const weightVariation = ((cattleIdx * 3 + partIdx) % 20 - 10) / 10;
      const weight = Number((baseWeight + weightVariation).toFixed(1));
      
      const basePrice = PART_PRICES[partName];
      const minPrice = Math.round(basePrice * gradeMultiplier);
      
      // 입찰 데이터 생성
      const bidSeed = (cattleIdx * 31 + partIdx * 7) % 100;
      const totalBidCount = bidSeed < 10 ? 0 : bidSeed < 20 ? 1 : bidSeed < 35 ? 2 : bidSeed < 50 ? 3 : 4;
      const bids: BidRecord[] = [];
      
      if (totalBidCount > 0) {
        const seed = cattleIdx * 13 + partIdx * 17;
        const dateStr = `${String(targetDate.getFullYear()).slice(2)}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${String(targetDate.getDate()).padStart(2, '0')}`;
        
        let currentPrice = minPrice;
        const baseMinutes = (cattleIdx * 5 + partIdx) % 40 + 5;
        
        for (let bidIdx = 0; bidIdx < totalBidCount; bidIdx++) {
          const dealerSeed = (seed * (bidIdx + 1) * 13) % DEALERS.length;
          const dealer = DEALERS[dealerSeed];
          
          const priceIncrease = ((seed + bidIdx * 7) % 4 + 1) * 500;
          currentPrice = currentPrice + priceIncrease;
          
          const minutes = baseMinutes + bidIdx * 2;
          const seconds = (bidIdx * 17) % 60;
          const timeStr = `09:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          
          bids.push({
            id: `${listingNo}-${bidIdx}`,
            dealerNo: dealer.no,
            dealerName: dealer.name,
            bidPrice: currentPrice,
            bidTime: `${dateStr} ${timeStr}`,
            rank: 0,
          });
        }
        
        bids.sort((a, b) => b.bidPrice - a.bidPrice);
        bids.forEach((bid, idx) => {
          bid.rank = idx + 1;
        });
      }
      
      const currentHighestBid = bids.length > 0 ? bids[0].bidPrice : 0;
      
      items.push({
        id: listingNo,
        listingNo,
        partName,
        companyName,
        grade,
        weight,
        minPrice,
        currentHighestBid,
        bidCount: bids.length,
        bids,
      });
    });
  }
  
  return items;
};

// 개체번호 추출 함수
const getCattleNo = (listingNo: string): string => {
  const parts = listingNo.split('-');
  return parts.length >= 2 ? parts[1] : '';
};

export default function CompanyAuctionLivePage() {
  const { data: session } = useSession();
  const companyName = session?.company?.name || '';
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [bidFilter, setBidFilter] = useState('all');
  const [showSubtotal, setShowSubtotal] = useState(true);

  // 날짜 변경 시 데이터 재생성
  useEffect(() => {
    if (companyName) {
      const date = new Date(selectedDate);
      setAuctionItems(generateDummyData(date, companyName));
      setExpandedItems([]);
    }
  }, [selectedDate, companyName]);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const filteredItems = auctionItems.filter(item => {
    const bidMatch = bidFilter === 'all' 
      || (bidFilter === 'withBids' && item.bidCount > 0)
      || (bidFilter === 'withoutBids' && item.bidCount === 0);
    return bidMatch;
  });

  // 개체별 그룹화
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cattleNo = getCattleNo(item.listingNo);
    if (!acc[cattleNo]) {
      acc[cattleNo] = [];
    }
    acc[cattleNo].push(item);
    return acc;
  }, {} as Record<string, AuctionItem[]>);

  const sortedCattleNos = Object.keys(groupedItems).sort((a, b) => parseInt(a) - parseInt(b));

  // 통계
  const totalItems = filteredItems.length;
  const itemsWithBids = filteredItems.filter(item => item.bidCount > 0).length;
  const itemsWithoutBids = filteredItems.filter(item => item.bidCount === 0).length;
  const totalBidAmount = filteredItems.reduce((sum, item) => sum + (item.currentHighestBid * item.weight), 0);

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
              max={todayStr}
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
          <div className="text-xl font-bold text-gray-900">{totalItems}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">입찰 있음</div>
          <div className="text-xl font-bold text-gray-900">{itemsWithBids}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">입찰 없음</div>
          <div className="text-xl font-bold text-gray-900">{itemsWithoutBids}건</div>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <div className="text-xs text-gray-500">현재 총 입찰금액</div>
          <div className="text-xl font-bold text-gray-900">{Math.round(totalBidAmount).toLocaleString()}원</div>
        </div>
      </div>

      {/* 경매 현황 테이블 */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0">
            <tr>
              <th className={`${thClass} w-[30px]`}></th>
              <th className={`${thClass} w-[120px]`}>상장번호</th>
              <th className={`${thClass} w-[80px]`}>부위</th>
              <th className={`${thClass} w-[60px]`}>등급</th>
              <th className={`${thClass} w-[60px]`}>중량</th>
              <th className={`${thClass} w-[80px]`}>최저가격</th>
              <th className={`${thClass} w-[90px]`}>최고입찰가격</th>
              <th className={`${thClass} w-[100px]`}>총입찰가격</th>
              <th className={`${thClass} w-[80px]`}>중도매인번호</th>
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
                          {item.bids.length > 0 ? item.bids[0].dealerNo : '-'}
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
                            <div className="p-3 border-t border-gray-200">
                              <div className="text-xs font-semibold text-gray-700 mb-2">입찰 내역 ({item.bids.length}건)</div>
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 text-center w-[70px]">상태</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 text-center w-[100px]">중도매인번호</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 text-center w-[100px]">중도매인명</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 text-center w-[100px]">입찰가</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 text-center w-[120px]">총입찰금액</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 text-center w-[140px]">입찰시간</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.bids.map((bid) => (
                                    <tr key={bid.id} className="bg-white">
                                      <td className={`px-2 py-1 text-xs border border-gray-200 text-center ${bid.rank === 1 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                        {bid.rank === 1 ? '최고순위' : '차순위'}
                                      </td>
                                      <td className="px-2 py-1 text-xs border border-gray-200 text-center">{bid.dealerNo}</td>
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
                    <tr className="font-semibold border-t-2 border-gray-300">
                      <td className={tdClass}></td>
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
                      <td colSpan={11} className="h-1 bg-gray-300"></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {/* 전체 합계 */}
            {showSubtotal && (
              <>
                <tr>
                  <td colSpan={11} className="h-1 bg-gray-400"></td>
                </tr>
                <tr className="bg-gray-200 font-bold">
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-left`} colSpan={2}>
                    전체 합계 ({filteredItems.length}부위, 입찰 {itemsWithBids}건)
                  </td>
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-right`}>
                    {filteredItems.reduce((sum, item) => sum + item.weight, 0).toFixed(1)}
                  </td>
                  <td className={tdClass}></td>
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-right text-gray-900`}>
                    {totalBidAmount > 0 ? Math.round(totalBidAmount).toLocaleString() : '-'}
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
    </CompanyLayout>
  );
}
