'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuctionPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showNotice, setShowNotice] = useState(true);
  
  // 필터 상태
  const [selectedType, setSelectedType] = useState<string>('성별');
  const [selectedGrade, setSelectedGrade] = useState<string>('등급');
  const [selectedNo, setSelectedNo] = useState<string>('근내지방도');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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

  // 경매 상품 데이터
  const products = [
    { id: 1, image: '/등심1.png', type: '한우거세', grade: '1++A', no: 'No.9', auctionNo: '250806-001', historyNo: '002-1486-7293-5', company: '송정가공', date: '2025.08.05.(화)' },
    { id: 2, image: '/등심2.png', type: '한우암소', grade: '1++B', no: 'No.8', auctionNo: '250806-002', historyNo: '002-1486-7293-6', company: '송정가공', date: '2025.08.05.(화)' },
    { id: 3, image: '/등심3.png', type: '한우거세', grade: '1+A', no: 'No.6', auctionNo: '250806-003', historyNo: '002-1486-7293-7', company: '송정가공', date: '2025.08.05.(화)' },
    { id: 4, image: '/등심4.png', type: '한우암소', grade: '1+C', no: 'No.5', auctionNo: '250806-004', historyNo: '002-1486-7293-8', company: '송정가공', date: '2025.08.05.(화)' },
    { id: 5, image: '/등심1.png', type: '한우암소', grade: '1C', no: 'No.7', auctionNo: '250806-005', historyNo: '002-1486-7293-9', company: '송정가공', date: '2025.08.05.(화)' },
  ];

  // 필터링된 상품 목록
  const filteredProducts = products.filter(product => {
    // 성별 필터
    if (selectedType !== '성별' && selectedType !== '전체' && product.type !== selectedType) return false;
    
    // 등급 필터 - 범주로 매칭
    if (selectedGrade !== '등급' && selectedGrade !== '전체') {
      if (selectedGrade === '1++등급' && !product.grade.startsWith('1++')) return false;
      if (selectedGrade === '1+등급' && (!product.grade.startsWith('1+') || product.grade.startsWith('1++'))) return false;
      if (selectedGrade === '1등급' && (product.grade.startsWith('1++') || product.grade.startsWith('1+'))) return false;
    }
    
    // 근내지방도 필터
    if (selectedNo !== '근내지방도' && selectedNo !== '전체' && product.no !== selectedNo) return false;
    
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
              
              {/* 서브 메뉴 */}
              <div className="px-2 md:px-4 pb-1">
                <div className="flex items-center ml-2 space-x-8">
                  <div className="relative">
                    <Button variant="ghost" className="text-base font-medium text-black px-0 h-auto pb-2 hover:bg-transparent hover:text-black">
                      개체별
                    </Button>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
                  </div>
                  <div className="relative">
                    <Button variant="ghost" className="text-base font-medium text-gray-500 px-0 h-auto pb-2 hover:bg-transparent hover:text-gray-700">
                      부위별
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* 안내 문구 박스 */}
              {showNotice && (
                <div className="px-4 py-1 bg-gray-100 border-b border-gray-200 relative">
                  <p className="text-xs text-gray-600 text-center pr-6">
                    경매는 오전 10시에 일괄 종료되며, 최고입찰가가 낙찰됩니다.
                  </p>
                  <button
                    onClick={() => setShowNotice(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
                    aria-label="닫기"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              )}
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* 섹션 제목 */}
              <div className="px-4 pt-4 pb-2 bg-white">
                <h2 className="text-base font-bold text-gray-900">25.08.06.(수) 경매</h2>
              </div>
              
              {/* 필터 섹션 */}
              <div className="px-3 py-2 bg-white">
                <div className="flex gap-1.5 relative filter-dropdown max-w-sm">
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
                          {['전체', '한우거세', '한우암소'].map((option) => (
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
                          {['전체', '1++등급', '1+등급', '1등급'].map((option) => (
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
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-gray-300 text-gray-700">
                                  {product.no}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-0.5">
                              <p className="text-xs">
                                <span className="font-bold text-gray-900">경매번호:</span> 
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