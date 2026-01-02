'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Home as HomeIcon,
  ShoppingCart,
  BarChart3,
  ArrowRight,
  FileText,
  Gavel,
  User,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBidStore } from '@/stores/bidStore';

function MainPageContent() {
  const searchParams = useSearchParams();
  
  // zustand 스토어에서 입찰 관련 상태 가져오기
  const { 
    bids: globalBids, 
    setBid,
    quickReBidAmount, 
    setQuickReBidAmount,
    isSecondBidNotificationOn,
    setIsSecondBidNotificationOn
  } = useBidStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('경매 정보');
  const [countdown, setCountdown] = useState(3600); // 01시간 00분 00초 = 3600초
  const [showAuctionInfo, setShowAuctionInfo] = useState(false);
  const [showReBidDialog, setShowReBidDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState('');
  const [showQuickReBidEdit, setShowQuickReBidEdit] = useState(false);
  const [tempQuickReBidAmount, setTempQuickReBidAmount] = useState('1,000');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 내 입찰 내역은 zustand 스토어(globalBids)에서 관리

  // URL 파라미터로 탭 설정 및 스크롤
  useEffect(() => {
    const tab = searchParams.get('tab');
    const bidId = searchParams.get('bidId');
    
    if (tab === 'myBids') {
      setActiveTab('내 입찰 내역');
      
      // 탭 전환 후 스크롤 실행
      if (bidId) {
        setTimeout(() => {
          const element = document.getElementById(`bid-card-${bidId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [searchParams]);

  // 카운트다운
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // 툴팁 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 버튼이나 툴팁 영역이 아닌 곳을 클릭했을 때만 닫기
      if (
        showAuctionInfo &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target) &&
        !target.closest('button')
      ) {
        setShowAuctionInfo(false);
      }
    };

    if (showAuctionInfo) {
      // 약간의 딜레이를 주어 버튼 클릭 이벤트와 충돌 방지
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAuctionInfo]);

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${String(minutes).padStart(2, '0')}분 ${String(secs).padStart(2, '0')}초`;
    } else {
      return `${minutes}분 ${String(secs).padStart(2, '0')}초`;
    }
  };

  // 잔고 가리기/보이기 토글
  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  // 잔고 새로고침 함수
  const handleRefresh = () => {
    setIsRefreshing(true);
    // 새로고침 애니메이션 후 종료
    setTimeout(() => {
      setIsRefreshing(false);
      // 여기에 실제 잔고 API 호출 로직 추가
    }, 1000);
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
    if (!selectedBid) return;
    
    const finalPrice = selectedBid.reBidPrice || parseInt(customBidPrice.replace(/,/g, ''));
    const now = new Date();
    const timeStr = `${now.getFullYear().toString().slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.(${['일','월','화','수','목','금','토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // zustand 스토어에 저장
    setBid(selectedBid.listingNo, {
      myBid: finalPrice,
      highestBid: finalPrice,
      status: 'highest',
      time: timeStr,
      productInfo: selectedBid.productInfo
    });

    // 토스트 메시지 표시
    setToastMessage(`재입찰이 완료되었습니다. (${finalPrice.toLocaleString()}원/kg)`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    setShowReBidDialog(false);
    setSelectedBid(null);
    setCustomBidPrice('');
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
            <div className="flex-shrink-0 bg-white border-b border-gray-200">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center">
                    <img 
                      src="/Mainlogo.png" 
                      alt="HanuMuch" 
                      className="h-7 w-auto"
                    />
                  </Link>
                  <div className="flex items-center">
                    <img 
                      src="/음성축산물공판장.png" 
                      alt="음성축산물공판장" 
                      className="h-5 w-auto border border-gray-300 rounded px-1.5 py-0.5 bg-gradient-to-br from-white to-gray-50 shadow-sm"
                    />
                  </div>
              </div>
            </div>
          </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
              {/* 사용자 환영 섹션 */}
              <div className="px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-2.5">
                  {/* 프로필 이미지 */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">
                      72
                    </div>
                  </div>
                  {/* 환영 메시지 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">김하누님(72번 중도매인) 안녕하세요.</p>
                    <p className="text-xs text-gray-600">오늘도 즐거운 하루 되세요.</p>
                  </div>
                </div>
              </div>

              {/* 잔고 섹션 */}
              <div className="mx-4 mt-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600 text-sm font-bold">내 잔고</p>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={toggleBalanceVisibility}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
                      >
                        {isBalanceVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50 active:scale-95"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <p className="text-black text-2xl font-bold mb-3" style={{ letterSpacing: '-0.02em' }}>
                    {isBalanceVisible ? '₩20,000,000원' : '₩••••••••'}
                  </p>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-xs hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]">
                      <span className="text-white text-base">↓</span>
                      입금
                    </button>
                    <button className="flex-1 bg-white text-red-600 border-2 border-red-600 px-3 py-2 rounded-lg font-bold text-xs hover:bg-red-50 active:bg-red-100 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]">
                      <span className="text-red-600 text-base">↑</span>
                      출금
                    </button>
                  </div>
                </div>
              </div>

              {/* 탭 메뉴 */}
              <div className="mt-4 bg-white">
                <div className="flex border-b border-gray-200 px-4">
                  <button
                    onClick={() => setActiveTab('경매 정보')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${
                      activeTab === '경매 정보'
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    경매 정보
                  </button>
                  <button
                    onClick={() => setActiveTab('내 입찰 내역')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${
                      activeTab === '내 입찰 내역'
                      
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    내 입찰 내역
                  </button>
                </div>
              </div>

              {/* 탭 컨텐츠 */}
              <div className="pb-24 bg-white">
                {activeTab === '경매 정보' ? (
                  <div className="px-4 pt-4">
                    {/* 경매 요약 카드 */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3 relative">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900">오늘의 경매 리스트 (25.08.06.수)</h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAuctionInfo(!showAuctionInfo);
                            }}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </button>
                        </div>
                        {showAuctionInfo && (
                          <div 
                            ref={tooltipRef}
                            className="absolute top-8 left-0 z-10 bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-lg min-w-[200px]"
                          >
                            <div className="absolute -top-1.5 left-6 w-3 h-3 bg-gray-800 rotate-45"></div>
                            <p className="text-center leading-relaxed relative z-10">
                              경매는 오전 10시에 일괄 종료되며,<br />최고가가 낙찰됩니다.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium text-gray-600">마감까지</span>
                        <span className="text-xs font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                          {formatTime(countdown)}
                        </span>
                      </div>

                      {/* 경매 정보 테이블 */}
                      <div className="mb-3 overflow-hidden border border-gray-200">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-2.5 px-3 text-left font-bold text-gray-700">구분</th>
                              <th className="py-2.5 px-3 text-center font-bold text-gray-700">1++</th>
                              <th className="py-2.5 px-3 text-center font-bold text-gray-700">1+</th>
                              <th className="py-2.5 px-3 text-center font-bold text-gray-700">1</th>
                              <th className="py-2.5 px-3 text-center font-bold text-gray-700">2</th>
                              <th className="py-2.5 px-3 text-right font-bold text-gray-700">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-200">
                              <td className="py-3 px-3 font-bold text-gray-900">한우 거세</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">5두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">7두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">3두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">2두</td>
                              <td className="py-3 px-3 text-right font-bold text-gray-600">17두</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                              <td className="py-3 px-3 font-bold text-gray-900">한우 암</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">3두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">3두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">2두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">1두</td>
                              <td className="py-3 px-3 text-right font-bold text-gray-600">9두</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="py-3 px-3 font-bold text-gray-900">합계</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">8두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">10두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">5두</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">3두</td>
                              <td className="py-3 px-3 text-right font-bold text-gray-600">26두</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 경매 참가하기 버튼 */}
                      <Link href="/auction" className="block">
                        <button className="w-full bg-gray-900 hover:bg-gray-800 active:bg-black text-white font-bold text-sm py-3 rounded-lg transition-all shadow-sm hover:shadow-md active:shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                          경매 참가하기
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pt-4">
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
                    
                    {Object.keys(globalBids).length === 0 ? (
                      <div className="text-center py-12">
                        <h3 className="text-base font-medium text-gray-500">입찰 내역이 없습니다</h3>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(globalBids).map(([listingNo, bid]) => {
                          const productInfo = bid.productInfo;
                          if (!productInfo) return null;
                          const weight = parseFloat(productInfo.weight);
                          
                          return (
                            <div key={listingNo} id={`bid-card-${listingNo}`} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                              {/* 헤더 영역 */}
                              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-900">{listingNo}</span>
                                  <Link href={`/auction/1?from=myBids`}>
                                    <button className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                                      개체보기
                                    </button>
                                  </Link>
                                </div>
                                <span className="text-xs text-gray-500">{bid.time}</span>
                              </div>

                              {/* 개체 정보 테이블 */}
                              <table className="w-full text-xs">
                                <tbody>
                                  <tr className="border-b border-gray-100">
                                    <td className="px-3 py-2 text-gray-600 bg-gray-50 w-24">성별</td>
                                    <td className="px-3 py-2 text-gray-900 font-medium">{productInfo.type.includes('거세') ? '거세' : '암'}</td>
                                    <td className="px-3 py-2 text-gray-600 bg-gray-50 w-24">등급</td>
                                    <td className="px-3 py-2 text-gray-900 font-medium" style={{ letterSpacing: '-0.05em' }}>{productInfo.grade}</td>
                                  </tr>
                                  <tr className="border-b border-gray-100">
                                    <td className="px-3 py-2 text-gray-600 bg-gray-50">부위</td>
                                    <td className="px-3 py-2 text-gray-900 font-medium" style={{ letterSpacing: '-0.05em' }}>{productInfo.partName}</td>
                                    <td className="px-3 py-2 text-gray-600 bg-gray-50">중량</td>
                                    <td className="px-3 py-2 text-gray-900 font-medium">{productInfo.weight}</td>
                                  </tr>
                                  <tr className="border-b border-gray-100">
                                    <td className="px-3 py-2 text-gray-600 bg-gray-50">현재 최고가</td>
                                    <td className="px-3 py-2 text-gray-900 font-medium" colSpan={3}>
                                      <div className="flex flex-col gap-0.5">
                                        <span>{bid.highestBid.toLocaleString()}원/kg</span>
                                        <span className="text-xs text-gray-500">
                                          총 {(bid.highestBid * weight).toLocaleString()}원
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
                                            <span className="text-gray-900">{bid.myBid.toLocaleString()}원/kg</span>
                                            {bid.status === 'highest' ? (
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
                                            총 {(bid.myBid * weight).toLocaleString()}원
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
                                    disabled={bid.status === 'highest'}
                                    className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${
                                      bid.status === 'highest'
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                                    }`}
                                    onClick={() => {
                                      if (bid.status !== 'highest') {
                                        const newBidPrice = bid.highestBid + quickReBidAmount;
                                        const now = new Date();
                                        const timeStr = `${now.getFullYear().toString().slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.(${['일','월','화','수','목','금','토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                        setBid(listingNo, {
                                          ...bid,
                                          myBid: newBidPrice,
                                          highestBid: newBidPrice,
                                          status: 'highest',
                                          time: timeStr
                                        });
                                        setToastMessage('재입찰이 완료되었습니다.');
                                        setShowToast(true);
                                        setTimeout(() => setShowToast(false), 2000);
                                      }
                                    }}
                                  >
                                    최고가 +{quickReBidAmount.toLocaleString()}원 재입찰
                                  </button>
                                  <button 
                                    disabled={bid.status === 'highest'}
                                    className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${
                                      bid.status === 'highest'
                                        ? 'bg-white text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-red-700 border-2 border-red-600 hover:bg-red-50 active:bg-red-100'
                                    }`}
                                    onClick={() => {
                                      if (bid.status !== 'highest') {
                                        setSelectedBid({ listingNo, ...bid });
                                        setCustomBidPrice((bid.highestBid + quickReBidAmount).toLocaleString());
                                        setShowReBidDialog(true);
                                      }
                                    }}
                                  >
                                    직접 입력
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

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
            {showReBidDialog && selectedBid && selectedBid.productInfo && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-5">
                  <h3 className="text-lg font-bold mb-4">재입찰 확인</h3>
                  
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">상장번호: {selectedBid.listingNo}</div>
                    <div className="text-sm text-gray-600 mb-2">부위: {selectedBid.productInfo.partName}</div>
                    <div className="text-sm text-gray-600 mb-2">중량: {selectedBid.productInfo.weight}</div>
                    <div className="text-sm text-gray-600 mb-2">현재 최고가: {selectedBid.highestBid.toLocaleString()}원/kg</div>
                  </div>

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
                        placeholder="입찰가격을 입력하세요 (100원 단위)"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">원</span>
                    </div>
                    {customBidPrice && (
                      <div className="text-sm text-gray-500 mt-2">
                        총 {(parseInt(customBidPrice.replace(/,/g, '')) * parseFloat(selectedBid.productInfo.weight)).toLocaleString()}원
                      </div>
                    )}
                    {customBidPrice && parseInt(customBidPrice.replace(/,/g, '')) % 100 !== 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ 100원 단위로 입력해주세요
                      </p>
                    )}
                  </div>

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
                      disabled={!customBidPrice || parseInt(customBidPrice.replace(/,/g, '')) % 100 !== 0}
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
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md animate-fade-in">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-2xl px-5 py-4">
                  <p className="text-base font-bold text-white text-center">{toastMessage}</p>
                </div>
              </div>
            )}

            {/* 하단 네비게이션 */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 md:px-4 py-2 safe-area-pb">
              <div className="flex items-center justify-around">
                {/* 홈 */}
                <div className="flex-1 flex flex-col items-center py-2 text-red-600 cursor-pointer">
                  <HomeIcon className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">홈</span>
                </div>
                
                {/* 경매 */}
                <Link href="/auction" className="flex-1 flex flex-col items-center py-2 text-gray-600 cursor-pointer">
                  <Gavel className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium">경매</span>
                </Link>
                
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

export default function MainPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <MainPageContent />
    </Suspense>
  );
}