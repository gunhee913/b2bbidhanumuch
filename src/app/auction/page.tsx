'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
  Star
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useBidStore } from '@/stores/bidStore';
import { AUCTION_PRODUCTS, getTodayDateCode, getYesterdayDateFormatted } from '@/constants/auction';

function AuctionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'individual' | 'part'>('individual');
  
  // 부위별 상세 보기 상태
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  
  // 선택된 개체 상태 (부위별 목록에서 클릭 시)
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // 부위별 필터 상태
  const [partFilterCompany, setPartFilterCompany] = useState<string>('업체명');
  const [partFilterType, setPartFilterType] = useState<string>('성별');
  const [partFilterGrade, setPartFilterGrade] = useState<string>('등급');
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
  
  // 마감시간 카운터
  const [remainingTime, setRemainingTime] = useState(60 * 60); // 60분 = 3600초
  
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
  const [selectedType, setSelectedType] = useState<string>('성별');
  const [selectedGrade, setSelectedGrade] = useState<string>('등급');
  const [selectedNo, setSelectedNo] = useState<string>('근내지방도');
  const [selectedCompany, setSelectedCompany] = useState<string>('업체명');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
    
    // 업체명 필터 적용
    if (company) {
      setSelectedCompany(company);
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
  
  // 마감시간 카운터
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
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

  // 부위별 데이터 (좌/우 합침, 총 15개 부위) - 14두 기준
  const partsData = [
    { id: 'sirloin', name: '등심', image: '/등심1.png', count: 28 },  // 14두 × (좌+우)
    { id: 'tenderloin', name: '안심', image: '/등심2.png', count: 14 },   // 14두 × 1
    { id: 'striploin', name: '채끝', image: '/등심3.png', count: 14 },
    { id: 'ribs', name: '갈비', image: '/등심4.png', count: 28 },     // 14두 × (좌+우)
    { id: 'special', name: '특수부위', image: '/등심1.png', count: 14 },
    { id: 'foreleg', name: '앞다리', image: '/등심2.png', count: 14 },
    { id: 'rump', name: '우둔', image: '/등심3.png', count: 14 },
    { id: 'chuck', name: '목심', image: '/등심4.png', count: 14 },
    { id: 'brisket', name: '양지', image: '/등심1.png', count: 28 },  // 14두 × (좌+우)
    { id: 'round', name: '설도', image: '/등심2.png', count: 28 },    // 14두 × (좌+우)
    { id: 'shank', name: '사태', image: '/등심3.png', count: 14 },
    { id: 'tail', name: '꼬리', image: '/등심4.png', count: 14 },
    { id: 'feet', name: '족', image: '/등심1.png', count: 14 },
    { id: 'bone', name: '사골', image: '/등심2.png', count: 14 },
    { id: 'misc', name: '잡뼈', image: '/등심3.png', count: 14 },
  ];

  // 경매 상품 데이터 (공통 상수에서 가져옴)
  const products = AUCTION_PRODUCTS;

  // 개체 정보 (메인 페이지 cattleData와 동일한 24두 기준)
  // 부위별 데이터 생성용
  const auctionEntities: Array<{
    id: number;
    type: string;
    grade: string;
    gradeCategory: '1++' | '1+' | '1' | '2' | '3';
    historyNo: string;
    company: string;
    image: string;
  }> = [
    // 건화 (101~106) - 거세 5, 암 1
    { id: 101, type: '한우거세', grade: '1++A(9)', gradeCategory: '1++', historyNo: '002-1486-7293-101', company: '건화', image: '/등심1.png' },
    { id: 102, type: '한우거세', grade: '1+A', gradeCategory: '1+', historyNo: '002-1486-7293-102', company: '건화', image: '/등심2.png' },
    { id: 103, type: '한우거세', grade: '1++B(8)', gradeCategory: '1++', historyNo: '002-1486-7293-103', company: '건화', image: '/등심3.png' },
    { id: 104, type: '한우거세', grade: '1B', gradeCategory: '1', historyNo: '002-1486-7293-104', company: '건화', image: '/등심4.png' },
    { id: 105, type: '한우거세', grade: '1++A(7)', gradeCategory: '1++', historyNo: '002-1486-7293-105', company: '건화', image: '/등심1.png' },
    { id: 106, type: '한우암', grade: '1+B', gradeCategory: '1+', historyNo: '002-1486-7293-106', company: '건화', image: '/등심2.png' },
    // 대진엠이스 (201~206) - 거세 5, 암 1
    { id: 201, type: '한우거세', grade: '1++A(9)', gradeCategory: '1++', historyNo: '002-1486-7293-201', company: '대진엠이스', image: '/등심3.png' },
    { id: 202, type: '한우거세', grade: '1++A(8)', gradeCategory: '1++', historyNo: '002-1486-7293-202', company: '대진엠이스', image: '/등심4.png' },
    { id: 203, type: '한우거세', grade: '1+B', gradeCategory: '1+', historyNo: '002-1486-7293-203', company: '대진엠이스', image: '/등심1.png' },
    { id: 204, type: '한우거세', grade: '1A', gradeCategory: '1', historyNo: '002-1486-7293-204', company: '대진엠이스', image: '/등심2.png' },
    { id: 205, type: '한우거세', grade: '1++B(7)', gradeCategory: '1++', historyNo: '002-1486-7293-205', company: '대진엠이스', image: '/등심3.png' },
    { id: 206, type: '한우암', grade: '1+A', gradeCategory: '1+', historyNo: '002-1486-7293-206', company: '대진엠이스', image: '/등심4.png' },
    // 안심엘피시 (301~306) - 거세 5, 암 1
    { id: 301, type: '한우거세', grade: '1++B(9)', gradeCategory: '1++', historyNo: '002-1486-7293-301', company: '안심엘피시', image: '/등심1.png' },
    { id: 302, type: '한우거세', grade: '1+A', gradeCategory: '1+', historyNo: '002-1486-7293-302', company: '안심엘피시', image: '/등심2.png' },
    { id: 303, type: '한우거세', grade: '1++A(8)', gradeCategory: '1++', historyNo: '002-1486-7293-303', company: '안심엘피시', image: '/등심3.png' },
    { id: 304, type: '한우거세', grade: '1B', gradeCategory: '1', historyNo: '002-1486-7293-304', company: '안심엘피시', image: '/등심4.png' },
    { id: 305, type: '한우거세', grade: '1++C(7)', gradeCategory: '1++', historyNo: '002-1486-7293-305', company: '안심엘피시', image: '/등심1.png' },
    { id: 306, type: '한우암', grade: '1+C', gradeCategory: '1+', historyNo: '002-1486-7293-306', company: '안심엘피시', image: '/등심2.png' },
    // 정직한고기 (401~406) - 거세 5, 암 1
    { id: 401, type: '한우거세', grade: '1++C(9)', gradeCategory: '1++', historyNo: '002-1486-7293-401', company: '정직한고기', image: '/등심3.png' },
    { id: 402, type: '한우거세', grade: '1++C(8)', gradeCategory: '1++', historyNo: '002-1486-7293-402', company: '정직한고기', image: '/등심4.png' },
    { id: 403, type: '한우거세', grade: '1+C', gradeCategory: '1+', historyNo: '002-1486-7293-403', company: '정직한고기', image: '/등심1.png' },
    { id: 404, type: '한우거세', grade: '1C', gradeCategory: '1', historyNo: '002-1486-7293-404', company: '정직한고기', image: '/등심2.png' },
    { id: 405, type: '한우거세', grade: '1++A(7)', gradeCategory: '1++', historyNo: '002-1486-7293-405', company: '정직한고기', image: '/등심3.png' },
    { id: 406, type: '한우암', grade: '1+A', gradeCategory: '1+', historyNo: '002-1486-7293-406', company: '정직한고기', image: '/등심4.png' },
  ];

  // 부위별 세부 부위 매핑 (좌/우 포함)
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

  // 부위별 최저단가
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

  // 부위별 중량 범위
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

  // 부위별 경매 상품 데이터 생성 (5두 기반)
  const partProducts = useMemo(() => {
    const allProducts: Record<string, any[]> = {};
    
    // 전체 부위 순서 (상장번호 계산용)
    const allSubPartsOrder = [
      '등심(좌)', '등심(우)', '안심', '채끝', '갈비(좌)', '갈비(우)', 
      '특수부위', '앞다리', '우둔', '목심', '양지(좌)', '양지(우)', 
      '설도(좌)', '설도(우)', '사태', '꼬리', '족', '사골', '잡뼈'
    ];
    
    Object.entries(partSubParts).forEach(([partId, subParts]) => {
      const products: any[] = [];
      
      // 5두 각각에 대해 해당 부위 생성
      auctionEntities.forEach((entity) => {
        subParts.forEach((subPart) => {
          const [minW, maxW] = partWeightRanges[subPart] || [10, 15];
          const variation = ((entity.id) * 0.17) % 1;
          const weight = (minW + (maxW - minW) * variation).toFixed(1);
          
          // 상장번호 계산: 개체별로 부위 인덱스에 따라 01부터 시작
          const partIndex = allSubPartsOrder.indexOf(subPart);
          const listingNumber = partIndex + 1;
          
          // 등급에 따른 가격 조정 (근내지방도 기준)
          // 근내지방도: 7,8,9 = 1++등급 / 6 = 1+등급 / 4,5 = 1등급 / 2,3 = 2등급 / 1 = 3등급
          const basePrice = partMinPrices[subPart] || 50000;
          let gradeMultiplier = 1.0;
          
          // 등급 카테고리별 가격 배수 (1++ 등급의 경우 근내지방도로 세분화)
          if (entity.gradeCategory === '1++') {
          const marblingMatch = entity.grade.match(/\((\d+)\)/);
            const marblingNo = marblingMatch ? parseInt(marblingMatch[1]) : 8;
            if (marblingNo === 9) gradeMultiplier = 1.20;
            else if (marblingNo === 8) gradeMultiplier = 1.15;
            else gradeMultiplier = 1.10;
          } else if (entity.gradeCategory === '1+') {
            gradeMultiplier = 1.05;
          } else if (entity.gradeCategory === '1') {
            gradeMultiplier = 1.00;
          } else if (entity.gradeCategory === '2') {
            gradeMultiplier = 0.90;
          } else {
            gradeMultiplier = 0.80;
          }
          
          // 최종 가격 계산 (1000원 단위로 반올림)
          const adjustedPrice = Math.round((basePrice * gradeMultiplier) / 1000) * 1000;
          
          // 개체별 페이지와 연동: entity.id가 이미 101, 201 등 형식
          products.push({
            id: `${partId}-${entity.id}-${subPart}`,
            partId,
            partName: subPart,
            image: entity.image,
            type: entity.type,
            grade: entity.grade,
            weight: `${weight}kg`,
            price: adjustedPrice,
            auctionNo: `${getTodayDateCode()}-${String(entity.id).padStart(3, '0')}`,
            listingNo: `${getTodayDateCode()}-${String(entity.id).padStart(3, '0')}-${String(listingNumber).padStart(2, '0')}`,
            historyNo: entity.historyNo,
            company: entity.company,
            date: '2025.08.05.(화)',
            entityId: entity.id,
            createdAt: Date.now() - entity.id * 600000
          });
        });
      });
      
      allProducts[partId] = products;
    });
    
    return allProducts;
  }, []);

  // 선택된 부위 정보
  const selectedPart = useMemo(() => {
    return partsData.find(p => p.id === selectedPartId);
  }, [selectedPartId]);

  // 부위별 상품 필터링 및 정렬
  const filteredPartProducts = useMemo(() => {
    if (!selectedPartId || !partProducts[selectedPartId]) return [];
    
    let filtered = [...partProducts[selectedPartId]];
    
    // 업체명 필터
    if (partFilterCompany !== '업체명' && partFilterCompany !== '전체') {
      filtered = filtered.filter(p => p.company === partFilterCompany);
    }
    
    // 성별 필터
    if (partFilterType !== '성별' && partFilterType !== '전체') {
      filtered = filtered.filter(p => p.type === partFilterType);
    }
    
    // 등급 필터
    if (partFilterGrade !== '등급' && partFilterGrade !== '전체') {
      if (partFilterGrade === '1++(9)') {
        filtered = filtered.filter(p => p.grade.includes('1++') && p.grade.includes('(9)'));
      } else if (partFilterGrade === '1++(8)') {
        filtered = filtered.filter(p => p.grade.includes('1++') && p.grade.includes('(8)'));
      } else if (partFilterGrade === '1++(7)') {
        filtered = filtered.filter(p => p.grade.includes('1++') && p.grade.includes('(7)'));
      } else if (partFilterGrade === '1+') {
        filtered = filtered.filter(p => p.grade.startsWith('1+') && !p.grade.startsWith('1++'));
      } else if (partFilterGrade === '1') {
        filtered = filtered.filter(p => p.grade === '1' || (p.grade.startsWith('1') && !p.grade.startsWith('1++')));
      } else if (partFilterGrade === '2') {
        filtered = filtered.filter(p => p.grade.startsWith('2'));
      }
    }
    
    // 근내지방도 필터
    if (partFilterMarbling !== '근내지방도' && partFilterMarbling !== '전체') {
      const marblingNo = partFilterMarbling.replace('No.', '');
      filtered = filtered.filter(p => p.grade.includes(`(${marblingNo})`));
    }
    
    return filtered;
  }, [selectedPartId, partProducts, partFilterCompany, partFilterType, partFilterGrade, partFilterMarbling]);

  // 부위 목록으로 돌아가기
  const handleBackToPartList = () => {
    setSelectedPartId(null);
    router.push('/auction?tab=part');
  };

  // 필터링된 상품 목록
  const filteredProducts = products.filter(product => {
    // 성별 필터
    if (selectedType !== '성별' && selectedType !== '전체' && product.type !== selectedType) return false;
    
    // 등급 필터 - gradeCategory로 매칭
    if (selectedGrade !== '등급' && selectedGrade !== '전체') {
      if (selectedGrade === '1++등급' && product.gradeCategory !== '1++') return false;
      if (selectedGrade === '1+등급' && product.gradeCategory !== '1+') return false;
      if (selectedGrade === '1등급' && product.gradeCategory !== '1') return false;
      if (selectedGrade === '2등급' && product.gradeCategory !== '2') return false;
    }
    
    // 업체명 필터
    if (selectedCompany !== '업체명' && selectedCompany !== '전체' && product.company !== selectedCompany) return false;
    
    // 근내지방도 필터 (grade에서 추출: 예 "1++A(9)" -> "No.9")
    if (selectedNo !== '근내지방도' && selectedNo !== '전체') {
      const marblingMatch = product.grade.match(/\((\d+)\)/);
      const productNo = marblingMatch ? `No.${marblingMatch[1]}` : '';
      if (productNo !== selectedNo) return false;
    }
    
    return true;
  });

  // 디버깅용 로그
  console.log('Filters:', { selectedType, selectedGrade, selectedNo });
  console.log('Filtered Products:', filteredProducts.length);

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
            
            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* 섹션 제목 - 부위별 상세에서는 숨김 */}
              {!(activeTab === 'part' && selectedPartId) && (
                <div className="px-4 pt-4 pb-2 bg-white flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">{getTodayFormatted()} 경매</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">마감까지</span>
                    <span className={`text-sm font-bold ${remainingTime <= 300 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatTime(remainingTime)}
                    </span>
                  </div>
                </div>
              )}
              
              {activeTab === 'individual' ? (
                <>
                  {/* 필터 섹션 */}
                  <div className="px-3 py-2 bg-white">
                    <div className="flex gap-1.5 relative filter-dropdown max-w-sm">
                      {/* 업체명 필터 */}
                      <div className="flex-1 relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'company' ? null : 'company')}
                          className="w-full h-8 px-2 text-[11px] border border-gray-300 rounded-lg bg-white transition-colors flex items-center justify-between"
                        >
                          <span className="text-gray-700 truncate">{selectedCompany}</span>
                          <motion.div
                            animate={{ rotate: openDropdown === 'company' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {openDropdown === 'company' && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-40 overflow-y-auto"
                            >
                              {['전체', '건화', '대진엠에스', '안심엘피씨', '정직한고기'].map((option) => (
                                <motion.button
                                  key={option}
                                  onClick={() => {
                                    setSelectedCompany(option);
                                    setOpenDropdown(null);
                                  }}
                                  whileHover={{ backgroundColor: '#fef2f2' }}
                                  className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                                    selectedCompany === option ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  {option}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* 한우 타입 필터 */}
                      <div className="flex-1 relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                          className="w-full h-8 px-2 text-[11px] border border-gray-300 rounded-lg bg-white transition-colors flex items-center justify-between"
                        >
                          <span className="text-gray-700 truncate">{selectedType}</span>
                          <motion.div
                            animate={{ rotate: openDropdown === 'type' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'type' && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
                            >
                              {['전체', '한우거세', '한우암'].map((option) => (
                                <motion.button
                                  key={option}
                                  onClick={() => {
                                    setSelectedType(option);
                                    setOpenDropdown(null);
                                  }}
                                  whileHover={{ backgroundColor: '#fef2f2' }}
                                  className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                                    selectedType === option ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  {option}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* 등급 필터 */}
                      <div className="flex-1 relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'grade' ? null : 'grade')}
                          className="w-full h-8 px-2 text-[11px] border border-gray-300 rounded-lg bg-white transition-colors flex items-center justify-between"
                        >
                          <span className="text-gray-700 truncate">{selectedGrade}</span>
                          <motion.div
                            animate={{ rotate: openDropdown === 'grade' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'grade' && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-40 overflow-y-auto"
                            >
                              {['전체', '1++등급', '1+등급', '1등급', '2등급'].map((option) => (
                                <motion.button
                                  key={option}
                                  onClick={() => {
                                    setSelectedGrade(option);
                                    setOpenDropdown(null);
                                  }}
                                  whileHover={{ backgroundColor: '#fef2f2' }}
                                  className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                                    selectedGrade === option ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  {option}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* 번호 필터 */}
                      <div className="flex-1 relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'no' ? null : 'no')}
                          className="w-full h-8 px-2 text-[11px] border border-gray-300 rounded-lg bg-white transition-colors flex items-center justify-between"
                        >
                          <span className="text-gray-700 truncate">{selectedNo}</span>
                          <motion.div
                            animate={{ rotate: openDropdown === 'no' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'no' && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
                            >
                              {['전체', 'No.9', 'No.8', 'No.7', 'No.6', 'No.5'].map((option) => (
                                <motion.button
                                  key={option}
                                  onClick={() => {
                                    setSelectedNo(option);
                                    setOpenDropdown(null);
                                  }}
                                  whileHover={{ backgroundColor: '#fef2f2' }}
                                  className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                                    selectedNo === option ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  {option}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* 메인 컨텐츠 영역 - 상품 목록 */}
                  <div className="px-3 pb-24 pt-4 flex-1 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-gray-500">조건에 맞는 상품이 없습니다.</p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <Link key={product.id} href={`/auction/${product.id}`} className="block">
                          <div className="bg-white rounded border border-gray-200 p-3 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex gap-3">
                              {/* 상품 이미지 */}
                              <div className="flex-shrink-0">
                                <div className="w-24 h-24 rounded bg-gray-200 overflow-hidden">
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
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-gray-300 text-gray-700">
                                      {product.type}
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-gray-300 text-gray-700">
                                      {product.grade}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="space-y-0.5">
                                  <p className="text-xs">
                                    <span className="font-bold text-gray-900">접수번호:</span> 
                                    <span className="text-gray-600 ml-1">{product.auctionNo}</span>
                                  </p>
                                  <p className="text-xs">
                                    <span className="font-bold text-gray-900">이력번호:</span> 
                                    <span className="text-gray-600 ml-1">{product.historyNo}</span>
                                  </p>
                                  <p className="text-xs">
                                    <span className="font-bold text-gray-900">업체명:</span> 
                                    <span className="text-gray-600 ml-1">{product.company}</span>
                                  </p>
                                  <p className="text-xs">
                                    <span className="font-bold text-gray-900">가공일자:</span> 
                                    <span className="text-gray-600 ml-1">{product.date}</span>
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
                  <div className="px-3 h-11 bg-white sticky top-0 z-30 flex items-center">
                    <button
                      onClick={() => router.push('/?tab=부위별')}
                      className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 text-center pr-6">
                      <h3 className="text-sm font-bold text-gray-900">{selectedPart.name}</h3>
                    </div>
                  </div>
                  

                  {/* 부위별 필터 - 드롭다운 + 칩 조합 */}
                  <div className="px-4 py-3 bg-white border-b border-gray-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* 등급 필터 */}
                      <span className="text-[13px] text-gray-500">등급</span>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'partGrade' ? null : 'partGrade')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium rounded-full border transition-all ${
                            partFilterGrade !== '등급' && partFilterGrade !== '전체'
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {partFilterGrade === '등급' ? '전체' : partFilterGrade}
                          <svg 
                            className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'partGrade' ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'partGrade' && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[110px] overflow-hidden"
                            >
                              {['전체', '1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'].map((option) => (
                                <button
                                  key={option}
                                  onClick={() => {
                                    setPartFilterGrade(option);
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full px-3.5 py-2.5 text-[13px] text-left transition-colors ${
                                    partFilterGrade === option
                                      ? 'bg-gray-100 text-gray-900 font-medium'
                                      : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* 구분선 */}
                      <div className="w-px h-5 bg-gray-200"></div>
                      
                      {/* 업체 필터 */}
                      <span className="text-[13px] text-gray-500">업체</span>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'partCompany' ? null : 'partCompany')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium rounded-full border transition-all ${
                            partFilterCompany !== '업체명' && partFilterCompany !== '전체'
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {partFilterCompany === '업체명' ? '전체' : partFilterCompany}
                          <svg 
                            className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'partCompany' ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'partCompany' && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[110px] overflow-hidden"
                            >
                              {['전체', '건화', '대진엠에스', '안심엘피씨', '정직한고기'].map((option) => (
                                <button
                                  key={option}
                                  onClick={() => {
                                    setPartFilterCompany(option);
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full px-3.5 py-2.5 text-[13px] text-left transition-colors whitespace-nowrap ${
                                    partFilterCompany === option
                                      ? 'bg-gray-100 text-gray-900 font-medium'
                                      : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* 필터 결과 카운트 */}
                      <span className="ml-auto text-[13px] text-gray-400">
                        {filteredPartProducts.length}개
                      </span>
                    </div>
                  </div>


                  {/* 부위별 상품 테이블 */}
                  <div className="flex-1 pb-24" data-scroll-container>
                    {/* 테이블 헤더 - sticky */}
                    <div className="bg-gray-100 border-b border-gray-200 h-9 flex items-center sticky top-11 z-10">
                      <div className="grid px-2 text-[13px] font-medium text-gray-500 w-full" style={{gridTemplateColumns: '0.85fr 0.6fr 0.85fr 0.95fr 0.95fr 0.5fr 0.5fr'}}>
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
                    {filteredPartProducts.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-gray-500">조건에 맞는 상품이 없습니다.</p>
                      </div>
                    ) : (
                      filteredPartProducts.map((product) => {
                        const bid = globalBids[product.listingNo];
                        const isExpanded = expandedProductId === product.id;
                        const isHighlighted = highlightedProductId === product.id;
                        return (
                          <div key={product.id} id={`product-row-${product.id}`} className={`${isHighlighted ? 'border-2 border-red-500' : ''}`}>
                            <div 
                              className={`grid px-2 py-3 border-b border-gray-100 cursor-pointer transition-colors items-center ${
                                bid?.status === 'highest' 
                                  ? 'bg-blue-50/50' 
                                  : bid?.status === 'secondHighest'
                                    ? 'bg-red-50/50'
                                    : 'bg-white hover:bg-gray-50'
                              }`}
                              style={{gridTemplateColumns: '0.85fr 0.6fr 0.85fr 0.95fr 0.95fr 0.5fr 0.5fr'}}
                              onClick={() => {
                                if (!isExpanded) {
                                  setHighlightedProductId(product.id);
                                }
                                setExpandedProductId(isExpanded ? null : product.id);
                              }}
                            >
                              <div className="text-center">
                                <div className="text-[13px] font-medium text-gray-900">{product.partName}</div>
                                <div className="text-[11px] text-gray-500 whitespace-nowrap">{product.type.includes('거세') ? '거세' : '암'} / {product.grade}</div>
                              </div>
                              <div className="text-center text-[13px] text-gray-700">
                                {product.weight}
                              </div>
                              <div className="text-center text-[13px] text-gray-700">
                                {product.price.toLocaleString()}
                              </div>
                              <div className="text-center text-[13px] font-medium text-gray-900">
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
                                          setSelectedProduct(product);
                                          setPartBidPrice(bid.highestBid + quickReBidAmount);
                                          setShowPartBidSheet(true);
                                        }
                                      }}
                                      className={`text-[13px] font-medium text-gray-900 leading-none ${bid.status !== 'highest' ? 'cursor-pointer' : ''}`}
                                    >
                                      {bid.myBid.toLocaleString()}
                                    </span>
                                    {bid.status !== 'highest' && (
                                      <button
                                        onClick={() => {
                                          setSelectedProduct(product);
                                          setPartBidPrice(bid.highestBid + quickReBidAmount);
                                          setShowPartBidSheet(true);
                                        }}
                                        className="mt-1 px-2 py-0.5 text-[11px] font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                                      >
                                        재입찰
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedProduct(product);
                                      setPartBidPrice(0);
                                      setShowPartBidSheet(true);
                                    }}
                                    className="px-2 py-1 text-[11px] font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                                  >
                                    입찰하기
                                  </button>
                                )}
                              </div>
                              <div className="text-center flex items-center justify-center">
                                {bid?.status === 'highest' ? (
                                  <span className="text-[11px] font-medium text-blue-600">최고순위</span>
                                ) : bid?.status === 'secondHighest' ? (
                                  <span className="text-[11px] font-medium text-red-500">차순위</span>
                                ) : (
                                  <span className="text-[13px] text-gray-400">-</span>
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
                                      ? 'text-gray-900' 
                                      : 'text-gray-400 hover:text-gray-700'
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
                                  className="overflow-hidden border-b border-gray-200"
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
                                    <div className="w-full aspect-square bg-gray-200">
                                      {(expandedImageIndex[product.id] || 0) === 4 ? (
                                        // 등급판정확인서
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 p-4">
                                          <div className="w-full max-w-[280px] bg-white shadow-lg border border-gray-300 p-4 aspect-[1/1.414]">
                                            <div className="h-full flex flex-col text-[8px] text-gray-700">
                                              <div className="text-center border-b border-gray-400 pb-2 mb-2">
                                                <p className="text-[12px] font-bold text-gray-900">등급판정확인서</p>
                                                <p className="text-gray-500 mt-1">Grade Certification</p>
                                              </div>
                                              <div className="flex-1 space-y-1.5">
                                                <div className="flex"><span className="w-16 text-gray-500">접수번호:</span><span className="font-medium">{product.auctionNo}</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">축종:</span><span>한우</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">성별:</span><span>{product.type.includes('거세') ? '거세' : '암'}</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">등급:</span><span className="font-bold text-gray-900">{product.grade}</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">개월령:</span><span>32개월</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">도체중량:</span><span>520kg</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">등지방:</span><span>16mm</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">등심면적:</span><span>123㎠</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">근내지방:</span><span>9</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">육색:</span><span>5</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">지방색:</span><span>3</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">조직감:</span><span>1</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">성숙도:</span><span>2</span></div>
                                              </div>
                                              <div className="border-t border-gray-300 pt-2 mt-2 text-center">
                                                <p className="text-gray-500">축산물품질평가원</p>
                                                <p className="text-[6px] text-gray-400 mt-1">본 확인서는 법적 효력이 있습니다</p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (expandedImageIndex[product.id] || 0) === 5 ? (
                                        // 도축검사증명서
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 p-4">
                                          <div className="w-full max-w-[280px] bg-white shadow-lg border border-gray-300 p-4 aspect-[1/1.414]">
                                            <div className="h-full flex flex-col text-[8px] text-gray-700">
                                              <div className="text-center border-b border-gray-400 pb-2 mb-2">
                                                <p className="text-[12px] font-bold text-gray-900">도축검사증명서</p>
                                                <p className="text-gray-500 mt-1">Slaughter Inspection Certificate</p>
                                              </div>
                                              <div className="flex-1 space-y-1.5">
                                                <div className="flex"><span className="w-16 text-gray-500">접수번호:</span><span className="font-medium">{product.auctionNo}</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">도축일:</span><span>2026.01.16</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">도축장:</span><span>음성축산물공판장</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">도축번호:</span><span>201</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">이력번호:</span><span>002-1486-7293-1</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">출하농가:</span><span>건화</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">검사결과:</span><span className="font-bold text-green-600">적합</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">검사항목:</span><span>일반검사</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">생체중량:</span><span>720kg</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">도체중량:</span><span>520kg</span></div>
                                                <div className="flex"><span className="w-16 text-gray-500">지육율:</span><span>72.2%</span></div>
                                              </div>
                                              <div className="border-t border-gray-300 pt-2 mt-2 text-center">
                                                <p className="text-gray-500">농림축산검역본부</p>
                                                <p className="text-[6px] text-gray-400 mt-1">본 증명서는 법적 효력이 있습니다</p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        // 일반 이미지
                                        <img 
                                          src={`/등심${((expandedImageIndex[product.id] || 0) % 4) + 1}.png`}
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
                                            setExpandedImageIndex(prev => ({ ...prev, [product.id]: index }));
                                          }}
                                          className={`w-2 h-2 rounded-full transition-colors ${
                                            (expandedImageIndex[product.id] || 0) === index ? 'bg-white' : 'bg-white/50'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  {/* 썸네일 이미지 */}
                                  <div className="px-3 py-2">
                                    <div className="flex gap-1.5 justify-start overflow-x-auto">
                                      {/* 등심 이미지 4개 */}
                                      {[1,2,3,4].map((num, index) => (
                                        <button
                                          key={index}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedImageIndex(prev => ({ ...prev, [product.id]: index }));
                                          }}
                                          className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                            (expandedImageIndex[product.id] || 0) === index 
                                              ? 'border-2 border-gray-400' 
                                              : 'border-2 border-transparent hover:border-gray-300'
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
                                          setExpandedImageIndex(prev => ({ ...prev, [product.id]: 4 }));
                                        }}
                                        className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                          (expandedImageIndex[product.id] || 0) === 4 
                                            ? 'border-2 border-gray-400' 
                                            : 'border-2 border-transparent hover:border-gray-300'
                                        }`}
                                      >
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                          <div className="w-8 h-10 bg-white border border-gray-300"></div>
                                        </div>
                                      </button>
                                      {/* 도축검사증명서 썸네일 */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedImageIndex(prev => ({ ...prev, [product.id]: 5 }));
                                        }}
                                        className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                                          (expandedImageIndex[product.id] || 0) === 5 
                                            ? 'border-2 border-gray-400' 
                                            : 'border-2 border-transparent hover:border-gray-300'
                                        }`}
                                      >
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                          <div className="w-8 h-10 bg-white border border-gray-300"></div>
                                        </div>
                                      </button>
                                    </div>
                                  </div>

                                  {/* 개체정보 패널 - 테이블 형식 */}
                                  <div className="px-3 py-3 border-t border-gray-200">
                                    {/* 첫 번째 테이블: 등급 정보 */}
                                    <div className="bg-white border border-gray-200 rounded overflow-hidden mb-2">
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr className="bg-gray-100/80 border-b border-gray-200">
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">등급</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">개월령</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">등지방</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">등심면적</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">근내지방</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">육색</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">지방색</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">조직감</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">성숙도</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td className="py-2 px-1 text-center text-gray-700">{product.grade}</td>
                                            <td className="py-2 px-1 text-center text-gray-700">32</td>
                                            <td className="py-2 px-1 text-center text-gray-700">16</td>
                                            <td className="py-2 px-1 text-center text-gray-700">123</td>
                                            <td className="py-2 px-1 text-center text-gray-700">9</td>
                                            <td className="py-2 px-1 text-center text-gray-700">5</td>
                                            <td className="py-2 px-1 text-center text-gray-700">3</td>
                                            <td className="py-2 px-1 text-center text-gray-700">1</td>
                                            <td className="py-2 px-1 text-center text-gray-700">2</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* 두 번째 테이블: 도축/가공 정보 */}
                                    <div className="bg-white border border-gray-200 rounded overflow-hidden">
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr className="bg-gray-100/80 border-b border-gray-200">
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">이력번호</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">도축장</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">도축번호</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">도체중</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">상장업체</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">가공일</th>
                                            <th className="py-1.5 px-1 text-center font-medium text-gray-500">가공중량</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td className="py-2 px-1 text-center text-gray-700">002-1486-7293-1</td>
                                            <td className="py-2 px-1 text-center text-gray-700">음성</td>
                                            <td className="py-2 px-1 text-center text-gray-700">201</td>
                                            <td className="py-2 px-1 text-center text-gray-700">520</td>
                                            <td className="py-2 px-1 text-center text-gray-700">건화</td>
                                            <td className="py-2 px-1 text-center text-gray-700">26.01.17</td>
                                            <td className="py-2 px-1 text-center text-gray-700">312</td>
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProduct(product);
                                        setPartBidPrice(product.price);
                                        setShowPartBidSheet(true);
                                      }}
                                      className="px-3 py-1.5 text-xs font-bold rounded bg-gray-800 text-white hover:bg-gray-900 transition-colors"
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
                          onClick={() => setShowPartBidSheet(false)}
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
                              <td className="py-2.5 px-1.5 text-center text-gray-700 whitespace-nowrap">{selectedProduct.listingNo}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700">한우</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700">{selectedProduct.type?.includes('거세') ? '거세' : '암'}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700">{selectedProduct.grade}</td>
                              <td className="py-2.5 px-1.5 text-center text-gray-700">30</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">{selectedProduct.partName}</td>
                              <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">{selectedProduct.weight}</td>
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
                            value={partBidPrice > 0 ? partBidPrice.toLocaleString('ko-KR') : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                              setPartBidPrice(value ? parseInt(value) : 0);
                            }}
                            className="w-full px-4 py-3.5 pr-12 text-right text-xl font-bold border border-gray-200 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white text-black placeholder:text-gray-400"
                            placeholder={selectedProduct?.price ? `최저단가 ${selectedProduct.price.toLocaleString()}` : '0'}
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
                                setPartBidPrice(prev => {
                                  // 0이면 최고입찰가 또는 최저단가에서 시작
                                  if (prev === 0 && selectedProduct) {
                                    const bidInfo = globalBids[selectedProduct.listingNo];
                                    const basePrice = bidInfo?.highestBid || selectedProduct.price || 0;
                                    return basePrice + amount;
                                  }
                                  return prev + amount;
                                });
                              }}
                              className="py-2 text-xs border border-gray-200 rounded hover:bg-gray-50 font-medium text-gray-700"
                            >
                              +{amount.toLocaleString()}
                            </button>
                          ))}
                          <button
                            onClick={() => setPartBidPrice(0)}
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
                            {partBidPrice > 0 && selectedProduct.weight 
                              ? `${(partBidPrice * parseFloat(selectedProduct.weight)).toLocaleString()}원`
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
                        className="w-full py-3.5 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-base rounded"
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
                <div className="bg-white rounded w-full max-w-md mx-4">
                  {/* 다이얼로그 헤더 */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">입찰 내용을 확인해 주세요</h3>
                  </div>
                  
                  {/* 다이얼로그 내용 */}
                  <div className="px-6 py-4">
                    {/* 개체 정보 테이블 */}
                    <div className="border border-gray-200 rounded overflow-hidden overflow-x-auto mb-4">
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
                            <td className="py-2.5 px-1.5 text-center text-gray-700 whitespace-nowrap">{selectedProduct.listingNo}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">한우</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">{selectedProduct.type?.includes('거세') ? '거세' : '암'}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">{selectedProduct.grade}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">30</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">{selectedProduct.partName}</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">{selectedProduct.weight}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 입찰 금액 정보 */}
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">입찰가격</span>
                        <span className="text-sm font-medium text-gray-900">{partBidPrice.toLocaleString()}원/kg</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-bold text-gray-900">총 입찰금액</span>
                        <span className="text-lg font-bold text-gray-900">
                          {(partBidPrice * parseFloat(selectedProduct.weight)).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 다이얼로그 버튼 */}
                  <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                    <button
                      onClick={() => setShowPartBidDialog(false)}
                      className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        // 입찰 처리 - 내 입찰가가 최고입찰가가 됨
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
                        
                        setShowPartBidDialog(false);
                        setShowPartBidSheet(false);
                        showToastMessage('입찰이 완료되었습니다.', 'success');
                      }}
                      className="flex-1 py-2.5 px-4 bg-gray-800 text-white rounded font-medium hover:bg-gray-900 transition-colors"
                    >
                      입찰하기
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
                ? 'bg-white border border-gray-200 text-gray-800' 
                : 'bg-gray-800 text-white'
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-gray-500">로딩 중...</div></div>}>
      <AuctionPageContent />
    </Suspense>
  );
}