'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Edit2,
  X,
  Copy,
  Check
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useBidStore } from '@/stores/bidStore';
import { GRADES, getCompanyAuctionSummary, calcTotal, getTodayDateCode } from '@/constants/auction';

// 한국어 로케일 등록
registerLocale('ko', ko);

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
    setIsSecondBidNotificationOn,
    cleanOldBids
  } = useBidStore();
  
  // 앱 로드 시 오래된 입찰 데이터 정리
  useEffect(() => {
    cleanOldBids();
  }, [cleanOldBids]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('상장 정보');
  const [showReBidDialog, setShowReBidDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState('');
  const [showQuickReBidEdit, setShowQuickReBidEdit] = useState(false);
  const [tempQuickReBidAmount, setTempQuickReBidAmount] = useState('1,000');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [toastType, setToastType] = useState<'warning' | 'success'>('success');
  
  // 토스트 표시 함수
  const showToastMessage = (message: string, type: 'warning' | 'success' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
  
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

  // 날짜 포맷팅
  const formatDateForDisplay = (date: Date) => {
    const year = String(date.getFullYear()).slice(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${year}.${month}.${day}.(${dayName})`;
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
      setActiveTab('입찰내역(진행중)');
      
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
    showToastMessage(`입찰이 완료되었습니다.`, 'success');

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

              {/* 내 잔고 섹션 */}
              <div className="mx-4 mt-3 bg-gradient-to-br from-gray-50 to-white border border-gray-200 shadow-sm px-5 py-5 rounded-lg">
                <p className="text-gray-600 text-xs font-medium mb-1">내 잔고</p>
                <p className="text-red-600 text-2xl font-bold tracking-tight text-right">-8,280,000<span className="text-lg ml-0.5">원</span></p>
              </div>

              {/* 버튼 */}
              <div className="mx-4 mt-2">
                <Link href="/profile/balance?from=main" className="block">
                  <button className="w-full bg-gray-900 hover:bg-gray-800 active:bg-black text-white font-bold text-sm py-3 rounded-lg transition-all shadow-sm hover:shadow-md active:shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                    잔고내역
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>

              {/* 탭 메뉴 */}
              <div className="mt-4 bg-white">
                <div className="flex border-b border-gray-200 px-4">
                  <button
                    onClick={() => setActiveTab('상장 정보')}
                    className={`flex-1 py-3 text-xs font-bold transition-colors ${
                      activeTab === '상장 정보'
                        ? 'text-gray-900 border-b-2 border-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    상장 정보
                  </button>
                  <button
                    onClick={() => setActiveTab('입찰내역(진행중)')}
                    className={`flex-1 py-3 text-xs font-bold transition-colors ${
                      activeTab === '입찰내역(진행중)'
                        ? 'text-gray-900 border-b-2 border-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    입찰내역(진행중)
                  </button>
                  <button
                    onClick={() => setActiveTab('경매 결과')}
                    className={`flex-1 py-3 text-xs font-bold transition-colors ${
                      activeTab === '경매 결과'
                        ? 'text-gray-900 border-b-2 border-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    경매 결과
                  </button>
                </div>
              </div>

              {/* 탭 컨텐츠 */}
              <div className="pb-24 bg-white">
                {activeTab === '상장 정보' ? (
                  <div className="px-4 pt-4">
                    {/* 날짜 조회 */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm text-gray-600">조회일자 :</span>
                        <DatePicker
                          selected={selectedDate}
                          onChange={(date: Date | null) => date && setSelectedDate(date)}
                          locale="ko"
                          dateFormat="yyyy.MM.dd (eee)"
                          dateFormatCalendar="yyyy년 M월"
                          className="px-3 py-2 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors text-center w-[150px]"
                          calendarClassName="!border-gray-200 !rounded-lg !shadow-lg"
                          showPopperArrow={false}
                          popperPlacement="bottom-start"
                        />
                      </div>
                      {/* 등급별 경매 두수 */}
                      <h3 className="text-base font-bold text-gray-900 mb-3">등급별 경매 두수</h3>
                      <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs table-fixed">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-2 text-center font-medium text-gray-500 w-[12.5%] border-r border-gray-200">성별</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[12.5%] border-r border-gray-200">1++(9)</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[12.5%] border-r border-gray-200">1++(8)</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[12.5%] border-r border-gray-200">1++(7)</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[12.5%] border-r border-gray-200">1+</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[12.5%] border-r border-gray-200">1</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[12.5%] border-r border-gray-200">2</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[12.5%]">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // 1++ 등급을 (9), (8), (7)로 분배
                              const steerTotal1pp = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.steer['1++'], 0);
                              const steer9 = Math.floor(steerTotal1pp * 0.3);
                              const steer8 = Math.floor(steerTotal1pp * 0.4);
                              const steer7 = steerTotal1pp - steer9 - steer8;
                              const steer1p = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.steer['1+'], 0);
                              const steer1 = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.steer['1'], 0);
                              const steer2 = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.steer['2'], 0);
                              const steerSum = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + calcTotal(company.steer), 0);

                              const cowTotal1pp = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.cow['1++'], 0);
                              const cow9 = Math.floor(cowTotal1pp * 0.25);
                              const cow8 = Math.floor(cowTotal1pp * 0.35);
                              const cow7 = cowTotal1pp - cow9 - cow8;
                              const cow1p = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.cow['1+'], 0);
                              const cow1 = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.cow['1'], 0);
                              const cow2 = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + company.cow['2'], 0);
                              const cowSum = COMPANY_AUCTION_DATA.reduce((sum, company) => sum + calcTotal(company.cow), 0);

                              return (
                                <>
                                  <tr className="border-b border-gray-100">
                                    <td className="py-2.5 text-center text-gray-600 border-r border-gray-100">거세</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{steer9}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{steer8}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{steer7}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{steer1p}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{steer1}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{steer2}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900">{steerSum}</td>
                                  </tr>
                                  <tr className="border-b border-gray-100">
                                    <td className="py-2.5 text-center text-gray-600 border-r border-gray-100">암</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{cow9}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{cow8}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{cow7}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{cow1p}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{cow1}</td>
                                    <td className="py-2.5 text-center text-gray-900 border-r border-gray-100">{cow2}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900">{cowSum}</td>
                                  </tr>
                                  <tr className="bg-gray-50">
                                    <td className="py-2.5 text-center font-semibold text-gray-700 border-r border-gray-100">합계</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{steer9 + cow9}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{steer8 + cow8}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{steer7 + cow7}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{steer1p + cow1p}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{steer1 + cow1}</td>
                                    <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{steer2 + cow2}</td>
                                    <td className="py-2.5 text-center font-bold text-gray-900">{steerSum + cowSum}</td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 업체별 경매 두수 */}
                    <div className="mt-6 mb-4">
                      <div className="mb-3">
                        <h3 className="text-base font-bold text-gray-900">업체별 경매 두수</h3>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs table-fixed">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="py-2 text-center font-medium text-gray-500 w-[22%] border-r border-gray-200">업체</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[11%] border-r border-gray-200">1++(9)</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[11%] border-r border-gray-200">1++(8)</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[11%] border-r border-gray-200">1++(7)</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[11%] border-r border-gray-200">1+</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[11%] border-r border-gray-200">1</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[11%] border-r border-gray-200">2</th>
                              <th className="py-2 text-center font-medium text-gray-500 w-[12%]">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                          {COMPANY_AUCTION_DATA.map((company, idx) => {
                            const companyTotal = calcTotal(company.steer) + calcTotal(company.cow);
                            // 1++ 분배 (거세 + 암 합산)
                            const total1pp = company.steer['1++'] + company.cow['1++'];
                            const grade9 = Math.floor(total1pp * 0.28);
                            const grade8 = Math.floor(total1pp * 0.38);
                            const grade7 = total1pp - grade9 - grade8;
                            const grade1p = company.steer['1+'] + company.cow['1+'];
                            const grade1 = company.steer['1'] + company.cow['1'];
                            const grade2 = company.steer['2'] + company.cow['2'];
                            return (
                              <tr key={company.name} className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${idx > 0 ? 'border-t border-gray-100' : ''}`} onClick={() => window.location.href = `/auction?company=${company.name}`}>
                                <td className="py-2 text-center text-gray-900 font-semibold border-r border-gray-100">
                                  {company.name}
                                </td>
                                <td className="py-2 text-center text-gray-900 border-r border-gray-100">{grade9}</td>
                                <td className="py-2 text-center text-gray-900 border-r border-gray-100">{grade8}</td>
                                <td className="py-2 text-center text-gray-900 border-r border-gray-100">{grade7}</td>
                                <td className="py-2 text-center text-gray-900 border-r border-gray-100">{grade1p}</td>
                                <td className="py-2 text-center text-gray-900 border-r border-gray-100">{grade1}</td>
                                <td className="py-2 text-center text-gray-900 border-r border-gray-100">{grade2}</td>
                                <td className="py-2 text-center font-semibold text-gray-900">{companyTotal}</td>
                              </tr>
                            );
                          })}
                          </tbody>
                          <tfoot>
                            {(() => {
                              const total1pp = COMPANY_AUCTION_DATA.reduce((sum, c) => sum + c.steer['1++'] + c.cow['1++'], 0);
                              const total9 = Math.floor(total1pp * 0.28);
                              const total8 = Math.floor(total1pp * 0.38);
                              const total7 = total1pp - total9 - total8;
                              const total1p = COMPANY_AUCTION_DATA.reduce((sum, c) => sum + c.steer['1+'] + c.cow['1+'], 0);
                              const total1 = COMPANY_AUCTION_DATA.reduce((sum, c) => sum + c.steer['1'] + c.cow['1'], 0);
                              const total2 = COMPANY_AUCTION_DATA.reduce((sum, c) => sum + c.steer['2'] + c.cow['2'], 0);
                              const grandTotal = COMPANY_AUCTION_DATA.reduce((sum, c) => sum + calcTotal(c.steer) + calcTotal(c.cow), 0);
                              return (
                                <tr className="bg-gray-50 border-t border-gray-300">
                                  <td className="py-2.5 text-center font-semibold text-gray-700 border-r border-gray-100">합계</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{total9}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{total8}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{total7}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{total1p}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{total1}</td>
                                  <td className="py-2.5 text-center font-semibold text-gray-900 border-r border-gray-100">{total2}</td>
                                  <td className="py-2.5 text-center font-bold text-gray-900">{grandTotal}</td>
                                </tr>
                              );
                            })()}
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* 경매 참가하기 버튼 */}
                    <div className="mt-6">
                      <Link href="/auction" className="block">
                        <button className="w-full bg-gray-900 hover:bg-gray-800 active:bg-black text-white font-bold text-sm py-3 rounded-lg transition-all shadow-sm hover:shadow-md active:shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                          경매 참가하기
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>

                  </div>
                ) : activeTab === '입찰내역(진행중)' ? (
                  <div className="px-4 pt-4">
                    {/* 전체내역 버튼 */}
                    <div className="flex justify-end mb-2">
                      <Link href="/trade" className="flex items-center gap-0.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors">
                        전체내역
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
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
                              ? 'bg-gray-900' 
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
                              .filter(([listingNo]) => listingNo.startsWith(getTodayDateCode()))
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
                                <tr key={listingNo} id={`bid-card-${listingNo}`} className="border-b border-gray-100 hover:bg-gray-50">
                                  {/* 상태 */}
                                  <td className="px-2 py-2.5 text-center">
                                            {bid.status === 'highest' ? (
                                      <span className="inline-flex px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                                        최고가격
                                              </span>
                                            ) : (
                                      <span className="inline-flex px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded">
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
                                        setSelectedBid({ listingNo, ...bid });
                                        setCustomBidPrice((bid.highestBid + quickReBidAmount).toLocaleString());
                                        setShowReBidDialog(true);
                                    }}
                                        className="px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded hover:bg-gray-800 transition-colors"
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
                ) : (
                  <div className="px-4 pt-4">
                    {/* 경매 결과 탭 컨텐츠 */}
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-sm">경매 결과가 없습니다.</p>
                    </div>
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
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">원</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      현재 최고가에 이 금액을 더해 빠른 재입찰합니다.
                    </p>
                    {tempQuickReBidAmount && parseInt(tempQuickReBidAmount.replace(/,/g, '')) % 100 !== 0 && (
                      <p className="text-xs text-gray-500 mt-1">
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
                      className="flex-1 bg-gray-900 text-white py-2 rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 재입찰 바텀시트 */}
            <AnimatePresence>
            {showReBidDialog && selectedBid && selectedBid.productInfo && (
                <>
                  {/* 백드롭 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 z-40"
                    onClick={() => {
                      setShowReBidDialog(false);
                      setSelectedBid(null);
                      setCustomBidPrice('');
                    }}
                  />
                  
                  {/* 바텀시트 */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[85vh] overflow-y-auto"
                  >
                    {/* 핸들 */}
                    <div className="flex justify-center py-2">
                      <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                  </div>

                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 pb-3">
                      <h3 className="text-lg font-bold">입찰하기</h3>
                      <button
                        onClick={() => {
                          setShowReBidDialog(false);
                          setSelectedBid(null);
                          setCustomBidPrice('');
                        }}
                        className="p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* 콘텐츠 */}
                    <div className="px-4 pb-8">
                      {/* 상품 정보 배지 */}
                      <div className="flex items-center gap-1 mb-4 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 rounded font-medium">
                          {selectedBid.listingNo}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 rounded font-medium">
                          {selectedBid.productInfo.type || '한우거세'}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 rounded font-medium">
                          {selectedBid.productInfo.grade || '1++A(9)'}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 rounded font-medium">
                          30개월
                        </span>
                      </div>
                      
                      {/* 부위 및 중량 */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">선택된 부위</div>
                          <div className="w-full px-3 py-2.5 text-sm font-bold border border-gray-200 rounded-lg bg-gray-50 text-center">
                            {selectedBid.productInfo.partName}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">중량</div>
                          <div className="w-full px-3 py-2.5 text-sm font-bold border border-gray-200 rounded-lg bg-gray-50 text-center">
                            {selectedBid.productInfo.weight}
                          </div>
                        </div>
                      </div>
                      
                      {/* 입찰가격 */}
                  <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-gray-500">입찰가격 (원/kg)</div>
                        </div>
                        <div className="relative mb-2">
                      <input
                            type="text"
                        inputMode="numeric"
                        value={customBidPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setCustomBidPrice(value ? parseInt(value).toLocaleString() : '');
                        }}
                            placeholder={`최저단가 ${(selectedBid.productInfo.price || 50000).toLocaleString()}`}
                            className="w-full px-3 py-3 pr-10 text-right text-xl font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white text-black placeholder:text-gray-400"
                      />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
                            원
                    </div>
                      </div>
                        {/* 가격 조정 버튼 */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {[100, 1000, 10000, 50000].map((amount) => (
                    <button
                              key={amount}
                      onClick={() => {
                                const currentPrice = customBidPrice ? parseInt(customBidPrice.replace(/,/g, '')) : 0;
                                const newPrice = currentPrice + amount;
                                setCustomBidPrice(newPrice.toLocaleString());
                      }}
                              className="py-2.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
                    >
                              +{amount.toLocaleString()}
                    </button>
                          ))}
                    <button
                            onClick={() => setCustomBidPrice('')}
                            className="py-2.5 text-xs bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 text-gray-600 font-medium"
                    >
                            초기화
                    </button>
                  </div>
                </div>
                      
                      {/* 총 입찰금액 */}
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-700">총 입찰금액</span>
                          <span className="text-xl font-bold text-gray-900">
                            {(() => {
                              if (!customBidPrice) return '-';
                              const price = parseInt(customBidPrice.replace(/,/g, ''));
                              const weight = parseFloat(selectedBid.productInfo.weight);
                              const total = Math.round(price * weight);
                              return `${total.toLocaleString()}원`;
                            })()}
                          </span>
              </div>
                      </div>
                      
                      {/* 입찰하기 버튼 */}
                      <button
                        onClick={confirmReBid}
                        disabled={!customBidPrice}
                        className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-base rounded-lg"
                      >
                        입찰하기
                      </button>
                    </div>
                  </motion.div>
                </>
            )}
            </AnimatePresence>

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
                            className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-700 transition-colors"
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
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-right text-lg font-bold focus:outline-none focus:border-gray-500 bg-white"
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
                            ? 'bg-gray-900 text-white hover:bg-gray-800'
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
            <BottomNav />
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