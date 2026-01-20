'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

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

// 수정 모달 타입
interface EditModalData {
  itemId: string;
  bid: BidRecord;
  weight: number;
  action: 'edit' | 'delete' | 'changeBidder';
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

// 중도매인 데이터 (회원관리와 일치)
const DEALERS = [
  { no: '7000001', name: '김철수' },
  { no: '7000002', name: '이영희' },
  { no: '7000003', name: '박민수' },
  { no: '7000004', name: '최지현' },
  { no: '7000005', name: '정대호' },
];

// 상장업체 데이터
const COMPANIES = [
  { no: '100', name: '건화' },
  { no: '200', name: '대진엠에스' },
  { no: '300', name: '안심엘피씨' },
  { no: '400', name: '정직한고기' },
];

// 더미 데이터 생성 (날짜 파라미터 추가)
const generateDummyData = (targetDate: Date): AuctionItem[] => {
  const dateCode = `${String(targetDate.getFullYear()).slice(2)}${String(targetDate.getMonth() + 1).padStart(2, '0')}${String(targetDate.getDate()).padStart(2, '0')}`;
  const grades = ['1++A', '1++B', '1+A', '1+B', '1A', '1B'];
  
  const items: AuctionItem[] = [];
  
  // 각 업체당 2두씩, 총 8두 * 19부위 = 152개 항목
  COMPANIES.forEach((company, companyIdx) => {
    for (let cattleIdx = 0; cattleIdx < 2; cattleIdx++) {
      const cattleNo = parseInt(company.no) + cattleIdx + 1;
      const gradeIdx = (companyIdx + cattleIdx) % grades.length;
      const grade = grades[gradeIdx];
      const gradeMultiplier = grade.startsWith('1++') ? 1.0 : grade.startsWith('1+') ? 0.9 : 0.8;
      
      PART_NAMES.forEach((partName, partIdx) => {
        const partNo = partIdx + 1;
        const listingNo = `${dateCode}-${cattleNo}-${String(partNo).padStart(2, '0')}`;
        
        const baseWeight = PART_WEIGHTS[partName];
        const weightVariation = ((companyIdx * 5 + cattleIdx * 3 + partIdx) % 20 - 10) / 10;
        const weight = Number((baseWeight + weightVariation).toFixed(1));
        
        const basePrice = PART_PRICES[partName];
        const minPrice = Math.round(basePrice * gradeMultiplier);
        
        // 입찰 데이터 생성 (0~5명)
        const bidCount = (companyIdx + cattleIdx + partIdx) % 6;
        const bids: BidRecord[] = [];
        
        if (bidCount > 0) {
          // 입찰자 선정 (중복 없이)
          const shuffledDealers = [...DEALERS]
            .sort((a, b) => {
              const seedA = (companyIdx * 100 + cattleIdx * 10 + partIdx + parseInt(a.no)) % 100;
              const seedB = (companyIdx * 100 + cattleIdx * 10 + partIdx + parseInt(b.no)) % 100;
              return seedA - seedB;
            })
            .slice(0, bidCount);
          
          // 입찰가 생성 (최저가 기준 +0~20%)
          const bidPrices = shuffledDealers.map((_, idx) => {
            const increase = ((companyIdx + cattleIdx + partIdx + idx) % 20) / 100;
            return Math.round(minPrice * (1 + increase));
          }).sort((a, b) => b - a); // 내림차순 정렬
          
          shuffledDealers.forEach((dealer, idx) => {
            const hours = 9;
            // 높은 가격(낮은 idx)일수록 늦은 시간 (최고가 갱신 순서)
            const baseMinutes = (companyIdx * 10 + cattleIdx * 5 + partIdx) % 50;
            const reverseIdx = bidCount - 1 - idx; // 순서 역전
            const minutes = baseMinutes + reverseIdx * 2;
            const seconds = reverseIdx * 15 % 60;
            
            // 날짜 포함한 입찰시간
            const dateStr = `${String(targetDate.getFullYear()).slice(2)}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${String(targetDate.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            bids.push({
              id: `${listingNo}-${dealer.no}`,
              dealerNo: dealer.no,
              dealerName: dealer.name,
              bidPrice: bidPrices[idx],
              bidTime: `${dateStr} ${timeStr}`,
              rank: idx + 1,
            });
          });
        }
        
        const currentHighestBid = bids.length > 0 ? bids[0].bidPrice : 0;
        
        items.push({
          id: listingNo,
          listingNo,
          partName,
          companyName: company.name,
          grade,
          weight,
          minPrice,
          currentHighestBid,
          bidCount,
          bids,
        });
      });
    }
  });
  
  return items;
};

// 개체번호 추출 함수 (260120-101-01 -> 101)
const getCattleNo = (listingNo: string): string => {
  const parts = listingNo.split('-');
  return parts.length >= 2 ? parts[1] : '';
};

// 2차 비밀번호 (실제로는 서버에서 검증)
const SECONDARY_PASSWORD = '1234';

export default function AuctionLivePage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // 조회 날짜 상태
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>(generateDummyData(today));
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [bidFilter, setBidFilter] = useState('all'); // all, withBids, withoutBids
  const [showSubtotal, setShowSubtotal] = useState(true); // 개체별 소계 표시 여부
  
  // 수정 모달 상태
  const [editModal, setEditModal] = useState<EditModalData | null>(null);
  const [secondaryPassword, setSecondaryPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newBidPrice, setNewBidPrice] = useState('');
  const [newDealerNo, setNewDealerNo] = useState('');

  // 마감 관리 상태
  const [isAuctionClosed, setIsAuctionClosed] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [closePasswordError, setClosePasswordError] = useState('');

  // 오늘 날짜인지 확인
  const isToday = selectedDate === todayStr;

  // 날짜 변경 시 데이터 재생성
  useEffect(() => {
    const date = new Date(selectedDate);
    setAuctionItems(generateDummyData(date));
    setExpandedItems([]);
    // 과거 날짜면 마감 완료 상태로
    setIsAuctionClosed(!isToday);
  }, [selectedDate, isToday]);

  // 마감 처리
  const handleCloseAuction = () => {
    if (closePassword !== SECONDARY_PASSWORD) {
      setClosePasswordError('2차 비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsAuctionClosed(true);
    setShowCloseModal(false);
    setClosePassword('');
    setClosePasswordError('');
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // 수정 모달 열기
  const openEditModal = (itemId: string, bid: BidRecord, weight: number, action: 'edit' | 'delete' | 'changeBidder') => {
    setEditModal({ itemId, bid, weight, action });
    setSecondaryPassword('');
    setPasswordError('');
    setNewBidPrice(bid.bidPrice.toString());
    setNewDealerNo(bid.dealerNo);
  };

  // 모달 닫기
  const closeModal = () => {
    setEditModal(null);
    setSecondaryPassword('');
    setPasswordError('');
    setNewBidPrice('');
    setNewDealerNo('');
  };

  // 수정 실행
  const handleEdit = () => {
    if (secondaryPassword !== SECONDARY_PASSWORD) {
      setPasswordError('2차 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!editModal) return;

    const { itemId, bid, action } = editModal;
    
    setAuctionItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      let updatedBids = [...item.bids];
      
      if (action === 'edit') {
        // 입찰가 수정
        updatedBids = updatedBids.map(b => 
          b.id === bid.id ? { ...b, bidPrice: parseInt(newBidPrice.replace(/,/g, '')) } : b
        );
        // 가격순으로 재정렬 및 순위 재산정
        updatedBids.sort((a, b) => b.bidPrice - a.bidPrice);
        updatedBids = updatedBids.map((b, idx) => ({ ...b, rank: idx + 1 }));
      } else if (action === 'delete') {
        // 입찰 삭제 (유찰 처리)
        updatedBids = updatedBids.filter(b => b.id !== bid.id);
        // 순위 재산정
        updatedBids = updatedBids.map((b, idx) => ({ ...b, rank: idx + 1 }));
      } else if (action === 'changeBidder') {
        // 낙찰자 변경
        const dealer = DEALERS.find(d => d.no === newDealerNo);
        if (dealer) {
          updatedBids = updatedBids.map(b => 
            b.id === bid.id ? { ...b, dealerNo: dealer.no, dealerName: dealer.name } : b
          );
        }
      }
      
      const newHighestBid = updatedBids.length > 0 ? updatedBids[0].bidPrice : 0;
      
      return {
        ...item,
        bids: updatedBids,
        bidCount: updatedBids.length,
        currentHighestBid: newHighestBid,
      };
    }));
    
    closeModal();
  };

  const filteredItems = auctionItems.filter(item => {
    const companyMatch = companyFilter === 'all' || item.companyName === companyFilter;
    const bidMatch = bidFilter === 'all' 
      || (bidFilter === 'withBids' && item.bidCount > 0)
      || (bidFilter === 'withoutBids' && item.bidCount === 0);
    return companyMatch && bidMatch;
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

  // 개체번호 순으로 정렬
  const sortedCattleNos = Object.keys(groupedItems).sort((a, b) => parseInt(a) - parseInt(b));

  // 통계
  const totalItems = filteredItems.length;
  const itemsWithBids = filteredItems.filter(item => item.bidCount > 0).length;
  const itemsWithoutBids = filteredItems.filter(item => item.bidCount === 0).length;
  const totalBidAmount = filteredItems.reduce((sum, item) => sum + (item.currentHighestBid * item.weight), 0);

  const thClass = "px-2 py-1.5 text-xs font-medium text-gray-700 whitespace-nowrap border border-gray-200 bg-gray-100 text-center";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">부분육 경매 현황(실시간)</h1>
        
        {/* 마감 관리 */}
        <div className="flex items-center gap-4">
          {/* 마감 상태 */}
          {isAuctionClosed && (
            <div className="px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm">
              마감 완료
            </div>
          )}
          
          {/* 마감 버튼 (오늘 날짜이고 마감 전일 때만) */}
          {isToday && !isAuctionClosed && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-900"
            >
              마감
            </button>
          )}
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-xs text-gray-500">총 상장</div>
          <div className="text-xl font-bold text-gray-900">{totalItems}건</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-xs text-gray-500">입찰 있음</div>
          <div className="text-xl font-bold text-green-600">{itemsWithBids}건</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-xs text-gray-500">입찰 없음</div>
          <div className="text-xl font-bold text-orange-500">{itemsWithoutBids}건</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="text-xs text-gray-500">현재 총 입찰금액</div>
          <div className="text-xl font-bold text-blue-600">{Math.round(totalBidAmount).toLocaleString()}원</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">조회일자</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={todayStr}
              className="px-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white"
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
              className="px-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white min-w-[120px]"
            >
              <option value="all">전체</option>
              {COMPANIES.map(company => (
                <option key={company.no} value={company.name}>{company.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">입찰상태</span>
            <select
              value={bidFilter}
              onChange={(e) => setBidFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded text-xs outline-none bg-white min-w-[100px]"
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
                className="w-4 h-4 rounded appearance-none bg-white border border-gray-200 checked:bg-red-600 checked:border-red-600 relative
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
                setCompanyFilter('all');
                setBidFilter('all');
              }}
              className="px-4 py-1.5 border border-gray-200 text-gray-600 rounded text-xs hover:bg-gray-50"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* 경매 현황 테이블 */}
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
                        className={`hover:bg-gray-50 cursor-pointer ${item.bidCount === 0 ? 'bg-orange-50' : ''}`}
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
                        <td className={`${tdClass} text-right font-semibold ${item.currentHighestBid > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {item.currentHighestBid > 0 ? item.currentHighestBid.toLocaleString() : '-'}
                        </td>
                        <td className={`${tdClass} text-right font-semibold ${item.currentHighestBid > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {item.currentHighestBid > 0 ? Math.round(item.currentHighestBid * item.weight).toLocaleString() : '-'}
                        </td>
                        <td className={`${tdClass} ${item.bidCount > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                          {item.bidCount}
                        </td>
                      </tr>
                      {/* 입찰 내역 펼침 */}
                      {expandedItems.includes(item.id) && item.bids.length > 0 && (
                        <tr>
                          <td colSpan={10} className="p-0">
                            <div className="bg-blue-50 p-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">입찰 내역 ({item.bids.length}건)</div>
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 border border-blue-200 text-center w-[70px]">상태</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 border border-blue-200 text-center w-[100px]">중도매인번호</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 border border-blue-200 text-center w-[100px]">중도매인명</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 border border-blue-200 text-center w-[100px]">입찰가</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 border border-blue-200 text-center w-[120px]">총입찰금액</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 border border-blue-200 text-center w-[140px]">입찰시간</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 border border-blue-200 text-center w-[120px]">관리</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.bids.map((bid) => (
                                    <tr key={bid.id} className={bid.rank === 1 ? 'bg-yellow-50' : 'bg-white'}>
                                      <td className={`px-2 py-1 text-xs border border-blue-200 text-center ${bid.rank === 1 ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
                                        {bid.rank === 1 ? '최고순위' : '차순위'}
                                      </td>
                                      <td className="px-2 py-1 text-xs border border-blue-200 text-center">{bid.dealerNo}</td>
                                      <td className="px-2 py-1 text-xs border border-blue-200 text-center">{bid.dealerName}</td>
                                      <td className={`px-2 py-1 text-xs border border-blue-200 text-right ${bid.rank === 1 ? 'font-bold text-blue-600' : ''}`}>
                                        {bid.bidPrice.toLocaleString()}원
                                      </td>
                                      <td className={`px-2 py-1 text-xs border border-blue-200 text-right ${bid.rank === 1 ? 'font-bold text-blue-600' : ''}`}>
                                        {Math.round(bid.bidPrice * item.weight).toLocaleString()}원
                                      </td>
                                      <td className="px-2 py-1 text-xs border border-blue-200 text-center text-gray-500">{bid.bidTime}</td>
                                      <td className="px-2 py-1 text-xs border border-blue-200 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditModal(item.id, bid, item.weight, 'edit');
                                            }}
                                            className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
                                            title="입찰가 수정"
                                          >
                                            수정
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditModal(item.id, bid, item.weight, 'changeBidder');
                                            }}
                                            className="px-1.5 py-0.5 text-[10px] bg-green-500 text-white rounded hover:bg-green-600"
                                            title="낙찰자 변경"
                                          >
                                            변경
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditModal(item.id, bid, item.weight, 'delete');
                                            }}
                                            className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded hover:bg-red-600"
                                            title="입찰 삭제"
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
                    <tr className="bg-gray-100 font-semibold">
                      <td className={tdClass}></td>
                      <td className={`${tdClass} text-left`} colSpan={2}>
                        개체 {cattleNo} 소계 ({cattleItems.length}부위, 입찰 {itemsWithBidsInCattle}건)
                      </td>
                      <td className={tdClass}></td>
                      <td className={tdClass}></td>
                      <td className={`${tdClass} text-right`}>{subtotalWeight.toFixed(1)}</td>
                      <td className={tdClass}></td>
                      <td className={tdClass}></td>
                      <td className={`${tdClass} text-right text-blue-600`}>
                        {subtotalBidAmount > 0 ? Math.round(subtotalBidAmount).toLocaleString() : '-'}
                      </td>
                      <td className={`${tdClass} text-green-600`}>{subtotalBidCount}</td>
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
            {showSubtotal && (
              <>
                <tr>
                  <td colSpan={10} className="h-1 bg-gray-400"></td>
                </tr>
                <tr className="bg-gray-200 font-bold">
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-left`} colSpan={2}>
                    전체 합계 ({filteredItems.length}부위, 입찰 {itemsWithBids}건)
                  </td>
                  <td className={tdClass}></td>
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-right`}>
                    {filteredItems.reduce((sum, item) => sum + item.weight, 0).toFixed(1)}
                  </td>
                  <td className={tdClass}></td>
                  <td className={tdClass}></td>
                  <td className={`${tdClass} text-right text-blue-600`}>
                    {totalBidAmount > 0 ? Math.round(totalBidAmount).toLocaleString() : '-'}
                  </td>
                  <td className={`${tdClass} text-green-600`}>
                    {filteredItems.reduce((sum, item) => sum + item.bidCount, 0)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* 수정/삭제/변경 모달 */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editModal.action === 'edit' && '입찰가 수정'}
                {editModal.action === 'delete' && '입찰 삭제 (유찰 처리)'}
                {editModal.action === 'changeBidder' && '낙찰자 변경'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-4 space-y-4">
              {/* 현재 입찰 정보 */}
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">중도매인:</span> {editModal.bid.dealerName} ({editModal.bid.dealerNo})</div>
                  <div><span className="text-gray-500">현재 입찰가:</span> {editModal.bid.bidPrice.toLocaleString()}원</div>
                  <div><span className="text-gray-500">총 입찰금액:</span> {Math.round(editModal.bid.bidPrice * editModal.weight).toLocaleString()}원</div>
                  <div><span className="text-gray-500">입찰시간:</span> {editModal.bid.bidTime}</div>
                </div>
              </div>

              {/* 수정 입력 필드 */}
              {editModal.action === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">새 입찰가</label>
                  <input
                    type="text"
                    value={newBidPrice ? parseInt(newBidPrice.replace(/,/g, '')).toLocaleString() : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                      setNewBidPrice(rawValue);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 bg-white"
                    placeholder="새 입찰가 입력"
                  />
                  {newBidPrice && (
                    <div className="text-xs text-gray-500 mt-1">
                      총 입찰금액: {Math.round(parseInt(newBidPrice.replace(/,/g, '')) * editModal.weight).toLocaleString()}원
                    </div>
                  )}
                </div>
              )}

              {/* 낙찰자 변경 */}
              {editModal.action === 'changeBidder' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">새 낙찰자</label>
                  <select
                    value={newDealerNo}
                    onChange={(e) => setNewDealerNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    {DEALERS.map(dealer => (
                      <option key={dealer.no} value={dealer.no}>
                        {dealer.name} ({dealer.no})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 삭제 확인 메시지 */}
              {editModal.action === 'delete' && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  이 입찰을 삭제하면 해당 입찰이 유찰 처리됩니다. 계속하시겠습니까?
                </div>
              )}

              {/* 2차 비밀번호 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  2차 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={secondaryPassword}
                  onChange={(e) => {
                    setSecondaryPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500 bg-white"
                  placeholder="2차 비밀번호 입력"
                />
                {passwordError && (
                  <div className="text-xs text-red-500 mt-1">{passwordError}</div>
                )}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleEdit}
                className={`px-4 py-2 text-sm text-white rounded ${
                  editModal.action === 'delete' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {editModal.action === 'edit' && '수정'}
                {editModal.action === 'delete' && '삭제'}
                {editModal.action === 'changeBidder' && '변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 마감 모달 */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px]">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">경매 마감</h3>
              <button onClick={() => {
                setShowCloseModal(false);
                setClosePassword('');
                setClosePasswordError('');
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-4 space-y-4">
              {/* 마감 현황 요약 */}
              <div className="border border-gray-200 rounded p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">마감 현황</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">총 상장</span>
                    <span>{auctionItems.length}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">낙찰</span>
                    <span>{auctionItems.filter(item => item.bidCount > 0).length}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">유찰</span>
                    <span>{auctionItems.filter(item => item.bidCount === 0).length}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">낙찰률</span>
                    <span>{((auctionItems.filter(item => item.bidCount > 0).length / auctionItems.length) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="text-gray-500">총 낙찰금액</span>
                    <span className="font-semibold">
                      {Math.round(auctionItems.reduce((sum, item) => sum + (item.currentHighestBid * item.weight), 0)).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              {/* 2차 비밀번호 입력 */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  2차 비밀번호
                </label>
                <input
                  type="password"
                  value={closePassword}
                  onChange={(e) => {
                    setClosePassword(e.target.value);
                    setClosePasswordError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-gray-400 bg-white"
                  placeholder="2차 비밀번호 입력"
                />
                {closePasswordError && (
                  <div className="text-xs text-red-500 mt-1">{closePasswordError}</div>
                )}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setClosePassword('');
                  setClosePasswordError('');
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCloseAuction}
                className="px-4 py-2 text-sm text-white bg-gray-800 rounded hover:bg-gray-900"
              >
                마감
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
