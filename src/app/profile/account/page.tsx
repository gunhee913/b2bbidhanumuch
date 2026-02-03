'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Lock,
  Fingerprint,
  KeyRound,
  Settings,
  Bell,
  Camera,
  Gavel,
  Loader2,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function AccountPage() {
  const { data: session, status } = useSession();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [auctionPasswordEnabled, setAuctionPasswordEnabled] = useState(false);

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
  const userRole = session?.user?.role === 'employee' ? '직원' : '중도매인';
  const dealerNo = session?.dealer?.dealerNo || '';
  const dealerName = session?.dealer?.name || '';
  const dealerAddress = session?.dealer?.address || '';
  const displayNo = dealerNo.slice(-2) || '00';
  
  // 가입일 포맷
  const createdAt = session?.dealer?.createdAt 
    ? new Date(session.dealer.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).replace(/\. /g, '.').replace(/\.$/, '')
    : '-';

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
          
          {/* 헤더 */}
          <div className="flex-shrink-0 bg-white">
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                {/* 왼쪽 뒤로가기 */}
                <Link href="/profile" className="w-[80px] flex items-center">
                  <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                    <ChevronLeft className="h-[22px] w-[22px] text-gray-600" />
                  </button>
                </Link>
                {/* 가운데 타이틀 */}
                <h1 className="text-[17px] font-bold text-gray-900">회원 정보</h1>
                {/* 오른쪽 아이콘 */}
                <div className="w-[80px] flex items-center justify-end gap-1">
                  <Link 
                    href="/settings"
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center"
                  >
                    <Settings className="w-[22px] h-[22px]" />
                  </Link>
                  <Link 
                    href="/notifications"
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center relative"
                  >
                    <Bell className="w-[22px] h-[22px] translate-y-[0.5px]" />
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">
                      2
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
            {/* 프로필 이미지 섹션 */}
            <div className="bg-white px-4 py-6 flex flex-col items-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {displayNo}
                </div>
                <button className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="mt-3 text-base font-bold text-gray-900">{userName}</p>
              <p className="text-sm text-gray-500">{displayNo}번 {userRole}</p>
              {session?.user?.role === 'employee' && (
                <p className="text-xs text-gray-400 mt-1">소속: {dealerName}</p>
              )}
            </div>

            {/* 기본 정보 섹션 */}
            <div className="mx-4 mt-3 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-gray-600 text-sm font-bold">기본 정보</p>
              </div>
              
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">아이디</span>
                  </div>
                  <span className="text-sm text-gray-900">{userPhone}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">이름</span>
                  </div>
                  <span className="text-sm text-gray-900">{userName}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">거래인번호</span>
                  </div>
                  <span className="text-sm text-gray-900">{dealerNo}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">회원유형</span>
                  </div>
                  <span className="text-sm text-gray-900">{userRole}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">가입일</span>
                  </div>
                  <span className="text-sm text-gray-900">{createdAt}</span>
                </div>
              </div>
            </div>

            {/* 연락처 정보 섹션 */}
            <div className="mx-4 mt-3 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-gray-600 text-sm font-bold">연락처 정보</p>
              </div>
              
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">휴대폰</span>
                  </div>
                  <span className="text-sm text-gray-900">{userPhone}</span>
                </div>
                
                {dealerAddress && (
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500">주소</span>
                    </div>
                    <span className="text-sm text-gray-900">{dealerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 보안 섹션 */}
            <div className="mx-4 mt-3 mb-6 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-gray-600 text-sm font-bold">보안</p>
              </div>
              
              <div className="divide-y divide-gray-100">
                <div className="w-full flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">비밀번호 변경</span>
                  </div>
                  <span className="text-xs text-gray-400">관리자에게 문의</span>
                </div>
                
                <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">PIN 설정</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">생체 인증</span>
                  </div>
                  <button
                    onClick={() => setBiometricEnabled(!biometricEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      biometricEnabled ? 'bg-gray-900' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Gavel className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">경매 비밀번호 사용</span>
                  </div>
                  <button
                    onClick={() => setAuctionPasswordEnabled(!auctionPasswordEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      auctionPasswordEnabled ? 'bg-gray-900' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        auctionPasswordEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="w-full flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Gavel className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">경매 비밀번호 변경</span>
                  </div>
                  <span className="text-xs text-gray-400">관리자에게 문의</span>
                </div>
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
