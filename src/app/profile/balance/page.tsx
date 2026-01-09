'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Home as HomeIcon,
  BarChart3,
  FileText,
  Gavel,
  User,
  ChevronLeft,
  ChevronDown,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 잔고 내역 타입
interface BalanceHistory {
  id: string;
  date: string;           // '26.01.06'
  type: 'deposit' | 'auction' | 'withdraw';  // 입금 / 경락대금 / 출금
  description: string;    // 내용
  amount: number;         // 금액 (양수: 입금, 음수: 경락대금/출금)
  balanceAfter: number;   // 변동 후 잔고
}

// 구분 라벨
const typeLabels: Record<BalanceHistory['type'], string> = {
  deposit: '입금',
  auction: '경락대금',
  withdraw: '출금',
};

// 구분 색상
const typeColors: Record<BalanceHistory['type'], string> = {
  deposit: 'text-blue-600',
  auction: 'text-red-600',
  withdraw: 'text-gray-600',
};

// 구분 필터 타입
type TypeFilter = 'all' | 'deposit' | 'auction' | 'withdraw';

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
  
  const currentBalance = 20000000;

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

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 더미 데이터
  const [balanceHistory] = useState<BalanceHistory[]>([
    { id: '1', date: '26.01.06', type: 'deposit', description: '계좌이체', amount: 5000000, balanceAfter: 20000000 },
    { id: '2', date: '26.01.06', type: 'auction', description: '260106 총 경락대금', amount: -1200000, balanceAfter: 15000000 },
    { id: '3', date: '26.01.05', type: 'withdraw', description: '정산출금', amount: -3000000, balanceAfter: 16200000 },
    { id: '4', date: '26.01.05', type: 'auction', description: '260105 총 경락대금', amount: -800000, balanceAfter: 19200000 },
    { id: '5', date: '26.01.04', type: 'deposit', description: '계좌이체', amount: 10000000, balanceAfter: 20000000 },
    { id: '6', date: '26.01.04', type: 'auction', description: '260104 총 경락대금', amount: -2500000, balanceAfter: 10000000 },
    { id: '7', date: '26.01.03', type: 'deposit', description: '계좌이체', amount: 8000000, balanceAfter: 12500000 },
    { id: '8', date: '26.01.03', type: 'auction', description: '260103 총 경락대금', amount: -1500000, balanceAfter: 4500000 },
    { id: '9', date: '26.01.02', type: 'withdraw', description: '정산출금', amount: -2000000, balanceAfter: 6000000 },
    { id: '10', date: '26.01.02', type: 'deposit', description: '계좌이체', amount: 3000000, balanceAfter: 8000000 },
    { id: '11', date: '26.01.01', type: 'auction', description: '260101 총 경락대금', amount: -1800000, balanceAfter: 5000000 },
    { id: '12', date: '26.01.01', type: 'deposit', description: '계좌이체', amount: 5000000, balanceAfter: 6800000 },
    { id: '13', date: '25.12.31', type: 'withdraw', description: '정산출금', amount: -1000000, balanceAfter: 1800000 },
    { id: '14', date: '25.12.31', type: 'auction', description: '251231 총 경락대금', amount: -2200000, balanceAfter: 2800000 },
    { id: '15', date: '25.12.30', type: 'deposit', description: '계좌이체', amount: 3000000, balanceAfter: 5000000 },
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
    const [year, month, day] = dateStr.split('.').map(Number);
    return new Date(2000 + year, month - 1, day);
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

  // 페이지네이션 데이터
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHistory, currentPage, itemsPerPage]);

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, periodFilter, customDateRange]);

  // 금액 포맷팅
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  };

  // 금액 표시 (부호 포함)
  const formatAmount = (amount: number) => {
    const formatted = formatCurrency(amount);
    if (amount > 0) {
      return `+${formatted}`;
    }
    return `-${formatted}`;
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
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {/* 모바일 메인 헤더 */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center">
                    <img 
                      src="/Mainlogo.png" 
                      alt="HanuMuch" 
                      className="h-7 w-auto"
                    />
                  </Link>
                  <div className="flex items-center">
                    <img 
                      src="/음성축산물공판장.png" 
                      alt="음성축산물공판장" 
                      className="h-5 w-auto border border-gray-300 rounded px-1.5 py-0.5 bg-gradient-to-br from-white to-gray-50 shadow-sm"
                    />
                  </div>
              </div>
            </div>
          </div>

            {/* 페이지 제목 & 현재 잔고 */}
            <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link href={backUrl}>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                  </Link>
                  <h1 className="text-lg font-bold text-gray-900">잔고 내역</h1>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">현재 잔고</p>
                  <p className="text-sm font-bold text-gray-900">
                    ₩{formatCurrency(currentBalance)}
                  </p>
                </div>
              </div>
            </div>

            {/* 필터 영역 */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5">
              <div className="flex gap-2">
                {/* 구분 필터 드롭다운 */}
                <div className="relative" ref={typeDropdownRef}>
                  <button
                    onClick={() => {
                      setShowTypeDropdown(!showTypeDropdown);
                      setShowPeriodDropdown(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {typeFilter === 'all' ? '구분' : typeLabels[typeFilter]}
                    <ChevronDown className={`h-3 w-3 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
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
                          { value: 'auction', label: '경락대금' },
                          { value: 'withdraw', label: '출금' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setTypeFilter(option.value as TypeFilter);
                              setShowTypeDropdown(false);
                            }}
                            className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors whitespace-nowrap ${
                              typeFilter === option.value ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
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
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {periodFilter === 'all' ? '기간' : 
                     periodFilter === 'today' ? '오늘' :
                     periodFilter === 'week' ? '1주일' : 
                     periodFilter === 'month' ? '1개월' : '기간 직접 선택'}
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
                              setPeriodFilter(option.value as PeriodFilter);
                              setShowPeriodDropdown(false);
                              if (option.value !== 'custom') {
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
                </div>

                {/* 기간 직접 선택 시 시작일/마감일 버튼 */}
                {periodFilter === 'custom' && (
                  <div className="flex items-center gap-1">
                    {/* 시작일 */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <CalendarIcon className="h-3 w-3" />
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

                    <span className="text-xs text-gray-400">~</span>

                    {/* 마감일 */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <CalendarIcon className="h-3 w-3" />
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

            {/* 테이블 헤더 */}
            <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center px-3 py-2.5 text-[11px] font-semibold text-gray-500">
                <div className="w-[72px] flex-shrink-0 text-center">일자</div>
                <div className="w-[60px] flex-shrink-0 text-center">구분</div>
                <div className="flex-1 text-center">금액</div>
                <div className="flex-1 text-center">잔고</div>
              </div>
            </div>

            {/* 테이블 바디 */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
              {paginatedHistory.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-sm text-gray-500">조회된 내역이 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {paginatedHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center px-3 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-[72px] flex-shrink-0 text-center text-[11px] text-gray-600">
                        {item.date}
                      </div>
                      <div className="w-[60px] flex-shrink-0 text-center">
                        <span className={`text-[11px] font-medium ${typeColors[item.type]}`}>
                          {typeLabels[item.type]}
                        </span>
                      </div>
                      <div className={`flex-1 text-center text-[12px] font-semibold ${
                        item.amount > 0 ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {formatAmount(item.amount)}
                      </div>
                      <div className="flex-1 text-center text-[12px] text-gray-700 font-medium">
                        {formatCurrency(item.balanceAfter)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 페이지네이션 */}
            {filteredHistory.length > 0 && (
              <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
                    >
                      {[10, 20, 50, 100].map(option => (
                        <option key={option} value={option}>{option}개</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-400">/ 총 {filteredHistory.length}건</span>
                  </div>

                  {/* 페이지 이동 */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`text-xs transition-colors ${
                          currentPage === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        ← 이전
                      </button>
                      
                      <span className="text-xs text-gray-900 font-medium">
                        {currentPage} / {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`text-xs transition-colors ${
                          currentPage === totalPages
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        다음 →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                <Link href="/trade" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                  <FileText className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">거래</span>
                </Link>
                
                {/* 내정보 */}
                <Link href="/profile" className="flex-1 flex flex-col items-center py-2 text-red-600 cursor-pointer">
                  <User className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">내정보</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
