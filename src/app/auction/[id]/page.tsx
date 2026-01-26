'use client';

import { useState, useEffect, useRef, use, useMemo } from 'react';
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

interface PageProps {
  params: Promise<{ id: string }>;
}

// 개체 데이터
const cattleData = [
  // 건화 (101~)
  { id: '260126-101', type: '한우', gender: '암', grade: '1++(9)', months: 32, company: '건화' },
  { id: '260126-102', type: '한우', gender: '거세', grade: '1+', months: 30, company: '건화' },
  { id: '260126-103', type: '한우', gender: '암', grade: '1++(8)', months: 34, company: '건화' },
  { id: '260126-104', type: '한우', gender: '거세', grade: '1', months: 28, company: '건화' },
  { id: '260126-105', type: '한우', gender: '암', grade: '1++(7)', months: 31, company: '건화' },
  { id: '260126-106', type: '한우', gender: '거세', grade: '1+', months: 29, company: '건화' },
  // 대진엠이스 (201~)
  { id: '260126-201', type: '한우', gender: '암', grade: '1++(9)', months: 33, company: '대진엠이스' },
  { id: '260126-202', type: '한우', gender: '거세', grade: '1++(8)', months: 31, company: '대진엠이스' },
  { id: '260126-203', type: '한우', gender: '암', grade: '1+', months: 30, company: '대진엠이스' },
  { id: '260126-204', type: '한우', gender: '거세', grade: '1', months: 27, company: '대진엠이스' },
  { id: '260126-205', type: '한우', gender: '암', grade: '1++(7)', months: 32, company: '대진엠이스' },
  { id: '260126-206', type: '한우', gender: '거세', grade: '1+', months: 29, company: '대진엠이스' },
  // 안심엘피시 (301~)
  { id: '260126-301', type: '한우', gender: '암', grade: '1++(9)', months: 34, company: '안심엘피시' },
  { id: '260126-302', type: '한우', gender: '거세', grade: '1+', months: 30, company: '안심엘피시' },
  { id: '260126-303', type: '한우', gender: '암', grade: '1++(8)', months: 33, company: '안심엘피시' },
  { id: '260126-304', type: '한우', gender: '거세', grade: '1', months: 28, company: '안심엘피시' },
  { id: '260126-305', type: '한우', gender: '암', grade: '1++(7)', months: 31, company: '안심엘피시' },
  { id: '260126-306', type: '한우', gender: '거세', grade: '1+', months: 29, company: '안심엘피시' },
  // 정직한고기 (401~)
  { id: '260126-401', type: '한우', gender: '암', grade: '1++(9)', months: 35, company: '정직한고기' },
  { id: '260126-402', type: '한우', gender: '거세', grade: '1++(8)', months: 32, company: '정직한고기' },
  { id: '260126-403', type: '한우', gender: '암', grade: '1+', months: 30, company: '정직한고기' },
  { id: '260126-404', type: '한우', gender: '거세', grade: '1', months: 26, company: '정직한고기' },
  { id: '260126-405', type: '한우', gender: '암', grade: '1++(7)', months: 33, company: '정직한고기' },
  { id: '260126-406', type: '한우', gender: '거세', grade: '1+', months: 28, company: '정직한고기' },
];

export default function AuctionDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMyBids = searchParams.get('from') === 'myBids';

  // URL에서 접수번호 가져와서 개체 정보 찾기
  const currentCattle = cattleData.find(c => c.id === resolvedParams.id) || {
    id: resolvedParams.id,
    type: '한우',
    gender: '거세',
    grade: '1++(9)',
    months: 30,
    company: '건화'
  };
  
  // zustand 스토어에서 입찰 관련 상태 가져오기
  const { 
    bids: globalBids, 
    setBid,
    quickReBidAmount, 
    setQuickReBidAmount,
    isSecondBidNotificationOn,
    setIsSecondBidNotificationOn,
    toggleFavorite,
    isFavorite
  } = useBidStore();
  
  // hydration 완료 여부
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
    
    // 샘플 차순위 데이터 추가 (디자인 확인용)
    const sampleListingNo = `${getTodayDateCode()}-101-02`; // 등심(우)
    if (!globalBids[sampleListingNo]) {
      setBid(sampleListingNo, {
        myBid: 90000,
        highestBid: 95000,
        status: 'secondHighest',
        time: '26.01.26.(일) 10:30',
        productInfo: {
          listingNo: sampleListingNo,
          partName: '등심(우)',
          weight: '15.6',
          type: '한우거세',
          grade: '1++(9)',
          price: 85000
        }
      });
    }
  }, []);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedBidTab, setSelectedBidTab] = useState(fromMyBids ? '개체정보' : '입찰하기');
  const [myBidHistoryTab, setMyBidHistoryTab] = useState('입찰 진행 중');
  const [showBidSheet, setShowBidSheet] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60 * 60); // 60분 = 3600초
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

  // 부위별 최저단가
  const baseMinPrices: Record<string, number> = {
    '등심(좌)': 85000, '등심(우)': 85000,
    '안심': 95000,
    '채끝': 82000,
    '갈비(좌)': 78000, '갈비(우)': 78000,
    '특수부위': 72000,
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
    
    setShowBidDialog(true);
  };

  // 입찰 추가 함수
  const addNewBid = () => {
    if (!selectedPart || !selectedWeight || !bidPrice) {
      return;
    }

    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const timeString = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.(${days[now.getDay()]}) ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // 선택된 부위의 상장번호 가져오기
    const selectedPartData = partsData.find(p => p.part === selectedPart);
    const listingNo = selectedPartData?.listingNo || '';
    
    const newBid = {
      id: Date.now(), // 고유 ID 생성
      auctionNumber: currentAuctionInfo.auctionNumber,
      listingNo: listingNo,
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
    
    // 부위별 입찰 정보 업데이트 (zustand 스토어에 저장)
    const myPrice = parseInt(removeCommas(bidPrice));
    const existingBid = globalBids[listingNo];
    const currentTopPrice = existingBid?.highestBid || 0;
    
    // 나의 입찰가가 현재 최고가보다 높거나 같으면 최고가
    const isTopBid = myPrice >= currentTopPrice;
    const newTopPrice = isTopBid ? myPrice : currentTopPrice;
    
    setBid(listingNo, {
      myBid: myPrice,
      highestBid: newTopPrice,
      status: isTopBid ? 'highest' : 'secondHighest',
      time: timeString,
      productInfo: {
        listingNo: listingNo,
        partName: selectedPart,
        weight: selectedWeight,
        type: currentAuctionInfo.breed,
        grade: currentAuctionInfo.grade,
        price: baseMinPrices[selectedPart] || 50000
      }
    });
    
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

  // 메인 이미지 배열 (등심 이미지) - 개체별로 순서 다르게
  const allImages = [
    { id: 1, src: "/등심1.png", alt: "등심1" },
    { id: 2, src: "/등심2.png", alt: "등심2" },
    { id: 3, src: "/등심3.png", alt: "등심3" },
    { id: 4, src: "/등심4.png", alt: "등심4" },
    { id: 5, src: "grade-certificate", alt: "등급판정확인서", isDocument: true },
    { id: 6, src: "slaughter-certificate", alt: "도축검사증명서", isDocument: true }
  ];

  // 개체 ID에 따라 이미지 순서 변경
  const getImagesForAuction = (auctionId: string) => {
    const id = parseInt(auctionId);
    
    // 각 개체별로 다른 이미지 순서 패턴 (4개 등심 이미지 + 2개 서류)
    const patterns: number[][] = [
      [0, 1, 2, 3, 4, 5], // 개체 1: 등심1, 등심2, 등심3, 등심4, 등급판정확인서, 도축검사증명서
      [1, 3, 0, 2, 4, 5], // 개체 2
      [2, 0, 3, 1, 4, 5], // 개체 3
      [3, 2, 1, 0, 4, 5], // 개체 4
      [1, 0, 3, 2, 4, 5], // 개체 5
    ];
    
    const patternIndex = (id - 1) % patterns.length;
    const pattern = patterns[patternIndex];
    
    return pattern.map(imageIndex => ({
      ...allImages[imageIndex],
      auctionNo: `${getTodayDateCode()}-${String(id).padStart(3, '0')}`
    }));
  };

  const mainImages = getImagesForAuction(resolvedParams.id);

  // 상장번호 생성 함수
  // 형식: 260126-{접수번호 뒷3자리}-{부위번호(01~19)}
  const getListingNumber = (auctionId: string, partIndex: number) => {
    // auctionId가 "260126-101" 형식일 경우 뒷 3자리 추출
    const idParts = auctionId.split('-');
    const idSuffix = idParts.length > 1 ? idParts[1] : auctionId;
    const partNumber = String(partIndex + 1).padStart(2, '0'); // 01부터 시작
    return `${getTodayDateCode()}-${idSuffix}-${partNumber}`;
  };

  // 개체별 부위 중량 데이터 생성
  const getPartsData = (auctionId: string) => {
    const id = parseInt(auctionId);
    
    // 부위별 중량 범위 (min, max) - 좌/우 각각의 중량
    const partsWithRange = [
      { part: '등심(좌)', min: 15.0, max: 16.0 },
      { part: '등심(우)', min: 15.0, max: 16.0 },
      { part: '안심', min: 4.0, max: 5.0 },
      { part: '채끝', min: 7.5, max: 8.5 },
      { part: '갈비(좌)', min: 12.0, max: 13.0 },
      { part: '갈비(우)', min: 12.0, max: 13.0 },
      { part: '특수부위', min: 3.0, max: 4.0 },
      { part: '설도(좌)', min: 16.0, max: 17.5 },
      { part: '설도(우)', min: 16.0, max: 17.5 },
      { part: '앞다리', min: 24.0, max: 26.0 },
      { part: '우둔', min: 20.0, max: 22.0 },
      { part: '목심', min: 14.0, max: 15.0 },
      { part: '양지(좌)', min: 12.0, max: 13.0 },
      { part: '양지(우)', min: 12.0, max: 13.0 },
      { part: '사태', min: 14.5, max: 15.5 },
      { part: '꼬리', min: 15.5, max: 16.5 },
      { part: '족', min: 10.0, max: 11.0 },
      { part: '사골', min: 3.0, max: 4.0 },
      { part: '잡뼈', min: 21.0, max: 23.0 }
    ];

    // ID에 따라 결정론적으로 중량 계산 (범위 내에서)
    return partsWithRange.map((item, index) => {
      const variation = ((id + index) * 0.17) % 1; // 0~1 사이 값
      const weight = item.min + (item.max - item.min) * variation;
      // 일부 부위에 시장 최고가 설정 (다른 사람이 입찰한 경우)
      const marketHighestBid = index === 2 ? 125000 : undefined; // 안심에 시장 최고가 설정
      return {
        part: item.part,
        weight: weight.toFixed(1),
        listingNo: getListingNumber(auctionId, index),
        marketHighestBid
      };
    });
  };

  const partsData = getPartsData(resolvedParams.id);

  // 개체별 정보 생성
  const getAuctionInfo = (auctionId: string) => {
    const id = parseInt(auctionId);
    const breeds = ['한우거세', '한우암', '한우거세', '한우거세', '한우암'];
    const qualityGrades = ['1++', '1++', '1+', '1++', '1+']; // 육질 등급
    const yieldGrades = ['A', 'B', 'A', 'A', 'C']; // 육량 지수
    const marbling = ['9', '8', '7', '9', '8']; // 근내지방도
    const months = ['30', '28', '32', '29', '31'];
    
    return {
      auctionNumber: `${getTodayDateCode()}-${String(id).padStart(3, '0')}`,
      breed: breeds[(id - 1) % breeds.length],
      grade: `${qualityGrades[(id - 1) % qualityGrades.length]}${yieldGrades[(id - 1) % yieldGrades.length]}(${marbling[(id - 1) % marbling.length]})`,
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
        listingNo: parts[0].listingNo,
        part: parts[0].part,
        weight: parts[0].weight,
        price: '83000',
        topBidPrice: 84000,
        time: getTodayTimeFormatted(0, 30),
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
          listingNo: parts[4].listingNo,
          part: parts[4].part,
          weight: parts[4].weight,
          price: '111000',
          topBidPrice: 113000,
          time: getTodayTimeFormatted(0, 20),
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



  // 마감시간 카운트다운
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 테스트용 입찰 데이터 (차순위 포함)
  useEffect(() => {
    const dateCode = getTodayDateCode();
    const todayPrefix = `${dateCode.slice(0, 2)}.${dateCode.slice(2, 4)}.${dateCode.slice(4, 6)}`; // "26.01.19"
    
    // 기존 데이터가 없거나 time이 오늘 날짜가 아니면 업데이트
    const existingBid1 = globalBids[`${dateCode}-001-0001`];
    if (!existingBid1 || !existingBid1.time.startsWith(todayPrefix)) {
      setBid(`${dateCode}-001-0001`, {
        myBid: 150000,
        highestBid: 150000,
        status: 'highest',
        time: getTodayTimeFormatted(0, 5), // 5분 전
        productInfo: {
          listingNo: `${dateCode}-001-0001`,
          partName: '등심(좌)',
          weight: '9kg',
          type: '한우 거세',
          grade: '1++A',
          price: 150000
        }
      });
    }
    
    // 차순위 데이터
    const existingBid2 = globalBids[`${dateCode}-001-0002`];
    if (!existingBid2 || !existingBid2.time.startsWith(todayPrefix)) {
      setBid(`${dateCode}-001-0002`, {
        myBid: 143000,
        highestBid: 148000,
        status: 'secondHighest',
        time: getTodayTimeFormatted(0, 10), // 10분 전
        productInfo: {
          listingNo: `${dateCode}-001-0002`,
          partName: '등심(우)',
          weight: '9kg',
          type: '한우 거세',
          grade: '1++A',
          price: 143000
        }
      });
    }
  }, [globalBids, setBid]);

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
              {/* 경매번호 및 뒤로가기 */}
              <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center">
                  <button
                    onClick={() => router.push('/?tab=개체별')}
                    className="p-1 rounded transition-colors hover:bg-gray-100 mr-3"
                    aria-label="뒤로가기"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-700" />
                  </button>
                  
                  <div>
                    <p className="text-base font-bold text-gray-900">{currentCattle.id}</p>
                    <p className="text-[11px] text-gray-500">
                      {currentCattle.type} / {currentCattle.gender} / {currentCattle.grade} / {currentCattle.months}개월
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleFavorite(currentCattle.id)}
                  className={`p-2 rounded transition-colors ${
                    isHydrated && isFavorite(currentCattle.id)
                      ? 'text-gray-900'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                  aria-label="관심 등록"
                >
                  <Star className={`w-5 h-5 ${isHydrated && isFavorite(currentCattle.id) ? 'fill-current' : ''}`} />
                </button>
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
                <div className="w-full aspect-square bg-gray-200">
                  {(mainImages[currentImageIndex] as any).isDocument ? (
                    // 서류 이미지 (A4 양식)
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 p-4">
                      <div className="w-full max-w-[280px] bg-white shadow-lg border border-gray-300 p-4 aspect-[1/1.414]">
                        {mainImages[currentImageIndex].src === 'grade-certificate' ? (
                          // 등급판정확인서
                          <div className="h-full flex flex-col text-[8px] text-gray-700">
                            <div className="text-center border-b border-gray-400 pb-2 mb-2">
                              <p className="text-[12px] font-bold text-gray-900">등급판정확인서</p>
                              <p className="text-gray-500 mt-1">Grade Certification</p>
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex"><span className="w-16 text-gray-500">접수번호:</span><span className="font-medium">{currentCattle.id}</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">축종:</span><span>{currentCattle.type}</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">성별:</span><span>{currentCattle.gender}</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">등급:</span><span className="font-bold text-gray-900">{currentCattle.grade}</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">개월령:</span><span>{currentCattle.months}개월</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">도체중량:</span><span>520kg</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">등지방:</span><span>15mm</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">등심면적:</span><span>98㎠</span></div>
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
                        ) : (
                          // 도축검사증명서
                          <div className="h-full flex flex-col text-[8px] text-gray-700">
                            <div className="text-center border-b border-gray-400 pb-2 mb-2">
                              <p className="text-[12px] font-bold text-gray-900">도축검사증명서</p>
                              <p className="text-gray-500 mt-1">Slaughter Inspection Certificate</p>
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex"><span className="w-16 text-gray-500">접수번호:</span><span className="font-medium">{currentCattle.id}</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">도축일:</span><span>2026.01.16</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">도축장:</span><span>음성축산물공판장</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">도축번호:</span><span>201</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">이력번호:</span><span>002-1486-7293-1</span></div>
                              <div className="flex"><span className="w-16 text-gray-500">출하농가:</span><span>{currentCattle.company}</span></div>
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
                        )}
                      </div>
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
                <div className="flex gap-1.5 justify-start overflow-x-auto">
                  {mainImages.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-14 h-14 flex-shrink-0 rounded overflow-hidden transition-all ${
                        currentImageIndex === index 
                          ? 'border-2 border-gray-400' 
                          : 'border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      {(image as any).isDocument ? (
                        // 서류 썸네일
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <div className="w-8 h-10 bg-white border border-gray-300"></div>
                        </div>
                      ) : (
                        <img 
                          src={image.src}
                          alt={image.alt}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 버튼 영역 (항상 고정) */}
              <div className="px-3 pt-2 pb-2 bg-white flex items-center justify-end gap-2">
                <a
                  href="https://aunit.mtrace.go.kr/mtracesearch/cattleNoSearch.do?btsProgNo=0109008401&btsActionMethod=SELECT&cattleNo=002189438539"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  축산물 이력정보
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 text-white hover:bg-gray-900 transition-colors"
                >
                  {showInfoPanel ? '개체정보 닫기' : '개체정보 보기'}
                </button>
              </div>

              {/* 등급 정보 테이블 (애니메이션) */}
              <AnimatePresence>
                {showInfoPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mx-3 bg-white border border-gray-200 rounded overflow-hidden">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-100/80 border-b border-gray-200">
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">등급</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">개월령</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">등지방</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">등심면적</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">근내지방</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">육색</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">지방색</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">조직감</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">성숙도</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 px-2 text-center text-gray-700">{currentCattle.grade}</td>
                            <td className="py-2 px-2 text-center text-gray-700">{currentCattle.months}</td>
                            <td className="py-2 px-2 text-center text-gray-700">16</td>
                            <td className="py-2 px-2 text-center text-gray-700">123</td>
                            <td className="py-2 px-2 text-center text-gray-700">9</td>
                            <td className="py-2 px-2 text-center text-gray-700">5</td>
                            <td className="py-2 px-2 text-center text-gray-700">3</td>
                            <td className="py-2 px-2 text-center text-gray-700">1</td>
                            <td className="py-2 px-2 text-center text-gray-700">2</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 도축/가공 정보 테이블 */}
                    <div className="mx-3 mt-2 mb-2 bg-white border border-gray-200 rounded overflow-hidden">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-gray-100/80 border-b border-gray-200">
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">이력번호</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">도축장</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">도축번호</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">도체중</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">상장업체</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">가공일</th>
                            <th className="py-1.5 px-2 text-center font-medium text-gray-500">가공중량</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 px-2 text-center text-gray-700">002-1486-7293-1</td>
                            <td className="py-2 px-2 text-center text-gray-700">음성</td>
                            <td className="py-2 px-2 text-center text-gray-700">201</td>
                            <td className="py-2 px-2 text-center text-gray-700">520</td>
                            <td className="py-2 px-2 text-center text-gray-700">{currentCattle.company}</td>
                            <td className="py-2 px-2 text-center text-gray-700">26.01.17</td>
                            <td className="py-2 px-2 text-center text-gray-700">312</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


              {/* 호가창 */}
              <div id="bid-order-section" className="border-t border-gray-200">
                {/* 호가창 */}
                <div className="w-full flex flex-col border-b border-gray-200">
                  {/* 호가창 헤더 */}
                  <div className="bg-gray-100 border-b border-gray-200 flex-shrink-0 h-7 flex items-center sticky top-[56px] z-10">
                    <div className="grid px-2 text-[11px] font-medium text-gray-500 w-full" style={{gridTemplateColumns: '0.9fr 0.7fr 0.9fr 1fr 1fr 0.7fr'}}>
                      <div className="text-center">부위</div>
                      <div className="text-center">중량</div>
                      <div className="text-center">최저단가</div>
                      <div className="text-center">최고입찰가</div>
                      <div className="text-center">나의입찰가</div>
                      <div className="text-center">상태</div>
                    </div>
                  </div>

                  {/* 호가 데이터 스크롤 영역 */}
                  <div className="flex-1 overflow-y-auto">
                    {/* 매도호가 (위쪽, 높은 가격) */}
                    {partsData.map((item, index) => {
                      const bidInfo = globalBids[item.listingNo];
                      const hasBid = !!bidInfo;
                      const minPrice = baseMinPrices[item.part] || 50000;
                      const hasMarketBid = !!item.marketHighestBid; // 시장 최고가 존재 여부
                      const displayHighestBid = hasBid ? bidInfo.highestBid : item.marketHighestBid;
                      
                      return (
                        <div 
                          key={`sell-${index}`}
                          className={`grid px-2 py-2 border-b border-gray-100 transition-colors ${
                            index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                          }`}
                          style={{gridTemplateColumns: '0.9fr 0.7fr 0.9fr 1fr 1fr 0.7fr'}}
                        >
                          <div className="text-center text-[11px] text-gray-700 flex items-center justify-center">
                            {item.part}
                          </div>
                          <div className="text-center text-[11px] text-gray-700 flex items-center justify-center">
                            {item.weight}kg
                          </div>
                          <div className="text-center text-[11px] text-gray-700 flex items-center justify-center">
                            {minPrice.toLocaleString()}
                          </div>
                          <div className={`text-center text-[11px] flex items-center justify-center ${
                            hasBid || hasMarketBid ? 'text-gray-900 font-medium' : 'text-gray-400'
                          }`}>
                            {displayHighestBid ? `${displayHighestBid.toLocaleString()}` : '-'}
                          </div>
                          <div className="flex items-center justify-center">
                            {hasBid ? (
                              <div className="flex flex-col items-center">
                                <span 
                                  onClick={() => {
                                    if (bidInfo.status !== 'highest') {
                                      setSelectedPart(item.part);
                                      setSelectedWeight(item.weight);
                                      setBidPrice('');
                                      setShowBidSheet(true);
                                    }
                                  }}
                                  className={`text-[11px] font-medium text-gray-900 leading-none ${bidInfo.status !== 'highest' ? 'cursor-pointer' : ''}`}
                                >
                                  {bidInfo.myBid.toLocaleString()}
                                </span>
                                {bidInfo.status !== 'highest' && (
                                  <button
                                    onClick={() => {
                                      setSelectedPart(item.part);
                                      setSelectedWeight(item.weight);
                                      setBidPrice('');
                                      setShowBidSheet(true);
                                    }}
                                    className="mt-1 px-2 py-0.5 text-[10px] font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                                  >
                                    재입찰
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedPart(item.part);
                                  setSelectedWeight(item.weight);
                                  setBidPrice('');
                                  setShowBidSheet(true);
                                }}
                                className="px-2 py-1 text-[10px] font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                              >
                                입찰하기
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-center">
                            {hasBid ? (
                              <span className={`text-[10px] font-medium ${
                                bidInfo.status === 'highest'
                                  ? 'text-blue-600' 
                                  : 'text-red-500'
                              }`}>
                                {bidInfo.status === 'highest' ? '최고' : '차순위'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                  </div>
                </div>
              </div>

              {/* 내 입찰내역(진행중) */}
              <div className="px-4 pt-4 pb-24 border-t border-gray-200 bg-white">
                <h3 className="text-sm font-bold text-gray-900 mb-3">내 입찰내역(진행중)</h3>
                
                
                {Object.keys(globalBids).length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-base font-medium text-gray-500">입찰 내역이 없습니다</h3>
                  </div>
                ) : (
                  <div 
                    ref={bidTableRef}
                    className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleBidTableMouseDown}
                    onMouseMove={handleBidTableMouseMove}
                    onMouseUp={handleBidTableMouseUp}
                    onMouseLeave={handleBidTableMouseLeave}
                  >
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">상태</th>
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">일자</th>
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">상장번호</th>
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">부위</th>
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">등급</th>
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">중량</th>
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">최고가</th>
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">나의 입찰가</th>
                          <th className="px-2 py-2.5 text-center font-bold text-gray-700">액션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(globalBids)
                          .filter(([listingNo]) => {
                            // 오늘 날짜의 경매분만 필터링 (상장번호 앞 6자리가 날짜)
                            const todayDate = currentAuctionInfo.auctionNumber.split('-')[0]; // "250806"
                            return listingNo.startsWith(todayDate);
                          })
                          .sort(([, a], [, b]) => {
                            // 일자 기준 내림차순 정렬
                            const parseTime = (time: string) => {
                              const match = time.match(/(\d{2})\.(\d{2})\.(\d{2}).*?(\d{2}):(\d{2})/);
                              if (match) {
                                return new Date(2000 + parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), parseInt(match[4]), parseInt(match[5])).getTime();
                              }
                              return 0;
                            };
                            return parseTime(b.time) - parseTime(a.time);
                          })
                          .map(([listingNo, bid]) => {
                          const productInfo = bid.productInfo;
                          if (!productInfo) return null;
                          
                          return (
                            <tr key={listingNo} className="border-b border-gray-100 hover:bg-gray-50">
                              {/* 상태 */}
                              <td className="px-2 py-2.5 text-center">
                                {bid.status === 'highest' ? (
                                <span className="inline-flex px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                                    최고가격
                                </span>
                                ) : (
                                  <span className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                                    차순위
                                  </span>
                                )}
                              </td>
                              {/* 일자 */}
                              <td className="px-2 py-2.5 text-center text-gray-600 text-[11px]">
                                {bid.time}
                              </td>
                              {/* 상장번호 */}
                              <td className="px-2 py-2.5 text-center font-medium text-gray-900">
                                <Link 
                                  href={`/auction/${parseInt(listingNo.split('-')[1])}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                {listingNo}
                                </Link>
                              </td>
                              {/* 부위 */}
                              <td className="px-2 py-2.5 text-center text-gray-900">
                                <Link 
                                  href={`/auction?tab=part&part=${
                                    productInfo.partName.includes('등심') ? 'sirloin' :
                                    productInfo.partName.includes('채끝') ? 'striploin' :
                                    productInfo.partName.includes('목심') ? 'chuck' :
                                    productInfo.partName.includes('앞다리') ? 'foreleg' :
                                    productInfo.partName.includes('갈비') ? 'ribs' :
                                    productInfo.partName.includes('설도') ? 'round' :
                                    productInfo.partName.includes('양지') ? 'brisket' :
                                    productInfo.partName.includes('우둔') ? 'rump' :
                                    productInfo.partName.includes('사태') ? 'shank' :
                                    productInfo.partName.includes('안심') ? 'tenderloin' :
                                    productInfo.partName.includes('특수') ? 'special' :
                                    productInfo.partName.includes('꼬리') ? 'tail' :
                                    productInfo.partName.includes('족') ? 'feet' :
                                    productInfo.partName.includes('사골') ? 'bone' :
                                    productInfo.partName.includes('잡뼈') ? 'misc' : 'sirloin'
                                  }`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                {productInfo.partName}
                                </Link>
                              </td>
                              {/* 등급 */}
                              <td className="px-2 py-2.5 text-center text-gray-900" style={{ letterSpacing: '-0.05em' }}>
                                {productInfo.grade}
                              </td>
                              {/* 중량 */}
                              <td className="px-2 py-2.5 text-center text-gray-900">
                                {productInfo.weight}
                              </td>
                              {/* 최고가 */}
                              <td className="px-2 py-2.5 text-center font-medium text-gray-900">
                                {bid.highestBid.toLocaleString()}원
                              </td>
                              {/* 나의 입찰가 */}
                              <td className="px-2 py-2.5 text-center font-medium text-gray-900">
                                {bid.myBid.toLocaleString()}원
                              </td>
                              {/* 액션 */}
                              <td className="px-2 py-2.5 text-center">
                                {bid.status === 'highest' ? (
                                  <span className="text-gray-400 text-[10px]">-</span>
                                ) : (
                                    <button
                                      onClick={() => {
                                        if (productInfo) {
                                          setSelectedPart(productInfo.partName);
                                          setSelectedWeight(productInfo.weight);
                                          setBidPrice('');
                                          setShowBidSheet(true);
                                        }
                                      }}
                                    className="px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded hover:bg-gray-900 transition-colors"
                                    >
                                    재입찰
                                    </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto z-[100]">
                  {/* 핸들 */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                  </div>
                  
                  {/* 헤더 */}
                  <div className="px-4 pb-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">입찰하기</h3>
                      <button 
                        onClick={() => setShowBidSheet(false)}
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
                            <td className="py-2.5 px-1.5 text-center text-gray-700 whitespace-nowrap">
                              {selectedPart ? partsData.find(p => p.part === selectedPart)?.listingNo || '-' : '-'}
                            </td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">{currentCattle.type}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">{currentCattle.gender}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">{currentCattle.grade}</td>
                            <td className="py-2.5 px-1.5 text-center text-gray-700">{currentCattle.months}</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">{selectedPart || '-'}</td>
                            <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">{selectedWeight ? `${selectedWeight}kg` : '-'}</td>
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
                          value={bidPrice}
                          onChange={(e) => {
                            const formattedValue = formatNumber(e.target.value);
                            setBidPrice(formattedValue);
                          }}
                          placeholder={selectedPart ? (() => {
                            const partData = partsData.find(p => p.part === selectedPart);
                            const bidInfo = partData ? globalBids[partData.listingNo] : null;
                            const highestBid = bidInfo?.highestBid || partData?.marketHighestBid;
                            if (highestBid) {
                              return `최고입찰가 ${highestBid.toLocaleString()}`;
                            }
                            return `최저단가 ${(baseMinPrices[selectedPart] || 50000).toLocaleString()}`;
                          })() : '0'}
                          className="w-full px-4 py-3.5 pr-12 text-right text-xl font-bold border border-gray-200 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white text-black placeholder:text-gray-400"
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
                              const currentPrice = bidPrice === '' ? 0 : parseFloat(removeCommas(bidPrice));
                              const newPrice = currentPrice + amount;
                              setBidPrice(formatNumber(newPrice.toString()));
                            }}
                            className="py-2 text-xs border border-gray-200 rounded hover:bg-gray-50 font-medium text-gray-700"
                          >
                            +{amount.toLocaleString()}
                          </button>
                        ))}
                        <button
                          onClick={() => setBidPrice('')}
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
                      disabled={!bidPrice || !selectedPart}
                      className="w-full py-3.5 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-base rounded"
                    >
                      입찰하기
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
                        <td className="py-2.5 px-1.5 text-center text-gray-700 whitespace-nowrap">
                          {selectedPart ? partsData.find(p => p.part === selectedPart)?.listingNo || '-' : '-'}
                        </td>
                        <td className="py-2.5 px-1.5 text-center text-gray-700">{currentCattle.type}</td>
                        <td className="py-2.5 px-1.5 text-center text-gray-700">{currentCattle.gender}</td>
                        <td className="py-2.5 px-1.5 text-center text-gray-700">{currentCattle.grade}</td>
                        <td className="py-2.5 px-1.5 text-center text-gray-700">{currentCattle.months}</td>
                        <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">{selectedPart || '-'}</td>
                        <td className="py-2.5 px-1.5 text-center font-medium text-gray-900">{selectedWeight ? `${selectedWeight}kg` : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 입찰 금액 정보 */}
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">입찰가격</span>
                    <span className="text-sm font-medium text-gray-900">{bidPrice && bidPrice !== '0' ? `${formatNumber(bidPrice)}원/kg` : "-"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-bold text-gray-900">총 입찰금액</span>
                    <span className="text-lg font-bold text-gray-900">
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
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowBidDialog(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                >
                  취소
                </button>
                <button
                  onClick={addNewBid}
                  className="flex-1 py-2.5 px-4 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors font-medium"
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
                <div className="text-sm text-gray-600 mb-2">상장번호: {selectedBid.listingNo || selectedBid.auctionNumber}</div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">재입찰가격 입력</label>
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