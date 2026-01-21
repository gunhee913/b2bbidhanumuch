'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

// 수정 이력 타입
interface EditHistory {
  editedAt: string;
  editedBy: string; // 수정자
  previousDealerNo: string;
  previousDealerName: string;
  previousBidPrice: number;
  newDealerNo: string;
  newDealerName: string;
  newBidPrice: number;
}

// 현재 로그인한 관리자 (실제로는 세션에서 가져옴)
const CURRENT_ADMIN = '관리자1';

// 입찰 내역 타입
interface BidRecord {
  id: string;
  dealerNo: string;
  dealerName: string;
  bidPrice: number;
  bidTime: string;
  rank: number;
  editHistory?: EditHistory[]; // 수정 이력
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
        
        // 입찰 데이터 생성 (0~8건, 같은 사람이 재입찰 가능)
        const bidSeed = (companyIdx * 17 + cattleIdx * 31 + partIdx * 7) % 100;
        const totalBidCount = bidSeed < 10 ? 0 : bidSeed < 20 ? 1 : bidSeed < 35 ? 2 : bidSeed < 50 ? 3 : bidSeed < 65 ? 4 : bidSeed < 80 ? 5 : bidSeed < 90 ? 6 : 7;
        const bids: BidRecord[] = [];
        
        if (totalBidCount > 0) {
          const seed = companyIdx * 7 + cattleIdx * 13 + partIdx * 17;
          const dateStr = `${String(targetDate.getFullYear()).slice(2)}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${String(targetDate.getDate()).padStart(2, '0')}`;
          
          // 입찰 이력 생성 (시간순으로)
          let currentPrice = minPrice;
          const baseMinutes = (companyIdx * 10 + cattleIdx * 5 + partIdx) % 40 + 5;
          
          for (let bidIdx = 0; bidIdx < totalBidCount; bidIdx++) {
            // 입찰자 선정 (재입찰 가능하도록)
            const dealerSeed = (seed * (bidIdx + 1) * 13) % DEALERS.length;
            const dealer = DEALERS[dealerSeed];
            
            // 가격 증가 (500~2000원 단위로 불규칙하게)
            const priceIncrease = ((seed + bidIdx * 7) % 4 + 1) * 500;
            currentPrice = currentPrice + priceIncrease;
            
            // 입찰 시간 (뒤로 갈수록 늦은 시간)
            const minutes = baseMinutes + bidIdx * 2;
            const seconds = (bidIdx * 17) % 60;
            const timeStr = `09:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            bids.push({
              id: `${listingNo}-${bidIdx}`,
              dealerNo: dealer.no,
              dealerName: dealer.name,
              bidPrice: currentPrice,
              bidTime: `${dateStr} ${timeStr}`,
              rank: 0, // 나중에 계산
            });
          }
          
          // 가격 내림차순 정렬 후 순위 부여 (최고가가 1위)
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
          companyName: company.name,
          grade,
          weight,
          minPrice,
          currentHighestBid,
          bidCount: bids.length,
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
  
  // 인라인 수정 상태
  const [editingBidKey, setEditingBidKey] = useState<string | null>(null); // itemId-bidId
  const [editFormData, setEditFormData] = useState({ dealerNo: '', bidPrice: '', password: '' });
  const [editPasswordError, setEditPasswordError] = useState('');
  
  // 삭제 모달 상태
  const [deleteModal, setDeleteModal] = useState<{ itemId: string; bid: BidRecord } | null>(null);
  const [secondaryPassword, setSecondaryPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  // 인라인 수정 시작
  const startEditing = (itemId: string, bid: BidRecord) => {
    setEditingBidKey(`${itemId}-${bid.id}`);
    setEditFormData({
      dealerNo: bid.dealerNo,
      bidPrice: bid.bidPrice.toLocaleString(),
      password: '',
    });
    setEditPasswordError('');
  };

  // 인라인 수정 취소
  const cancelEditing = () => {
    setEditingBidKey(null);
    setEditFormData({ dealerNo: '', bidPrice: '', password: '' });
    setEditPasswordError('');
  };

  // 현재 시간 포맷팅
  const formatCurrentTime = () => {
    const now = new Date();
    return `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  };

  // 인라인 수정 저장
  const saveEditing = (itemId: string, bidId: string) => {
    // 2차 비밀번호 확인
    if (editFormData.password !== SECONDARY_PASSWORD) {
      setEditPasswordError('비밀번호 오류');
      return;
    }

    const dealer = DEALERS.find(d => d.no === editFormData.dealerNo);
    if (!dealer) {
      alert('올바른 중도매인을 선택하세요.');
      return;
    }

    const newPrice = parseInt(editFormData.bidPrice.replace(/,/g, ''));
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('올바른 입찰가를 입력하세요.');
      return;
    }

    setAuctionItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      let updatedBids = item.bids.map(b => {
        if (b.id !== bidId) return b;
        
        // 수정 이력 추가 (수정자 포함)
        const editHistoryEntry: EditHistory = {
          editedAt: formatCurrentTime(),
          editedBy: CURRENT_ADMIN,
          previousDealerNo: b.dealerNo,
          previousDealerName: b.dealerName,
          previousBidPrice: b.bidPrice,
          newDealerNo: dealer.no,
          newDealerName: dealer.name,
          newBidPrice: newPrice,
        };
        
        return {
          ...b,
          dealerNo: dealer.no,
          dealerName: dealer.name,
          bidPrice: newPrice,
          editHistory: [...(b.editHistory || []), editHistoryEntry],
        };
      });
      
      // 가격순으로 재정렬 및 순위 재산정
      updatedBids.sort((a, b) => b.bidPrice - a.bidPrice);
      updatedBids = updatedBids.map((b, idx) => ({ ...b, rank: idx + 1 }));
      
      const newHighestBid = updatedBids.length > 0 ? updatedBids[0].bidPrice : 0;
      
      return {
        ...item,
        bids: updatedBids,
        bidCount: updatedBids.length,
        currentHighestBid: newHighestBid,
      };
    }));
    
    cancelEditing();
  };

  // 삭제 모달 열기
  const openDeleteModal = (itemId: string, bid: BidRecord) => {
    setDeleteModal({ itemId, bid });
    setSecondaryPassword('');
    setPasswordError('');
  };

  // 삭제 모달 닫기
  const closeDeleteModal = () => {
    setDeleteModal(null);
    setSecondaryPassword('');
    setPasswordError('');
  };

  // 삭제 실행
  const handleDelete = () => {
    if (secondaryPassword !== SECONDARY_PASSWORD) {
      setPasswordError('2차 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!deleteModal) return;

    const { itemId, bid } = deleteModal;
    
    setAuctionItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      let updatedBids = item.bids.filter(b => b.id !== bid.id);
      updatedBids = updatedBids.map((b, idx) => ({ ...b, rank: idx + 1 }));
      
      const newHighestBid = updatedBids.length > 0 ? updatedBids[0].bidPrice : 0;
      
      return {
        ...item,
        bids: updatedBids,
        bidCount: updatedBids.length,
        currentHighestBid: newHighestBid,
      };
    }));
    
    closeDeleteModal();
  };

  // 입찰가 포맷팅
  const formatBidPrice = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    return numbers ? parseInt(numbers).toLocaleString() : '';
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

  const thClass = "px-2 py-1.5 text-xs font-medium text-gray-600 whitespace-nowrap border border-gray-200 bg-gray-50 text-center";
  const tdClass = "px-2 py-1.5 text-xs border border-gray-200 text-center whitespace-nowrap";

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
                setCompanyFilter('all');
                setBidFilter('all');
              }}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 text-xs hover:bg-gray-50"
            >
              초기화
            </button>
            {/* 마감 상태 */}
            {isAuctionClosed && (
              <div className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs">
                마감 완료
              </div>
            )}
            {/* 마감 버튼 (오늘 날짜이고 마감 전일 때만) */}
            {isToday && !isAuctionClosed && (
              <button
                onClick={() => setShowCloseModal(true)}
                className="px-4 py-1.5 bg-gray-700 text-white text-xs hover:bg-gray-800"
              >
                마감
              </button>
            )}
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
              <th className={`${thClass} w-[90px]`}>상장업체</th>
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
                          <td colSpan={12} className="p-0">
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
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 text-center w-[60px]">수정</th>
                                    <th className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 text-center w-[130px]">관리</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.bids.map((bid) => {
                                    const isEditing = editingBidKey === `${item.id}-${bid.id}`;
                                    return (
                                      <tr key={bid.id} className="bg-white">
                                        <td className={`px-2 py-1 text-xs border border-gray-200 text-center ${bid.rank === 1 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                          {bid.rank === 1 ? '최고순위' : '차순위'}
                                        </td>
                                        {isEditing ? (
                                          <>
                                            <td className="px-2 py-1 text-xs border border-gray-200 text-center">
                                              <select
                                                value={editFormData.dealerNo}
                                                onChange={(e) => setEditFormData({ ...editFormData, dealerNo: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full px-1 py-0.5 text-xs border border-gray-300 bg-white outline-none"
                                              >
                                                {DEALERS.map(d => (
                                                  <option key={d.no} value={d.no}>{d.no}</option>
                                                ))}
                                              </select>
                                            </td>
                                            <td className="px-2 py-1 text-xs border border-gray-200 text-center">
                                              {DEALERS.find(d => d.no === editFormData.dealerNo)?.name || '-'}
                                            </td>
                                            <td className="px-2 py-1 text-xs border border-gray-200">
                                              <input
                                                type="text"
                                                value={editFormData.bidPrice}
                                                onChange={(e) => setEditFormData({ ...editFormData, bidPrice: formatBidPrice(e.target.value) })}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full px-1 py-0.5 text-xs border border-gray-300 bg-white outline-none text-right"
                                              />
                                            </td>
                                            <td className="px-2 py-1 text-xs border border-gray-200 text-right text-gray-500">
                                              {(parseInt(editFormData.bidPrice.replace(/,/g, '') || '0') * item.weight).toLocaleString()}원
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="px-2 py-1 text-xs border border-gray-200 text-center">{bid.dealerNo}</td>
                                            <td className="px-2 py-1 text-xs border border-gray-200 text-center">{bid.dealerName}</td>
                                            <td className={`px-2 py-1 text-xs border border-gray-200 text-right ${bid.rank === 1 ? 'font-bold text-gray-900' : ''}`}>
                                              {bid.bidPrice.toLocaleString()}원
                                            </td>
                                            <td className={`px-2 py-1 text-xs border border-gray-200 text-right ${bid.rank === 1 ? 'font-bold text-gray-900' : ''}`}>
                                              {Math.round(bid.bidPrice * item.weight).toLocaleString()}원
                                            </td>
                                          </>
                                        )}
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center text-gray-500">{bid.bidTime}</td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center">
                                          {bid.editHistory && bid.editHistory.length > 0 ? (
                                            <span 
                                              className="text-gray-900 font-semibold cursor-help"
                                              title={bid.editHistory.map((h, idx) => 
                                                `[${idx + 1}차 수정] ${h.editedAt} (${h.editedBy})\n` +
                                                `  ${h.previousDealerName}(${h.previousDealerNo}) → ${h.newDealerName}(${h.newDealerNo})\n` +
                                                `  ${h.previousBidPrice.toLocaleString()}원 → ${h.newBidPrice.toLocaleString()}원`
                                              ).join('\n\n')}
                                            >
                                              {bid.editHistory.length}회
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </td>
                                        <td className="px-2 py-1 text-xs border border-gray-200 text-center">
                                          {isEditing ? (
                                            <div className="flex items-center justify-center gap-1">
                                              <div className="relative">
                                                <input
                                                  type="password"
                                                  value={editFormData.password}
                                                  onChange={(e) => {
                                                    setEditFormData({ ...editFormData, password: e.target.value });
                                                    setEditPasswordError('');
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  placeholder="2차PW"
                                                  className={`w-[50px] px-1 py-0.5 text-[10px] border ${editPasswordError ? 'border-red-400' : 'border-gray-300'} bg-white outline-none text-center`}
                                                />
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  saveEditing(item.id, bid.id);
                                                }}
                                                className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-white hover:bg-gray-800"
                                              >
                                                저장
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  cancelEditing();
                                                }}
                                                className="px-1.5 py-0.5 text-[10px] border border-gray-400 text-gray-600 hover:bg-gray-100"
                                              >
                                                취소
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-center gap-1">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  startEditing(item.id, bid);
                                                }}
                                                className="px-1.5 py-0.5 text-[10px] bg-gray-600 text-white hover:bg-gray-700"
                                                title="수정"
                                              >
                                                수정
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openDeleteModal(item.id, bid);
                                                }}
                                                className="px-1.5 py-0.5 text-[10px] border border-gray-400 text-gray-600 hover:bg-gray-100"
                                                title="삭제"
                                              >
                                                삭제
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
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
                      <td colSpan={12} className="h-1 bg-gray-300"></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {/* 전체 합계 */}
            {showSubtotal && (
              <>
                <tr>
                  <td colSpan={12} className="h-1 bg-gray-400"></td>
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

      {/* 삭제 확인 모달 */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-[400px]">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">입찰 삭제</h3>
              <button onClick={closeDeleteModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-4 space-y-4">
              {/* 삭제 대상 정보 */}
              <div className="bg-gray-50 p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">중도매인:</span> {deleteModal.bid.dealerName} ({deleteModal.bid.dealerNo})</div>
                  <div><span className="text-gray-500">입찰가:</span> {deleteModal.bid.bidPrice.toLocaleString()}원</div>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-100 p-3">
                이 입찰을 삭제하시겠습니까?
              </div>

              {/* 2차 비밀번호 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  2차 비밀번호
                </label>
                <input
                  type="password"
                  value={secondaryPassword}
                  onChange={(e) => {
                    setSecondaryPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-200 text-sm outline-none bg-white"
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
                onClick={closeDeleteModal}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-white bg-gray-700 hover:bg-gray-800"
              >
                삭제
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
