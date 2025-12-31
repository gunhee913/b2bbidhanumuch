'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ChevronDown,
  ChevronLeft,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuctionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  const [partFilterType, setPartFilterType] = useState<string>('성별');
  const [partFilterGrade, setPartFilterGrade] = useState<string>('등급');
  const [partFilterMarbling, setPartFilterMarbling] = useState<string>('근내지방도');
  
  // 부위별 입찰 바텀시트 상태
  const [showPartBidSheet, setShowPartBidSheet] = useState(false);
  const [partBidPrice, setPartBidPrice] = useState(0);
  const [partBids, setPartBids] = useState<Record<string, { myBid: number; highestBid: number; status: 'highest' | 'secondHighest' }>>({});
  
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

  // URL 파라미터에 따른 상태 설정
  useEffect(() => {
    const tab = searchParams.get('tab');
    const part = searchParams.get('part');
    
    if (tab === 'part') {
      setActiveTab('part');
      if (part) {
        setSelectedPartId(part);
      }
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

  // 부위별 데이터 (좌/우 합침, 총 15개 부위) - 5두 기준
  const partsData = [
    { id: 'sirloin', name: '등심', image: '/등심1.png', count: 10 },  // 5두 × (좌+우)
    { id: 'tenderloin', name: '안심', image: '/등심2.png', count: 5 },   // 5두 × 1
    { id: 'striploin', name: '채끝', image: '/등심3.png', count: 5 },
    { id: 'ribs', name: '갈비', image: '/등심4.png', count: 10 },     // 5두 × (좌+우)
    { id: 'special', name: '특수부위', image: '/등심1.png', count: 5 },
    { id: 'foreleg', name: '앞다리', image: '/등심2.png', count: 5 },
    { id: 'rump', name: '우둔', image: '/등심3.png', count: 5 },
    { id: 'chuck', name: '목심', image: '/등심4.png', count: 5 },
    { id: 'brisket', name: '양지', image: '/등심1.png', count: 10 },  // 5두 × (좌+우)
    { id: 'round', name: '설도', image: '/등심2.png', count: 10 },    // 5두 × (좌+우)
    { id: 'shank', name: '사태', image: '/등심3.png', count: 5 },
    { id: 'tail', name: '꼬리', image: '/등심4.png', count: 5 },
    { id: 'feet', name: '족', image: '/등심1.png', count: 5 },
    { id: 'bone', name: '사골', image: '/등심2.png', count: 5 },
    { id: 'misc', name: '잡뼈', image: '/등심3.png', count: 5 },
  ];

  // 경매 상품 데이터
  const products = [
    { id: 1, image: '/등심1.png', type: '한우거세', grade: '1++A', no: 'No.9', auctionNo: '250806-001', historyNo: '002-1486-7293-5', company: '송정가공', date: '2025.08.05.(화)' },
    { id: 2, image: '/등심2.png', type: '한우암소', grade: '1++B', no: 'No.8', auctionNo: '250806-002', historyNo: '002-1486-7293-6', company: '송정가공', date: '2025.08.05.(화)' },
    { id: 3, image: '/등심3.png', type: '한우거세', grade: '1+A', no: 'No.6', auctionNo: '250806-003', historyNo: '002-1486-7293-7', company: '송정가공', date: '2025.08.05.(화)' },
    { id: 4, image: '/등심4.png', type: '한우암소', grade: '1+C', no: 'No.5', auctionNo: '250806-004', historyNo: '002-1486-7293-8', company: '송정가공', date: '2025.08.05.(화)' },
    { id: 5, image: '/등심1.png', type: '한우암소', grade: '1C', no: 'No.7', auctionNo: '250806-005', historyNo: '002-1486-7293-9', company: '송정가공', date: '2025.08.05.(화)' },
  ];

  // 5두 개체 정보
  const auctionEntities = [
    { id: 1, type: '한우거세', grade: '1++A(9)', historyNo: '002-1486-7293-5', company: '송정가공', image: '/등심1.png' },
    { id: 2, type: '한우암소', grade: '1++B(8)', historyNo: '002-1486-7293-6', company: '송정가공', image: '/등심2.png' },
    { id: 3, type: '한우거세', grade: '1+A(6)', historyNo: '002-1486-7293-7', company: '송정가공', image: '/등심3.png' },
    { id: 4, type: '한우암소', grade: '1+C(5)', historyNo: '002-1486-7293-8', company: '송정가공', image: '/등심4.png' },
    { id: 5, type: '한우암소', grade: '1C(7)', historyNo: '002-1486-7293-9', company: '송정가공', image: '/등심1.png' },
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
          
          // 상장번호 계산: 개체별 20개씩, 부위 인덱스에 따라 +1
          const partIndex = allSubPartsOrder.indexOf(subPart);
          const listingNumber = (entity.id - 1) * 20 + partIndex + 1;
          
          products.push({
            id: `${partId}-${entity.id}-${subPart}`,
            partId,
            partName: subPart,
            image: entity.image,
            type: entity.type,
            grade: entity.grade,
            weight: `${weight}kg`,
            price: partMinPrices[subPart] || 50000,
            auctionNo: `250806-${String(entity.id).padStart(3, '0')}`,
            listingNo: `250806-${String(entity.id).padStart(3, '0')}-${String(listingNumber).padStart(4, '0')}`,
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
    
    // 성별 필터
    if (partFilterType !== '성별' && partFilterType !== '전체') {
      filtered = filtered.filter(p => p.type === partFilterType);
    }
    
    // 등급 필터
    if (partFilterGrade !== '등급' && partFilterGrade !== '전체') {
      if (partFilterGrade === '1++등급') {
        filtered = filtered.filter(p => p.grade.startsWith('1++'));
      } else if (partFilterGrade === '1+등급') {
        filtered = filtered.filter(p => p.grade.startsWith('1+') && !p.grade.startsWith('1++'));
      } else if (partFilterGrade === '1등급') {
        filtered = filtered.filter(p => !p.grade.startsWith('1++') && !p.grade.startsWith('1+'));
      }
    }
    
    // 근내지방도 필터
    if (partFilterMarbling !== '근내지방도' && partFilterMarbling !== '전체') {
      const marblingNo = partFilterMarbling.replace('No.', '');
      filtered = filtered.filter(p => p.grade.includes(`(${marblingNo})`));
    }
    
    return filtered;
  }, [selectedPartId, partProducts, partFilterType, partFilterGrade, partFilterMarbling]);

  // 부위 목록으로 돌아가기
  const handleBackToPartList = () => {
    setSelectedPartId(null);
    router.push('/auction?tab=part');
  };

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
                    <Button 
                      variant="ghost" 
                      onClick={() => setActiveTab('individual')}
                      className={`text-base font-medium px-0 h-auto pb-2 hover:bg-transparent ${
                        activeTab === 'individual' ? 'text-black hover:text-black' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      개체별
                    </Button>
                    {activeTab === 'individual' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
                    )}
                  </div>
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      onClick={() => setActiveTab('part')}
                      className={`text-base font-medium px-0 h-auto pb-2 hover:bg-transparent ${
                        activeTab === 'part' ? 'text-black hover:text-black' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      부위별
                    </Button>
                    {activeTab === 'part' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
                    )}
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
              
              {activeTab === 'individual' ? (
                <>
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
                  {/* 부위별 상세 목록 헤더 */}
                  <div className="px-3 py-2 bg-white border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBackToPartList}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-900">{selectedPart.name}</h3>
                        <p className="text-[10px] text-gray-500">
                          {filteredPartProducts.length}개 상품
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 부위별 필터 및 정렬 */}
                  <div className="px-3 py-2 bg-white">
                    <div className="flex gap-1.5 relative filter-dropdown">
                      {/* 성별 필터 */}
                      <div className="flex-1 relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'partType' ? null : 'partType')}
                          className="w-full h-8 px-2 text-[11px] border border-gray-300 rounded-lg bg-white transition-colors flex items-center justify-between"
                        >
                          <span className="text-gray-700 truncate">{partFilterType}</span>
                          <motion.div
                            animate={{ rotate: openDropdown === 'partType' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'partType' && (
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
                                    setPartFilterType(option);
                                    setOpenDropdown(null);
                                  }}
                                  whileHover={{ backgroundColor: '#fef2f2' }}
                                  className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                                    partFilterType === option ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
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
                          onClick={() => setOpenDropdown(openDropdown === 'partGrade' ? null : 'partGrade')}
                          className="w-full h-8 px-2 text-[11px] border border-gray-300 rounded-lg bg-white transition-colors flex items-center justify-between"
                        >
                          <span className="text-gray-700 truncate">{partFilterGrade}</span>
                          <motion.div
                            animate={{ rotate: openDropdown === 'partGrade' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'partGrade' && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
                            >
                              {['전체', '1++등급', '1+등급', '1등급'].map((option) => (
                                <motion.button
                                  key={option}
                                  onClick={() => {
                                    setPartFilterGrade(option);
                                    setOpenDropdown(null);
                                  }}
                                  whileHover={{ backgroundColor: '#fef2f2' }}
                                  className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                                    partFilterGrade === option ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  {option}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* 근내지방도 필터 */}
                      <div className="flex-1 relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'partMarbling' ? null : 'partMarbling')}
                          className="w-full h-8 px-2 text-[11px] border border-gray-300 rounded-lg bg-white transition-colors flex items-center justify-between"
                        >
                          <span className="text-gray-700 truncate">{partFilterMarbling}</span>
                          <motion.div
                            animate={{ rotate: openDropdown === 'partMarbling' ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'partMarbling' && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
                            >
                              {['전체', 'No.9', 'No.8', 'No.7', 'No.6', 'No.5', 'No.4'].map((option) => (
                                <motion.button
                                  key={option}
                                  onClick={() => {
                                    setPartFilterMarbling(option);
                                    setOpenDropdown(null);
                                  }}
                                  whileHover={{ backgroundColor: '#fef2f2' }}
                                  className={`w-full px-2.5 py-1.5 text-[11px] text-left transition-colors ${
                                    partFilterMarbling === option ? 'bg-red-50 text-red-600 font-medium' : 'text-gray-700'
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


                  {/* 부위별 상품 테이블 */}
                  <div className="flex-1 overflow-y-auto pb-24">
                    {/* 테이블 헤더 */}
                    <div className="bg-gray-100 border-b border-gray-300 h-10 flex items-center sticky top-0 z-10">
                      <div className="grid px-2 text-xs font-bold text-gray-600 w-full" style={{gridTemplateColumns: '0.9fr 0.7fr 0.9fr 1fr 1fr 0.7fr'}}>
                        <div className="text-center">부위</div>
                        <div className="text-center">중량</div>
                        <div className="text-center">최저단가</div>
                        <div className="text-center">최고입찰가</div>
                        <div className="text-center">나의입찰가</div>
                        <div className="text-center">상태</div>
                      </div>
                    </div>

                    {/* 테이블 데이터 */}
                    {filteredPartProducts.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-gray-500">조건에 맞는 상품이 없습니다.</p>
                      </div>
                    ) : (
                      filteredPartProducts.map((product) => {
                        const bid = partBids[product.id];
                        return (
                          <div 
                            key={product.id}
                            onClick={() => {
                              setSelectedProduct(product);
                              setPartBidPrice(bid?.myBid || 0);
                              setShowPartBidSheet(true);
                            }}
                            className={`grid px-2 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                              bid?.status === 'highest' 
                                ? 'bg-blue-50/50' 
                                : bid?.status === 'secondHighest'
                                  ? 'bg-red-50/50'
                                  : 'bg-white hover:bg-gray-50'
                            }`}
                            style={{gridTemplateColumns: '0.9fr 0.7fr 0.9fr 1fr 1fr 0.7fr'}}
                          >
                            <div className="text-center text-sm font-semibold text-gray-900 flex items-center justify-center">
                              {product.partName}
                            </div>
                            <div className="text-center text-sm font-medium text-gray-700 flex items-center justify-center">
                              {product.weight}
                            </div>
                            <div className="text-center text-sm font-medium text-gray-500 flex items-center justify-center">
                              {product.price.toLocaleString()}
                            </div>
                            <div className="text-center text-sm font-semibold text-gray-800 flex items-center justify-center">
                              {bid?.highestBid ? bid.highestBid.toLocaleString() : '-'}
                            </div>
                            <div className="text-center text-sm font-bold text-red-600 flex items-center justify-center">
                              {bid?.myBid ? bid.myBid.toLocaleString() : '-'}
                            </div>
                            <div className="text-center flex items-center justify-center">
                              {bid?.status === 'highest' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">최고순위</span>
                              ) : bid?.status === 'secondHighest' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-600">차순위</span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* 부위별 탭 콘텐츠 */}
                  <div className="px-3 py-2 bg-white">
                    <p className="text-xs text-gray-500">
                      총 <span className="font-bold text-red-600">{partsData.reduce((sum, part) => sum + part.count, 0)}</span>개 부위 경매 진행 중
                    </p>
                  </div>

                  {/* 부위별 카드 목록 */}
                  <div className="px-3 pb-24 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      {partsData.map((part) => (
                        <div 
                          key={part.id} 
                          onClick={() => {
                            setSelectedPartId(part.id);
                            router.push(`/auction?tab=part&part=${part.id}`);
                          }}
                          className="block cursor-pointer"
                        >
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          >
                            {/* 부위 이미지 */}
                            <div className="relative h-24 bg-gray-100">
                              <img 
                                src={part.image} 
                                alt={part.name} 
                                className="w-full h-full object-cover"
                              />
                              {/* 경매 수량 뱃지 */}
                              <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {part.count}건
                              </div>
                            </div>
                            
                            {/* 부위 정보 */}
                            <div className="p-2.5">
                              <h3 className="text-sm font-bold text-gray-900">{part.name}</h3>
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

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
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[85%] overflow-y-auto"
                  >
                    {/* 핸들 */}
                    <div className="flex justify-center pt-2 pb-1">
                      <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                    
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <h3 className="text-lg font-bold">입찰하기</h3>
                      <button onClick={() => setShowPartBidSheet(false)} className="p-1">
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    
                    {/* 개체 정보 */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 rounded font-medium">
                          {selectedProduct.listingNo}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 rounded font-medium">
                          {selectedProduct.type}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 rounded font-medium">
                          {selectedProduct.grade}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 rounded font-medium">
                          30개월
                        </span>
                      </div>
                    </div>
                    
                    {/* 선택된 부위 & 중량 */}
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">선택된 부위</p>
                          <div className="bg-gray-100 rounded-lg py-2.5 px-3 text-center">
                            <span className="font-bold text-gray-900">{selectedProduct.partName}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">중량</p>
                          <div className="bg-gray-100 rounded-lg py-2.5 px-3 text-center">
                            <span className="font-bold text-gray-900">{selectedProduct.weight}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 입찰가격 입력 */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-700">입찰가격 (원/kg)</p>
                        <p className="text-xs text-gray-500">100원 단위</p>
                      </div>
                      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 bg-white">
                        <input
                          type="text"
                          value={partBidPrice > 0 ? partBidPrice.toLocaleString() : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                            setPartBidPrice(value ? parseInt(value) : 0);
                          }}
                          className="flex-1 text-right text-xl font-bold outline-none bg-transparent"
                          placeholder="0"
                        />
                        <span className="ml-2 text-gray-500">원</span>
                      </div>
                      
                      {/* 버튼 */}
                      <div className="flex gap-2 mt-3">
                        {['+100', '+1,000', '+10,000', '+50,000'].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setPartBidPrice(prev => prev + parseInt(amount.replace(/[+,]/g, '')))}
                            className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            {amount}
                          </button>
                        ))}
                        <button
                          onClick={() => setPartBidPrice(0)}
                          className="flex-1 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          초기화
                        </button>
                      </div>
                    </div>
                    
                    {/* 총 입찰금액 */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">총 입찰금액</span>
                        <span className="text-lg font-bold text-red-600">
                          {partBidPrice > 0 && selectedProduct.weight 
                            ? (partBidPrice * parseFloat(selectedProduct.weight)).toLocaleString() 
                            : '-'}
                        </span>
                      </div>
                    </div>
                    
                    {/* 입찰하기 버튼 */}
                    <div className="px-4 pb-6">
                      <button
                        onClick={() => {
                          if (partBidPrice < selectedProduct.price) {
                            alert(`최저단가(${selectedProduct.price.toLocaleString()}원) 이상으로 입찰해주세요.`);
                            return;
                          }
                          
                          // 입찰 처리
                          const isHighest = Math.random() > 0.3;
                          setPartBids(prev => ({
                            ...prev,
                            [selectedProduct.id]: {
                              myBid: partBidPrice,
                              highestBid: isHighest ? partBidPrice : partBidPrice + 1000,
                              status: isHighest ? 'highest' : 'secondHighest'
                            }
                          }));
                          
                          setShowPartBidSheet(false);
                        }}
                        disabled={partBidPrice === 0}
                        className={`w-full py-4 rounded-xl text-base font-bold transition-colors ${
                          partBidPrice > 0 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        입찰하기
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

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