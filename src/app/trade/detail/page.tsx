'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useBidStore } from '@/stores/bidStore';
import BottomNav from '@/components/BottomNav';

function TradeDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingNo = searchParams.get('listingNo') || '';
  const { auctionResults } = useBidStore();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // 스와이프/드래그 관련 상태
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // 이미지 배열 (등심 이미지 + 서류)
  const allImages = [
    { id: 1, src: '/등심1.png', alt: '등심1', isDocument: false },
    { id: 2, src: '/등심2.png', alt: '등심2', isDocument: false },
    { id: 3, src: '/등심3.png', alt: '등심3', isDocument: false },
    { id: 4, src: '/등심4.png', alt: '등심4', isDocument: false },
    { id: 5, src: 'grade-certificate', alt: '등급판정확인서', isDocument: true },
    { id: 6, src: 'slaughter-certificate', alt: '도축검사증명서', isDocument: true }
  ];

  // 다음 이미지로 이동
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  // 이전 이미지로 이동
  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // 터치 핸들러 (모바일)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 80;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // 마우스 핸들러 (웹)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    touchEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 80;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
    
    isDragging.current = false;
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    touchStartX.current = 0;
    touchEndX.current = 0;
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
  
  // 해당 상장번호의 데이터 찾기
  const item = auctionResults.find(r => r.listingNo === listingNo && r.result === 'won');
  
  // 더미 상세 데이터
  const detailData = {
    grade: item?.productInfo.grade || '1++A(9)',
    breed: item?.productInfo.type || '한우거세',
    gender: item?.productInfo.type?.includes('암') ? '암' : '거세',
    monthAge: 32,
    backFat: 16,
    eyeMuscle: 123,
    marbling: 9,
    meatColor: 5,
    fatColor: 3,
    texture: 1,
    maturity: 2,
    traceNo: '002-1486-7293-1',
    slaughterhouse: '음성',
    slaughterNo: 201,
    carcassWeight: 520,
    listingCompany: '건화',
    processingDate: '26.01.17',
    processWeight: 312,
    company: '(주)한우농장',
  };

  if (!item) {
    return (
      <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999]">
        <div className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl">
          <div className="text-center py-20">
            <p className="text-gray-500">해당 상장번호를 찾을 수 없습니다.</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
        <div 
          className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl relative overflow-hidden flex flex-col" 
          style={{
            height: 'calc(var(--vh, 1vh) * 100)',
          }}
        >
          {/* 헤더 */}
          <div className="flex-shrink-0 flex items-center px-4 py-3 border-b border-gray-200 bg-white">
            <button onClick={() => router.back()} className="p-1 mr-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold">{listingNo}</h1>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-hidden">
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
                {allImages[currentImageIndex].isDocument ? (
                  // 서류 이미지 (A4 양식)
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 p-4">
                    <div className="w-full max-w-[280px] bg-white shadow-lg border border-gray-300 p-4 aspect-[1/1.414]">
                      {allImages[currentImageIndex].src === 'grade-certificate' ? (
                        // 등급판정확인서
                        <div className="h-full flex flex-col text-[8px] text-gray-700">
                          <div className="text-center border-b border-gray-400 pb-2 mb-2">
                            <p className="text-[12px] font-bold text-gray-900">등급판정확인서</p>
                            <p className="text-gray-500 mt-1">Grade Certification</p>
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex"><span className="w-16 text-gray-500">접수번호:</span><span className="font-medium">{listingNo}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">축종:</span><span>{detailData.breed}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">성별:</span><span>{detailData.gender}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">등급:</span><span className="font-bold text-gray-900">{detailData.grade}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">개월령:</span><span>{detailData.monthAge}개월</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">도체중량:</span><span>{detailData.carcassWeight}kg</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">등지방:</span><span>{detailData.backFat}mm</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">등심면적:</span><span>{detailData.eyeMuscle}㎠</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">근내지방:</span><span>{detailData.marbling}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">육색:</span><span>{detailData.meatColor}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">지방색:</span><span>{detailData.fatColor}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">조직감:</span><span>{detailData.texture}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">성숙도:</span><span>{detailData.maturity}</span></div>
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
                            <div className="flex"><span className="w-16 text-gray-500">접수번호:</span><span className="font-medium">{listingNo}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">도축일:</span><span>2026.01.16</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">도축장:</span><span>농협 음성</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">도축번호:</span><span>{detailData.slaughterNo}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">이력번호:</span><span>{detailData.traceNo}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">출하농가:</span><span>{detailData.company}</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">검사결과:</span><span className="font-bold text-green-600">적합</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">검사항목:</span><span>일반검사</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">생체중량:</span><span>720kg</span></div>
                            <div className="flex"><span className="w-16 text-gray-500">도체중량:</span><span>{detailData.carcassWeight}kg</span></div>
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
                    src={allImages[currentImageIndex].src}
                    alt={allImages[currentImageIndex].alt}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                )}
              </div>
              {/* 이미지 인디케이터 */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {allImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      currentImageIndex === index ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 썸네일 6개 */}
            <div className="px-3 pt-2 pb-1 bg-white">
              <div className="flex gap-2 justify-start overflow-x-auto">
                {allImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-16 h-16 flex-shrink-0 rounded overflow-hidden transition-all ${
                      currentImageIndex === index 
                        ? 'border-2 border-gray-400' 
                        : 'border-2 border-transparent hover:border-gray-300'
                    }`}
                  >
                    {image.isDocument ? (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <div className="w-9 h-11 bg-white border border-gray-300 flex items-center justify-center">
                          <span className="text-[7px] text-gray-500 text-center leading-tight">
                            {image.alt === '등급판정확인서' ? '등급' : '도축'}
                          </span>
                        </div>
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

            {/* 테이블 영역 */}
            <div className="py-2 bg-white">
              {/* 첫 번째 테이블 */}
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
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.grade}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.monthAge}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.backFat}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.eyeMuscle}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.marbling}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.meatColor}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.fatColor}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.texture}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.maturity}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 두 번째 테이블 */}
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
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.traceNo}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.slaughterhouse}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.slaughterNo}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.carcassWeight}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.listingCompany}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.processingDate}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{detailData.processWeight}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 하단 네비게이션 */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

// 로딩 컴포넌트
function LoadingFallback() {
  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999]">
      <div className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl">
        <div className="text-center py-20">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    </div>
  );
}

export default function TradeDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TradeDetailContent />
    </Suspense>
  );
}
