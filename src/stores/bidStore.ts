'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 앱 로드 시 즉시 잘못된 입찰 데이터 삭제 (스토어 생성 전에 실행)
if (typeof window !== 'undefined') {
  // 모든 이전 버전 삭제
  ['bid-storage', 'bid-storage-v2', 'bid-storage-v3', 'bid-storage-v4', 'bid-storage-v5', 'bid-storage-v6', 'bid-storage-v7', 'bid-storage-v8', 'bid-storage-v9', 'bid-storage-v10', 'bid-storage-v11', 'bid-storage-v12', 'bid-storage-v13'].forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 현재 버전에서 잘못된 데이터 정리
  const currentKey = 'bid-storage-v14';
  const data = localStorage.getItem(currentKey);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.state?.bids) {
        const cleanedBids: Record<string, any> = {};
        Object.entries(parsed.state.bids).forEach(([listingNo, bid]) => {
          const parts = listingNo.split('-');
          // 올바른 형식: YYMMDD-XXX-YY (6자리-3자리-2자리), 개체번호 >= 100
          if (parts.length === 3 && 
              parts[0].length === 6 && 
              parts[1].length === 3 && 
              parts[2].length === 2 &&
              parseInt(parts[1]) >= 100) {
            cleanedBids[listingNo] = bid;
          }
        });
        parsed.state.bids = cleanedBids;
        localStorage.setItem(currentKey, JSON.stringify(parsed));
      }
    } catch (e) {
      localStorage.removeItem(currentKey);
    }
  }
}

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

interface AuctionResult {
  listingNo: string;
  result: 'won' | 'lost'; // 낙찰/유찰
  myBid: number;
  winningBid: number;
  time: string;
  productInfo: {
    partName: string;
    weight: string;
    type: string;
    grade: string;
  };
}

// 알림 타입
type NotificationType = 'auctionStart' | 'secondBid' | 'auctionResult' | 'bidSuccess' | 'listingInfo';

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
  
  // 경매 결과 목록
  auctionResults: AuctionResult[];
  
  // 경매 결과 조회
  getAuctionResults: () => AuctionResult[];
  
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
  
  // 상장 정보 알림
  isListingInfoNotificationOn: boolean;
  setIsListingInfoNotificationOn: (on: boolean) => void;
  
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
      bids: {
        // 차순위 테스트 데이터
        [`${getTodayDateCode()}-101-03`]: {
          myBid: 90000,
          highestBid: 95000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 09:30`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-101-03`,
            partName: '안심',
            weight: '4.8kg',
            type: '한우암',
            grade: '1++A(9)',
            price: 95000,
          }
        },
        [`${getTodayDateCode()}-101-05`]: {
          myBid: 75000,
          highestBid: 80000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 09:25`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-101-05`,
            partName: '갈비(좌)',
            weight: '12.1kg',
            type: '한우거세',
            grade: '1++A(9)',
            price: 78000,
          }
        },
        [`${getTodayDateCode()}-102-01`]: {
          myBid: 100000,
          highestBid: 105000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 09:20`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-102-01`,
            partName: '등심(좌)',
            weight: '15.3kg',
            type: '한우거세',
            grade: '1+A',
            price: 89000,
          }
        },
        [`${getTodayDateCode()}-103-02`]: {
          myBid: 82000,
          highestBid: 88000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 09:15`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-103-02`,
            partName: '등심(우)',
            weight: '15.6kg',
            type: '한우거세',
            grade: '1++B(8)',
            price: 85000,
          }
        },
        [`${getTodayDateCode()}-104-04`]: {
          myBid: 78000,
          highestBid: 82000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 09:10`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-104-04`,
            partName: '채끝',
            weight: '8.4kg',
            type: '한우거세',
            grade: '1B',
            price: 80000,
          }
        },
        // 추가 차순위 데이터 7개
        [`${getTodayDateCode()}-105-01`]: {
          myBid: 95000,
          highestBid: 102000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 09:05`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-105-01`,
            partName: '등심(좌)',
            weight: '14.8kg',
            type: '한우거세',
            grade: '1++A(7)',
            price: 98000,
          }
        },
        [`${getTodayDateCode()}-105-02`]: {
          myBid: 88000,
          highestBid: 95000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 09:00`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-105-02`,
            partName: '등심(우)',
            weight: '14.5kg',
            type: '한우거세',
            grade: '1++A(7)',
            price: 98000,
          }
        },
        [`${getTodayDateCode()}-106-06`]: {
          myBid: 72000,
          highestBid: 78000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 08:55`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-106-06`,
            partName: '갈비(우)',
            weight: '11.8kg',
            type: '한우암',
            grade: '1+B',
            price: 75000,
          }
        },
        [`${getTodayDateCode()}-107-08`]: {
          myBid: 55000,
          highestBid: 62000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 08:50`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-107-08`,
            partName: '앞다리',
            weight: '25.2kg',
            type: '한우거세',
            grade: '1A',
            price: 58000,
          }
        },
        [`${getTodayDateCode()}-108-09`]: {
          myBid: 52000,
          highestBid: 58000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 08:45`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-108-09`,
            partName: '우둔',
            weight: '19.8kg',
            type: '한우거세',
            grade: '1++A(8)',
            price: 55000,
          }
        },
        [`${getTodayDateCode()}-109-10`]: {
          myBid: 58000,
          highestBid: 65000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 08:40`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-109-10`,
            partName: '목심',
            weight: '13.5kg',
            type: '한우암',
            grade: '1+A',
            price: 62000,
          }
        },
        [`${getTodayDateCode()}-110-11`]: {
          myBid: 48000,
          highestBid: 55000,
          status: 'secondHighest' as const,
          time: `${getTodayDateCode().slice(0, 2)}.${getTodayDateCode().slice(2, 4)}.${getTodayDateCode().slice(4, 6)} 08:35`,
          productInfo: {
            listingNo: `${getTodayDateCode()}-110-11`,
            partName: '양지(좌)',
            weight: '12.2kg',
            type: '한우거세',
            grade: '2A',
            price: 52000,
          }
        },
      },
      
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
        
        // 올바른 상장번호 형식: YYMMDD-XXX-YY (6자리-3자리-2자리)
        // 개체번호는 101, 201, 301, 401 등으로 시작해야 함
        const isValidListingNo = (listingNo: string) => {
          const parts = listingNo.split('-');
          if (parts.length !== 3) return false;
          if (parts[0].length !== 6) return false;
          if (parts[1].length !== 3) return false;
          if (parts[2].length !== 2) return false;
          // 개체번호가 001 같은 잘못된 형식인지 확인
          const entityNo = parseInt(parts[1]);
          if (entityNo < 100) return false;
          return true;
        };
        
        // 오늘 날짜 + 올바른 형식의 입찰만 유지
        Object.entries(currentBids).forEach(([listingNo, bid]) => {
          if (listingNo.startsWith(todayCode) && isValidListingNo(listingNo)) {
            cleanedBids[listingNo] = bid;
          }
        });
        
        set({ bids: cleanedBids });
      },
      
      // 경매 결과 테스트 데이터 (어제 날짜 기준)
      auctionResults: (() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yy = String(yesterday.getFullYear()).slice(2);
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const dateCode = `${yy}${mm}${dd}`;
        const dateStr = `${yy}.${mm}.${dd}`;
        
        return [
          // 낙찰 (won)
          {
            listingNo: `${dateCode}-101-01`,
            result: 'won' as const,
            myBid: 105000,
            winningBid: 105000,
            time: `${dateStr} 14:30`,
            productInfo: { partName: '등심(좌)', weight: '15.2kg', type: '한우거세', grade: '1++A(9)' }
          },
          {
            listingNo: `${dateCode}-101-02`,
            result: 'won' as const,
            myBid: 102000,
            winningBid: 102000,
            time: `${dateStr} 14:32`,
            productInfo: { partName: '등심(우)', weight: '15.5kg', type: '한우거세', grade: '1++A(9)' }
          },
          {
            listingNo: `${dateCode}-102-03`,
            result: 'won' as const,
            myBid: 135000,
            winningBid: 135000,
            time: `${dateStr} 14:35`,
            productInfo: { partName: '안심', weight: '4.6kg', type: '한우거세', grade: '1++A(8)' }
          },
          {
            listingNo: `${dateCode}-103-05`,
            result: 'won' as const,
            myBid: 82000,
            winningBid: 82000,
            time: `${dateStr} 14:40`,
            productInfo: { partName: '갈비(좌)', weight: '12.8kg', type: '한우암', grade: '1+A' }
          },
          {
            listingNo: `${dateCode}-104-08`,
            result: 'won' as const,
            myBid: 58000,
            winningBid: 58000,
            time: `${dateStr} 14:45`,
            productInfo: { partName: '앞다리', weight: '24.5kg', type: '한우거세', grade: '1A' }
          },
          // 유찰 (lost)
          {
            listingNo: `${dateCode}-105-01`,
            result: 'lost' as const,
            myBid: 98000,
            winningBid: 108000,
            time: `${dateStr} 14:50`,
            productInfo: { partName: '등심(좌)', weight: '14.8kg', type: '한우거세', grade: '1++B(7)' }
          },
          {
            listingNo: `${dateCode}-106-04`,
            result: 'lost' as const,
            myBid: 75000,
            winningBid: 82000,
            time: `${dateStr} 14:55`,
            productInfo: { partName: '채끝', weight: '8.2kg', type: '한우암', grade: '1+B' }
          },
          {
            listingNo: `${dateCode}-107-06`,
            result: 'lost' as const,
            myBid: 70000,
            winningBid: 78000,
            time: `${dateStr} 15:00`,
            productInfo: { partName: '갈비(우)', weight: '11.5kg', type: '한우거세', grade: '1B' }
          },
          {
            listingNo: `${dateCode}-108-09`,
            result: 'lost' as const,
            myBid: 48000,
            winningBid: 55000,
            time: `${dateStr} 15:05`,
            productInfo: { partName: '우둔', weight: '20.1kg', type: '한우거세', grade: '1+A' }
          },
          {
            listingNo: `${dateCode}-109-10`,
            result: 'lost' as const,
            myBid: 52000,
            winningBid: 62000,
            time: `${dateStr} 15:10`,
            productInfo: { partName: '목심', weight: '14.2kg', type: '한우암', grade: '2A' }
          },
          // 추가 유찰 5건
          {
            listingNo: `${dateCode}-110-11`,
            result: 'lost' as const,
            myBid: 45000,
            winningBid: 52000,
            time: `${dateStr} 15:15`,
            productInfo: { partName: '양지(좌)', weight: '12.5kg', type: '한우거세', grade: '1A' }
          },
          {
            listingNo: `${dateCode}-111-12`,
            result: 'lost' as const,
            myBid: 46000,
            winningBid: 54000,
            time: `${dateStr} 15:20`,
            productInfo: { partName: '양지(우)', weight: '12.8kg', type: '한우거세', grade: '1A' }
          },
          {
            listingNo: `${dateCode}-112-13`,
            result: 'lost' as const,
            myBid: 42000,
            winningBid: 50000,
            time: `${dateStr} 15:25`,
            productInfo: { partName: '설도(좌)', weight: '16.5kg', type: '한우암', grade: '1+B' }
          },
          {
            listingNo: `${dateCode}-113-14`,
            result: 'lost' as const,
            myBid: 43000,
            winningBid: 51000,
            time: `${dateStr} 15:30`,
            productInfo: { partName: '설도(우)', weight: '16.2kg', type: '한우암', grade: '1+B' }
          },
          {
            listingNo: `${dateCode}-114-15`,
            result: 'lost' as const,
            myBid: 38000,
            winningBid: 45000,
            time: `${dateStr} 15:35`,
            productInfo: { partName: '사태', weight: '15.0kg', type: '한우거세', grade: '2A' }
          },
        ];
      })(),
      
      getAuctionResults: () => {
        return get().auctionResults;
      },
      
      quickReBidAmount: 500,
      setQuickReBidAmount: (amount) => set({ quickReBidAmount: amount }),
      
      isSecondBidNotificationOn: false,
      setIsSecondBidNotificationOn: (on) => set({ isSecondBidNotificationOn: on }),
      
      isAuctionStartNotificationOn: true,
      setIsAuctionStartNotificationOn: (on) => set({ isAuctionStartNotificationOn: on }),
      
      isDailyResultNotificationOn: true,
      setIsDailyResultNotificationOn: (on) => set({ isDailyResultNotificationOn: on }),
      
      isListingInfoNotificationOn: true,
      setIsListingInfoNotificationOn: (on) => set({ isListingInfoNotificationOn: on }),
      
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
      name: 'bid-storage-v14',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.cleanOldBids();
        }
      },
    }
  )
);

