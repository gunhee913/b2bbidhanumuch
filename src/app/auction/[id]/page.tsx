'use client';

import { useState, useEffect, useRef, use, useMemo, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart,
  ArrowRight,
  Play,
  Pause,
  ArrowLeft,
  Edit2,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Star
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { useBidStore } from '@/stores/bidStore';
import { getTodayDateCode, getTodayTimeFormatted } from '@/constants/auction';
import { useAuctionAuth } from '@/hooks/useAuctionAuth';
import { AuctionPasswordModal } from '@/components/auth/AuctionPasswordModal';
import { useListingByNo, useListings } from '@/features/listings/hooks';
import { format } from 'date-fns';
import { formatGrade } from '@/lib/utils';
import { useCreateBid } from '@/features/auctions/hooks';
import { useSession } from 'next-auth/react';
import { useRealtimeBids } from '@/hooks/useRealtimeBids';

interface PageProps {
  params: Promise<{ id: string }>;
}

function AuctionDetailContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMyBids = searchParams.get('from') === 'myBids';

  // DB에서 상장 정보 조회
  const { data: listingData, isLoading: listingLoading, error: listingError, refetch: refetchListing } = useListingByNo(resolvedParams.id);

  // 실시간 입찰 변경 구독 (Optimistic Update)
  // payload가 있으면 캐시에서 이미 업데이트됨, 없으면(DELETE) refetch
  const handleBidChange = useCallback((payload?: { partId: string; bidPrice: number; dealerId: string }) => {
    if (!payload) {
      console.log('[Auction Detail] 입찰 삭제 감지 - 데이터 새로고침');
      refetchListing();
    } else {
      console.log('[Auction Detail] 입찰 변경 감지 - 캐시 업데이트 완료:', payload.bidPrice);
    }
  }, [refetchListing]);
  
  useRealtimeBids({
    onBidChange: handleBidChange,
    enabled: true,
  });

  // DB 데이터 기반 개체 정보
  const currentCattle = useMemo(() => {
    const data = listingData as any;
    if (!data) {
      return {
        id: resolvedParams.id,
        type: '한우',
        gender: '거세',
        grade: '1++(9)',
        months: 30,
        company: '상장업체',
        traceNo: '',
        carcassWeight: 0,
        backFat: 0,
        eyeMuscle: 0,
        marblingScore: 0,
        meatColor: 0,
        fatColor: 0,
        texture: 0,
        maturity: 0,
        slaughterHouse: '',
        slaughterDate: '',
        slaughterNo: '',
        processDate: '',
        processWeight: 0,
      };
    }
    return {
      id: data.listingNo,
      type: data.breed || '한우',
      gender: data.gender || '거세',
      grade: data.grade || '1++',
      months: data.monthAge || 30,
      company: data.company?.name || '상장업체',
      traceNo: data.traceNo || '',
      carcassWeight: data.carcassWeight || 0,
      backFat: data.backFat || 0,
      eyeMuscle: data.eyeMuscle || 0,
      marblingScore: data.marblingScore || 0,
      meatColor: data.meatColor || 0,
      fatColor: data.fatColor || 0,
      texture: data.texture || 0,
      maturity: data.maturity || 0,
      slaughterHouse: data.slaughterHouse || '',
      slaughterDate: data.slaughterDate || '',
      slaughterNo: data.slaughterNo || '',
      processDate: data.processDate || '',
      processWeight: data.processWeight || 0,
    };
  }, [listingData, resolvedParams.id]);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const { data: allListings } = useListings({
    status: 'approved,auction,closed,completed' as any,
    listingDateFrom: todayStr,
    listingDateTo: todayStr,
  });

  const { prevListingNo, nextListingNo } = useMemo(() => {
    if (!allListings || allListings.length === 0) return { prevListingNo: null, nextListingNo: null };
    const sorted = [...allListings].sort((a: any, b: any) => {
      const suffixA = parseInt((a.listingNo || '0').split('-').pop() || '0', 10);
      const suffixB = parseInt((b.listingNo || '0').split('-').pop() || '0', 10);
      return suffixA - suffixB;
    });
    const idx = sorted.findIndex((l: any) => l.listingNo === resolvedParams.id);
    return {
      prevListingNo: idx > 0 ? sorted[idx - 1].listingNo : null,
      nextListingNo: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1].listingNo : null,
    };
  }, [allListings, resolvedParams.id]);

  // 세션 정보 (중도매인 ID 가져오기)
  const { data: session } = useSession();
  // 중도매인으로 로그인하면 session.dealer, 직원으로 로그인하면 session.employee
  const dealer = (session as any)?.dealer;
  const employee = (session as any)?.employee;
  const dealerId = dealer?.id || employee?.dealerId || null;

  // 입찰 생성 훅
  const createBid = useCreateBid();

  // zustand 스토어에서 설정 관련 상태 가져오기
  const { 
    quickReBidAmount, 
    setQuickReBidAmount,
    isSecondBidNotificationOn,
    setIsSecondBidNotificationOn,
    toggleFavorite,
    isFavorite
  } = useBidStore();

  // 경매 비밀번호 인증
  const {
    isVerified: isAuctionVerified,
    isVerifying,
    error: auctionAuthError,
    verifyAuctionPassword,
    requireAuctionAuth,
    showModal: showAuctionAuthModal,
    setShowModal: setShowAuctionAuthModal,
  } = useAuctionAuth();
  
  // hydration 완료 여부
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedBidTab, setSelectedBidTab] = useState(fromMyBids ? '개체정보' : '입찰하기');
  const [myBidHistoryTab, setMyBidHistoryTab] = useState('입찰 진행 중');
  const [showBidSheet, setShowBidSheet] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [roundInfo, setRoundInfo] = useState<{
    currentRound: any;
    lastClosedRound: any;
    allRounds: any[];
    totalRounds: number;
    roundListingMap: Record<string, number>;
  } | null>(null);
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [bidPrice, setBidPrice] = useState('');
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'warning' | 'success'>('warning');
  const [showQuickReBidEdit, setShowQuickReBidEdit] = useState(false);
  const [tempQuickReBidAmount, setTempQuickReBidAmount] = useState('1,000');
  const [showReBidDialog, setShowReBidDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState('');
  const [showSecondBidDialog, setShowSecondBidDialog] = useState(false);
  const [secondBidInfo, setSecondBidInfo] = useState<any>(null);
  
  // 스크롤 방향에 따른 헤더 숨김/표시
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 입찰내역 테이블 드래그 스크롤
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

  // 천단위 콤마 추가 함수
  const formatNumber = (value: string) => {
    // 숫자만 추출
    const number = value.replace(/[^\d]/g, '');
    // 천단위 콤마 추가
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 콤마 제거 함수
  const removeCommas = (value: string) => {
    return value.replace(/,/g, '');
  };

  // 입찰 취소 함수 (로컬 상태용)
  const cancelBid = (bidId: number) => {
    setMyBids(prev => 
      prev.map(bid => 
        bid.id === bidId ? { ...bid, status: 'cancelled' } : bid
      )
    );
  };

  // 입찰 취소 API 호출
  const [cancellingBidId, setCancellingBidId] = useState<string | null>(null);
  const handleCancelBid = async (bidId: string, partName: string) => {
    if (!confirm(`${partName} 입찰을 취소하시겠습니까?`)) return;

    setCancellingBidId(bidId);
    try {
      const res = await fetch(`/api/bids/${bidId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        showToastMessage(data.error || '입찰 취소에 실패했습니다.', 'warning');
        return;
      }

      showToastMessage(`${partName} 입찰이 취소되었습니다.`, 'success');
      refetchListing();
    } catch {
      showToastMessage('입찰 취소 중 오류가 발생했습니다.', 'warning');
    } finally {
      setCancellingBidId(null);
    }
  };

  // 토스트 표시 함수
  const showToastMessage = (message: string, type: 'warning' | 'success' = 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // 부위별 최저단가 (DB 데이터 기반, 폴백용 기본값 포함)
  const defaultMinPrices: Record<string, number> = {
    '등심(좌)': 85000, '등심(우)': 85000,
    '안심': 95000,
    '채끝': 82000,
    '치마': 65000, '부채': 60000,
    '업진': 55000, '토시·제비': 70000,
    '설도(좌)': 56000, '설도(우)': 56000,
    '앞다리': 55000,
    '우둔': 58000,
    '목심': 62000,
    '양지(좌)': 52000, '양지(우)': 52000,
    '사태': 48000,
    '꼬리': 35000,
    '족': 25000,
    '사골': 20000,
    '잡뼈': 15000
  };

  // DB에서 가져온 부위 정보로 최저단가 맵 생성
  const baseMinPrices = useMemo(() => {
    if (!listingData?.parts) return defaultMinPrices;
    const priceMap: Record<string, number> = { ...defaultMinPrices };
    listingData.parts.forEach((part: any) => {
      if (part.minPrice) {
        priceMap[part.partName] = part.minPrice;
      }
    });
    return priceMap;
  }, [listingData?.parts]);

  // TIME 문자열(HH:mm:ss) → "HH:mm" 포맷
  const formatRoundTime = (time: string | null) => {
    if (!time) return null;
    return time.slice(0, 5);
  };

  // 회차의 경매시간 문자열 생성
  const getRoundTimeStr = (round: any) => {
    const start = formatRoundTime(round?.start_time);
    const end = formatRoundTime(round?.end_time);
    if (start && end) return `경매시간 ${start} ~ ${end}`;
    if (start) return `경매시간 ${start} ~`;
    return null;
  };

  // 입찰 가능 여부 판단 (경매 상태 기반)
  const { canBid, bidStatusMessage } = useMemo(() => {
    const allRounds = roundInfo?.allRounds || [];
    const listingMap = roundInfo?.roundListingMap || {};
    const listingId = listingData?.id;

    if (allRounds.length > 0 && listingId) {
      const listingRoundNo = listingMap[listingId];

      if (!listingRoundNo) {
        return { canBid: false, bidStatusMessage: '경매에 등록되지 않은 개체입니다' };
      }

      const listingRound = allRounds.find((r: any) => r.round_no === listingRoundNo);

      if (listingRound?.status === 'open') {
        return { canBid: true, bidStatusMessage: '' };
      }

      if (listingRound?.status === 'closed') {
        return { canBid: false, bidStatusMessage: '경매가 마감되었습니다' };
      }

      return { canBid: false, bidStatusMessage: '경매 대기중' };
    }

    if (listingData?.status === 'completed') {
      return { canBid: false, bidStatusMessage: '경매가 마감되었습니다' };
    }

    if (!roundInfo) {
      return { canBid: false, bidStatusMessage: '' };
    }

    return { canBid: false, bidStatusMessage: '' };
  }, [roundInfo, listingData?.id, listingData?.status]);

  // 입찰하기 버튼 클릭 처리
  const handleBidClick = () => {
    if (!selectedPart) {
      showToastMessage('부위를 선택해주세요.');
      return;
    }
    if (!selectedWeight) {
      showToastMessage('중량을 선택해주세요.');
      return;
    }
    if (!bidPrice) {
      showToastMessage('입찰가격을 입력해주세요.');
      return;
    }
    
    const priceValue = parseInt(removeCommas(bidPrice));
    if (priceValue < 100) {
      showToastMessage('최소 입찰가격은 100원입니다.');
      return;
    }
    
    
    // 최저단가 체크
    const minPrice = baseMinPrices[selectedPart] || 50000;
    if (priceValue < minPrice) {
      showToastMessage(`최저단가(${minPrice.toLocaleString()}원) 이상으로 입찰해주세요.`);
      return;
    }
    
    // 경매 비밀번호 인증 후 입찰 다이얼로그 표시
    requireAuctionAuth(() => {
      setShowBidDialog(true);
    });
  };

  // 입찰 추가 함수
  const addNewBid = async () => {
    if (!selectedPart || !selectedWeight || !bidPrice) {
      return;
    }

    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const timeString = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.(${days[now.getDay()]}) ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // 선택된 부위의 정보 가져오기
    const selectedPartData = partsData.find(p => p.part === selectedPart);
    const listingNo = selectedPartData?.listingNo || '';
    const partId = selectedPartData?.partId; // DB 부위 ID
    
    const myPrice = parseInt(removeCommas(bidPrice));
    
    // 로그인 체크
    if (!dealerId) {
      showToastMessage('로그인 후 입찰할 수 있습니다.');
      setShowBidDialog(false);
      return;
    }
    
    // 부위 ID 체크 (DB 연동된 상장만 입찰 가능)
    if (!partId) {
      showToastMessage('입찰할 수 없는 상장입니다.');
      setShowBidDialog(false);
      return;
    }
    
    // DB에 입찰
    try {
      await createBid.mutateAsync({
        partId: partId,
        dealerId: dealerId,
        bidPrice: myPrice,
        weight: parseFloat(selectedWeight),
      });
      
      setShowBidDialog(false);
      showToastMessage('입찰이 완료되었습니다.', 'success');
      
      // 폼 초기화
      setSelectedPart('');
      setSelectedWeight('');
      setBidPrice('0');
      
      // DB 데이터 새로고침
      refetchListing();
    } catch (error: any) {
      showToastMessage(error.message || '입찰 중 오류가 발생했습니다.');
    }
    
    // 폼 초기화
    setSelectedPart('');
    setSelectedWeight('');
    setBidPrice('0');
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
    const finalPrice = selectedBid.reBidPrice || parseInt(customBidPrice.replace(/,/g, ''));
    
    // 유효성 검사
    if (finalPrice <= selectedBid.topBidPrice) {
      showToastMessage('현재 최고가보다 높은 금액을 입력해주세요.');
      return;
    }
    
    
    // 입찰 내역 업데이트
    setMyBids(prevBids => 
      prevBids.map(bid => {
        if (bid.id === selectedBid.id) {
          const now = new Date();
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          const timeString = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.(${days[now.getDay()]}) ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          return {
            ...bid,
            price: finalPrice.toString(),
            topBidPrice: finalPrice,
            totalAmount: Math.round(finalPrice * parseFloat(bid.weight)).toString(),
            time: timeString
          };
        }
        return bid;
      })
    );

    // 토스트 메시지 표시
    showToastMessage(`재입찰이 완료되었습니다. (${finalPrice.toLocaleString()}원/kg)`, 'success');

    setShowReBidDialog(false);
    setSelectedBid(null);
    setCustomBidPrice('');
  };

  // 폴백용 기본 이미지 (증명서는 실제 데이터가 있을 때만 표시)
  const defaultImages = [
    { id: 1, src: "/등심1.png", alt: "등심1" },
    { id: 2, src: "/등심2.png", alt: "등심2" },
    { id: 3, src: "/등심3.png", alt: "등심3" },
    { id: 4, src: "/등심4.png", alt: "등심4" },
  ];

  // DB 기반 이미지 배열 (있으면 DB, 없으면 폴백)
  const mainImages = useMemo(() => {
    const data = listingData as any;
    
    // DB 이미지가 있으면 사용
    if (data?.images && data.images.length > 0) {
      const dbImages = data.images.map((img: any, idx: number) => ({
        id: idx + 1,
        src: img.url || img, // URL 형식 또는 문자열
        alt: img.name || `상품 이미지 ${idx + 1}`,
        isDocument: false,
      }));
      
      // 서류 이미지 추가 (증명서가 있을 때만)
      if (data.gradeCert?.fileData) {
        dbImages.push({
          id: dbImages.length + 1,
          src: data.gradeCert.fileData,
          alt: '등급판정확인서',
          isDocument: true,
          isGradeCert: true,
        });
      }
      
      if (data.slaughterCert?.fileData) {
        dbImages.push({
          id: dbImages.length + 1,
          src: data.slaughterCert.fileData,
          alt: '도축검사증명서',
          isDocument: true,
          isSlaughterCert: true,
        });
      }
      
      return dbImages.map((img: any) => ({
        ...img,
        auctionNo: data.listingNo || resolvedParams.id,
      }));
    }
    
    // 폴백: 기본 이미지 사용 (증명서 제외)
    const id = parseInt(resolvedParams.id.split('-')[1] || '1');
    const patterns: number[][] = [
      [0, 1, 2, 3],
      [1, 3, 0, 2],
      [2, 0, 3, 1],
      [3, 2, 1, 0],
      [1, 0, 3, 2],
    ];
    const patternIndex = (id - 1) % patterns.length;
    const pattern = patterns[patternIndex];
    
    return pattern.map(imageIndex => ({
      ...defaultImages[imageIndex],
      auctionNo: `${getTodayDateCode()}-${String(id).padStart(3, '0')}`
    }));
  }, [listingData, resolvedParams.id]);

  // DB 기반 부위 데이터 (있으면 DB, 없으면 폴백)
  const partsData = useMemo(() => {
    // DB 데이터가 있으면 사용
    if (listingData?.parts && listingData.parts.length > 0) {
      return listingData.parts
        .filter((part: any) => part.isIncluded)
        .map((part: any) => ({
          part: part.partName,
          weight: part.weight?.toFixed(1) || '0.0',
          listingNo: part.listingPartNo || `${(listingData as any).listingNo}-${String(part.partNo).padStart(2, '0')}`,
          minPrice: part.minPrice || defaultMinPrices[part.partName] || 50000,
          partId: part.id,
          myBid: part.myBid || null,
          highestBidPrice: part.highestBid?.bidPrice || null,
          bidCount: part.bidCount || 0,
          hasWinner: !!part.hasWinner,
        }));
    }
    
    // 폴백: 기존 더미 데이터 생성 로직
    const id = parseInt(resolvedParams.id.split('-')[1] || '1');
    const partsWithRange = [
      { part: '등심(좌)', min: 15.0, max: 16.0 },
      { part: '등심(우)', min: 15.0, max: 16.0 },
      { part: '안심', min: 4.0, max: 5.0 },
      { part: '채끝', min: 7.5, max: 8.5 },
      { part: '치마', min: 3.5, max: 4.5 },
      { part: '부채', min: 2.5, max: 3.5 },
      { part: '업진', min: 4.0, max: 5.0 },
      { part: '토시·제비', min: 1.5, max: 2.5 },
      { part: '앞다리', min: 24.0, max: 26.0 },
      { part: '우둔', min: 20.0, max: 22.0 },
      { part: '목심', min: 14.0, max: 15.0 },
      { part: '양지(좌)', min: 12.0, max: 13.0 },
      { part: '양지(우)', min: 12.0, max: 13.0 },
      { part: '설도(좌)', min: 16.0, max: 17.5 },
      { part: '설도(우)', min: 16.0, max: 17.5 },
      { part: '사태', min: 14.5, max: 15.5 },
      { part: '꼬리', min: 15.5, max: 16.5 },
      { part: '족', min: 10.0, max: 11.0 },
      { part: '사골', min: 3.0, max: 4.0 },
      { part: '잡뼈', min: 21.0, max: 23.0 }
    ];

    return partsWithRange.map((item, index) => {
      const variation = ((id + index) * 0.17) % 1;
      const weight = item.min + (item.max - item.min) * variation;
      const idParts = resolvedParams.id.split('-');
      const idSuffix = idParts.length > 1 ? idParts[1] : resolvedParams.id;
      const partNumber = String(index + 1).padStart(2, '0');
      return {
        part: item.part,
        weight: weight.toFixed(1),
        listingNo: `${getTodayDateCode()}-${idSuffix}-${partNumber}`,
        minPrice: defaultMinPrices[item.part] || 50000,
        partId: undefined as string | undefined,
        myBid: null as { bidId?: string; bidPrice: number; bidAmount: number } | null,
        highestBidPrice: null as number | null,
        bidCount: 0,
        hasWinner: false,
      };
    });
  }, [listingData, resolvedParams.id]);

  // 낙찰자 결정 여부에 따라 부위 분리: 상단(진행중) / 하단(낙찰 결정됨)
  const { activeParts, settledParts } = useMemo(() => {
    const active: typeof partsData = [];
    const settled: typeof partsData = [];
    partsData.forEach(item => {
      if (item.hasWinner) {
        settled.push(item);
      } else {
        active.push(item);
      }
    });
    return { activeParts: active, settledParts: settled };
  }, [partsData]);

  // DB 기반 경매 정보
  const currentAuctionInfo = useMemo(() => {
    if (listingData) {
      return {
        auctionNumber: listingData.listingNo,
        breed: listingData.gender === '암' ? '한우암' : '한우거세',
        grade: listingData.grade || '1++',
        months: String(listingData.monthAge || 30),
      };
    }
    
    // 폴백
    const id = parseInt(resolvedParams.id.split('-')[1] || '1');
    const breeds = ['한우거세', '한우암', '한우거세', '한우거세', '한우암'];
    const qualityGrades = ['1++', '1++', '1+', '1++', '1+'];
    const yieldGrades = ['A', 'B', 'A', 'A', 'C'];
    const marbling = ['9', '8', '7', '9', '8'];
    const months = ['30', '28', '32', '29', '31'];
    
    return {
      auctionNumber: resolvedParams.id,
      breed: breeds[(id - 1) % breeds.length],
      grade: `${qualityGrades[(id - 1) % qualityGrades.length]}${yieldGrades[(id - 1) % yieldGrades.length]}(${marbling[(id - 1) % marbling.length]})`,
      months: months[(id - 1) % months.length]
    };
  }, [listingData, resolvedParams.id]);

  // 입찰 내역 상태 (DB 연동 후에는 실제 입찰 내역 사용)
  const [myBids, setMyBids] = useState<any[]>([]);
  
  // 부위별 입찰 정보는 zustand 스토어(globalBids)에서 관리

  // 다음/이전 개체(경매)로 이동
  const MAX_AUCTION_ID = 5; // 최대 경매 개체 수
  
  const goToNextAuction = () => {
    const currentId = parseInt(resolvedParams.id);
    if (currentId < MAX_AUCTION_ID) {
      router.push(`/auction/${currentId + 1}`);
    }
  };

  const goToPrevAuction = () => {
    const currentId = parseInt(resolvedParams.id);
    if (currentId > 1) {
      router.push(`/auction/${currentId - 1}`);
    }
  };

  // 스와이프/드래그 관련 상태
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 다음 이미지로 이동
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % mainImages.length);
  };

  // 이전 이미지로 이동
  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + mainImages.length) % mainImages.length);
  };

  // 터치 핸들러 (모바일)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX; // 시작 위치로 초기화
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 80; // 최소 스와이프 거리 (클릭 방지)

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // 왼쪽으로 스와이프 - 다음 이미지
        nextImage();
      } else {
        // 오른쪽으로 스와이프 - 이전 이미지
        prevImage();
      }
    }
    
    // 값 초기화
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // 마우스 핸들러 (웹)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX; // 시작 위치로 초기화
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    touchEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 80; // 최소 드래그 거리 (클릭 방지)

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // 왼쪽으로 드래그 - 다음 이미지
        nextImage();
      } else {
        // 오른쪽으로 드래그 - 이전 이미지
        prevImage();
      }
    }
    
    isDragging.current = false;
    // 값 초기화
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    // 값 초기화
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // 배너 데이터 (빈 상태)
  const banners = [
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" }
  ];



  // 회차별 경매 정보 폴링 (5초 간격, 상장일 기준)
  const listingDateStr = (listingData as any)?.listingDate || format(new Date(), 'yyyy-MM-dd');
  useEffect(() => {
    const fetchRoundInfo = async () => {
      try {
        const res = await fetch(`/api/auctions/rounds/current?date=${listingDateStr}`);
        if (res.ok) {
          const data = await res.json();
          setRoundInfo(data);
        }
      } catch {}
    };
    fetchRoundInfo();
    const interval = setInterval(fetchRoundInfo, 5000);
    return () => clearInterval(interval);
  }, [listingDateStr]);

  // 자동 마감 처리용 ref (중복 호출 방지)
  const closingRoundRef = useRef<string | null>(null);

  // 타이머 계산 (회차 기반)
  // started_at이 미래(텀 대기중)일 수 있으므로, 경매 시작 전에는 텀 카운트다운 표시
  useEffect(() => {
    const cr = roundInfo?.currentRound;
    if (!cr?.started_at || !cr?.round_duration_min) {
      setRemainingTime(null);
      return;
    }

    const calculateRemaining = () => {
      const now = Date.now();
      const startedAt = new Date(cr.started_at).getTime();
      const durationMs = cr.round_duration_min * 60 * 1000;

      if (startedAt > now) {
        // 텀 대기중: 경매 시작까지 남은 시간 + 경매 시간
        setRemainingTime(cr.round_duration_min * 60);
      } else {
        // 경매 진행중: 실제 남은 시간
        const remaining = Math.max(0, Math.floor((startedAt + durationMs - now) / 1000));
        setRemainingTime(remaining);
      }
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [roundInfo?.currentRound?.id, roundInfo?.currentRound?.started_at]);

  // 타이머 만료 시 자동 마감 (null은 미계산 상태이므로 무시, 텀 대기중도 무시)
  useEffect(() => {
    const cr = roundInfo?.currentRound;
    if (remainingTime === null || remainingTime > 0) return;
    if (!cr?.id || !cr?.started_at) return;
    // 텀 대기중(started_at이 미래)이면 마감하지 않음
    if (new Date(cr.started_at).getTime() > Date.now()) return;
    if (closingRoundRef.current === cr.id) return;

    closingRoundRef.current = cr.id;

    const autoClose = async () => {
      try {
        await fetch(`/api/auctions/${cr.id}/close`, { method: 'POST' });
        const res = await fetch(`/api/auctions/rounds/current?date=${listingDateStr}`);
        if (res.ok) setRoundInfo(await res.json());
      } catch {
        closingRoundRef.current = null;
      }
    };
    autoClose();
  }, [remainingTime, roundInfo?.currentRound?.id, roundInfo?.currentRound?.started_at]);

  // 시간 포맷팅 함수
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs.toString().padStart(2, '0')}초`;
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

  // 로딩 상태 (에러 시에도 폴백 데이터로 표시하므로 에러 화면 제거)
  if (listingLoading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-[9999]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">상장 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // DB 조회 실패 시 폴백 데이터 사용 (에러 화면 대신 기본 데이터로 표시)

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
              {/* 헤더 */}
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 transition-colors">
                {/* 1줄: 뒤로가기 + 회차정보 + 관심 */}
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <button
                    onClick={() => router.push('/?tab=개체별')}
                    className="p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="뒤로가기"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </button>

                  {roundInfo === null ? (
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5">
                      <div className="w-16 h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ) : roundInfo?.currentRound && remainingTime !== null && remainingTime > 0 ? (
                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5">
                      <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                        경매 진행중
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${
                        remainingTime <= 60 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {formatTime(remainingTime)}
                      </span>
                    </div>
                  ) : roundInfo?.lastClosedRound ? (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-0.5">
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        {roundInfo.lastClosedRound.round_no}차 경매 마감
                      </span>
                    </div>
                  ) : null}

                  <button
                    onClick={() => toggleFavorite(currentCattle.id)}
                    className={`p-1 rounded transition-colors ${
                      isHydrated && isFavorite(currentCattle.id)
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    aria-label="관심 등록"
                  >
                    <Star className={`w-5 h-5 ${isHydrated && isFavorite(currentCattle.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* 2줄: ◀ [접수번호 + 개체정보] ▶ */}
                <div className="flex items-center justify-center px-6 pb-2">
                  <button
                    onClick={() => prevListingNo && router.replace(`/auction/${prevListingNo}`)}
                    disabled={!prevListingNo}
                    className="p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 disabled:pointer-events-none flex-shrink-0"
                    aria-label="이전 개체"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </button>

                  <div className="flex-1 text-center min-w-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-wide">
                      {currentCattle.id}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {currentCattle.type} / {currentCattle.gender} / {formatGrade(currentCattle.grade, currentCattle.marblingScore)} / {currentCattle.months}개월 / {currentCattle.company}
                    </p>
                  </div>

                  <button
                    onClick={() => nextListingNo && router.replace(`/auction/${nextListingNo}`)}
                    disabled={!nextListingNo}
                    className="p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 disabled:pointer-events-none flex-shrink-0"
                    aria-label="다음 개체"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 메인 이미지 배너 */}
              <div 
                ref={imageContainerRef}
                className="relative overflow-hidden cursor-grab active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800">
                  {(mainImages[currentImageIndex] as any).isDocument ? (
                    // 서류 이미지 (실제 데이터만 표시)
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 p-4">
                      <img 
                        src={mainImages[currentImageIndex].src}
                        alt={mainImages[currentImageIndex].alt}
                        className="max-w-full max-h-full object-contain shadow-lg"
                      />
                    </div>
                  ) : (
                    // 일반 이미지
                    <img 
                      src={mainImages[currentImageIndex].src}
                      alt={mainImages[currentImageIndex].alt}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      draggable="false"
                    />
                  )}
                </div>
                
                {/* 이미지 인디케이터 */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {mainImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentImageIndex === index ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`이미지 ${index + 1}로 이동`}
                    />
                  ))}
                </div>
              </div>

              {/* 사이드 이미지 박스 6개 */}
              <div className="px-3 pt-2 pb-1">
                <div className="flex gap-2 justify-start overflow-x-auto">
                  {mainImages.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-16 h-16 flex-shrink-0 rounded overflow-hidden transition-all ${
                        currentImageIndex === index 
                          ? 'border-2 border-gray-400 dark:border-gray-500' 
                          : 'border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <img 
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 버튼 영역 (항상 고정) */}
              <div className="px-3 pt-2 pb-2 bg-white dark:bg-gray-900 flex items-center justify-end gap-2 transition-colors">
                <a
                  href="https://aunit.mtrace.go.kr/mtracesearch/cattleNoSearch.do?btsProgNo=0109008401&btsActionMethod=SELECT&cattleNo=002189438539"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                >
                  축산물 이력정보
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
                >
                  {showInfoPanel ? '개체정보 닫기' : '개체정보 보기'}
                </button>
              </div>

              {/* 개체정보 테이블 (애니메이션) - 3줄 레이아웃 */}
              <AnimatePresence>
                {showInfoPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    {/* 1행: 축종, 성별, 등급, 개월령, 이력번호 */}
                    <div className="mx-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="bg-gray-100/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                            <th className="py-2.5 px-3 text-center font-medium text-gray-500 dark:text-gray-400">축종</th>
                            <th className="py-2.5 px-3 text-center font-medium text-gray-500 dark:text-gray-400">성별</th>
                            <th className="py-2.5 px-3 text-center font-medium text-gray-500 dark:text-gray-400">등급</th>
                            <th className="py-2.5 px-3 text-center font-medium text-gray-500 dark:text-gray-400">개월령</th>
                            <th className="py-2.5 px-2 text-center font-medium text-gray-500 dark:text-gray-400">이력번호</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-3 px-3 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.type}</td>
                            <td className="py-3 px-3 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.gender}</td>
                            <td className="py-3 px-3 text-center text-gray-900 dark:text-gray-100 font-medium">{formatGrade(currentCattle.grade, currentCattle.marblingScore)}</td>
                            <td className="py-3 px-3 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.months}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium text-[11px]">{currentCattle.traceNo || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 2행: 등지방, 등심면적, 근내지방, 육색, 지방색, 조직감, 성숙도 */}
                    <div className="mx-3 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
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
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.backFat || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.eyeMuscle || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.marblingScore || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.meatColor || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.fatColor || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.texture || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.maturity || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 3행: 도축장, 도축번호, 도체중, 상장업체, 가공일, 가공중량 */}
                    <div className="mx-3 mt-2 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
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
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.slaughterHouse || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.slaughterNo || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.carcassWeight || '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.company}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.processDate ? currentCattle.processDate.replace(/-/g, '.').slice(2) : '-'}</td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-gray-100 font-medium">{currentCattle.processWeight || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


              {/* 호가창 - 상단: 입찰 진행 */}
              <div id="bid-order-section" className="border-t border-gray-200 dark:border-gray-700">
                <div className="w-full flex flex-col border-b border-gray-200 dark:border-gray-700">
                  {/* 호가창 헤더 */}
                  <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 h-9 flex items-center sticky top-[56px] z-10 transition-colors">
                    {listingData?.status === 'completed' ? (
                      <div className="grid px-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 w-full" style={{gridTemplateColumns: '1fr 0.7fr 1fr 1fr 1fr 0.7fr'}}>
                        <div className="text-center">부위</div>
                        <div className="text-center">중량</div>
                        <div className="text-center">최저단가</div>
                        <div className="text-center">낙찰가</div>
                        <div className="text-center">나의입찰가</div>
                        <div className="text-center">결과</div>
                      </div>
                    ) : (
                      <div className="grid px-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 w-full" style={{gridTemplateColumns: '1fr 0.7fr 1fr 1fr 0.6fr 0.6fr'}}>
                        <div className="text-center">부위</div>
                        <div className="text-center">중량</div>
                        <div className="text-center">최저단가</div>
                        <div className="text-center">나의입찰가</div>
                        <div className="text-center">변경</div>
                        <div className="text-center">취소</div>
                      </div>
                    )}
                  </div>

                  {/* 상단 - 활성 부위 */}
                  <div className="flex-1 overflow-y-auto">
                    {activeParts.length === 0 && settledParts.length > 0 ? (
                      <div className="px-4 py-6 text-center text-[13px] text-gray-400 dark:text-gray-500">
                        모든 부위의 낙찰이 결정되었습니다.
                      </div>
                    ) : (
                      activeParts.map((item: any, index) => {
                        const minPrice = item.minPrice || baseMinPrices[item.part] || 50000;
                        const myBidPrice = item.myBid?.bidPrice;
                        const myBidId = item.myBid?.bidId;
                        const hasBid = !!myBidPrice;
                        const isCompleted = listingData?.status === 'completed';
                        const winningPrice = item.highestBidPrice;
                        const hasAnyBid = item.bidCount > 0;
                        const isMyWin = hasBid && winningPrice && myBidPrice >= winningPrice;

                        if (isCompleted) {
                          return (
                            <div
                              key={`active-${index}`}
                              className={`grid px-2 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors ${
                                hasBid
                                  ? 'bg-red-50/50 dark:bg-red-900/20'
                                  : 'bg-white dark:bg-gray-900'
                              }`}
                              style={{gridTemplateColumns: '1fr 0.7fr 1fr 1fr 1fr 0.7fr'}}
                            >
                              <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                                {item.part}
                              </div>
                              <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                                {item.weight}kg
                              </div>
                              <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                                {minPrice.toLocaleString()}
                              </div>
                              <div className="flex items-center justify-center">
                                {winningPrice ? (
                                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                                    {winningPrice.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </div>
                              <div className="flex items-center justify-center">
                                {hasBid ? (
                                  <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                                    {myBidPrice.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </div>
                              <div className="flex items-center justify-center">
                                {!hasAnyBid ? (
                                  <span className="px-1.5 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">유찰</span>
                                ) : hasBid ? (
                                  <span className="px-1.5 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 rounded">미낙찰</span>
                                ) : (
                                  <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`active-${index}`}
                            className={`grid px-2 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors ${
                              hasBid
                                ? 'bg-blue-50/50 dark:bg-blue-900/30'
                                : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                            style={{gridTemplateColumns: '1fr 0.7fr 1fr 1fr 0.6fr 0.6fr'}}
                          >
                            <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                              {item.part}
                            </div>
                            <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                              {item.weight}kg
                            </div>
                            <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                              {minPrice.toLocaleString()}
                            </div>
                            <div className="flex items-center justify-center">
                              {hasBid ? (
                                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                                  {myBidPrice.toLocaleString()}
                                </span>
                              ) : (
                                <button
                                  disabled={!canBid}
                                  onClick={() => {
                                    setSelectedPart(item.part);
                                    setSelectedWeight(item.weight);
                                    setBidPrice('');
                                    setShowBidSheet(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium text-white bg-gray-800 dark:bg-gray-700 rounded hover:bg-gray-900 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                                >
                                  입찰하기
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-center">
                              {hasBid && canBid ? (
                                <button
                                  onClick={() => {
                                    setSelectedPart(item.part);
                                    setSelectedWeight(item.weight);
                                    setBidPrice(myBidPrice ? myBidPrice.toString() : '');
                                    setShowBidSheet(true);
                                  }}
                                  className="px-1.5 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                  변경
                                </button>
                              ) : (
                                <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                              )}
                            </div>
                            <div className="flex items-center justify-center">
                              {hasBid && canBid && myBidId ? (
                                <button
                                  onClick={() => handleCancelBid(myBidId, item.part)}
                                  className="px-1.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                >
                                  취소
                                </button>
                              ) : (
                                <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* 하단 - 경매 결과 테이블 */}
              {settledParts.length > 0 && (
                <div className="border-t-4 border-gray-300 dark:border-gray-600">
                  {/* 경매 결과 섹션 헤더 */}
                  <div className="bg-gray-50 dark:bg-gray-800/80 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300">
                      경매 결과 ({settledParts.length}건)
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push('/bids?tab=경매결과')}
                      className="text-[11px] text-gray-900 dark:text-gray-100 hover:text-gray-600 font-medium"
                    >
                      전체 보기 &gt;
                    </button>
                  </div>

                  {/* 경매 결과 헤더 */}
                  <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 h-9 flex items-center transition-colors">
                    <div className="grid px-2 text-[13px] font-medium text-gray-500 dark:text-gray-400 w-full" style={{gridTemplateColumns: '1fr 0.7fr 1fr 1fr 1fr 0.7fr'}}>
                      <div className="text-center">부위</div>
                      <div className="text-center">중량</div>
                      <div className="text-center">최저단가</div>
                      <div className="text-center">낙찰가</div>
                      <div className="text-center">나의입찰가</div>
                      <div className="text-center">결과</div>
                    </div>
                  </div>

                  {/* 경매 결과 데이터 */}
                  {settledParts.map((item: any, index) => {
                    const minPrice = item.minPrice || baseMinPrices[item.part] || 50000;
                    const myBidPrice = item.myBid?.bidPrice;
                    const isMyWin = !!(item.myBid as any)?.isWinning;
                    const winningPrice = item.highestBidPrice;

                    return (
                      <div
                        key={`settled-${index}`}
                        className={`grid px-2 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors ${
                          isMyWin
                            ? 'bg-blue-50/50 dark:bg-blue-900/30'
                            : 'bg-white dark:bg-gray-900'
                        }`}
                        style={{gridTemplateColumns: '1fr 0.7fr 1fr 1fr 1fr 0.7fr'}}
                      >
                        <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                          {item.part}
                        </div>
                        <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                          {item.weight}kg
                        </div>
                        <div className="text-center text-[13px] text-gray-700 dark:text-gray-300 flex items-center justify-center">
                          {minPrice.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-center">
                          {winningPrice ? (
                            <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                              {winningPrice.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                        <div className="flex items-center justify-center">
                          {myBidPrice ? (
                            <span className={`text-[13px] font-medium ${isMyWin ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {myBidPrice.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                        <div className="flex items-center justify-center">
                          {isMyWin ? (
                            <span className="px-1.5 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 rounded">낙찰</span>
                          ) : myBidPrice ? (
                            <span className="px-1.5 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 rounded">미낙찰</span>
                          ) : (
                            <span className="text-[13px] text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 하단 여백 */}
              <div className="pb-24"></div>
            </div>

            {/* 하단 네비게이션 */}
            <BottomNav />

            {/* 입찰하기 바텀시트 - 모바일 영역 내에서만 표시 */}
            <AnimatePresence>
              {showBidSheet && (
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
                    className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-[100] transition-colors">
                  {/* 핸들 */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  </div>
                  
                  {/* 헤더 */}
                  <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">입찰하기</h3>
                      <button 
                        onClick={() => setShowBidSheet(false)}
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
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {selectedPart ? partsData.find(p => p.part === selectedPart)?.listingNo || '-' : '-'}
                            </td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{currentCattle.type}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{currentCattle.gender}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{formatGrade(currentCattle.grade, currentCattle.marblingScore)}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{currentCattle.months}</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedPart || '-'}</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedWeight ? `${selectedWeight}kg` : '-'}</td>
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
                          value={bidPrice}
                          onChange={(e) => {
                            const formattedValue = formatNumber(e.target.value);
                            setBidPrice(formattedValue);
                          }}
                          placeholder={selectedPart ? (() => {
                            const partData = partsData.find((p: any) => p.part === selectedPart);
                            return `최저단가 ${(partData?.minPrice || baseMinPrices[selectedPart] || 50000).toLocaleString()}`;
                          })() : '0'}
                          className="w-full px-4 py-3.5 pr-12 text-right text-xl font-bold border border-gray-200 dark:border-gray-700 rounded focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-800 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                              // 비어있으면 최고입찰가 또는 최저단가에서 시작
                              let basePrice = 0;
                              if (bidPrice === '') {
                                const partData = partsData.find((p: any) => p.part === selectedPart);
                                basePrice = partData?.minPrice || baseMinPrices[selectedPart || ''] || 50000;
                              } else {
                                basePrice = parseFloat(removeCommas(bidPrice));
                              }
                              const newPrice = basePrice + amount;
                              setBidPrice(formatNumber(newPrice.toString()));
                            }}
                            className="py-2 text-xs border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-gray-700 dark:text-gray-300 transition-colors"
                          >
                            +{amount.toLocaleString()}
                          </button>
                        ))}
                        <button
                          onClick={() => setBidPrice('')}
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
                          {(() => {
                            if (!bidPrice || !selectedWeight) return '-';
                            const price = parseFloat(removeCommas(bidPrice));
                            const weight = parseFloat(selectedWeight);
                            const total = Math.round(price * weight);
                            return `${formatNumber(total.toString())}원`;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* 입찰하기 버튼 */}
                    <button 
                      onClick={() => {
                        handleBidClick();
                        setShowBidSheet(false);
                      }}
                      disabled={!bidPrice || !selectedPart || !canBid}
                      className="w-full py-3.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-base rounded transition-colors"
                    >
                      {canBid ? '입찰하기' : bidStatusMessage}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* 입찰 확인 다이얼로그 */}
        {showBidDialog && (
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
                          {selectedPart ? partsData.find(p => p.part === selectedPart)?.listingNo || '-' : '-'}
                        </td>
                        <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{currentCattle.type}</td>
                        <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{currentCattle.gender}</td>
                        <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{formatGrade(currentCattle.grade, currentCattle.marblingScore)}</td>
                        <td className="py-2.5 px-1.5 text-center text-gray-700 dark:text-gray-300">{currentCattle.months}</td>
                        <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedPart || '-'}</td>
                        <td className="py-2.5 px-1.5 text-center font-medium text-gray-900 dark:text-gray-100">{selectedWeight ? `${selectedWeight}kg` : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 입찰 금액 정보 */}
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">입찰가격</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{bidPrice && bidPrice !== '0' ? `${formatNumber(bidPrice)}원/kg` : "-"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">총 입찰금액</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {(() => {
                        if (!bidPrice || !selectedWeight) return '-';
                        const price = parseFloat(removeCommas(bidPrice));
                        const weight = parseFloat(selectedWeight);
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
                  onClick={addNewBid}
                  className="flex-1 py-2.5 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  입찰하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 빠른 재입찰 금액 설정 다이얼로그 */}
        {showQuickReBidEdit && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-sm w-full p-5 transition-colors">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">빠른 재입찰 금액 설정</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">증액 금액</label>
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
                    onFocus={(e) => {
                      setTempQuickReBidAmount('');
                    }}
                    placeholder="증액할 금액을 입력하세요"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">원</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  현재 최고가에 이 금액을 더해 빠른 재입찰합니다.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowQuickReBidEdit(false);
                    setTempQuickReBidAmount(quickReBidAmount.toLocaleString());
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 py-2 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveQuickReBidAmount}
                  disabled={!tempQuickReBidAmount || parseInt(tempQuickReBidAmount.replace(/,/g, '')) <= 0 || parseInt(tempQuickReBidAmount.replace(/,/g, '')) % 100 !== 0}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 재입찰 다이얼로그 */}
        {showReBidDialog && selectedBid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-5 transition-colors">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">재입찰 확인</h3>
              
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">상장번호: {selectedBid.listingNo || selectedBid.auctionNumber}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">부위: {selectedBid.part}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">중량: {selectedBid.weight}kg</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">현재 최고가: {selectedBid.topBidPrice.toLocaleString()}원/kg</div>
              </div>

              {selectedBid.reBidPrice ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">재입찰가격</label>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {selectedBid.reBidPrice.toLocaleString()}원/kg
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    총 {(selectedBid.reBidPrice * parseFloat(selectedBid.weight)).toLocaleString()}원
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">재입찰가격 입력</label>
                  <div className="relative">
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={customBidPrice}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setCustomBidPrice(value ? parseInt(value).toLocaleString() : '');
                      }}
                      onFocus={(e) => {
                        setCustomBidPrice('');
                      }}
                      placeholder={`최소 ${(selectedBid.topBidPrice + 100).toLocaleString()}원 이상`}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">원/kg</span>
                  </div>
                  {customBidPrice && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      총 {(parseInt(customBidPrice.replace(/,/g, '')) * parseFloat(selectedBid.weight)).toLocaleString()}원
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowReBidDialog(false);
                    setSelectedBid(null);
                    setCustomBidPrice('');
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 py-2 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={confirmReBid}
                  disabled={!selectedBid.reBidPrice && (!customBidPrice || parseInt(customBidPrice.replace(/,/g, '')) % 100 !== 0)}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                  재입찰하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 경매 비밀번호 인증 모달 */}
        <AuctionPasswordModal
          isOpen={showAuctionAuthModal}
          onClose={() => setShowAuctionAuthModal(false)}
          onVerify={verifyAuctionPassword}
          isVerifying={isVerifying}
          error={auctionAuthError}
        />

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

function LoadingFallback() {
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center">
      <span className="text-gray-500 dark:text-gray-400">로딩 중...</span>
    </div>
  );
}

export default function AuctionDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuctionDetailContent params={params} />
    </Suspense>
  );
}