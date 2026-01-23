'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User,
  Users,
  ChevronRight,
  Phone,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  Gavel,
  FileText
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

// 사용자 정보 타입
interface UserProfile {
  name: string;
  phone: string;
  userType: '중도매인' | '매참인';
  registrationNo: string;
  market: string;
}

export default function ProfilePage() {
  // 사용자 정보 (임시 데이터 - 추후 Zustand/Supabase로 관리)
  const [userProfile] = useState<UserProfile>({
    name: '김하누',
    phone: '010-1234-5678',
    userType: '중도매인',
    registrationNo: '72',
    market: '음성축산물공판장',
  });

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
              {/* 사용자 환영 섹션 - 메인페이지와 동일 */}
              <div className="px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-2.5">
                  {/* 프로필 이미지 */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">
                      {userProfile.registrationNo}
                    </div>
                  </div>
                  {/* 환영 메시지 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {userProfile.name}님({userProfile.registrationNo}번 {userProfile.userType}) 안녕하세요.
                    </p>
                    <p className="text-xs text-gray-600">오늘도 즐거운 하루 되세요.</p>
                  </div>
                </div>
              </div>

              {/* 내 정보 섹션 */}
              <div className="mx-4 mt-3 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-gray-600 text-sm font-bold">내 정보</p>
                </div>
                
                {/* 계정 정보 */}
                <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">계정 정보</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                {/* 사업자 정보 */}
                <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">사업자 정보</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                {/* 거래처 관리 */}
                <Link href="/trade/dealers?from=profile" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">거래처 관리</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>

              {/* 거래 내역 섹션 */}
              <div className="mx-4 mt-3 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-gray-600 text-sm font-bold">거래 내역</p>
                </div>
                
                {/* 입찰 내역 */}
                <Link href="/profile/bids" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Gavel className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">입찰 내역</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                {/* 낙찰 내역 */}
                <Link href="/trade?status=won" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">낙찰 내역</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                {/* 잔고 내역 */}
                <Link href="/profile/balance" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">잔고 내역</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>

              {/* 설정 섹션 */}
              <div className="mx-4 mt-3 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-gray-600 text-sm font-bold">설정</p>
                </div>
                
                {/* 계정 설정 */}
                <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">계정 설정</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                {/* 고객센터 */}
                <a href="tel:031-123-4567" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-900">고객센터</span>
                      <p className="text-xs text-gray-500">031-123-4567</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>

                {/* 로그아웃 */}
                <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-red-600">로그아웃</span>
                  </div>
                </button>
              </div>

              {/* 버전 정보 */}
              <div className="text-center py-6">
                <p className="text-xs text-gray-400">앱 버전 1.0.0</p>
              </div>
            </div>

            {/* 하단 네비게이션 */}
            <BottomNav />
          </div>
        </div>
    </div>
  );
}
