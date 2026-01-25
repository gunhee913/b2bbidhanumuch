'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 오늘 날짜 코드 (YYMMDD)
const getTodayDateCode = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

interface BidInfo {
  myBid: number;
  highestBid: number;
  status: 'highest' | 'secondHighest';
  time: string;
  // 상품 정보
  productInfo?: {
    listingNo: string;
    partName: string;
    weight: string;
    type: string;
    grade: string;
    price: number;
  };
}

// 알림 타입
type NotificationType = 'auctionStart' | 'secondBid' | 'auctionResult' | 'bidSuccess';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  data?: {
    listingNo?: string;
    auctionId?: string;
  };
}

interface BidStore {
  // 상장번호를 키로 사용
  bids: Record<string, BidInfo>;
  
  // 입찰 추가/수정
  setBid: (listingNo: string, bidInfo: BidInfo) => void;
  
  // 입찰 조회
  getBid: (listingNo: string) => BidInfo | undefined;
  
  // 전체 입찰 내역 조회
  getAllBids: () => Record<string, BidInfo>;
  
  // 오래된 입찰 데이터 정리 (오늘 날짜가 아닌 것들)
  cleanOldBids: () => void;
  
  // 빠른 재입찰 금액
  quickReBidAmount: number;
  setQuickReBidAmount: (amount: number) => void;
  
  // 차순위 알림
  isSecondBidNotificationOn: boolean;
  setIsSecondBidNotificationOn: (on: boolean) => void;
  
  // 경매 시작 알림
  isAuctionStartNotificationOn: boolean;
  setIsAuctionStartNotificationOn: (on: boolean) => void;
  
  // 일일 경매결과 알림
  isDailyResultNotificationOn: boolean;
  setIsDailyResultNotificationOn: (on: boolean) => void;
  
  // 다크 모드
  isDarkMode: boolean;
  setIsDarkMode: (on: boolean) => void;
  
  // 화면 꺼짐 방지
  isScreenAwakeOn: boolean;
  setIsScreenAwakeOn: (on: boolean) => void;
  
  // 관심(찜) 목록
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  
  // 알림
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getUnreadCount: () => number;
}

export const useBidStore = create<BidStore>()(
  persist(
    (set, get) => ({
      bids: {},
      
      setBid: (listingNo, bidInfo) => {
        set((state) => ({
          bids: {
            ...state.bids,
            [listingNo]: bidInfo
          }
        }));
      },
      
      getBid: (listingNo) => {
        return get().bids[listingNo];
      },
      
      getAllBids: () => {
        return get().bids;
      },
      
      cleanOldBids: () => {
        const todayCode = getTodayDateCode();
        const currentBids = get().bids;
        const cleanedBids: Record<string, BidInfo> = {};
        
        // 오늘 날짜의 입찰만 유지
        Object.entries(currentBids).forEach(([listingNo, bid]) => {
          if (listingNo.startsWith(todayCode)) {
            cleanedBids[listingNo] = bid;
          }
        });
        
        set({ bids: cleanedBids });
      },
      
      quickReBidAmount: 500,
      setQuickReBidAmount: (amount) => set({ quickReBidAmount: amount }),
      
      isSecondBidNotificationOn: false,
      setIsSecondBidNotificationOn: (on) => set({ isSecondBidNotificationOn: on }),
      
      isAuctionStartNotificationOn: true,
      setIsAuctionStartNotificationOn: (on) => set({ isAuctionStartNotificationOn: on }),
      
      isDailyResultNotificationOn: true,
      setIsDailyResultNotificationOn: (on) => set({ isDailyResultNotificationOn: on }),
      
      isDarkMode: false,
      setIsDarkMode: (on) => set({ isDarkMode: on }),
      
      isScreenAwakeOn: false,
      setIsScreenAwakeOn: (on) => set({ isScreenAwakeOn: on }),
      
      favorites: [],
      toggleFavorite: (id) => {
        set((state) => {
          const isFav = state.favorites.includes(id);
          return {
            favorites: isFav 
              ? state.favorites.filter(f => f !== id)
              : [...state.favorites, id]
          };
        });
      },
      isFavorite: (id) => get().favorites.includes(id),
      
      notifications: [],
      addNotification: (notification) => {
        const now = new Date();
        const timeStr = `${now.getFullYear().toString().slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newNotification: Notification = {
          ...notification,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          time: timeStr,
          isRead: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications]
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, isRead: true } : n
          )
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true }))
        }));
      },
      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
      clearAllNotifications: () => {
        set({ notifications: [] });
      },
      getUnreadCount: () => {
        return get().notifications.filter(n => !n.isRead).length;
      },
    }),
    {
      name: 'bid-storage-v4', // 새 이름으로 기존 데이터 완전 초기화
      onRehydrateStorage: () => (state) => {
        // 이전 localStorage 데이터 삭제
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bid-storage');
          localStorage.removeItem('bid-storage-v2');
          localStorage.removeItem('bid-storage-v3');
        }
        // 스토어 복원 후 오래된 데이터 정리
        if (state) {
          state.cleanOldBids();
        }
      },
    }
  )
);

