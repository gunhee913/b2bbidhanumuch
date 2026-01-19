'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Edit2,
  X,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBidStore } from '@/stores/bidStore';
import { GRADES, getCompanyAuctionSummary, calcTotal, getTodayDateCode } from '@/constants/auction';

// 업체별 경매 두수 데이터 (공통 상수에서 계산)
const COMPANY_AUCTION_DATA = getCompanyAuctionSummary();

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
  
  // 내 입찰내역 테이블 마우스 드래그 스크롤
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
  
  // 입금신청 모달 상태
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const currentBalance = 20000000; // 현재 잔고 (추후 Zustand로 관리)
  const depositAccountNumber = '351-0123-4567-23';

  // 오늘 날짜 포맷팅
  const getTodayFormatted = () => {
    const today = new Date();
    const year = String(today.getFullYear()).slice(2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[today.getDay()];
    return `${year}.${month}.${day}.${dayName}`;
  };

  // 계좌번호 복사
  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(depositAccountNumber);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  // 금액 입력 핸들러 (숫자만, 쉼표 포맷팅)
  const handleBalanceAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '') {
      setBalanceAmount('');
      return;
    }
    const formatted = Number(numericValue).toLocaleString();
    setBalanceAmount(formatted);
  };

  // 빠른 금액 추가
  const addQuickAmount = (amount: number) => {
    const currentValue = Number(balanceAmount.replace(/,/g, '')) || 0;
    const newValue = currentValue + amount;
    setBalanceAmount(newValue.toLocaleString());
  };

  // 내 입찰내역(진행중)은 zustand 스토어(globalBids)에서 관리

  // URL 파라미터로 탭 설정 및 스크롤
  useEffect(() => {
    const tab = searchParams.get('tab');
    const bidId = searchParams.get('bidId');
    
    if (tab === 'myBids') {
      setActiveTab('내 입찰내역(진행중)');
      
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
                    {isBalanceVisible ? '₩20,000,000원' : '₩********원'}
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setShowBalanceModal(true);
                        setBalanceAmount('');
                      }}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-xs hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span className="text-white text-base">↓</span>
                      입금신청
                    </button>
                    <Link href="/profile/balance?from=main" className="flex-1 bg-white text-red-600 border-2 border-red-600 px-3 py-2 rounded-lg font-bold text-xs hover:bg-red-50 active:bg-red-100 transition-colors flex items-center justify-center active:scale-[0.98]">
                      잔고 내역
                    </Link>
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
                    onClick={() => setActiveTab('내 입찰내역(진행중)')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${
                      activeTab === '내 입찰내역(진행중)'
                      
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    내 입찰내역(진행중)
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
                          <h3 className="text-base font-bold text-gray-900">오늘의 경매 리스트 ({getTodayFormatted()})</h3>
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-600">마감까지</span>
                          <span className="text-xs font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                            {formatTime(countdown)}
                          </span>
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
                      
                      {/* 등급별 경매 두수 현황 */}
                      <h3 className="text-base font-bold text-gray-900 mb-3">등급별 경매 두수 현황</h3>
                      <div className="mb-3 overflow-hidden border border-gray-200">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-2.5 px-3 text-left font-bold text-gray-700">구분</th>
                              {GRADES.map((grade) => (
                                <th key={grade} className="py-2.5 px-3 text-center font-bold text-gray-700">{grade}</th>
                              ))}
                              <th className="py-2.5 px-3 text-right font-bold text-gray-700">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-200">
                              <td className="py-3 px-3 font-bold text-gray-900">한우 거세</td>
                              {GRADES.map((grade) => {
                                const count = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.steer[grade], 0);
                                return <td key={grade} className="py-3 px-3 text-center font-bold text-gray-900">{count}두</td>;
                              })}
                              <td className="py-3 px-3 text-right font-bold text-gray-600">
                                {COMPANY_AUCTION_DATA.reduce((sum, company) => sum + calcTotal(company.steer), 0)}두
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200">
                              <td className="py-3 px-3 font-bold text-gray-900">한우 암</td>
                              {GRADES.map((grade) => {
                                const count = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.cow[grade], 0);
                                return <td key={grade} className="py-3 px-3 text-center font-bold text-gray-900">{count}두</td>;
                              })}
                              <td className="py-3 px-3 text-right font-bold text-gray-600">
                                {COMPANY_AUCTION_DATA.reduce((sum, company) => sum + calcTotal(company.cow), 0)}두
                              </td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="py-3 px-3 font-bold text-gray-900">합계</td>
                              {GRADES.map((grade) => {
                                const count = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.steer[grade] + company.cow[grade], 0);
                                return <td key={grade} className="py-3 px-3 text-center font-bold text-gray-900">{count}두</td>;
                              })}
                              <td className="py-3 px-3 text-right font-bold text-gray-600">
                                {COMPANY_AUCTION_DATA.reduce((sum, company) => sum + calcTotal(company.steer) + calcTotal(company.cow), 0)}두
                              </td>
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

                    {/* 업체별 경매 두수 현황 */}
                    <div className="mt-6 mb-4">
                      <div className="mb-3">
                        <h3 className="text-base font-bold text-gray-900">업체별 경매 두수 현황</h3>
                      </div>
                      
                      <div className="overflow-hidden border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-2 px-1.5 text-center font-bold text-gray-700 w-16">업체명</th>
                              <th className="py-2 px-1.5 text-center font-bold text-gray-700 w-10">성별</th>
                              {GRADES.map((grade) => (
                                <th key={grade} className="py-2 px-2 text-center font-bold text-gray-700 w-10">{grade}</th>
                              ))}
                              <th className="py-2 px-2 text-center font-bold text-gray-700 w-10">소계</th>
                              <th className="py-2 px-2 text-center font-bold text-gray-700 w-10">합계</th>
                            </tr>
                          </thead>
                          {COMPANY_AUCTION_DATA.map((company, idx) => {
                            const companyTotal = calcTotal(company.steer) + calcTotal(company.cow);
                            return (
                              <tbody key={company.name} className="group cursor-pointer hover:bg-gray-50" onClick={() => window.location.href = `/auction?company=${company.name}`}>
                                <tr className={`border-b border-gray-100 ${idx > 0 ? 'border-t border-gray-200' : ''}`}>
                                  <td rowSpan={2} className="py-2 px-1.5 text-center font-bold text-gray-900 align-middle border-r border-gray-100">
                                    {company.name}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center text-gray-600">거세</td>
                                  {GRADES.map((grade) => (
                                    <td key={grade} className={`py-1.5 px-2 text-center font-bold ${company.steer[grade] > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                      {company.steer[grade]}
                                    </td>
                                  ))}
                                  <td className="py-1.5 px-2 text-center font-bold text-gray-600">{calcTotal(company.steer)}</td>
                                  <td rowSpan={2} className="py-1.5 px-2 text-center font-bold text-gray-900 align-middle border-l border-gray-100 bg-gray-50 group-hover:bg-gray-100">
                                    {companyTotal}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                  <td className="py-1.5 px-1.5 text-center text-gray-600">암</td>
                                  {GRADES.map((grade) => (
                                    <td key={grade} className={`py-1.5 px-2 text-center font-bold ${company.cow[grade] > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                      {company.cow[grade]}
                                    </td>
                                  ))}
                                  <td className="py-1.5 px-2 text-center font-bold text-gray-600">{calcTotal(company.cow)}</td>
                                </tr>
                              </tbody>
                            );
                          })}
                          <tfoot>
                            <tr className="bg-gray-100 border-t-2 border-gray-300">
                              <td colSpan={2} className="py-2 px-1.5 text-center font-bold text-gray-900">총합계</td>
                              {GRADES.map((grade) => {
                                const gradeTotal = COMPANY_AUCTION_DATA.reduce(
                                  (sum, company) => sum + company.steer[grade] + company.cow[grade], 0
                                );
                                return (
                                  <td key={grade} className="py-2 px-2 text-center font-bold text-gray-900">
                                    {gradeTotal}
                                  </td>
                                );
                              })}
                              <td className="py-2 px-2 text-center font-bold text-gray-600">
                                {COMPANY_AUCTION_DATA.reduce((sum, company) => sum + calcTotal(company.steer) + calcTotal(company.cow), 0)}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-gray-900">
                                {COMPANY_AUCTION_DATA.reduce((sum, company) => sum + calcTotal(company.steer) + calcTotal(company.cow), 0)}두
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
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
                              <th className="px-2 py-2.5 text-left font-bold text-gray-700">상장번호</th>
                              <th className="px-2 py-2.5 text-center font-bold text-gray-700">부위</th>
                              <th className="px-2 py-2.5 text-center font-bold text-gray-700">등급</th>
                              <th className="px-2 py-2.5 text-center font-bold text-gray-700">중량</th>
                              <th className="px-2 py-2.5 text-right font-bold text-gray-700">최고가</th>
                              <th className="px-2 py-2.5 text-right font-bold text-gray-700">나의 입찰가</th>
                              <th className="px-2 py-2.5 text-center font-bold text-gray-700">액션</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(globalBids)
                              .filter(([listingNo]) => listingNo.startsWith(getTodayDateCode()))
                              .map(([listingNo, bid]) => {
                              const productInfo = bid.productInfo;
                              if (!productInfo) return null;
                              
                              return (
                                <tr key={listingNo} id={`bid-card-${listingNo}`} className="border-b border-gray-100 hover:bg-gray-50">
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
                                  <td className="px-2 py-2.5 text-left font-medium text-gray-900">
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
                                  <td className="px-2 py-2.5 text-right font-medium text-gray-900">
                                    {bid.highestBid.toLocaleString()}원
                                  </td>
                                  {/* 나의 입찰가 */}
                                  <td className="px-2 py-2.5 text-right font-medium text-gray-900">
                                    {bid.myBid.toLocaleString()}원
                                  </td>
                                  {/* 액션 */}
                                  <td className="px-2 py-2.5 text-center">
                                    {bid.status === 'highest' ? (
                                      <span className="text-gray-400 text-[10px]">-</span>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          onClick={() => {
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
                                          }}
                                          className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors"
                                        >
                                          +{quickReBidAmount >= 1000 ? `${(quickReBidAmount / 1000).toFixed(0)}천` : `${quickReBidAmount}원`}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedBid({ listingNo, ...bid });
                                            setCustomBidPrice((bid.highestBid + quickReBidAmount).toLocaleString());
                                            setShowReBidDialog(true);
                                          }}
                                          className="px-2 py-1 bg-white text-red-600 text-[10px] font-bold rounded border border-red-600 hover:bg-red-50 transition-colors"
                                        >
                                          직접
                                        </button>
                                      </div>
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

            {/* 입금신청 모달 */}
            <AnimatePresence>
              {showBalanceModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center p-4"
                >
                  {/* 배경 오버레이 */}
                  <div 
                    className="absolute inset-0 bg-black/60"
                    onClick={() => setShowBalanceModal(false)}
                  />
                  
                  {/* 모달 콘텐츠 */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
                  >
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h3 className="text-base font-bold">입금신청</h3>
                      <button 
                        onClick={() => setShowBalanceModal(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* 내용 */}
                    <div className="p-4">
                      {/* 입금 계좌 안내 */}
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-gray-600 font-medium">입금 계좌</div>
                          <button
                            onClick={copyAccountNumber}
                            className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-700 transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3" />
                                복사됨
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                복사
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-sm font-bold text-gray-900">농협은행 {depositAccountNumber}</div>
                        <div className="text-xs text-gray-500">예금주: 농협 중부미트센터</div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-[11px] text-gray-600">계좌이체 후, 입금신청 부탁드립니다.</p>
                        </div>
                      </div>

                      {/* 현재 잔고 */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">현재 잔고</div>
                        <div className="text-lg font-bold text-gray-900">
                          ₩{currentBalance.toLocaleString()}
                        </div>
                      </div>

                      {/* 금액 입력 */}
                      <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1.5">
                          입금 신청 금액
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₩</span>
                          <input
                            type="text"
                            value={balanceAmount}
                            onChange={(e) => handleBalanceAmountChange(e.target.value)}
                            placeholder="0"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-right text-lg font-bold focus:outline-none focus:border-red-500 bg-white"
                          />
                        </div>
                      </div>

                      {/* 빠른 금액 버튼 */}
                      <div className="flex gap-1.5 mb-4">
                        <button
                          onClick={() => addQuickAmount(100000)}
                          className="flex-1 py-2 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          +10만
                        </button>
                        <button
                          onClick={() => addQuickAmount(500000)}
                          className="flex-1 py-2 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          +50만
                        </button>
                        <button
                          onClick={() => addQuickAmount(1000000)}
                          className="flex-1 py-2 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          +100만
                        </button>
                        <button
                          onClick={() => addQuickAmount(10000000)}
                          className="flex-1 py-2 text-[10px] font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          +1,000만
                        </button>
                        <button
                          onClick={() => setBalanceAmount('')}
                          className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          title="초기화"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>

                      {/* 확인 버튼 */}
                      <button
                        disabled={!balanceAmount || balanceAmount === '0'}
                        className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
                          balanceAmount && balanceAmount !== '0'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        입금신청
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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