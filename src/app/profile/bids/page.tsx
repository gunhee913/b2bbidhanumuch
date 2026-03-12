'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft,
  ArrowRight,
  Edit2
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { useBidStore } from '@/stores/bidStore';

export default function BidsHistoryPage() {
  const { 
    bids: globalBids, 
    setBid,
    quickReBidAmount, 
    setQuickReBidAmount,
    isSecondBidNotificationOn,
    setIsSecondBidNotificationOn
  } = useBidStore();

  const [showQuickReBidEdit, setShowQuickReBidEdit] = useState(false);
  const [tempQuickReBidAmount, setTempQuickReBidAmount] = useState('1,000');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showReBidDialog, setShowReBidDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any>(null);
  const [customBidPrice, setCustomBidPrice] = useState('');

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
                      src="/농협 음성.png" 
                      alt="농협 음성" 
                      className="h-5 w-auto border border-gray-300 rounded px-1.5 py-0.5 bg-gradient-to-br from-white to-gray-50 shadow-sm"
                    />
                  </div>
              </div>
            </div>
          </div>

            {/* 페이지 제목 */}
            <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Link href="/profile">
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                </Link>
                <h1 className="text-lg font-bold text-gray-900">입찰 내역</h1>
              </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
              <div className="px-4 pt-4 pb-24">
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
            </div>

            {/* 하단 네비게이션 */}
            <BottomNav />
          </div>
        </div>

      {/* 빠른 재입찰 금액 설정 모달 */}
      <AnimatePresence>
        {showQuickReBidEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
            onClick={() => setShowQuickReBidEdit(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-[280px] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-gray-900 mb-4">빠른 재입찰 금액 설정</h3>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={tempQuickReBidAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '') {
                      setTempQuickReBidAmount('');
                    } else {
                      setTempQuickReBidAmount(Number(value).toLocaleString());
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 text-right pr-8"
                  placeholder="금액 입력"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">원</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuickReBidEdit(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    const amount = Number(tempQuickReBidAmount.replace(/,/g, ''));
                    if (amount > 0) {
                      setQuickReBidAmount(amount);
                      setShowQuickReBidEdit(false);
                    }
                  }}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 직접 입력 재입찰 모달 */}
      <AnimatePresence>
        {showReBidDialog && selectedBid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
            onClick={() => setShowReBidDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-[320px] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-gray-900 mb-2">재입찰</h3>
              <p className="text-sm text-gray-600 mb-4">
                상장번호: {selectedBid.listingNo}<br />
                현재 최고가: {selectedBid.highestBid.toLocaleString()}원/kg
              </p>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={customBidPrice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '') {
                      setCustomBidPrice('');
                    } else {
                      setCustomBidPrice(Number(value).toLocaleString());
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 text-right pr-16"
                  placeholder="입찰가 입력"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">원/kg</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReBidDialog(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    const newBidPrice = Number(customBidPrice.replace(/,/g, ''));
                    if (newBidPrice > selectedBid.highestBid) {
                      const now = new Date();
                      const timeStr = `${now.getFullYear().toString().slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.(${['일','월','화','수','목','금','토'][now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                      setBid(selectedBid.listingNo, {
                        ...selectedBid,
                        myBid: newBidPrice,
                        highestBid: newBidPrice,
                        status: 'highest',
                        time: timeStr
                      });
                      setShowReBidDialog(false);
                      setToastMessage('재입찰이 완료되었습니다.');
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 2000);
                    }
                  }}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  입찰하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 토스트 메시지 */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-[10001]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

