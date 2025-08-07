'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AuctionDetailPage({ params }: PageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedBidTab, setSelectedBidTab] = useState('입찰하기');
  const [myBidHistoryTab, setMyBidHistoryTab] = useState('입찰 진행 중');
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [bidPrice, setBidPrice] = useState('0');
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'warning' | 'success'>('warning');
  const [myBids, setMyBids] = useState([
    { 
      id: 1, 
      auctionNumber: '250806-001',
      part: '윗등심(좌)', 
      weight: '8.5', 
      price: '83000', 
      time: '25.08.06.(수) 09:23', 
      status: 'active',
      breed: '한우',
      gender: '거세',
      grade: '1++A',
      months: '30',
      totalAmount: Math.round(83000 * 8.5).toString()
    },
    { 
      id: 2, 
      auctionNumber: '250806-001',
      part: '안심(우)', 
      weight: '3.2', 
      price: '111000', 
      time: '25.08.06.(수) 09:47', 
      status: 'active',
      breed: '한우',
      gender: '거세',
      grade: '1++A',
      months: '30',
      totalAmount: Math.round(111000 * 3.2).toString()
    },
    { 
      id: 3, 
      auctionNumber: '250806-001',
      part: '채끝(좌)', 
      weight: '4.2', 
      price: '22000', 
      time: '25.08.06.(수) 09:52', 
      status: 'cancelled',
      breed: '한우',
      gender: '거세',
      grade: '1++A',
      months: '30',
      totalAmount: Math.round(22000 * 4.2).toString()
    },
    { 
      id: 4, 
      auctionNumber: '250806-001',
      part: '목심(좌)', 
      weight: '9.3', 
      price: '23000', 
      time: '25.08.06.(수) 09:35', 
      status: 'finished',
      breed: '한우',
      gender: '거세',
      grade: '1++A',
      months: '30',
      totalAmount: Math.round(23000 * 9.3).toString()
    }
  ]);

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
      id: myBids.length + 1,
      auctionNumber: '250806-001',
      part: selectedPart,
      weight: selectedWeight,
      price: removeCommas(bidPrice),
      time: timeString,
      status: 'active',
      breed: '한우',
      gender: '거세',
      grade: '1++A',
      months: '30',
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

  // 메인 이미지 배열 (등심 이미지)
  const mainImages = [
    { id: 1, src: "/등심1.png", alt: "등심1" },
    { id: 2, src: "/등심2.png", alt: "등심2" },
    { id: 3, src: "/등심3.png", alt: "등심3" },
    { id: 4, src: "/등심4.png", alt: "등심4" }
  ];

  // 배너 데이터 (빈 상태)
  const banners = [
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" }
  ];



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
                    <Link 
                      href="/auction" 
                      className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <Link href="/" className="text-2xl font-bold text-red-600" style={{ letterSpacing: '-0.05em' }}>
                      HanuMuch
                    </Link>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 text-gray-600 hover:bg-transparent hover:text-gray-600"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* 메인 이미지 배너 */}
              <div className="relative overflow-hidden">
                <div className="w-full aspect-square bg-gray-200">
                  <img 
                    src={mainImages[currentImageIndex].src}
                    alt={mainImages[currentImageIndex].alt}
                    className="w-full h-full object-cover"
                  />
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
              <div className="px-4 py-4">
                <div className="flex gap-2 justify-start">
                  {mainImages.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-20 h-20 rounded overflow-hidden transition-all ${
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
              <div className="flex border-t border-gray-200" style={{height: '570px'}}>
                {/* 왼쪽 호가창 */}
                <div className="w-2/5 border-r border-gray-200 flex flex-col border-b border-gray-200">
                  {/* 호가창 헤더 */}
                  <div className="bg-gray-50 border-b border-gray-200 flex-shrink-0 h-10 flex items-center">
                    <div className="grid px-2 text-xs font-bold text-gray-700 w-full" style={{gridTemplateColumns: '1fr 1fr'}}>
                      <div className="text-center border-r border-gray-300">부위</div>
                      <div className="text-center">중량</div>
                    </div>
                  </div>

                  {/* 호가 데이터 스크롤 영역 */}
                  <div className="flex-1 overflow-y-auto">
                    {/* 매도호가 (위쪽, 높은 가격) */}
                    {[
                      { part: '윗등심(좌)', weight: '8.5' },
                      { part: '윗등심(우)', weight: '8.8' },
                      { part: '아랫등심(좌)', weight: '9.8' },
                      { part: '아랫등심(우)', weight: '9.6' },
                      { part: '안심(좌)', weight: '3.3' }
                    ].map((item, index) => (
                      <div 
                        key={`sell-${index}`}
                        className="grid px-2 py-3 border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer"
                        style={{gridTemplateColumns: '1fr 1fr'}}
                        onClick={() => {
                          setSelectedPart(item.part);
                          setSelectedWeight(item.weight);
                        }}
                      >
                        <div className="text-center text-xs font-bold text-black flex items-center justify-center border-r border-gray-200">
                          {item.part}
                        </div>
                        <div className="text-center text-xs font-bold text-black flex items-center justify-center">
                          {item.weight}kg
                        </div>
                      </div>
                    ))}
                    
                    {/* 현재가 (기준점) */}
                    <div 
                      className="grid px-2 py-3 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50" 
                      style={{gridTemplateColumns: '1fr 1fr'}}
                      onClick={() => {
                        setSelectedPart('안심(우)');
                        setSelectedWeight('3.2');
                      }}
                    >
                      <div className="text-center text-xs font-bold text-black flex items-center justify-center border-r border-gray-200">
                        안심(우)
                      </div>
                      <div className="text-center text-xs font-bold text-black flex items-center justify-center">
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
                        className="grid px-2 py-3 border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer"
                        style={{gridTemplateColumns: '1fr 1fr'}}
                        onClick={() => {
                          setSelectedPart(item.part);
                          setSelectedWeight(item.weight);
                        }}
                      >
                        <div className={`text-center font-bold text-black flex items-center justify-center border-r border-gray-200 ${
                          item.part.includes('치마살,업진살') ? 'text-[10px]' : 'text-xs'
                        }`}>
                          {item.part}
                        </div>
                        <div className="text-center text-xs font-bold text-black flex items-center justify-center">
                          {item.weight}kg
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 오른쪽 입찰주문 창 */}
                <div className="w-3/5 flex flex-col border-b border-gray-200">
                  {/* 탭 헤더 */}
                  <div className="bg-gray-50 border-b border-gray-200 flex-shrink-0 h-10">
                    <div className="flex h-full">
                      <button
                        onClick={() => setSelectedBidTab('입찰하기')}
                        className={`flex-1 flex items-center justify-center text-xs font-bold transition-colors ${
                          selectedBidTab === '입찰하기'
                            ? 'bg-white text-black border-b-2 border-red-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        입찰하기
                      </button>
                      <button
                        onClick={() => setSelectedBidTab('개체정보')}
                        className={`flex-1 flex items-center justify-center text-xs font-bold transition-colors ${
                          selectedBidTab === '개체정보'
                            ? 'bg-white text-black border-b-2 border-red-600'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        개체정보
                      </button>
                    </div>
                  </div>

                  <div className="px-3 py-4 flex-1 overflow-y-auto">
                    {/* 입찰하기 탭 */}
                    {selectedBidTab === '입찰하기' && (
                      <div className="space-y-4">
                        {/* 선택된 부위 표시 */}
                        <div>
                          <div className="text-xs text-gray-600 mb-1">선택된 부위</div>
                          <div className="relative">
                            <div className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded bg-gray-50 text-right">
                              {selectedPart ? <span className="font-bold">{selectedPart}</span> : <span className="text-gray-400">좌측에서 경매 부위를 선택하세요</span>}
                            </div>
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            </div>
                          </div>
                        </div>

                        {/* 중량 */}
                        <div>
                          <div className="text-xs text-gray-600 mb-1">중량</div>
                          <div className="relative">
                            <div className="w-full px-3 py-2 pr-10 text-right text-sm border border-gray-300 rounded bg-gray-50">
                              {selectedWeight ? <span className="font-bold">{selectedWeight}</span> : <span className="text-gray-400">좌측에서 경매 부위를 선택하세요</span>}
                            </div>
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                              kg
                            </div>
                          </div>
                        </div>

                        {/* 입찰가격 */}
                        <div>
                          <div className="text-xs text-gray-600 mb-1">입찰가격(원/kg)</div>
                          <div className="relative mb-2">
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
                              className="w-full px-3 py-2 pr-10 text-right text-sm font-bold border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                              원
                            </div>
                          </div>
                          {/* 가격 조정 버튼 */}
                          <div className="flex gap-1">
                            {[1000, 5000, 10000].map((amount) => (
                              <button
                                key={amount}
                                onClick={() => {
                                  const currentPrice = bidPrice === '0' ? 0 : parseFloat(removeCommas(bidPrice));
                                  const newPrice = currentPrice + amount;
                                  setBidPrice(formatNumber(newPrice.toString()));
                                }}
                                className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 font-medium"
                              >
                                +{amount === 1000 ? '천원' : amount === 5000 ? '오천원' : '만원'}
                              </button>
                            ))}
                            <button
                              onClick={() => setBidPrice('0')}
                              className="flex-1 py-1.5 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-gray-700 font-medium"
                            >
                              초기화
                            </button>
                          </div>
                        </div>

                        {/* 주문 요약 */}
                        <div>
                          <div className="bg-gray-50 p-3 border rounded space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">개체정보</span>
                              <div className="flex gap-1">
                                <span className="text-xs px-1.5 py-0.5 bg-amber-600 text-white rounded font-bold">한우거세</span>
                                <span className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded font-bold">1++A</span>
                                <span className="text-xs px-1.5 py-0.5 bg-orange-500 text-white rounded font-bold">No.9</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">부위</span>
                              <span className="text-sm text-gray-900">{selectedPart || "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">입찰가격</span>
                              <span className="text-sm text-gray-900">{bidPrice ? `${bidPrice}원/kg` : "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">중량</span>
                              <span className="text-sm text-gray-900">{selectedWeight ? `${selectedWeight}kg` : "-"}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 mt-2">
                              <div className="flex justify-between items-center">
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

                        {/* 입찰하기 버튼 */}
                        <button 
                          onClick={handleBidClick}
                          className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded"
                        >
                          입찰하기
                        </button>
                      </div>
                    )}

                                          {/* 개체정보 탭 */}
                      {selectedBidTab === '개체정보' && (
                      <div className="space-y-3">
                        {/* 개체 정보 */}
                        <div className="bg-gray-50 p-3 rounded border">
                          <h4 className="text-sm font-bold text-gray-900 mb-3">개체 기본정보</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">경매번호</span>
                              <span className="text-xs text-gray-900">250806-001</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">이력번호</span>
                              <span className="text-xs text-gray-900">002-1486-7293-5</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">품종 / 성별</span>
                              <span className="text-xs text-gray-900">한우 / 거세</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">등급</span>
                              <span className="text-xs text-gray-900">1++A</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">개월령</span>
                              <span className="text-xs text-gray-900">30개월령</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded border">
                          <h4 className="text-sm font-bold text-gray-900 mb-3">가공정보</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">가공업체</span>
                              <span className="text-xs text-gray-900">송정가공</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">가공일자</span>
                              <span className="text-xs text-gray-900">2025.08.05.(화)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600">도축장</span>
                              <span className="text-xs text-gray-900">농협 음성축산물공판장</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded border">
                          <h4 className="text-sm font-bold text-gray-900 mb-3">품질정보</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs table-fixed" style={{fontSize: '11px'}}>
                              <thead>
                                <tr className="border-b border-gray-300">
                                  <th className="text-center text-gray-600 font-medium py-1 px-2 w-1/4">등지방</th>
                                  <th className="text-center text-gray-600 font-medium py-1 px-1 w-1/4">등심면적</th>
                                  <th className="text-center text-gray-600 font-medium py-1 px-1 w-1/4">근내지방</th>
                                  <th className="text-center text-gray-600 font-medium py-1 px-2 w-1/4">육색</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2">16</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">123</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-1">9</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2">5</td>
                                </tr>
                                <tr className="border-b border-gray-300">
                                  <th className="text-center text-gray-600 font-medium pt-3 pb-1 px-2">지방색</th>
                                  <th className="text-center text-gray-600 font-medium pt-3 pb-1 px-2">조직감</th>
                                  <th className="text-center text-gray-600 font-medium pt-3 pb-1 px-2">성숙도</th>
                                  <th className="text-center text-gray-600 font-medium pt-3 pb-1 px-2"></th>
                                </tr>
                                <tr>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2">3</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2">1</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2">3</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2"></td>
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
              <div className="px-4 py-4 pb-24 border-t border-gray-200 bg-white">
                <h3 className="text-sm font-bold text-gray-900 mb-3">내 입찰내역</h3>
                
                {/* 탭 메뉴 */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    onClick={() => setMyBidHistoryTab('입찰 진행 중')}
                    className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                      myBidHistoryTab === '입찰 진행 중'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    입찰 진행 중
                  </button>
                  <button
                    onClick={() => setMyBidHistoryTab('입찰 종료')}
                    className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                      myBidHistoryTab === '입찰 종료'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    입찰 종료
                  </button>
                </div>

                {(() => {
                  const filteredBids = myBids.filter(bid => {
                    if (myBidHistoryTab === '입찰 진행 중') {
                      return bid.status === 'active';
                    } else {
                      return bid.status === 'cancelled' || bid.status === 'finished';
                    }
                  });

                  return filteredBids.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">
                        {myBidHistoryTab === '입찰 진행 중' ? '진행 중인 입찰이 없습니다' : '종료된 입찰이 없습니다'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredBids.map((bid) => (
                      <div 
                        key={bid.id}
                        className={`p-3 rounded border ${
                          bid.status === 'cancelled' || bid.status === 'finished'
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* 헤더 정보 */}
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                                    bid.status === 'cancelled' || bid.status === 'finished'
                                      ? 'bg-gray-200 text-gray-500' 
                                      : 'bg-blue-600 text-white'
                                  }`}>
                                    {bid.auctionNumber}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                                    bid.status === 'cancelled' || bid.status === 'finished'
                                      ? 'bg-gray-200 text-gray-500' 
                                      : 'bg-green-600 text-white'
                                  }`}>
                                    {bid.part}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {bid.time}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {bid.status === 'active' ? (
                                <button
                                  onClick={() => cancelBid(bid.id)}
                                  className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                >
                                  취소
                                </button>
                              ) : bid.status === 'cancelled' ? (
                                <span className="text-xs text-gray-500 px-3 py-1">
                                  취소됨
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 px-3 py-1">
                                  종료됨
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* 상세 정보 테이블 */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="border border-gray-200 px-2 py-1 text-center">품종</th>
                                  <th className="border border-gray-200 px-2 py-1 text-center">성별</th>
                                  <th className="border border-gray-200 px-2 py-1 text-center">등급</th>
                                  <th className="border border-gray-200 px-2 py-1 text-center">중량</th>
                                  <th className="border border-gray-200 px-2 py-1 text-center">입찰가격</th>
                                  <th className="border border-gray-200 px-2 py-1 text-center">총 입찰금액</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-gray-200 px-2 py-1 text-center">{bid.breed}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-center">{bid.gender}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-center">{bid.grade}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-center">{bid.weight}kg</td>
                                  <td className={`border border-gray-200 px-2 py-1 text-center font-medium ${
                                    bid.status === 'cancelled' || bid.status === 'finished'
                                      ? 'text-gray-500' 
                                      : 'text-red-600'
                                  }`}>
                                    {formatNumber(bid.price)}원/kg
                                  </td>
                                  <td className={`border border-gray-200 px-2 py-1 text-center font-bold ${
                                    bid.status === 'cancelled' || bid.status === 'finished'
                                      ? 'text-gray-500' 
                                      : 'text-red-600'
                                  }`}>
                                    {formatNumber(bid.totalAmount)}원
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  );
                })()}
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
                        <span className="text-sm text-gray-900">250806-001</span>
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