'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  Lock,
  Fingerprint,
  KeyRound,
  Settings,
  Bell,
  Camera,
  Gavel
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

// 사용자 계정 정보 타입
interface AccountInfo {
  profileImage: string | null;
  name: string;
  userId: string;
  registrationNo: string;
  userType: '중도매인' | '매참인';
  joinDate: string;
  phone: string;
  email: string;
  emergencyContact: string;
  pinEnabled: boolean;
  biometricEnabled: boolean;
}

export default function AccountPage() {
  // 사용자 계정 정보 (임시 데이터)
  const [accountInfo] = useState<AccountInfo>({
    profileImage: null,
    name: '김하누',
    userId: '010-1234-5678',
    registrationNo: '7000072',
    userType: '중도매인',
    joinDate: '2026.01.15',
    phone: '010-1234-5678',
    email: 'hanumuch@email.com',
    emergencyContact: '010-9876-5432',
    pinEnabled: true,
    biometricEnabled: false,
  });

  const [biometricEnabled, setBiometricEnabled] = useState(accountInfo.biometricEnabled);
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
                  {accountInfo.profileImage ? (
                    <img 
                      src={accountInfo.profileImage} 
                      alt="프로필" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    '72'
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="mt-3 text-base font-bold text-gray-900">{accountInfo.name}</p>
              <p className="text-sm text-gray-500">72번 {accountInfo.userType}</p>
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
                  <span className="text-sm text-gray-900">{accountInfo.userId}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">이름</span>
                  </div>
                  <span className="text-sm text-gray-900">{accountInfo.name}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">거래인번호</span>
                  </div>
                  <span className="text-sm text-gray-900">{accountInfo.registrationNo}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">회원유형</span>
                  </div>
                  <span className="text-sm text-gray-900">{accountInfo.userType}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">가입일</span>
                  </div>
                  <span className="text-sm text-gray-900">{accountInfo.joinDate}</span>
                </div>
              </div>
            </div>

            {/* 연락처 정보 섹션 */}
            <div className="mx-4 mt-3 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-gray-600 text-sm font-bold">연락처 정보</p>
                <button className="text-sm text-gray-500 hover:text-gray-700">수정</button>
              </div>
              
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">휴대폰</span>
                  </div>
                  <span className="text-sm text-gray-900">{accountInfo.phone}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">이메일</span>
                  </div>
                  <span className="text-sm text-gray-900">{accountInfo.email}</span>
                </div>
                
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">비상연락처</span>
                  </div>
                  <span className="text-sm text-gray-900">{accountInfo.emergencyContact || '-'}</span>
                </div>
              </div>
            </div>

            {/* 보안 섹션 */}
            <div className="mx-4 mt-3 mb-6 rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-gray-600 text-sm font-bold">보안</p>
              </div>
              
              <div className="divide-y divide-gray-100">
                <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">비밀번호 변경</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                
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
                    <span className="text-sm text-gray-900">경매 비밀번호</span>
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
                
                <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Gavel className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">경매 비밀번호 변경</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
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
