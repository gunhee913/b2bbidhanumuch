'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BottomNav from '@/components/BottomNav';
import { useBidStore } from '@/stores/bidStore';

interface NotifSettings {
  listingUpload: boolean;
  auctionStart: boolean;
  auctionResult: boolean;
  balance: boolean;
}

const NOTIF_ITEMS: { key: keyof NotifSettings; label: string; desc: string }[] = [
  { key: 'auctionStart', label: '경매 시작 알림 받기', desc: '경매가 시작되면 알림을 받습니다' },
  { key: 'auctionResult', label: '경매 결과 알림 받기', desc: '경매 마감 후 낙찰 결과 및 금액을 알림으로 받습니다' },
  { key: 'listingUpload', label: '상장 정보 알림 받기', desc: '다음날 상장 정보가 업로드되면 알림을 받습니다' },
  { key: 'balance', label: '잔고/입금 알림 받기', desc: '입출금 처리 시 알림을 받습니다' },
];

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    isDarkMode,
    setIsDarkMode,
    isScreenAwakeOn,
    setIsScreenAwakeOn,
  } = useBidStore();

  const { data: settings } = useQuery<NotifSettings>({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/settings');
      if (!res.ok) return { listingUpload: true, auctionStart: true, auctionResult: true, balance: true };
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (body: Partial<NotifSettings>) => {
      const res = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });

  const handleToggle = (key: keyof NotifSettings) => {
    if (!settings) return;
    toggleMutation.mutate({ [key]: !settings[key] });
  };

  const defaults: NotifSettings = {
    listingUpload: true,
    auctionStart: true,
    auctionResult: true,
    balance: true,
  };
  const s = settings || defaults;

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-[9999] overflow-hidden">
      <div className="w-full md:flex md:justify-center md:items-center bg-white">
        <div
          className="w-full md:max-w-md md:w-[500px] bg-white md:shadow-2xl relative overflow-hidden flex flex-col"
          style={{ height: '100dvh' }}
        >
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200 flex items-center">
            <button
              onClick={() => router.back()}
              className="p-1 rounded hover:bg-gray-100 mr-3"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-base font-bold text-gray-900">설정</h1>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-white">
            <div className="p-4">
              <h2 className="text-xs font-bold text-gray-500 mb-3">알림 설정</h2>
              <div className="space-y-4">
                {NOTIF_ITEMS.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => handleToggle(key)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        s[key] ? 'bg-gray-800' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          s[key] ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 mx-4" />

            <div className="p-4">
              <h2 className="text-xs font-bold text-gray-500 mb-3">화면 설정</h2>
              <div className="space-y-4">
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

          <BottomNav />
        </div>
      </div>
    </div>
  );
}
