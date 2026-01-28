'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Plus,
  FileText,
  Settings,
  Bell,
  Search
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useBidStore } from '@/stores/bidStore';
import { useDealerStore } from '@/features/dealers/store';

// 거래 내역 타입
interface TradeItem {
  id: string;
  status: 'ongoing' | 'won' | 'lost';
  listingNo: string;
  partName: string;
  weight: string;
  weightKg: number;
  myBid: number;
  highestBid: number;
  bidTime: string;
  // 상세 정보
  traceNo: string;
  grade: string;
  gender: string;
  monthAge: number;
  processingCompany: string;
  slaughterDate: string;
  processingDate: string;
  carcassWeight: number;
  // 등급 상세
  backFat: number;       // 등지방
  eyeMuscle: number;     // 등심면적
  marbling: number;      // 근내지방
  meatColor: number;     // 육색
  fatColor: number;      // 지방색
  texture: number;       // 조직감
  maturity: number;      // 성숙도
  // 도축/가공 정보
  slaughterhouse: string;  // 도축장
  slaughterNo: number;     // 도축번호
  listingCompany: string;  // 상장업체
  processWeight: number;   // 가공중량
  // 거래처 (낙찰 시에만)
  dealer?: string;
}

export default function TradePage() {
  const { auctionResults, deliveryDealers } = useBidStore();
  
  // 거래처 ID로 거래처명 조회
  const { getDealerById } = useDealerStore();
  const getDealerName = (listingNo: string) => {
    const dealerId = deliveryDealers[listingNo];
    if (!dealerId) return null;
    const dealer = getDealerById(dealerId);
    return dealer?.name || null;
  };
  
  // 테이블 스크롤 드래그
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // 테이블 스크롤 동기화
  const handleTableScroll = () => {
    if (tableScrollRef.current && headerRef.current) {
      headerRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tableScrollRef.current.offsetLeft);
    setScrollLeft(tableScrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableScrollRef.current.offsetLeft;
    const walk = (startX - x) * 1.5;
    tableScrollRef.current.scrollLeft = scrollLeft + walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');
  
  // 필터 상태 (거래처 등록 여부)
  const [dealerFilter, setDealerFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  
  // 기간 필터 상태 (기본값: 1월 26일)
  const getDefaultDate = () => new Date(2026, 0, 26); // 2026년 1월 26일
  const [startDate, setStartDate] = useState<Date>(getDefaultDate());
  const [endDate, setEndDate] = useState<Date>(getDefaultDate());
  const [searchStartDate, setSearchStartDate] = useState<Date>(getDefaultDate());
  const [searchEndDate, setSearchEndDate] = useState<Date>(getDefaultDate());
  
  const formatDateDisplay = (date: Date) => {
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  // 동적 viewport 높이 설정
  useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  // 거래 내역 데이터 생성 (auctionResults에서 낙찰(won) 데이터만)
  const tradeItems: TradeItem[] = useMemo(() => {
    // auctionResults에서 낙찰(won) 데이터만 필터링하여 TradeItem으로 변환
    return auctionResults
      .filter(result => result.result === 'won')
      .map(result => {
        const weightStr = result.productInfo.weight;
        const weightKg = parseFloat(weightStr.replace('kg', '')) || 0;
        const typeStr = result.productInfo.type || '한우거세';
        const gender = typeStr.includes('암') ? '암' : '거세';
        
        return {
          id: result.listingNo,
          status: 'won' as const,
          listingNo: result.listingNo,
          partName: result.productInfo.partName,
          weight: weightStr.includes('kg') ? weightStr : `${weightStr}kg`,
          weightKg: weightKg,
          myBid: result.myBid,
          highestBid: result.winningBid,
          bidTime: result.time,
          traceNo: '002-1486-7293-1',
          grade: result.productInfo.grade,
          gender: gender,
          monthAge: 32,
          processingCompany: '건화',
          slaughterDate: '26.01.17',
          processingDate: '26.01.17',
          carcassWeight: 520,
          // 등급 상세
          backFat: 16,
          eyeMuscle: 123,
          marbling: 9,
          meatColor: 5,
          fatColor: 3,
          texture: 1,
          maturity: 2,
          // 도축/가공 정보
          slaughterhouse: '음성',
          slaughterNo: 201,
          listingCompany: '건화',
          processWeight: 312,
        };
      });
  }, [auctionResults]);

  // bidTime을 Date로 파싱하는 헬퍼 함수
  const parseBidTime = (bidTime: string): Date => {
    // 25.08.06.(수) 14:01 형식
    const dateMatch = bidTime.match(/(\d{2})\.(\d{2})\.(\d{2}).*?(\d{2}):(\d{2})/);
    if (dateMatch) {
      const year = 2000 + parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const day = parseInt(dateMatch[3]);
      const hour = parseInt(dateMatch[4]);
      const minute = parseInt(dateMatch[5]);
      return new Date(year, month, day, hour, minute);
    }
    return new Date(0);
  };

  // 날짜 코드에서 Date 객체로 변환 (YYMMDD -> Date)
  const dateCodeToDate = (dateCode: string): Date => {
    const year = 2000 + parseInt(dateCode.slice(0, 2));
    const month = parseInt(dateCode.slice(2, 4)) - 1;
    const day = parseInt(dateCode.slice(4, 6));
    return new Date(year, month, day);
  };
  
  // 기간 필터링된 거래 내역
  const dateFilteredItems = useMemo(() => {
    const start = new Date(searchStartDate);
    const end = new Date(searchEndDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return tradeItems.filter(item => {
      const dateCode = item.listingNo.split('-')[0] || '000000';
      const itemDate = dateCodeToDate(dateCode);
      return itemDate >= start && itemDate <= end;
    });
  }, [tradeItems, searchStartDate, searchEndDate]);
  
  // 요약 정보 계산 (기간 필터 적용 후)
  const summaryInfo = useMemo(() => {
    const total = dateFilteredItems.length;
    const registered = dateFilteredItems.filter(item => !!(getDealerName(item.listingNo) || item.dealer)).length;
    const unregistered = total - registered;
    return { total, registered, unregistered };
  }, [dateFilteredItems, deliveryDealers]);

  // 검색어 필터링된 거래 내역
  const searchFilteredItems = useMemo(() => {
    if (!searchQuery.trim()) return dateFilteredItems;
    
    const query = searchQuery.trim().toLowerCase();
    return dateFilteredItems.filter(item => {
      // 상장번호, 부위, 등급, 거래처명 검색
      const dealerName = getDealerName(item.listingNo) || item.dealer || '';
      return (
        item.listingNo.toLowerCase().includes(query) ||
        item.partName.toLowerCase().includes(query) ||
        item.grade.toLowerCase().includes(query) ||
        dealerName.toLowerCase().includes(query)
      );
    });
  }, [dateFilteredItems, searchQuery, deliveryDealers]);

  // 필터링된 거래 내역 (거래처 등록 여부로 필터링)
  const filteredItems = useMemo(() => {
    const filtered = searchFilteredItems.filter(item => {
      const hasDealer = !!(getDealerName(item.listingNo) || item.dealer);
      
      if (dealerFilter === 'registered') return hasDealer;
      if (dealerFilter === 'unregistered') return !hasDealer;
      return true; // 'all'
    });
    
    // 최신순 정렬 (listingNo 날짜 -> bidTime 순)
    return filtered.sort((a, b) => {
      const dateCodeA = a.listingNo.split('-')[0] || '000000';
      const dateCodeB = b.listingNo.split('-')[0] || '000000';
      
      if (dateCodeA !== dateCodeB) {
        return dateCodeB.localeCompare(dateCodeA);
      }
      
      const timeA = parseBidTime(a.bidTime);
      const timeB = parseBidTime(b.bidTime);
      return timeB.getTime() - timeA.getTime();
    });
  }, [searchFilteredItems, dealerFilter, deliveryDealers]);
  
  // 조회 버튼 클릭
  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
  };


  // 상태별 배지 스타일 (배송지시는 모두 낙찰 내역)
  const getStatusBadge = () => {
    return {
      text: '낙찰',
      className: 'bg-green-100 text-green-700',
    };
  };

  // 총 경락대금 계산
  const calculateTotalPrice = (item: TradeItem) => {
    return item.myBid * item.weightKg;
  };

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
          <style jsx global>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .thin-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            .thin-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .thin-scrollbar::-webkit-scrollbar-thumb {
              background: #d1d5db;
              border-radius: 2px;
            }
            .thin-scrollbar-x::-webkit-scrollbar {
              height: 1px;
            }
            .thin-scrollbar-x::-webkit-scrollbar-track {
              background: #f3f4f6;
            }
            .thin-scrollbar-x::-webkit-scrollbar-thumb {
              background: #d1d5db;
              border-radius: 1px;
            }
            .thin-scrollbar-x {
              scrollbar-width: thin;
              scrollbar-color: #d1d5db #f3f4f6;
            }
            .custom-checkbox {
              appearance: none;
              -webkit-appearance: none;
              width: 16px;
              height: 16px;
              border: 2px solid #d1d5db;
              border-radius: 4px;
              background: white;
              cursor: pointer;
              position: relative;
            }
            .custom-checkbox:checked {
              background: #dc2626;
              border-color: #dc2626;
            }
            .custom-checkbox:checked::after {
              content: '';
              position: absolute;
              left: 4px;
              top: 1px;
              width: 5px;
              height: 9px;
              border: solid white;
              border-width: 0 2px 2px 0;
              transform: rotate(45deg);
            }
          `}</style>
          
          {/* 모바일 메인 헤더 */}
          <div className="flex-shrink-0 bg-white">
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                {/* 왼쪽 여백 (오른쪽과 동일한 크기) */}
                <div className="w-[80px]"></div>
                {/* 가운데 타이틀 */}
                <h1 className="text-[17px] font-bold text-gray-900">배송지시</h1>
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

          {/* 검색 */}
          <div className="flex-shrink-0 bg-white px-4 py-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상장번호, 부위, 등급, 거래처 검색"
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-gray-50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
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

          {/* 요약 정보 + 필터 영역 */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5">
            <div className="flex items-center justify-between">
              {/* 필터 버튼 */}
              <div className="flex gap-2">
                {(['all', 'registered', 'unregistered'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDealerFilter(filter)}
                    className={`px-3.5 py-2 text-[13px] font-medium rounded-md transition-colors ${
                      dealerFilter === filter
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'all' ? '전체' : filter === 'registered' ? '등록' : '미등록'}
                  </button>
                ))}
              </div>
              
              {/* 요약 정보 */}
              <div className="text-[13px] text-gray-500">
                총 <span className="font-medium text-gray-700">{summaryInfo.total}</span>건, 
                등록 <span className="font-medium text-gray-700">{summaryInfo.registered}</span>건, 
                미등록 <span className="font-medium text-gray-700">{summaryInfo.unregistered}</span>건
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 - 테이블 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 hide-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                {tradeItems.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-500 mb-2">거래 내역이 없습니다</h3>
                    <p className="text-sm text-gray-400 mb-6">경매에 참여하여 입찰을 시작해보세요.</p>
                    <Link href="/auction">
                      <button className="px-6 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors">
                        경매 참여하기
                      </button>
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-500 mb-2">해당 조건의 내역이 없습니다</h3>
                  </>
                )}
              </div>
            ) : (
              <div className="pb-24">
                {/* 테이블 헤더 - sticky로 고정 */}
                <div 
                  ref={headerRef}
                  className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 overflow-x-hidden"
                >
                  <div className="min-w-[700px] h-9 flex items-center">
                    <div className="grid px-2 text-[13px] font-medium text-gray-500 w-full" style={{gridTemplateColumns: '85px 125px 65px 75px 60px 80px 95px 105px'}}>
                      <div className="text-center">거래처</div>
                      <div className="text-center">상장번호</div>
                      <div className="text-center">부위</div>
                      <div className="text-center">등급</div>
                      <div className="text-center">중량</div>
                      <div className="text-center">낙찰가</div>
                      <div className="text-center">경락대금</div>
                      <div className="text-center">입찰일자</div>
                    </div>
                  </div>
                </div>

                {/* 테이블 데이터 - 가로 스크롤 가능 */}
                <div 
                  ref={tableScrollRef}
                  className="overflow-x-auto cursor-grab active:cursor-grabbing select-none hide-scrollbar"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onScroll={handleTableScroll}
                >
                  <div className="min-w-[700px]">
                    {filteredItems.map((item) => {
                      const totalPrice = calculateTotalPrice(item);
                      
                      return (
                        <div 
                          key={item.id}
                          className="grid px-2 py-3 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors items-center"
                          style={{gridTemplateColumns: '85px 125px 65px 75px 60px 80px 95px 105px'}}
                        >
                          {/* 거래처 */}
                          <div className="text-center">
                            {(getDealerName(item.listingNo) || item.dealer) ? (
                              <div className="text-[13px] text-gray-700 truncate">
                                {getDealerName(item.listingNo) || item.dealer}
                              </div>
                            ) : (
                              <Link href={`/trade/register?listingNo=${item.listingNo}`}>
                                <button
                                  className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  등록
                                </button>
                              </Link>
                            )}
                          </div>
                          
                          {/* 상장번호 */}
                          <div className="text-center">
                            <Link
                              href={`/trade/detail?listingNo=${item.listingNo}`}
                              className="text-[13px] font-medium text-gray-900 underline cursor-pointer"
                            >
                              {item.listingNo}
                            </Link>
                          </div>
                          
                          {/* 부위 */}
                          <div className="text-center text-[13px] text-gray-700">
                            {item.partName}
                          </div>
                          
                          {/* 등급 */}
                          <div className="text-center text-[13px] text-gray-700" style={{ letterSpacing: '-0.05em' }}>
                            {item.grade}
                          </div>
                          
                          {/* 중량 */}
                          <div className="text-center text-[13px] text-gray-700">
                            {item.weight}
                          </div>
                          
                          {/* 낙찰가 */}
                          <div className="text-center text-[13px] font-medium text-gray-900">
                            {item.myBid.toLocaleString()}
                          </div>
                          
                          {/* 경락대금 */}
                          <div className="text-center text-[13px] font-medium text-gray-900">
                            {totalPrice.toLocaleString()}
                          </div>
                          
                          {/* 입찰일자 */}
                          <div className="text-center text-[13px] text-gray-700">
                            {item.bidTime.split(' ')[0]} {item.bidTime.split(' ')[1]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 하단 네비게이션 */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
