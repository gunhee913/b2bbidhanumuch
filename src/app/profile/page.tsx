'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import NotificationBell from '@/components/NotificationBell';

export default function ProfilePage() {
  const { data: session, status } = useSession();

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

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const { data: noticeList = [] } = useQuery<any[]>({
    queryKey: ['profile-notices'],
    queryFn: async () => {
      const res = await fetch('/api/notices?target=dealer&limit=5');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: companyInfo } = useQuery<{
    name: string;
    representative: string;
    phone: string;
    fax: string;
    businessNumber: string;
    ecommerceNumber: string;
    address: string;
  }>({
    queryKey: ['company-info'],
    queryFn: async () => {
      const res = await fetch('/api/company-info');
      if (!res.ok) return { name: '농협 중부미트센터', representative: '', phone: '', fax: '', businessNumber: '', ecommerceNumber: '', address: '' };
      return res.json();
    },
  });

  // 로딩 상태
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 세션에서 정보 추출
  const userName = session?.user?.name || '사용자';
  const userPhone = session?.user?.phone || '';
  const userRole = (session as any)?.employee?.role || '중도매인';
  const dealerNo = session?.dealer?.dealerNo || '';
  const displayNo = dealerNo ? String(parseInt(dealerNo, 10) - 7000000) : '0';

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
            <div className="flex-shrink-0 bg-white">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  {/* 왼쪽 여백 (오른쪽과 동일한 크기) */}
                  <div className="w-[80px]"></div>
                  {/* 가운데 타이틀 */}
                  <h1 className="text-[17px] font-bold text-gray-900">내정보</h1>
                  {/* 오른쪽 아이콘 */}
                  <div className="w-[80px] flex items-center justify-end">
                    <NotificationBell />
                  </div>
                </div>
              </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
              {/* 사용자 환영 섹션 */}
              <div className="px-4 pt-5 pb-3 bg-white">
                <div className="flex items-center gap-2.5">
                  {/* 프로필 이미지 */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">
                      {displayNo}
                    </div>
                  </div>
                  {/* 환영 메시지 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {userName}님({displayNo}번 {userRole}) 안녕하세요.
                    </p>
                    <p className="text-xs text-gray-600">오늘도 즐거운 하루 되세요.</p>
                  </div>
                  {/* 회원 정보 버튼 */}
                  <Link 
                    href="/profile/account"
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    회원 정보
                  </Link>
                </div>
              </div>

              {/* 공지사항 */}
              <div className="mx-4 mt-3 rounded-lg bg-gray-100 overflow-hidden">
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[15px] font-bold text-gray-900">공지사항</span>
                  <Link href="/notice" className="text-sm text-gray-500 hover:text-gray-700">
                    더보기
                  </Link>
                </div>
                <div className="pb-1">
                  {noticeList.length > 0 ? noticeList.map((n: any) => {
                    const isNew = (Date.now() - new Date(n.createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000;
                    return (
                      <Link key={n.id} href={`/notice/${n.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-200 transition-colors">
                        <span className="text-sm text-gray-900 truncate flex-1 flex items-center gap-1">
                          {n.title}
                          {isNew && <span className="text-[10px] font-bold text-red-500 flex-shrink-0">New</span>}
                        </span>
                        <span className="text-xs text-gray-400 ml-3 flex-shrink-0">
                          {format(new Date(n.createdAt), 'MM.dd(EEE)', { locale: ko })}
                        </span>
                      </Link>
                    );
                  }) : (
                    <div className="px-4 py-3 text-sm text-gray-400">등록된 공지사항이 없습니다.</div>
                  )}
                </div>
              </div>

              {/* 메뉴 섹션 */}
              <div className="mt-3 pb-4">
                <div className="my-4 border-t border-gray-200"></div>
                {/* 경매내역 */}
                <Link href="/bids?tab=경매결과" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-900">경매내역</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                {/* 잔고내역 */}
                <Link href="/profile/balance" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-900">잔고내역</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                {/* 설정 */}
                <Link href="/settings" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-900">설정</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                {/* 이용약관 */}
                <Link href="/terms" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-900">이용약관</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                {/* 개인정보처리방침 */}
                <Link href="/privacy" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-900">개인정보처리방침</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                {/* 로그아웃 */}
                <div className="my-4 border-t border-gray-200"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-900">로그아웃</span>
                </button>
              </div>

              {/* 풋터 - 사업자 정보 */}
              <ProfileFooter companyInfo={companyInfo} />

            </div>

            {/* 하단 네비게이션 */}
            <BottomNav />
          </div>
        </div>
    </div>
  );
}

function ProfileFooter({ companyInfo }: { companyInfo: any }) {
  const [open, setOpen] = useState(false);
  const year = new Date().getFullYear();

  const infoRows = [
    { label: '상호', value: companyInfo?.name },
    { label: '대표', value: companyInfo?.representative },
    { label: '주소', value: companyInfo?.address },
    { label: '사업자등록번호', value: companyInfo?.businessNumber },
    { label: '통신판매번호', value: companyInfo?.ecommerceNumber },
    { label: '전화', value: companyInfo?.phone },
    { label: '팩스', value: companyInfo?.fax },
  ].filter(r => r.value);

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-8">
      <div className="flex justify-center">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500"
        >
          사업자 정보
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-2.5">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex gap-4 text-[11px]">
              <span className="text-gray-400 whitespace-nowrap w-20">{label}</span>
              <span className="text-gray-500">{value}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-[10px] text-gray-400 text-center">
        © {year} (주)농협경제지주. All rights reserved.
      </p>
    </div>
  );
}
