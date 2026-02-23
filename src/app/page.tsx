'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Edit2,
  X,
  Copy,
  Check,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bell,
  Star,
  ExternalLink,
  Clock
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useBidStore } from '@/stores/bidStore';
import { GRADES, getCompanyAuctionSummary, calcTotal, getTodayDateCode } from '@/constants/auction';
import { useListings } from '@/features/listings/hooks';
import { formatGrade } from '@/lib/utils';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';
import { useQuery } from '@tanstack/react-query';

// 한국어 로케일 등록
registerLocale('ko', ko);

// 업체별 경매 두수 데이터 (공통 상수에서 계산)
const COMPANY_AUCTION_DATA = getCompanyAuctionSummary();

function MainPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 세션 정보 (중도매인 ID 가져오기)
  const { data: session } = useSession();
  const dealer = (session as any)?.dealer;
  const employee = (session as any)?.employee;
  const dealerId = dealer?.id || employee?.dealerId || null;
  
  // zustand 스토어에서 입찰 관련 상태 가져오기
  const { 
    bids: globalBids, 
    setBid,
    quickReBidAmount, 
    setQuickReBidAmount,
    isSecondBidNotificationOn,
    setIsSecondBidNotificationOn,
    cleanOldBids,
    favorites,
    toggleFavorite,
    isFavorite,
    bids
  } = useBidStore();
  
  // hydration 완료 여부
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 앱 로드 시 오래된 입찰 데이터 정리 및 hydration 완료 표시
  useEffect(() => {
    cleanOldBids();
    setIsHydrated(true);
  }, [cleanOldBids]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    if (tab === '경매정보' || tab === '관심') return tab;
    return '경매목록';
  });
  const [showReBidDialog, setShowReBidDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState('');
  const [showQuickReBidEdit, setShowQuickReBidEdit] = useState(false);
  const [tempQuickReBidAmount, setTempQuickReBidAmount] = useState('1,000');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [toastType, setToastType] = useState<'warning' | 'success'>('success');
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('전체');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const [showTimetable, setShowTimetable] = useState(true);
  const [timetableRemaining, setTimetableRemaining] = useState(0);

  // 선택된 날짜 포맷 (API 호출용)
  const selectedDateStr = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  // 승인된 상장 목록 조회 (DB 연동)
  const { data: listingsData, isLoading: isListingsLoading, refetch: refetchListings } = useListings({
    status: 'approved,completed' as any,
    listingDateFrom: selectedDateStr,
    listingDateTo: selectedDateStr,
    includeParts: true,
  });
  
  // 실시간 입찰 변경 구독 (Optimistic Update)
  // payload가 있으면 캐시에서 이미 업데이트됨, 없으면(DELETE) refetch
  const handleBidChange = useCallback((payload?: { partId: string; bidPrice: number; dealerId: string }) => {
    if (!payload) {
      // DELETE 이벤트 - 정확한 값을 위해 refetch
      console.log('[Main] 입찰 삭제 감지 - 데이터 새로고침');
      refetchListings();
    } else {
      console.log('[Main] 입찰 변경 감지 - 캐시 업데이트 완료:', payload.bidPrice);
    }
  }, [refetchListings]);
  
  useRealtimeBids({
    onBidChange: handleBidChange,
    enabled: true,
  });

  // 회차별 경매 정보 (폴링 5초)
  const { data: roundData } = useQuery({
    queryKey: ['rounds', 'current'],
    queryFn: async () => {
      const res = await fetch('/api/auctions/rounds/current');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 5000,
  });

  // listing -> round_no 매핑
  const roundListingMap: Record<string, number> = roundData?.roundListingMap || {};
  


  // 상장번호 정렬 함수 (예: 260206-101 → 가운데 101, 102, 201, 202 순)
  const sortByListingNo = (a: string, b: string) => {
    const partsA = a.split('-');
    const partsB = b.split('-');
    // 가운데/뒷자리 숫자 비교 (101, 102, 201...)
    const midA = parseInt(partsA[1] || '0', 10);
    const midB = parseInt(partsB[1] || '0', 10);
    if (midA !== midB) return midA - midB;
    // 3번째 자리가 있으면 비교 (01, 02...)
    const lastA = parseInt(partsA[2] || '0', 10);
    const lastB = parseInt(partsB[2] || '0', 10);
    return lastA - lastB;
  };

  // API 데이터를 기존 cattleData 형식으로 변환
  const cattleData = useMemo(() => {
    if (!listingsData || listingsData.length === 0) return [];
    
    const rlMap: Record<string, number> = roundData?.roundListingMap || {};
    
    const data = listingsData.map(listing => ({
      id: listing.listingNo,
      type: listing.breed,
      gender: listing.gender,
      grade: listing.grade,
      months: listing.monthAge || 0,
      company: listing.companyName || '',
      listingId: listing.id,
      traceNo: listing.traceNo,
      carcassWeight: listing.carcassWeight,
      backFat: listing.backFat,
      eyeMuscle: listing.eyeMuscle,
      marblingScore: listing.marblingScore,
      parts: listing.parts || [],
      status: listing.status,
    }));
    
    // 회차(오름차순: 1차→2차→3차) → 상장번호(오름차순) 정렬
    data.sort((a, b) => {
      const roundA = rlMap[a.listingId] ?? Infinity;
      const roundB = rlMap[b.listingId] ?? Infinity;
      if (roundA !== roundB) return roundA - roundB;
      return sortByListingNo(a.id, b.id);
    });
    
    return data;
  }, [listingsData, roundData?.roundListingMap]);

  // 토스트 표시 함수
  const showToastMessage = (message: string, type: 'warning' | 'success' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
  
  // 입금신청 모달 상태
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const currentBalance = 20000000; // 현재 잔고 (추후 Zustand로 관리)
  const depositAccountNumber = '351-0123-4567-23';

  // 날짜 포맷팅
  const formatDateForDisplay = (date: Date) => {
    const year = String(date.getFullYear()).slice(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${year}.${month}.${day}.(${dayName})`;
  };

  // 계좌번호 복사
  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(depositAccountNumber);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  // 금액 입력 핸들러 (숫자만, 쉼표 포맷팅)
  const handleBalanceAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '') {
      setBalanceAmount('');
      return;
    }
    const formatted = Number(numericValue).toLocaleString();
    setBalanceAmount(formatted);
  };

  // 빠른 금액 추가
  const addQuickAmount = (amount: number) => {
    const currentValue = Number(balanceAmount.replace(/,/g, '')) || 0;
    const newValue = currentValue + amount;
    setBalanceAmount(newValue.toLocaleString());
  };

  // URL 파라미터로 탭 설정 (뒤로가기/앞으로가기 시 동기화)
  useEffect(() => {
    const tab = searchParams.get('tab');
    
    if (tab === '경매정보') {
      setActiveTab('경매정보');
    } else if (tab === '관심') {
      setActiveTab('관심');
    } else {
      setActiveTab('경매목록');
    }
  }, [searchParams]);

  // 잔고 가리기/보이기 토글
  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  // 잔고 새로고침 함수
  const handleRefresh = () => {
    setIsRefreshing(true);
    // 새로고침 애니메이션 후 종료
    setTimeout(() => {
      setIsRefreshing(false);
      // 여기에 실제 잔고 API 호출 로직 추가
    }, 1000);
  };

  // 빠른 재입찰 (+설정금액)
  const handleQuickReBid = (bid: any) => {
    const newPrice = bid.topBidPrice + quickReBidAmount;
    setSelectedBid({...bid, reBidPrice: newPrice});
    setShowReBidDialog(true);
  };

  // 빠른 재입찰 금액 저장
  const saveQuickReBidAmount = () => {
    const amount = parseInt(tempQuickReBidAmount.replace(/,/g, ''));
    if (amount > 0) {
      setQuickReBidAmount(amount);
      setShowQuickReBidEdit(false);
    }
  };

  // 직접 입력 재입찰
  const handleCustomReBid = (bid: any) => {
    setSelectedBid(bid);
    setCustomBidPrice('');
    setShowReBidDialog(true);
  };

  // 재입찰 확정
  const confirmReBid = () => {
    if (!selectedBid) return;
    
    const finalPrice = selectedBid.reBidPrice || parseInt(customBidPrice.replace(/,/g, ''));
    const now = new Date();
    const timeStr = `${now.getFullYear().toString().slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.(${['일','월','화','수','목','금','토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // zustand 스토어에 저장
    setBid(selectedBid.listingNo, {
      myBid: finalPrice,
      highestBid: finalPrice,
      status: 'highest',
      time: timeStr,
      productInfo: selectedBid.productInfo
    });

    // 토스트 메시지 표시
    showToastMessage(`입찰이 완료되었습니다.`, 'success');

    setShowReBidDialog(false);
    setSelectedBid(null);
    setCustomBidPrice('');
  };

  // 타임테이블 잔여시간 계산 (현재 진행중 회차)
  useEffect(() => {
    const cr = roundData?.currentRound;
    if (!cr?.started_at || !cr?.round_duration_min) {
      setTimetableRemaining(0);
      return;
    }
    const calc = () => {
      const startedAt = new Date(cr.started_at).getTime();
      const durationMs = cr.round_duration_min * 60 * 1000;
      setTimetableRemaining(Math.max(0, Math.floor((startedAt + durationMs - Date.now()) / 1000)));
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [roundData?.currentRound?.id, roundData?.currentRound?.started_at, roundData?.currentRound?.round_duration_min]);

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

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(event.target as Node)) {
        setShowGradeDropdown(false);
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setShowCompanyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 등급 옵션 목록
  const gradeOptions = ['전체', '1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'];

  // 상장업체 옵션 목록 (cattleData에서 추출)
  const companyOptions = ['전체', ...Array.from(new Set(cattleData.map(item => item.company)))];

  // 필터링된 개체 데이터
  // 육량 지수(A,B,C)를 제외하고 등급 비교
  const filteredCattleData = cattleData.filter(item => {
    const baseGrade = item.grade.replace(/[ABC]/, '');
    let gradeMatch = selectedGrade === '전체';
    if (!gradeMatch) {
      if (selectedGrade === '1++(9)') gradeMatch = baseGrade === '1++' && item.marblingScore === 9;
      else if (selectedGrade === '1++(8)') gradeMatch = baseGrade === '1++' && item.marblingScore === 8;
      else if (selectedGrade === '1++(7)') gradeMatch = baseGrade === '1++' && item.marblingScore === 7;
      else gradeMatch = baseGrade === selectedGrade;
    }
    const companyMatch = selectedCompany === '전체' || item.company === selectedCompany;
    return gradeMatch && companyMatch;
  });

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
          <div 
            className="w-full md:max-w-md md:w-[500px] bg-white dark:bg-gray-900 md:shadow-2xl relative overflow-hidden flex flex-col transition-colors" 
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
            <div className="flex-shrink-0 bg-white dark:bg-gray-900 transition-colors">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  {/* 왼쪽 여백 (오른쪽과 동일한 크기) */}
                  <div className="w-[80px]"></div>
                  {/* 가운데 타이틀 */}
                  <h1 className="text-[17px] font-bold text-gray-900 dark:text-gray-100">부분육 경매장</h1>
                  {/* 오른쪽 아이콘 */}
                  <div className="flex items-center gap-1">
                    <Link 
                      href="/settings"
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center justify-center"
                    >
                      <Settings className="w-[22px] h-[22px]" />
                    </Link>
                    <Link 
                      href="/notifications"
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center justify-center relative"
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

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-900 transition-colors">


              {/* 내 잔고 링크 */}
              <Link 
                href="/profile/balance?from=main"
                className="mx-4 mt-4 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">내 잔고</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">-8,280,000원</span>
              </Link>

              {/* 경매목록/경매정보/관심 탭 */}
              <div className="mt-4 px-4">
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => {
                      setActiveTab('경매목록');
                      router.push('/?tab=경매목록', { scroll: false });
                    }}
                    className={`text-[15px] font-semibold pb-1.5 transition-colors ${
                      activeTab === '경매목록'
                        ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    경매목록
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('경매정보');
                      router.push('/?tab=경매정보', { scroll: false });
                    }}
                    className={`text-[15px] font-semibold pb-1.5 transition-colors ${
                      activeTab === '경매정보'
                        ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    경매정보
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('관심');
                      router.push('/?tab=관심', { scroll: false });
                    }}
                    className={`text-[15px] font-semibold pb-1.5 transition-colors ${
                      activeTab === '관심'
                        ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    관심
                  </button>
                </div>
              </div>

              {/* 기준일자 - 경매정보 탭에서만 표시 */}
              {activeTab === '경매정보' && (
                <div className="mt-4 px-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-4 py-3 shadow-sm transition-colors">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-400">기준일자:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {selectedDate.getFullYear()}.{String(selectedDate.getMonth() + 1).padStart(2, '0')}.{String(selectedDate.getDate()).padStart(2, '0')} ({['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()]})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 탭 컨텐츠 */}
              <div className="pb-24 bg-white dark:bg-gray-900 transition-colors">
                {activeTab === '경매목록' ? (
                  <div className="pt-3">
                    {/* 오늘의 경매 일정 타임테이블 */}
                    {roundData?.allRounds && roundData.allRounds.length > 0 && (() => {
                      const countPerRound: Record<number, number> = {};
                      Object.values(roundListingMap).forEach((rNo) => {
                        countPerRound[rNo] = (countPerRound[rNo] || 0) + 1;
                      });
                      const totalRoundListings = Object.values(countPerRound).reduce((s, n) => s + n, 0);

                      return (
                        <div className="mx-4 mb-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                          <button
                            onClick={() => setShowTimetable(!showTimetable)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                              <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">오늘의 경매 일정</span>
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                {roundData.allRounds.length}회차 · 총 {totalRoundListings}두
                              </span>
                            </div>
                            {showTimetable
                              ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            }
                          </button>
                          <AnimatePresence>
                            {showTimetable && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-gray-100 dark:border-gray-700">
                                  {roundData.allRounds.map((round: any) => {
                                    const isOpen = round.status === 'open';
                                    const isClosed = round.status === 'closed';
                                    const startTime = round.start_time?.slice(0, 5);
                                    const endTime = round.end_time?.slice(0, 5);
                                    const timeStr = startTime && endTime ? `${startTime} ~ ${endTime}` : startTime ? `${startTime} ~` : null;
                                    const roundCount = countPerRound[round.round_no] || 0;

                                    return (
                                      <div
                                        key={round.id}
                                        className={`flex items-center gap-3 px-3 py-2 ${
                                          isOpen ? 'bg-green-50/60 dark:bg-green-900/20' : ''
                                        }`}
                                      >
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                          isOpen ? 'bg-green-500 animate-pulse' : isClosed ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`} />
                                        <span className={`text-[13px] font-medium min-w-[32px] ${
                                          isClosed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'
                                        }`}>
                                          {round.round_no}차
                                        </span>
                                        {timeStr && (
                                          <span className={`text-[12px] tabular-nums ${
                                            isClosed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
                                          }`}>
                                            {timeStr}
                                          </span>
                                        )}
                                        <span className={`text-[11px] ${
                                          isClosed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                          {roundCount}두
                                        </span>
                                        <span className="ml-auto text-[11px] font-medium">
                                          {isOpen ? (
                                            <span className="text-green-600 dark:text-green-400">
                                              진행중 {timetableRemaining > 0 && (
                                                <span className="font-mono tabular-nums">
                                                  {Math.floor(timetableRemaining / 60)}:{String(timetableRemaining % 60).padStart(2, '0')}
                                                </span>
                                              )}
                                            </span>
                                          ) : isClosed ? (
                                            <span className="text-gray-400 dark:text-gray-500">마감</span>
                                          ) : (
                                            <span className="text-gray-400 dark:text-gray-500">대기</span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })()}

                    {/* 경매목록 테이블 */}
                    {cattleData.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-gray-400 dark:text-gray-500 mb-2">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">상장된 개체가 없습니다.</p>
                      </div>
                    ) : (
                    <div className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-700 transition-colors">
                      <table className="w-full text-[13px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">차수</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">접수번호</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">성별</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">등급</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">개월령</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">상장업체</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">관심</th>
                          </tr>
                        </thead>
                        <tbody>
                            {cattleData.map((item, index) => (
                            <tr 
                              key={item.id}
                              onClick={() => router.push(`/auction/${item.id}`)}
                              className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors ${(item as any).status === 'completed' ? 'opacity-60' : ''} ${index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}
                            >
                                <td className="py-3 px-1.5 text-center whitespace-nowrap">
                                    {(() => {
                                      const rNo = roundListingMap[(item as any).listingId];
                                      const isCompleted = (item as any).status === 'completed';
                                      if (!rNo) return <span className="text-[11px] text-gray-300 dark:text-gray-600">-</span>;
                                      return (
                                        <span className={`inline-flex items-center justify-center min-w-[28px] px-1 py-0.5 rounded text-[11px] font-bold ${isCompleted ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 line-through' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                          {rNo}차
                                        </span>
                                      );
                                    })()}
                                  </td>
                                <td className="py-3 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{item.id}</td>
                                <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.gender}</td>
                                <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatGrade(item.grade, item.marblingScore)}</td>
                                <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.months}</td>
                                <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.company}</td>
                                <td className="py-3 px-1.5 text-center">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(item.id);
                                  }}
                                  className={`p-1.5 transition-colors ${
                                    isHydrated && isFavorite(item.id) 
                                      ? 'text-gray-900 dark:text-gray-100' 
                                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                  }`}
                                >
                                  <Star className={`w-5 h-5 ${isHydrated && isFavorite(item.id) ? 'fill-current' : ''}`} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </div>
                ) : activeTab === '관심' ? (
                  <div className="pt-4">
                    {(() => {
                        const entityFavorites = favorites.filter(id => !id.includes('-', id.indexOf('-') + 1) || id.split('-').length === 2);
                        return entityFavorites.length === 0 ? (
                      <div className="text-center py-12">
                        <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">관심 등록된 개체가 없습니다.</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">경매목록 탭에서 별 아이콘을 눌러 추가해보세요.</p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-700 transition-colors">
                        <table className="w-full text-[13px]">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">차수</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">접수번호</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">성별</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">등급</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">개월령</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">상장업체</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">관심</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cattleData.filter(item => isHydrated && isFavorite(item.id)).map((item, index) => (
                              <tr 
                                key={item.id} 
                                onClick={() => router.push(`/auction/${item.id}`)}
                                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors ${(item as any).status === 'completed' ? 'opacity-60' : ''} ${index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}
                              >
                                    <td className="py-3 px-1.5 text-center whitespace-nowrap">
                                        {(() => {
                                          const rNo = roundListingMap[(item as any).listingId];
                                          const isCompleted = (item as any).status === 'completed';
                                          if (!rNo) return <span className="text-[11px] text-gray-300 dark:text-gray-600">-</span>;
                                          return (
                                            <span className={`inline-flex items-center justify-center min-w-[28px] px-1 py-0.5 rounded text-[11px] font-bold ${isCompleted ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 line-through' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                              {rNo}차
                                            </span>
                                          );
                                        })()}
                                      </td>
                                    <td className="py-3 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{item.id}</td>
                                    <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.gender}</td>
                                    <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatGrade(item.grade, item.marblingScore)}</td>
                                    <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.months}</td>
                                    <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.company}</td>
                                    <td className="py-3 px-1.5 text-center">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(item.id);
                                    }}
                                    className="p-1.5 text-gray-900 dark:text-gray-100 transition-colors"
                                  >
                                    <Star className="w-5 h-5 fill-current" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                        );
                      })()
                    }
                  </div>
                ) : activeTab === '경매정보' ? (
                  <div className="px-4 pt-4">
                    <div className="mb-4">
                      {/* 등급별 경매 두수 */}
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">등급별 경매 두수</h3>
                      <div className="mb-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden shadow-sm transition-colors">
                        <table className="w-full text-xs table-fixed">
                          <thead>
                            <tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12.5%] border-r border-gray-200 dark:border-gray-600">성별</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12.5%] border-r border-gray-200 dark:border-gray-600">1++(9)</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12.5%] border-r border-gray-200 dark:border-gray-600">1++(8)</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12.5%] border-r border-gray-200 dark:border-gray-600">1++(7)</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12.5%] border-r border-gray-200 dark:border-gray-600">1+</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12.5%] border-r border-gray-200 dark:border-gray-600">1</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12.5%] border-r border-gray-200 dark:border-gray-600">2</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12.5%]">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const getBaseGrade = (grade: string) => grade.replace(/[ABC]/, '');
                              const isGrade = (c: any, targetGrade: string) => {
                                const base = getBaseGrade(c.grade);
                                if (targetGrade === '1++(9)') return base === '1++' && c.marblingScore === 9;
                                if (targetGrade === '1++(8)') return base === '1++' && c.marblingScore === 8;
                                if (targetGrade === '1++(7)') return base === '1++' && c.marblingScore === 7;
                                return base === targetGrade;
                              };
                              const steer9 = cattleData.filter(c => c.gender === '거세' && isGrade(c, '1++(9)')).length;
                              const steer8 = cattleData.filter(c => c.gender === '거세' && isGrade(c, '1++(8)')).length;
                              const steer7 = cattleData.filter(c => c.gender === '거세' && isGrade(c, '1++(7)')).length;
                              const steer1p = cattleData.filter(c => c.gender === '거세' && isGrade(c, '1+')).length;
                              const steer1 = cattleData.filter(c => c.gender === '거세' && isGrade(c, '1')).length;
                              const steer2 = cattleData.filter(c => c.gender === '거세' && isGrade(c, '2')).length;
                              const steerSum = cattleData.filter(c => c.gender === '거세').length;

                              const cow9 = cattleData.filter(c => c.gender === '암' && isGrade(c, '1++(9)')).length;
                              const cow8 = cattleData.filter(c => c.gender === '암' && isGrade(c, '1++(8)')).length;
                              const cow7 = cattleData.filter(c => c.gender === '암' && isGrade(c, '1++(7)')).length;
                              const cow1p = cattleData.filter(c => c.gender === '암' && isGrade(c, '1+')).length;
                              const cow1 = cattleData.filter(c => c.gender === '암' && isGrade(c, '1')).length;
                              const cow2 = cattleData.filter(c => c.gender === '암' && isGrade(c, '2')).length;
                              const cowSum = cattleData.filter(c => c.gender === '암').length;

                              return (
                                <>
                                  <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="py-2.5 text-center text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">거세</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{steer9}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{steer8}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{steer7}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{steer1p}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{steer1}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{steer2}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100">{steerSum}</td>
                                  </tr>
                                  <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="py-2.5 text-center text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700">암</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{cow9}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{cow8}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{cow7}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{cow1p}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{cow1}</td>
                                    <td className="py-2.5 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{cow2}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100">{cowSum}</td>
                                  </tr>
                                  <tr className="bg-gray-100/80 dark:bg-gray-700/80">
                                    <td className="py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-600">합계</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{steer9 + cow9}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{steer8 + cow8}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{steer7 + cow7}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{steer1p + cow1p}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{steer1 + cow1}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{steer2 + cow2}</td>
                                    <td className="py-2.5 text-center font-bold text-gray-900 dark:text-gray-100">{steerSum + cowSum}</td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 업체별 경매 두수 */}
                    <div className="mt-6 mb-4">
                      <div className="mb-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">업체별 경매 두수</h3>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden shadow-sm transition-colors">
                        <table className="w-full text-xs table-fixed">
                          <thead>
                            <tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[22%] border-r border-gray-200 dark:border-gray-600">업체</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[11%] border-r border-gray-200 dark:border-gray-600">1++(9)</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[11%] border-r border-gray-200 dark:border-gray-600">1++(8)</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[11%] border-r border-gray-200 dark:border-gray-600">1++(7)</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[11%] border-r border-gray-200 dark:border-gray-600">1+</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[11%] border-r border-gray-200 dark:border-gray-600">1</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[11%] border-r border-gray-200 dark:border-gray-600">2</th>
                              <th className="py-2 text-center font-medium text-gray-500 dark:text-gray-400 w-[12%]">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                          {(() => {
                            const getBaseGrade = (grade: string) => grade.replace(/[ABC]/, '');
                            const isGrade = (c: any, targetGrade: string) => {
                              const base = getBaseGrade(c.grade);
                              if (targetGrade === '1++(9)') return base === '1++' && c.marblingScore === 9;
                              if (targetGrade === '1++(8)') return base === '1++' && c.marblingScore === 8;
                              if (targetGrade === '1++(7)') return base === '1++' && c.marblingScore === 7;
                              return base === targetGrade;
                            };
                            const companies = [...new Set(cattleData.map(c => c.company))];
                            return companies.map((companyName, idx) => {
                              const companyData = cattleData.filter(c => c.company === companyName);
                              const grade9 = companyData.filter(c => isGrade(c, '1++(9)')).length;
                              const grade8 = companyData.filter(c => isGrade(c, '1++(8)')).length;
                              const grade7 = companyData.filter(c => isGrade(c, '1++(7)')).length;
                              const grade1p = companyData.filter(c => isGrade(c, '1+')).length;
                              const grade1 = companyData.filter(c => isGrade(c, '1')).length;
                              const grade2 = companyData.filter(c => isGrade(c, '2')).length;
                              const companyTotal = companyData.length;
                              return (
                                <tr key={companyName} className={`border-b border-gray-100 dark:border-gray-700 ${idx > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                                  <td className="py-2 text-center text-gray-900 dark:text-gray-100 font-semibold border-r border-gray-100 dark:border-gray-700">
                                    {companyName}
                                  </td>
                                  <td className="py-2 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{grade9}</td>
                                  <td className="py-2 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{grade8}</td>
                                  <td className="py-2 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{grade7}</td>
                                  <td className="py-2 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{grade1p}</td>
                                  <td className="py-2 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{grade1}</td>
                                  <td className="py-2 text-center text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700">{grade2}</td>
                                  <td className="py-2 text-center font-semibold text-gray-900 dark:text-gray-100">{companyTotal}</td>
                                </tr>
                              );
                            });
                          })()}
                          </tbody>
                          <tfoot>
                            {(() => {
                              const getBaseGrade = (grade: string) => grade.replace(/[ABC]/, '');
                              const isGrade = (c: any, targetGrade: string) => {
                                const base = getBaseGrade(c.grade);
                                if (targetGrade === '1++(9)') return base === '1++' && c.marblingScore === 9;
                                if (targetGrade === '1++(8)') return base === '1++' && c.marblingScore === 8;
                                if (targetGrade === '1++(7)') return base === '1++' && c.marblingScore === 7;
                                return base === targetGrade;
                              };
                              const total9 = cattleData.filter(c => isGrade(c, '1++(9)')).length;
                              const total8 = cattleData.filter(c => isGrade(c, '1++(8)')).length;
                              const total7 = cattleData.filter(c => isGrade(c, '1++(7)')).length;
                              const total1p = cattleData.filter(c => isGrade(c, '1+')).length;
                              const total1 = cattleData.filter(c => isGrade(c, '1')).length;
                              const total2 = cattleData.filter(c => isGrade(c, '2')).length;
                              const grandTotal = cattleData.length;
                              return (
                                <tr className="bg-gray-100/80 dark:bg-gray-700/80 border-t border-gray-300 dark:border-gray-600">
                                  <td className="py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-600">합계</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{total9}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{total8}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{total7}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{total1p}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{total1}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-600">{total2}</td>
                                  <td className="py-2.5 text-center font-bold text-gray-900 dark:text-gray-100">{grandTotal}</td>
                                </tr>
                              );
                            })()}
                          </tfoot>
                        </table>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="px-4 pt-4">
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">탭을 선택해주세요.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 입찰 설정 바텀시트 */}
            <AnimatePresence>
              {showQuickReBidEdit && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 z-40"
                    onClick={() => {
                      setShowQuickReBidEdit(false);
                      setTempQuickReBidAmount(quickReBidAmount.toLocaleString());
                    }}
                  />
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl z-50 transition-colors"
                  >
                    {/* 핸들 */}
                    <div className="flex justify-center py-2">
                      <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    </div>

                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 pb-3">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">입찰 설정</h3>
                      <button
                        onClick={() => {
                          setShowQuickReBidEdit(false);
                          setTempQuickReBidAmount(quickReBidAmount.toLocaleString());
                        }}
                        className="p-1 text-gray-600 dark:text-gray-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="px-4 pb-8">
                      {/* 차순위 알림 설정 */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">차순위 알림 받기</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">차순위가 되면 알림을 받습니다</p>
                        </div>
                        <button
                          onClick={() => setIsSecondBidNotificationOn(!isSecondBidNotificationOn)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                            isSecondBidNotificationOn 
                              ? 'bg-gray-900 dark:bg-gray-200' 
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-900 shadow-md transition-transform ${
                              isSecondBidNotificationOn ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 빠른 재입찰 금액 설정 */}
                      <div className="py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">빠른 재입찰 금액</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">현재 최고가에 이 금액을 더해 빠른 재입찰합니다</p>
                        <div className="relative">
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={tempQuickReBidAmount}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              setTempQuickReBidAmount(value ? parseInt(value).toLocaleString() : '');
                            }}
                            onFocus={() => setTempQuickReBidAmount('')}
                            placeholder="증액할 금액 입력 (100원 단위)"
                            className="w-full px-3 py-3 pr-10 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">원</span>
                        </div>
                        {tempQuickReBidAmount && parseInt(tempQuickReBidAmount.replace(/,/g, '')) % 100 !== 0 && (
                          <p className="text-xs text-orange-500 dark:text-orange-400 mt-2">100원 단위로 입력해주세요</p>
                        )}
                      </div>

                      {/* 저장 버튼 */}
                      <button
                        onClick={() => {
                          saveQuickReBidAmount();
                          setShowQuickReBidEdit(false);
                        }}
                        disabled={!tempQuickReBidAmount || parseInt(tempQuickReBidAmount.replace(/,/g, '')) <= 0 || parseInt(tempQuickReBidAmount.replace(/,/g, '')) % 100 !== 0}
                        className="w-full py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors mt-2"
                      >
                        저장
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* 재입찰 바텀시트 */}
            <AnimatePresence>
            {showReBidDialog && selectedBid && selectedBid.productInfo && (
                <>
                  {/* 백드롭 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 z-40"
                    onClick={() => {
                      setShowReBidDialog(false);
                      setSelectedBid(null);
                      setCustomBidPrice('');
                    }}
                  />
                  
                  {/* 바텀시트 */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto transition-colors"
                  >
                    {/* 핸들 */}
                    <div className="flex justify-center py-2">
                      <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>

                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 pb-3">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">입찰하기</h3>
                      <button
                        onClick={() => {
                          setShowReBidDialog(false);
                          setSelectedBid(null);
                          setCustomBidPrice('');
                        }}
                        className="p-1 text-gray-600 dark:text-gray-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* 콘텐츠 */}
                    <div className="px-4 pb-8">
                      {/* 상품 정보 배지 */}
                      <div className="flex items-center gap-1 mb-4 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium">
                          {selectedBid.listingNo}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium">
                          {selectedBid.productInfo.type || '한우거세'}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium">
                          {selectedBid.productInfo.grade || '1++A(9)'}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium">
                          30개월
                        </span>
                      </div>
                      
                      {/* 부위 및 중량 */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">선택된 부위</div>
                          <div className="w-full px-3 py-2.5 text-sm font-bold border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center">
                            {selectedBid.productInfo.partName}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">중량</div>
                          <div className="w-full px-3 py-2.5 text-sm font-bold border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center">
                            {selectedBid.productInfo.weight}
                          </div>
                        </div>
                      </div>
                      
                      {/* 입찰가격 */}
                  <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400">입찰가격 (원/kg)</div>
                        </div>
                        <div className="relative mb-2">
                      <input
                            type="text"
                        inputMode="numeric"
                        value={customBidPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setCustomBidPrice(value ? parseInt(value).toLocaleString() : '');
                        }}
                            placeholder={`최저단가 ${(selectedBid.productInfo.price || 50000).toLocaleString()}`}
                            className="w-full px-3 py-3 pr-10 text-right text-xl font-bold border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:border-gray-500 bg-white dark:bg-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                            원
                    </div>
                      </div>
                        {/* 가격 조정 버튼 */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {[100, 1000, 10000, 50000].map((amount) => (
                    <button
                              key={amount}
                      onClick={() => {
                                const currentPrice = customBidPrice ? parseInt(customBidPrice.replace(/,/g, '')) : 0;
                                const newPrice = currentPrice + amount;
                                setCustomBidPrice(newPrice.toLocaleString());
                      }}
                              className="py-2.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-300"
                    >
                              +{amount.toLocaleString()}
                    </button>
                          ))}
                    <button
                            onClick={() => setCustomBidPrice('')}
                            className="py-2.5 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 font-medium"
                    >
                            초기화
                    </button>
                  </div>
                </div>
                      
                      {/* 총 입찰금액 */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">총 입찰금액</span>
                          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {(() => {
                              if (!customBidPrice) return '-';
                              const price = parseInt(customBidPrice.replace(/,/g, ''));
                              const weight = parseFloat(selectedBid.productInfo.weight);
                              const total = Math.round(price * weight);
                              return `${total.toLocaleString()}원`;
                            })()}
                          </span>
              </div>
                      </div>
                      
                      {/* 입찰하기 버튼 */}
                      <button
                        onClick={confirmReBid}
                        disabled={!customBidPrice}
                        className="w-full py-3.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white dark:text-gray-900 disabled:text-gray-500 dark:disabled:text-gray-400 font-bold text-base rounded-lg transition-colors"
                      >
                        입찰하기
                      </button>
                    </div>
                  </motion.div>
                </>
            )}
            </AnimatePresence>

            {/* 토스트 메시지 */}
            {showToast && (
              <div className={`fixed left-1/2 transform -translate-x-1/2 z-[10001] transition-all duration-300 ${
                toastType === 'success' ? 'bottom-20' : 'top-4'
              }`}>
                <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
                  toastType === 'success' 
                    ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200' 
                    : 'bg-gray-800 dark:bg-gray-700 text-white'
                }`}>
                  <div className="flex-shrink-0">
                    {toastType === 'success' ? (
                      <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-yellow-400 dark:text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{toastMessage}</span>
                </div>
              </div>
            )}

            {/* 입금신청 모달 */}
            <AnimatePresence>
              {showBalanceModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center p-4"
                >
                  {/* 배경 오버레이 */}
                  <div 
                    className="absolute inset-0 bg-black/60"
                    onClick={() => setShowBalanceModal(false)}
                  />
                  
                  {/* 모달 콘텐츠 */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
                  >
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h3 className="text-base font-bold">입금신청</h3>
                      <button 
                        onClick={() => setShowBalanceModal(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* 내용 */}
                    <div className="p-4">
                      {/* 입금 계좌 안내 */}
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-gray-600 font-medium">입금 계좌</div>
                          <button
                            onClick={copyAccountNumber}
                            className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-700 transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3" />
                                복사됨
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                복사
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-sm font-bold text-gray-900">농협은행 {depositAccountNumber}</div>
                        <div className="text-xs text-gray-500">예금주: 농협 중부미트센터</div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-[11px] text-gray-600">계좌이체 후, 입금신청 부탁드립니다.</p>
                        </div>
                      </div>

                      {/* 현재 잔고 */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">현재 잔고</div>
                        <div className="text-lg font-bold text-gray-900">
                          ₩{currentBalance.toLocaleString()}
                        </div>
                      </div>

                      {/* 금액 입력 */}
                      <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1.5">
                          입금 신청 금액
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₩</span>
                          <input
                            type="text"
                            value={balanceAmount}
                            onChange={(e) => handleBalanceAmountChange(e.target.value)}
                            placeholder="0"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-right text-lg font-bold focus:outline-none focus:border-gray-500 bg-white"
                          />
                        </div>
                      </div>

                      {/* 빠른 금액 버튼 */}
                      <div className="flex gap-1.5 mb-4">
                        <button
                          onClick={() => addQuickAmount(100000)}
                          className="flex-1 py-2 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          +10만
                        </button>
                        <button
                          onClick={() => addQuickAmount(500000)}
                          className="flex-1 py-2 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          +50만
                        </button>
                        <button
                          onClick={() => addQuickAmount(1000000)}
                          className="flex-1 py-2 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          +100만
                        </button>
                        <button
                          onClick={() => addQuickAmount(10000000)}
                          className="flex-1 py-2 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          +1,000만
                        </button>
                        <button
                          onClick={() => setBalanceAmount('')}
                          className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          title="초기화"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>

                      {/* 확인 버튼 */}
                      <button
                        disabled={!balanceAmount || balanceAmount === '0'}
                        className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
                          balanceAmount && balanceAmount !== '0'
                            ? 'bg-gray-900 text-white hover:bg-gray-800'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        입금신청
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 하단 네비게이션 */}
            <BottomNav />
          </div>
        </div>
    </div>
  );
}

export default function MainPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <MainPageContent />
    </Suspense>
  );
}