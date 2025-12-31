'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Home as HomeIcon,
  BarChart3,
  FileText,
  User,
  Gavel,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useBidStore } from '@/stores/bidStore';
import { motion, AnimatePresence } from 'framer-motion';

// 거래 내역 타입
interface TradeItem {
  id: string;
  status: 'ongoing' | 'won' | 'lost';
  listingNo: string;
  partName: string;
  weight: string;
  weightKg: number;
  myBid: number;
  highestBid: number;
  bidTime: string;
  // 상세 정보
  traceNo: string;
  grade: string;
  gender: string;
  monthAge: number;
  processingCompany: string;
  slaughterDate: string;
  processingDate: string;
  carcassWeight: number;
}

export default function TradePage() {
  const { bids: globalBids } = useBidStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  // 부위 정보 매핑
  const partInfoMap: Record<string, { name: string; weight: number }> = {
    '0001': { name: '등심(좌)', weight: 15.2 },
    '0002': { name: '등심(우)', weight: 15.5 },
    '0003': { name: '안심', weight: 4.3 },
    '0004': { name: '채끝', weight: 7.8 },
    '0005': { name: '갈비(좌)', weight: 12.5 },
    '0006': { name: '갈비(우)', weight: 12.8 },
    '0007': { name: '특수부위', weight: 3.5 },
    '0008': { name: '설도(좌)', weight: 16.2 },
    '0009': { name: '설도(우)', weight: 16.5 },
    '0010': { name: '앞다리', weight: 24.8 },
    '0011': { name: '우둔', weight: 21.0 },
    '0012': { name: '목심', weight: 14.3 },
    '0013': { name: '양지(좌)', weight: 12.2 },
    '0014': { name: '양지(우)', weight: 12.5 },
    '0015': { name: '사태', weight: 15.0 },
    '0016': { name: '꼬리', weight: 16.0 },
    '0017': { name: '족', weight: 10.5 },
    '0018': { name: '사골', weight: 8.0 },
    '0019': { name: '잡뼈', weight: 22.0 },
  };

  // 거래 내역 데이터 생성
  const tradeItems: TradeItem[] = useMemo(() => {
    const items: TradeItem[] = [];
    
    // 현재 진행 중인 입찰 내역
    Object.entries(globalBids).forEach(([listingNo, bid]) => {
      const partCode = listingNo.split('-')[2] || '0001';
      const partInfo = partInfoMap[partCode] || { name: '등심(좌)', weight: 15.0 };
      
      items.push({
        id: listingNo,
        status: 'ongoing',
        listingNo,
        partName: partInfo.name,
        weight: `${partInfo.weight}kg`,
        weightKg: partInfo.weight,
        myBid: bid.myBid,
        highestBid: bid.highestBid,
        bidTime: bid.time,
        traceNo: '002-1894-3853-9',
        grade: '1++A(9)',
        gender: '거세',
        monthAge: 30,
        processingCompany: '송정가공',
        slaughterDate: '2025.08.04.',
        processingDate: '2025.08.05.',
        carcassWeight: 468,
      });
    });

    // 더미 완료 데이터 (예시)
    const dummyCompleted: TradeItem[] = [
      {
        id: 'completed-1',
        status: 'won',
        listingNo: '250805-002-0003',
        partName: '안심',
        weight: '4.5kg',
        weightKg: 4.5,
        myBid: 185000,
        highestBid: 185000,
        bidTime: '25.08.05. 14:32',
        traceNo: '002-1876-5421-3',
        grade: '1++A(9)',
        gender: '거세',
        monthAge: 32,
        processingCompany: '송정가공',
        slaughterDate: '2025.08.03.',
        processingDate: '2025.08.04.',
        carcassWeight: 485,
      },
      {
        id: 'completed-2',
        status: 'lost',
        listingNo: '250805-001-0001',
        partName: '등심(좌)',
        weight: '15.3kg',
        weightKg: 15.3,
        myBid: 142000,
        highestBid: 155000,
        bidTime: '25.08.05. 13:45',
        traceNo: '002-1865-4312-7',
        grade: '1+B(8)',
        gender: '암소',
        monthAge: 28,
        processingCompany: '한우촌가공',
        slaughterDate: '2025.08.03.',
        processingDate: '2025.08.04.',
        carcassWeight: 442,
      },
      {
        id: 'completed-3',
        status: 'won',
        listingNo: '250804-003-0005',
        partName: '갈비(좌)',
        weight: '12.8kg',
        weightKg: 12.8,
        myBid: 98000,
        highestBid: 98000,
        bidTime: '25.08.04. 15:20',
        traceNo: '002-1854-3298-5',
        grade: '1A(7)',
        gender: '거세',
        monthAge: 31,
        processingCompany: '송정가공',
        slaughterDate: '2025.08.02.',
        processingDate: '2025.08.03.',
        carcassWeight: 456,
      },
    ];

    return [...items, ...dummyCompleted];
  }, [globalBids]);

  // 상태별 배지 스타일
  const getStatusBadge = (status: TradeItem['status']) => {
    switch (status) {
      case 'ongoing':
        return {
          text: '진행중',
          className: 'bg-blue-100 text-blue-700',
        };
      case 'won':
        return {
          text: '낙찰',
          className: 'bg-green-100 text-green-700',
        };
      case 'lost':
        return {
          text: '유찰',
          className: 'bg-gray-100 text-gray-600',
        };
    }
  };

  // 총 경락대금 계산
  const calculateTotalPrice = (item: TradeItem) => {
    return item.myBid * item.weightKg;
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

          {/* 페이지 제목 */}
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">거래 내역</h1>
            <p className="text-xs text-gray-500 mt-0.5">총 {tradeItems.length}건</p>
          </div>

          {/* 메인 콘텐츠 - 테이블 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
            {tradeItems.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">거래 내역이 없습니다</h3>
                <p className="text-sm text-gray-400 mb-6">경매에 참여하여 입찰을 시작해보세요.</p>
                <Link href="/auction">
                  <button className="px-6 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors">
                    경매 참여하기
                  </button>
                </Link>
              </div>
            ) : (
              <div className="pb-24">
                {/* 테이블 헤더 */}
                <div className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
                  <div className="flex items-center px-3 py-2.5 text-xs font-bold text-gray-600">
                    <div className="w-14 text-center flex-shrink-0">상태</div>
                    <div className="flex-1 min-w-0 text-center">상장번호</div>
                    <div className="w-16 text-center flex-shrink-0">부위</div>
                    <div className="w-20 text-center flex-shrink-0">입찰가</div>
                    <div className="w-6 flex-shrink-0"></div>
                  </div>
                </div>

                {/* 테이블 데이터 */}
                {tradeItems.map((item) => {
                  const statusBadge = getStatusBadge(item.status);
                  const isExpanded = expandedId === item.id;
                  const totalPrice = calculateTotalPrice(item);
                  
                  return (
                    <div key={item.id} className="bg-white border-b border-gray-200">
                      {/* 메인 행 */}
                      <div 
                        className="flex items-center px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        {/* 상태 */}
                        <div className="w-14 flex-shrink-0 flex justify-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${statusBadge.className}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        
                        {/* 상장번호 + 부가정보 */}
                        <div className="flex-1 min-w-0 px-2">
                          <div className="text-sm font-bold text-gray-900 truncate">{item.listingNo}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-500">{item.bidTime}</span>
                            {item.status === 'ongoing' && (
                              <span className={`text-[11px] font-medium ${item.myBid >= item.highestBid ? 'text-blue-600' : 'text-red-500'}`}>
                                {item.myBid >= item.highestBid ? '최고순위' : '차순위'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* 부위 + 중량 */}
                        <div className="w-16 text-center flex-shrink-0">
                          <div className="text-sm font-medium text-gray-900">{item.partName}</div>
                          <div className="text-[11px] text-gray-500">{item.weight}</div>
                        </div>
                        
                        {/* 나의 입찰가 + 최고가 */}
                        <div className="w-20 text-right flex-shrink-0">
                          <div className={`text-sm font-bold ${item.status === 'ongoing' ? 'text-red-600' : item.status === 'won' ? 'text-green-600' : 'text-gray-900'}`}>
                            {item.myBid.toLocaleString()}
                          </div>
                          {item.status === 'ongoing' && item.myBid < item.highestBid && (
                            <div className="text-[10px] text-gray-400">최고 {item.highestBid.toLocaleString()}</div>
                          )}
                          {item.status === 'won' && (
                            <div className="text-[10px] text-green-500">낙찰</div>
                          )}
                          {item.status === 'lost' && (
                            <div className="text-[10px] text-gray-400">최고 {item.highestBid.toLocaleString()}</div>
                          )}
                        </div>
                        
                        {/* 확장 화살표 */}
                        <div className="w-6 flex-shrink-0 flex justify-center">
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      
                      {/* 확장 상세 정보 */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                              {/* 총 경락대금 */}
                              <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-600">총 경락대금</span>
                                  <span className="text-lg font-bold text-red-600">
                                    {totalPrice.toLocaleString()}원
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 text-right mt-1">
                                  {item.myBid.toLocaleString()}원/kg × {item.weightKg}kg
                                </div>
                              </div>

                              {/* 개체 정보 */}
                              <div className="grid grid-cols-2 gap-3">
                                {/* 기본 정보 */}
                                <div className="bg-white rounded-lg border border-gray-200 p-3">
                                  <h4 className="text-xs font-bold text-gray-700 mb-2">개체 정보</h4>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">이력번호</span>
                                      <span className="text-gray-900 font-medium">{item.traceNo}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">등급</span>
                                      <span className="text-gray-900 font-medium">{item.grade}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">성별</span>
                                      <span className="text-gray-900 font-medium">{item.gender}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">개월령</span>
                                      <span className="text-gray-900 font-medium">{item.monthAge}개월</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 가공 정보 */}
                                <div className="bg-white rounded-lg border border-gray-200 p-3">
                                  <h4 className="text-xs font-bold text-gray-700 mb-2">가공 정보</h4>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">가공업체</span>
                                      <span className="text-gray-900 font-medium">{item.processingCompany}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">도축일</span>
                                      <span className="text-gray-900 font-medium">{item.slaughterDate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">가공일</span>
                                      <span className="text-gray-900 font-medium">{item.processingDate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">도체중량</span>
                                      <span className="text-gray-900 font-medium">{item.carcassWeight}kg</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 버튼 영역 */}
                              <div className="flex items-center gap-2 mt-3">
                                <a
                                  href={`https://aunit.mtrace.go.kr/mtracesearch/cattleNoSearch.do?btsProgNo=0109008401&btsActionMethod=SELECT&cattleNo=${item.traceNo.replace(/-/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  축산물 이력정보
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <Link 
                                  href={`/auction/1?from=myBids`}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                                >
                                  개체 상세보기
                                  <ChevronRight className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
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
              <Link href="/market" className="flex-1 flex flex-col items-center py-2 text-gray-600">
                <BarChart3 className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">시세</span>
              </Link>
              
              {/* 거래 */}
              <div className="flex-1 flex flex-col items-center py-2 text-red-600">
                <FileText className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">거래</span>
              </div>
              
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
