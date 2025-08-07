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
  Gavel
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuctionPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

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
                  <Link href="/" className="text-2xl font-bold text-red-600" style={{ letterSpacing: '-0.05em' }}>
                    HanuMuch
                  </Link>
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
              
              {/* 서브 메뉴 */}
              <div className="px-2 md:px-4 pb-1">
                <div className="flex items-center ml-2 space-x-8">
                  <div className="relative">
                    <Button variant="ghost" className="text-base font-medium text-black px-0 h-auto pb-2 hover:bg-transparent hover:text-black">
                      금일 경매
                    </Button>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
                  </div>
                  <div className="relative">
                    <Button variant="ghost" className="text-base font-medium text-gray-500 px-0 h-auto pb-2 hover:bg-transparent hover:text-gray-700">
                      지난 경매 확인하기
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* 안내 문구 박스 */}
              <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  경매는 오전 10시에 일괄 종료되며, 최고입찰가가 낙찰됩니다.
                </p>
              </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto">


              {/* 메인 컨텐츠 영역 - 상품 목록 */}
              <div className="px-4 pb-24 pt-6 flex-1 overflow-y-auto">
                {/* 경매 상품 카드 1 */}
                <Link href="/auction/1" className="block">
                  <div className="bg-white rounded border border-gray-200 p-4 mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex gap-4">
                    {/* 상품 이미지 */}
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded bg-gray-200 overflow-hidden">
                        <img 
                          src="/등심1.png" 
                          alt="등심1" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-amber-600 text-white">
                            한우거세
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-500 text-white">
                            1++A
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-orange-500 text-white">
                            No.9
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">경매번호:</span> 
                          <span className="text-gray-600 ml-1">250806-001</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">이력번호:</span> 
                          <span className="text-gray-600 ml-1">002-1486-7293-5</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">업체명:</span> 
                          <span className="text-gray-600 ml-1">송정가공</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">가공일자:</span> 
                          <span className="text-gray-600 ml-1">2025.08.05.(화)</span>
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>
                </Link>

                {/* 경매 상품 카드 2 */}
                <Link href="/auction/2" className="block">
                  <div className="bg-white rounded border border-gray-200 p-4 mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex gap-4">
                    {/* 상품 이미지 */}
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded bg-gray-200 overflow-hidden">
                        <img 
                          src="/등심2.png" 
                          alt="등심2" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-pink-600 text-white">
                            한우암소
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-500 text-white">
                            1++B
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-orange-500 text-white">
                            No.8
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">경매번호:</span> 
                          <span className="text-gray-600 ml-1">250806-002</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">이력번호:</span> 
                          <span className="text-gray-600 ml-1">002-1486-7294-3</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">업체명:</span> 
                          <span className="text-gray-600 ml-1">대한축산</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">가공일자:</span> 
                          <span className="text-gray-600 ml-1">2025.08.05.(화)</span>
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>
                </Link>

                {/* 경매 상품 카드 3 */}
                <Link href="/auction/3" className="block">
                  <div className="bg-white rounded border border-gray-200 p-4 mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex gap-4">
                    {/* 상품 이미지 */}
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded bg-gray-200 overflow-hidden">
                        <img 
                          src="/등심3.png" 
                          alt="등심3" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-amber-600 text-white">
                            한우거세
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-500 text-white">
                            1+A
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-orange-500 text-white">
                            No.6
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">경매번호:</span> 
                          <span className="text-gray-600 ml-1">250806-003</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">이력번호:</span> 
                          <span className="text-gray-600 ml-1">002-1486-7295-8</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">업체명:</span> 
                          <span className="text-gray-600 ml-1">우성미트</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">가공일자:</span> 
                          <span className="text-gray-600 ml-1">2025.08.05.(화)</span>
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>
                </Link>

                {/* 경매 상품 카드 4 */}
                <Link href="/auction/4" className="block">
                  <div className="bg-white rounded border border-gray-200 p-4 mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex gap-4">
                    {/* 상품 이미지 */}
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded bg-gray-200 overflow-hidden">
                        <img 
                          src="/등심4.png" 
                          alt="등심4" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-pink-600 text-white">
                            한우암소
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-500 text-white">
                            1+C
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-orange-500 text-white">
                            No.5
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">경매번호:</span> 
                          <span className="text-gray-600 ml-1">250806-004</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">이력번호:</span> 
                          <span className="text-gray-600 ml-1">002-1486-7296-1</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">업체명:</span> 
                          <span className="text-gray-600 ml-1">청림가공미트</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">가공일자:</span> 
                          <span className="text-gray-600 ml-1">2025.08.05.(화)</span>
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>
                </Link>

                {/* 경매 상품 카드 5 */}
                <Link href="/auction/5" className="block">
                  <div className="bg-white rounded border border-gray-200 p-4 mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex gap-4">
                    {/* 상품 이미지 */}
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded bg-gray-200 overflow-hidden">
                        <img 
                          src="/등심1.png" 
                          alt="등심1" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* 상품 정보 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-pink-600 text-white">
                            한우암소
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-500 text-white">
                            1++C
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-orange-500 text-white">
                            No.7
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">경매번호:</span> 
                          <span className="text-gray-600 ml-1">250806-005</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">이력번호:</span> 
                          <span className="text-gray-600 ml-1">002-1486-7297-6</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">업체명:</span> 
                          <span className="text-gray-600 ml-1">안심축산미트</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-bold text-gray-900">가공일자:</span> 
                          <span className="text-gray-600 ml-1">2025.08.05.(화)</span>
                        </p>
                      </div>
                    </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* 하단 네비게이션 */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 md:px-4 py-2 safe-area-pb">
              <div className="flex items-center justify-around">
                {/* 홈 */}
                <Link href="/" className="flex-1 flex flex-col items-center py-2 text-gray-600 cursor-pointer">
                  <HomeIcon className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">홈</span>
                </Link>
                
                {/* 경매 */}
                <div className="flex-1 flex flex-col items-center py-2 text-red-600 cursor-pointer">
                  <Gavel className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">경매</span>
                </div>
                
                {/* 시세 */}
                <Link href="/market" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                  <BarChart3 className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">시세</span>
                </Link>
                
                {/* 거래 */}
                <Link href="/trade" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                  <FileText className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">거래</span>
                </Link>
                
                {/* 내정보 */}
                <Link href="/profile" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                  <User className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">내정보</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}