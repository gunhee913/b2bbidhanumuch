'use client';

import { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  ChevronLeft,
  ChevronDown,
  Calendar as CalendarIcon,
  Settings,
  Bell
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 잔고 내역 타입
interface BalanceHistory {
  id: string;
  date: string;           // '2026-01-06 09:30'
  type: 'deposit' | 'auction';
  deposit: number;        // 입금액
  withdraw: number;       // 출금(차감)액
  balance: number;        // 거래가능금액
  description: string;    // 비고
}

// 구분 필터 타입
type TypeFilter = 'all' | 'deposit' | 'auction';

// 기간 필터 타입
type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function BalanceHistoryPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-white flex items-center justify-center"><span className="text-gray-500">로딩중...</span></div>}>
      <BalanceHistoryContent />
    </Suspense>
  );
}

function BalanceHistoryContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const backUrl = from === 'main' ? '/' : '/profile';
  
  // 필터 상태
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // 드롭다운 ref
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setShowPeriodDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 무한 스크롤용 상태
  const [displayCount, setDisplayCount] = useState(20);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 마우스 드래그 스크롤 상태 (가로만)
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walkX = (startX - x) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft + walkX;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // 더미 데이터 - 낙찰대금차감 후 입금하는 패턴
  const [balanceHistory] = useState<BalanceHistory[]>([
    { id: '1', date: '2026-01-21 09:00', type: 'auction', deposit: 0, withdraw: 8520000, balance: -8280000, description: '낙찰대금차감' },
    { id: '2', date: '2026-01-20 15:00', type: 'deposit', deposit: 12000000, withdraw: 0, balance: 240000, description: '계좌이체' },
    { id: '3', date: '2026-01-20 09:00', type: 'auction', deposit: 0, withdraw: 11760000, balance: -11760000, description: '낙찰대금차감' },
    { id: '4', date: '2026-01-17 14:00', type: 'deposit', deposit: 9500000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '5', date: '2026-01-17 09:00', type: 'auction', deposit: 0, withdraw: 9500000, balance: -9500000, description: '낙찰대금차감' },
    { id: '6', date: '2026-01-16 15:00', type: 'deposit', deposit: 14200000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '7', date: '2026-01-16 09:00', type: 'auction', deposit: 0, withdraw: 14200000, balance: -14200000, description: '낙찰대금차감' },
    { id: '8', date: '2026-01-15 14:00', type: 'deposit', deposit: 8800000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '9', date: '2026-01-15 09:00', type: 'auction', deposit: 0, withdraw: 8800000, balance: -8800000, description: '낙찰대금차감' },
    { id: '10', date: '2026-01-14 15:00', type: 'deposit', deposit: 10500000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '11', date: '2026-01-14 09:00', type: 'auction', deposit: 0, withdraw: 10500000, balance: -10500000, description: '낙찰대금차감' },
    { id: '12', date: '2026-01-13 14:00', type: 'deposit', deposit: 12300000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '13', date: '2026-01-13 09:00', type: 'auction', deposit: 0, withdraw: 12300000, balance: -12300000, description: '낙찰대금차감' },
    { id: '14', date: '2026-01-10 15:00', type: 'deposit', deposit: 9200000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '15', date: '2026-01-10 09:00', type: 'auction', deposit: 0, withdraw: 9200000, balance: -9200000, description: '낙찰대금차감' },
    { id: '16', date: '2026-01-09 14:00', type: 'deposit', deposit: 13500000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '17', date: '2026-01-09 09:00', type: 'auction', deposit: 0, withdraw: 13500000, balance: -13500000, description: '낙찰대금차감' },
    { id: '18', date: '2026-01-08 15:00', type: 'deposit', deposit: 11000000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '19', date: '2026-01-08 09:00', type: 'auction', deposit: 0, withdraw: 11000000, balance: -11000000, description: '낙찰대금차감' },
    { id: '20', date: '2026-01-07 14:00', type: 'deposit', deposit: 8500000, withdraw: 0, balance: 0, description: '계좌이체' },
    { id: '21', date: '2026-01-07 09:00', type: 'auction', deposit: 0, withdraw: 8500000, balance: -8500000, description: '낙찰대금차감' },
  ]);

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

  // 날짜 파싱 함수
  const parseDate = (dateStr: string): Date => {
    const [datePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // 필터링된 데이터
  const filteredHistory = useMemo(() => {
    let filtered = [...balanceHistory];

    // 구분 필터
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    // 기간 필터
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (periodFilter === 'today') {
      filtered = filtered.filter(item => {
        const itemDate = parseDate(item.date);
        return itemDate.getTime() >= today.getTime();
      });
    } else if (periodFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(item => {
        const itemDate = parseDate(item.date);
        return itemDate.getTime() >= weekAgo.getTime();
      });
    } else if (periodFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(item => {
        const itemDate = parseDate(item.date);
        return itemDate.getTime() >= monthAgo.getTime();
      });
    } else if (periodFilter === 'custom' && customDateRange.from) {
      filtered = filtered.filter(item => {
        const itemDate = parseDate(item.date);
        if (customDateRange.from && itemDate < customDateRange.from) return false;
        if (customDateRange.to) {
          const toDate = new Date(customDateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate > toDate) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [balanceHistory, typeFilter, periodFilter, customDateRange]);

  // 표시할 데이터 (무한 스크롤)
  const displayedHistory = useMemo(() => {
    return filteredHistory.slice(0, displayCount);
  }, [filteredHistory, displayCount]);

  // 필터 변경 시 초기화
  useEffect(() => {
    setDisplayCount(20);
  }, [typeFilter, periodFilter, customDateRange]);

  // 무한 스크롤 핸들러
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // 스크롤이 하단 100px 이내에 도달하면 더 로드
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (displayCount < filteredHistory.length) {
        setDisplayCount(prev => Math.min(prev + 20, filteredHistory.length));
      }
    }
  }, [displayCount, filteredHistory.length]);

  // 금액 포맷팅
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  };

  // 날짜 포맷 (축약형: 26.01.21 09:00)
  const formatDate = (dateStr: string) => {
    // 2026-01-21 09:00 -> 26.01.21 09:00
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-');
    return `${year.slice(2)}.${month}.${day} ${timePart}`;
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
            `}</style>
            
            {/* 모바일 메인 헤더 */}
            <div className="flex-shrink-0 bg-white">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  {/* 왼쪽 뒤로가기 */}
                  <Link href={backUrl} className="w-[80px] flex items-center">
                    <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                      <ChevronLeft className="h-[22px] w-[22px] text-gray-600" />
                    </button>
                  </Link>
                  {/* 가운데 타이틀 */}
                  <h1 className="text-[17px] font-bold text-gray-900">잔고 내역</h1>
                  {/* 오른쪽 아이콘 */}
                  <div className="w-[80px] flex items-center justify-end gap-1">
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

            {/* 필터 영역 */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex gap-2">
                {/* 구분 필터 드롭다운 */}
                <div className="relative" ref={typeDropdownRef}>
                  <button
                    onClick={() => {
                      setShowTypeDropdown(!showTypeDropdown);
                      setShowPeriodDropdown(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    {typeFilter === 'all' ? '구분' : 
                     typeFilter === 'deposit' ? '입금' : '낙찰대금차감'}
                    <ChevronDown className={`h-4 w-4 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showTypeDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                      >
                        {[
                          { value: 'all', label: '전체' },
                          { value: 'deposit', label: '입금' },
                          { value: 'auction', label: '낙찰대금차감' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setTypeFilter(option.value as TypeFilter);
                              setShowTypeDropdown(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-[13px] hover:bg-gray-100 transition-colors whitespace-nowrap ${
                              typeFilter === option.value ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
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
                      setShowTypeDropdown(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    {periodFilter === 'all' ? '기간' : 
                     periodFilter === 'today' ? '오늘' :
                     periodFilter === 'week' ? '1주일' : 
                     periodFilter === 'month' ? '1개월' : '기간 직접 선택'}
                    <ChevronDown className={`h-4 w-4 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
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
                              setPeriodFilter(option.value as PeriodFilter);
                              setShowPeriodDropdown(false);
                              if (option.value !== 'custom') {
                                setCustomDateRange({ from: undefined, to: undefined });
                              }
                            }}
                            className={`block w-full text-left px-4 py-2 text-[13px] hover:bg-gray-100 transition-colors whitespace-nowrap ${
                              periodFilter === option.value ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 기간 직접 선택 시 시작일/마감일 버튼 */}
                {periodFilter === 'custom' && (
                  <div className="flex items-center gap-1.5">
                    {/* 시작일 */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {customDateRange.from
                              ? format(customDateRange.from, 'yy.M.d', { locale: ko })
                              : '시작일'
                            }
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                        <div className="p-3 bg-white rounded-lg">
                          <Calendar
                            mode="single"
                            selected={customDateRange.from}
                            onSelect={(date) => {
                              setCustomDateRange(prev => ({ ...prev, from: date }));
                            }}
                            disabled={(date) => {
                              if (date > new Date()) return true;
                              if (customDateRange.to && date > customDateRange.to) return true;
                              return false;
                            }}
                            weekStartsOn={0}
                            formatters={{
                              formatCaption: (date) => format(date, 'yyyy년 M월', { locale: ko }),
                              formatWeekdayName: (date) => format(date, 'EEE', { locale: ko }),
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>

                    <span className="text-[13px] text-gray-400">~</span>

                    {/* 마감일 */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {customDateRange.to
                              ? format(customDateRange.to, 'yy.M.d', { locale: ko })
                              : '마감일'
                            }
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                        <div className="p-3 bg-white rounded-lg">
                          <Calendar
                            mode="single"
                            selected={customDateRange.to}
                            onSelect={(date) => {
                              setCustomDateRange(prev => ({ ...prev, to: date }));
                            }}
                            disabled={(date) => {
                              if (date > new Date()) return true;
                              if (customDateRange.from && date < customDateRange.from) return true;
                              return false;
                            }}
                            weekStartsOn={0}
                            formatters={{
                              formatCaption: (date) => format(date, 'yyyy년 M월', { locale: ko }),
                              formatWeekdayName: (date) => format(date, 'EEE', { locale: ko }),
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>

            {/* 테이블 - 무한 스크롤 */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className={`flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-white hide-scrollbar ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
            >
              <table className="w-full border-collapse min-w-[480px]">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2.5 text-[13px] font-semibold text-gray-500 text-center border-r border-gray-200 w-[105px]">거래일시</th>
                    <th className="px-2 py-2.5 text-[13px] font-semibold text-gray-500 text-center border-r border-gray-200 w-[90px]">입금</th>
                    <th className="px-2 py-2.5 text-[13px] font-semibold text-gray-500 text-center border-r border-gray-200 w-[90px]">출금(차감)</th>
                    <th className="px-2 py-2.5 text-[13px] font-semibold text-gray-500 text-center border-r border-gray-200 w-[100px]">잔액</th>
                    <th className="px-2 py-2.5 text-[13px] font-semibold text-gray-500 text-center w-[75px]">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-20">
                        <p className="text-sm text-gray-500">조회된 내역이 없습니다.</p>
                      </td>
                    </tr>
                  ) : (
                    displayedHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-2 py-3 text-[12px] text-gray-600 text-center border-r border-gray-100 whitespace-nowrap">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-2 py-3 text-[12px] text-right font-medium text-gray-900 border-r border-gray-100 whitespace-nowrap">
                          {item.deposit > 0 ? `+${formatCurrency(item.deposit)}` : ''}
                        </td>
                        <td className="px-2 py-3 text-[12px] text-right font-medium text-gray-900 border-r border-gray-100 whitespace-nowrap">
                          {item.withdraw > 0 ? `-${formatCurrency(item.withdraw)}` : ''}
                        </td>
                        <td className={`px-2 py-3 text-[12px] text-right font-semibold border-r border-gray-100 whitespace-nowrap ${item.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.balance < 0 ? `-${formatCurrency(item.balance)}` : formatCurrency(item.balance)}
                        </td>
                        <td className="px-2 py-3 text-[12px] text-gray-600 text-center whitespace-nowrap">
                          {item.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {/* 더 불러오기 표시 */}
              {displayCount < filteredHistory.length && (
                <div className="py-4 text-center text-xs text-gray-400">
                  스크롤하여 더 보기...
                </div>
              )}
              
              {/* 전체 건수 표시 */}
              {displayedHistory.length > 0 && displayCount >= filteredHistory.length && (
                <div className="py-4 text-center text-xs text-gray-400">
                  총 {filteredHistory.length}건
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
