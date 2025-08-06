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
  ArrowLeft,
  ChevronLeft,
  ChevronRight
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
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [bidPrice, setBidPrice] = useState('0');

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

  // 메인 이미지 배열 (더미 데이터)
  const mainImages = [
    { id: 1, alt: "상품 이미지 1" },
    { id: 2, alt: "상품 이미지 2" },
    { id: 3, alt: "상품 이미지 3" },
    { id: 4, alt: "상품 이미지 4" }
  ];

  // 배너 데이터 (빈 상태)
  const banners = [
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" },
    { title: "", subtitle: "", bgColor: "" }
  ];

  // 이미지 네비게이션 함수
  const goToPrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? mainImages.length - 1 : prev - 1
    );
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === mainImages.length - 1 ? 0 : prev + 1
    );
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
                <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {/* 왼쪽 버튼 */}
                <button
                  onClick={goToPrevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                
                {/* 오른쪽 버튼 */}
                <button
                  onClick={goToNextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                
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
                      className={`w-16 h-16 rounded flex items-center justify-center transition-all bg-gray-200 ${
                        currentImageIndex === index 
                          ? 'border-2 border-black' 
                          : 'border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>



              {/* 호가창과 입찰주문 창 */}
              <div className="flex border-t border-gray-200" style={{height: '550px'}}>
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
                      { part: '윗등심(좌)', weight: '3.2' },
                      { part: '윗등심(우)', weight: '2.8' },
                      { part: '아랫등심(좌)', weight: '1.9' },
                      { part: '아랫등심(우)', weight: '3.1' },
                      { part: '안심(좌)', weight: '2.3' }
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
                        setSelectedWeight('2.5');
                      }}
                    >
                      <div className="text-center text-xs font-bold text-black flex items-center justify-center border-r border-gray-200">
                        안심(우)
                      </div>
                      <div className="text-center text-xs font-bold text-black flex items-center justify-center">
                        2.5kg
                      </div>
                    </div>
                    
                    {/* 매수호가 (아래쪽, 낮은 가격) */}
                    {[
                      { part: '채끝(좌)', weight: '1.7' },
                      { part: '채끝(우)', weight: '2.9' },
                      { part: '목심', weight: '3.4' },
                      { part: '설깃', weight: '2.1' },
                      { part: '치마살,업진살', weight: '1.6' }
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
                        <div className="text-center text-xs font-bold text-black flex items-center justify-center border-r border-gray-200">
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
                          <div className="text-xs text-gray-600 mb-1">주문 요약</div>
                          <div className="bg-gray-50 p-2 border rounded space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">개체정보</span>
                              <div className="flex gap-1">
                                <span className="text-xs px-1.5 py-0.5 bg-amber-600 text-white rounded font-bold">한우거세</span>
                                <span className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded font-bold">1++A</span>
                                <span className="text-xs px-1.5 py-0.5 bg-orange-500 text-white rounded font-bold">No.9</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">부위</span>
                              <span className="text-xs text-gray-900">{selectedPart || "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">입찰가격</span>
                              <span className="text-xs text-gray-900">{bidPrice ? `${bidPrice}원/kg` : "-"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">중량</span>
                              <span className="text-xs text-gray-900">{selectedWeight ? `${selectedWeight}kg` : "-"}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-1 mt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-900">총 입찰금액</span>
                                <span className="text-sm font-bold text-red-600">
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
                        <button className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded">
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
                              <span className="text-xs text-gray-600">개체번호</span>
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
                                  <th className="text-center text-gray-600 font-medium py-1 px-2 w-1/4">등심면적</th>
                                  <th className="text-center text-gray-600 font-medium py-1 px-2 w-1/4">근내지방</th>
                                  <th className="text-center text-gray-600 font-medium py-1 px-2 w-1/4">육색</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2">16</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2">123</td>
                                  <td className="text-center text-gray-900 font-bold py-1 px-2">9</td>
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

              {/* 여분 공간 */}
              <div className="px-6 pb-24 pt-4 flex-1">
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
    </div>
  );
}