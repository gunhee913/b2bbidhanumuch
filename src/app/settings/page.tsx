'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useBidStore } from '@/stores/bidStore';

export default function SettingsPage() {
  const router = useRouter();
  const {
    isSecondBidNotificationOn,
    setIsSecondBidNotificationOn,
    isAuctionStartNotificationOn,
    setIsAuctionStartNotificationOn,
    isDailyResultNotificationOn,
    setIsDailyResultNotificationOn,
    isDarkMode,
    setIsDarkMode,
    isScreenAwakeOn,
    setIsScreenAwakeOn
  } = useBidStore();

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
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200 flex items-center">
            <button
              onClick={() => router.back()}
              className="p-1 rounded transition-colors hover:bg-gray-100 mr-3"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-base font-bold text-gray-900">설정</h1>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white">
            {/* 알림 설정 */}
            <div className="p-4">
              <h2 className="text-xs font-bold text-gray-500 mb-3">알림 설정</h2>
              <div className="space-y-4">
                {/* 경매 시작 알림 받기 */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">경매 시작 알림 받기</p>
                    <p className="text-xs text-gray-500 mt-0.5">경매가 시작되면 알림을 받습니다</p>
                  </div>
                  <button
                    onClick={() => setIsAuctionStartNotificationOn(!isAuctionStartNotificationOn)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      isAuctionStartNotificationOn ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        isAuctionStartNotificationOn ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 차순위 알림 받기 */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">차순위 알림 받기</p>
                    <p className="text-xs text-gray-500 mt-0.5">차순위가 되면 알림을 받습니다</p>
                  </div>
                  <button
                    onClick={() => setIsSecondBidNotificationOn(!isSecondBidNotificationOn)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      isSecondBidNotificationOn ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        isSecondBidNotificationOn ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 일일 경매결과 알림 받기 */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">일일 경매결과 알림 받기</p>
                    <p className="text-xs text-gray-500 mt-0.5">매일 경매 결과를 알림으로 받습니다</p>
                  </div>
                  <button
                    onClick={() => setIsDailyResultNotificationOn(!isDailyResultNotificationOn)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      isDailyResultNotificationOn ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        isDailyResultNotificationOn ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 mx-4" />

            {/* 화면 설정 */}
            <div className="p-4">
              <h2 className="text-xs font-bold text-gray-500 mb-3">화면 설정</h2>
              <div className="space-y-4">
                {/* 다크 모드 */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">다크 모드</p>
                    <p className="text-xs text-gray-500 mt-0.5">어두운 화면으로 전환합니다</p>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        isDarkMode ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 화면 꺼짐 방지 */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">화면 꺼짐 방지</p>
                    <p className="text-xs text-gray-500 mt-0.5">앱 실행 중 화면이 꺼지지 않습니다</p>
                  </div>
                  <button
                    onClick={() => setIsScreenAwakeOn(!isScreenAwakeOn)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      isScreenAwakeOn ? 'bg-gray-800' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        isScreenAwakeOn ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
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
