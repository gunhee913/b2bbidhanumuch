'use client';

import { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart,
  ArrowRight,
  Play,
  Pause,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ExternalLink,
  Edit2,
  Star,
  Check
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useBidStore } from '@/stores/bidStore';
import { AUCTION_PRODUCTS, getTodayDateCode, getYesterdayDateFormatted } from '@/constants/auction';
import { useListings } from '@/features/listings/hooks';
import { format } from 'date-fns';
import { formatGrade } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';

function AuctionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
    favorites,
    toggleFavorite,
    isFavorite
  } = useBidStore();
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showNotice, setShowNotice] = useState(true);
  
  // 탭 상태 (URL 파라미터에서 초기값 설정)
  const [activeTab, setActiveTab] = useState<'individual' | 'part'>(
    searchParams.get('tab') === 'part' ? 'part' : 'individual'
  );
  
  // 부위별 상세 보기 상태 (URL 파라미터에서 초기값 설정)
  const [selectedPartId, setSelectedPartId] = useState<string | null>(
    searchParams.get('part')
  );
  
  // 선택된 개체 상태 (부위별 목록에서 클릭 시)
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // 부위별 필터 상태
  const [partFilterCompanies, setPartFilterCompanies] = useState<string[]>([]);
  const [partFilterType, setPartFilterType] = useState<string>('성별');
  const [partFilterGrades, setPartFilterGrades] = useState<string[]>([]);
  const [partFilterMarbling, setPartFilterMarbling] = useState<string>('근내지방도');
  
  // 부위별 입찰 바텀시트 상태
  const [showPartBidSheet, setShowPartBidSheet] = useState(false);
  const [partBidPrice, setPartBidPrice] = useState(0);
  const [showPartBidDialog, setShowPartBidDialog] = useState(false);
  
  // 토스트 상태
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'warning' | 'success'>('success');
  
  // 토스트 표시 함수
  const showToastMessage = (message: string, type: 'warning' | 'success' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
  
  // 펼쳐진 개체 정보 상태
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [expandedImageIndex, setExpandedImageIndex] = useState<Record<string, number>>({});
  
  // 이미지 스와이프 관련 상태 (useRef 사용)
  const swipeStartX = useRef(0);
  const swipeEndX = useRef(0);
  const swipeIsDragging = useRef(false);
  const swipeProductId = useRef<string | null>(null);
  
  // 오늘 날짜 포맷팅
  const getTodayFormatted = () => {
    const today = new Date();
    const year = String(today.getFullYear()).slice(2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[today.getDay()];
    return `${year}.${month}.${day}.(${dayName})`;
  };
  
  // 회차별 경매 타이머
  const [remainingTime, setRemainingTime] = useState(0);
  const [roundInfo, setRoundInfo] = useState<{
    currentRound: any;
    lastClosedRound: any;
    allRounds: any[];
    totalRounds: number;
  } | null>(null);
  
  // 빠른 재입찰 수정 모달
  const [showQuickReBidEdit, setShowQuickReBidEdit] = useState(false);
  const [tempQuickReBidAmount, setTempQuickReBidAmount] = useState('1,000');
  
  // 내 입찰내역 테이블 마우스 드래그 스크롤
  const bidTableRef = useRef<HTMLDivElement>(null);
  const [isBidTableDragging, setIsBidTableDragging] = useState(false);
  const [bidTableStartX, setBidTableStartX] = useState(0);
  const [bidTableScrollLeft, setBidTableScrollLeft] = useState(0);

  const handleBidTableMouseDown = (e: React.MouseEvent) => {
    if (!bidTableRef.current) return;
    setIsBidTableDragging(true);
    setBidTableStartX(e.pageX - bidTableRef.current.offsetLeft);
    setBidTableScrollLeft(bidTableRef.current.scrollLeft);
  };

  const handleBidTableMouseMove = (e: React.MouseEvent) => {
    if (!isBidTableDragging || !bidTableRef.current) return;
    e.preventDefault();
    const x = e.pageX - bidTableRef.current.offsetLeft;
    const walk = (bidTableStartX - x) * 1.5;
    bidTableRef.current.scrollLeft = bidTableScrollLeft + walk;
  };

  const handleBidTableMouseUp = () => {
    setIsBidTableDragging(false);
  };

  const handleBidTableMouseLeave = () => {
    setIsBidTableDragging(false);
  };
  
  // 필터 상태
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filterLabel = (selected: string[], label: string) => {
    if (selected.length === 0) return `${label}: 전체`;
    if (selected.length <= 2) return `${label}: ${selected.join(', ')}`;
    return `${label}: ${selected.length}개 선택`;
  };

  const toggleFilter = (selected: string[], value: string, setter: (v: string[]) => void) => {
    setter(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  // 배너 데이터 (빈 상태)
  const banners = [
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" }
  ];

  // URL 파라미터에 따른 상태 설정
  useEffect(() => {
    const tab = searchParams.get('tab');
    const part = searchParams.get('part');
    const company = searchParams.get('company');
    
    if (tab === 'part') {
      setActiveTab('part');
      if (part) {
        setSelectedPartId(part);
      }
    }
    
    if (company) {
      setSelectedCompanies([company]);
    }
  }, [searchParams]);

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
  
  // 회차별 경매 정보 폴링 (5초 간격)
  useEffect(() => {
    const fetchRoundInfo = async () => {
      try {
        const res = await fetch('/api/auctions/rounds/current');
        if (res.ok) {
          const data = await res.json();
          setRoundInfo(data);
        }
      } catch {}
    };
    fetchRoundInfo();
    const interval = setInterval(fetchRoundInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  // 타이머 계산 (회차 기반)
  useEffect(() => {
    const cr = roundInfo?.currentRound;
    if (!cr?.started_at || !cr?.round_duration_min) {
      setRemainingTime(0);
      return;
    }

    const calculateRemaining = () => {
      const startedAt = new Date(cr.started_at).getTime();
      const durationMs = cr.round_duration_min * 60 * 1000;
      const remaining = Math.max(0, Math.floor((startedAt + durationMs - Date.now()) / 1000));
      setRemainingTime(remaining);
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [roundInfo?.currentRound?.id, roundInfo?.currentRound?.started_at]);

  // 시간 포맷 함수
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs.toString().padStart(2, '0')}초`;
  };
  
  // 다음/이전 이미지 이동 함수 (이미지 4개 + 서류 2개 = 총 6개)
  const TOTAL_IMAGES = 6;
  
  const nextImage = (productId: string) => {
    const currentIndex = expandedImageIndex[productId] || 0;
    setExpandedImageIndex(prev => ({ ...prev, [productId]: (currentIndex + 1) % TOTAL_IMAGES }));
  };
  
  const prevImage = (productId: string) => {
    const currentIndex = expandedImageIndex[productId] || 0;
    setExpandedImageIndex(prev => ({ ...prev, [productId]: (currentIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES }));
  };

  // 터치 핸들러 (모바일)
  const handleImageTouchStart = (e: React.TouchEvent, productId: string) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeEndX.current = e.touches[0].clientX;
    swipeProductId.current = productId;
  };
  
  const handleImageTouchMove = (e: React.TouchEvent) => {
    swipeEndX.current = e.touches[0].clientX;
  };
  
  const handleImageTouchEnd = () => {
    if (!swipeProductId.current) return;
    
    const diff = swipeStartX.current - swipeEndX.current;
    const threshold = 80;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        nextImage(swipeProductId.current);
      } else {
        prevImage(swipeProductId.current);
      }
    }
    
    swipeStartX.current = 0;
    swipeEndX.current = 0;
    swipeProductId.current = null;
  };
  
  // 마우스 핸들러 (웹)
  const handleImageMouseDown = (e: React.MouseEvent, productId: string) => {
    swipeIsDragging.current = true;
    swipeStartX.current = e.clientX;
    swipeEndX.current = e.clientX;
    swipeProductId.current = productId;
  };
  
  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!swipeIsDragging.current) return;
    swipeEndX.current = e.clientX;
  };
  
  const handleImageMouseUp = () => {
    if (!swipeIsDragging.current || !swipeProductId.current) return;
    
    const diff = swipeStartX.current - swipeEndX.current;
    const threshold = 80;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        nextImage(swipeProductId.current);
      } else {
        prevImage(swipeProductId.current);
      }
    }
    
    swipeIsDragging.current = false;
    swipeStartX.current = 0;
    swipeEndX.current = 0;
    swipeProductId.current = null;
  };
  
  const handleImageMouseLeave = () => {
    if (swipeIsDragging.current) {
      handleImageMouseUp();
    }
  };

  // 자동 슬라이드
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length, isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // 부위별 데이터 (좌/우 합침, 총 15개 부위) - 실제 데이터 기반
  const partsDataBase = [
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

  // 경매 상품 데이터 (공통 상수에서 가져옴)
  const products = AUCTION_PRODUCTS;

  // 오늘 날짜 (API 호출용)
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // 승인된 상장 목록 조회 (DB 연동)
  const { data: listingsData, isLoading: isListingsLoading, refetch: refetchListings } = useListings({
    status: 'approved,auction,closed' as any,
    listingDateFrom: todayStr,
    listingDateTo: todayStr,
    includeParts: true,
  });
  
  // 실시간 입찰 변경 구독 (Optimistic Update)
  // payload가 있으면 캐시에서 이미 업데이트됨, 없으면(DELETE) refetch
  const handleBidChange = useCallback((payload?: { partId: string; bidPrice: number; dealerId: string }) => {
    if (!payload) {
      console.log('[Auction] 입찰 삭제 감지 - 데이터 새로고침');
      refetchListings();
    } else {
      console.log('[Auction] 입찰 변경 감지 - 캐시 업데이트 완료:', payload.bidPrice);
    }
  }, [refetchListings]);
  
  useRealtimeBids({
    onBidChange: handleBidChange,
    enabled: true,
  });
  
  // 부위별 입찰 로딩 상태
  const [isPartBidding, setIsPartBidding] = useState(false);

  // DB 데이터를 auctionEntities 형식으로 변환
  const auctionEntities = useMemo(() => {
    if (!listingsData || listingsData.length === 0) return [];
    
    return listingsData.map((listing, index) => {
      // 등급 카테고리 추출
      const grade = listing.grade || '1';
      let gradeCategory: '1++' | '1+' | '1' | '2' | '3' = '1';
      if (grade.startsWith('1++')) gradeCategory = '1++';
      else if (grade.startsWith('1+')) gradeCategory = '1+';
      else if (grade.startsWith('1')) gradeCategory = '1';
      else if (grade.startsWith('2')) gradeCategory = '2';
      else gradeCategory = '3';
      
      // listingNo에서 ID 추출 (예: 260204-201 → 201)
      const listingNoParts = listing.listingNo.split('-');
      const entityId = listingNoParts.length > 1 ? parseInt(listingNoParts[1]) : index + 101;
      
      return {
        id: entityId,
        type: listing.gender === '암' ? '한우암' : '한우거세',
        grade: listing.grade || '1',
        gradeCategory,
        historyNo: listing.traceNo || '',
        company: listing.companyName || '',
        image: listing.images?.[0] || '/등심1.png',
        listingNo: listing.listingNo,
        parts: listing.parts || [],
      };
    });
  }, [listingsData]);

  // 부위별 세부 부위 매핑 (좌/우 포함)
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

  // 부위별 최저단가
  const partMinPrices: Record<string, number> = {
    '등심(좌)': 85000, '등심(우)': 85000,
    '안심': 95000, '채끝': 82000,
    '치마': 65000, '부채': 60000,
    '업진': 55000, '토시·제비': 70000, '앞다리': 55000,
    '우둔': 58000, '목심': 62000,
    '양지(좌)': 52000, '양지(우)': 52000,
    '설도(좌)': 56000, '설도(우)': 56000,
    '사태': 48000, '꼬리': 35000,
    '족': 25000, '사골': 20000, '잡뼈': 15000,
  };

  // 부위별 중량 범위
  const partWeightRanges: Record<string, [number, number]> = {
    '등심(좌)': [15, 16], '등심(우)': [15, 16],
    '안심': [4, 5], '채끝': [7.5, 8.5],
    '치마': [3.5, 4.5], '부채': [2.5, 3.5],
    '업진': [4, 5], '토시·제비': [1.5, 2.5], '앞다리': [24, 26],
    '우둔': [20, 22], '목심': [14, 15],
    '양지(좌)': [12, 13], '양지(우)': [12, 13],
    '설도(좌)': [16, 17.5], '설도(우)': [16, 17.5],
    '사태': [14.5, 15.5], '꼬리': [15.5, 16.5],
    '족': [10, 11], '사골': [3, 4], '잡뼈': [21, 23],
  };

  // 부위별 경매 상품 데이터 생성 (DB 데이터 기반)
  const partProducts = useMemo(() => {
    const allProducts: Record<string, any[]> = {};
    
    // DB 데이터가 없으면 빈 객체 반환
    if (auctionEntities.length === 0) {
      Object.keys(partSubParts).forEach(partId => {
        allProducts[partId] = [];
      });
      return allProducts;
    }
    
    // 전체 부위 순서 (상장번호 계산용)
    const allSubPartsOrder = [
      '등심(좌)', '등심(우)', '안심', '채끝', '치마', '부채',
      '업진', '토시·제비', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)',
      '설도(좌)', '설도(우)', '사태', '꼬리', '족', '사골', '잡뼈'
    ];
    
    Object.entries(partSubParts).forEach(([partId, subParts]) => {
      const products: any[] = [];
      
      // 각 개체에 대해 해당 부위 생성
      auctionEntities.forEach((entity: any) => {
        subParts.forEach((subPart) => {
          // DB에서 부위 정보가 있으면 사용
          const dbPart = entity.parts?.find((p: any) => p.partName === subPart && p.isIncluded);
          
          if (dbPart) {
            // DB 원본 listing 데이터 찾기
            const originalListing = listingsData?.find(l => l.listingNo === entity.listingNo);
            
            // DB 데이터 사용
            products.push({
              id: `${partId}-${entity.id}-${subPart}`,
              partId,
              partName: subPart,
              image: entity.image,
              images: originalListing?.images || [], // DB 이미지 배열
              type: entity.type,
              grade: entity.grade,
              weight: `${dbPart.weight?.toFixed(1) || '0.0'}kg`,
              price: dbPart.minPrice || partMinPrices[subPart] || 50000,
              auctionNo: entity.listingNo || `${getTodayDateCode()}-${String(entity.id).padStart(3, '0')}`,
              listingNo: dbPart.listingPartNo || `${entity.listingNo}-${String(dbPart.partNo).padStart(2, '0')}`,
              historyNo: entity.historyNo,
              company: entity.company,
              date: getTodayFormatted(),
              entityId: entity.id,
              partDbId: dbPart.id, // DB 부위 ID (입찰 시 사용)
              createdAt: Date.now() - entity.id * 600000,
              // 개체 상세 정보 (DB에서)
              breed: originalListing?.breed || '한우',
              monthAge: originalListing?.monthAge || 0,
              traceNo: originalListing?.traceNo || '',
              carcassWeight: originalListing?.carcassWeight || 0,
              backFat: originalListing?.backFat || 0,
              eyeMuscle: originalListing?.eyeMuscle || 0,
              marblingScore: originalListing?.marblingScore || 0,
              meatColor: originalListing?.meatColor || 0,
              fatColor: originalListing?.fatColor || 0,
              texture: originalListing?.texture || 0,
              maturity: originalListing?.maturity || 0,
              slaughterHouse: originalListing?.slaughterHouse || '',
              slaughterDate: originalListing?.slaughterDate || '',
              slaughterNo: originalListing?.slaughterNo || '',
              processDate: originalListing?.processDate || '',
              processWeight: originalListing?.processWeight || 0,
              gradeCert: originalListing?.gradeCert || null,
              slaughterCert: originalListing?.slaughterCert || null,
              // 낙찰 정보
              hasWinner: !!dbPart.hasWinner,
              highestBid: dbPart.highestBid || null,
              // 비공개 입찰: 내 입찰만
              myBid: dbPart.myBid || null,
            });
          }
        });
      });
      
      allProducts[partId] = products;
    });
    
    return allProducts;
  }, [auctionEntities]);

  // partsData에 실제 개수 반영
  const partsData = useMemo(() => {
    return partsDataBase.map(part => ({
      ...part,
      count: partProducts[part.id]?.length || 0,
    }));
  }, [partProducts]);

  // 선택된 부위 정보
  const selectedPart = useMemo(() => {
    return partsData.find(p => p.id === selectedPartId);
  }, [selectedPartId, partsData]);

  // 부위별 상품 필터링 및 정렬
  const matchPartGrade = (product: any, selected: string) => {
    const baseGrade = product.grade.replace(/[ABC]/, '').replace(/\(\d+\)/, '');
    if (selected === '1++(9)') return baseGrade === '1++' && product.marblingScore === 9;
    if (selected === '1++(8)') return baseGrade === '1++' && product.marblingScore === 8;
    if (selected === '1++(7)') return baseGrade === '1++' && product.marblingScore === 7;
    return baseGrade === selected;
  };

  const filteredPartProducts = useMemo(() => {
    if (!selectedPartId || !partProducts[selectedPartId]) return [];
    
    let filtered = [...partProducts[selectedPartId]];
    
    if (partFilterCompanies.length > 0) {
      filtered = filtered.filter(p => partFilterCompanies.includes(p.company));
    }
    
    if (partFilterType !== '성별' && partFilterType !== '전체') {
      filtered = filtered.filter(p => p.type === partFilterType);
    }
    
    if (partFilterGrades.length > 0) {
      filtered = filtered.filter(p => partFilterGrades.some(g => matchPartGrade(p, g)));
    }
    
    if (partFilterMarbling !== '근내지방도' && partFilterMarbling !== '전체') {
      const marblingNo = parseInt(partFilterMarbling.replace('No.', ''));
      filtered = filtered.filter(p => p.marblingScore === marblingNo);
    }
    
    filtered.sort((a: any, b: any) => {
      const aNo = a.auctionNo?.split('-')[1] || '0';
      const bNo = b.auctionNo?.split('-')[1] || '0';
      return parseInt(aNo) - parseInt(bNo);
    });
    
    return filtered;
  }, [selectedPartId, partProducts, partFilterCompanies, partFilterType, partFilterGrades, partFilterMarbling]);

  // 부위별: 진행중 / 경매결과 분리
  const activePartProducts = useMemo(() => {
    return filteredPartProducts.filter((p: any) => !p.hasWinner);
  }, [filteredPartProducts]);

  const settledPartProducts = useMemo(() => {
    if (!selectedPartId || !partProducts[selectedPartId]) return [];
    const allForPart = [...partProducts[selectedPartId]];
    allForPart.sort((a: any, b: any) => {
      const aNo = a.auctionNo?.split('-')[1] || '0';
      const bNo = b.auctionNo?.split('-')[1] || '0';
      return parseInt(aNo) - parseInt(bNo);
    });
    return allForPart.filter((p: any) => p.hasWinner);
  }, [selectedPartId, partProducts]);

  // 부위별: 입찰 가능 여부 (경매 진행중일 때만)
  const canBidPart = useMemo(() => {
    if (!roundInfo?.currentRound) return false;
    return roundInfo.currentRound.status === 'open';
  }, [roundInfo]);

  // 부위별: 입찰 취소
  const [cancellingPartBidId, setCancellingPartBidId] = useState<string | null>(null);
  const handleCancelBidPart = async (bidId: string, partName: string) => {
    if (!confirm(`${partName} 입찰을 취소하시겠습니까?`)) return;
    setCancellingPartBidId(bidId);
    try {
      const res = await fetch(`/api/bids/${bidId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showToastMessage(data.error || '입찰 취소에 실패했습니다.', 'warning');
        return;
      }
      showToastMessage(`${partName} 입찰이 취소되었습니다.`, 'success');
      refetchListings();
    } catch {
      showToastMessage('입찰 취소 중 오류가 발생했습니다.', 'warning');
    } finally {
      setCancellingPartBidId(null);
    }
  };

  // 부위 목록으로 돌아가기
  const handleBackToPartList = () => {
    router.push('/?tab=부위별');
  };

  const matchGradePart = (product: any, selected: string) => {
    const marblingMatch = product.grade.match(/\((\d+)\)/);
    const marblingNo = marblingMatch ? parseInt(marblingMatch[1]) : 0;
    if (selected === '1++(9)') return product.gradeCategory === '1++' && marblingNo === 9;
    if (selected === '1++(8)') return product.gradeCategory === '1++' && marblingNo === 8;
    if (selected === '1++(7)') return product.gradeCategory === '1++' && marblingNo === 7;
    return product.gradeCategory === selected;
  };

  const filteredProducts = products.filter(product => {
    const gradeMatch = selectedGrades.length === 0 || selectedGrades.some(g => matchGradePart(product, g));
    const companyMatch = selectedCompanies.length === 0 || selectedCompanies.includes(product.company);
    return gradeMatch && companyMatch;
  });

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            
            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-900 transition-colors">
              {/* 섹션 제목 - 부위별 상세에서는 숨김 */}
              {!(activeTab === 'part' && selectedPartId) && (
                <div className="px-4 pt-4 pb-2 bg-white dark:bg-gray-900 flex flex-col gap-1 transition-colors">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{getTodayFormatted()} 경매</h2>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">마감까지</span>
                      <span className={`text-sm font-bold ${remainingTime <= 60 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {formatTime(remainingTime)}
                      </span>
                    </div>
                  </div>
                  {roundInfo?.currentRound && (
                    <div className="flex items-center">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        경매 진행중
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'individual' ? (
                <>
                  {/* 필터 섹션 - 다중 선택 */}
                  <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 filter-dropdown transition-colors">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* 등급 필터 */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'indGrade' ? null : 'indGrade')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-medium transition-colors ${
                            selectedGrades.length > 0
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {filterLabel(selectedGrades, '등급')}
                          <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'indGrade' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'indGrade' && (
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
                            {['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'].map((option, idx, arr) => (
                              <button
                                key={option}
                                onClick={(e) => { e.stopPropagation(); toggleFilter(selectedGrades, option, setSelectedGrades); }}
                                className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                  idx === arr.length - 1 ? 'rounded-b-lg' : ''
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

                      {/* 업체 필터 */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'indCompany' ? null : 'indCompany')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-medium transition-colors ${
                            selectedCompanies.length > 0
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {filterLabel(selectedCompanies, '업체')}
                          <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'indCompany' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'indCompany' && (() => {
                          const indCompanyOptions = Array.from(new Set(products.map(p => p.company)));
                          return (
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
                              {indCompanyOptions.map((option, idx) => (
                                <button
                                  key={option}
                                  onClick={(e) => { e.stopPropagation(); toggleFilter(selectedCompanies, option, setSelectedCompanies); }}
                                  className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap ${
                                    idx === indCompanyOptions.length - 1 ? 'rounded-b-lg' : ''
                                  } ${
                                    selectedCompanies.includes(option) ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {option}
                                  {selectedCompanies.includes(option) && <Check className="h-4 w-4" />}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      <span className="ml-auto text-[13px] text-gray-400 dark:text-gray-500">
                        {filteredProducts.length}개
                      </span>
                    </div>
                  </div>

                  {/* 메인 컨텐츠 영역 - 상품 목록 */}
                  <div className="px-3 pb-24 pt-4 flex-1 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-gray-500 dark:text-gray-400">조건에 맞는 상품이 없습니다.</p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <Link key={product.id} href={`/auction/${product.id}`} className="block">
                          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex gap-3">
                              {/* 상품 이미지 */}
                              <div className="flex-shrink-0">
                                <div className="w-24 h-24 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                  <img 
                                    src={product.image} 
                                    alt={`등심${product.id}`} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                              
                              {/* 상품 정보 */}
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex flex-wrap gap-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                                      {product.type}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                                      {formatGrade(product.grade, (product as any).marblingScore)}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="space-y-0.5">
                                  <p className="text-xs">
                                    <span className="font-bold text-gray-900 dark:text-gray-100">접수번호:</span> 
                                    <span className="text-gray-600 dark:text-gray-400 ml-1">{product.auctionNo}</span>
                                  </p>
                                  <p className="text-xs">
                                    <span className="font-bold text-gray-900 dark:text-gray-100">이력번호:</span> 
                                    <span className="text-gray-600 dark:text-gray-400 ml-1">{product.historyNo}</span>
                                  </p>
                                  <p className="text-xs">
                                    <span className="font-bold text-gray-900 dark:text-gray-100">업체명:</span> 
                                    <span className="text-gray-600 dark:text-gray-400 ml-1">{product.company}</span>
                                  </p>
                                  <p className="text-xs">
                                    <span className="font-bold text-gray-900 dark:text-gray-100">가공일자:</span> 
                                    <span className="text-gray-600 dark:text-gray-400 ml-1">{product.date}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </>
              ) : selectedPartId && selectedPart ? (
                <>
                  {/* 부위별 상세 목록 헤더 - sticky */}
                  <div className="px-3 h-12 bg-white dark:bg-gray-900 sticky top-0 z-30 flex items-center transition-colors">
                    <button
                      onClick={handleBackToPartList}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <div className="flex-1 text-center">
                      <h3 className="text-[17px] font-bold text-gray-900 dark:text-gray-100">{selectedPart.name}</h3>
                    </div>
                    {roundInfo === null ? (
                      <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5 flex-shrink-0">
                        <div className="w-16 h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    ) : roundInfo?.currentRound && remainingTime > 0 ? (
                      <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5 flex-shrink-0">
                        <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                          {roundInfo.currentRound.round_no}차 진행중
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${remainingTime <= 60 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                          {Math.floor(remainingTime / 60)}분 {String(remainingTime % 60).padStart(2, '0')}초
                        </span>
                      </div>
                    ) : roundInfo?.lastClosedRound ? (
                      <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5 flex-shrink-0">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          {roundInfo.lastClosedRound.round_no}차 경매 마감
                        </span>
                      </div>
                    ) : (
                      <div className="w-7" />
                    )}
                  </div>
                  

                  {/* 부위별 필터 - 다중 선택 */}
                  <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 filter-dropdown transition-colors">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* 등급 필터 */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'partGrade' ? null : 'partGrade')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-medium transition-colors ${
                            partFilterGrades.length > 0
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {filterLabel(partFilterGrades, '등급')}
                          <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'partGrade' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'partGrade' && (
                          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[130px]">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPartFilterGrades([]); setOpenDropdown(null); }}
                              className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg ${
                                partFilterGrades.length === 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              전체
                              {partFilterGrades.length === 0 && <Check className="h-4 w-4" />}
                            </button>
                            {['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'].map((option, idx, arr) => (
                              <button
                                key={option}
                                onClick={(e) => { e.stopPropagation(); toggleFilter(partFilterGrades, option, setPartFilterGrades); }}
                                className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                  idx === arr.length - 1 ? 'rounded-b-lg' : ''
                                } ${
                                  partFilterGrades.includes(option) ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {option}
                                {partFilterGrades.includes(option) && <Check className="h-4 w-4" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* 업체 필터 */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'partCompany' ? null : 'partCompany')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-medium transition-colors ${
                            partFilterCompanies.length > 0
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {filterLabel(partFilterCompanies, '업체')}
                          <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'partCompany' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'partCompany' && (() => {
                          const partCompanyOptions = Array.from(new Set((selectedPartId && partProducts[selectedPartId] ? partProducts[selectedPartId] : []).map((p: any) => p.company).filter(Boolean)));
                          return (
                            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[130px]">
                              <button
                                onClick={(e) => { e.stopPropagation(); setPartFilterCompanies([]); setOpenDropdown(null); }}
                                className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg ${
                                  partFilterCompanies.length === 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                전체
                                {partFilterCompanies.length === 0 && <Check className="h-4 w-4" />}
                              </button>
                              {partCompanyOptions.map((option, idx) => (
                                <button
                                  key={option}
                                  onClick={(e) => { e.stopPropagation(); toggleFilter(partFilterCompanies, option, setPartFilterCompanies); }}
                                  className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap ${
                                    idx === partCompanyOptions.length - 1 ? 'rounded-b-lg' : ''
                                  } ${
                                    partFilterCompanies.includes(option) ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {option}
                                  {partFilterCompanies.includes(option) && <Check className="h-4 w-4" />}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* 필터 결과 카운트 */}
                      <span className="ml-auto text-[13px] text-gray-400 dark:text-gray-500">
                        {filteredPartProducts.length}개
                      </span>
                    </div>
                  </div>


                  {/* 부위별 상품 테이블 */}
                  <div className="flex-1 pb-24" data-scroll-container>
                    {/* 테이블 헤더 - sticky */}
                    <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-9 flex items-center sticky top-11 z-10 transition-colors">
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

                    {/* 테이블 데이터 - 진행중 항목 */}
                    {activePartProducts.length === 0 && settledPartProducts.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-gray-500 dark:text-gray-400">조건에 맞는 상품이 없습니다.</p>
                      </div>
                    ) : activePartProducts.length === 0 && settledPartProducts.length > 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500 dark:text-gray-400">모든 부위의 낙찰이 결정되었습니다.</p>
                      </div>
                    ) : (
                      activePartProducts.map((product) => {
                        const myBidPrice = product.myBid?.bidPrice;
                        const hasBid = !!myBidPrice;
                        
                        const isExpanded = expandedProductId === product.id;
                        const isHighlighted = highlightedProductId === product.id;
                        return (
                          <div key={product.id} id={`product-row-${product.id}`} className={`${isHighlighted ? 'border-2 border-red-500 dark:border-red-400' : ''}`}>
                            <div 
                              className={`grid px-2 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors items-center ${
                                hasBid 
                                  ? 'bg-blue-50/50 dark:bg-blue-900/30' 
                                  : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                              style={{gridTemplateColumns: '0.6fr 1.1fr 0.6fr 0.85fr 1.1fr 0.5fr 0.5fr 0.35fr'}}
                              onClick={() => {
                                if (!isExpanded) {
                                  setHighlightedProductId(product.id);
                                }
                                setExpandedProductId(isExpanded ? null : product.id);
                              }}
                            >
                              <div className="text-center text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-center whitespace-nowrap">
                                {product.company}
                              </div>
                              <div className="text-center">
                                <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{product.partName}</div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{product.type.includes('거세') ? '거세' : '암'} / {formatGrade(product.grade, product.marblingScore)}</div>
                              </div>
                              <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                                {product.weight}
                              </div>
                              <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                                {product.price.toLocaleString()}
                              </div>
                              <div 
                                className="flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {hasBid ? (
                                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                                    {myBidPrice.toLocaleString()}
                                  </span>
                                ) : (
                                  <button
                                    disabled={!canBidPart}
                                    onClick={() => {
                                      setSelectedProduct(product);
                                      setPartBidPrice(0);
                                      setShowPartBidSheet(true);
                                    }}
                                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                                      canBidPart
                                        ? 'text-white bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600'
                                        : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                                    }`}
                                  >
                                    입찰하기
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center justify-center">
                                {hasBid ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!canBidPart) {
                                        showToastMessage('경매 진행중이 아닙니다.', 'warning');
                                        return;
                                      }
                                      setSelectedProduct(product);
                                      setPartBidPrice(product.myBid?.bidPrice || 0);
                                      setShowPartBidSheet(true);
                                    }}
                                    className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${
                                      canBidPart
                                        ? 'text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                        : 'text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    변경
                                  </button>
                                ) : (
                                  <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </div>
                              <div className="flex items-center justify-center">
                                {hasBid && product.myBid?.bidId ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!canBidPart) {
                                        showToastMessage('경매 진행중이 아닙니다.', 'warning');
                                        return;
                                      }
                                      handleCancelBidPart(product.myBid.bidId, product.partName);
                                    }}
                                    className={`px-1.5 py-1 text-[11px] font-medium rounded transition-colors ${
                                      canBidPart
                                        ? 'text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30'
                                        : 'text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    취소
                                  </button>
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
                                  className={`p-1.5 transition-colors ${
                                    isFavorite(product.listingNo) 
                                      ? 'text-gray-900 dark:text-gray-100' 
                                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                  }`}
                                >
                                  <Star className={`w-5 h-5 ${isFavorite(product.listingNo) ? 'fill-current' : ''}`} />
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
                                    onTouchStart={(e) => handleImageTouchStart(e, product.id)}
                                    onTouchMove={handleImageTouchMove}
                                    onTouchEnd={handleImageTouchEnd}
                                    onMouseDown={(e) => handleImageMouseDown(e, product.id)}
                                    onMouseMove={handleImageMouseMove}
                                    onMouseUp={handleImageMouseUp}
                                    onMouseLeave={handleImageMouseLeave}
                                  >
                                    <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800">
                                      {(() => {
                                        const imgIndex = expandedImageIndex[product.id] || 0;
                                        const dbImages = product.images || [];
                                        const imageCount = Math.max(dbImages.length, 4);
                                        const hasGradeCert = !!product.gradeCert?.fileData;
                                        const hasSlaughterCert = !!product.slaughterCert?.fileData;
                                        
                                        // 등급판정확인서 (이미지 다음)
                                        if (hasGradeCert && imgIndex === imageCount) {
                                          return (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 p-4">
                                              <img src={product.gradeCert.fileData} alt="등급판정확인서" className="max-w-full max-h-full object-contain shadow-lg" />
                                            </div>
                                          );
                                        }
                                        
                                        // 도축검사증명서 (등급판정확인서 다음 또는 이미지 바로 다음)
                                        const slaughterCertIndex = imageCount + (hasGradeCert ? 1 : 0);
                                        if (hasSlaughterCert && imgIndex === slaughterCertIndex) {
                                          return (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 p-4">
                                              <img src={product.slaughterCert.fileData} alt="도축검사증명서" className="max-w-full max-h-full object-contain shadow-lg" />
                                            </div>
                                          );
                                        }
                                        
                                        // 일반 이미지 (DB 이미지 사용)
                                        const imageSrc = dbImages[imgIndex] || `/등심${(imgIndex % 4) + 1}.png`;
                                        return (
                                          <img 
                                            src={imageSrc}
                                            alt="개체 이미지"
                                            className="w-full h-full object-cover select-none pointer-events-none"
                                            draggable="false"
                                          />
                                        );
                                      })()}
                                    </div>
                                    
                                    {/* 이미지 인디케이터 */}
                                    {(() => {
                                      const dbImages = product.images || [];
                                      const imageCount = Math.max(dbImages.length, 4);
                                      const hasGradeCert = !!product.gradeCert?.fileData;
                                      const hasSlaughterCert = !!product.slaughterCert?.fileData;
                                      const totalCount = imageCount + (hasGradeCert ? 1 : 0) + (hasSlaughterCert ? 1 : 0);
                                      return (
                                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                          {Array.from({ length: totalCount }).map((_, index) => (
                                            <button
                                              key={index}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedImageIndex(prev => ({ ...prev, [product.id]: index }));
                                              }}
                                              className={`w-2 h-2 rounded-full transition-colors ${
                                                (expandedImageIndex[product.id] || 0) === index ? 'bg-white' : 'bg-white/50'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* 썸네일 이미지 */}
                                  <div className="px-3 py-2">
                                    <div className="flex gap-1.5 justify-start overflow-x-auto">
                                      {/* DB 이미지 또는 폴백 이미지 */}
                                      {(() => {
                                        const dbImages = product.images || [];
                                        const imageCount = Math.max(dbImages.length, 4);
                                        return Array.from({ length: imageCount }).map((_, index) => (
                                          <button
                                            key={index}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedImageIndex(prev => ({ ...prev, [product.id]: index }));
                                            }}
                                            className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                              (expandedImageIndex[product.id] || 0) === index 
                                                ? 'border-2 border-gray-400 dark:border-gray-500' 
                                                : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                          >
                                            <img 
                                              src={dbImages[index] || `/등심${(index % 4) + 1}.png`}
                                              alt={`이미지 ${index + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                          </button>
                                        ));
                                      })()}
                                      {/* 등급판정확인서 썸네일 - 증명서가 있을 때만 표시 */}
                                      {product.gradeCert?.fileData && (() => {
                                        const certIndex = Math.max((product.images || []).length, 4);
                                        return (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedImageIndex(prev => ({ ...prev, [product.id]: certIndex }));
                                            }}
                                            className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                              (expandedImageIndex[product.id] || 0) === certIndex 
                                                ? 'border-2 border-gray-400 dark:border-gray-500' 
                                                : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                          >
                                            <img 
                                              src={product.gradeCert.fileData} 
                                              alt="등급판정확인서" 
                                              className="w-full h-full object-cover"
                                            />
                                          </button>
                                        );
                                      })()}
                                      {/* 도축검사증명서 썸네일 - 증명서가 있을 때만 표시 */}
                                      {product.slaughterCert?.fileData && (() => {
                                        const hasGradeCert = !!product.gradeCert?.fileData;
                                        const certIndex = Math.max((product.images || []).length, 4) + (hasGradeCert ? 1 : 0);
                                        return (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setExpandedImageIndex(prev => ({ ...prev, [product.id]: certIndex }));
                                            }}
                                            className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                              (expandedImageIndex[product.id] || 0) === certIndex 
                                                ? 'border-2 border-gray-400 dark:border-gray-500' 
                                                : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                          >
                                            <img 
                                              src={product.slaughterCert.fileData} 
                                              alt="도축검사증명서" 
                                              className="w-full h-full object-cover"
                                            />
                                          </button>
                                        );
                                      })()}
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
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.breed || '한우'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.type?.includes('거세') ? '거세' : '암'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{formatGrade(product.grade, product.marblingScore)}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.monthAge || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium text-[11px]">{product.traceNo || '-'}</td>
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
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.backFat || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.eyeMuscle || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.marblingScore || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.meatColor || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.fatColor || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.texture || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.maturity || '-'}</td>
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
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.slaughterHouse || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.slaughterNo || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.carcassWeight || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.company || '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.processDate ? product.processDate.replace(/-/g, '.').slice(2) : '-'}</td>
                                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{product.processWeight || '-'}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  
                                  {/* 개체정보 버튼 & 축산물 이력정보 - 맨 아래 */}
                                  <div className="px-3 py-3 border-t border-gray-200 bg-white flex items-center gap-2">
                                    <a
                                      href="https://aunit.mtrace.go.kr/mtracesearch/cattleNoSearch.do?btsProgNo=0109008401&btsActionMethod=SELECT&cattleNo=002189438539"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      축산물 이력정보
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <div className="flex-1" />
                                    <button
                                      disabled={!canBidPart}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProduct(product);
                                        setPartBidPrice(product.price);
                                        setShowPartBidSheet(true);
                                      }}
                                      className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                                        canBidPart
                                          ? 'bg-gray-800 text-white hover:bg-gray-900'
                                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      입찰하기
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rowElement = document.getElementById(`product-row-${product.id}`);
                                        setExpandedProductId(null);
                                        // 해당 행으로 스크롤 (고정 헤더 아래로)
                                        if (rowElement) {
                                          setTimeout(() => {
                                            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }, 300);
                                        }
                                      }}
                                      className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      개체정보 닫기
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                    
                    {/* 경매 결과 섹션 */}
                    {settledPartProducts.length > 0 && (
                      <div className="mt-4">
                        <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                            경매 결과 ({settledPartProducts.length}건)
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
                        {settledPartProducts.map((product: any) => {
                          const isMyWin = !!product.myBid?.isWinning;
                          return (
                            <div
                              key={product.id}
                              className={`grid px-2 py-3 border-b border-gray-100 dark:border-gray-800 items-center ${
                                isMyWin ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'
                              }`}
                              style={{gridTemplateColumns: '0.6fr 1fr 0.6fr 0.9fr 0.9fr 0.9fr 0.6fr 0.35fr'}}
                            >
                              <div className="text-center text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-center whitespace-nowrap">
                                {product.company}
                              </div>
                              <div className="text-center">
                                <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{product.partName}</div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{product.type.includes('거세') ? '거세' : '암'} / {formatGrade(product.grade, product.marblingScore)}</div>
                              </div>
                              <div className="text-center text-[13px] text-gray-700 dark:text-gray-300">
                                {product.weight}
                              </div>
                              <div className="text-center text-[13px] text-gray-700 dark:text-gray-300">
                                {product.price.toLocaleString()}
                              </div>
                              <div className="text-center text-[13px] font-medium text-gray-900 dark:text-gray-100">
                                {product.highestBid?.bidPrice ? product.highestBid.bidPrice.toLocaleString() : '-'}
                              </div>
                              <div className="text-center text-[13px] text-gray-700 dark:text-gray-300">
                                {product.myBid?.bidPrice ? product.myBid.bidPrice.toLocaleString() : '-'}
                              </div>
                              <div className="text-center flex items-center justify-center">
                                {isMyWin ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                    낙찰
                                  </span>
                                ) : product.myBid?.bidPrice ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                                    미낙찰
                                  </span>
                                ) : (
                                  <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </div>
                              <div className="text-center flex items-center justify-center">
                                <button
                                  onClick={() => toggleFavorite(product.listingNo)}
                                  className={`p-1.5 transition-colors ${
                                    isFavorite(product.listingNo)
                                      ? 'text-gray-900 dark:text-gray-100'
                                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                  }`}
                                >
                                  <Star className={`w-5 h-5 ${isFavorite(product.listingNo) ? 'fill-current' : ''}`} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 하단 여백 */}
                    <div className="pb-24"></div>
                  </div>
                </>
              ) : null}
            </div>

            {/* 빠른 재입찰 금액 수정 모달 */}
              {showQuickReBidEdit && (
              <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[10000] p-4">
                <div className="bg-white rounded-lg max-w-sm w-full p-5">
                  <h3 className="text-lg font-bold mb-4">빠른 재입찰 금액 설정</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">증액 금액</label>
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
                        onFocus={() => {
                          setTempQuickReBidAmount('');
                        }}
                        placeholder="증액할 금액을 입력하세요"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">원</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      현재 최고가에 이 금액을 더해 빠른 재입찰합니다.
                    </p>
                  </div>

                    <div className="flex gap-2">
                      <button
                      onClick={() => {
                        setShowQuickReBidEdit(false);
                        setTempQuickReBidAmount(quickReBidAmount.toLocaleString());
                      }}
                      className="flex-1 bg-white text-gray-700 border-2 border-gray-300 py-2 rounded-lg font-bold hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => {
                          const value = parseInt(tempQuickReBidAmount.replace(/,/g, '')) || 1000;
                        if (value % 100 !== 0) {
                          return;
                        }
                          setQuickReBidAmount(value);
                          setShowQuickReBidEdit(false);
                        }}
                      disabled={!tempQuickReBidAmount || parseInt(tempQuickReBidAmount.replace(/,/g, '')) <= 0 || parseInt(tempQuickReBidAmount.replace(/,/g, '')) % 100 !== 0}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                      저장
                      </button>
                    </div>
                </div>
              </div>
              )}

            {/* 부위별 입찰 바텀시트 */}
            <AnimatePresence>
              {showPartBidSheet && selectedProduct && (
                <>
                  {/* 백드롭 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowPartBidSheet(false)}
                    className="absolute inset-0 bg-black/50 z-40"
                  />
                  
                  {/* 바텀시트 */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-[100] transition-colors"
                  >
                    {/* 핸들 */}
                    <div className="flex justify-center pt-3 pb-2">
                      <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                    </div>
                    
                    {/* 헤더 */}
                    <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">입찰하기</h3>
                        <button 
                          onClick={() => setShowPartBidSheet(false)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* 입찰 내용 */}
                    <div className="p-4 space-y-4">
                      {/* 개체 정보 테이블 */}
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
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{selectedProduct.listingNo}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">한우</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedProduct.type?.includes('거세') ? '거세' : '암'}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedProduct.grade}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">30</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedProduct.partName}</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedProduct.weight}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 입찰가격 입력 */}
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">입찰가격 (원/kg)</div>
                        <div className="relative mb-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={partBidPrice > 0 ? partBidPrice.toLocaleString('ko-KR') : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                              setPartBidPrice(value ? parseInt(value) : 0);
                            }}
                            className="w-full px-4 py-3.5 pr-12 text-right text-xl font-bold border border-gray-200 dark:border-gray-700 rounded focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            placeholder={selectedProduct ? `최저단가 ${(selectedProduct.price || 0).toLocaleString()}` : '0'}
                          />
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                            원
                          </div>
                        </div>
                        {/* 금액 조정 버튼 */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 10, 100, 1000].map((amount) => (
                            <button
                              key={amount}
                              onClick={() => {
                                setPartBidPrice(prev => {
                                  if (prev === 0 && selectedProduct) {
                                    const basePrice = selectedProduct.price || 0;
                                    return basePrice + amount;
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
                            onClick={() => setPartBidPrice(0)}
                            className="py-2 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium transition-colors"
                          >
                            초기화
                          </button>
                        </div>
                      </div>

                      {/* 총 입찰금액 */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">총 입찰금액</span>
                          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {partBidPrice > 0 && selectedProduct.weight
                              ? `${Math.round(partBidPrice * parseFloat(selectedProduct.weight)).toLocaleString()}원`
                              : '-'}
                          </span>
                        </div>
                      </div>

                      {/* 입찰하기 버튼 */}
                      <button
                        onClick={() => {
                          if (partBidPrice < selectedProduct.price) {
                            alert(`최저단가(${selectedProduct.price.toLocaleString()}원) 이상으로 입찰해주세요.`);
                            return;
                          }
                          setShowPartBidDialog(true);
                        }}
                        disabled={partBidPrice === 0}
                        className="w-full py-3.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-base rounded transition-colors"
                      >
                        입찰하기
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* 부위별 입찰 확인 다이얼로그 */}
            {showPartBidDialog && selectedProduct && (
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
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">{selectedProduct.listingNo}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">한우</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedProduct.type?.includes('거세') ? '거세' : '암'}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{selectedProduct.grade}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">30</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedProduct.partName}</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedProduct.weight}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 입찰 금액 정보 */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">입찰가격</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{partBidPrice.toLocaleString()}원/kg</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">총 입찰금액</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {Math.round(partBidPrice * parseFloat(selectedProduct.weight)).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 다이얼로그 버튼 */}
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                    <button
                      onClick={() => setShowPartBidDialog(false)}
                      className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={async () => {
                        if (!dealerId) {
                          showToastMessage('로그인이 필요합니다.', 'warning');
                          return;
                        }
                        
                        if (!selectedProduct.partDbId) {
                          showToastMessage('부위 정보를 찾을 수 없습니다.', 'warning');
                          return;
                        }
                        
                        setIsPartBidding(true);
                        
                        try {
                          const response = await fetch('/api/bids', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              partId: selectedProduct.partDbId,
                              dealerId: dealerId,
                              bidPrice: partBidPrice,
                              weight: parseFloat(selectedProduct.weight),
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
                          setBid(selectedProduct.listingNo, {
                            myBid: partBidPrice,
                            highestBid: partBidPrice,
                            status: 'highest',
                            time: timeStr,
                            productInfo: {
                              listingNo: selectedProduct.listingNo,
                              partName: selectedProduct.partName,
                              weight: selectedProduct.weight,
                              type: selectedProduct.type,
                              grade: selectedProduct.grade,
                              price: selectedProduct.price
                            }
                          });
                          
                          // DB 데이터 새로고침
                          await refetchListings();
                          
                          setShowPartBidDialog(false);
                          setShowPartBidSheet(false);
                          showToastMessage(result.isUpdate ? '입찰가가 수정되었습니다.' : '입찰이 완료되었습니다.', 'success');
                        } catch (error) {
                          console.error('입찰 오류:', error);
                          showToastMessage('입찰 중 오류가 발생했습니다.', 'warning');
                        } finally {
                          setIsPartBidding(false);
                        }
                      }}
                      disabled={isPartBidding}
                      className="flex-1 py-2.5 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded font-medium hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPartBidding ? '입찰 중...' : '입찰하기'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 하단 네비게이션 */}
            <BottomNav />
          </div>
        </div>
        
        {/* 토스트 메시지 */}
        {showToast && (
          <div className={`fixed left-1/2 transform -translate-x-1/2 z-[10001] transition-all duration-300 ${
            toastType === 'success' ? 'bottom-20' : 'top-4'
          }`}>
            <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
              toastType === 'success' 
                ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100' 
                : 'bg-gray-800 dark:bg-gray-700 text-white'
            }`}>
              <div className="flex-shrink-0">
                {toastType === 'success' ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          </div>
        )}
    </div>
  );
}

export default function AuctionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900"><div className="text-gray-500 dark:text-gray-400">로딩 중...</div></div>}>
      <AuctionPageContent />
    </Suspense>
  );
}