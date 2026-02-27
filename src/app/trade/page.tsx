'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Settings,
  Bell,
  Search,
  Loader2
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface WinningPart {
  partId: string;
  partNo: number;
  partName: string;
  listingPartNo: string;
  weight: number;
  bidPrice: number;
  bidAmount: number;
  bidAt: string;
  dealerId: string;
  dealerNo: string;
  dealerName: string;
  listingId: string;
  listingNo: string;
  listingDate: string;
  grade: string;
  traceNo: string;
  breed: string;
  gender: string;
  monthAge: number;
  carcassWeight: number;
  backFat: number;
  eyeMuscle: number;
  marbling: number;
  meatColor: number;
  fatColor: number;
  texture: number;
  maturity: number;
  slaughterHouse: string;
  slaughterNo: string;
  slaughterDate: string;
  processDate: string;
  processWeight: number;
  companyName: string;
}

interface AssignmentInfo {
  partnerId: string;
  partnerNo: string;
  partnerName: string;
  representative: string;
  phone: string;
  address: string;
}

export default function TradePage() {
  const { data: session } = useSession();
  const dealer = (session as any)?.dealer;
  const employee = (session as any)?.employee;
  const dealerId = dealer?.id || employee?.dealerId || null;

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleTableScroll = () => {
    if (tableScrollRef.current && headerRef.current) {
      headerRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tableScrollRef.current.offsetLeft);
    setScrollLeft(tableScrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableScrollRef.current.offsetLeft;
    const walk = (startX - x) * 1.5;
    tableScrollRef.current.scrollLeft = scrollLeft + walk;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [dealerFilter, setDealerFilter] = useState<'all' | 'registered' | 'unregistered'>('all');

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchStartDate, setSearchStartDate] = useState(todayStr);
  const [searchEndDate, setSearchEndDate] = useState(todayStr);

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

  const { data: partsData, isLoading } = useQuery<{ winningParts: WinningPart[] }>({
    queryKey: ['trade-winning-parts', dealerId, searchStartDate, searchEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dealerId) params.set('dealerId', dealerId);
      if (searchStartDate) params.set('startDate', searchStartDate);
      if (searchEndDate) params.set('endDate', searchEndDate);
      const res = await fetch(`/api/delivery/winning-parts?${params.toString()}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!dealerId,
  });

  const { data: assignmentsData } = useQuery<{ assignments: Record<string, AssignmentInfo> }>({
    queryKey: ['trade-assignments', searchStartDate, searchEndDate],
    queryFn: async () => {
      const res = await fetch(`/api/delivery/assignments?date=${searchStartDate}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!dealerId,
  });

  const winningParts = partsData?.winningParts || [];
  const assignments = assignmentsData?.assignments || {};

  const getPartnerName = (partId: string): string | null => {
    return assignments[partId]?.partnerName || null;
  };

  const formatBidTime = (bidAt: string, listingDate: string): string => {
    if (bidAt) {
      try {
        const d = new Date(bidAt);
        return format(d, 'yy.MM.dd HH:mm');
      } catch {
        // fall through
      }
    }
    if (listingDate) {
      return listingDate.replace(/-/g, '.').slice(2);
    }
    return '-';
  };

  const summaryInfo = useMemo(() => {
    const total = winningParts.length;
    const registered = winningParts.filter(p => !!getPartnerName(p.partId)).length;
    const unregistered = total - registered;
    return { total, registered, unregistered };
  }, [winningParts, assignments]);

  const searchFilteredItems = useMemo(() => {
    if (!searchQuery.trim()) return winningParts;
    const query = searchQuery.trim().toLowerCase();
    return winningParts.filter(item => {
      const partnerName = getPartnerName(item.partId) || '';
      return (
        (item.listingPartNo || '').toLowerCase().includes(query) ||
        item.listingNo.toLowerCase().includes(query) ||
        item.partName.toLowerCase().includes(query) ||
        item.grade.toLowerCase().includes(query) ||
        partnerName.toLowerCase().includes(query)
      );
    });
  }, [winningParts, searchQuery, assignments]);

  const filteredItems = useMemo(() => {
    const filtered = searchFilteredItems.filter(item => {
      const hasDealer = !!getPartnerName(item.partId);
      if (dealerFilter === 'registered') return hasDealer;
      if (dealerFilter === 'unregistered') return !hasDealer;
      return true;
    });

    return filtered.sort((a, b) => {
      if (a.listingDate !== b.listingDate) return b.listingDate.localeCompare(a.listingDate);
      if (a.listingNo !== b.listingNo) return a.listingNo.localeCompare(b.listingNo);
      return a.partNo - b.partNo;
    });
  }, [searchFilteredItems, dealerFilter, assignments]);

  const handleSearch = () => {
    setSearchStartDate(startDate);
    setSearchEndDate(endDate);
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
          <style jsx global>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          {/* 헤더 */}
          <div className="flex-shrink-0 bg-white">
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="w-[80px]"></div>
                <h1 className="text-[17px] font-bold text-gray-900">배송지시</h1>
                <div className="flex items-center gap-1">
                  <Link href="/settings" className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center">
                    <Settings className="w-[22px] h-[22px]" />
                  </Link>
                  <Link href="/notifications" className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center relative">
                    <Bell className="w-[22px] h-[22px] translate-y-[0.5px]" />
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">2</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 hide-scrollbar">
            {/* 검색 */}
            <div className="bg-white px-4 py-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="상장번호, 부위, 등급, 거래처 검색"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-gray-50"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 일자 */}
            <div className="bg-white px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] text-gray-500">일자</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-[13px] text-gray-700 bg-white border border-gray-200 rounded px-2.5 py-1.5 [&::-webkit-calendar-picker-indicator]:brightness-0"
                />
                <span className="text-[13px] text-gray-400">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-[13px] text-gray-700 bg-white border border-gray-200 rounded px-2.5 py-1.5 [&::-webkit-calendar-picker-indicator]:brightness-0"
                />
                <button
                  onClick={handleSearch}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-white bg-gray-800 rounded hover:bg-gray-900 transition-colors"
                >
                  조회
                </button>
              </div>
            </div>

            {/* 요약 + 필터 */}
            <div className="bg-white border-b border-gray-200 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['all', 'registered', 'unregistered'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDealerFilter(filter)}
                      className={`px-3.5 py-2 text-[13px] font-medium rounded-md transition-colors ${
                        dealerFilter === filter
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter === 'all' ? '전체' : filter === 'registered' ? '등록' : '미등록'}
                    </button>
                  ))}
                </div>
                <div className="text-[13px] text-gray-500">
                  총 <span className="font-medium text-gray-700">{summaryInfo.total}</span>건,
                  등록 <span className="font-medium text-gray-700">{summaryInfo.registered}</span>건,
                  미등록 <span className="font-medium text-gray-700">{summaryInfo.unregistered}</span>건
                </div>
              </div>
            </div>

            {/* 테이블 */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">
                  {winningParts.length === 0 ? '낙찰 내역이 없습니다' : '해당 조건의 내역이 없습니다'}
                </h3>
              </div>
            ) : (
              <div className="pb-24">
                {/* 테이블 헤더 */}
                <div
                  ref={headerRef}
                  className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 overflow-x-hidden"
                >
                  <div className="min-w-[700px] h-9 flex items-center">
                    <div className="grid px-2 text-[13px] font-medium text-gray-500 w-full" style={{ gridTemplateColumns: '85px 125px 65px 75px 60px 80px 95px 105px' }}>
                      <div className="text-center">거래처</div>
                      <div className="text-center">상장번호</div>
                      <div className="text-center">부위</div>
                      <div className="text-center">등급</div>
                      <div className="text-center">중량</div>
                      <div className="text-center">낙찰가</div>
                      <div className="text-center">경락대금</div>
                      <div className="text-center">낙찰일자</div>
                    </div>
                  </div>
                </div>

                {/* 테이블 데이터 */}
                <div
                  ref={tableScrollRef}
                  className="overflow-x-auto cursor-grab active:cursor-grabbing select-none hide-scrollbar"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onScroll={handleTableScroll}
                >
                  <div className="min-w-[700px]">
                    {filteredItems.map((item) => {
                      const partnerName = getPartnerName(item.partId);

                      return (
                        <div
                          key={item.partId}
                          className="grid px-2 py-3 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors items-center"
                          style={{ gridTemplateColumns: '85px 125px 65px 75px 60px 80px 95px 105px' }}
                        >
                          {/* 거래처 */}
                          <div className="text-center">
                            {partnerName ? (
                              <div className="text-[13px] text-gray-700 truncate">{partnerName}</div>
                            ) : (
                              <Link href={`/trade/register?partId=${item.partId}&listingNo=${item.listingPartNo}`}>
                                <button className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                                  <Plus className="w-3 h-3" />
                                  등록
                                </button>
                              </Link>
                            )}
                          </div>

                          {/* 상장번호 */}
                          <div className="text-center">
                            <Link
                              href={`/trade/detail?partId=${item.partId}&listingNo=${item.listingPartNo}`}
                              className="text-[13px] font-medium text-gray-900 underline cursor-pointer"
                            >
                              {item.listingPartNo || item.listingNo}
                            </Link>
                          </div>

                          {/* 부위 */}
                          <div className="text-center text-[13px] text-gray-700">{item.partName}</div>

                          {/* 등급 */}
                          <div className="text-center text-[13px] text-gray-700" style={{ letterSpacing: '-0.05em' }}>{item.grade}</div>

                          {/* 중량 */}
                          <div className="text-center text-[13px] text-gray-700">{item.weight.toFixed(1)}kg</div>

                          {/* 낙찰가 */}
                          <div className="text-center text-[13px] font-medium text-gray-900">{item.bidPrice.toLocaleString()}</div>

                          {/* 경락대금 */}
                          <div className="text-center text-[13px] font-medium text-gray-900">{item.bidAmount.toLocaleString()}</div>

                          {/* 낙찰일자 */}
                          <div className="text-center text-[13px] text-gray-700">
                            {formatBidTime(item.bidAt, item.listingDate)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </div>
    </div>
  );
}
