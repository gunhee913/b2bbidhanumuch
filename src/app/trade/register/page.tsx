'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft,
  Search,
  Check
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useBidStore } from '@/stores/bidStore';
import { useDealerStore } from '@/features/dealers/store';

export default function TradeRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingNo = searchParams.get('listingNo');
  
  const { auctionResults } = useBidStore();
  const { getApprovedDealers } = useDealerStore();
  
  // 해당 상장번호의 낙찰 정보 찾기
  const auctionItem = useMemo(() => {
    return auctionResults.find(r => r.listingNo === listingNo && r.result === 'won');
  }, [auctionResults, listingNo]);
  
  // 승인된 거래처 목록
  const dealersList = getApprovedDealers();
  
  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');
  
  // 선택된 거래처
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  
  // 검색된 거래처 목록
  const filteredDealers = useMemo(() => {
    if (!searchQuery.trim()) return dealersList;
    const query = searchQuery.toLowerCase().replace(/-/g, '');
    return dealersList.filter(dealer => 
      dealer.name.toLowerCase().includes(query) ||
      dealer.address.toLowerCase().includes(query) ||
      (dealer.representative || '').toLowerCase().includes(query) ||
      (dealer.businessNo || '').replace(/-/g, '').includes(query)
    );
  }, [dealersList, searchQuery]);
  
  const { setDeliveryDealer } = useBidStore();
  
  // 거래처 등록 처리
  const handleRegister = () => {
    if (!selectedDealerId || !listingNo) return;
    setDeliveryDealer(listingNo, selectedDealerId);
    router.push('/trade');
  };

  if (!listingNo) {
    return (
      <div className="fixed inset-0 bg-white flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-500">잘못된 접근입니다.</p>
          <Link href="/trade">
            <button className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg">
              돌아가기
            </button>
          </Link>
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
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
        >
          {/* 헤더 */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.back()}
                  className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-base font-bold text-gray-900">거래처 등록</h1>
              </div>
            </div>
          </div>

          {/* 낙찰 정보 테이블 */}
          {auctionItem && (
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
              <div className="border border-gray-200 rounded overflow-hidden">
                {/* 테이블 헤더 */}
                <div className="bg-gray-100 border-b border-gray-200">
                  <div className="grid py-2 text-[11px] font-medium text-gray-500" style={{gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.5fr'}}>
                    <div className="text-center">상장번호</div>
                    <div className="text-center">부위</div>
                    <div className="text-center">등급</div>
                    <div className="text-center">중량</div>
                    <div className="text-center">낙찰가</div>
                    <div className="text-center">경락대금</div>
                  </div>
                </div>
                {/* 테이블 데이터 */}
                <div className="bg-white">
                  <div className="grid py-2.5 text-[11px]" style={{gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.5fr'}}>
                    <div className="text-center font-medium text-gray-900 whitespace-nowrap">{listingNo}</div>
                    <div className="text-center text-gray-700">{auctionItem.productInfo.partName}</div>
                    <div className="text-center text-gray-700">{auctionItem.productInfo.grade}</div>
                    <div className="text-center text-gray-700">{auctionItem.productInfo.weight}</div>
                    <div className="text-center font-medium text-gray-900">{auctionItem.myBid.toLocaleString()}</div>
                    <div className="text-center font-medium text-gray-900">
                      {(() => {
                        const weight = parseFloat(auctionItem.productInfo.weight.replace('kg', ''));
                        return (auctionItem.myBid * weight).toLocaleString();
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 검색창 */}
          <div className="flex-shrink-0 bg-white px-4 py-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="거래처명, 대표자, 주소, 사업자번호 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* 거래처 테이블 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white">
            {/* 테이블 헤더 */}
            <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
              <div className="grid px-3 py-2 text-[11px] font-medium text-gray-500" style={{gridTemplateColumns: '32px 1fr 50px 90px 95px'}}>
                <div></div>
                <div>거래처명</div>
                <div className="text-center">대표자</div>
                <div className="text-center">연락처</div>
                <div className="text-center">사업자번호</div>
              </div>
            </div>

            {/* 테이블 데이터 */}
            {filteredDealers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">검색 결과가 없습니다</p>
              </div>
            ) : (
              filteredDealers.map((dealer) => (
                <div 
                  key={dealer.id}
                  onClick={() => setSelectedDealerId(selectedDealerId === dealer.id ? null : dealer.id)}
                  className={`grid px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-colors items-center ${
                    selectedDealerId === dealer.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  style={{gridTemplateColumns: '32px 1fr 50px 90px 95px'}}
                >
                  {/* 선택 */}
                  <div className="flex justify-center">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedDealerId === dealer.id 
                        ? 'border-gray-900 bg-gray-900' 
                        : 'border-gray-300'
                    }`}>
                      {selectedDealerId === dealer.id && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                  </div>
                  
                  {/* 거래처명 */}
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-gray-900 truncate">{dealer.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{dealer.address}</div>
                  </div>
                  
                  {/* 대표자 */}
                  <div className="text-[11px] text-gray-700 text-center truncate">
                    {dealer.representative || '-'}
                  </div>
                  
                  {/* 연락처 */}
                  <div className="text-[11px] text-gray-700 text-center">
                    {dealer.contact}
                  </div>
                  
                  {/* 사업자번호 */}
                  <div className="text-[11px] text-gray-700 text-center">
                    {dealer.businessNo || '-'}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
            <button
              onClick={handleRegister}
              disabled={!selectedDealerId}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
                selectedDealerId
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              등록하기
            </button>
          </div>

          {/* 하단 네비게이션 */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
