'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useBidStore } from '@/stores/bidStore';
import { useEffect, useState } from 'react';

// 목업 알림 데이터 생성
const generateMockNotifications = () => [
  {
    id: '1',
    type: 'auctionStart' as const,
    title: '경매 시작',
    message: '오늘의 부분육 경매가 시작되었습니다.\n경매시간 : 08:00 ~ 09:00',
    time: '26.01.25 09:00',
    isRead: false,
  },
  {
    id: '2',
    type: 'secondBid' as const,
    title: '차순위 알림',
    message: '260125-101-01 등심(좌) 입찰에서 차순위가 되었습니다.',
    time: '26.01.25 10:30',
    isRead: false,
    data: { listingNo: '260125-101-01', auctionId: '260125-101' },
  },
  {
    id: '4',
    type: 'auctionResult' as const,
    title: '경매 결과',
    message: '금일 경매 결과 안내드립니다.\n\n총 18건, 낙찰 14건, 유찰 4건\n총 낙찰대금 : 13,523,000원',
    time: '26.01.24 18:00',
    isRead: true,
  },
  {
    id: '5',
    type: 'secondBid' as const,
    title: '차순위 알림',
    message: '260124-055-03 채끝 입찰에서 차순위가 되었습니다.',
    time: '26.01.24 14:20',
    isRead: true,
    data: { listingNo: '260124-055-03', auctionId: '260124-055' },
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useBidStore();
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [localNotifications, setLocalNotifications] = useState(generateMockNotifications());

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 실제 알림이 있으면 사용, 없으면 목업 데이터 사용
  const displayNotifications = notifications.length > 0 ? notifications : localNotifications;
  const unreadCount = displayNotifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification: typeof displayNotifications[0]) => {
    // 읽음 처리
    if (notifications.length > 0) {
      markAsRead(notification.id);
    } else {
      setLocalNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
    }

    // 경매 상세 페이지로 이동 (관련 데이터가 있는 경우)
    if (notification.data?.auctionId) {
      router.push(`/auction/${notification.data.auctionId}`);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (notifications.length > 0) {
      deleteNotification(id);
    } else {
      setLocalNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleMarkAllAsRead = () => {
    if (notifications.length > 0) {
      markAllAsRead();
    } else {
      setLocalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleClearAll = () => {
    if (notifications.length > 0) {
      clearAllNotifications();
    } else {
      setLocalNotifications([]);
    }
  };

  if (!isHydrated) {
    return null;
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
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="p-1 rounded transition-colors hover:bg-gray-100 mr-3"
                aria-label="뒤로가기"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-base font-bold text-gray-900">알림</h1>
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
            {displayNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm">알림이 없습니다</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {displayNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded bg-white border cursor-pointer transition-colors ${
                      notification.isRead 
                        ? 'border-gray-200' 
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!notification.isRead && (
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                      )}
                      <p className={`text-sm ${notification.isRead ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                        {notification.title}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-2 whitespace-pre-line">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {notification.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 하단 네비게이션 */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
