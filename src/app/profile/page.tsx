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
  Bell,
  LogOut,
  Gavel,
  FileText,
  Megaphone
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
            <div className="flex-shrink-0 bg-white">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  {/* 왼쪽 여백 (오른쪽과 동일한 크기) */}
                  <div className="w-[80px]"></div>
                  {/* 가운데 타이틀 */}
                  <h1 className="text-[17px] font-bold text-gray-900">내정보</h1>
                  {/* 오른쪽 아이콘 */}
                  <div className="w-[80px] flex items-center justify-end">
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
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
              {/* 사용자 환영 섹션 - 메인페이지와 동일 */}
              <div className="px-4 pt-5 pb-3 bg-white">
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
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">공지사항</span>
                  <Link href="/notice" className="text-xs text-gray-500 hover:text-gray-700">
                    더보기
                  </Link>
                </div>
                <div>
                  <Link href="/notice/1" className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-200 transition-colors">
                    <span className="text-xs text-gray-900 truncate flex-1">1월 경매 일정 안내드립니다.</span>
                    <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">01.26</span>
                  </Link>
                  <Link href="/notice/2" className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-200 transition-colors">
                    <span className="text-xs text-gray-900 truncate flex-1">설 연휴 경매장 운영 안내</span>
                    <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">01.24</span>
                  </Link>
                  <Link href="/notice/3" className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-200 transition-colors">
                    <span className="text-xs text-gray-900 truncate flex-1">2026년 1월 시세 동향 안내</span>
                    <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">01.20</span>
                  </Link>
                  <Link href="/notice/4" className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-200 transition-colors">
                    <span className="text-xs text-gray-900 truncate flex-1">앱 업데이트 안내 (v1.2.0)</span>
                    <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">01.15</span>
                  </Link>
                  <Link href="/notice/5" className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-200 transition-colors">
                    <span className="text-xs text-gray-900 truncate flex-1">정산 계좌 변경 안내</span>
                    <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">01.10</span>
                  </Link>
                </div>
              </div>

              {/* 메뉴 섹션 */}
              <div className="mt-3">
                <div className="my-4 border-t border-gray-200"></div>
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

                {/* 고객센터 */}
                <div className="w-full px-4 py-3.5">
                  <span className="text-sm text-gray-900">중부미트센터</span>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">전화</span>
                      <a href="tel:031-123-4567" className="text-sm text-gray-700 hover:text-gray-900">031-123-4567</a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">팩스</span>
                      <span className="text-sm text-gray-700">031-123-4568</span>
                    </div>
                  </div>
                </div>

                {/* 로그아웃 */}
                <div className="my-2 border-t border-gray-200"></div>
                <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-900">로그아웃</span>
                </button>
              </div>

            </div>

            {/* 하단 네비게이션 */}
            <BottomNav />
          </div>
        </div>
    </div>
  );
}
