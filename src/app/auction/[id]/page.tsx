'use client';

import { useState, useEffect, useRef, use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Home as HomeIcon,
  ShoppingCart,
  BarChart3,
  ArrowRight,
  Play,
  Pause,
  FileText,
  User,
  Gavel,
  ArrowLeft,
  Edit2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AuctionDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMyBids = searchParams.get('from') === 'myBids';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedBidTab, setSelectedBidTab] = useState(fromMyBids ? '개체정보' : '입찰하기');
  const [myBidHistoryTab, setMyBidHistoryTab] = useState('입찰 진행 중');
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [bidPrice, setBidPrice] = useState('0');
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'warning' | 'success'>('warning');
  const [isSecondBidNotificationOn, setIsSecondBidNotificationOn] = useState(false);
  const [quickReBidAmount, setQuickReBidAmount] = useState(1000);
  const [showQuickReBidEdit, setShowQuickReBidEdit] = useState(false);
  const [tempQuickReBidAmount, setTempQuickReBidAmount] = useState('1,000');
  const [showReBidDialog, setShowReBidDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState('');

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

  // 입찰 취소 함수
  const cancelBid = (bidId: number) => {
    setMyBids(prev => 
      prev.map(bid => 
        bid.id === bidId ? { ...bid, status: 'cancelled' } : bid
      )
    );
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
    if (!bidPrice || bidPrice === '0') {
      showToastMessage('입찰가격을 입력해주세요.');
      return;
    }
    
    const priceValue = parseInt(removeCommas(bidPrice));
    if (priceValue < 100) {
      showToastMessage('최소 입찰가격은 100원입니다.');
      return;
    }
    
    // 100원 단위 체크
    if (priceValue % 100 !== 0) {
      showToastMessage('입찰가격은 100원 단위로 입력해주세요.');
      return;
    }
    
    setShowBidDialog(true);
  };

  // 입찰 추가 함수
  const addNewBid = () => {
    if (!selectedPart || !selectedWeight || !bidPrice || bidPrice === '0') {
      return;
    }

    const now = new Date();
    const timeString = `25.08.06.(수) ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newBid = {
      id: Date.now(), // 고유 ID 생성
      auctionNumber: currentAuctionInfo.auctionNumber,
      part: selectedPart,
      weight: selectedWeight,
      price: removeCommas(bidPrice),
      topBidPrice: parseInt(removeCommas(bidPrice)),
      time: timeString,
      status: 'active',
      breed: currentAuctionInfo.breed,
      gender: currentAuctionInfo.breed.includes('거세') ? '거세' : '암',
      grade: currentAuctionInfo.grade,
      months: currentAuctionInfo.months,
      totalAmount: Math.round(parseFloat(removeCommas(bidPrice)) * parseFloat(selectedWeight)).toString()
    };

    setMyBids(prev => [newBid, ...prev]);
    setShowBidDialog(false);
    
    // 입찰 완료 토스트 표시
    showToastMessage('입찰이 완료되었습니다.', 'success');
    
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
    
    if (finalPrice % 100 !== 0) {
      showToastMessage('입찰가격은 100원 단위로 입력해주세요.');
      return;
    }
    
    // 입찰 내역 업데이트
    setMyBids(prevBids => 
      prevBids.map(bid => {
        if (bid.id === selectedBid.id) {
          const now = new Date();
          const timeString = `25.08.06.(수) ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
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

  // 메인 이미지 배열 (등심 이미지) - 개체별로 순서 다르게
  const allImages = [
    { id: 1, src: "/등심1.png", alt: "등심1" },
    { id: 2, src: "/등심2.png", alt: "등심2" },
    { id: 3, src: "/등심3.png", alt: "등심3" },
    { id: 4, src: "/등심4.png", alt: "등심4" }
  ];

  // 개체 ID에 따라 이미지 순서 변경
  const getImagesForAuction = (auctionId: string) => {
    const id = parseInt(auctionId);
    
    // 각 개체별로 다른 이미지 순서 패턴
    const patterns: number[][] = [
      [0, 1, 2, 3], // 개체 1: 등심1, 등심2, 등심3, 등심4
      [1, 3, 0, 2], // 개체 2: 등심2, 등심4, 등심1, 등심3
      [2, 0, 3, 1], // 개체 3: 등심3, 등심1, 등심4, 등심2
      [3, 2, 1, 0], // 개체 4: 등심4, 등심3, 등심2, 등심1
      [1, 0, 3, 2], // 개체 5: 등심2, 등심1, 등심4, 등심3
    ];
    
    const patternIndex = (id - 1) % patterns.length;
    const pattern = patterns[patternIndex];
    
    return pattern.map(imageIndex => ({
      ...allImages[imageIndex],
      auctionNo: `250806-${String(id).padStart(3, '0')}`
    }));
  };

  const mainImages = getImagesForAuction(resolvedParams.id);

  // 개체별 부위 중량 데이터 생성 (0.1~0.3kg 차이)
  const getPartsData = (auctionId: string) => {
    const id = parseInt(auctionId);
    const baseWeights = [
      { part: '윗등심(좌)', baseWeight: 8.5 },
      { part: '윗등심(우)', baseWeight: 8.8 },
      { part: '아랫등심(좌)', baseWeight: 9.8 },
      { part: '아랫등심(우)', baseWeight: 9.6 },
      { part: '안심(좌)', baseWeight: 3.3 }
    ];

    // ID에 따라 중량 변화 (-0.3 ~ +0.3)
    const weightVariation = ((id - 1) * 0.15) % 0.6 - 0.3;
    
    return baseWeights.map(item => ({
      part: item.part,
      weight: (item.baseWeight + weightVariation).toFixed(1)
    }));
  };

  const partsData = getPartsData(resolvedParams.id);

  // 개체별 정보 생성
  const getAuctionInfo = (auctionId: string) => {
    const id = parseInt(auctionId);
    const breeds = ['한우거세', '한우암소', '한우거세', '한우거세', '한우암소'];
    const grades = ['1++(9)', '1++(8)', '1+(7)', '1++(9)', '1+(8)'];
    const months = ['30', '28', '32', '29', '31'];
    
    return {
      auctionNumber: `250806-${String(id).padStart(3, '0')}`,
      breed: breeds[(id - 1) % breeds.length],
      grade: grades[(id - 1) % grades.length],
      months: months[(id - 1) % months.length]
    };
  };

  const currentAuctionInfo = getAuctionInfo(resolvedParams.id);

  // 모든 개체의 입찰내역 생성 함수
  const generateAllMyBids = () => {
    const allBids = [];
    
    // 5개 개체 모두에 대한 입찰 내역 생성
    for (let auctionId = 1; auctionId <= 5; auctionId++) {
      const auctionInfo = getAuctionInfo(auctionId.toString());
      const parts = getPartsData(auctionId.toString());
      
      // 각 개체당 2-3개의 입찰 생성
      allBids.push({
        id: auctionId * 1000 + 1,
        auctionNumber: auctionInfo.auctionNumber,
        part: parts[0].part,
        weight: parts[0].weight,
        price: '83000',
        topBidPrice: 84000,
        time: '25.08.06.(수) 09:23',
        status: 'active',
        breed: auctionInfo.breed,
        gender: auctionInfo.breed.includes('거세') ? '거세' : '암',
        grade: auctionInfo.grade,
        months: auctionInfo.months,
        totalAmount: Math.round(83000 * parseFloat(parts[0].weight)).toString()
      });
      
      if (auctionId <= 3) {
        allBids.push({
          id: auctionId * 1000 + 2,
          auctionNumber: auctionInfo.auctionNumber,
          part: parts[4].part,
          weight: parts[4].weight,
          price: '111000',
          topBidPrice: 113000,
          time: '25.08.06.(수) 09:45',
          status: 'active',
          breed: auctionInfo.breed,
          gender: auctionInfo.breed.includes('거세') ? '거세' : '암',
          grade: auctionInfo.grade,
          months: auctionInfo.months,
          totalAmount: Math.round(111000 * parseFloat(parts[4].weight)).toString()
        });
      }
    }
    
    return allBids;
  };

  const [myBids, setMyBids] = useState(() => generateAllMyBids());

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
  
  // 확대경 기능 상태
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [magnifierImagePosition, setMagnifierImagePosition] = useState({ x: 0, y: 0 });

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

  // 확대경 핸들러
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging.current) return; // 드래그 중에는 확대경 비활성화
    
    const elem = e.currentTarget;
    const { top, left, width, height } = elem.getBoundingClientRect();
    
    // 마우스 위치 (이미지 기준)
    const x = e.clientX - left;
    const y = e.clientY - top;
    
    setMagnifierPosition({ x: e.clientX, y: e.clientY });
    setMagnifierImagePosition({ 
      x: (x / width) * 100, 
      y: (y / height) * 100 
    });
    setShowMagnifier(true);
  };

  const handleImageMouseEnter = () => {
    if (!isDragging.current) {
      setShowMagnifier(true);
    }
  };

  const handleImageMouseLeave = () => {
    setShowMagnifier(false);
  };

  // 터치 확대경 핸들러 (모바일)
  const handleImageTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // 스와이프 중에는 확대경 비활성화
    const diff = Math.abs(touchStartX.current - touchEndX.current);
    if (diff > 10) {
      setShowMagnifier(false);
      return;
    }

    const touch = e.touches[0];
    const elem = e.currentTarget;
    const { top, left, width, height } = elem.getBoundingClientRect();
    
    // 터치 위치 (이미지 기준)
    const x = touch.clientX - left;
    const y = touch.clientY - top;
    
    setMagnifierPosition({ x: touch.clientX, y: touch.clientY });
    setMagnifierImagePosition({ 
      x: (x / width) * 100, 
      y: (y / height) * 100 
    });
    setShowMagnifier(true);
  };

  const handleImageTouchEnd = () => {
    setShowMagnifier(false);
    handleTouchEnd(); // 기존 스와이프 로직
  };

  // 배너 데이터 (빈 상태)
  const banners = [
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" }
  ];



  // 개체정보 탭으로 스크롤
  useEffect(() => {
    if (fromMyBids && selectedBidTab === '개체정보') {
      setTimeout(() => {
        const element = document.getElementById('bid-order-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [fromMyBids, selectedBidTab]);

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
            <div className="flex-shrink-0 bg-white border-b border-gray-200 pt-1 md:pt-0">
              <div className="px-2 md:px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {fromMyBids ? (
                      <Link 
                        href={`/?tab=myBids&bidId=${searchParams.get('bidId')}`}
                        className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Link>
                    ) : (
                      <Link 
                        href="/auction" 
                        className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Link>
                    )}
                    <Link href="/" className="flex items-center">
                      <img 
                        src="/Mainlogo.png" 
                        alt="HanuMuch" 
                        className="h-8 w-auto"
                      />
                    </Link>
                  </div>
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

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* 경매번호 및 네비게이션 */}
              <div className="px-4 py-1 bg-white border-b border-gray-200 flex items-center justify-between">
                <button
                  onClick={goToPrevAuction}
                  disabled={parseInt(resolvedParams.id) <= 1}
                  className={`p-1 rounded transition-colors ${
                    parseInt(resolvedParams.id) <= 1
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-gray-100'
                  }`}
                  aria-label="이전 개체"
                >
                  <ChevronLeft className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
                </button>
                
                <div className="text-center">
                  <p className="text-base font-bold text-gray-900">250806-{String(resolvedParams.id).padStart(3, '0')}</p>
                </div>
                
                <button
                  onClick={goToNextAuction}
                  disabled={parseInt(resolvedParams.id) >= MAX_AUCTION_ID}
                  className={`p-1 rounded transition-colors ${
                    parseInt(resolvedParams.id) >= MAX_AUCTION_ID
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-gray-100'
                  }`}
                  aria-label="다음 개체"
                >
                  <ChevronRight className="h-6 w-6 text-gray-700" strokeWidth={1.5} />
                </button>
              </div>

              {/* 메인 이미지 배너 */}
              <div 
                ref={imageContainerRef}
                className="relative overflow-hidden cursor-grab active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={(e) => {
                  handleTouchMove(e);
                  handleImageTouchMove(e);
                }}
                onTouchEnd={handleImageTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={(e) => {
                  handleMouseMove(e);
                  handleImageMouseMove(e);
                }}
                onMouseUp={handleMouseUp}
                onMouseLeave={(e) => {
                  handleMouseLeave();
                  handleImageMouseLeave();
                }}
                onMouseEnter={handleImageMouseEnter}
              >
                <div className="w-full aspect-square bg-gray-200 relative">
                  <img 
                    src={mainImages[currentImageIndex].src}
                    alt={mainImages[currentImageIndex].alt}
                    className={`w-full h-full object-cover select-none pointer-events-none transition-all duration-200 ${
                      showMagnifier ? 'grayscale brightness-75' : ''
                    }`}
                    draggable="false"
                  />
                  
                  {/* 확대경 */}
                  {showMagnifier && (
                    <div
                      className="fixed pointer-events-none z-50 shadow-2xl rounded-full overflow-hidden"
                      style={{
                        width: '200px',
                        height: '200px',
                        left: `${magnifierPosition.x - 100}px`,
                        top: `${magnifierPosition.y - 100}px`,
                        backgroundImage: `url(${mainImages[currentImageIndex].src})`,
                        backgroundPosition: `${magnifierImagePosition.x}% ${magnifierImagePosition.y}%`,
                        backgroundSize: '350%',
                        backgroundRepeat: 'no-repeat'
                      }}
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

              {/* 사이드 이미지 박스 4개 */}
              <div className="px-3 py-3">
                <div className="flex gap-1.5 justify-start">
                  {mainImages.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-16 h-16 rounded overflow-hidden transition-all ${
                        currentImageIndex === index 
                          ? 'border-2 border-black' 
                          : 'border-2 border-transparent hover:border-gray-300'
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



              {/* 호가창과 입찰주문 창 */}
              <div id="bid-order-section" className="flex border-t border-gray-200" style={{height: '520px'}}>
                {/* 왼쪽 호가창 */}
                <div className="w-2/5 border-r border-gray-200 flex flex-col border-b border-gray-200">
                  {/* 호가창 헤더 */}
                  <div className="bg-gray-50 border-b border-gray-200 flex-shrink-0 h-9 flex items-center">
                    <div className="grid px-1.5 text-[11px] font-bold text-gray-700 w-full" style={{gridTemplateColumns: '1fr 1fr'}}>
                      <div className="text-center border-r border-gray-300">부위</div>
                      <div className="text-center">중량</div>
                    </div>
                  </div>

                  {/* 호가 데이터 스크롤 영역 */}
                  <div className="flex-1 overflow-y-auto">
                    {/* 매도호가 (위쪽, 높은 가격) */}
                    {partsData.map((item, index) => (
                      <div 
                        key={`sell-${index}`}
                        className="grid px-1.5 py-2 border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer"
                        style={{gridTemplateColumns: '1fr 1fr'}}
                        onClick={() => {
                          setSelectedPart(item.part);
                          setSelectedWeight(item.weight);
                        }}
                      >
                        <div className="text-center text-[11px] font-bold text-black flex items-center justify-center border-r border-gray-200">
                          {item.part}
                        </div>
                        <div className="text-center text-[11px] font-bold text-black flex items-center justify-center">
                          {item.weight}kg
                        </div>
                      </div>
                    ))}
                    
                    {/* 현재가 (기준점) */}
                    <div 
                      className="grid px-1.5 py-2 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50" 
                      style={{gridTemplateColumns: '1fr 1fr'}}
                      onClick={() => {
                        setSelectedPart('안심(우)');
                        setSelectedWeight('3.2');
                      }}
                    >
                      <div className="text-center text-[11px] font-bold text-black flex items-center justify-center border-r border-gray-200">
                        안심(우)
                      </div>
                      <div className="text-center text-[11px] font-bold text-black flex items-center justify-center">
                        3.2kg
                      </div>
                    </div>
                    
                    {/* 매수호가 (아래쪽, 낮은 가격) */}
                    {[
                      { part: '채끝(좌)', weight: '4.2' },
                      { part: '채끝(우)', weight: '4.0' },
                      { part: '목심(좌)', weight: '9.3' },
                      { part: '목심(우)', weight: '8.9' },
                      { part: '설깃(좌)', weight: '6.9' },
                      { part: '설깃(우)', weight: '7.8' },
                      { part: '치마살,업진살(좌)', weight: '3.1' },
                      { part: '치마살,업진살(우)', weight: '3.4' }
                    ].map((item, index) => (
                      <div 
                        key={`buy-${index}`}
                        className="grid px-1.5 py-2 border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer"
                        style={{gridTemplateColumns: '1fr 1fr'}}
                        onClick={() => {
                          setSelectedPart(item.part);
                          setSelectedWeight(item.weight);
                        }}
                      >
                        <div className={`text-center font-bold text-black flex items-center justify-center border-r border-gray-200 ${
                          item.part.includes('치마살,업진살') ? 'text-[9px]' : 'text-[11px]'
                        }`}>
                          {item.part}
                        </div>
                        <div className="text-center text-[11px] font-bold text-black flex items-center justify-center">
                          {item.weight}kg
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 오른쪽 입찰주문 창 */}
                <div className="w-3/5 flex flex-col border-b border-gray-200">
                  {/* 탭 헤더 */}
                  <div className="bg-gray-50 border-b border-gray-200 flex-shrink-0 h-9">
                    <div className="flex h-full">
                      <button
                        onClick={() => setSelectedBidTab('입찰하기')}
                        className={`flex-1 flex items-center justify-center text-[11px] font-bold transition-colors ${
                          selectedBidTab === '입찰하기'
                            ? 'bg-white text-black border-b-2 border-red-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        입찰하기
                      </button>
                      <button
                        onClick={() => setSelectedBidTab('개체정보')}
                        className={`flex-1 flex items-center justify-center text-[11px] font-bold transition-colors ${
                          selectedBidTab === '개체정보'
                            ? 'bg-white text-black border-b-2 border-red-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        개체정보
                      </button>
                    </div>
                  </div>

                  <div className="px-2 py-2.5 flex-1 overflow-y-auto">
                    {/* 입찰하기 탭 */}
                    {selectedBidTab === '입찰하기' && (
                      <div className="space-y-2.5">
                        {/* 선택된 부위 표시 */}
                        <div>
                          <div className="text-[10px] text-gray-600 mb-1">선택된 부위</div>
                          <div className="relative">
                            <div className="w-full px-2 py-1.5 pr-8 text-xs border border-gray-300 rounded bg-gray-50 text-right">
                              {selectedPart ? <span className="font-bold">{selectedPart}</span> : <span className="text-gray-400">좌측에서 경매 부위 선택</span>}
                            </div>
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                            </div>
                          </div>
                        </div>

                        {/* 중량 */}
                        <div>
                          <div className="text-[10px] text-gray-600 mb-1">중량</div>
                          <div className="relative">
                            <div className="w-full px-2 py-1.5 pr-8 text-right text-xs border border-gray-300 rounded bg-gray-50">
                              {selectedWeight ? <span className="font-bold">{selectedWeight}</span> : <span className="text-gray-400">좌측에서 경매 부위 선택</span>}
                            </div>
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[10px] text-gray-500">
                              kg
                            </div>
                          </div>
                        </div>

                        {/* 입찰가격 */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] text-gray-600">입찰가격(원/kg)</div>
                            <div className="text-[9px] text-gray-400">100원 단위</div>
                          </div>
                          <div className="relative mb-1.5">
                            <input
                              type="text"
                              value={bidPrice}
                              onChange={(e) => {
                                const formattedValue = formatNumber(e.target.value);
                                setBidPrice(formattedValue);
                              }}
                              onFocus={(e) => {
                                if (e.target.value === '0') {
                                  setBidPrice('');
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value === '') {
                                  setBidPrice('0');
                                }
                              }}
                              placeholder="입찰가격 입력"
                              className="w-full px-2 py-1.5 pr-8 text-right text-xs font-bold border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-black placeholder:text-gray-400"
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[10px] text-gray-500">
                              원
                            </div>
                          </div>
                          {/* 가격 조정 버튼 */}
                          <div className="flex gap-0.5">
                            {[1000, 5000, 10000].map((amount) => (
                              <button
                                key={amount}
                                onClick={() => {
                                  const currentPrice = bidPrice === '0' ? 0 : parseFloat(removeCommas(bidPrice));
                                  const newPrice = currentPrice + amount;
                                  setBidPrice(formatNumber(newPrice.toString()));
                                }}
                                className="flex-1 py-1 text-[10px] border border-gray-300 rounded hover:bg-gray-50 font-medium"
                              >
                                +{amount === 1000 ? '천원' : amount === 5000 ? '오천' : '만원'}
                              </button>
                            ))}
                            <button
                              onClick={() => setBidPrice('0')}
                              className="flex-1 py-1 text-[10px] bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-gray-700 font-medium"
                            >
                              초기화
                            </button>
                          </div>
                        </div>

                        {/* 주문 요약 */}
                        <div>
                          <div className="bg-gray-50 p-2 border rounded space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[10px] text-gray-600 whitespace-nowrap pt-0.5">개체정보</span>
                              <div className="flex flex-wrap gap-0.5 justify-end">
                                <span className="text-[9px] px-1 py-0.5 bg-white border border-gray-300 text-gray-700 rounded font-bold whitespace-nowrap">{currentAuctionInfo.breed}</span>
                                <span className="text-[9px] px-1 py-0.5 bg-white border border-gray-300 text-gray-700 rounded font-bold whitespace-nowrap">{currentAuctionInfo.grade}</span>
                                <span className="text-[9px] px-1 py-0.5 bg-white border border-gray-300 text-gray-700 rounded font-bold whitespace-nowrap">{currentAuctionInfo.months}개월</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-gray-600">부위</span>
                              <span className="text-[10px] text-gray-900 font-medium">{selectedPart || "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-gray-600">입찰가격</span>
                              <span className="text-[10px] text-gray-900 font-medium">{bidPrice && bidPrice !== '0' ? `${bidPrice}원/kg` : "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-gray-600">중량</span>
                              <span className="text-[10px] text-gray-900 font-medium">{selectedWeight ? `${selectedWeight}kg` : "-"}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-1 mt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-900">총 입찰금액</span>
                                <span className="text-xs font-bold text-red-600">
                                  {(() => {
                                    if (!bidPrice || !selectedWeight || bidPrice === '0') return '-';
                                    const price = parseFloat(removeCommas(bidPrice));
                                    const weight = parseFloat(selectedWeight);
                                    const total = Math.round(price * weight);
                                    return `${formatNumber(total.toString())}원`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 입찰하기 버튼 */}
                        <button 
                          onClick={handleBidClick}
                          className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded"
                        >
                          입찰하기
                        </button>
                      </div>
                    )}

                                          {/* 개체정보 탭 */}
                      {selectedBidTab === '개체정보' && (
                      <div className="space-y-2">
                        {/* 개체 정보 */}
                        <div className="bg-gray-50 p-2.5 rounded border">
                          <h4 className="text-xs font-bold text-gray-900 mb-2">개체 기본정보</h4>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">경매번호</span>
                              <span className="text-xs text-gray-900 font-medium">{currentAuctionInfo.auctionNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">이력번호</span>
                              <span className="text-xs text-gray-900 font-medium">002-1486-7293-{resolvedParams.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">품종 / 성별</span>
                              <span className="text-xs text-gray-900 font-medium">{currentAuctionInfo.breed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">등급</span>
                              <span className="text-xs text-gray-900 font-medium">{currentAuctionInfo.grade}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">개월령</span>
                              <span className="text-xs text-gray-900 font-medium">{currentAuctionInfo.months}개월령</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded border">
                          <h4 className="text-xs font-bold text-gray-900 mb-2">가공정보</h4>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">가공업체</span>
                              <span className="text-xs text-gray-900 font-medium">송정가공</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">가공일자</span>
                              <span className="text-xs text-gray-900 font-medium">2025.08.05.(화)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">도축장</span>
                              <span className="text-xs text-gray-900 font-medium">농협 음성축산물공판장</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded border">
                          <h4 className="text-xs font-bold text-gray-900 mb-2">품질정보</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full table-fixed" style={{fontSize: '10px'}}>
                              <thead>
                                <tr className="border-b border-gray-300">
                                  <th className="text-center text-gray-600 font-medium py-1 px-1 w-1/4">등지방</th>
                                  <th className="text-center text-gray-600 font-medium py-1 px-1 w-1/4">등심면적</th>
                                  <th className="text-center text-gray-600 font-medium py-1 px-1 w-1/4">근내지방</th>
                                  <th className="text-center text-gray-600 font-medium py-1 px-1 w-1/4">육색</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">16</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">123</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">9</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">5</td>
                                </tr>
                                <tr className="border-b border-gray-300">
                                  <th className="text-center text-gray-600 font-medium pt-2 pb-1 px-1">지방색</th>
                                  <th className="text-center text-gray-600 font-medium pt-2 pb-1 px-1">조직감</th>
                                  <th className="text-center text-gray-600 font-medium pt-2 pb-1 px-1">성숙도</th>
                                  <th className="text-center text-gray-600 font-medium pt-2 pb-1 px-1"></th>
                                </tr>
                                <tr>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">3</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">1</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">3</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 내 입찰내역 */}
              <div className="px-4 pt-4 pb-24 border-t border-gray-200 bg-white">
                <h3 className="text-sm font-bold text-gray-900 mb-3">내 입찰내역</h3>
                
                {myBids.length === 0 ? (
                  <div className="text-center py-20">
                    <h3 className="text-base font-medium text-gray-500 mb-2">입찰 내역이 없습니다</h3>
                    <p className="text-sm text-gray-400">경매에 참여하면 여기에 표시됩니다.</p>
                  </div>
                ) : (
                  <>
                    {/* 전체내역 버튼 */}
                    <div className="flex justify-end mb-2">
                      <button className="flex items-center gap-0.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors">
                        전체내역
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* 차순위 알림 & 빠른 재입찰 설정 */}
                    <div className="flex items-center gap-3 mb-3">
                      {/* 차순위 알림 */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">차순위 알림 받기</span>
                        <button
                          onClick={() => setIsSecondBidNotificationOn(!isSecondBidNotificationOn)}
                          className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                            isSecondBidNotificationOn 
                              ? 'bg-red-600' 
                              : 'bg-gray-300'
                          }`}
                        >
                          <span className={`absolute text-[8px] font-bold transition-opacity ${
                            isSecondBidNotificationOn 
                              ? 'left-1.5 text-white opacity-100' 
                              : 'left-1.5 text-white opacity-0'
                          }`}>
                            ON
                          </span>
                          <span className={`absolute text-[8px] font-bold transition-opacity ${
                            !isSecondBidNotificationOn 
                              ? 'right-1.5 text-gray-600 opacity-100' 
                              : 'right-1.5 text-gray-600 opacity-0'
                          }`}>
                            OFF
                          </span>
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform relative z-10 ${
                              isSecondBidNotificationOn ? 'translate-x-[26px]' : 'translate-x-[2px]'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 빠른 재입찰 설정 */}
                      <button
                        onClick={() => {
                          setShowQuickReBidEdit(true);
                          setTempQuickReBidAmount(quickReBidAmount.toLocaleString());
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        <span>빠른 재입찰</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          +{quickReBidAmount.toLocaleString()}원
                          <Edit2 className="h-3 w-3" />
                        </span>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                    {myBids.map((bid) => (
                      <div key={bid.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        {/* 헤더 영역 */}
                        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{bid.auctionNumber}</span>
                          </div>
                          <span className="text-xs text-gray-500">{bid.time}</span>
                        </div>

                        {/* 개체 정보 테이블 */}
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-gray-100">
                              <td className="px-3 py-2 text-gray-600 bg-gray-50 w-24">성별</td>
                              <td className="px-3 py-2 text-gray-900 font-medium">{bid.gender}</td>
                              <td className="px-3 py-2 text-gray-600 bg-gray-50 w-24">등급</td>
                              <td className="px-3 py-2 text-gray-900 font-medium" style={{ letterSpacing: '-0.05em' }}>{bid.grade}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="px-3 py-2 text-gray-600 bg-gray-50">부위</td>
                              <td className="px-3 py-2 text-gray-900 font-medium" style={{ letterSpacing: '-0.05em' }}>{bid.part}</td>
                              <td className="px-3 py-2 text-gray-600 bg-gray-50">중량</td>
                              <td className="px-3 py-2 text-gray-900 font-medium">{bid.weight}kg</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="px-3 py-2 text-gray-600 bg-gray-50">현재 최고가</td>
                              <td className="px-3 py-2 text-gray-900 font-medium" colSpan={3}>
                                <div className="flex flex-col gap-0.5">
                                  <span>{bid.topBidPrice.toLocaleString()}원/kg</span>
                                  <span className="text-xs text-gray-500">
                                    총 {(bid.topBidPrice * parseFloat(bid.weight)).toLocaleString()}원
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="px-3 py-2 text-gray-600 bg-gray-50">나의 입찰가격</td>
                              <td className="px-3 py-2 font-medium" colSpan={3}>
                                <div className="flex items-start justify-between">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-900">{parseInt(bid.price).toLocaleString()}원/kg</span>
                                      {bid.topBidPrice === parseInt(bid.price) ? (
                                        <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                                          최고순위
                                        </span>
                                      ) : (
                                        <span className="inline-flex px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded">
                                          차순위
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      총 {(parseInt(bid.price) * parseFloat(bid.weight)).toLocaleString()}원
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* 재입찰 버튼 */}
                        <div className="px-3 py-2 bg-white border-t border-gray-200">
                          <div className="flex gap-2">
                            <button 
                              disabled={bid.topBidPrice === parseInt(bid.price)}
                              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${
                                bid.topBidPrice === parseInt(bid.price)
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                              }`}
                              onClick={() => {
                                if (bid.topBidPrice !== parseInt(bid.price)) {
                                  handleQuickReBid(bid);
                                }
                              }}
                            >
                              최고가 +{quickReBidAmount.toLocaleString()}원 재입찰
                            </button>
                            <button 
                              disabled={bid.topBidPrice === parseInt(bid.price)}
                              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${
                                bid.topBidPrice === parseInt(bid.price)
                                  ? 'bg-white text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                                  : 'bg-white text-red-700 border-2 border-red-600 hover:bg-red-50 active:bg-red-100'
                              }`}
                              onClick={() => {
                                if (bid.topBidPrice !== parseInt(bid.price)) {
                                  handleCustomReBid(bid);
                                }
                              }}
                            >
                              직접 입력
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 하단 네비게이션 */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 md:px-4 py-2 safe-area-pb">
              <div className="flex items-center justify-around">
                {/* 홈 */}
                <Link href="/" className="flex-1 flex flex-col items-center py-2 text-gray-600 cursor-pointer">
                  <HomeIcon className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">홈</span>
                </Link>
                
                {/* 경매 */}
                <Link href="/auction" className="flex-1 flex flex-col items-center py-2 text-red-600 cursor-pointer">
                  <Gavel className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">경매</span>
                </Link>
                
                {/* 시세 */}
                <Link href="/market" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                  <BarChart3 className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">시세</span>
                </Link>
                
                {/* 거래 */}
                <Link href="/trade" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                  <FileText className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">거래</span>
                </Link>
                
                {/* 내정보 */}
                <Link href="/profile" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                  <User className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold">내정보</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 입찰 확인 다이얼로그 */}
        {showBidDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-lg w-full max-w-md mx-4">
              {/* 다이얼로그 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">입찰 내용을 확인해 주세요</h3>
              </div>
              
              {/* 다이얼로그 내용 */}
              <div className="px-6 py-4">
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded border">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">경매번호</span>
                        <span className="text-sm text-gray-900">{currentAuctionInfo.auctionNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">개체정보</span>
                        <span className="text-sm text-gray-900">{currentAuctionInfo.breed} / {currentAuctionInfo.grade}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">부위</span>
                        <span className="text-sm text-gray-900">{selectedPart || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">중량</span>
                        <span className="text-sm text-gray-900">{selectedWeight ? `${selectedWeight}kg` : "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">입찰가격</span>
                        <span className="text-sm text-gray-900">{bidPrice && bidPrice !== '0' ? `${formatNumber(bidPrice)}원/kg` : "-"}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-bold text-gray-900">총 입찰금액</span>
                          <span className="text-base font-bold text-red-600">
                            {(() => {
                              if (!bidPrice || !selectedWeight || bidPrice === '0') return '-';
                              const price = parseFloat(removeCommas(bidPrice));
                              const weight = parseFloat(selectedWeight);
                              const total = Math.round(price * weight);
                              return `${formatNumber(total.toString())}원`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 다이얼로그 버튼 */}
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowBidDialog(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={addNewBid}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
                    onFocus={(e) => {
                      setTempQuickReBidAmount('');
                    }}
                    placeholder="증액할 금액을 입력하세요 (100원 단위)"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">원</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  현재 최고가에 이 금액을 더해 빠른 재입찰합니다.
                </p>
                {tempQuickReBidAmount && parseInt(tempQuickReBidAmount.replace(/,/g, '')) % 100 !== 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ 100원 단위로 입력해주세요
                  </p>
                )}
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
                  onClick={saveQuickReBidAmount}
                  disabled={!tempQuickReBidAmount || parseInt(tempQuickReBidAmount.replace(/,/g, '')) <= 0 || parseInt(tempQuickReBidAmount.replace(/,/g, '')) % 100 !== 0}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
            <div className="bg-white rounded-lg max-w-md w-full p-5">
              <h3 className="text-lg font-bold mb-4">재입찰 확인</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">경매번호: {selectedBid.auctionNumber}</div>
                <div className="text-sm text-gray-600 mb-2">부위: {selectedBid.part}</div>
                <div className="text-sm text-gray-600 mb-2">중량: {selectedBid.weight}kg</div>
                <div className="text-sm text-gray-600 mb-2">현재 최고가: {selectedBid.topBidPrice.toLocaleString()}원/kg</div>
              </div>

              {selectedBid.reBidPrice ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">재입찰가격</label>
                  <div className="text-2xl font-bold text-red-600">
                    {selectedBid.reBidPrice.toLocaleString()}원/kg
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    총 {(selectedBid.reBidPrice * parseFloat(selectedBid.weight)).toLocaleString()}원
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">재입찰가격 입력 (100원 단위)</label>
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
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">원/kg</span>
                  </div>
                  {customBidPrice && (
                    <div className="text-sm text-gray-500 mt-2">
                      총 {(parseInt(customBidPrice.replace(/,/g, '')) * parseFloat(selectedBid.weight)).toLocaleString()}원
                    </div>
                  )}
                  {customBidPrice && parseInt(customBidPrice.replace(/,/g, '')) % 100 !== 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ 100원 단위로 입력해주세요
                    </p>
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
                  className="flex-1 bg-white text-gray-700 border-2 border-gray-300 py-2 rounded-lg font-bold hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={confirmReBid}
                  disabled={!selectedBid.reBidPrice && (!customBidPrice || parseInt(customBidPrice.replace(/,/g, '')) % 100 !== 0)}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  재입찰하기
                </button>
              </div>
            </div>
          </div>
        )}

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