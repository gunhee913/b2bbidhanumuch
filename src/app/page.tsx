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
  Star,
  ExternalLink
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import NotificationBell from '@/components/NotificationBell';
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
import { useRealtimeFavorites } from '@/hooks/useRealtimeFavorites';
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
    loadFavoritesFromServer,
    bids
  } = useBidStore();
  
  // hydration 완료 여부
  const [isHydrated, setIsHydrated] = useState(false);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    if (tab === '부위별' || tab === '경매정보' || tab === '관심') return tab;
    return '개체별';
  });
  const [showReBidDialog, setShowReBidDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState('');
  const [showQuickReBidEdit, setShowQuickReBidEdit] = useState(false);
  const [tempQuickReBidAmount, setTempQuickReBidAmount] = useState('1,000');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeDateLoaded, setActiveDateLoaded] = useState(false);

  // 앱 로드 시 오래된 입찰 데이터 정리 및 hydration 완료 표시
  useEffect(() => {
    cleanOldBids();
    setIsHydrated(true);
  }, [cleanOldBids]);

  // 활성 경매일 기준으로 초기 날짜 설정
  useEffect(() => {
    if (!activeDateLoaded) {
      fetch('/api/active-auction-date')
        .then(res => res.json())
        .then(data => {
          if (data.date) {
            const [y, m, d] = data.date.split('-').map(Number);
            setSelectedDate(new Date(y, m - 1, d));
            loadFavoritesFromServer(data.date);
          }
        })
        .catch(() => {})
        .finally(() => setActiveDateLoaded(true));
    }
  }, [activeDateLoaded, loadFavoritesFromServer]);
  const [toastType, setToastType] = useState<'warning' | 'success'>('success');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [favSubTab, setFavSubTab] = useState<'개체별' | '부위별'>('개체별');
  const [showFavPartBidSheet, setShowFavPartBidSheet] = useState(false);
  const [selectedFavPart, setSelectedFavPart] = useState<any>(null);
  const [favPartBidPrice, setFavPartBidPrice] = useState(0);
  const [expandedFavPartId, setExpandedFavPartId] = useState<string | null>(null);
  const [favPartImageIndex, setFavPartImageIndex] = useState<Record<string, number>>({});
  const favSwipeStartX = useRef(0);
  const favSwipeEndX = useRef(0);
  const favSwipeIsDragging = useRef(false);
  const favSwipeProductId = useRef<string | null>(null);

  // 선택된 날짜 포맷 (API 호출용)
  const selectedDateStr = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  // 상장 목록 조회 (활성 경매일 확정 후 조회)
  const { data: listingsData, isLoading: isListingsLoading, refetch: refetchListings } = useListings({
    status: 'approved,auction,closed,completed' as any,
    listingDateFrom: selectedDateStr,
    listingDateTo: selectedDateStr,
    includeParts: true,
  }, { enabled: activeDateLoaded });
  
  // 실시간 입찰 변경 구독
  const handleBidChange = useCallback((payload?: { partId: string; bidPrice: number; dealerId: string }) => {
    refetchListings();
  }, [refetchListings]);
  
  useRealtimeBids({
    onBidChange: handleBidChange,
    enabled: true,
  });

  const handleFavChange = useCallback(() => {
    const date = useBidStore.getState().favActiveDate;
    if (date) loadFavoritesFromServer(date);
  }, [loadFavoritesFromServer]);

  useRealtimeFavorites({
    onFavChange: handleFavChange,
    enabled: true,
  });

  // 회차별 경매 정보 (폴링 5초, selectedDate 기준)
  const { data: roundData } = useQuery({
    queryKey: ['rounds', 'current', selectedDateStr],
    queryFn: async () => {
      const res = await fetch(`/api/auctions/rounds/current?date=${selectedDateStr}`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 5000,
  });

  // listing -> round_no 매핑
  const roundListingMap: Record<string, number> = roundData?.roundListingMap || {};

  // 경매 카운트다운
  const currentRound = roundData?.currentRound;
  const lastClosedRound = roundData?.lastClosedRound;
  const [auctionRemaining, setAuctionRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!currentRound?.started_at || !currentRound?.round_duration_min) {
      setAuctionRemaining(null);
      return;
    }
    const calc = () => {
      const startedAt = new Date(currentRound.started_at).getTime();
      const durationMs = currentRound.round_duration_min * 60 * 1000;
      const remaining = Math.max(0, Math.floor((startedAt + durationMs - Date.now()) / 1000));
      setAuctionRemaining(remaining);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [currentRound?.started_at, currentRound?.round_duration_min]);

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
      meatColor: listing.meatColor,
      fatColor: listing.fatColor,
      texture: listing.texture,
      maturity: listing.maturity,
      monthAge: listing.monthAge,
      breed: listing.breed,
      slaughterHouse: listing.slaughterHouse,
      slaughterNo: listing.slaughterNo,
      processDate: listing.processDate,
      processWeight: listing.processWeight,
      images: listing.images || [],
      gradeCert: listing.gradeCert,
      slaughterCert: listing.slaughterCert,
      parts: listing.parts || [],
      status: listing.status,
    }));
    
    data.sort((a, b) => sortByListingNo(a.id, b.id));
    
    return data;
  }, [listingsData, roundData?.roundListingMap]);

  const favPartData = useMemo(() => {
    if (!isHydrated || favorites.length === 0) return [];
    const partFavIds = favorites.filter(id => id.split('-').length >= 3);
    if (partFavIds.length === 0) return [];

    const result: any[] = [];
    cattleData.forEach((item: any) => {
      (item.parts || []).forEach((p: any) => {
        const partId = p.listingPartNo || `${item.id}-${String(p.partNo).padStart(2, '0')}`;
        if (partFavIds.includes(partId) && p.isIncluded) {
          result.push({
            id: partId,
            dbPartId: p.id || p.dbId || '',
            partName: p.partName,
            auctionNo: item.id,
            gender: item.gender,
            grade: item.grade,
            marblingScore: item.marblingScore,
            weight: `${(p.weight || 0).toFixed(1)}kg`,
            minPrice: p.minPrice || 0,
            company: item.company,
            myBid: p.myBid || null,
            hasWinner: !!p.hasWinner,
            highestBid: p.highestBid || null,
            listingNo: partId,
            breed: item.breed || item.type || '한우',
            monthAge: item.monthAge || item.months || 0,
            traceNo: item.traceNo || '',
            carcassWeight: item.carcassWeight || 0,
            backFat: item.backFat || 0,
            eyeMuscle: item.eyeMuscle || 0,
            meatColor: item.meatColor || 0,
            fatColor: item.fatColor || 0,
            texture: item.texture || 0,
            maturity: item.maturity || 0,
            slaughterHouse: item.slaughterHouse || '',
            slaughterNo: item.slaughterNo || '',
            processDate: item.processDate || '',
            processWeight: item.processWeight || 0,
            images: item.images || [],
            gradeCert: item.gradeCert || null,
            slaughterCert: item.slaughterCert || null,
          });
        }
      });
    });
    result.sort((a, b) => sortByListingNo(a.id, b.id));
    return result;
  }, [cattleData, favorites, isHydrated]);

  const canBidFavPart = useMemo(() => {
    return !!currentRound && currentRound.status === 'open';
  }, [currentRound]);

  const { data: myBalanceData } = useQuery<{ balances: any[] }>({
    queryKey: ['my-balance', dealerId],
    queryFn: async () => {
      const res = await fetch(`/api/dealer-balances`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!dealerId,
  });

  const myBalance = useMemo(() => {
    if (!myBalanceData?.balances || !dealerId) return null;
    return myBalanceData.balances.find((b: any) => b.id === dealerId) || null;
  }, [myBalanceData, dealerId]);

  const FAV_TOTAL_IMAGES = 6;
  const favNextImage = (productId: string) => {
    const cur = favPartImageIndex[productId] || 0;
    setFavPartImageIndex(prev => ({ ...prev, [productId]: (cur + 1) % FAV_TOTAL_IMAGES }));
  };
  const favPrevImage = (productId: string) => {
    const cur = favPartImageIndex[productId] || 0;
    setFavPartImageIndex(prev => ({ ...prev, [productId]: (cur - 1 + FAV_TOTAL_IMAGES) % FAV_TOTAL_IMAGES }));
  };
  const handleFavTouchStart = (e: React.TouchEvent, productId: string) => {
    favSwipeStartX.current = e.touches[0].clientX;
    favSwipeEndX.current = e.touches[0].clientX;
    favSwipeProductId.current = productId;
  };
  const handleFavTouchMove = (e: React.TouchEvent) => {
    favSwipeEndX.current = e.touches[0].clientX;
  };
  const handleFavTouchEnd = () => {
    if (!favSwipeProductId.current) return;
    const diff = favSwipeStartX.current - favSwipeEndX.current;
    if (Math.abs(diff) > 80) { diff > 0 ? favNextImage(favSwipeProductId.current) : favPrevImage(favSwipeProductId.current); }
    favSwipeStartX.current = 0; favSwipeEndX.current = 0; favSwipeProductId.current = null;
  };
  const handleFavMouseDown = (e: React.MouseEvent, productId: string) => {
    favSwipeIsDragging.current = true;
    favSwipeStartX.current = e.clientX; favSwipeEndX.current = e.clientX; favSwipeProductId.current = productId;
  };
  const handleFavMouseMove = (e: React.MouseEvent) => {
    if (!favSwipeIsDragging.current) return; favSwipeEndX.current = e.clientX;
  };
  const handleFavMouseUp = () => {
    if (!favSwipeIsDragging.current || !favSwipeProductId.current) return;
    const diff = favSwipeStartX.current - favSwipeEndX.current;
    if (Math.abs(diff) > 80) { diff > 0 ? favNextImage(favSwipeProductId.current) : favPrevImage(favSwipeProductId.current); }
    favSwipeIsDragging.current = false; favSwipeStartX.current = 0; favSwipeEndX.current = 0; favSwipeProductId.current = null;
  };
  const handleFavMouseLeave = () => { if (favSwipeIsDragging.current) handleFavMouseUp(); };

  const handleFavPartBid = async (part: any, price: number) => {
    if (!session?.user?.id) { showToastMessage('로그인이 필요합니다.', 'warning'); return; }
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partId: part.dbPartId, listingId: part.dbPartId, bidPrice: price, dealerId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) { showToastMessage(data.error || '입찰에 실패했습니다.', 'warning'); return; }
      showToastMessage(`${part.partName} 입찰이 완료되었습니다.`, 'success');
      refetchListings();
    } catch { showToastMessage('입찰 중 오류가 발생했습니다.', 'warning'); }
  };

  const handleFavPartCancelBid = async (bidId: string, partName: string) => {
    if (!confirm(`${partName} 입찰을 취소하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/bids/${bidId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showToastMessage(data.error || '입찰 취소에 실패했습니다.', 'warning'); return; }
      showToastMessage(`${partName} 입찰이 취소되었습니다.`, 'success');
      refetchListings();
    } catch { showToastMessage('입찰 취소 중 오류가 발생했습니다.', 'warning'); }
  };

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
    
    if (tab === '부위별' || tab === '경매정보' || tab === '관심') {
      setActiveTab(tab);
    } else {
      setActiveTab('개체별');
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
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 등급 옵션 목록
  const gradeOptions = ['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'];
  const companyOptions = Array.from(new Set(cattleData.map(item => item.company)));

  const filterLabel = (selected: string[], label: string) => {
    if (selected.length === 0) return `${label}: 전체`;
    if (selected.length <= 2) return `${label}: ${selected.join(', ')}`;
    return `${label}: ${selected.length}개 선택`;
  };

  const toggleFilter = (selected: string[], value: string, setter: (v: string[]) => void) => {
    setter(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const matchGrade = (grade: string, marblingScore: number, selected: string) => {
    const baseGrade = grade.replace(/[ABC]/, '');
    if (selected === '1++(9)') return baseGrade === '1++' && marblingScore === 9;
    if (selected === '1++(8)') return baseGrade === '1++' && marblingScore === 8;
    if (selected === '1++(7)') return baseGrade === '1++' && marblingScore === 7;
    return baseGrade === selected;
  };

  const filteredCattleData = cattleData.filter(item => {
    const gradeMatch = selectedGrades.length === 0 || selectedGrades.some(g => matchGrade(item.grade, item.marblingScore, g));
    const companyMatch = selectedCompanies.length === 0 || selectedCompanies.includes(item.company);
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
                    <NotificationBell />
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
                <span className={`text-sm font-semibold ${myBalance && myBalance.availableAmount < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {myBalance ? `${myBalance.availableAmount.toLocaleString()}원` : '-'}
                </span>
              </Link>

              {/* 개체별/부위별/경매정보/관심 탭 */}
              <div className="mt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    {(['개체별', '부위별', '경매정보', '관심'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          router.push(`/?tab=${tab}`, { scroll: false });
                        }}
                        className={`text-[15px] font-semibold pb-1.5 transition-colors ${
                          activeTab === tab
                            ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  {!roundData ? (
                    <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5">
                      <div className="w-16 h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ) : currentRound && auctionRemaining !== null && auctionRemaining > 0 ? (
                    <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5">
                      <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">경매 진행중</span>
                      <span className={`text-xs font-bold tabular-nums ${auctionRemaining <= 60 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                        {Math.floor(auctionRemaining / 60)}분 {String(auctionRemaining % 60).padStart(2, '0')}초
                      </span>
                    </div>
                  ) : lastClosedRound ? (
                    <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5">
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        {lastClosedRound.round_no}차 경매 마감
                      </span>
                    </div>
                  ) : null}
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
                {activeTab === '개체별' ? (
                  <div>
                    {/* 등급/업체 필터 */}
                    <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 filter-dropdown transition-colors">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === 'grade' ? null : 'grade')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-medium transition-colors ${
                              selectedGrades.length > 0
                                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {filterLabel(selectedGrades, '등급')}
                            <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'grade' ? 'rotate-180' : ''}`} />
                          </button>
                          {openDropdown === 'grade' && (
                            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[130px]">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedGrades([]); setOpenDropdown(null); }}
                                className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg ${
                                  selectedGrades.length === 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                전체
                                {selectedGrades.length === 0 && <Check className="h-4 w-4" />}
                              </button>
                              {gradeOptions.map((option, idx) => (
                                <button
                                  key={option}
                                  onClick={(e) => { e.stopPropagation(); toggleFilter(selectedGrades, option, setSelectedGrades); }}
                                  className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    idx === gradeOptions.length - 1 ? 'rounded-b-lg' : ''
                                  } ${
                                    selectedGrades.includes(option) ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {option}
                                  {selectedGrades.includes(option) && <Check className="h-4 w-4" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === 'company' ? null : 'company')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-medium transition-colors ${
                              selectedCompanies.length > 0
                                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {filterLabel(selectedCompanies, '업체')}
                            <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'company' ? 'rotate-180' : ''}`} />
                          </button>
                          {openDropdown === 'company' && (
                            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[130px]">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCompanies([]); setOpenDropdown(null); }}
                                className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg ${
                                  selectedCompanies.length === 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                전체
                                {selectedCompanies.length === 0 && <Check className="h-4 w-4" />}
                              </button>
                              {companyOptions.map((option, idx) => (
                                <button
                                  key={option}
                                  onClick={(e) => { e.stopPropagation(); toggleFilter(selectedCompanies, option, setSelectedCompanies); }}
                                  className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap ${
                                    idx === companyOptions.length - 1 ? 'rounded-b-lg' : ''
                                  } ${
                                    selectedCompanies.includes(option) ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {option}
                                  {selectedCompanies.includes(option) && <Check className="h-4 w-4" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="ml-auto text-[13px] text-gray-400 dark:text-gray-500">
                          {filteredCattleData.length}개
                        </span>
                      </div>
                    </div>

                    {/* 개체별 테이블 */}
                    {filteredCattleData.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-gray-400 dark:text-gray-500 mb-2">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {cattleData.length === 0 ? '상장된 개체가 없습니다.' : '필터 조건에 맞는 개체가 없습니다.'}
                        </p>
                      </div>
                    ) : (
                    <div className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-700 transition-colors">
                      <table className="w-full text-[13px] table-fixed">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[30%]">접수번호</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">성별</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">등급</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">개월령</th>
                              <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">상장업체</th>
                              <th className="py-2.5 px-1.5 pr-3 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[52px]">관심</th>
                          </tr>
                        </thead>
                        <tbody>
                            {filteredCattleData.map((item, index) => (
                            <tr 
                              key={item.id}
                              onClick={() => router.push(`/auction/${item.id}`)}
                              className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors ${(item as any).status === 'completed' ? 'opacity-60' : ''} ${index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}
                            >
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
                ) : activeTab === '부위별' ? (
                  <div className="pt-3 px-4">
                    {(() => {
                      const partsCategories = [
                        { id: 'sirloin', name: '등심', image: '/등심1.png' },
                        { id: 'tenderloin', name: '안심', image: '/등심2.png' },
                        { id: 'striploin', name: '채끝', image: '/등심3.png' },
                        { id: 'chima', name: '치마', image: '/등심4.png' },
                        { id: 'buchae', name: '부채', image: '/등심1.png' },
                        { id: 'upjin', name: '업진', image: '/등심2.png' },
                        { id: 'tosi', name: '토시·제비', image: '/등심3.png' },
                        { id: 'foreleg', name: '앞다리', image: '/등심2.png' },
                        { id: 'rump', name: '우둔', image: '/등심3.png' },
                        { id: 'chuck', name: '목심', image: '/등심4.png' },
                        { id: 'brisket', name: '양지', image: '/등심1.png' },
                        { id: 'round', name: '설도', image: '/등심2.png' },
                        { id: 'shank', name: '사태', image: '/등심3.png' },
                        { id: 'tail', name: '꼬리', image: '/등심4.png' },
                        { id: 'feet', name: '족', image: '/등심1.png' },
                        { id: 'bone', name: '사골', image: '/등심2.png' },
                        { id: 'misc', name: '잡뼈', image: '/등심3.png' },
                      ];

                      const partSubParts: Record<string, string[]> = {
                        sirloin: ['등심(좌)', '등심(우)'],
                        tenderloin: ['안심'],
                        striploin: ['채끝'],
                        chima: ['치마'],
                        buchae: ['부채'],
                        upjin: ['업진'],
                        tosi: ['토시·제비'],
                        foreleg: ['앞다리'],
                        rump: ['우둔'],
                        chuck: ['목심'],
                        brisket: ['양지(좌)', '양지(우)'],
                        round: ['설도(좌)', '설도(우)'],
                        shank: ['사태'],
                        tail: ['꼬리'],
                        feet: ['족'],
                        bone: ['사골'],
                        misc: ['잡뼈'],
                      };

                      const getPartCount = (partId: string) => {
                        const subParts = partSubParts[partId] || [];
                        let count = 0;
                        cattleData.forEach((item: any) => {
                          item.parts?.forEach((p: any) => {
                            if (subParts.includes(p.partName) && p.isIncluded) count++;
                          });
                        });
                        return count;
                      };

                      return (
                        <div className="grid grid-cols-2 gap-3">
                          {partsCategories.map((part) => {
                            const count = getPartCount(part.id);
                            return (
                              <button
                                key={part.id}
                                onClick={() => router.push(`/auction?tab=part&part=${part.id}`)}
                                className="relative rounded overflow-hidden hover:shadow-md transition-shadow"
                              >
                                <div className="aspect-[16/9] bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                  <img src={part.image} alt={part.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 flex items-end justify-between">
                                  <p className="text-[14px] font-bold text-white drop-shadow-sm">{part.name}</p>
                                  <p className="text-[13px] font-medium text-white/90 drop-shadow-sm">{count}건</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : activeTab === '관심' ? (
                  <div>
                    {/* 개체별/부위별 서브탭 */}
                    <div className="px-4 pt-3 pb-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex gap-2">
                        {(['개체별', '부위별'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setFavSubTab(tab)}
                            className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
                              favSubTab === tab
                                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {favSubTab === '개체별' ? (
                      (() => {
                        const entityFavList = cattleData.filter(item => isHydrated && isFavorite(item.id));
                        return entityFavList.length === 0 ? (
                          <div className="text-center py-12">
                            <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">관심 등록된 개체가 없습니다.</p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">개체별 탭에서 별 아이콘을 눌러 추가해보세요.</p>
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors">
                            <table className="w-full text-[13px] table-fixed">
                              <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[30%]">접수번호</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">성별</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">등급</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">개월령</th>
                                  <th className="py-2.5 px-1.5 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">상장업체</th>
                                  <th className="py-2.5 px-1.5 pr-3 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-[52px]">관심</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entityFavList.map((item, index) => (
                                  <tr
                                    key={item.id}
                                    onClick={() => router.push(`/auction/${item.id}`)}
                                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors ${(item as any).status === 'completed' ? 'opacity-60' : ''} ${index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}
                                  >
                                    <td className="py-3 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{item.id}</td>
                                    <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.gender}</td>
                                    <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatGrade(item.grade, item.marblingScore)}</td>
                                    <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.months}</td>
                                    <td className="py-3 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.company}</td>
                                    <td className="py-3 px-1.5 pr-3 text-center">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
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
                    ) : (
                      (() => {
                        const activeFavParts = favPartData.filter((p: any) => !p.hasWinner);
                        const settledFavParts = favPartData.filter((p: any) => p.hasWinner);

                        return favPartData.length === 0 ? (
                          <div className="text-center py-12">
                            <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">관심 등록된 부위가 없습니다.</p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">부위별 탭에서 별 아이콘을 눌러 추가해보세요.</p>
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-gray-900 transition-colors">
                            {/* 진행중 헤더 */}
                            <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-9 flex items-center sticky top-0 z-10 transition-colors">
                              <div className="grid px-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 w-full" style={{gridTemplateColumns: '0.6fr 1.1fr 0.6fr 0.85fr 1.1fr 0.5fr 0.5fr 0.35fr'}}>
                                <div className="text-center">업체</div>
                                <div className="text-center">부위</div>
                                <div className="text-center">중량</div>
                                <div className="text-center">최저단가</div>
                                <div className="text-center">나의입찰가</div>
                                <div className="text-center">변경</div>
                                <div className="text-center">취소</div>
                                <div className="text-center">관심</div>
                              </div>
                            </div>
                            {/* 진행중 행 */}
                            {activeFavParts.length === 0 && settledFavParts.length > 0 ? (
                              <div className="text-center py-8">
                                <p className="text-sm text-gray-500 dark:text-gray-400">모든 부위의 낙찰이 결정되었습니다.</p>
                              </div>
                            ) : activeFavParts.map((part: any) => {
                              const hasBid = !!part.myBid?.bidPrice;
                              const isExpanded = expandedFavPartId === part.id;
                              return (
                                <div key={part.id} id={`fav-part-row-${part.id}`} className={isExpanded ? 'border-2 border-red-500 dark:border-red-400' : ''}>
                                  <div
                                    onClick={() => setExpandedFavPartId(isExpanded ? null : part.id)}
                                    className={`grid px-2 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors items-center ${
                                      hasBid ? 'bg-blue-50/50 dark:bg-blue-900/30' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                    style={{gridTemplateColumns: '0.6fr 1.1fr 0.6fr 0.85fr 1.1fr 0.5fr 0.5fr 0.35fr'}}
                                  >
                                    <div className="text-center text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-center whitespace-nowrap">
                                      {part.company}
                                    </div>
                                    <div className="text-center">
                                      <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{part.partName}</div>
                                      <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{part.gender} / {formatGrade(part.grade, part.marblingScore)}</div>
                                    </div>
                                    <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">{part.weight}</div>
                                    <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">{part.minPrice.toLocaleString()}</div>
                                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                      {hasBid ? (
                                        <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{part.myBid!.bidPrice.toLocaleString()}</span>
                                      ) : (
                                        <button
                                          disabled={!canBidFavPart}
                                          onClick={() => { if (!canBidFavPart) { showToastMessage('경매 진행중이 아닙니다.', 'warning'); return; } setSelectedFavPart(part); setFavPartBidPrice(0); setShowFavPartBidSheet(true); }}
                                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${canBidFavPart ? 'text-white bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600' : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed'}`}
                                        >
                                          입찰하기
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-center">
                                      {hasBid ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); if (!canBidFavPart) { showToastMessage('경매 진행중이 아닙니다.', 'warning'); return; } setSelectedFavPart(part); setFavPartBidPrice(part.myBid?.bidPrice || 0); setShowFavPartBidSheet(true); }}
                                          className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${canBidFavPart ? 'text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'}`}
                                        >변경</button>
                                      ) : (<span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>)}
                                    </div>
                                    <div className="flex items-center justify-center">
                                      {hasBid && part.myBid?.bidId ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); if (!canBidFavPart) { showToastMessage('경매 진행중이 아닙니다.', 'warning'); return; } handleFavPartCancelBid(part.myBid!.bidId, part.partName); }}
                                          className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${canBidFavPart ? 'text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'}`}
                                        >취소</button>
                                      ) : (<span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>)}
                                    </div>
                                    <div className="text-center flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => toggleFavorite(part.id)} className="p-1.5 text-gray-900 dark:text-gray-100 transition-colors">
                                        <Star className="w-5 h-5 fill-current" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* 펼쳐지는 개체 정보 */}
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden border-b border-gray-200 dark:border-gray-700"
                                      >
                                        {/* 메인 이미지 */}
                                        <div
                                          className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
                                          onTouchStart={(e) => handleFavTouchStart(e, part.id)}
                                          onTouchMove={handleFavTouchMove}
                                          onTouchEnd={handleFavTouchEnd}
                                          onMouseDown={(e) => handleFavMouseDown(e, part.id)}
                                          onMouseMove={handleFavMouseMove}
                                          onMouseUp={handleFavMouseUp}
                                          onMouseLeave={handleFavMouseLeave}
                                        >
                                          <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800">
                                            {(() => {
                                              const imgIndex = favPartImageIndex[part.id] || 0;
                                              const dbImages = part.images || [];
                                              const imageCount = Math.max(dbImages.length, 4);
                                              const hasGradeCert = !!part.gradeCert?.fileData;
                                              const hasSlaughterCert = !!part.slaughterCert?.fileData;
                                              if (hasGradeCert && imgIndex === imageCount) {
                                                return (<div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 p-4"><img src={part.gradeCert.fileData} alt="등급판정확인서" className="max-w-full max-h-full object-contain shadow-lg" /></div>);
                                              }
                                              const slaughterIdx = imageCount + (hasGradeCert ? 1 : 0);
                                              if (hasSlaughterCert && imgIndex === slaughterIdx) {
                                                return (<div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 p-4"><img src={part.slaughterCert.fileData} alt="도축검사증명서" className="max-w-full max-h-full object-contain shadow-lg" /></div>);
                                              }
                                              const imageSrc = dbImages[imgIndex] || `/등심${(imgIndex % 4) + 1}.png`;
                                              return (<img src={imageSrc} alt="개체 이미지" className="w-full h-full object-cover select-none pointer-events-none" draggable="false" />);
                                            })()}
                                          </div>
                                          {(() => {
                                            const dbImages = part.images || [];
                                            const imageCount = Math.max(dbImages.length, 4);
                                            const hasGradeCert = !!part.gradeCert?.fileData;
                                            const hasSlaughterCert = !!part.slaughterCert?.fileData;
                                            const totalCount = imageCount + (hasGradeCert ? 1 : 0) + (hasSlaughterCert ? 1 : 0);
                                            return (
                                              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                                {Array.from({ length: totalCount }).map((_, index) => (
                                                  <button key={index} onClick={(e) => { e.stopPropagation(); setFavPartImageIndex(prev => ({ ...prev, [part.id]: index })); }}
                                                    className={`w-2 h-2 rounded-full transition-colors ${(favPartImageIndex[part.id] || 0) === index ? 'bg-white' : 'bg-white/50'}`} />
                                                ))}
                                              </div>
                                            );
                                          })()}
                                        </div>

                                        {/* 썸네일 */}
                                        <div className="px-3 py-2">
                                          <div className="flex gap-1.5 justify-start overflow-x-auto">
                                            {(() => {
                                              const dbImages = part.images || [];
                                              const imageCount = Math.max(dbImages.length, 4);
                                              return Array.from({ length: imageCount }).map((_, index) => (
                                                <button key={index} onClick={(e) => { e.stopPropagation(); setFavPartImageIndex(prev => ({ ...prev, [part.id]: index })); }}
                                                  className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${(favPartImageIndex[part.id] || 0) === index ? 'border-2 border-gray-400 dark:border-gray-500' : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                                  <img src={dbImages[index] || `/등심${(index % 4) + 1}.png`} alt={`이미지 ${index + 1}`} className="w-full h-full object-cover" />
                                                </button>
                                              ));
                                            })()}
                                            {part.gradeCert?.fileData && (() => {
                                              const certIdx = Math.max((part.images || []).length, 4);
                                              return (<button onClick={(e) => { e.stopPropagation(); setFavPartImageIndex(prev => ({ ...prev, [part.id]: certIdx })); }}
                                                className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${(favPartImageIndex[part.id] || 0) === certIdx ? 'border-2 border-gray-400' : 'border-2 border-transparent hover:border-gray-300'}`}>
                                                <img src={part.gradeCert.fileData} alt="등급판정확인서" className="w-full h-full object-cover" /></button>);
                                            })()}
                                            {part.slaughterCert?.fileData && (() => {
                                              const hasGC = !!part.gradeCert?.fileData;
                                              const certIdx = Math.max((part.images || []).length, 4) + (hasGC ? 1 : 0);
                                              return (<button onClick={(e) => { e.stopPropagation(); setFavPartImageIndex(prev => ({ ...prev, [part.id]: certIdx })); }}
                                                className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${(favPartImageIndex[part.id] || 0) === certIdx ? 'border-2 border-gray-400' : 'border-2 border-transparent hover:border-gray-300'}`}>
                                                <img src={part.slaughterCert.fileData} alt="도축검사증명서" className="w-full h-full object-cover" /></button>);
                                            })()}
                                          </div>
                                        </div>

                                        {/* 개체정보 */}
                                        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
                                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden mb-2">
                                            <table className="w-full text-[13px]">
                                              <thead><tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">축종</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">성별</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">등급</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">개월령</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">이력번호</th>
                                              </tr></thead>
                                              <tbody><tr>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.breed || '한우'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.gender}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{formatGrade(part.grade, part.marblingScore)}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.monthAge || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium text-[11px]">{part.traceNo || '-'}</td>
                                              </tr></tbody>
                                            </table>
                                          </div>
                                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden mb-2">
                                            <table className="w-full text-[13px]">
                                              <thead><tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">등지방</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">등심면적</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">근내지방</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">육색</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">지방색</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">조직감</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">성숙도</th>
                                              </tr></thead>
                                              <tbody><tr>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.backFat || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.eyeMuscle || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.marblingScore || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.meatColor || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.fatColor || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.texture || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.maturity || '-'}</td>
                                              </tr></tbody>
                                            </table>
                                          </div>
                                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                                            <table className="w-full text-[13px]">
                                              <thead><tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">도축장</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">도축번호</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">도체중</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">상장업체</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">가공일</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">가공중량</th>
                                              </tr></thead>
                                              <tbody><tr>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.slaughterHouse || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.slaughterNo || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.carcassWeight || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.company || '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.processDate ? part.processDate.replace(/-/g, '.').slice(2) : '-'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{part.processWeight || '-'}</td>
                                              </tr></tbody>
                                            </table>
                                          </div>
                                        </div>

                                        {/* 하단 버튼 */}
                                        <div className="px-3 py-3 border-t border-gray-200 bg-white flex items-center gap-2">
                                          <a href="https://aunit.mtrace.go.kr/mtracesearch/cattleNoSearch.do?btsProgNo=0109008401&btsActionMethod=SELECT" target="_blank" rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            축산물 이력정보 <ExternalLink className="w-3 h-3" />
                                          </a>
                                          <div className="flex-1" />
                                          <button disabled={!canBidFavPart}
                                            onClick={(e) => { e.stopPropagation(); setSelectedFavPart(part); setFavPartBidPrice(part.minPrice); setShowFavPartBidSheet(true); }}
                                            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${canBidFavPart ? 'bg-gray-800 text-white hover:bg-gray-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                            입찰하기
                                          </button>
                                          <button onClick={(e) => { e.stopPropagation(); setExpandedFavPartId(null); const el = document.getElementById(`fav-part-row-${part.id}`); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }}
                                            className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                                            개체정보 닫기
                                          </button>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}

                            {/* 경매 결과 섹션 */}
                            {settledFavParts.length > 0 && (
                              <div className="mt-4">
                                <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                  <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                                    경매 결과 ({settledFavParts.length}건)
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={() => router.push('/bids?tab=경매결과')}
                                    className="text-[11px] text-gray-900 dark:text-gray-100 hover:text-gray-600 font-medium"
                                  >
                                    전체 보기 &gt;
                                  </button>
                                </div>
                                <div
                                  className="grid px-2 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-[11px] font-medium text-gray-500 dark:text-gray-400"
                                  style={{gridTemplateColumns: '0.6fr 1fr 0.6fr 0.9fr 0.9fr 0.9fr 0.6fr 0.35fr'}}
                                >
                                  <div className="text-center">업체</div>
                                  <div className="text-center">부위</div>
                                  <div className="text-center">중량</div>
                                  <div className="text-center">최저단가</div>
                                  <div className="text-center">낙찰가</div>
                                  <div className="text-center">나의입찰가</div>
                                  <div className="text-center">결과</div>
                                  <div className="text-center">관심</div>
                                </div>
                                {settledFavParts.map((part: any) => {
                                  const isMyWin = !!part.myBid?.isWinning;
                                  return (
                                    <div
                                      key={`settled-${part.id}`}
                                      className={`grid px-2 py-3 border-b border-gray-100 dark:border-gray-800 items-center ${
                                        isMyWin ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'
                                      }`}
                                      style={{gridTemplateColumns: '0.6fr 1fr 0.6fr 0.9fr 0.9fr 0.9fr 0.6fr 0.35fr'}}
                                    >
                                      <div className="text-center text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-center whitespace-nowrap">
                                        {part.company}
                                      </div>
                                      <div className="text-center">
                                        <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{part.partName}</div>
                                        <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{part.gender} / {formatGrade(part.grade, part.marblingScore)}</div>
                                      </div>
                                      <div className="text-center text-[13px] text-gray-700 dark:text-gray-300">{part.weight}</div>
                                      <div className="text-center text-[13px] text-gray-700 dark:text-gray-300">{part.minPrice.toLocaleString()}</div>
                                      <div className="text-center text-[13px] font-medium text-gray-900 dark:text-gray-100">
                                        {part.highestBid?.bidPrice ? part.highestBid.bidPrice.toLocaleString() : '-'}
                                      </div>
                                      <div className="text-center text-[13px] text-gray-700 dark:text-gray-300">
                                        {part.myBid?.bidPrice ? part.myBid.bidPrice.toLocaleString() : '-'}
                                      </div>
                                      <div className="text-center flex items-center justify-center">
                                        {isMyWin ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">낙찰</span>
                                        ) : part.myBid?.bidPrice ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">미낙찰</span>
                                        ) : (
                                          <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                                        )}
                                      </div>
                                      <div className="text-center flex items-center justify-center">
                                        <button
                                          onClick={() => toggleFavorite(part.id)}
                                          className={`p-1.5 transition-colors ${isFavorite(part.id) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                        >
                                          <Star className={`w-5 h-5 ${isFavorite(part.id) ? 'fill-current' : ''}`} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
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
                          {[1, 10, 100, 1000].map((amount) => (
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

            {/* 관심 부위별 입찰 바텀시트 */}
            <AnimatePresence>
              {showFavPartBidSheet && selectedFavPart && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setShowFavPartBidSheet(false)}
                    className="absolute inset-0 bg-black/50 z-40"
                  />
                  <motion.div
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-[100] transition-colors"
                  >
                    <div className="flex justify-center pt-3 pb-2">
                      <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                    </div>

                    <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">입찰하기</h3>
                        <button
                          onClick={() => setShowFavPartBidSheet(false)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden overflow-x-auto">
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
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{selectedFavPart.auctionNo}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">한우</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedFavPart.gender}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{formatGrade(selectedFavPart.grade, selectedFavPart.marblingScore)}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedFavPart.monthAge || '-'}</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedFavPart.partName}</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedFavPart.weight}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">입찰가격 (원/kg)</div>
                        <div className="relative mb-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={favPartBidPrice > 0 ? favPartBidPrice.toLocaleString('ko-KR') : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                              setFavPartBidPrice(value ? parseInt(value) : 0);
                            }}
                            className="w-full px-4 py-3.5 pr-12 text-right text-xl font-bold border border-gray-200 dark:border-gray-700 rounded focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder={`최저단가 ${(selectedFavPart.minPrice || 0).toLocaleString()}`}
                          />
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">원</div>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 10, 100, 1000].map((amount) => (
                            <button
                              key={amount}
                              onClick={() => {
                                setFavPartBidPrice(prev => {
                                  if (prev === 0 && selectedFavPart) {
                                    return (selectedFavPart.minPrice || 0) + amount;
                                  }
                                  return prev + amount;
                                });
                              }}
                              className="py-2 text-xs border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-gray-700 dark:text-gray-300 transition-colors"
                            >
                              +{amount.toLocaleString()}
                            </button>
                          ))}
                          <button
                            onClick={() => setFavPartBidPrice(0)}
                            className="py-2 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium transition-colors"
                          >
                            초기화
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">총 입찰금액</span>
                          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {favPartBidPrice > 0 && selectedFavPart.weight
                              ? `${Math.round(favPartBidPrice * parseFloat(selectedFavPart.weight)).toLocaleString()}원`
                              : '-'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (favPartBidPrice < (selectedFavPart.minPrice || 0)) {
                            alert(`최저단가(${(selectedFavPart.minPrice || 0).toLocaleString()}원) 이상으로 입찰해주세요.`);
                            return;
                          }
                          handleFavPartBid(selectedFavPart, favPartBidPrice);
                          setShowFavPartBidSheet(false);
                        }}
                        disabled={favPartBidPrice === 0}
                        className="w-full py-3.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-base rounded transition-colors"
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