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
  Bell,
  Star,
  ExternalLink
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useBidStore } from '@/stores/bidStore';
import { GRADES, getCompanyAuctionSummary, calcTotal, getTodayDateCode } from '@/constants/auction';
import { useListings } from '@/features/listings/hooks';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';

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
  const [toastType, setToastType] = useState<'warning' | 'success'>('success');
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const gradeDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('전체');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const [favoriteSubTab, setFavoriteSubTab] = useState<'개체별' | '부위별'>('개체별');
  
  // 부위별 관심 목록용 상태
  const [expandedFavoritePartId, setExpandedFavoritePartId] = useState<string | null>(null);
  const [favoritePartImageIndex, setFavoritePartImageIndex] = useState<Record<string, number>>({});
  const [showFavoritePartBidSheet, setShowFavoritePartBidSheet] = useState(false);
  const [selectedFavoritePart, setSelectedFavoritePart] = useState<any>(null);
  const [favoritePartBidPrice, setFavoritePartBidPrice] = useState(0);
  const [showFavoritePartBidConfirm, setShowFavoritePartBidConfirm] = useState(false);
  
  // 이미지 스와이프 상태
  const [favPartTouchStart, setFavPartTouchStart] = useState<number | null>(null);
  const [favPartTouchEnd, setFavPartTouchEnd] = useState<number | null>(null);
  const [favPartCurrentProductId, setFavPartCurrentProductId] = useState<string | null>(null);

  // 선택된 날짜 포맷 (API 호출용)
  const selectedDateStr = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  // 승인된 상장 목록 조회 (DB 연동)
  const { data: listingsData, isLoading: isListingsLoading, refetch: refetchListings } = useListings({
    status: 'approved',
    listingDateFrom: selectedDateStr,
    listingDateTo: selectedDateStr,
    includeParts: true,
  });
  
  // 부위별 관심 입찰 로딩 상태
  const [isFavoritePartBidding, setIsFavoritePartBidding] = useState(false);

  // API 데이터를 기존 cattleData 형식으로 변환
  const cattleData = useMemo(() => {
    if (!listingsData || listingsData.length === 0) return [];
    
    return listingsData.map(listing => ({
      id: listing.listingNo,
      type: listing.breed,
      gender: listing.gender,
      grade: listing.grade,
      months: listing.monthAge || 0,
      company: listing.companyName || '',
      // 추가 정보 (상세 페이지 등에서 사용)
      listingId: listing.id,
      traceNo: listing.traceNo,
      carcassWeight: listing.carcassWeight,
      backFat: listing.backFat,
      eyeMuscle: listing.eyeMuscle,
      marblingScore: listing.marblingScore,
      parts: listing.parts || [],
    }));
  }, [listingsData]);

  // 부위별 관심 목록용 데이터 생성
  const partSubParts: Record<string, string[]> = {
    sirloin: ['등심(좌)', '등심(우)'],
    tenderloin: ['안심'],
    striploin: ['채끝'],
    ribs: ['갈비(좌)', '갈비(우)'],
    special: ['특수부위'],
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

  const partMinPrices: Record<string, number> = {
    '등심(좌)': 85000, '등심(우)': 85000,
    '안심': 95000, '채끝': 82000,
    '갈비(좌)': 78000, '갈비(우)': 78000,
    '특수부위': 72000, '앞다리': 55000,
    '우둔': 58000, '목심': 62000,
    '양지(좌)': 52000, '양지(우)': 52000,
    '설도(좌)': 56000, '설도(우)': 56000,
    '사태': 48000, '꼬리': 35000,
    '족': 25000, '사골': 20000, '잡뼈': 15000,
  };

  const partWeightRanges: Record<string, [number, number]> = {
    '등심(좌)': [15, 16], '등심(우)': [15, 16],
    '안심': [4, 5], '채끝': [7.5, 8.5],
    '갈비(좌)': [12, 13], '갈비(우)': [12, 13],
    '특수부위': [3, 4], '앞다리': [24, 26],
    '우둔': [20, 22], '목심': [14, 15],
    '양지(좌)': [12, 13], '양지(우)': [12, 13],
    '설도(좌)': [16, 17.5], '설도(우)': [16, 17.5],
    '사태': [14.5, 15.5], '꼬리': [15.5, 16.5],
    '족': [10, 11], '사골': [3, 4], '잡뼈': [21, 23],
  };

  // 부위 슬러그 매핑
  const partSlugMap: Record<string, string> = {
    '등심(좌)': 'sirloin', '등심(우)': 'sirloin',
    '안심': 'tenderloin', '채끝': 'striploin',
    '갈비(좌)': 'ribs', '갈비(우)': 'ribs',
    '특수부위': 'special', '앞다리': 'foreleg',
    '우둔': 'rump', '목심': 'chuck',
    '양지(좌)': 'brisket', '양지(우)': 'brisket',
    '설도(좌)': 'round', '설도(우)': 'round',
    '사태': 'shank', '꼬리': 'tail',
    '족': 'feet', '사골': 'bone', '잡뼈': 'misc',
  };

  // 모든 부위 상품 데이터 생성 (DB 기반)
  const allPartProducts = React.useMemo(() => {
    const products: any[] = [];
    
    // 각 개체에 대해 DB에서 가져온 부위 데이터 사용
    cattleData.forEach((entity: any) => {
      const entityNo = parseInt(entity.id.split('-')[1]);
      const entityParts = entity.parts || [];
      
      // DB에서 가져온 부위 정보 사용
      if (entityParts.length > 0) {
        entityParts.forEach((part: any) => {
          if (!part.isIncluded) return; // 포함되지 않은 부위는 제외
          
          const partId = partSlugMap[part.partName] || 'misc';
          const listingNo = part.listingPartNo || `${entity.id}-${String(part.partNo).padStart(2, '0')}`;
          
          products.push({
            id: `${partId}-${entityNo}-${part.partName}`,
            partId,
            partName: part.partName,
            image: `/등심${((entityNo % 4) + 1)}.png`,
            type: entity.gender === '거세' ? '한우거세' : '한우암',
            grade: entity.grade,
            weight: `${part.weight || 0}kg`,
            price: part.minPrice || 0,
            auctionNo: entity.id,
            listingNo,
            historyNo: entity.traceNo || '',
            company: entity.company,
            months: entity.months,
            entityId: entityNo,
            partDbId: part.id, // DB 파트 ID (입찰 시 사용)
            dbHighestBid: part.highestBid?.bidPrice || null,
            dbBidCount: part.bidCount || 0,
          });
        });
      } else {
        // DB에 부위 정보가 없으면 기존 하드코딩 로직 사용 (폴백)
        Object.entries(partSubParts).forEach(([partId, subParts]) => {
          subParts.forEach((subPart) => {
            const [minW, maxW] = partWeightRanges[subPart] || [10, 15];
            const variation = (entityNo * 0.17) % 1;
            const weight = (minW + (maxW - minW) * variation).toFixed(1);
            
            const allSubPartsOrder = [
              '등심(좌)', '등심(우)', '안심', '채끝', '갈비(좌)', '갈비(우)', 
              '특수부위', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)', 
              '설도(좌)', '설도(우)', '사태', '꼬리', '족', '사골', '잡뼈'
            ];
            const partIndex = allSubPartsOrder.indexOf(subPart);
            const listingNumber = partIndex + 1;
            
            const basePrice = partMinPrices[subPart] || 50000;
            let gradeMultiplier = 1.0;
            
            if (entity.grade.includes('1++')) {
              const marblingMatch = entity.grade.match(/\((\d+)\)/);
              const marblingNo = marblingMatch ? parseInt(marblingMatch[1]) : 8;
              if (marblingNo === 9) gradeMultiplier = 1.20;
              else if (marblingNo === 8) gradeMultiplier = 1.15;
              else gradeMultiplier = 1.10;
            } else if (entity.grade.includes('1+')) {
              gradeMultiplier = 1.05;
            } else if (entity.grade.startsWith('1')) {
              gradeMultiplier = 1.00;
            } else if (entity.grade.startsWith('2')) {
              gradeMultiplier = 0.90;
            } else {
              gradeMultiplier = 0.80;
            }
            
            const adjustedPrice = Math.round((basePrice * gradeMultiplier) / 1000) * 1000;
            const listingNo = `${entity.id}-${String(listingNumber).padStart(2, '0')}`;
            
            products.push({
              id: `${partId}-${entityNo}-${subPart}`,
              partId,
              partName: subPart,
              image: `/등심${((entityNo % 4) + 1)}.png`,
              type: entity.gender === '거세' ? '한우거세' : '한우암',
              grade: entity.grade,
              weight: `${weight}kg`,
              price: adjustedPrice,
              auctionNo: entity.id,
              listingNo,
              historyNo: entity.traceNo || '',
              company: entity.company,
              months: entity.months,
              entityId: entityNo,
              partDbId: null, // 폴백 데이터는 DB ID 없음
              dbHighestBid: null,
              dbBidCount: 0,
            });
          });
        });
      }
    });
    
    return products;
  }, [cattleData]);

  // 관심 부위 목록에서 상품 정보 가져오기
  const favoritePartProducts = React.useMemo(() => {
    const partFavorites = favorites.filter(id => id.split('-').length === 3);
    return partFavorites.map(listingNo => {
      const product = allPartProducts.find(p => p.listingNo === listingNo);
      return product;
    }).filter(Boolean);
  }, [favorites, allPartProducts]);

  // 부위별 이미지 스와이프 핸들러
  const TOTAL_FAV_PART_IMAGES = 6;
  
  const handleFavPartTouchStart = (e: React.TouchEvent, productId: string) => {
    setFavPartTouchEnd(null);
    setFavPartTouchStart(e.targetTouches[0].clientX);
    setFavPartCurrentProductId(productId);
  };

  const handleFavPartTouchMove = (e: React.TouchEvent) => {
    setFavPartTouchEnd(e.targetTouches[0].clientX);
  };

  const handleFavPartTouchEnd = () => {
    if (!favPartTouchStart || !favPartTouchEnd || !favPartCurrentProductId) return;
    const distance = favPartTouchStart - favPartTouchEnd;
    const isSwipe = Math.abs(distance) > 50;
    
    if (isSwipe) {
      const currentIndex = favoritePartImageIndex[favPartCurrentProductId] || 0;
      if (distance > 0) {
        setFavoritePartImageIndex(prev => ({ 
          ...prev, 
          [favPartCurrentProductId!]: (currentIndex + 1) % TOTAL_FAV_PART_IMAGES 
        }));
      } else {
        setFavoritePartImageIndex(prev => ({ 
          ...prev, 
          [favPartCurrentProductId!]: (currentIndex - 1 + TOTAL_FAV_PART_IMAGES) % TOTAL_FAV_PART_IMAGES 
        }));
      }
    }
    
    setFavPartTouchStart(null);
    setFavPartTouchEnd(null);
    setFavPartCurrentProductId(null);
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
    
    if (tab === '부위별') {
      setActiveTab('부위별');
    } else if (tab === '경매정보') {
      setActiveTab('경매정보');
    } else if (tab === '관심') {
      setActiveTab('관심');
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
    const gradeWithoutYukryang = item.grade.replace(/[ABC]/, ''); // 육량 지수 제거
    const gradeMatch = selectedGrade === '전체' || gradeWithoutYukryang === selectedGrade;
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

              {/* 개체별/부위별/경매정보/관심 탭 */}
              <div className="mt-4 px-4">
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => {
                      setActiveTab('개체별');
                      router.push('/?tab=개체별', { scroll: false });
                    }}
                    className={`text-[15px] font-semibold pb-1.5 transition-colors ${
                      activeTab === '개체별'
                        ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    개체별
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('부위별');
                      router.push('/?tab=부위별', { scroll: false });
                    }}
                    className={`text-[15px] font-semibold pb-1.5 transition-colors ${
                      activeTab === '부위별'
                        ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    부위별
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
                {activeTab === '개체별' ? (
                  <div className="pt-3">
                    {/* 필터 영역 */}
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* 등급 필터 */}
                        <div className="relative" ref={gradeDropdownRef}>
                          <button
                            onClick={() => {
                              setShowGradeDropdown(!showGradeDropdown);
                              setShowCompanyDropdown(false);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 dark:bg-gray-800 rounded text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            등급: {selectedGrade}
                            <ChevronDown className={`h-4 w-4 transition-transform ${showGradeDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {/* 등급 드롭다운 메뉴 */}
                          {showGradeDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[110px]">
                              {gradeOptions.map((grade) => (
                                <button
                                  key={grade}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGrade(grade);
                                    setShowGradeDropdown(false);
                                  }}
                                  className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                                    selectedGrade === grade
                                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {grade}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* 상장업체 필터 */}
                        <div className="relative" ref={companyDropdownRef}>
                          <button
                            onClick={() => {
                              setShowCompanyDropdown(!showCompanyDropdown);
                              setShowGradeDropdown(false);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 dark:bg-gray-800 rounded text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            업체: {selectedCompany}
                            <ChevronDown className={`h-4 w-4 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {/* 상장업체 드롭다운 메뉴 */}
                          {showCompanyDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[110px]">
                              {companyOptions.map((company) => (
                                <button
                                  key={company}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCompany(company);
                                    setShowCompanyDropdown(false);
                                  }}
                                  className={`block w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg whitespace-nowrap ${
                                    selectedCompany === company
                                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {company}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* 필터 결과 카운트 */}
                        <span className="ml-auto text-[13px] text-gray-400 dark:text-gray-500">
                          {filteredCattleData.length}두
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
                        <p className="text-gray-500 dark:text-gray-400 text-sm">해당 조건의 개체가 없습니다.</p>
                        <button
                          onClick={() => {
                            setSelectedGrade('전체');
                            setSelectedCompany('전체');
                          }}
                          className="mt-3 text-xs text-gray-600 dark:text-gray-400 underline hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          전체 보기
                        </button>
                      </div>
                    ) : (
                    <div className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-700 transition-colors">
                      <table className="w-full text-[13px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <th className="py-2.5 pl-4 pr-8 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">접수번호</th>
                              <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">성별</th>
                              <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">등급</th>
                              <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">개월령</th>
                              <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">상장업체</th>
                              <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">관심</th>
                          </tr>
                        </thead>
                        <tbody>
                            {filteredCattleData.map((item, index) => (
                            <tr 
                              key={item.id}
                              onClick={() => router.push(`/auction/${item.id}`)}
                              className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors ${index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}
                            >
                                <td className="py-3 pl-4 pr-8 text-center font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{item.id}</td>
                                <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.gender}</td>
                                <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.grade}</td>
                                <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.months}</td>
                                <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.company}</td>
                                <td className="py-3 px-2 text-center">
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
                  <div className="px-4 pt-4">
                    {/* 부위별 카드 그리드 */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: '등심', slug: 'sirloin', count: cattleData.length * 2, image: '/등심1.png' },
                        { name: '안심', slug: 'tenderloin', count: cattleData.length, image: '/등심2.png' },
                        { name: '채끝', slug: 'striploin', count: cattleData.length, image: '/등심3.png' },
                        { name: '갈비', slug: 'ribs', count: cattleData.length * 2, image: '/등심4.png' },
                        { name: '특수부위', slug: 'special', count: cattleData.length, image: '/등심1.png' },
                        { name: '앞다리', slug: 'foreleg', count: cattleData.length, image: '/등심2.png' },
                        { name: '우둔', slug: 'rump', count: cattleData.length, image: '/등심3.png' },
                        { name: '목심', slug: 'chuck', count: cattleData.length, image: '/등심4.png' },
                        { name: '양지', slug: 'brisket', count: cattleData.length * 2, image: '/등심1.png' },
                        { name: '설도', slug: 'round', count: cattleData.length * 2, image: '/등심2.png' },
                        { name: '사태', slug: 'shank', count: cattleData.length, image: '/등심3.png' },
                        { name: '꼬리', slug: 'tail', count: cattleData.length, image: '/등심4.png' },
                        { name: '족', slug: 'feet', count: cattleData.length, image: '/등심1.png' },
                        { name: '사골', slug: 'bone', count: cattleData.length, image: '/등심2.png' },
                        { name: '잡뼈', slug: 'misc', count: cattleData.length, image: '/등심3.png' },
                      ].map((part) => (
                        <div
                          key={part.name}
                          className="relative overflow-hidden rounded-xl cursor-pointer group"
                          onClick={() => {
                            router.push(`/auction?tab=part&part=${part.slug}`);
                          }}
                        >
                          {/* 이미지 */}
                          <div className="aspect-[16/9] relative">
                            <img
                              src={part.image}
                              alt={part.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            {/* 하단 그라데이션 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                            {/* 텍스트 */}
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white font-bold text-base drop-shadow-lg">{part.name}</p>
                              <p className="text-white/80 text-xs mt-0.5">{part.count}개 경매중</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeTab === '관심' ? (
                  <div className="pt-4">
                    {/* 개체별/부위별 서브탭 */}
                    <div className="px-4 mb-3">
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => setFavoriteSubTab('개체별')}
                          className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
                            favoriteSubTab === '개체별'
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          개체별
                        </button>
                        <button
                          onClick={() => setFavoriteSubTab('부위별')}
                          className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
                            favoriteSubTab === '부위별'
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          부위별
                        </button>
                      </div>
                    </div>

                    {favoriteSubTab === '개체별' ? (
                      // 개체별 관심 목록
                      (() => {
                        const entityFavorites = favorites.filter(id => !id.includes('-', id.indexOf('-') + 1) || id.split('-').length === 2);
                        return entityFavorites.length === 0 ? (
                      <div className="text-center py-12">
                        <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">관심 등록된 개체가 없습니다.</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">개체별 탭에서 별 아이콘을 눌러 추가해보세요.</p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-700 transition-colors">
                        <table className="w-full text-[13px]">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                  <th className="py-2.5 pl-4 pr-8 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">접수번호</th>
                                  <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">성별</th>
                                  <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">등급</th>
                                  <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">개월령</th>
                                  <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">상장업체</th>
                                  <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">관심</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cattleData.filter(item => isHydrated && isFavorite(item.id)).map((item, index) => (
                              <tr 
                                key={item.id} 
                                onClick={() => router.push(`/auction/${item.id}`)}
                                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors ${index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}
                              >
                                    <td className="py-3 pl-4 pr-8 text-center font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{item.id}</td>
                                    <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.gender}</td>
                                    <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.grade}</td>
                                    <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.months}</td>
                                    <td className="py-3 px-2 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.company}</td>
                                    <td className="py-3 px-2 text-center">
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
                    ) : (
                      // 부위별 관심 목록
                      favoritePartProducts.length === 0 ? (
                        <div className="text-center py-12">
                          <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm">관심 등록된 부위가 없습니다.</p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">부위별 탭에서 별 아이콘을 눌러 추가해보세요.</p>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-700 transition-colors">
                          {/* 테이블 헤더 */}
                          <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-9 flex items-center">
                            <div className="grid px-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 w-full" style={{gridTemplateColumns: '0.85fr 0.6fr 0.85fr 0.95fr 0.95fr 0.5fr 0.5fr'}}>
                              <div className="text-center">부위</div>
                              <div className="text-center">중량</div>
                              <div className="text-center">최저단가</div>
                              <div className="text-center">최고입찰가</div>
                              <div className="text-center">나의입찰가</div>
                              <div className="text-center">상태</div>
                              <div className="text-center">관심</div>
                            </div>
                          </div>

                          {/* 테이블 데이터 */}
                          {favoritePartProducts.map((product: any) => {
                            const bid = bids[product.listingNo];
                            const isExpanded = expandedFavoritePartId === product.id;
                            return (
                              <div key={product.id}>
                                <div 
                                  className={`grid px-2 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors items-center ${
                                    bid?.status === 'highest' 
                                      ? 'bg-blue-50/50 dark:bg-blue-900/30' 
                                      : bid?.status === 'secondHighest'
                                        ? 'bg-red-50/50 dark:bg-red-900/30'
                                        : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                                  }`}
                                  style={{gridTemplateColumns: '0.85fr 0.6fr 0.85fr 0.95fr 0.95fr 0.5fr 0.5fr'}}
                                  onClick={() => setExpandedFavoritePartId(isExpanded ? null : product.id)}
                                >
                                  <div className="text-center">
                                    <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{product.partName}</div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{product.type.includes('거세') ? '거세' : '암'} / {product.grade}</div>
                                  </div>
                                  <div className="text-center text-[13px] text-gray-700 dark:text-gray-300">
                                    {product.weight}
                                  </div>
                                  <div className="text-center text-[13px] text-gray-700 dark:text-gray-300">
                                    {product.price.toLocaleString()}
                                  </div>
                                  <div className="text-center text-[13px] font-medium text-gray-900 dark:text-gray-100">
                                    {bid?.highestBid ? bid.highestBid.toLocaleString() : '-'}
                                  </div>
                                  <div 
                                    className="text-center flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {bid?.myBid ? (
                                      <div className="flex flex-col items-center">
                                        <span 
                                          onClick={() => {
                                            if (bid.status !== 'highest') {
                                              setSelectedFavoritePart(product);
                                              setFavoritePartBidPrice(bid.highestBid + quickReBidAmount);
                                              setShowFavoritePartBidSheet(true);
                                            }
                                          }}
                                          className={`text-[13px] font-medium text-gray-900 dark:text-gray-100 leading-none ${bid.status !== 'highest' ? 'cursor-pointer' : ''}`}
                                        >
                                          {bid.myBid.toLocaleString()}
                                        </span>
                                        {bid.status !== 'highest' && (
                                          <button
                                            onClick={() => {
                                              setSelectedFavoritePart(product);
                                              setFavoritePartBidPrice(bid.highestBid + quickReBidAmount);
                                              setShowFavoritePartBidSheet(true);
                                            }}
                                            className="mt-1 px-2 py-0.5 text-[11px] font-medium text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-900 rounded hover:bg-gray-900 dark:hover:bg-gray-300 transition-colors"
                                          >
                                            재입찰
                                          </button>
                    )}
                  </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSelectedFavoritePart(product);
                                          setFavoritePartBidPrice(0);
                                          setShowFavoritePartBidSheet(true);
                                        }}
                                        className="px-2 py-1 text-[11px] font-medium text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-900 rounded hover:bg-gray-900 dark:hover:bg-gray-300 transition-colors"
                                      >
                                        입찰하기
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-center flex items-center justify-center">
                                    {bid?.status === 'highest' ? (
                                      <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">최고순위</span>
                                    ) : bid?.status === 'secondHighest' ? (
                                      <span className="text-[11px] font-medium text-red-500 dark:text-red-400">차순위</span>
                                    ) : (
                                      <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                                    )}
                                  </div>
                                  <div 
                                    className="text-center flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button 
                                      onClick={() => toggleFavorite(product.listingNo)}
                                      className="p-1.5 text-gray-900 dark:text-gray-100 transition-colors"
                                    >
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
                                      {/* 메인 이미지 배너 */}
                                      <div 
                                        className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
                                        onTouchStart={(e) => handleFavPartTouchStart(e, product.id)}
                                        onTouchMove={handleFavPartTouchMove}
                                        onTouchEnd={handleFavPartTouchEnd}
                                      >
                                        <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700">
                                          {(favoritePartImageIndex[product.id] || 0) === 4 ? (
                                            // 등급판정확인서
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
                                              <div className="w-full max-w-[280px] bg-white dark:bg-gray-700 shadow-lg border border-gray-300 dark:border-gray-600 p-4 aspect-[1/1.414]">
                                                <div className="h-full flex flex-col text-[8px] text-gray-700 dark:text-gray-300">
                                                  <div className="text-center border-b border-gray-400 dark:border-gray-500 pb-2 mb-2">
                                                    <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100">등급판정확인서</p>
                                                    <p className="text-gray-500 dark:text-gray-400 mt-1">Grade Certification</p>
                                                  </div>
                                                  <div className="flex-1 space-y-1.5">
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">접수번호:</span><span className="font-medium">{product.auctionNo}</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">축종:</span><span>한우</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">성별:</span><span>{product.type.includes('거세') ? '거세' : '암'}</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">등급:</span><span className="font-bold text-gray-900 dark:text-gray-100">{product.grade}</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">개월령:</span><span>{product.months}개월</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">도체중량:</span><span>520kg</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">등지방:</span><span>16mm</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">등심면적:</span><span>123㎠</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">근내지방:</span><span>9</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">육색:</span><span>5</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">지방색:</span><span>3</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">조직감:</span><span>1</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">성숙도:</span><span>2</span></div>
                                                  </div>
                                                  <div className="border-t border-gray-300 dark:border-gray-500 pt-2 mt-2 text-center">
                                                    <p className="text-gray-500 dark:text-gray-400">축산물품질평가원</p>
                                                    <p className="text-[6px] text-gray-400 dark:text-gray-500 mt-1">본 확인서는 법적 효력이 있습니다</p>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (favoritePartImageIndex[product.id] || 0) === 5 ? (
                                            // 도축검사증명서
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
                                              <div className="w-full max-w-[280px] bg-white dark:bg-gray-700 shadow-lg border border-gray-300 dark:border-gray-600 p-4 aspect-[1/1.414]">
                                                <div className="h-full flex flex-col text-[8px] text-gray-700 dark:text-gray-300">
                                                  <div className="text-center border-b border-gray-400 dark:border-gray-500 pb-2 mb-2">
                                                    <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100">도축검사증명서</p>
                                                    <p className="text-gray-500 dark:text-gray-400 mt-1">Slaughter Inspection Certificate</p>
                                                  </div>
                                                  <div className="flex-1 space-y-1.5">
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">접수번호:</span><span className="font-medium">{product.auctionNo}</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">도축일:</span><span>2026.01.16</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">도축장:</span><span>음성축산물공판장</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">도축번호:</span><span>201</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">이력번호:</span><span>{product.historyNo}</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">출하농가:</span><span>{product.company}</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">검사결과:</span><span className="font-bold text-green-600 dark:text-green-400">적합</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">검사항목:</span><span>일반검사</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">생체중량:</span><span>720kg</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">도체중량:</span><span>520kg</span></div>
                                                    <div className="flex"><span className="w-16 text-gray-500 dark:text-gray-400">지육율:</span><span>72.2%</span></div>
                                                  </div>
                                                  <div className="border-t border-gray-300 dark:border-gray-500 pt-2 mt-2 text-center">
                                                    <p className="text-gray-500 dark:text-gray-400">농림축산검역본부</p>
                                                    <p className="text-[6px] text-gray-400 dark:text-gray-500 mt-1">본 증명서는 법적 효력이 있습니다</p>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            // 일반 이미지
                                            <img 
                                              src={`/등심${((favoritePartImageIndex[product.id] || 0) % 4) + 1}.png`}
                                              alt="개체 이미지"
                                              className="w-full h-full object-cover select-none pointer-events-none"
                                              draggable="false"
                                            />
                                          )}
                                        </div>
                                        
                                        {/* 이미지 인디케이터 */}
                                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                          {[0,1,2,3,4,5].map((index) => (
                                            <button
                                              key={index}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setFavoritePartImageIndex(prev => ({ ...prev, [product.id]: index }));
                                              }}
                                              className={`w-2 h-2 rounded-full transition-colors ${
                                                (favoritePartImageIndex[product.id] || 0) === index ? 'bg-white' : 'bg-white/50'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      </div>

                                      {/* 썸네일 이미지 */}
                                      <div className="px-3 py-2 bg-white dark:bg-gray-900">
                                        <div className="flex gap-1.5 justify-start overflow-x-auto">
                                          {[1,2,3,4].map((num, index) => (
                                            <button
                                              key={index}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setFavoritePartImageIndex(prev => ({ ...prev, [product.id]: index }));
                                              }}
                                              className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                                (favoritePartImageIndex[product.id] || 0) === index 
                                                  ? 'border-2 border-gray-400 dark:border-gray-500' 
                                                  : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                              }`}
                                            >
                                              <img 
                                                src={`/등심${num}.png`}
                                                alt={`등심${num}`}
                                                className="w-full h-full object-cover"
                                              />
                                            </button>
                                          ))}
                                          {/* 등급판정확인서 썸네일 */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setFavoritePartImageIndex(prev => ({ ...prev, [product.id]: 4 }));
                                            }}
                                            className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                              (favoritePartImageIndex[product.id] || 0) === 4 
                                                ? 'border-2 border-gray-400 dark:border-gray-500' 
                                                : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                          >
                                            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                              <div className="w-8 h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"></div>
                                            </div>
                                          </button>
                                          {/* 도축검사증명서 썸네일 */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setFavoritePartImageIndex(prev => ({ ...prev, [product.id]: 5 }));
                                            }}
                                            className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                              (favoritePartImageIndex[product.id] || 0) === 5 
                                                ? 'border-2 border-gray-400 dark:border-gray-500' 
                                                : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                          >
                                            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                              <div className="w-8 h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"></div>
                                            </div>
                                          </button>
                                        </div>
                                      </div>

                                      {/* 개체정보 패널 - 3줄 테이블 형식 */}
                                      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
                                        {/* 1행: 축종, 성별, 등급, 개월령, 이력번호 */}
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden mb-2">
                                          <table className="w-full text-[13px]">
                                            <thead>
                                              <tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">축종</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">성별</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">등급</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">개월령</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">이력번호</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              <tr>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">한우</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.type.includes('거세') ? '거세' : '암'}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.grade}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.months}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium text-[11px]">{product.historyNo}</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* 2행: 등지방, 등심면적, 근내지방, 육색, 지방색, 조직감, 성숙도 */}
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden mb-2">
                                          <table className="w-full text-[13px]">
                                            <thead>
                                              <tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">등지방</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">등심면적</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">근내지방</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">육색</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">지방색</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">조직감</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">성숙도</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              <tr>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">16</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">123</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">9</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">5</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">3</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">1</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">2</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* 3행: 도축장, 도축번호, 도체중, 상장업체, 가공일, 가공중량 */}
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                                          <table className="w-full text-[13px]">
                                            <thead>
                                              <tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">도축장</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">도축번호</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">도체중</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">상장업체</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">가공일</th>
                                                <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">가공중량</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              <tr>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">음성</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">201</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">520</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.company}</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">26.01.17</td>
                                                <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">312</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                      
                                      {/* 개체정보 버튼 & 축산물 이력정보 */}
                                      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-2">
                                        <a
                                          href="https://aunit.mtrace.go.kr/mtracesearch/cattleNoSearch.do?btsProgNo=0109008401&btsActionMethod=SELECT&cattleNo=002189438539"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          축산물 이력정보
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <div className="flex-1" />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFavoritePart(product);
                                            setFavoritePartBidPrice(product.price);
                                            setShowFavoritePartBidSheet(true);
                                          }}
                                          className="px-3 py-1.5 text-xs font-bold rounded bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-900 dark:hover:bg-gray-300 transition-colors"
                                        >
                                          입찰하기
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedFavoritePartId(null);
                                          }}
                                          className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                          개체정보 닫기
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      )
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
                              // cattleData에서 성별/등급별 두수 계산 (육량지수 A,B,C 무시)
                              const getGradeWithoutYield = (grade: string) => grade.replace(/[ABC]/, '');
                              const steer9 = cattleData.filter(c => c.gender === '거세' && getGradeWithoutYield(c.grade) === '1++(9)').length;
                              const steer8 = cattleData.filter(c => c.gender === '거세' && getGradeWithoutYield(c.grade) === '1++(8)').length;
                              const steer7 = cattleData.filter(c => c.gender === '거세' && getGradeWithoutYield(c.grade) === '1++(7)').length;
                              const steer1p = cattleData.filter(c => c.gender === '거세' && getGradeWithoutYield(c.grade) === '1+').length;
                              const steer1 = cattleData.filter(c => c.gender === '거세' && getGradeWithoutYield(c.grade) === '1').length;
                              const steer2 = cattleData.filter(c => c.gender === '거세' && getGradeWithoutYield(c.grade) === '2').length;
                              const steerSum = cattleData.filter(c => c.gender === '거세').length;

                              const cow9 = cattleData.filter(c => c.gender === '암' && getGradeWithoutYield(c.grade) === '1++(9)').length;
                              const cow8 = cattleData.filter(c => c.gender === '암' && getGradeWithoutYield(c.grade) === '1++(8)').length;
                              const cow7 = cattleData.filter(c => c.gender === '암' && getGradeWithoutYield(c.grade) === '1++(7)').length;
                              const cow1p = cattleData.filter(c => c.gender === '암' && getGradeWithoutYield(c.grade) === '1+').length;
                              const cow1 = cattleData.filter(c => c.gender === '암' && getGradeWithoutYield(c.grade) === '1').length;
                              const cow2 = cattleData.filter(c => c.gender === '암' && getGradeWithoutYield(c.grade) === '2').length;
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
                            // cattleData에서 고유 업체 목록 추출 (육량지수 A,B,C 무시)
                            const getGradeWithoutYield = (grade: string) => grade.replace(/[ABC]/, '');
                            const companies = [...new Set(cattleData.map(c => c.company))];
                            return companies.map((companyName, idx) => {
                              const companyData = cattleData.filter(c => c.company === companyName);
                              const grade9 = companyData.filter(c => getGradeWithoutYield(c.grade) === '1++(9)').length;
                              const grade8 = companyData.filter(c => getGradeWithoutYield(c.grade) === '1++(8)').length;
                              const grade7 = companyData.filter(c => getGradeWithoutYield(c.grade) === '1++(7)').length;
                              const grade1p = companyData.filter(c => getGradeWithoutYield(c.grade) === '1+').length;
                              const grade1 = companyData.filter(c => getGradeWithoutYield(c.grade) === '1').length;
                              const grade2 = companyData.filter(c => getGradeWithoutYield(c.grade) === '2').length;
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
                              const getGradeWithoutYield = (grade: string) => grade.replace(/[ABC]/, '');
                              const total9 = cattleData.filter(c => getGradeWithoutYield(c.grade) === '1++(9)').length;
                              const total8 = cattleData.filter(c => getGradeWithoutYield(c.grade) === '1++(8)').length;
                              const total7 = cattleData.filter(c => getGradeWithoutYield(c.grade) === '1++(7)').length;
                              const total1p = cattleData.filter(c => getGradeWithoutYield(c.grade) === '1+').length;
                              const total1 = cattleData.filter(c => getGradeWithoutYield(c.grade) === '1').length;
                              const total2 = cattleData.filter(c => getGradeWithoutYield(c.grade) === '2').length;
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

            {/* 부위별 관심 입찰 바텀시트 */}
            <AnimatePresence>
              {showFavoritePartBidSheet && selectedFavoritePart && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 z-[90]"
                    onClick={() => setShowFavoritePartBidSheet(false)}
                  />
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-[100] transition-colors"
                  >
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">입찰하기</h3>
                      <button
                        onClick={() => setShowFavoritePartBidSheet(false)}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="p-4">
                      {/* 상품 정보 테이블 */}
                      <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
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
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{selectedFavoritePart.listingNo}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">한우</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedFavoritePart.gender || '거세'}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedFavoritePart.grade}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedFavoritePart.months || '30'}</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedFavoritePart.partName}</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedFavoritePart.weight}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* 입찰가 입력 */}
                      <div className="space-y-2 mb-4">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">입찰가격 (kg당)</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={favoritePartBidPrice > 0 ? favoritePartBidPrice.toLocaleString() : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d]/g, '');
                              setFavoritePartBidPrice(value ? parseInt(value) : 0);
                            }}
                            placeholder={`최저단가 ${selectedFavoritePart.price.toLocaleString()}`}
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
                                setFavoritePartBidPrice(prev => {
                                  // 0이면 DB 최고입찰가 또는 최저단가에서 시작
                                  if (prev === 0 && selectedFavoritePart) {
                                    const basePrice = selectedFavoritePart.dbHighestBid || selectedFavoritePart.price || 0;
                                    return basePrice + amount;
                                  }
                                  return prev + amount;
                                });
                              }}
                              className="py-2.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-300"
                            >
                              +{amount.toLocaleString()}
                            </button>
                          ))}
                          <button
                            onClick={() => setFavoritePartBidPrice(0)}
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
                            {favoritePartBidPrice > 0 
                              ? `${Math.round(favoritePartBidPrice * parseFloat(selectedFavoritePart.weight)).toLocaleString()}원`
                              : '-'
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* 입찰하기 버튼 */}
                      <button
                        onClick={() => {
                          if (favoritePartBidPrice >= selectedFavoritePart.price) {
                            setShowFavoritePartBidSheet(false);
                            setShowFavoritePartBidConfirm(true);
                          } else {
                            showToastMessage('최저단가 이상으로 입찰해주세요.', 'warning');
                          }
                        }}
                        disabled={favoritePartBidPrice === 0}
                        className="w-full py-2.5 bg-gray-800 dark:bg-gray-100 hover:bg-gray-900 dark:hover:bg-gray-200 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white dark:text-gray-900 disabled:text-gray-500 dark:disabled:text-gray-400 font-bold text-base rounded transition-colors"
                      >
                        입찰하기
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* 부위별 관심 입찰 확인 다이얼로그 */}
            <AnimatePresence>
              {showFavoritePartBidConfirm && selectedFavoritePart && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[110] flex items-center justify-center p-4"
                >
                  <div 
                    className="absolute inset-0 bg-black/60"
                    onClick={() => setShowFavoritePartBidConfirm(false)}
                  />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white dark:bg-gray-900 rounded w-full max-w-md overflow-hidden transition-colors"
                  >
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
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{selectedFavoritePart.listingNo}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">한우</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedFavoritePart.type?.includes('거세') ? '거세' : '암'}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedFavoritePart.grade}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">32</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedFavoritePart.partName}</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedFavoritePart.weight}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 입찰 금액 정보 */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">입찰가격</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{favoritePartBidPrice.toLocaleString()}원/kg</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">총 입찰금액</span>
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {Math.round(favoritePartBidPrice * parseFloat(selectedFavoritePart.weight)).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 다이얼로그 버튼 */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                      <button
                        onClick={() => {
                          setShowFavoritePartBidConfirm(false);
                          setShowFavoritePartBidSheet(true);
                        }}
                        className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                      >
                        취소
                      </button>
                      <button
                        onClick={async () => {
                          if (!dealerId) {
                            showToastMessage('로그인이 필요합니다.', 'warning');
                            return;
                          }
                          
                          if (!selectedFavoritePart.partDbId) {
                            showToastMessage('부위 정보를 찾을 수 없습니다.', 'warning');
                            return;
                          }
                          
                          setIsFavoritePartBidding(true);
                          
                          try {
                            const response = await fetch('/api/bids', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                partId: selectedFavoritePart.partDbId,
                                dealerId: dealerId,
                                bidPrice: favoritePartBidPrice,
                                weight: parseFloat(selectedFavoritePart.weight),
                              }),
                            });
                            
                            const result = await response.json();
                            
                            if (!response.ok) {
                              showToastMessage(result.error || '입찰에 실패했습니다.', 'warning');
                              return;
                            }
                            
                            // 로컬 스토어에도 저장 (UI 즉시 반영용)
                            const now = new Date();
                            const timeStr = `${now.getFullYear().toString().slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.(${['일','월','화','수','목','금','토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                            
                            setBid(selectedFavoritePart.listingNo, {
                              myBid: favoritePartBidPrice,
                              highestBid: favoritePartBidPrice,
                              status: 'highest',
                              time: timeStr,
                              productInfo: {
                                listingNo: selectedFavoritePart.listingNo,
                                partName: selectedFavoritePart.partName,
                                weight: selectedFavoritePart.weight,
                                type: selectedFavoritePart.type,
                                grade: selectedFavoritePart.grade,
                                price: selectedFavoritePart.price,
                              }
                            });
                            
                            // DB 데이터 새로고침
                            await refetchListings();
                            
                            setShowFavoritePartBidConfirm(false);
                            setSelectedFavoritePart(null);
                            setFavoritePartBidPrice(0);
                            showToastMessage(result.isUpdate ? '입찰가가 수정되었습니다.' : '입찰이 완료되었습니다.', 'success');
                          } catch (error) {
                            console.error('입찰 오류:', error);
                            showToastMessage('입찰 중 오류가 발생했습니다.', 'warning');
                          } finally {
                            setIsFavoritePartBidding(false);
                          }
                        }}
                        disabled={isFavoritePartBidding}
                        className="flex-1 py-2.5 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFavoritePartBidding ? '입찰 중...' : '입찰하기'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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