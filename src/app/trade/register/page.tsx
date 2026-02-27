'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft,
  Search,
  Check,
  Loader2
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { formatGrade } from '@/lib/utils';

interface PartInfo {
  partId: string;
  partName: string;
  listingPartNo: string;
  weight: number;
  minPrice: number;
  bidPrice: number;
  bidAmount: number;
  winningDealerId: string | null;
  listingNo: string;
  listingDate: string;
  breed: string;
  gender: string;
  grade: string;
  marblingScore: number | null;
  monthAge: number | null;
  companyName: string;
}

interface Partner {
  id: string;
  partnerNo: string;
  name: string;
  businessNo: string;
  representative: string;
  phone: string;
  address: string;
  businessType: string;
  status: string;
}

function TradeRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partId = searchParams.get('partId');
  const listingNo = searchParams.get('listingNo');
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: partInfo, isLoading: partLoading } = useQuery<PartInfo>({
    queryKey: ['part-info', partId],
    queryFn: async () => {
      const res = await fetch(`/api/parts/${partId}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!partId,
  });

  const dealerId = (session as any)?.dealer?.id || (session as any)?.employee?.dealerId || null;

  const { data: partnersData, isLoading: partnersLoading } = useQuery<{ partners: Partner[] }>({
    queryKey: ['partners', dealerId],
    queryFn: async () => {
      const url = dealerId
        ? `/api/partners?dealerId=${dealerId}&status=active`
        : '/api/partners?status=active';
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const partners = partnersData?.partners || [];

  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const query = searchQuery.toLowerCase().replace(/-/g, '');
    return partners.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.address || '').toLowerCase().includes(query) ||
      (p.representative || '').toLowerCase().includes(query) ||
      (p.businessNo || '').replace(/-/g, '').includes(query)
    );
  }, [partners, searchQuery]);

  const handleRegister = async () => {
    if (!selectedPartnerId || !partId) return;
    setIsSubmitting(true);
    try {
      const userName = (session?.user as any)?.name || '';
      const res = await fetch('/api/delivery/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: { [partId]: selectedPartnerId },
          assignedBy: userName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '등록에 실패했습니다.');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['trade-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['winning-parts'] });
      router.push('/trade');
    } catch {
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!partId || !listingNo) {
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

  const isLoading = partLoading || partnersLoading;

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
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          
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

          {/* 스크롤 영역 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white hide-scrollbar">
            {/* 낙찰 정보 테이블 */}
            {partInfo && (
              <div className="bg-white border-b border-gray-200 px-4 py-3">
                <div className="border border-gray-200 rounded overflow-hidden">
                  <div className="bg-gray-100 border-b border-gray-200">
                    <div className="grid h-9 items-center text-[13px] font-medium text-gray-500" style={{gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.5fr'}}>
                      <div className="text-center">상장번호</div>
                      <div className="text-center">부위</div>
                      <div className="text-center">등급</div>
                      <div className="text-center">중량</div>
                      <div className="text-center">낙찰가</div>
                      <div className="text-center">경락대금</div>
                    </div>
                  </div>
                  <div className="bg-white">
                    <div className="grid py-3 text-[13px]" style={{gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1.5fr'}}>
                      <div className="text-center font-medium text-gray-900 whitespace-nowrap">{listingNo}</div>
                      <div className="text-center text-gray-700">{partInfo.partName}</div>
                      <div className="text-center text-gray-700">
                        {partInfo.marblingScore && partInfo.grade?.startsWith('1++')
                          ? `${partInfo.grade}(${partInfo.marblingScore})`
                          : partInfo.grade}
                      </div>
                      <div className="text-center text-gray-700">{partInfo.weight}kg</div>
                      <div className="text-center font-medium text-gray-900">
                        {partInfo.bidPrice ? partInfo.bidPrice.toLocaleString() : '-'}
                      </div>
                      <div className="text-center font-medium text-gray-900">
                        {partInfo.bidAmount ? Math.round(partInfo.bidAmount).toLocaleString() : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* 검색창 */}
                <div className="bg-white px-4 py-3 border-b border-gray-200">
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

                {/* 거래처 테이블 헤더 */}
                <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                  <div className="grid px-3 h-9 items-center text-[13px] font-medium text-gray-500" style={{gridTemplateColumns: '36px 1fr 55px 95px 100px'}}>
                    <div></div>
                    <div>거래처명</div>
                    <div className="text-center">대표자</div>
                    <div className="text-center">연락처</div>
                    <div className="text-center">사업자번호</div>
                  </div>
                </div>

                {/* 거래처 테이블 데이터 */}
                {filteredPartners.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">
                      {partners.length === 0 ? '등록된 거래처가 없습니다' : '검색 결과가 없습니다'}
                    </p>
                  </div>
                ) : (
                  filteredPartners.map((partner) => (
                    <div 
                      key={partner.id}
                      onClick={() => setSelectedPartnerId(selectedPartnerId === partner.id ? null : partner.id)}
                      className={`grid px-3 py-3 border-b border-gray-100 cursor-pointer transition-colors items-center ${
                        selectedPartnerId === partner.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                      style={{gridTemplateColumns: '36px 1fr 55px 95px 100px'}}
                    >
                      <div className="flex justify-center">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPartnerId === partner.id 
                            ? 'border-gray-900 bg-gray-900' 
                            : 'border-gray-300'
                        }`}>
                          {selectedPartnerId === partner.id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                      
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-gray-900 truncate">{partner.name}</div>
                        <div className="text-[11px] text-gray-500 truncate">{partner.address || '-'}</div>
                      </div>
                      
                      <div className="text-[13px] text-gray-700 text-center truncate">
                        {partner.representative || '-'}
                      </div>
                      
                      <div className="text-[13px] text-gray-700 text-center">
                        {partner.phone || '-'}
                      </div>
                      
                      <div className="text-[13px] text-gray-700 text-center">
                        {partner.businessNo || '-'}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
            <button
              onClick={handleRegister}
              disabled={!selectedPartnerId || isSubmitting}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-colors ${
                selectedPartnerId && !isSubmitting
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '등록 중...' : '등록하기'}
            </button>
          </div>

          {/* 하단 네비게이션 */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center">
      <div className="text-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    </div>
  );
}

export default function TradeRegisterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TradeRegisterContent />
    </Suspense>
  );
}
