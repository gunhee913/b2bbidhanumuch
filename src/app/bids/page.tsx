'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Bell, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { useSession } from 'next-auth/react';
import { useMyBidsWithStatus } from '@/features/bids/hooks';
import { MyBidItem } from '@/features/bids/types';
import { format } from 'date-fns';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';

// 숫자 포맷팅 함수
const formatNumber = (value: string) => {
  const num = value.replace(/[^0-9]/g, '');
  return num ? parseInt(num).toLocaleString() : '';
};

const removeCommas = (value: string) => {
  return value.replace(/,/g, '');
};

// 육량지수가 없는 등급에 기본값 'A' 추가
const addYieldGradeIfMissing = (grade: string) => {
  // 이미 A, B, C가 포함되어 있으면 그대로 반환
  if (/[ABC]/.test(grade)) return grade;
  // 1++, 1+, 1, 2 등급 뒤에 (숫자)가 있으면 그 앞에 A 추가
  // 예: "1++(9)" -> "1++A(9)"
  return grade.replace(/(\d\+*)\(/, '$1A(');
};

export default function BidsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'진행중' | '경매결과'>('진행중');
  const [statusFilter, setStatusFilter] = useState<'전체' | '최고순위' | '차순위'>('전체');
  const [resultFilter, setResultFilter] = useState<'전체' | '낙찰' | '미낙찰'>('전체');
  
  // 세션에서 dealerId 가져오기
  const { data: session } = useSession();
  const dealer = (session as any)?.dealer;
  const employee = (session as any)?.employee;
  const dealerId = dealer?.id || employee?.dealerId || null;
  
  // DB에서 나의 입찰 목록 조회
  const { data: myBids, isLoading: bidsLoading, refetch: refetchBids } = useMyBidsWithStatus(dealerId);
  
  // 실시간 입찰 변경 구독 (다른 사용자가 입찰하면 자동 새로고침)
  const handleBidChange = useCallback(() => {
    console.log('[Bids] 입찰 변경 감지 - 데이터 새로고침');
    refetchBids();
  }, [refetchBids]);
  
  useRealtimeBids({
    onBidChange: handleBidChange,
    enabled: !!dealerId,
  });
  
  // Hydration 오류 방지를 위해 클라이언트에서만 마운트
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 조회기간 (기본값: 1월 26일)
  const getDefaultDate = () => new Date(2026, 0, 26); // 2026년 1월 26일
  const [startDate, setStartDate] = useState<Date>(getDefaultDate());
  const [endDate, setEndDate] = useState<Date>(getDefaultDate());
  // 실제 조회에 사용되는 날짜 (조회 버튼 클릭 시 업데이트)
  const [searchStartDate, setSearchStartDate] = useState<Date>(getDefaultDate());
  const [searchEndDate, setSearchEndDate] = useState<Date>(getDefaultDate());
  
  const formatDateDisplay = (date: Date) => {
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };
  
  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };
  
  // 테이블 드래그 스크롤
  const tableRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // 테이블 스크롤 동기화
  const handleTableScroll = () => {
    if (tableRef.current && headerRef.current) {
      headerRef.current.scrollLeft = tableRef.current.scrollLeft;
    }
  };

  // 바텀시트 관련 상태
  const [showBidSheet, setShowBidSheet] = useState(false);
  const [selectedBidInfo, setSelectedBidInfo] = useState<{
    listingNo: string;
    bid: any;
    productInfo: any;
  } | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [showBidDialog, setShowBidDialog] = useState(false);


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tableRef.current.offsetLeft);
    setScrollLeft(tableRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    tableRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  // 재입찰 버튼 클릭 핸들러
  const handleReBidClick = (listingNo: string, bid: any, productInfo: any) => {
    setSelectedBidInfo({ listingNo, bid, productInfo });
    setBidPrice('');
    setShowBidSheet(true);
  };

  // 입찰하기 버튼 클릭 핸들러
  const handleBidSubmit = () => {
    if (!bidPrice || !selectedBidInfo) return;
    
    const price = parseFloat(removeCommas(bidPrice));
    if (price <= selectedBidInfo.bid.highestBid) {
      alert('현재 최고가보다 높은 금액을 입력해주세요.');
      return;
    }
    
    setShowBidSheet(false);
    setShowBidDialog(true);
  };

  // 최종 입찰 처리 (DB 저장)
  const confirmBid = async () => {
    if (!selectedBidInfo || !bidPrice || !dealerId) return;
    
    const price = parseFloat(removeCommas(bidPrice));
    const weight = parseFloat(selectedBidInfo.productInfo.weight.replace('kg', ''));
    
    try {
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: selectedBidInfo.bid.partId,
          dealerId: dealerId,
          bidPrice: price,
          weight: weight,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || '입찰 중 오류가 발생했습니다.');
        return;
      }
      
      // 입찰 목록 갱신
      refetchBids();
      
      setShowBidDialog(false);
      setSelectedBidInfo(null);
      setBidPrice('');
    } catch (error) {
      console.error('입찰 오류:', error);
      alert('입찰 중 오류가 발생했습니다.');
    }
  };

  // DB에서 가져온 모든 입찰 (오늘 날짜 필터는 DB에서 처리 가능하지만 현재는 전체)
  const allMyBids = myBids || [];

  // 예상 낙찰금액 계산
  const expectedAmounts = React.useMemo(() => {
    let highestCount = 0;
    let highestTotal = 0;
    let secondHighestCount = 0;
    let secondHighestTotal = 0;

    allMyBids.forEach((bid) => {
      const totalPrice = bid.totalAmount;

      if (bid.status === 'highest') {
        highestCount++;
        highestTotal += totalPrice;
      } else if (bid.status === 'secondHighest') {
        secondHighestCount++;
        secondHighestTotal += totalPrice;
      }
    });

    return {
      highestCount,
      highestTotal,
      secondHighestCount,
      secondHighestTotal,
      total: highestTotal + secondHighestTotal
    };
  }, [allMyBids]);

  // 필터 적용된 입찰 목록
  const filteredBids = allMyBids
    .filter((bid) => {
      if (statusFilter === '전체') return true;
      if (statusFilter === '최고순위') return bid.status === 'highest';
      if (statusFilter === '차순위') return bid.status === 'secondHighest';
      return true;
    })
    .sort((a, b) => {
      // 최고순위가 먼저 오도록 정렬
      if (a.status !== b.status) {
        return a.status === 'highest' ? -1 : 1;
      }
      // 같은 상태 내에서는 시간순 (최신순)
      const parseTime = (time: string) => {
        const match = time.match(/(\d{2})\.(\d{2})\.(\d{2}).*?(\d{2}):(\d{2})/);
        if (match) {
          return new Date(2000 + parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), parseInt(match[4]), parseInt(match[5])).getTime();
        }
        return 0;
      };
      return parseTime(b.time) - parseTime(a.time);
    });

  // 경매결과는 현재 DB에 별도 테이블이 없으므로 빈 배열 사용
  // TODO: 경매 마감 후 낙찰 결과 테이블 생성 필요
  const auctionResults: any[] = [];
  
  // 경매결과 필터 적용
  const filteredResults = auctionResults
    .filter((result) => {
      // 날짜 필터링
      const match = result.time.match(/(\d{2})\.(\d{2})\.(\d{2})/);
      if (match) {
        const resultDate = new Date(2000 + parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        const startDateOnly = new Date(searchStartDate.getFullYear(), searchStartDate.getMonth(), searchStartDate.getDate());
        const endDateOnly = new Date(searchEndDate.getFullYear(), searchEndDate.getMonth(), searchEndDate.getDate());
        if (resultDate < startDateOnly || resultDate > endDateOnly) {
          return false;
        }
      }
      // 결과 필터링
      if (resultFilter === '전체') return true;
      if (resultFilter === '낙찰') return result.result === 'won';
      if (resultFilter === '미낙찰') return result.result === 'lost';
      return true;
    })
    .sort((a, b) => {
      // 낙찰(won)이 먼저, 미낙찰(lost)이 나중
      if (a.result !== b.result) {
        return a.result === 'won' ? -1 : 1;
      }
      // 같은 결과 내에서는 시간순 (최신순)
      const parseTime = (time: string) => {
        const match = time.match(/(\d{2})\.(\d{2})\.(\d{2})\s*(\d{2}):(\d{2})/);
        if (match) {
          return new Date(2000 + parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), parseInt(match[4]), parseInt(match[5])).getTime();
        }
        return 0;
      };
      return parseTime(b.time) - parseTime(a.time);
    });

  // 경매결과 요약 계산
  const dateFilteredResults = auctionResults.filter((result) => {
    const match = result.time.match(/(\d{2})\.(\d{2})\.(\d{2})/);
    if (match) {
      const resultDate = new Date(2000 + parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      const startDateOnly = new Date(searchStartDate.getFullYear(), searchStartDate.getMonth(), searchStartDate.getDate());
      const endDateOnly = new Date(searchEndDate.getFullYear(), searchEndDate.getMonth(), searchEndDate.getDate());
      if (resultDate < startDateOnly || resultDate > endDateOnly) {
        return false;
      }
    }
    return true;
  });

  const resultSummary = React.useMemo(() => {
    let wonCount = 0;
    let wonTotal = 0;
    let lostCount = 0;
    let lostTotal = 0;

    dateFilteredResults.forEach((result) => {
      const weight = parseFloat(result.productInfo?.weight?.replace('kg', '') || '0');
      const totalPrice = result.myBid * weight;

      if (result.result === 'won') {
        wonCount++;
        wonTotal += totalPrice;
      } else {
        lostCount++;
        lostTotal += totalPrice;
      }
    });

    return { wonCount, wonTotal, lostCount, lostTotal };
  }, [dateFilteredResults]);

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
        <div 
          className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl relative overflow-hidden flex flex-col" 
          style={{
            height: 'calc(var(--vh, 1vh) * 100)',
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {/* 헤더 */}
          <div className="flex-shrink-0 bg-white">
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                {/* 왼쪽 여백 */}
                <div className="w-[80px]"></div>
                {/* 가운데 타이틀 */}
                <h1 className="text-[17px] font-bold text-gray-900">경매내역</h1>
                {/* 오른쪽 아이콘 */}
                <div className="flex items-center gap-1">
                  <Link 
                    href="/settings"
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center"
                  >
                    <Settings className="w-[22px] h-[22px]" />
                  </Link>
                  <Link 
                    href="/notifications"
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center relative"
                  >
                    <Bell className="w-[22px] h-[22px] translate-y-[0.5px]" />
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">
                      2
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('진행중')}
                className={`flex-1 py-3.5 text-[15px] font-medium transition-colors ${
                  activeTab === '진행중'
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500'
                }`}
              >
                진행중
              </button>
              <button
                onClick={() => setActiveTab('경매결과')}
                className={`flex-1 py-3.5 text-[15px] font-medium transition-colors ${
                  activeTab === '경매결과'
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500'
                }`}
              >
                경매결과
              </button>
            </div>
          </div>

          {/* 컨텐츠 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white">
            {!mounted ? (
              // Hydration 오류 방지: 마운트 전 로딩 상태
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-20">
                  <p className="text-gray-500 text-sm">로딩중...</p>
                </div>
              </div>
            ) : activeTab === '진행중' ? (
              bidsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-20">
                    <p className="text-gray-500 text-sm">입찰 내역을 불러오는 중...</p>
                  </div>
                </div>
              ) : allMyBids.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-20">
                    <p className="text-gray-500 text-sm">{dealerId ? '진행중인 입찰 내역이 없습니다' : '로그인 후 이용해주세요'}</p>
                  </div>
                </div>
              ) : (
                <div className="pb-24">
                  {/* 예상 낙찰금액 요약 카드 - 가로 스크롤 X */}
                  <div className="bg-white px-4 pt-4 pb-2">
                    <div className="px-4 py-3 bg-gray-100 rounded flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">예상 낙찰금액</span>
                        <span className="text-xs text-gray-400 ml-2">총 {expectedAmounts.highestCount + expectedAmounts.secondHighestCount}건, 최고순위 {expectedAmounts.highestCount}건, 차순위 {expectedAmounts.secondHighestCount}건</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{Math.round(expectedAmounts.highestTotal).toLocaleString()}원</span>
                    </div>
                  </div>

                  {/* 상태 필터 - 가로 스크롤 X */}
                  <div className="bg-white px-4 py-2.5">
                    <div className="flex gap-2">
                      {(['전체', '최고순위', '차순위'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setStatusFilter(filter)}
                          className={`px-3.5 py-2 text-[13px] font-medium rounded-md transition-colors ${
                            statusFilter === filter
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 테이블 헤더 - sticky로 고정 */}
                  <div 
                    ref={headerRef}
                    className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 overflow-x-hidden"
                  >
                    <div className="min-w-[730px] h-9 flex items-center">
                      <div className="grid px-2 text-[13px] font-medium text-gray-500 w-full" style={{gridTemplateColumns: '60px 110px 65px 60px 55px 70px 70px 80px 55px 100px'}}>
                        <div className="text-center">입찰</div>
                        <div className="text-center">상장번호</div>
                        <div className="text-center">부위</div>
                        <div className="text-center">등급</div>
                        <div className="text-center">중량</div>
                        <div className="text-center">최고입찰가</div>
                        <div className="text-center">나의입찰가</div>
                        <div className="text-center">총입찰가격</div>
                        <div className="text-center">상태</div>
                        <div className="text-center">입찰시간</div>
                      </div>
                    </div>
                  </div>

                  {/* 테이블 데이터 - 가로 스크롤 가능 */}
                  <div 
                    ref={tableRef}
                    className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onScroll={handleTableScroll}
                  >
                    <div className="min-w-[730px]">

                    {/* 필터 결과 없음 */}
                    {filteredBids.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-gray-500 text-sm">해당 조건의 입찰 내역이 없습니다</p>
                      </div>
                    ) : (
                    /* 테이블 데이터 */
                    filteredBids.map((bid) => {
                      const getPartUrlId = (partName: string) => {
                        if (partName.includes('등심')) return 'sirloin';
                        if (partName.includes('채끝')) return 'striploin';
                        if (partName.includes('목심')) return 'chuck';
                        if (partName.includes('앞다리')) return 'foreleg';
                        if (partName.includes('갈비')) return 'ribs';
                        if (partName.includes('설도')) return 'round';
                        if (partName.includes('양지')) return 'brisket';
                        if (partName.includes('우둔')) return 'rump';
                        if (partName.includes('사태')) return 'shank';
                        if (partName.includes('안심')) return 'tenderloin';
                        if (partName.includes('특수')) return 'special';
                        if (partName.includes('꼬리')) return 'tail';
                        if (partName.includes('족')) return 'feet';
                        if (partName.includes('사골')) return 'bone';
                        if (partName.includes('잡뼈')) return 'misc';
                        return 'sirloin';
                      };
                      
                      return (
                        <div 
                          key={bid.id}
                          className={`grid px-2 py-3 border-b border-gray-100 transition-colors items-center ${
                            bid.status === 'highest' 
                              ? 'bg-blue-50/50' 
                              : bid.status === 'secondHighest'
                                ? 'bg-red-50/50'
                                : 'bg-white hover:bg-gray-50'
                          }`}
                          style={{gridTemplateColumns: '60px 110px 65px 60px 55px 70px 70px 80px 55px 100px'}}
                        >
                          {/* 입찰 */}
                          <div className="text-center flex items-center justify-center">
                            {bid.status === 'highest' ? (
                              <span className="text-gray-400 text-[11px]">-</span>
                            ) : (
                              <button
                                onClick={() => handleReBidClick(bid.listingNo, bid, {
                                  partName: bid.partName,
                                  grade: bid.grade,
                                  weight: `${bid.weight}kg`,
                                  gender: bid.gender,
                                })}
                                className="px-2 py-1 text-[11px] font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                              >
                                재입찰
                              </button>
                            )}
                          </div>
                          {/* 상장번호 */}
                          <div className="text-center">
                            <button 
                              onClick={() => {
                                router.push(`/auction/${bid.entityListingNo}`);
                              }}
                              className="text-[13px] font-medium text-gray-900 underline cursor-pointer"
                            >
                              {bid.listingNo}
                            </button>
                          </div>
                          {/* 부위 */}
                          <div className="text-center">
                            <button
                              onClick={() => {
                                router.push(`/auction?tab=part&part=${getPartUrlId(bid.partName)}`);
                              }}
                              className="text-[13px] text-gray-900 underline cursor-pointer"
                            >
                              {bid.partName}
                            </button>
                          </div>
                          {/* 등급 */}
                          <div className="text-center text-[13px] text-gray-700" style={{ letterSpacing: '-0.05em' }}>
                            {addYieldGradeIfMissing(bid.grade)}
                          </div>
                          {/* 중량 */}
                          <div className="text-center text-[13px] text-gray-700">
                            {bid.weight.toFixed(1)}kg
                          </div>
                          {/* 최고입찰가 */}
                          <div className="text-center text-[13px] font-medium text-gray-900">
                            {bid.highestBid.toLocaleString()}
                          </div>
                          {/* 나의입찰가 */}
                          <div className="text-center text-[13px] font-medium text-gray-900">
                            {bid.myBid.toLocaleString()}
                          </div>
                          {/* 총입찰가격 */}
                          <div className="text-center text-[13px] font-medium text-gray-900">
                            {bid.totalAmount.toLocaleString()}
                          </div>
                          {/* 상태 */}
                          <div className="text-center flex items-center justify-center">
                            {bid.status === 'highest' ? (
                              <span className="text-[11px] font-medium text-blue-600">최고순위</span>
                            ) : (
                              <span className="text-[11px] font-medium text-red-500">차순위</span>
                            )}
                          </div>
                          {/* 시간 */}
                          <div className="text-center text-[11px] text-gray-500 whitespace-nowrap">
                            {bid.time}
                          </div>
                        </div>
                      );
                    }))}
                  </div>
                </div>
              </div>
              )
            ) : (
              auctionResults.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-20">
                    <p className="text-gray-500 text-sm">경매 결과가 없습니다</p>
                  </div>
                </div>
              ) : (
                <div className="pb-24">
                  {/* 낙찰금액 요약 카드 */}
                  <div className="bg-white px-4 pt-4 pb-2">
                    <div className="px-4 py-3 bg-gray-100 rounded flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">낙찰금액</span>
                        <span className="text-xs text-gray-400 ml-2">총 {resultSummary.wonCount + resultSummary.lostCount}건, 낙찰 {resultSummary.wonCount}건, 미낙찰 {resultSummary.lostCount}건</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{Math.round(resultSummary.wonTotal).toLocaleString()}원</span>
                    </div>
                  </div>

                  {/* 일자 */}
                  <div className="bg-white px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[13px] text-gray-500">일자</span>
                      <input
                        type="date"
                        value={`20${formatDateDisplay(startDate).replace(/\./g, '-')}`}
                        onChange={(e) => setStartDate(new Date(e.target.value))}
                        className="text-[13px] text-gray-700 bg-white border border-gray-200 rounded px-2.5 py-1.5 [&::-webkit-calendar-picker-indicator]:dark:invert-0 [&::-webkit-calendar-picker-indicator]:brightness-0"
                      />
                      <span className="text-[13px] text-gray-400">~</span>
                      <input
                        type="date"
                        value={`20${formatDateDisplay(endDate).replace(/\./g, '-')}`}
                        onChange={(e) => setEndDate(new Date(e.target.value))}
                        className="text-[13px] text-gray-700 bg-white border border-gray-200 rounded px-2.5 py-1.5 [&::-webkit-calendar-picker-indicator]:dark:invert-0 [&::-webkit-calendar-picker-indicator]:brightness-0"
                      />
                      <button
                        onClick={handleSearch}
                        className="px-3.5 py-1.5 text-[13px] font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                      >
                        조회
                      </button>
                    </div>
                  </div>

                  {/* 결과 필터 */}
                  <div className="bg-white px-4 py-2.5">
                    <div className="flex gap-2">
                      {(['전체', '낙찰', '미낙찰'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setResultFilter(filter)}
                          className={`px-3.5 py-2 text-[13px] font-medium rounded-md transition-colors ${
                            resultFilter === filter
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 테이블 헤더 - sticky로 고정 */}
                  <div 
                    ref={headerRef}
                    className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 overflow-x-hidden"
                  >
                    <div className="min-w-[680px] h-9 flex items-center">
                      <div className="grid px-2 text-[13px] font-medium text-gray-500 w-full" style={{gridTemplateColumns: '60px 110px 65px 60px 55px 70px 70px 80px 100px'}}>
                        <div className="text-center">결과</div>
                        <div className="text-center">상장번호</div>
                        <div className="text-center">부위</div>
                        <div className="text-center">등급</div>
                        <div className="text-center">중량</div>
                        <div className="text-center">낙찰가</div>
                        <div className="text-center">나의입찰가</div>
                        <div className="text-center">총입찰가격</div>
                        <div className="text-center">입찰시간</div>
                      </div>
                    </div>
                  </div>

                  {/* 테이블 데이터 - 가로 스크롤 가능 */}
                  <div 
                    ref={tableRef}
                    className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onScroll={handleTableScroll}
                  >
                    <div className="min-w-[680px]">
                      {/* 필터 결과 없음 */}
                      {filteredResults.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-gray-500 text-sm">해당 조건의 경매 결과가 없습니다</p>
                        </div>
                      ) : (
                      /* 테이블 데이터 */
                      filteredResults.map((result) => {
                        const weight = parseFloat(result.productInfo.weight.replace('kg', ''));
                        const totalPrice = result.myBid * weight;
                        const priceDiff = result.result === 'won' ? 0 : (result.winningBid - result.myBid) * weight;
                        
                        return (
                          <div 
                            key={result.listingNo}
                            className={`grid px-2 py-3 border-b border-gray-100 transition-colors items-center ${
                              result.result === 'won' 
                                ? 'bg-blue-50/50' 
                                : 'bg-red-50/50'
                            }`}
                            style={{gridTemplateColumns: '60px 110px 65px 60px 55px 70px 70px 80px 100px'}}
                          >
                            {/* 결과 */}
                            <div className="text-center flex items-center justify-center">
                              {result.result === 'won' ? (
                                <span className="text-[11px] font-medium text-blue-600">낙찰</span>
                              ) : (
                                <span className="text-[11px] font-medium text-red-500">미낙찰</span>
                              )}
                            </div>
                            {/* 상장번호 */}
                            <div className="text-center">
                              <button 
                                onClick={() => {
                                  router.push(`/trade/detail?listingNo=${result.listingNo}`);
                                }}
                                className="text-[13px] font-medium text-gray-900 underline cursor-pointer"
                              >
                                {result.listingNo}
                              </button>
                            </div>
                            {/* 부위 */}
                            <div className="text-center text-[13px] text-gray-700">
                              {result.productInfo.partName}
                            </div>
                            {/* 등급 */}
                            <div className="text-center text-[13px] text-gray-700" style={{ letterSpacing: '-0.05em' }}>
                              {addYieldGradeIfMissing(result.productInfo.grade)}
                            </div>
                            {/* 중량 */}
                            <div className="text-center text-[13px] text-gray-700">
                              {result.productInfo.weight.includes('kg') ? result.productInfo.weight : `${result.productInfo.weight}kg`}
                            </div>
                            {/* 낙찰가 */}
                            <div className="text-center text-[13px] font-medium text-gray-900">
                              {result.winningBid.toLocaleString()}
                            </div>
                            {/* 나의입찰가 */}
                            <div className="text-center text-[13px] font-medium text-gray-900">
                              {result.myBid.toLocaleString()}
                            </div>
                            {/* 총입찰가격 */}
                            <div className="text-center text-[13px] font-medium text-gray-900">
                              {Math.round(totalPrice).toLocaleString()}
                            </div>
                            {/* 시간 */}
                            <div className="text-center text-[11px] text-gray-500 whitespace-nowrap">
                              {result.time}
                            </div>
                          </div>
                        );
                      }))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* 하단 네비게이션 */}
          <BottomNav />

          {/* 입찰하기 바텀시트 */}
          <AnimatePresence>
            {showBidSheet && selectedBidInfo && (
              <>
                {/* 배경 오버레이 */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 z-[100]"
                  onClick={() => setShowBidSheet(false)}
                />
                {/* 바텀시트 */}
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-[100]"
                >
                  {/* 핸들 */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                  </div>
                  
                  {/* 헤더 */}
                  <div className="px-4 pb-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">입찰하기</h3>
                      <button 
                        onClick={() => setShowBidSheet(false)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* 입찰 내용 */}
                  <div className="p-4 space-y-4">
                    {/* 개체 정보 테이블 */}
                    <div className="border border-gray-200 rounded overflow-hidden overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="py-2 px-1.5 text-center font-medium text-gray-500 whitespace-nowrap">상장번호</th>
                            <th className="py-2 px-1.5 text-center font-medium text-gray-500">축종</th>
                            <th className="py-2 px-1.5 text-center font-medium text-gray-500">성별</th>
                            <th className="py-2 px-1.5 text-center font-medium text-gray-500">등급</th>
                            <th className="py-2 px-1.5 text-center font-medium text-gray-500">개월령</th>
                            <th className="py-2 px-1.5 text-center font-medium text-gray-500">부위</th>
                            <th className="py-2 px-1.5 text-center font-medium text-gray-500">중량</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 whitespace-nowrap">
                              {selectedBidInfo.listingNo}
                            </td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">한우</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">
                              {selectedBidInfo.productInfo.gender || '암'}
                            </td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">
                              {addYieldGradeIfMissing(selectedBidInfo.productInfo.grade)}
                            </td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">32</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">
                              {selectedBidInfo.productInfo.partName}
                            </td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">
                              {selectedBidInfo.productInfo.weight.includes('kg') 
                                ? selectedBidInfo.productInfo.weight 
                                : `${selectedBidInfo.productInfo.weight}kg`}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 입찰가격 입력 */}
                    <div>
                      <div className="text-xs text-gray-500 mb-2">입찰가격 (원/kg)</div>
                      <div className="relative mb-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={bidPrice}
                          onChange={(e) => {
                            const formattedValue = formatNumber(e.target.value);
                            setBidPrice(formattedValue);
                          }}
                          placeholder={`최고입찰가 ${selectedBidInfo.bid.highestBid.toLocaleString()}`}
                          className="w-full px-4 py-3.5 pr-12 text-right text-xl font-bold border border-gray-200 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white text-black placeholder:text-gray-400"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
                          원
                        </div>
                      </div>
                      {/* 금액 조정 버튼 */}
                      <div className="grid grid-cols-5 gap-1.5">
                        {[100, 1000, 10000, 50000].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => {
                              // 비어있으면 최고입찰가에서 시작
                              const basePrice = bidPrice === '' 
                                ? selectedBidInfo.bid.highestBid 
                                : parseFloat(removeCommas(bidPrice));
                              const newPrice = basePrice + amount;
                              setBidPrice(formatNumber(newPrice.toString()));
                            }}
                            className="py-2 text-xs border border-gray-200 rounded hover:bg-gray-50 font-medium text-gray-700"
                          >
                            +{amount.toLocaleString()}
                          </button>
                        ))}
                        <button
                          onClick={() => setBidPrice('')}
                          className="py-2 text-xs bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 text-gray-600 font-medium"
                        >
                          초기화
                        </button>
                      </div>
                    </div>

                    {/* 총 입찰금액 */}
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700">총 입찰금액</span>
                        <span className="text-xl font-bold text-gray-900">
                          {(() => {
                            if (!bidPrice || !selectedBidInfo) return '-';
                            const price = parseFloat(removeCommas(bidPrice));
                            const weight = parseFloat(selectedBidInfo.productInfo.weight.replace('kg', ''));
                            const total = Math.round(price * weight);
                            return `${formatNumber(total.toString())}원`;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* 입찰하기 버튼 */}
                    <button 
                      onClick={handleBidSubmit}
                      disabled={!bidPrice}
                      className="w-full py-3.5 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-base rounded"
                    >
                      입찰하기
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 입찰 확인 다이얼로그 */}
      {showBidDialog && selectedBidInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white dark:bg-gray-900 rounded w-full max-w-md mx-4 transition-colors">
            {/* 다이얼로그 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">입찰 내용을 확인해 주세요</h3>
            </div>
            
            {/* 다이얼로그 내용 */}
            <div className="px-6 py-4">
              {/* 개체 정보 테이블 */}
              <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden overflow-x-auto mb-4">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">상장번호</th>
                      <th className="py-2 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400">축종</th>
                      <th className="py-2 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400">성별</th>
                      <th className="py-2 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400">등급</th>
                      <th className="py-2 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400">개월령</th>
                      <th className="py-2 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400">부위</th>
                      <th className="py-2 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400">중량</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {selectedBidInfo.listingNo}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">한우</td>
                      <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">
                        {selectedBidInfo.productInfo.gender || '암'}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">
                        {addYieldGradeIfMissing(selectedBidInfo.productInfo.grade)}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">32</td>
                      <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">
                        {selectedBidInfo.productInfo.partName}
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">
                        {selectedBidInfo.productInfo.weight.includes('kg') 
                          ? selectedBidInfo.productInfo.weight 
                          : `${selectedBidInfo.productInfo.weight}kg`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 입찰 금액 정보 */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">입찰가격</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {bidPrice ? `${formatNumber(bidPrice)}원/kg` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">총 입찰금액</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {(() => {
                      if (!bidPrice || !selectedBidInfo) return '-';
                      const price = parseFloat(removeCommas(bidPrice));
                      const weight = parseFloat(selectedBidInfo.productInfo.weight.replace('kg', ''));
                      const total = Math.round(price * weight);
                      return `${formatNumber(total.toString())}원`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 다이얼로그 버튼 */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowBidDialog(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmBid}
                className="flex-1 py-2.5 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                입찰하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
