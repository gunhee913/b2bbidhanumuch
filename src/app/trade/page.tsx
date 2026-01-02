'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Home as HomeIcon,
  BarChart3,
  FileText,
  User,
  Gavel,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
  X,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useBidStore } from '@/stores/bidStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 거래 내역 타입
interface TradeItem {
  id: string;
  status: 'ongoing' | 'won';
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
  // 거래처 (낙찰 시에만)
  dealer?: string;
}

// 필터 옵션 타입
type StatusFilter = 'all' | 'ongoing' | 'won';
type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

// 부위 목록 (필터용 - 좌/우 통합)
const partsList = [
  '전체', '등심', '안심', '채끝', '갈비', '특수부위', '설도', 
  '앞다리', '우둔', '목심', '양지', '사태', '꼬리', '족', '사골', '잡뼈'
];

// 부위 매칭 함수 (필터에서 '등심' 선택 시 '등심(좌)', '등심(우)' 모두 매칭)
const matchesPart = (itemPartName: string, filterPart: string): boolean => {
  // (좌), (우)가 있는 부위는 기본 이름으로 매칭
  const baseName = itemPartName.replace(/\(좌\)|\(우\)/g, '').trim();
  return baseName === filterPart || itemPartName === filterPart;
};

export default function TradePage() {
  const { bids: globalBids } = useBidStore();
  const [selectedItem, setSelectedItem] = useState<TradeItem | null>(null);
  
  // 테이블 스크롤 드래그
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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
  
  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [partFilter, setPartFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  
  // 드롭다운 ref
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const partDropdownRef = useRef<HTMLDivElement>(null);
  
  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setShowPeriodDropdown(false);
      }
      if (partDropdownRef.current && !partDropdownRef.current.contains(event.target as Node)) {
        setShowPartDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // 검색 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // 검색 시 첫 페이지로 이동
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // 부위 정보 매핑
  const partInfoMap: Record<string, { name: string; weight: number }> = {
    '0001': { name: '등심(좌)', weight: 15.2 },
    '0002': { name: '등심(우)', weight: 15.5 },
    '0003': { name: '안심', weight: 4.3 },
    '0004': { name: '채끝', weight: 7.8 },
    '0005': { name: '갈비(좌)', weight: 12.5 },
    '0006': { name: '갈비(우)', weight: 12.8 },
    '0007': { name: '특수부위', weight: 3.5 },
    '0008': { name: '설도(좌)', weight: 16.2 },
    '0009': { name: '설도(우)', weight: 16.5 },
    '0010': { name: '앞다리', weight: 24.8 },
    '0011': { name: '우둔', weight: 21.0 },
    '0012': { name: '목심', weight: 14.3 },
    '0013': { name: '양지(좌)', weight: 12.2 },
    '0014': { name: '양지(우)', weight: 12.5 },
    '0015': { name: '사태', weight: 15.0 },
    '0016': { name: '꼬리', weight: 16.0 },
    '0017': { name: '족', weight: 10.5 },
    '0018': { name: '사골', weight: 8.0 },
    '0019': { name: '잡뼈', weight: 22.0 },
  };

  // 거래 내역 데이터 생성
  const tradeItems: TradeItem[] = useMemo(() => {
    const items: TradeItem[] = [];
    
    // 현재 진행 중인 입찰 내역
    Object.entries(globalBids).forEach(([listingNo, bid]) => {
      const partCode = listingNo.split('-')[2] || '0001';
      const partInfo = partInfoMap[partCode] || { name: '등심(좌)', weight: 15.0 };
      
      items.push({
        id: listingNo,
        status: 'ongoing',
        listingNo,
        partName: partInfo.name,
        weight: `${partInfo.weight}kg`,
        weightKg: partInfo.weight,
        myBid: bid.myBid,
        highestBid: bid.highestBid,
        bidTime: bid.time,
        traceNo: '002-1894-3853-9',
        grade: '1++A(9)',
        gender: '거세',
        monthAge: 30,
        processingCompany: '송정가공',
        slaughterDate: '2025.08.04.',
        processingDate: '2025.08.05.',
        carcassWeight: 468,
      });
    });

    // 더미 완료 데이터 (예시)
    const dummyCompleted: TradeItem[] = [
      {
        id: 'completed-1',
        status: 'won',
        listingNo: '250805-002-0003',
        partName: '안심',
        weight: '4.5kg',
        weightKg: 4.5,
        myBid: 185000,
        highestBid: 185000,
        bidTime: '25.08.05.(화) 14:32',
        traceNo: '002-1876-5421-3',
        grade: '1++A(9)',
        gender: '거세',
        monthAge: 32,
        processingCompany: '송정가공',
        slaughterDate: '2025.08.03.',
        processingDate: '2025.08.04.',
        carcassWeight: 485,
        dealer: '강남정육점',
      },
      {
        id: 'completed-3',
        status: 'won',
        listingNo: '250804-003-0005',
        partName: '갈비(좌)',
        weight: '12.8kg',
        weightKg: 12.8,
        myBid: 98000,
        highestBid: 98000,
        bidTime: '25.08.04.(월) 15:20',
        traceNo: '002-1854-3298-5',
        grade: '1A(7)',
        dealer: '서울축산',
        gender: '거세',
        monthAge: 31,
        processingCompany: '송정가공',
        slaughterDate: '2025.08.02.',
        processingDate: '2025.08.03.',
        carcassWeight: 456,
      },
      {
        id: 'completed-4',
        status: 'won',
        listingNo: '250803-001-0002',
        partName: '등심(우)',
        weight: '15.8kg',
        weightKg: 15.8,
        myBid: 165000,
        highestBid: 165000,
        bidTime: '25.08.03.(일) 11:45',
        traceNo: '002-1843-2187-9',
        grade: '1++A(9)',
        dealer: '대한민국최고정육점',
        gender: '거세',
        monthAge: 33,
        processingCompany: '한우촌가공',
        slaughterDate: '2025.08.01.',
        processingDate: '2025.08.02.',
        carcassWeight: 478,
      },
    ];

    return [...items, ...dummyCompleted];
  }, [globalBids]);

  // 필터링된 거래 내역
  const filteredItems = useMemo(() => {
    return tradeItems.filter(item => {
      // 상태 필터
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      
      // 기간 필터
      if (periodFilter !== 'all') {
        // 간단한 날짜 파싱 (25.08.06.(수) 14:01 형식)
        const dateMatch = item.bidTime.match(/(\d{2})\.(\d{2})\.(\d{2})/);
        if (dateMatch) {
          const year = 2000 + parseInt(dateMatch[1]);
          const month = parseInt(dateMatch[2]) - 1;
          const day = parseInt(dateMatch[3]);
          const itemDate = new Date(year, month, day);
          
          if (periodFilter === 'custom') {
            // 커스텀 기간 필터
            if (customDateRange.from && itemDate < customDateRange.from) return false;
            if (customDateRange.to) {
              const toDate = new Date(customDateRange.to);
              toDate.setHours(23, 59, 59, 999);
              if (itemDate > toDate) return false;
            }
          } else {
            const today = new Date();
            const diffTime = today.getTime() - itemDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (periodFilter === 'today' && diffDays > 0) return false;
            if (periodFilter === 'week' && diffDays > 7) return false;
            if (periodFilter === 'month' && diffDays > 30) return false;
          }
        }
      }
      
      // 부위 필터 (다중 선택, 좌/우 통합 매칭)
      if (partFilter.length > 0) {
        const matches = partFilter.some(filterPart => matchesPart(item.partName, filterPart));
        if (!matches) return false;
      }
      
      // 검색어 필터 (상장번호 + 부위 + 거래처) - 디바운싱된 검색어 사용
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesListingNo = item.listingNo.toLowerCase().includes(query);
        const matchesPartName = item.partName.toLowerCase().includes(query);
        const matchesDealer = item.dealer?.toLowerCase().includes(query) || false;
        if (!matchesListingNo && !matchesPartName && !matchesDealer) {
          return false;
        }
      }
      
      return true;
    });
  }, [tradeItems, statusFilter, periodFilter, partFilter, debouncedSearchQuery, customDateRange]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // 필터 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, periodFilter, partFilter, customDateRange]);

  // 상태별 배지 스타일
  const getStatusBadge = (status: TradeItem['status']) => {
    switch (status) {
      case 'ongoing':
        return {
          text: '진행중',
          className: 'bg-blue-100 text-blue-700',
        };
      case 'won':
        return {
          text: '낙찰',
          className: 'bg-green-100 text-green-700',
        };
    }
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
          <div className="flex-shrink-0 bg-white border-b border-gray-200 pt-1 md:pt-0">
            <div className="px-2 md:px-4 py-2">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center">
                  <img 
                    src="/Mainlogo.png" 
                    alt="HanuMuch" 
                    className="h-8 w-auto"
                  />
                </Link>
                <div className="flex items-center space-x-3">
                  <img 
                    src="/음성축산물공판장.png" 
                    alt="음성축산물공판장" 
                    className="h-5 w-auto border border-gray-300 rounded px-1 py-0.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 페이지 제목 */}
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">거래 내역</h1>
            <p className="text-xs text-gray-500 mt-0.5">총 {filteredItems.length}건</p>
          </div>

          {/* 필터 영역 */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 space-y-3">
            {/* 검색창 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="상장번호, 부위, 거래처 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            
            {/* 필터 드롭다운들 */}
            <div className="flex gap-2 flex-wrap">
              {/* 상태 필터 드롭다운 */}
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => {
                    setShowStatusDropdown(!showStatusDropdown);
                    setShowPeriodDropdown(false);
                    setShowPartDropdown(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {statusFilter === 'all' ? '상태' : 
                   statusFilter === 'ongoing' ? '진행중' : '낙찰'}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showStatusDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    >
                      {[
                        { value: 'all', label: '전체' },
                        { value: 'ongoing', label: '진행중' },
                        { value: 'won', label: '낙찰' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setStatusFilter(option.value as StatusFilter);
                            setShowStatusDropdown(false);
                          }}
                          className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors whitespace-nowrap ${
                            statusFilter === option.value ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* 기간 필터 드롭다운 */}
              <div className="relative" ref={periodDropdownRef}>
                <button
                  onClick={() => {
                    setShowPeriodDropdown(!showPeriodDropdown);
                    setShowStatusDropdown(false);
                    setShowPartDropdown(false);
                    setShowCalendar(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {periodFilter === 'all' ? '기간' : 
                   periodFilter === 'today' ? '오늘' :
                   periodFilter === 'week' ? '1주일' : 
                   periodFilter === 'month' ? '1개월' :
                   customDateRange.from && customDateRange.to ? 
                     `${format(customDateRange.from, 'MM.dd')} ~ ${format(customDateRange.to, 'MM.dd')}` : '기간 선택'}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showPeriodDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    >
                      {[
                        { value: 'all', label: '전체' },
                        { value: 'today', label: '오늘' },
                        { value: 'week', label: '1주일' },
                        { value: 'month', label: '1개월' },
                        { value: 'custom', label: '기간 직접 선택' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            if (option.value === 'custom') {
                              setPeriodFilter('custom');
                              setShowPeriodDropdown(false);
                              setShowCalendar(true);
                            } else {
                              setPeriodFilter(option.value as PeriodFilter);
                              setShowPeriodDropdown(false);
                              setCustomDateRange({ from: undefined, to: undefined });
                            }
                          }}
                          className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors whitespace-nowrap ${
                            periodFilter === option.value ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* 캘린더 팝오버 */}
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <span />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: customDateRange.from, to: customDateRange.to }}
                      onSelect={(range) => {
                        setCustomDateRange({ from: range?.from, to: range?.to });
                        if (range?.from && range?.to) {
                          setShowCalendar(false);
                        }
                      }}
                      locale={ko}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* 부위 필터 드롭다운 (다중 선택) */}
              <div className="relative" ref={partDropdownRef}>
                <button
                  onClick={() => {
                    setShowPartDropdown(!showPartDropdown);
                    setShowStatusDropdown(false);
                    setShowPeriodDropdown(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {partFilter.length === 0 ? '부위' : 
                   partFilter.length === 1 ? partFilter[0] : 
                   `${partFilter[0]} 외 ${partFilter.length - 1}개`}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showPartDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showPartDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto thin-scrollbar min-w-[140px]"
                    >
                      {/* 전체 선택/해제 */}
                      <button
                        onClick={() => setPartFilter([])}
                        className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors whitespace-nowrap border-b border-gray-100 ${
                          partFilter.length === 0 ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        전체
                      </button>
                      
                      {/* 부위 목록 (체크박스) */}
                      {partsList.filter(p => p !== '전체').map((part) => (
                        <label
                          key={part}
                          className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-100 transition-colors cursor-pointer ${
                            partFilter.includes(part) ? 'bg-red-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={partFilter.includes(part)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPartFilter([...partFilter, part]);
                              } else {
                                setPartFilter(partFilter.filter(p => p !== part));
                              }
                            }}
                            className="custom-checkbox"
                          />
                          <span className={partFilter.includes(part) ? 'text-red-600 font-medium' : 'text-gray-700'}>
                            {part}
                          </span>
                        </label>
                      ))}
                      
                      {/* 선택 완료 버튼 */}
                      {partFilter.length > 0 && (
                        <div className="border-t border-gray-100 p-2">
                          <button
                            onClick={() => setShowPartDropdown(false)}
                            className="w-full px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            {partFilter.length}개 선택 완료
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* 필터 초기화 버튼 */}
              {(statusFilter !== 'all' || periodFilter !== 'all' || partFilter.length > 0 || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setPeriodFilter('all');
                    setPartFilter([]);
                    setSearchQuery('');
                    setCustomDateRange({ from: undefined, to: undefined });
                  }}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="필터 초기화"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
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
                    <h3 className="text-lg font-medium text-gray-500 mb-2">검색 결과가 없습니다</h3>
                    <p className="text-sm text-gray-400 mb-6">다른 조건으로 검색해보세요.</p>
                    <button 
                      onClick={() => {
                        setStatusFilter('all');
                        setPeriodFilter('all');
                        setPartFilter([]);
                        setSearchQuery('');
                      }}
                      className="px-6 py-2.5 bg-gray-600 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      필터 초기화
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="pb-24">
                {/* 테이블 컨테이너 - 가로 스크롤 */}
                <div 
                  ref={tableScrollRef}
                  className={`overflow-x-auto thin-scrollbar-x select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* 테이블 헤더 */}
                  <div className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10 w-max min-w-full">
                    <div className="flex items-center px-2 py-2.5 text-[10px] font-bold text-gray-600">
                      <div className="w-14 text-center flex-shrink-0">상태</div>
                      <div className="w-36 text-center flex-shrink-0">상장번호</div>
                      <div className="w-16 text-center flex-shrink-0">부위</div>
                      <div className="w-20 text-center flex-shrink-0">등급</div>
                      <div className="w-14 text-center flex-shrink-0">중량</div>
                      <div className="w-20 text-center flex-shrink-0">입찰가</div>
                      <div className="w-24 text-center flex-shrink-0">경락대금</div>
                      <div className="w-20 text-center flex-shrink-0">거래처</div>
                    </div>
                  </div>

                  {/* 테이블 데이터 */}
                  {paginatedItems.map((item) => {
                    const statusBadge = getStatusBadge(item.status);
                    const totalPrice = calculateTotalPrice(item);
                    
                    return (
                      <div key={item.id} className="border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors w-max min-w-full">
                        {/* 메인 행 */}
                        <div className="flex items-center px-2 py-2.5">
                          {/* 상태 */}
                          <div className="w-14 flex-shrink-0 flex justify-center">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${statusBadge.className}`}>
                              {statusBadge.text}
                            </span>
                          </div>
                          
                          {/* 상장번호 */}
                          <div className="w-36 text-center flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-900 hover:text-gray-600 hover:underline"
                            >
                              {item.listingNo}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* 부위 */}
                          <div className="w-16 text-center flex-shrink-0">
                            <div className="text-[11px] font-medium text-gray-900">{item.partName}</div>
                          </div>
                          
                          {/* 등급 */}
                          <div className="w-20 text-center flex-shrink-0">
                            <div className="text-[11px] font-medium text-gray-900">{item.grade}</div>
                          </div>
                          
                          {/* 중량 */}
                          <div className="w-14 text-center flex-shrink-0">
                            <div className="text-[11px] text-gray-900">{item.weight}</div>
                          </div>
                          
                          {/* 입찰가 */}
                          <div className="w-20 text-center flex-shrink-0">
                            <div className="text-[11px] font-bold text-gray-900">
                              {item.myBid.toLocaleString()}
                            </div>
                          </div>
                          
                          {/* 경락대금 */}
                          <div className="w-24 text-center flex-shrink-0">
                            <div className="text-[11px] font-bold text-gray-900">
                              {totalPrice.toLocaleString()}
                            </div>
                          </div>
                          
                          {/* 거래처 (낙찰 시에만) */}
                          <div className="w-20 text-center flex-shrink-0">
                            <div className="text-[10px] text-gray-700 truncate">
                              {item.status === 'won' && item.dealer ? item.dealer : '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4 bg-white border-t border-gray-200">
                    {/* 이전 페이지 */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      이전
                    </button>
                    
                    {/* 페이지 번호 */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // 현재 페이지 주변 2개씩만 표시
                          if (totalPages <= 5) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, index, arr) => (
                          <div key={page} className="flex items-center">
                            {/* 생략 표시 */}
                            {index > 0 && arr[index - 1] !== page - 1 && (
                              <span className="px-1 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                                currentPage === page
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                    </div>
                    
                    {/* 다음 페이지 */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      다음
                    </button>
                  </div>
                )}
                
                {/* 페이지 정보 */}
                <div className="text-center py-2 text-xs text-gray-500">
                  총 {filteredItems.length}건 중 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredItems.length)}건 표시
                </div>
              </div>
            )}
          </div>

          {/* 하단 네비게이션 */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 md:px-4 py-2 safe-area-pb">
            <div className="flex items-center justify-around">
              {/* 홈 */}
              <Link href="/" className="flex-1 flex flex-col items-center py-2 text-gray-600 cursor-pointer">
                <HomeIcon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">홈</span>
              </Link>
              
              {/* 경매 */}
              <Link href="/auction" className="flex-1 flex flex-col items-center py-2 text-gray-600 cursor-pointer">
                <Gavel className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">경매</span>
              </Link>
              
              {/* 시세 */}
              <Link href="/market" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                <BarChart3 className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">시세</span>
              </Link>
              
              {/* 거래 */}
              <div className="flex-1 flex flex-col items-center py-2 text-red-600">
                <FileText className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">거래</span>
              </div>
              
              {/* 내정보 */}
              <Link href="/profile" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                <User className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">내정보</span>
              </Link>
            </div>
          </div>

          {/* 상세보기 모달 - 모바일 영역 내부 */}
          <AnimatePresence>
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center p-4"
              >
                {/* 배경 오버레이 */}
                <div 
                  className="absolute inset-0 bg-black/60"
                  onClick={() => setSelectedItem(null)}
                />
                
                {/* 모달 콘텐츠 */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative bg-white rounded-lg shadow-xl w-full max-h-[80vh] overflow-y-auto p-4"
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">거래 상세정보</h3>
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* 상태 및 기본 정보 */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(selectedItem.status).className}`}>
                      {getStatusBadge(selectedItem.status).text}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{selectedItem.listingNo}</span>
                  </div>

                  {/* 입찰 정보 */}
                  <div className="bg-gray-50 p-2.5 rounded-lg mb-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-500 text-[10px]">부위</div>
                        <div className="font-bold">{selectedItem.partName}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-[10px]">등급</div>
                        <div className="font-bold">{selectedItem.grade}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-[10px]">중량</div>
                        <div className="font-bold">{selectedItem.weight}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-[10px]">나의 입찰가</div>
                        <div className="font-bold text-red-600">{selectedItem.myBid.toLocaleString()}원</div>
                      </div>
                    </div>
                    {selectedItem.status === 'won' && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-gray-500 text-[10px]">경락대금</div>
                        <div className="font-bold text-base">{calculateTotalPrice(selectedItem).toLocaleString()}원</div>
                      </div>
                    )}
                  </div>

                  {/* 품질정보 */}
                  <div className="bg-white p-2 rounded-lg border mb-2">
                    <div className="grid grid-cols-7 gap-0.5 text-[10px]">
                      <div className="text-center">
                        <div className="text-gray-500">등지방</div>
                        <div className="font-bold text-xs">16</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">등심면적</div>
                        <div className="font-bold text-xs">123</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">근내지방</div>
                        <div className="font-bold text-xs">9</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">육색</div>
                        <div className="font-bold text-xs">5</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">지방색</div>
                        <div className="font-bold text-xs">3</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">조직감</div>
                        <div className="font-bold text-xs">1</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">성숙도</div>
                        <div className="font-bold text-xs">2</div>
                      </div>
                    </div>
                  </div>

                  {/* 개체 기본정보 & 도축/가공정보 */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {/* 개체 기본정보 */}
                    <div className="bg-white p-2 rounded-lg border">
                      <h4 className="text-[10px] font-bold text-gray-700 mb-1.5">개체 기본정보</h4>
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-gray-500">품종</span>
                          <span className="font-medium">한우</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">성별</span>
                          <span className="font-medium">{selectedItem.gender}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">등급</span>
                          <span className="font-medium">{selectedItem.grade}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">개월령</span>
                          <span className="font-medium">{selectedItem.monthAge}개월</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">접수번호</span>
                          <span className="font-medium">{selectedItem.listingNo.split('-').slice(0, 2).join('-')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">이력번호</span>
                          <span className="font-medium">{selectedItem.traceNo}</span>
                        </div>
                      </div>
                    </div>

                    {/* 도축정보 & 가공정보 */}
                    <div className="bg-white p-2 rounded-lg border">
                      <div className="space-y-2">
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-700 mb-1">도축정보</h4>
                          <div className="space-y-0.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-gray-500">도축장</span>
                              <span className="font-medium text-[9px]">농협 음성축산물공판장</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">도축일</span>
                              <span className="font-medium">{selectedItem.slaughterDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">지육번호</span>
                              <span className="font-medium">201</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">도체중량</span>
                              <span className="font-medium">{selectedItem.carcassWeight}kg</span>
                            </div>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-gray-100">
                          <h4 className="text-[10px] font-bold text-gray-700 mb-1">가공정보</h4>
                          <div className="space-y-0.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-gray-500">가공업체</span>
                              <span className="font-medium">{selectedItem.processingCompany}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">가공일</span>
                              <span className="font-medium">{selectedItem.processingDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">가공중량</span>
                              <span className="font-medium">312kg</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 버튼 영역 */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://aunit.mtrace.go.kr/mtracesearch/cattleNoSearch.do?btsProgNo=0109008401&btsActionMethod=SELECT&cattleNo=${selectedItem.traceNo.replace(/-/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[10px] font-bold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      축산물 이력정보
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Link 
                      href={`/auction/1?from=myBids`}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[10px] font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      개체 상세보기
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
