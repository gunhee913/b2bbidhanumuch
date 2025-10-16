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

export default function MarketPage() {
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
                  <Link href="/" className="flex items-center">
                    <img 
                      src="/Mainlogo.png" 
                      alt="HanuMuch" 
                      className="h-8 w-auto"
                    />
                  </Link>
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


              {/* 메인 컨텐츠 영역 - 빈 상태 */}
              <div className="px-6 pb-24 pt-8 flex-1 flex items-center justify-center">
                <div className="text-center py-20">
                  <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-500 mb-2">시세 서비스 준비중</h3>
                  <p className="text-sm text-gray-400">곧 실시간 한우 시세 서비스가 시작됩니다.</p>
                </div>
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
                <Link href="/auction" className="flex-1 flex flex-col items-center py-2 text-gray-600 cursor-pointer">
                  <Gavel className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">경매</span>
                </Link>
                
                {/* 시세 */}
                <div className="flex-1 flex flex-col items-center py-2 text-red-600">
                  <BarChart3 className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">시세</span>
                </div>
                
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